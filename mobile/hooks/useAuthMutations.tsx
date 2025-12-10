import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import useAuthStore from '@/store/AuthStore';
import { FirebaseAuthService } from '@/services/firebase/FirebaseAuth';
import * as SecureStore from 'expo-secure-store';
import { Logger } from '@/configs/logger';

const logger = Logger.getInstance({ context: 'useAuthMutations' });

// SecureStore keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

// Helper functions
const storeTokens = async (accessToken: string, refreshToken: string) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

const clearStoredData = async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
    await SecureStore.deleteItemAsync('firebase_uid');
};

export function useAuthMutations() {
    const queryClient = useQueryClient();
    const { setUser, setIsAuthenticated, setIsLoading } = useAuthStore();

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            return await auth.login(email, password);
        },
        onSuccess: async (data) => {
            if (data.user && data.access_token && data.refresh_token) {
                logger.info('📱 Login successful, processing response...');
                logger.info(`   User: ${data.user.email} (ID: ${data.user.id})`);
                logger.info(`   Has firebase_token: ${!!data.firebase_token}`);
                
                await storeTokens(data.access_token, data.refresh_token);
                await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(data.user));
                setUser(data.user);
                setIsAuthenticated(true);

                // Authenticate with Firebase using token from login response
                if (data.firebase_token) {
                    logger.info('🔥 Login response contains firebase_token, using direct authentication');
                    await FirebaseAuthService.authenticateWithToken(data.firebase_token);
                } else {
                    logger.warn('⚠️ Login response missing firebase_token, fetching from backend');
                    await FirebaseAuthService.authenticateWithFirebase();
                }

                queryClient.invalidateQueries({ queryKey: ['user'] });
                queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
            }
        },
        onError: (error) => {
            console.error(`Login error: ${error}`);
            setIsLoading(false);
        },
    });

    const logoutMutation = useMutation({
        mutationFn: () => auth.logout(),
        onMutate: () => {
            setIsLoading(true);
        },
        onSuccess: async () => {
            await FirebaseAuthService.signOutFromFirebase();
            await clearStoredData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            queryClient.clear();
        },
        onError: async (error) => {
            await FirebaseAuthService.signOutFromFirebase();
            await clearStoredData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            queryClient.clear();
        },
    });

    return {
        loginMutation,
        logoutMutation,
    };
}