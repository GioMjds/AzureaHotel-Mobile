import { ProtectedRoute } from '@/components/ProtectedRoute';
import '../../globals.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
	return (
		<ProtectedRoute>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" />
				<Stack.Screen name="areas" />
				<Stack.Screen name="rooms" />
			</Stack>
		</ProtectedRoute>
	);
}
