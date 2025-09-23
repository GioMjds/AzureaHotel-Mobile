import { View, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';

export default function RoomBookingScreen() {
	const { roomId } = useLocalSearchParams();

	return (
		<View>
			<Text>Room Booking Screen for {roomId}</Text>
		</View>
	);
}
