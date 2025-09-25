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
}

interface Actions {
    setUser: (user: Guest | null) => void;
    setIsAuthenticated: (isAuthenticated: boolean) => void;
    setIsLoading: (isLoading: boolean) => void;
    fetchUser: () => Promise<void>;
    clearAuth: () => void;
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
    
    setUser: (user) => set({ user, isAuthenticated: !!user }),
    setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
    setIsLoading: (isLoading) => set({ isLoading }),
    
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
            await clearStoredData();
            set({ user: null, isAuthenticated: false, isLoading: false });
        }
    },
    
    clearAuth: () => {
        set({ user: null, isAuthenticated: false, isLoading: false });
    }
}));

export default useAuthStore;