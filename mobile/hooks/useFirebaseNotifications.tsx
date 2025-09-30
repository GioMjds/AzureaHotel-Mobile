import { useEffect, useState } from 'react';
import {
	firebaseRealtimeService,
	FirebaseNotification,
} from '@/services/firebase/index';
import useAuthStore from '@/store/AuthStore';
import { useQueryClient } from '@tanstack/react-query';

export function useFirebaseNotifications() {
	const { user } = useAuthStore();
	const [notifications, setNotifications] = useState<FirebaseNotification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const queryClient = useQueryClient();

	useEffect(() => {
		if (!user?.id) return;

		const unsubscribe =
			firebaseRealtimeService.subscribeToUserNotifications(
				user.id,
				(firebaseNotifications) => {
					setNotifications(firebaseNotifications);
					setUnreadCount(
						firebaseNotifications.filter((n) => !n.read).length
					);

					// Show toast notifications for new unread notifications
					firebaseNotifications
						.filter(
							(n) => !n.read && Date.now() - n.timestamp < 30000
						) // Show only notifications from last 30 seconds
						.forEach((notification) => {
							// You can integrate with a toast library here
							console.log(
								'New notification:',
								notification.message
							);
						});
				}
			);

		// Update user presence when component mounts
		firebaseRealtimeService.updateUserPresence(user.id, true);

		return () => {
			// Update user presence when component unmounts
			firebaseRealtimeService.updateUserPresence(user.id, false);
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
