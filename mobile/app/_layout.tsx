import '../global.css';
import { queryClient } from '@/lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SystemUI from 'expo-system-ui';
import { useEffect } from 'react';
import useAuthStore from '@/store/AuthStore';
import * as SplashScreen from 'expo-splash-screen';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { useFirebaseNotifications } from '@/hooks/useFirebaseNotifications';
import { NetworkProvider } from '@/components/NetworkProvider';

import messaging, {
	registerDeviceForRemoteMessages,
	getToken,
	subscribeToTopic,
} from '@react-native-firebase/messaging';

messaging().setBackgroundMessageHandler(async (remoteMessage) => {
	try {
		if (remoteMessage.notification) {
			await Notifications.scheduleNotificationAsync({
				content: {
					title: remoteMessage.notification.title || 'Notification',
					body: remoteMessage.notification.body || '',
					data: remoteMessage.data || {},
				},
				trigger: null, // Show immediately
			});
		}
	} catch (error) {
		console.warn('Error showing background notification:', error);
	}
});

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
import { auth } from '@/services/UserAuth';

SplashScreen.preventAutoHideAsync();

Notifications.setNotificationHandler({
	handleNotification: async () => ({
		shouldShowBanner: true,
		shouldShowList: true,
		shouldPlaySound: true,
		shouldSetBadge: true,
	}),
});

function AuthInitializer() {
	const { initializeAuth, authenticateFirebase } = useAuthStore();

	useEffect(() => {
		const initApp = async () => {
			await initializeAuth();

			const currentState = useAuthStore.getState();
			if (currentState.user && currentState.isAuthenticated) {
				try {
					await authenticateFirebase();
					try {
						const messagingInstance = messaging();
						await registerDeviceForRemoteMessages(
							messagingInstance
						);

						const fcmToken = await getToken(messagingInstance);

						if (currentState.user?.id) {
							await subscribeToTopic(
								messagingInstance,
								`user_${currentState.user.id}`
							);
						}

						try {
							if (fcmToken) {
								try {
									const accessToken = await (
										await import('expo-secure-store')
									).getItemAsync('access_token');
									await auth.firebaseAuthToken(
										fcmToken,
										Platform.OS,
										accessToken!
									);
								} catch (e) {
									console.warn(
										'Failed to register FCM token with backend',
										e
									);
								}
							}
						} catch (error) {
							console.error(
								`⚠️ Error retrieving access token for FCM registration:`,
								error
							);
						}

						// Listen for foreground FCM messages
						const unsubscribeForeground =
							messagingInstance.onMessage(
								async (remoteMessage) => {
									try {
										if (remoteMessage.notification) {
											await Notifications.scheduleNotificationAsync(
												{
													content: {
														title:
															remoteMessage
																.notification
																.title ||
															'Notification',
														body:
															remoteMessage
																.notification
																.body || '',
														data:
															remoteMessage.data ||
															{},
													},
													trigger: null,
												}
											);
										}
									} catch (error) {
										console.warn(
											'Error showing foreground notification:',
											error
										);
									}
								}
							);

						// Return cleanup function
						return () => {
							unsubscribeForeground();
						};
					} catch (error) {
						console.error(`⚠️ FCM registration failed:`, error);
						try {
							const expoTokenObj =
								await Notifications.getExpoPushTokenAsync();
							const expoToken =
								(expoTokenObj as any).data ?? expoTokenObj;
							const backendUrl = `${process.env.EXPO_PUBLIC_DJANGO_URL}/api/register_fcm_token`;
							const accessToken = await (
								await import('expo-secure-store')
							).getItemAsync('access_token');
							await fetch(backendUrl, {
								method: 'POST',
								headers: {
									'Content-Type': 'application/json',
									Authorization: accessToken
										? `Bearer ${accessToken}`
										: '',
								},
								body: JSON.stringify({
									token: expoToken,
									platform: Platform.OS,
									provider: 'expo',
								}),
							});
						} catch (e) {
							console.warn(
								'Failed to register Expo push token as fallback',
								e
							);
						}
					}
				} catch (error) {
					console.warn(
						'⚠️ Firebase initialization failed for existing user:',
						error
					);
				}
			}
		};

		initApp();
	}, [initializeAuth, authenticateFirebase]);

	return null;
}

function NotificationsInitializer() {
	const router = useRouter();
	useFirebaseNotifications();

	useEffect(() => {
		const setup = async () => {
			try {
				const { status: existingStatus } =
					await Notifications.getPermissionsAsync();
				let finalStatus = existingStatus;
				if (existingStatus !== 'granted') {
					const { status } =
						await Notifications.requestPermissionsAsync();
					finalStatus = status;
				}

				if (Platform.OS === 'android') {
					await Notifications.setNotificationChannelAsync('default', {
						name: 'Default',
						importance: Notifications.AndroidImportance.MAX,
						vibrationPattern: [0, 250, 250, 250],
					});
				}

				if (finalStatus !== 'granted') {
					console.warn('Notification permissions not granted');
				}
			} catch (e) {
				console.warn('Failed to setup notifications', e);
			}
		};

		void setup();

		const receivedSub = Notifications.addNotificationReceivedListener(
			(notification) => {
				try {
					Notifications.getBadgeCountAsync().then((count) =>
						Notifications.setBadgeCountAsync(count + 1)
					);
				} catch (e) {
					console.warn('Error handling received notification:', e);
				}
			}
		);

		const responseSub =
			Notifications.addNotificationResponseReceivedListener(
				(response) => {
					try {
						const data = response.notification.request.content
							.data as any;
						if (data?.screen) {
							router.push(data.screen);
							return;
						}

						const bookingIdResp =
							data?.bookingId ??
							data?.booking_id ??
							data?.booking;
						if (bookingIdResp) {
							router.push(`/booking/${bookingIdResp}`);
							return;
						}

						if (data?.path) router.push(data.path);
					} catch (e) {
						console.warn(
							'Error handling notification response:',
							e
						);
					}
				}
			);

		return () => {
			receivedSub.remove();
			responseSub.remove();
		};
	}, [router]);

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
				<NetworkProvider>
					<QueryClientProvider client={queryClient}>
						<AuthInitializer />
						<NotificationsInitializer />
						<StatusBar style="dark" />
						<Stack
							screenOptions={{
								headerShown: false,
								animation: 'none',
							}}
						/>
					</QueryClientProvider>
				</NetworkProvider>
			</SafeAreaProvider>
		</GestureHandlerRootView>
	);
}
