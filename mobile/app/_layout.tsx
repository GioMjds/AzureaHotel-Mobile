import '../global.css';
import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import useAuthStore from '@/store/AuthStore';
import * as SplashScreen from 'expo-splash-screen';

import {
	useFonts as usePlayfairDisplay,
	PlayfairDisplay_400Regular,
	PlayfairDisplay_500Medium,
	PlayfairDisplay_600SemiBold,
	PlayfairDisplay_700Bold,
	PlayfairDisplay_800ExtraBold,
	PlayfairDisplay_900Black,
} from '@expo-google-fonts/playfair-display';
import {
	useFonts as useMontserrat,
	Montserrat_400Regular,
	Montserrat_700Bold,
} from '@expo-google-fonts/montserrat';
import {
	useFonts as useRaleway,
	Raleway_400Regular,
	Raleway_700Bold,
} from '@expo-google-fonts/raleway';

SplashScreen.preventAutoHideAsync();

function AuthInitializer() {
	const { initializeAuth, authenticateFirebase } = useAuthStore();

	useEffect(() => {
		const initApp = async () => {
			await initializeAuth();

			const currentState = useAuthStore.getState();
			if (currentState.user && currentState.isAuthenticated) {
				try {
					await authenticateFirebase();
				} catch (error) {
					console.warn('⚠️ Firebase initialization failed for existing user:', error);
				}
			}
		};
		
		initApp();
	}, [initializeAuth, authenticateFirebase]);

	return null;
}

export default function RootLayout() {
	const [playfairLoaded] = usePlayfairDisplay({
		PlayfairDisplay_400Regular,
		PlayfairDisplay_500Medium,
		PlayfairDisplay_600SemiBold,
		PlayfairDisplay_700Bold,
		PlayfairDisplay_800ExtraBold,
		PlayfairDisplay_900Black,
	});

	const [montserratLoaded] = useMontserrat({
		Montserrat_400Regular,
		Montserrat_700Bold,
	});

	const [ralewayLoaded] = useRaleway({
		Raleway_400Regular,
		Raleway_700Bold,
	});

	const fontsLoaded = playfairLoaded && montserratLoaded && ralewayLoaded;

	useEffect(() => {
		SystemUI.setBackgroundColorAsync('black');
	}, []);

	useEffect(() => {
		if (fontsLoaded) SplashScreen.hideAsync();
	}, [fontsLoaded]);

	if (!fontsLoaded) return null;

	return (
		<GestureHandlerRootView style={{ flex: 1 }}>
			<SafeAreaProvider>
				<QueryClientProvider client={queryClient}>
					<AuthInitializer />
					<StatusBar style="dark" />
					<Stack screenOptions={{ headerShown: false }} />
				</QueryClientProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
