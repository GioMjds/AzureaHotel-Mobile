import { httpClient } from '@/configs/axios';
import { auth as firebaseAuth } from '@/configs/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { ApiRoutes } from '@/configs/axios.routes';
import { Logger } from '@/configs/logger';

const logger = Logger.getInstance({ context: 'FirebaseAuth' });

export class FirebaseAuthService {
    /**
     * Get Firebase custom token from Django backend and sign in
     * This bridges Django JWT authentication with Firebase
     */
    static async authenticateWithFirebase(): Promise<boolean> {
        try {
            const accessToken = await SecureStore.getItemAsync('access_token');
            if (!accessToken) {
                logger.warn('⚠️ No access token found, skipping Firebase auth');
                return false;
            }

            const response = await httpClient.post<{
                firebase_token: string;
                user_id: number;
                uid: string;
            }>(ApiRoutes.FIREBASE_TOKEN);

            const { firebase_token } = response;

            if (!firebase_token) {
                logger.error(`❌ No Firebase token in response`);
                logger.error(`Full response: ${JSON.stringify(response)}`);
                return false;
            }
            
            logger.debug('🔑 Received Firebase token, signing in...');
            
            const userCredential = await signInWithCustomToken(
                firebaseAuth,
                firebase_token
            );
            
            logger.debug(`✅ Firebase sign-in successful: ${userCredential.user.uid}`);

            // Store Firebase UID for reference
            await SecureStore.setItemAsync(
                'firebase_uid',
                userCredential.user.uid
            );

            // Verify token claims
            try {
                const idTokenResult = await userCredential.user.getIdTokenResult();
                logger.debug(`🎫 Firebase ID token claims: ${JSON.stringify(idTokenResult.claims)}`);
            } catch (tokenError) {
                logger.warn(`⚠️ Could not get ID token claims: ${tokenError}`);
            }

            return true;
        } catch (error) {
            logger.error(`❌ Firebase authentication failed: ${error}`);
            return false;
        }
    }

    /**
     * Sign out from Firebase
     */
    static async signOutFromFirebase(): Promise<void> {
        try {
            if (firebaseAuth.currentUser) {
                await firebaseAuth.signOut();
                logger.debug('✅ Firebase sign-out successful');
            }
            await SecureStore.deleteItemAsync('firebase_uid');
        } catch (error) {
            logger.error(`❌ Firebase sign out failed: ${error}`);
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