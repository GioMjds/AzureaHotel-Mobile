import { database } from '@/configs/firebase';
import { ref, onValue, off, update, remove } from 'firebase/database';

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

	setQueryClient(client: any) {
		this.queryClient = client;
	}

	// Subscribe to user notifications with TanStack Query integration
	subscribeToUserNotifications(
		userId: number,
		callback: (notifications: FirebaseNotification[]) => void
	): () => void {
		const notificationsRef = ref(database, `user-notifications/${userId}`);

		const unsubscribe = onValue(notificationsRef, (snapshot) => {
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

			const unsubscribe = onValue(bookingRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					const updates = Array.isArray(data) ? data : [data];
					callback(updates);

					// Invalidate booking queries
					if (this.queryClient) {
						this.queryClient.invalidateQueries({
							queryKey: ['guest-bookings'],
						});
						this.queryClient.invalidateQueries({
							queryKey: ['booking', bookingId],
						});
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

			const unsubscribe = onValue(roomRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					callback([data]);

					// Invalidate room queries
					if (this.queryClient) {
						this.queryClient.invalidateQueries({
							queryKey: ['rooms'],
						});
						this.queryClient.invalidateQueries({
							queryKey: ['room', roomId],
						});
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

			const unsubscribe = onValue(areaRef, (snapshot) => {
				const data = snapshot.val();
				if (data) {
					callback([data]);

					// Invalidate area queries
					if (this.queryClient) {
						this.queryClient.invalidateQueries({
							queryKey: ['areas'],
						});
						this.queryClient.invalidateQueries({
							queryKey: ['area', areaId],
						});
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

		notifications.forEach((notification) => {
			switch (notification.type) {
				case 'booking_update':
					if (notification.booking_id) {
						this.queryClient.invalidateQueries({
							queryKey: ['guest-bookings'],
						});
						this.queryClient.invalidateQueries({
							queryKey: ['booking', notification.booking_id],
						});
					}
					break;
				case 'booking_deleted':
					this.queryClient.invalidateQueries({
						queryKey: ['guest-bookings'],
					});
					if (notification.booking_id) {
						this.queryClient.removeQueries({
							queryKey: ['booking', notification.booking_id],
						});
					}
					break;
				case 'room_availability':
					this.queryClient.invalidateQueries({ queryKey: ['rooms'] });
					break;
				case 'area_availability':
					this.queryClient.invalidateQueries({ queryKey: ['areas'] });
					break;
			}
		});
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

	// Update user presence
	async updateUserPresence(userId: number, isOnline: boolean): Promise<void> {
		try {
			const presenceRef = ref(database, `user-presence/${userId}`);
			await update(presenceRef, {
				user_id: userId,
				is_online: isOnline,
				last_seen: Date.now(),
			});
		} catch (error: any) {
			// Only log non-permission errors to reduce noise
			if (error.code !== 'PERMISSION_DENIED') {
				console.warn('Failed to update user presence:', error);
			}
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
