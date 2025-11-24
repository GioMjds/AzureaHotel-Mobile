import { database } from '@/configs/firebase';
import { ref, onValue, off, update, remove, onDisconnect, push } from 'firebase/database';
import { FirebaseAuthService } from '@/services/firebase/FirebaseAuth';

export interface FirebaseNotification {
	id: string;
	type:
		| 'booking_update'
		| 'booking_deleted'
		| 'general'
		| 'room_availability'
		| 'area_availability';
	booking_id?: number;
	status?: string;
	message: string;
	timestamp: number;
	read: boolean;
	data?: any;
}

export interface BookingUpdate {
	booking_id: number;
	user_id: number;
	status: string;
	timestamp: number;
	data?: any;
}

export interface AvailabilityUpdate {
	room_id?: number;
	area_id?: number;
	is_available: boolean;
	current_bookings: number[];
	last_updated: number;
}

class FirebaseRealtimeService {
	private listeners: Map<string, () => void> = new Map();
	private queryClient?: any;
	// Throttle / debounce guard to avoid excessive invalidations
	private lastInvalidationAt: number = 0;
	private invalidationThrottleMs: number = 1000; // 1s throttle by default
	private pendingInvalidateTimer: ReturnType<typeof setTimeout> | null = null;
	private pendingBookingInvalidations: Set<number> = new Set();
	private pendingInvalidateGuestBookings: boolean = false;
	private pendingInvalidateRooms: boolean = false;
	private pendingInvalidateAreas: boolean = false;
	private hasConnectedListener = false;

	setQueryClient(client: any) {
		this.queryClient = client;
	}

	// Subscribe to user notifications with TanStack Query integration
	subscribeToUserNotifications(
		userId: number,
		callback: (notifications: FirebaseNotification[]) => void
	): () => void {
		const notificationsRef = ref(database, `user-notifications/${userId}`);

		onValue(notificationsRef, (snapshot) => {
			const data = snapshot.val();
			if (data) {
				const notifications: FirebaseNotification[] = Object.entries(
					data
				).map(([key, value]: [string, any]) => ({
					id: key,
					...value,
				}));

				// Sort by timestamp (newest first)
				notifications.sort((a, b) => b.timestamp - a.timestamp);
				callback(notifications);

				// Invalidate relevant TanStack Query caches
				this.handleNotificationQueryInvalidation(notifications);
			} else {
				callback([]);
			}
		});

		this.listeners.set(`user-notifications-${userId}`, () =>
			off(notificationsRef)
		);

		return () => {
			const cleanup = this.listeners.get(`user-notifications-${userId}`);
			if (cleanup) {
				cleanup();
				this.listeners.delete(`user-notifications-${userId}`);
			}
		};
	}

	// Subscribe to booking updates
	subscribeToBookingUpdates(
		bookingIds: number[],
		callback: (updates: BookingUpdate[]) => void
	): () => void {
		const unsubscribes: (() => void)[] = [];

		bookingIds.forEach((bookingId) => {
			const bookingRef = ref(database, `booking-updates/${bookingId}`);

			onValue(bookingRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					const updates = Array.isArray(data) ? data : [data];
					callback(updates);

					// Invalidate booking queries
					if (this.queryClient) {
						// Throttle invalidations to avoid tight loops when many realtime events arrive
						this.scheduleInvalidation({ guestBookings: true, bookingIds: [bookingId] });
					}
				}
			});

			unsubscribes.push(() => off(bookingRef));
		});

		return () => {
			unsubscribes.forEach((unsub) => unsub());
		};
	}

	// Subscribe to room availability
	subscribeToRoomAvailability(
		roomIds: number[],
		callback: (updates: AvailabilityUpdate[]) => void
	): () => void {
		const unsubscribes: (() => void)[] = [];

		roomIds.forEach((roomId) => {
			const roomRef = ref(database, `room-availability/${roomId}`);

			onValue(roomRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					callback([data]);

					// Invalidate room queries
					if (this.queryClient) {
						this.scheduleInvalidation({ rooms: true });
					}
				}
			});

			unsubscribes.push(() => off(roomRef));
		});

		return () => {
			unsubscribes.forEach((unsub) => unsub());
		};
	}

	// Subscribe to area availability
	subscribeToAreaAvailability(
		areaIds: number[],
		callback: (updates: AvailabilityUpdate[]) => void
	): () => void {
		const unsubscribes: (() => void)[] = [];

		areaIds.forEach((areaId) => {
			const areaRef = ref(database, `area-availability/${areaId}`);

			onValue(areaRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					callback([data]);

					// Invalidate area queries
					if (this.queryClient) {
						this.scheduleInvalidation({ areas: true });
					}
				}
			});

			unsubscribes.push(() => off(areaRef));
		});

		return () => {
			unsubscribes.forEach((unsub) => unsub());
		};
	}

	// Handle notification-based query invalidation
	private handleNotificationQueryInvalidation(
		notifications: FirebaseNotification[]
	) {
		if (!this.queryClient) return;

		// Collect invalidation targets and schedule a single batched invalidation
		const bookingIdsToInvalidate: number[] = [];
		let invalidateGuestBookings = false;
		let invalidateRooms = false;
		let invalidateAreas = false;

		notifications.forEach((notification) => {
			switch (notification.type) {
				case 'booking_update':
					if (notification.booking_id) {
						invalidateGuestBookings = true;
						bookingIdsToInvalidate.push(notification.booking_id);
					}
					break;
				case 'booking_deleted':
					invalidateGuestBookings = true;
					if (notification.booking_id) {
						bookingIdsToInvalidate.push(notification.booking_id);
					}
					break;
				case 'room_availability':
					invalidateRooms = true;
					break;
				case 'area_availability':
					invalidateAreas = true;
					break;
			}
		});

		this.scheduleInvalidation({
			guestBookings: invalidateGuestBookings,
			bookingIds: bookingIdsToInvalidate,
			rooms: invalidateRooms,
			areas: invalidateAreas,
		});
	}

	// Schedule (debounce) invalidation so many realtime events collapse into one refetch
	private scheduleInvalidation(opts: {
		guestBookings?: boolean;
		bookingIds?: number[];
		rooms?: boolean;
		areas?: boolean;
	}) {
		if (!this.queryClient) return;

		if (opts.bookingIds && opts.bookingIds.length > 0) {
			opts.bookingIds.forEach((id) => this.pendingBookingInvalidations.add(id));
		}

		if (opts.guestBookings) this.pendingInvalidateGuestBookings = true;
		if (opts.rooms) this.pendingInvalidateRooms = true;
		if (opts.areas) this.pendingInvalidateAreas = true;

		if (this.pendingInvalidateTimer) {
			// already scheduled; merge flags and exit
			// we still ensure guestBookings, rooms, areas flags are represented via timer payload by reading pending sets
			return;
		}

		this.pendingInvalidateTimer = setTimeout(() => {
			// perform actual invalidations once
			try {
				// Guest bookings
				if (this.pendingInvalidateGuestBookings || this.pendingBookingInvalidations.size > 0) {
					this.queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
				}

				// Specific booking details
				if (this.pendingBookingInvalidations.size > 0) {
					this.pendingBookingInvalidations.forEach((bid) => {
						this.queryClient.invalidateQueries({ queryKey: ['booking', bid] });
					});
					this.pendingBookingInvalidations.clear();
				}

				// Rooms and areas (less frequent)
				if (this.pendingInvalidateRooms) {
					this.queryClient.invalidateQueries({ queryKey: ['rooms'] });
					this.pendingInvalidateRooms = false;
				}
				if (this.pendingInvalidateAreas) {
					this.queryClient.invalidateQueries({ queryKey: ['areas'] });
					this.pendingInvalidateAreas = false;
				}
			} finally {
				this.lastInvalidationAt = Date.now();
				// reset guest bookings flag
				this.pendingInvalidateGuestBookings = false;
				if (this.pendingInvalidateTimer) {
					clearTimeout(this.pendingInvalidateTimer);
					this.pendingInvalidateTimer = null;
				}
			}
		}, this.invalidationThrottleMs);
	}

	// Mark notification as read
	async markNotificationAsRead(
		userId: number,
		notificationId: string
	): Promise<void> {
		try {
			const notificationRef = ref(
				database,
				`user-notifications/${userId}/${notificationId}`
			);
			await update(notificationRef, { read: true });
		} catch (error) {
			console.error('Failed to mark notification as read:', error);
		}
	}

	// Remove notification
	async removeNotification(
		userId: number,
		notificationId: string
	): Promise<void> {
		try {
			const notificationRef = ref(
				database,
				`user-notifications/${userId}/${notificationId}`
			);
			await remove(notificationRef);
		} catch (error) {
			console.error('Failed to remove notification:', error);
		}
	}

	async updateUserPresence(userId: number, isOnline: boolean, attempts = 0): Promise<void> {
		try {
			this.ensureConnectedListener();

			// If Firebase auth isn't ready yet, retry a few times before giving up. This avoids PERMISSION_DENIED
			// errors that occur when onDisconnect/update is called before the client's auth has propagated.
			if (!FirebaseAuthService.isFirebaseAuthenticated()) {
				if (attempts < 5) {
					const backoff = 300 * (attempts + 1);
					setTimeout(() => {
						void this.updateUserPresence(userId, isOnline, attempts + 1);
					}, backoff);
					return;
				} else {
					return;
				}
			}

			const uid = String(userId);
			const presenceRef = ref(database, `user-presence/${uid}`);

			if (isOnline) {
				try {
					await onDisconnect(presenceRef).update({
						is_online: false,
						last_seen: { '.sv': 'timestamp' },
					});
				} catch (e: any) {
					// onDisconnect may fail if not connected/authenticated yet; log for debugging
					console.warn('onDisconnect setup failed:', e?.message ?? e);
				}

				// Immediately set online using server timestamp for last_seen
				await update(presenceRef, {
					user_id: uid,
					is_online: true,
					last_seen: { '.sv': 'timestamp' },
				});
			} else {
				// Explicitly set offline now using server timestamp
				await update(presenceRef, {
					is_online: false,
					last_seen: { '.sv': 'timestamp' },
				});
			}
		} catch (error: any) {
			// Only log non-permission errors to reduce noise
			if (error?.code !== 'PERMISSION_DENIED') {
				console.warn('Failed to update user presence:', error);
			} else {
				// Permission denied here likely means auth wasn't ready; attempt a small retry
				if (attempts < 3) {
					const backoff = 500 * (attempts + 1);
					setTimeout(() => {
						void this.updateUserPresence(userId, isOnline, attempts + 1);
					}, backoff);
				} else {
					console.warn('Permission denied updating presence after retries for user', userId);
				}
			}
		}
	}

	// Ensure a single .info/connected listener exists to stabilize onDisconnect behavior
	private ensureConnectedListener() {
		if (this.hasConnectedListener) return;

		try {
			const connRef = ref(database, '.info/connected');

			onValue(connRef, (snap: any) => {
				// Keep the listener active to stabilize onDisconnect behavior. Value not used directly here.
				// If needed, other parts of the app can add logic to react to connection state.
				void snap;
			});

			// store simple cleanup function
			this.listeners.set('.info.connected', () => off(connRef));
			this.hasConnectedListener = true;
		} catch (e) {
			console.warn('Failed to establish .info/connected listener', e);
		}
	}

	// Cleanup all listeners
	cleanup(): void {
		this.listeners.forEach((cleanup) => {
			if (typeof cleanup === 'function') {
				cleanup();
			}
		});
		this.listeners.clear();
	}
}

export const firebaseRealtimeService = new FirebaseRealtimeService();

// Dev helper: push a test notification into user-notifications/{userId}
export async function pushTestNotification(
	userId: number,
	opts?: Partial<FirebaseNotification>
) {
	try {
		const notificationsRef = ref(database, `user-notifications/${userId}`);
		const payload: FirebaseNotification = {
			id: '',
			type: opts?.type || 'booking_update',
			booking_id: opts?.booking_id || 0,
			status: opts?.status || 'test',
			message: opts?.message || `Test notification ${new Date().toLocaleTimeString()}`,
			timestamp: opts?.timestamp || Date.now(),
			read: false,
			data: opts?.data || {},
		} as FirebaseNotification;

		// push returns a reference; we don't need its value here
		await push(notificationsRef, {
			type: payload.type,
			booking_id: payload.booking_id,
			status: payload.status,
			message: payload.message,
			timestamp: payload.timestamp,
			read: payload.read,
			data: payload.data,
		});
		return true;
	} catch (error) {
		console.error('pushTestNotification failed', error);
		throw error;
	}
}
