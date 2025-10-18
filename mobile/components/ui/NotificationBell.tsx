import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFirebaseNotifications } from '@/hooks/useFirebaseNotifications';

const NotificationBell = () => {
	const router = useRouter();
	const { unreadCount } = useFirebaseNotifications();

	const handlePress = () => {
		router.push('/notifications');
	};

	return (
		<TouchableOpacity onPress={handlePress} activeOpacity={0.75}>
			<View style={{ alignItems: 'center', justifyContent: 'center' }}>
				<FontAwesome name="bell" size={25} color="#6F00FF" />
				{unreadCount > 0 && (
					<View
						style={{
							position: 'absolute',
							right: 6,
							top: 6,
							minWidth: 18,
							height: 18,
							borderRadius: 9,
							backgroundColor: '#EF4444',
							alignItems: 'center',
							justifyContent: 'center',
							paddingHorizontal: 4,
						}}
					>
						<Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>
							{unreadCount > 99 ? '99+' : unreadCount}
						</Text>
					</View>
				)}
			</View>
		</TouchableOpacity>
	);
};

export default NotificationBell;
