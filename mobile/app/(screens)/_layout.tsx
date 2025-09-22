import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Stack } from 'expo-router';
import Tabs from '@/layout/Tabs';

export default function PublicScreensLayout() {
	return (
		<ProtectedRoute requireAuth={true}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" options={{ title: 'Home' }} />
				<Stack.Screen name="areas" options={{ title: 'Areas' }} />
				<Stack.Screen name="rooms" options={{ title: 'Rooms' }} />
				<Stack.Screen name="bookings" options={{ title: 'My Bookings' }} />
				<Stack.Screen name="profile" options={{ title: 'My Profile' }} />
			</Stack>
			<Tabs />
		</ProtectedRoute>
	);
}
