import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';

export default function AuthLayout() {
	return (
		<ProtectedRoute>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="login" options={{ title: 'Login' }} />
				<Stack.Screen name="register" options={{ title: 'Register' }} />
				<Stack.Screen name="verify" options={{ title: 'Verify' }} />
				<Stack.Screen name="forgot-pass" options={{ title: 'Forgot Password' }} />
			</Stack>
		</ProtectedRoute>
	);
}
