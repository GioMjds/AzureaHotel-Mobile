import { createContext, useState, useContext, useEffect, ReactNode } from 'react';
import * as SecureStore from 'expo-secure-store';
import { httpClient } from '@/configs/axios';
import { ApiRoutes } from '@/configs/axios.routes';
import { Guest } from '@/types/GuestUser.types';

interface AuthContextType {
	user: Guest | null;
	isAuthenticated: boolean;
	isLoading: boolean;
	login: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
	logout: () => Promise<void>;
	checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// SecureStore keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

interface AuthProviderProps {
	children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
	const [user, setUser] = useState<Guest | null>(null);
	const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
	const [isLoading, setIsLoading] = useState<boolean>(true);

	// Store tokens securely
	const storeTokens = async (accessToken: string, refreshToken: string) => {
		try {
			await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, accessToken);
			await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, refreshToken);
		} catch (error) {
			console.error('Error storing tokens:', error);
		}
	};

	// Get stored tokens
	const getStoredTokens = async () => {
		try {
			const accessToken =
				await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
			const refreshToken =
				await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
			return { accessToken, refreshToken };
		} catch (error) {
			console.error('Error getting stored tokens:', error);
			return { accessToken: null, refreshToken: null };
		}
	};

	// Store user data
	const storeUserData = async (userData: Guest) => {
		try {
			await SecureStore.setItemAsync(
				USER_DATA_KEY,
				JSON.stringify(userData)
			);
		} catch (error) {
			console.error('Error storing user data:', error);
		}
	};

	// Get stored user data
	const getStoredUserData = async (): Promise<Guest | null> => {
		try {
			const userData = await SecureStore.getItemAsync(USER_DATA_KEY);
			return userData ? JSON.parse(userData) : null;
		} catch (error) {
			console.error('Error getting stored user data:', error);
			return null;
		}
	};

	// Clear all stored data
	const clearStoredData = async () => {
		try {
			await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
			await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
			await SecureStore.deleteItemAsync(USER_DATA_KEY);
		} catch (error) {
			console.error('Error clearing stored data:', error);
		}
	};

	// Login function
	const login = async (email: string, password: string) => {
		try {
			setIsLoading(true);
			const response = await httpClient.post(ApiRoutes.LOGIN, {
				email,
				password,
			});

			if (
				response.user &&
				response.access_token &&
				response.refresh_token
			) {
				// Store tokens and user data
				await storeTokens(
					response.access_token,
					response.refresh_token
				);
				await storeUserData(response.user);

				setUser(response.user);
				setIsAuthenticated(true);

				return { success: true, message: response.message };
			} else {
				return {
					success: false,
					message: 'Invalid response from server',
				};
			}
		} catch (error: any) {
			return { success: false, message: error.message || 'Login failed' };
		} finally {
			setIsLoading(false);
		}
	};

	// Logout function
	const logout = async () => {
		try {
			setIsLoading(true);

			try {
				await httpClient.post(ApiRoutes.LOGOUT);
			} catch (error) {
				console.log(`Logout API call failed, but continuing with local logout: ${error}`);
			}

			await clearStoredData();

			setUser(null);
			setIsAuthenticated(false);
		} catch (error) {
			console.error('Logout error:', error);
		} finally {
			setIsLoading(false);
		}
	};

	// Check authentication status
	const checkAuthStatus = async () => {
		try {
			setIsLoading(true);

			// First check if we have stored tokens
			const { accessToken } = await getStoredTokens();

			if (!accessToken) {
				setIsAuthenticated(false);
				setUser(null);
				return;
			}

			// Verify with server using the user_auth endpoint
			try {
				const response = await httpClient.get(ApiRoutes.USER_AUTH);

				if (response.isAuthenticated && response.user) {
					setUser(response.user);
					setIsAuthenticated(true);

					// Update stored user data in case it changed
					await storeUserData(response.user);
				} else {
					// Server says not authenticated, clear local data
					await clearStoredData();
					setUser(null);
					setIsAuthenticated(false);
				}
			} catch (error) {
				console.error('Auth check failed:', error);
				// If server check fails, clear everything
				await clearStoredData();
				setUser(null);
				setIsAuthenticated(false);
			}
		} catch (error) {
			console.error('Error checking auth status:', error);
			setIsAuthenticated(false);
			setUser(null);
		} finally {
			setIsLoading(false);
		}
	};

	useEffect(() => {
		checkAuthStatus();
	}, []);

	const value: AuthContextType = {
		user,
		isAuthenticated,
		isLoading,
		login,
		logout,
		checkAuthStatus,
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
