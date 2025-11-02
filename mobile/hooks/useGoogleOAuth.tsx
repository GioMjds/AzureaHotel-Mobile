/**
 * Hook for Google OAuth integration using @react-native-google-signin/google-signin
 * 
 * This implementation uses the native Google Sign-In SDK for better performance and reliability.
 * 
 * SETUP REQUIREMENTS:
 * 
 * 1. Installation:
 *    npm install @react-native-google-signin/google-signin
 * 
 * 2. Add to app.json plugins array:
 *    {
 *      "plugins": [
 *        ["@react-native-google-signin/google-signin"]
 *      ]
 *    }
 * 
 *    Note: If using Firebase, the google-services.json is already configured.
 *    For iOS without Firebase, add:
 *    "ios": {
 *      "googleServicePlistPath": "./GoogleService-Info.plist"
 *    }
 * 
 * 3. Build native app:
 *    npx expo prebuild --clean
 *    npx expo run:android
 *    npx expo run:ios
 * 
 * 4. Configuration in Google Cloud Console:
 *    - Android: SHA-1 fingerprint must be registered
 *    - iOS: Bundle ID must be registered
 *    - Web Client ID: Required for idToken and server-side validation
 */
import { useCallback, useEffect, useState } from 'react';
import {
	GoogleSignin,
	statusCodes,
	isErrorWithCode,
	isSuccessResponse,
	isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

// Web Client ID from Google Cloud Console (required for idToken)
const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

// Log for debugging
console.log('📱 Google OAuth Web Client ID:', GOOGLE_WEB_CLIENT_ID);

// Initialize Google Sign-In on module load
GoogleSignin.configure({
	webClientId: GOOGLE_WEB_CLIENT_ID,
	scopes: ['profile', 'email'],
	offlineAccess: true,
	forceCodeForRefreshToken: true,
});

export function useGoogleOAuth() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [isInitialized, setIsInitialized] = useState<boolean>(false);

	// Check if user has previously signed in
	useEffect(() => {
		const checkPreviousSignIn = async () => {
			try {
				const hasPreviousSignIn = GoogleSignin.hasPreviousSignIn();
				setIsInitialized(true);

				if (hasPreviousSignIn) {
					// Attempt silent sign-in
					const response = await GoogleSignin.signInSilently();
					if (isSuccessResponse(response)) {
						console.log('✅ Silent sign-in successful');
						// User is already signed in
					}
				}
			} catch (err) {
				console.log('ℹ️ No previous sign-in found');
				setIsInitialized(true);
			}
		};

		checkPreviousSignIn();
	}, []);

	const handleGoogleSignIn = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			// Check if Play Services are available (Android only)
			await GoogleSignin.hasPlayServices({
				showPlayServicesUpdateDialog: true,
			});

			// Sign in with Google
			const response = await GoogleSignin.signIn();

			if (isCancelledResponse(response)) {
				setError('Google sign-in cancelled');
				return { success: false, cancelled: true };
			}

			if (isSuccessResponse(response)) {
				const user = response.data;
				const idToken = user.idToken;

				// Send ID token to backend for verification and JWT issuance
				const backendResponse = await fetch(
					`${process.env.EXPO_PUBLIC_DJANGO_URL}/api/auth/google-auth`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							idToken: idToken,
							// Optional: send additional user info if needed
							email: user.user.email,
							name: user.user.name,
						}),
					}
				);

				if (!backendResponse.ok) {
					const errorData = await backendResponse.json();
					throw new Error(
						errorData.error || 'Backend authentication failed'
					);
				}

				const backendData = await backendResponse.json();

				// Handle successful authentication
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

					// Trigger Firebase authentication
					const { authenticateFirebase } = await import(
						'@/store/AuthStore'
					).then((module) => ({
						authenticateFirebase:
							module.default.getState().authenticateFirebase,
					}));

					await authenticateFirebase();

					console.log('✅ Google sign-in successful');
					return { success: true, user: backendData.user };
				} else {
					throw new Error('Invalid response from backend');
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
			console.error('❌ Google OAuth Error:', err);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoading(false);
		}
	}, []);

	const handleGoogleSignOut = useCallback(async () => {
		try {
			await GoogleSignin.signOut();
			console.log('✅ Google sign-out successful');
			return { success: true };
		} catch (err: any) {
			const errorMessage =
				err.message || 'Failed to sign out from Google';
			console.error('❌ Google sign-out error:', err);
			return { success: false, error: errorMessage };
		}
	}, []);

	return {
		handleGoogleSignIn,
		handleGoogleSignOut,
		isLoading,
		error,
		isReady: isInitialized,
		GoogleSignin, // Export GoogleSignin for additional operations if needed
	};
}
