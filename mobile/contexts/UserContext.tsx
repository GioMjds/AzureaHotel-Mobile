import { createContext, useContext, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpClient } from '@/configs/axios';
import { ApiRoutes } from '@/configs/axios.routes';
import { Guest } from '@/types/GuestUser.types';
import { auth } from '@/services/UserAuth';

// SecureStore keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

interface AuthContextType {
	user: Guest | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
	logout: () => Promise<void>;
	refetchUser: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Used for login mutation
const storeTokens = async (accessToken: string, refreshToken: string) => {
	await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
	await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
};

// Particularly for logout mutation
const clearStoredData = async () => {
	await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
	await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
	await SecureStore.deleteItemAsync(USER_DATA_KEY);
};

const fetchUser = async () => {
	const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
	if (!accessToken) return null;
	const response = await httpClient.get(ApiRoutes.USER_AUTH);
	if (response.isAuthenticated) {
		await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(response.user));
		return response.user;
	}
	await clearStoredData();
	return null;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
	const queryClient = useQueryClient();

	const { data: user, refetch, isLoading } = useQuery({
		queryKey: ['user'],
		queryFn: fetchUser,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});

	const isAuthenticated = !!user;

	const loginMutation = useMutation({
		mutationFn: ({ email, password }: { email: string; password: string }) => auth.login(email, password),
		onSuccess: async (data) => {
			if (data.user && data.access_token && data.refresh_token) {
				await storeTokens(data.access_token, data.refresh_token);
				await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(data.user));
				queryClient.setQueryData(['user'], data.user);
			}
		},
		onError: (error) => {
			console.error(`Login error: ${error}`);
			return { success: false, message: 'Invalid response from server' };
		}
	});

	const logoutMutation = useMutation({
		mutationFn: auth.logout,
		onSuccess: async () => {
			await clearStoredData();
			queryClient.setQueryData(['user'], null);
		},
		onError: (error) => {
			console.error(`Logout error: ${error}`);
			return { success: false, message: 'Logout failed' };
		}
	});

	// Login function
	const login = async (email: string, password: string) => {
		return loginMutation.mutateAsync({ email, password });
	};

	// Logout function
	const logout = async () => {
		return logoutMutation.mutateAsync();
	};

	const value: AuthContextType = {
		user,
		isAuthenticated,
		isLoading,
		login,
		logout,
		refetchUser: refetch,
	};

	return (
		<AuthContext.Provider value={value}>{children}</AuthContext.Provider>
	);
};

export const useAuth = () => {
	const context = useContext(AuthContext);
	if (context === undefined) {
		throw new Error('useAuth must be used within an AuthProvider');
	}
	return context;
};
