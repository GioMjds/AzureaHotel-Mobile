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
            if (!accessToken) return false;

            const response = await httpClient.post<{
                firebase_token: string;
                user_id: number;
                uid: string;
            }>(ApiRoutes.FIREBASE_TOKEN);

            const { firebase_token } = response;

            if (!firebase_token) return false;
            
            const userCredential = await signInWithCustomToken(
                firebaseAuth,
                firebase_token
            );
            
            await SecureStore.setItemAsync(
                'firebase_uid',
                userCredential.user.uid
            );

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