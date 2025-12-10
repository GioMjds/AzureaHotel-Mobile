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
            logger.info('🔥 Attempting Firebase sign-in with custom token...');
            
            if (!firebaseToken) {
                logger.warn('❌ No firebase_token provided to authenticateWithToken');
                return false;
            }
            
            logger.info(`   Token length: ${firebaseToken.length} chars`);
            
            // DEBUG: Log Firebase app configuration
            const app = firebaseAuth.app;
            logger.info('📱 Mobile Firebase Config (from .env):');
            logger.info(`   Project ID: ${app.options.projectId}`);
            logger.info(`   Auth Domain: ${app.options.authDomain}`);
            logger.info(`   Database URL: ${app.options.databaseURL}`);
            logger.info(`   App ID: ${app.options.appId}`);
            logger.info(`   API Key: ${app.options.apiKey?.substring(0, 15)}...`);
            
            // DEBUG: Decode JWT token to see what backend generated
            try {
                const parts = firebaseToken.split('.');
                if (parts.length === 3) {
                    // Decode header
                    const headerB64 = parts[0];
                    const header = JSON.parse(Buffer.from(headerB64, 'base64').toString('utf-8'));
                    logger.info('🔑 Token Header:');
                    logger.info(`   Algorithm: ${header.alg}`);
                    logger.info(`   Type: ${header.typ}`);
                    
                    // Decode payload with proper padding
                    let payloadB64 = parts[1];
                    const padding = 4 - (payloadB64.length % 4);
                    if (padding !== 4) {
                        payloadB64 += '='.repeat(padding);
                    }
                    const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('utf-8'));
                    
                    logger.info('🔑 Token Payload:');
                    logger.info(`   UID: ${payload.uid}`);
                    logger.info(`   Issuer: ${payload.iss}`);
                    logger.info(`   Audience: ${payload.aud}`);
                    logger.info(`   Issued At: ${new Date(payload.iat * 1000).toISOString()}`);
                    logger.info(`   Expires At: ${new Date(payload.exp * 1000).toISOString()}`);
                    if (payload.claims) {
                        logger.info(`   Custom Claims: ${JSON.stringify(payload.claims)}`);
                    }
                } else {
                    logger.warn(`   ⚠️ Invalid JWT structure: ${parts.length} parts (expected 3)`);
                }
            } catch (decodeError: any) {
                logger.warn('   ⚠️ Could not decode token:', decodeError.message);
            }
            
            const userCredential = await signInWithCustomToken(
                firebaseAuth,
                firebaseToken
            );
            
            logger.info('✅ Firebase sign-in successful!');
            logger.info(`   UID: ${userCredential.user.uid}`);
            logger.info(`   Email: ${userCredential.user.email || 'N/A'}`);
            
            await SecureStore.setItemAsync(
                'firebase_uid',
                userCredential.user.uid
            );

            return true;
        } catch (error: any) {
            logger.error('❌ Firebase sign-in error:', error);
            logger.error(`   Error code: ${error.code}`);
            logger.error(`   Error message: ${error.message}`);
            
            // Additional debugging info
            if (error.code === 'auth/invalid-custom-token') {
                logger.error('');
                logger.error('🔍 TROUBLESHOOTING auth/invalid-custom-token:');
                logger.error('   1. Check if mobile App ID matches Android (not Web)');
                logger.error('   2. Verify backend service account project matches mobile');
                logger.error('   3. Check token issuer matches service account email');
                logger.error('   4. Ensure token audience matches project ID');
                logger.error('   5. Verify Metro bundler restarted after .env change');
            }
            
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