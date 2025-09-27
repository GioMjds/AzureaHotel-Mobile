import { create } from "zustand";
import * as SecureStore from 'expo-secure-store';
import { Guest } from "@/types/GuestUser.types";
import { auth } from '@/services/UserAuth';

// SecureStore keys
const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';
const USER_DATA_KEY = 'user_data';

interface State {
    user: Guest | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    isInitialized: boolean;
}

interface Actions {
    setUser: (user: Guest | null) => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    setIsInitialized: (isInitialized: boolean) => void;
    initializeAuth: () => Promise<void>;
    fetchUser: () => Promise<void>;
    clearAuth: () => Promise<void>;
}

// Helper functions
const clearStoredData = async () => {
    await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    await SecureStore.deleteItemAsync(USER_DATA_KEY);
};

const useAuthStore = create<State & Actions>((set, get) => ({
    user: null,
    isAuthenticated: false,
    isLoading: true,
    isInitialized: false,
    
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setIsInitialized: (isInitialized) => set({ isInitialized }),
    
    // Fast initialization with stored data, then background verification
    initializeAuth: async () => {
        try {
            set({ isLoading: true, isInitialized: false });
            
            // Quick check for stored token and user data
            const [accessToken, storedUserData] = await Promise.all([
                SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
                SecureStore.getItemAsync(USER_DATA_KEY)
            ]);
            
            if (accessToken && storedUserData) {
                try {
                    // Parse and set stored user data immediately for faster UI response
                    const userData = JSON.parse(storedUserData);
                    set({ 
                        user: userData, 
                        isAuthenticated: true, 
                        isLoading: false,
                        isInitialized: true 
                    });
                    
                    // Verify authentication in background (non-blocking)
                    get().fetchUser();
                } catch (parseError) {
                    console.error('Error parsing stored user data:', parseError);
                    await clearStoredData();
                    set({ 
                        user: null, 
                        isAuthenticated: false, 
                        isLoading: false,
                        isInitialized: true 
                    });
                }
            } else {
                // No stored auth data - user needs to login
                set({ 
                    user: null, 
                    isAuthenticated: false, 
                    isLoading: false,
                    isInitialized: true 
                });
            }
        } catch (error) {
            console.error('Initialize auth error:', error);
            await clearStoredData();
            set({ 
                user: null, 
                isAuthenticated: false, 
                isLoading: false,
                isInitialized: true 
            });
        }
    },
    
    fetchUser: async () => {
        try {
            const accessToken = await SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
            if (!accessToken) {
                set({ user: null, isAuthenticated: false, isLoading: false });
                return;
            }

            const response = await auth.userAuth();
            if (response.isAuthenticated) {
                await SecureStore.setItemAsync(USER_DATA_KEY, JSON.stringify(response.user));
                set({ user: response.user, isAuthenticated: true, isLoading: false });
            } else {
                await clearStoredData();
                set({ user: null, isAuthenticated: false, isLoading: false });
            }
        } catch (error) {
            console.error('Fetch user error:', error);
            // Don't clear auth on network errors if we have stored data
            const storedUserData = await SecureStore.getItemAsync(USER_DATA_KEY);
            if (!storedUserData) {
                await clearStoredData();
                set({ user: null, isAuthenticated: false, isLoading: false });
            } else {
                // Keep existing state but stop loading
                set({ isLoading: false });
            }
        }
    },
    
    clearAuth: async () => {
        await clearStoredData();
        set({ user: null, isAuthenticated: false, isLoading: false });
    }
}));

export default useAuthStore;