import StyledText from '@/components/ui/StyledText';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/services/UserAuth';
import { GuestResponse } from '@/types/GuestUser.types';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Image, TouchableOpacity, View } from 'react-native';
import NotificationBell from '@/components/ui/NotificationBell';
import { SafeAreaView } from 'react-native-safe-area-context';

interface HeaderProps {
	headerLabel: string;
}

const Header = ({ headerLabel }: HeaderProps) => {
	const { user } = useAuth();

	const router = useRouter();

	const { data } = useQuery<GuestResponse>({
		queryKey: ['userProfile', user?.id],
		queryFn: async () => {
			return await auth.getGuestProfile(user?.id as number);
		},
		enabled: !!user?.id,
	});

	const handleProfilePress = () => {
		router.push('/profile');
	};

	if (!data) return null;

	const guest = data.data;

	return (
		<SafeAreaView edges={[ 'top' ]} className="bg-background-elevated border-b border-border-subtle">
			<View className="flex-row items-center justify-between px-6 py-4">
				<NotificationBell />

				{/* Centered Header Label */}
				<View className="flex-1 items-center justify-center">
					<StyledText
						variant="playfair-semibold"
						className="text-2xl text-text-primary"
					>
						{headerLabel}
					</StyledText>
				</View>

				{/* Profile Image on Right */}
				<TouchableOpacity onPress={handleProfilePress} activeOpacity={0.7}>
					{guest.profile_image ? (
						<Image
							source={{ uri: guest.profile_image, cache: 'default' }}
							className="w-10 h-10 rounded-full border-2 border-brand-accent"
							resizeMode="cover"
						/>
					) : (
						<View className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center border-2 border-brand-primary">
							<StyledText variant="playfair-bold" className="text-lg text-brand-primary">
								{guest.first_name?.charAt(0).toUpperCase() || 'U'}
							</StyledText>
						</View>
					)}
				</TouchableOpacity>
			</View>
		</SafeAreaView>
	);
};

export default Header;
