/**
 * Hook for Google OAuth integration in a mobile application.
 * 
 * For Android OAuth with Expo, use the deeplink redirect URI format.
 * This ensures the redirect_uri parameter is consistent with what's registered
 * in Google Cloud Console.
 */
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { useCallback, useState } from 'react';

WebBrowser.maybeCompleteAuthSession();

// Use the Android OAuth Client ID from Google Cloud Console
const GOOGLE_CLIENT_ID = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID;

/**
 * For Android OAuth client with Expo:
 * 
 * Android OAuth clients do NOT have a "Redirect URIs" field in Google Cloud Console.
 * Instead, they validate using:
 * - Package name (com.anonymous.azureahotel) ✅
 * - SHA-1 certificate fingerprint (0B:48:C0:9F:C9:21:16:58:C8:30:05:3F:70:5B:6C:CD:E2:AD:9C:FD) ✅
 * 
 * Use simple scheme-based redirect URI without path to avoid query parameter issues.
 * Expo will append internal params like ?flowName=GeneralOAuthFlow, which is OK for Android.
 */
const REDIRECT_URI = AuthSession.makeRedirectUri({
	scheme: 'azurea-hotel',
	isTripleSlashed: false,
});

// Log for debugging
console.log('📱 Google OAuth Android Client ID:', GOOGLE_CLIENT_ID);
console.log('📱 Google OAuth Redirect URI:', REDIRECT_URI);

export function useGoogleOAuth() {
	const [isLoading, setIsLoading] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);

	const [request, , promptAsync] = AuthSession.useAuthRequest(
		{
			clientId: GOOGLE_CLIENT_ID || '',
			redirectUri: REDIRECT_URI,
			scopes: ['profile', 'email'],
			responseType: AuthSession.ResponseType.Code,
		},
		{
			authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
			tokenEndpoint: 'https://oauth2.googleapis.com/token',
		}
	);

	const handleGoogleSignIn = useCallback(async () => {
		try {
			setIsLoading(true);
			setError(null);

			const result = await promptAsync();

			if (result?.type === 'success') {
				const authorizationCode = result.params.code;

				const response = await fetch(
					`${process.env.EXPO_PUBLIC_DJANGO_URL}/api/auth/google-auth`,
					{
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							code: authorizationCode,
						}),
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					throw new Error(
						errorData.error || 'Google authentication failed'
					);
				}

				const data = await response.json();

				// Handle successful authentication
				if (data.user && data.access_token && data.refresh_token) {
					// Store tokens and user data
					await import('expo-secure-store').then(
						async (SecureStore) => {
							await SecureStore.setItemAsync(
								'access_token',
								data.access_token
							);
							await SecureStore.setItemAsync(
								'refresh_token',
								data.refresh_token
							);
							await SecureStore.setItemAsync(
								'user_data',
								JSON.stringify(data.user)
							);
						}
					);

					// Trigger Firebase authentication
					const { authenticateFirebase } = await import(
						'@/store/AuthStore'
					).then((module) => ({
						authenticateFirebase:
							module.default.getState().authenticateFirebase,
					}));

					await authenticateFirebase();

					return { success: true, user: data.user };
				} else {
					throw new Error('Invalid response from server');
				}
			} else if (result?.type === 'cancel') {
				setError('Google sign-in cancelled');
				return { success: false, cancelled: true };
			}

			return { success: false };
		} catch (err: any) {
			const errorMessage =
				err.message || 'An error occurred during Google sign-in';
			setError(errorMessage);
			console.error('Google OAuth Error:', err);
			return { success: false, error: errorMessage };
		} finally {
			setIsLoading(false);
		}
	}, [promptAsync]);

	return {
		handleGoogleSignIn,
		isLoading,
		error,
		isReady: !!request,
	};
}
