import { ProtectedRoute } from '@/components/ProtectedRoute';
import { Stack } from 'expo-router';

export default function UserProfileSettingsLayout() {
	return (
		<ProtectedRoute requireAuth={true}>
			<Stack screenOptions={{ headerShown: false }} />
		</ProtectedRoute>
	);
}
