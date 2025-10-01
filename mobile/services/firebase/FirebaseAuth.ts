import { httpClient } from '@/configs/axios';
import { auth as firebaseAuth } from '@/configs/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { ApiRoutes } from '@/configs/axios.routes';

export class FirebaseAuthService {
    /**
     * Get Firebase custom token from Django backend and sign in
     * This bridges Django JWT authentication with Firebase
     */
    static async authenticateWithFirebase(): Promise<boolean> {
        try {
            const response = await httpClient.post<{
                firebase_token: string;
                user_id: number;
                uid: string;
            }>(ApiRoutes.FIREBASE_TOKEN);

            const { firebase_token } = response;

            if (!firebase_token) {
                console.error('❌ No Firebase token in response');
                console.error('Full response:', response);
                return false;
            }
            
            const userCredential = await signInWithCustomToken(
                firebaseAuth,
                firebase_token
            );
            try {
                await userCredential.user.getIdTokenResult();
            } catch (tokenError) {
                console.error('❌ Failed to get ID token claims:', tokenError);
                console.log('✅ Firebase authenticated successfully:', {
                    uid: userCredential.user.uid,
                    email: userCredential.user.email || 'No email in Firebase user object',
                    isAnonymous: userCredential.user.isAnonymous,
                    providerData: userCredential.user.providerData
                });
            }

            // Store Firebase UID for reference
            await SecureStore.setItemAsync(
                'firebase_uid',
                userCredential.user.uid
            );

            return true;
        } catch (error: any) {
            console.error('❌ Firebase authentication failed:', {
                message: error.message,
                code: error.code,
                stack: error.stack?.split('\n').slice(0, 5).join('\n'),
                name: error.name,
                response: error.response?.data || 'No response data'
            });
            
            // Check specific error types
            if (error.code?.includes('auth/')) {
                console.error('🔥 Firebase Auth Error:', error.code);
            } else if (error.response) {
                console.error('🌐 HTTP Error:', {
                    status: error.response.status,
                    statusText: error.response.statusText,
                    data: error.response.data
                });
            } else if (error.request) {
                console.error('📡 Network Error:', error.request);
            }
            
            return false;
        }
    }

    /**
     * Sign out from Firebase
     */
    static async signOutFromFirebase(): Promise<void> {
        try {
            await firebaseAuth.signOut();
            await SecureStore.deleteItemAsync('firebase_uid');
        } catch (error) {
            console.error('❌ Firebase sign out failed:', error);
        }
    }

    /**
     * Check if user is authenticated with Firebase
     */
    static isFirebaseAuthenticated(): boolean {
        return firebaseAuth.currentUser !== null;
    }

    /**
     * Get current Firebase user
     */
    static getCurrentFirebaseUser() {
        return firebaseAuth.currentUser;
    }
}