import { useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import useAuthStore from '@/store/AuthStore';
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
};

export function useAuthMutations() {
    const queryClient = useQueryClient();
    const { setUser, setIsAuthenticated, setIsLoading } = useAuthStore();

    // Login mutation
    const loginMutation = useMutation({
        mutationFn: async ({ email, password }: { email: string; password: string }) => {
            return await auth.login(email, password);
        },
        onMutate: () => {
            setIsLoading(true);
        },
        onSuccess: async (data) => {
            if (data.user && data.access_token && data.refresh_token) {
                await storeTokens(data.access_token, data.refresh_token);
                await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(data.user));
                setUser(data.user);
                setIsAuthenticated(true);
                setIsLoading(false);
                queryClient.invalidateQueries({ queryKey: ['user'] });
                queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
            } else {
                throw new Error('Invalid response from server');
            }
        },
        onError: (error) => {
            logger.error(`Login error: ${error}`);
            setIsLoading(false);
        },
        meta: {
            showSuccessNotification: true,
            successMessage: 'Login successful!',
        },
    });

    // Logout mutation
    const logoutMutation = useMutation({
        mutationFn: async () => {
            return await auth.logout();
        },
        onMutate: () => {
            setIsLoading(true);
        },
        onSuccess: async () => {
            await clearStoredData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            queryClient.clear();
        },
        onError: async (error) => {
            logger.error(`Logout error: ${error}`);
            await clearStoredData();
            setUser(null);
            setIsAuthenticated(false);
            setIsLoading(false);
            queryClient.clear();
        },
        meta: {
            showSuccessNotification: true,
            successMessage: 'Logged out successfully!',
        },
    });

    return {
        loginMutation,
        logoutMutation,
    };
}