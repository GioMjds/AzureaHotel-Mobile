import { useCallback, useEffect, useState } from 'react';
import {
	GoogleSignin,
	statusCodes,
	isErrorWithCode,
	isSuccessResponse,
	isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';
import { auth } from '@/services/UserAuth';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

GoogleSignin.configure({
	webClientId: GOOGLE_WEB_CLIENT_ID,
	scopes: ['profile', 'email'],
	offlineAccess: true,
	forceCodeForRefreshToken: true,
	accountName: '', // Prevents auto-selection of cached account
});

export function useGoogleOAuth() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const handleGoogleSignIn = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Check if Play Services are available (Android only)
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});

			// Sign out silently to force account selection picker
			try {
				await GoogleSignin.signOut();
			} catch (signOutError) {
				console.log('No previous Google sign-in to clear');
			}

			const response = await GoogleSignin.signIn();

			if (isCancelledResponse(response)) {
				setError('Google sign-in cancelled');
				return { success: false, cancelled: true };
			}

			if (isSuccessResponse(response)) {
				const user = response.data;
				const serverAuthCode = user.serverAuthCode;

				// Backend expects 'code' (serverAuthCode) for authorization code flow
				if (!serverAuthCode) {
					throw new Error(
						'Server auth code not available. Please check Google OAuth configuration.'
					);
				}

				const backendData = await auth.googleAuth(serverAuthCode);

				// Check if user requires OTP verification (new Google user)
				if (backendData.requires_verification) {
					return {
						success: false,
						requiresVerification: true,
						email: backendData.email,
						password: backendData.password,
						otp: backendData.otp,
						message: backendData.message,
					};
				}

				// Handle successful authentication for existing users
				if (
					backendData.user &&
					backendData.access_token &&
					backendData.refresh_token
				) {
					// Store tokens and user data in secure storage
					await SecureStore.setItemAsync(
						'access_token',
						backendData.access_token
					);
					await SecureStore.setItemAsync(
						'refresh_token',
						backendData.refresh_token
					);
					await SecureStore.setItemAsync(
						'user_data',
						JSON.stringify(backendData.user)
					);

					try {
						const AuthStore = await import(
							'@/store/AuthStore'
						).then((module) => module.default);
						const {
							setUser,
							setIsAuthenticated,
							authenticateFirebase,
						} = AuthStore.getState();

						// Set user and authentication state
						setUser(backendData.user);
						setIsAuthenticated(true);

						authenticateFirebase();
					} catch {
						console.error('❌ Failed to update AuthStore:');
					}

					return { success: true, user: backendData.user };
				} else {
					throw new Error('Invalid backend response structure');
				}
			}
			return { success: false };
		} catch (err: any) {
			let errorMessage =
				err.message || 'An error occurred during Google sign-in';

			// Handle specific Google Sign-In errors
			if (isErrorWithCode(err)) {
				switch (err.code) {
					case statusCodes.IN_PROGRESS:
						errorMessage = 'Sign-in is already in progress';
						break;
					case statusCodes.PLAY_SERVICES_NOT_AVAILABLE:
						errorMessage = 'Google Play Services not available';
						break;
					case statusCodes.SIGN_IN_CANCELLED:
						return { success: false, cancelled: true };
					case statusCodes.SIGN_IN_REQUIRED:
						errorMessage = 'Sign-in is required';
						break;
					default:
						errorMessage = `Google Sign-In error: ${err.code}`;
				}
			}

			setError(errorMessage);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleGoogleSignOut = useCallback(async () => {
		try {
			await GoogleSignin.signOut();
			return { success: true };
		} catch (err: any) {
			const errorMessage = err.message || 'Failed to sign out from Google';
			return { success: false, error: errorMessage };
		}
	}, []);

	return {
		handleGoogleSignIn,
		handleGoogleSignOut,
		isLoading,
		error,
		GoogleSignin
	};
}
