import { QueryClient } from '@tanstack/react-query';
import { firebaseRealtimeService } from '@/services/firebase/index';
import * as Network from 'expo-network';
import { onlineManager } from '@tanstack/react-query';

// Configure React Query's online manager with Expo Network
onlineManager.setEventListener((setOnline) => {
    let interval: ReturnType<typeof setInterval>;

    const checkNetwork = async () => {
        try {
            const state = await Network.getNetworkStateAsync();
            setOnline(!!state.isConnected);
        } catch (error) {
            console.warn('Failed to check network:', error);
            setOnline(false);
        }
    };

    // Initial check
    checkNetwork();

    // Poll every 3 seconds
    interval = setInterval(checkNetwork, 3000);

    return () => {
        clearInterval(interval);
    };
});

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
			gcTime: 10 * 60 * 1000, // 10 minutes
			retry: (failureCount, error: any) => {
				if (
					error?.response?.status >= 400 &&
					error?.response?.status < 500
				) {
					return error?.response?.status === 408
						? failureCount < 3
						: false;
				}
				return failureCount < 3;
			},
			retryDelay: (attemptIndex) =>
				Math.min(1000 * 2 ** attemptIndex, 30000),
			refetchOnWindowFocus: false,
			refetchOnReconnect: true,
			refetchOnMount: true,
		},
		mutations: {
			retry: false,
		},
	},
});

// Set the query client reference in Firebase service
firebaseRealtimeService.setQueryClient(queryClient);