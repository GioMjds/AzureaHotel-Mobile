import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Stack } from 'expo-router';
import Tabs from '@/layout/Tabs';

export default function PublicScreensLayout() {
	return (
		<ProtectedRoute requireAuth={true}>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" options={{ title: 'My Bookings' }} />
				<Stack.Screen name="areas/index" options={{ title: 'Areas' }} />
				<Stack.Screen name="rooms/index" options={{ title: 'Rooms' }} />
				<Stack.Screen name="profile/index" options={{ title: 'My Profile' }} />
			</Stack>
			<Tabs />
		</ProtectedRoute>
	);
}
