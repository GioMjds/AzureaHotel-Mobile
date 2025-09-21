import '../globals.css';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import useAuthStore from '@/store/AuthStore';

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            staleTime: 1000 * 60 * 5,
        },
    },
});

function AuthInitializer() {
	const { fetchUser } = useAuthStore();

	useEffect(() => {
		fetchUser();
	}, []);

	return null;
}

export default function RootLayout() {
	return (
		<SafeAreaProvider>
			<QueryClientProvider client={queryClient}>
				<AuthInitializer />
				<Stack screenOptions={{ headerShown: false }}>
					<Stack.Screen name="(screens)" />
					<Stack.Screen name="(auth)" />
				</Stack>
			</QueryClientProvider>
		</SafeAreaProvider>
	);
}