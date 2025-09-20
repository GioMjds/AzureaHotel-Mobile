import '../../globals.css';
import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AuthLayout() {
	return (
		<ProtectedRoute>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="login" />
				<Stack.Screen name="register" />
				<Stack.Screen name="verify" />
			</Stack>
		</ProtectedRoute>
	);
}
