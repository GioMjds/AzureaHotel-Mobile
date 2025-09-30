import { QueryClient } from '@tanstack/react-query';
import { firebaseRealtimeService } from '@/services/firebase/index';

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
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
		},
		mutations: {
			retry: false,
		},
	},
});

// Set the query client reference in Firebase service
firebaseRealtimeService.setQueryClient(queryClient);
