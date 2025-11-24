import { QueryClient } from '@tanstack/react-query';
import { firebaseRealtimeService } from '@/services/firebase/index';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

// ✅ BETTER APPROACH: Event-driven network monitoring
onlineManager.setEventListener((setOnline) => {
    // Initial check
    const checkNetwork = async () => {
        try {
            const state = await Network.getNetworkStateAsync();
            setOnline(!!state.isConnected);
        } catch (error) {
            console.warn('Failed to check network:', error);
            setOnline(false);
        }
    };

    checkNetwork();

    // Subscribe to network state changes (event-driven)
    const subscription = Network.addNetworkStateListener((state) => {
        setOnline(!!state.isConnected);
    });

    // Cleanup subscription
    return () => {
        subscription.remove();
    };
});

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 60 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            refetchOnMount: false,
            refetchOnReconnect: false, // Keep false to prevent auto-refetch
            networkMode: 'offlineFirst',
        },
        mutations: {
            retry: false,
            networkMode: 'offlineFirst',
        },
    },
});

firebaseRealtimeService.setQueryClient(queryClient);