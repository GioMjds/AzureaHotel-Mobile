import { Stack } from 'expo-router';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync();

export default function AuthLayout() {
	useEffect(() => {
		SystemUI.setBackgroundColorAsync('white');
	}, []);	

	return (
		<ProtectedRoute>
			<StatusBar style="light" />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="login" options={{ title: 'Login' }} />
				<Stack.Screen name="register" options={{ title: 'Register' }} />
				<Stack.Screen name="verify" options={{ title: 'Verify' }} />
				<Stack.Screen name="forgot-pass" options={{ title: 'Forgot Password' }} />
			</Stack>
		</ProtectedRoute>
	);
}
