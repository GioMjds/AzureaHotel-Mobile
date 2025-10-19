import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Stack, usePathname } from 'expo-router';
import Tabs from '@/layout/Tabs';
import Header from '@/layout/Header';
import { useMemo } from 'react';

export default function PublicScreensLayout() {
	const pathname = usePathname();

	const headerLabel = useMemo(() => {
		const route = pathname.replace(/^\//, '');

		const routeLabelMap: Record<string, string> = {
			'': 'My Bookings',
			'areas': 'Areas',
			'rooms': 'Rooms',
			'profile': 'My Profile',
			'notifications': 'Notifications',
		};

		return routeLabelMap[route];
	}, [pathname]);

	return (
		<ProtectedRoute requireAuth={true}>
			<Header headerLabel={headerLabel} />
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="index" options={{ title: 'My Bookings' }} />
				<Stack.Screen name="areas/index" options={{ title: 'Areas' }} />
				<Stack.Screen name="rooms/index" options={{ title: 'Rooms' }} />
				<Stack.Screen name="profile/index" options={{ title: 'My Profile' }} />
			</Stack>
			<Tabs />
		</ProtectedRoute>
	);
}
