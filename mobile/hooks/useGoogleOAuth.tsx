import { useCallback, useEffect, useState } from 'react';
import {
	GoogleSignin,
	statusCodes,
	isErrorWithCode,
	isSuccessResponse,
	isCancelledResponse,
} from '@react-native-google-signin/google-signin';
import * as SecureStore from 'expo-secure-store';

const GOOGLE_WEB_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

console.log('📱 Google OAuth Web Client ID:', GOOGLE_WEB_CLIENT_ID);

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
					// Check if response has data property (success case)
					if (response && typeof response === 'object' && 'data' in response) {
						console.log('✅ Silent sign-in successful');
						// User is already signed in
					}
				}
			} catch {
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
			console.log(`🔐 Google sign-in response:`, response);

			if (isCancelledResponse(response)) {
				setError('Google sign-in cancelled');
				return { success: false, cancelled: true };
			}

		if (isSuccessResponse(response)) {
			const user = response.data;
			const idToken = user.idToken;
			const serverAuthCode = user.serverAuthCode;

			// 🔍 DEBUG: Log what Google returns
			console.log('📊 Google Sign-In Data:');
			console.log('  - ID Token:', idToken ? '✅ Present' : '❌ Missing');
			console.log('  - Server Auth Code:', serverAuthCode ? '✅ Present' : '❌ Missing');
			console.log('  - Email:', user.user.email);
			console.log('  - Name:', user.user.name);
			console.log('  - Photo:', user.user.photo);
			console.log('  - User ID:', user.user.id);

			// TODO: TESTING MODE - Backend call commented out
			// The issue: Backend expects 'code' (server-side flow) but we're sending 'idToken' (client-side flow)
			// Backend oauth.py uses authorization code flow, but mobile uses ID token flow
			
			/*
			const backendResponse = await fetch(
				`${process.env.EXPO_PUBLIC_DJANGO_URL}/api/auth/google-auth`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						idToken: idToken,
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
			*/

			// 🧪 TESTING: Mock backend response for now
			const mockBackendData = {
				user: {
					id: user.user.id || Math.random().toString(),
					email: user.user.email,
					username: user.user.name || 'Google User',
					first_name: user.user.givenName || user.user.name?.split(' ')[0] || 'User',
					last_name: user.user.familyName || user.user.name?.split(' ').slice(1).join(' ') || '',
					role: 'guest',
					profile_image: user.user.photo || '',
				},
				access_token: idToken || 'mock_access_token',
				refresh_token: 'mock_refresh_token_' + Date.now(),
			};

			console.log('🧪 Mock backend data created:', mockBackendData);

			// Handle successful authentication
			if (
				mockBackendData.user &&
				mockBackendData.access_token &&
				mockBackendData.refresh_token
			) {
				// Store tokens and user data in secure storage
				await SecureStore.setItemAsync(
					'access_token',
					mockBackendData.access_token
				);
				await SecureStore.setItemAsync(
					'refresh_token',
					mockBackendData.refresh_token
				);
				await SecureStore.setItemAsync(
					'user_data',
					JSON.stringify(mockBackendData.user)
				);

				console.log('💾 Tokens and user data stored in SecureStore');

				// Trigger Firebase authentication
				try {
					const { authenticateFirebase } = await import(
						'@/store/AuthStore'
					).then((module) => ({
						authenticateFirebase:
							module.default.getState().authenticateFirebase,
					}));

					await authenticateFirebase();
					console.log('🔥 Firebase authentication triggered');
				} catch (firebaseErr) {
					console.warn('⚠️ Firebase auth failed (non-critical):', firebaseErr);
					// Continue even if Firebase fails
				}

				console.log('✅ Google sign-in successful (TESTING MODE - no backend call)');
				return { success: true, user: mockBackendData.user };
			} else {
				throw new Error('Invalid mock response structure');
			}
		}			return { success: false };
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
