import { useEffect, useState, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import {
	firebaseRealtimeService,
	FirebaseNotification,
} from '@/services/firebase/index';
import useAuthStore from '@/store/AuthStore';
import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';

export function useFirebaseNotifications() {
	const [notifications, setNotifications] = useState<FirebaseNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState<number>(0);

	const prevNotificationIds = useRef<Set<string>>(new Set());

	const { user } = useAuthStore();

	const queryClient = useQueryClient();

	useEffect(() => {
		if (!user?.id) return;

		// helper: present a local notification using expo-notifications
		const showLocalNotification = async (notification: FirebaseNotification) => {
			try {
				const perm = await Notifications.getPermissionsAsync();
				if (perm.status !== 'granted') {
					const req = await Notifications.requestPermissionsAsync();
					if (req.status !== 'granted') return;
				}

				await Notifications.scheduleNotificationAsync({
					content: {
						title: 'Booking Update',
						body: notification.message || `Booking #${notification.booking_id} ${notification.status}`,
						data: notification.data || {},
					},
					trigger: null,
				});
			} catch (e) {
				console.warn('Error showing local notification', e);
			}
		};

		const unsubscribe = firebaseRealtimeService.subscribeToUserNotifications(
			user.id,
			(firebaseNotifications) => {
				setNotifications(firebaseNotifications);
				setUnreadCount(firebaseNotifications.filter((n) => !n.read).length);

				// Determine newly arrived notifications (not previously seen)
				const prevIds = prevNotificationIds.current;
				const now = Date.now();
				const newOnes = firebaseNotifications.filter(
					(n) => !n.read && !prevIds.has(n.id) && now - (n.timestamp || 0) < 30000
				);

				if (newOnes.length > 0) {
					newOnes.forEach((notification) => {
						// fire-and-forget local notification
						void showLocalNotification(notification);
					});
				}

				// update prev ids
				prevNotificationIds.current = new Set(
					(firebaseNotifications || []).map((n) => n.id)
				);
			}
		);

		// Update user presence when component mounts
		firebaseRealtimeService.updateUserPresence(user.id, true);

		// Listen to app state changes to proactively set presence
		const handleAppStateChange = (nextAppState: AppStateStatus) => {
			if (!user?.id) return;
			if (nextAppState === 'active') {
				firebaseRealtimeService.updateUserPresence(user.id, true);
			} else if (nextAppState === 'background' || nextAppState === 'inactive') {
				firebaseRealtimeService.updateUserPresence(user.id, false);
			}
		};

		const sub = AppState.addEventListener('change', handleAppStateChange);

		return () => {
			// Update user presence when component unmounts
			firebaseRealtimeService.updateUserPresence(user.id, false);
			sub.remove?.();
			unsubscribe();
		};
	}, [user?.id, queryClient]);

	const markAsRead = async (notificationId: string) => {
		if (!user?.id) return;
		await firebaseRealtimeService.markNotificationAsRead(
			user.id,
			notificationId
		);
	};

	const removeNotification = async (notificationId: string) => {
		if (!user?.id) return;
		await firebaseRealtimeService.removeNotification(
			user.id,
			notificationId
		);
	};

	return {
		notifications,
		unreadCount,
		markAsRead,
		removeNotification,
	};
}
