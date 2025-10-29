import React, { useState } from 'react';
import {
	View,
	FlatList,
	TouchableOpacity,
	ActivityIndicator,
	RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';
import StyledText from '@/components/ui/StyledText';
import { useUserNotifications } from '@/hooks/useUserNotifications';
import NotificationItem from '@/components/notifications/NotificationItem';
import StyledAlert from '@/components/ui/StyledAlert';

export default function NotificationScreen() {
    const [alertState, setAlertState] = useState<{
		visible: boolean;
		type?: 'success' | 'error' | 'warning' | 'info';
		title: string;
		message?: string;
		buttons?: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[];
	}>({ visible: false, title: '' });

	const router = useRouter();

	const {
		notifications,
		unreadCount,
		isLoading,
		error,
		refetch,
		fetchNextPage,
		hasNextPage,
		isFetchingNextPage,
		markAsRead,
		markAllAsRead,
		isMarkingAllAsRead,
	} = useUserNotifications();

	const handleNotificationPress = (notification: any) => {
		if (!notification.is_read) {
			markAsRead(notification.id);
		}

		if (notification.booking_id) {
			router.push({
				pathname: '/(screens)/booking/[bookingId]',
				params: { bookingId: notification.booking_id.toString() },
			});
		}
	};

	const handleMarkAllAsRead = () => {
		if (unreadCount === 0) {
			showStyledAlert({
				title: 'No Unread Notifications',
				message: 'All notifications are already marked as read.',
			});
			return;
		}

		showStyledAlert({
			title: 'Mark All as Read',
			message: 'Are you sure you want to mark all notifications as read?',
			type: 'warning',
			buttons: [
				{ text: 'Cancel', style: 'cancel' },
				{
					text: 'Mark All',
					onPress: () => markAllAsRead(),
					style: 'default',
				},
			],
		});
	};

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[];
	}) => {
		setAlertState({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK' }],
		});
	};

	if (isLoading) {
		return (
			<SafeAreaView className="flex-1 bg-background-default">
				<View className="flex-1 justify-center items-center">
					<ActivityIndicator size="large" color="#6F00FF" />
					<StyledText
						variant="montserrat-regular"
						className="text-text-muted mt-4"
					>
						Loading notifications...
					</StyledText>
				</View>
			</SafeAreaView>
		);
	}

	if (error) {
		return (
			<SafeAreaView className="flex-1 bg-background-default">
				<View className="flex-1 justify-center items-center px-8">
					<FontAwesome
						name="exclamation-triangle"
						size={64}
						color="#EF4444"
					/>
					<StyledText
						variant="playfair-bold"
						className="text-xl text-text-primary mt-4 text-center"
					>
						Failed to Load Notifications
					</StyledText>
					<StyledText
						variant="montserrat-regular"
						className="text-sm text-text-muted mt-2 text-center"
					>
						{error instanceof Error
							? error.message
							: 'Something went wrong'}
					</StyledText>
					<TouchableOpacity
						onPress={() => refetch()}
						className="mt-6 bg-brand-primary px-6 py-3 rounded-xl"
						activeOpacity={0.8}
					>
						<StyledText
							variant="montserrat-bold"
							className="text-text-inverse"
						>
							Try Again
						</StyledText>
					</TouchableOpacity>
				</View>
			</SafeAreaView>
		);
	}

	return (
		<View className="flex-1 bg-background-default">
			{/* Header */}
			<View className="flex-row items-center mb-2">
				<TouchableOpacity
					onPress={handleMarkAllAsRead}
					disabled={isMarkingAllAsRead}
					className="bg-brand-primary px-4 py-2 rounded-full"
					activeOpacity={0.7}
				>
					{isMarkingAllAsRead ? (
						<ActivityIndicator size="small" color="#FFF1F1" />
					) : (
						<StyledText
							variant="raleway-bold"
							className="text-sm text-text-inverse"
						>
							Mark All as Read
						</StyledText>
					)}
				</TouchableOpacity>
			</View>

			{/* Content */}
			{notifications.length === 0 ? (
				<View className="flex-1 justify-center items-center px-8">
					<View className="w-32 h-32 rounded-full bg-neutral-100 items-center justify-center mb-6">
						<FontAwesome
							name="bell-slash"
							size={64}
							color="#E9B3FB"
						/>
					</View>
					<StyledText
						variant="playfair-bold"
						className="text-2xl text-text-primary mb-2 text-center"
					>
						No Notifications
					</StyledText>
					<StyledText
						variant="montserrat-regular"
						className="text-sm text-text-muted text-center"
					>
						You&apos;re all caught up! We&apos;ll notify you when
						something new happens.
					</StyledText>
				</View>
			) : (
				<FlatList
					data={notifications}
					keyExtractor={(item) => item.id.toString()}
					renderItem={({ item }) => (
						<NotificationItem
							{...item}
							onPress={() => handleNotificationPress(item)}
							onMarkAsRead={() => markAsRead(item.id)}
						/>
					)}
					contentContainerStyle={{ padding: 16 }}
					showsVerticalScrollIndicator={false}
					refreshControl={
						<RefreshControl
							refreshing={isLoading}
							onRefresh={refetch}
							tintColor="#6F00FF"
							colors={['#6F00FF']}
						/>
					}
					onEndReached={() => {
						if (hasNextPage && !isFetchingNextPage) {
							fetchNextPage();
						}
					}}
					onEndReachedThreshold={0.5}
					ListFooterComponent={() => {
						if (isFetchingNextPage) {
							return (
								<View className="py-4 items-center">
									<ActivityIndicator
										size="small"
										color="#6F00FF"
									/>
									<StyledText
										variant="raleway-regular"
										className="text-xs text-text-muted mt-2"
									>
										Loading more notifications...
									</StyledText>
								</View>
							);
						}
						if (!hasNextPage && notifications.length > 0) {
							return (
								<View className="py-4 items-center">
									<StyledText
										variant="raleway-regular"
										className="text-xs text-text-muted"
									>
										No more notifications
									</StyledText>
								</View>
							);
						}
						return <View className="h-8" />;
					}}
				/>
			)}

			{/* Styled alert rendered here so showStyledAlert works */}
			<StyledAlert
				visible={alertState.visible}
				type={alertState.type}
				title={alertState.title}
				message={alertState.message}
				buttons={alertState.buttons}
				onDismiss={() =>
					setAlertState((s) => ({ ...s, visible: false }))
				}
			/>
		</View>
	);
}
