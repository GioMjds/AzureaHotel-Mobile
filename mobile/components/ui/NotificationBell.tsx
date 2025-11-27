import { View, TouchableOpacity, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useUserNotifications } from '@/hooks/useUserNotifications';

const NotificationBell = () => {
	const router = useRouter();
	const { unreadCount } = useUserNotifications();

	const handlePress = () => {
		router.push('/notifications');
	};

	const displayCount = unreadCount > 99 ? '99+' : String(unreadCount);

	return (
		<TouchableOpacity hitSlop={20} onPress={handlePress} activeOpacity={0.4}>
			<View style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
				<FontAwesome name="bell" size={30} color="#6F00FF" />

				{unreadCount > 0 && (
					<View
						style={{
							position: 'absolute',
							top: -4,
							right: -2,
							backgroundColor: '#EF4444',
							minWidth: 18,
							height: 18,
							borderRadius: 18,
							paddingHorizontal: 4,
							alignItems: 'center',
							justifyContent: 'center',
							borderWidth: 1,
							borderColor: '#FFFFFF',
						}}
					>
						<Text style={{ color: '#FFFFFF', fontSize: 10, fontWeight: '700' }}>
							{displayCount}
						</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
};

export default NotificationBell;
