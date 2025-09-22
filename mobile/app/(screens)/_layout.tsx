import { ProtectedRoute } from '@/components/ProtectedRoute';
import '../../globals.css';
import { Stack } from 'expo-router';
import Tabs from '@/layout/Tabs';

export default function PublicScreensLayout() {
	return (
		<ProtectedRoute requireAuth={true}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="areas" />
				<Stack.Screen name="rooms" />
				<Stack.Screen name="bookings" />
				<Stack.Screen name="profile" />
			</Stack>
			<Tabs />
		</ProtectedRoute>
	);
}
