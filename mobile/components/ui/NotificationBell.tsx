import { View, TouchableOpacity } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const NotificationBell = () => {
	const router = useRouter();

	const handlePress = () => {
		router.push('/notifications');
	};

	return (
		<TouchableOpacity hitSlop={20} onPress={handlePress} activeOpacity={0.4}>
			<View className='items-center justify-center'>
				<FontAwesome name="bell" size={30} color="#6F00FF" />
			</View>
		</TouchableOpacity>
	);
};

export default NotificationBell;
