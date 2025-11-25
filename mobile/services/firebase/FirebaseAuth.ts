import { httpClient } from '@/configs/axios';
import { auth as firebaseAuth } from '@/configs/firebase';
import { signInWithCustomToken } from 'firebase/auth';
import * as SecureStore from 'expo-secure-store';
import { ApiRoutes } from '@/configs/axios.routes';
import { Logger } from '@/configs/logger';

const logger = Logger.getInstance({ context: 'FirebaseAuth' });

export class FirebaseAuthService {
    /**
     * Authenticate with Firebase using a custom token directly
     * Used when token is provided from login response
     */
    static async authenticateWithToken(firebaseToken: string): Promise<boolean> {
        try {
            if (!firebaseToken) return false;
            
            const userCredential = await signInWithCustomToken(
                firebaseAuth,
                firebaseToken
            );
            
            await SecureStore.setItemAsync(
                'firebase_uid',
                userCredential.user.uid
            );

            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get Firebase custom token from Django backend and sign in
     * This bridges Django JWT authentication with Firebase
     * Used as fallback or when re-authenticating
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

            return await this.authenticateWithToken(firebase_token);
        } catch (error) {
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
        } catch {
            return;
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