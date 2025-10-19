import React, { useCallback } from 'react';
import StyledText from '@/components/ui/StyledText';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/services/UserAuth';
import { GuestResponse } from '@/types/GuestUser.types';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'expo-router';
import { Image, TouchableOpacity, View } from 'react-native';
import NotificationBell from '@/components/ui/NotificationBell';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
	headerLabel: string;
}

const Header = ({ headerLabel }: HeaderProps) => {
	const { user } = useAuth();

	const router = useRouter();
	const pathname = usePathname();

	const { data } = useQuery<GuestResponse>({
		queryKey: ['userProfile', user?.id],
		queryFn: async () => {
			return await auth.getGuestProfile(user?.id as number);
		},
		enabled: !!user?.id,
	});

	const isOnProfileRoute = !!pathname && pathname.includes('/profile');

	const handleProfilePress = useCallback(() => {
		if (isOnProfileRoute) return;
		router.push('/profile');
	}, [isOnProfileRoute, router]);

	if (!data) return null;

	const guest = data.data;

	return (
		<SafeAreaView edges={[ 'top' ]} className="bg-background-elevated border-b border-border-subtle">
			<View className="flex-row items-center justify-between px-6 py-4">
				<NotificationBell />

				{/* Centered Header Label */}
				<View className="flex-1 items-center justify-center">
					<StyledText
						variant="playfair-bold"
						className="text-3xl text-text-primary"
					>
						{headerLabel}
					</StyledText>
				</View>

				{/* Profile Image on Right */}
				<TouchableOpacity
					hitSlop={20}
					onPress={handleProfilePress}
					activeOpacity={0.7}
					disabled={isOnProfileRoute}
					accessibilityState={{ disabled: isOnProfileRoute }}
				>
					<Image
						source={{ uri: guest.profile_image, cache: 'default' }}
						className="w-14 h-14 rounded-full border-2 border-brand-primary"
						resizeMode="cover"
					/>
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

export default React.memo(Header);
