import {
	ScrollView,
	View,
	Text,
	Image,
	ActivityIndicator,
	TouchableOpacity,
	Pressable,
} from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { auth } from '@/services/UserAuth';
import { useAuth } from '@/hooks/useAuth';
import { GuestResponse, IsVerified } from '@/types/GuestUser.types';
import { getVerificationDisplay } from '@/utils/formatters';
import { useAuthMutations } from '@/hooks/useAuthMutations';
import { Link } from 'expo-router';
import { FontAwesome } from '@expo/vector-icons';

export default function ProfileScreen() {
	const { user } = useAuth();

	const { logoutMutation } = useAuthMutations();

	const { data, isLoading, error } = useQuery<GuestResponse>({
		queryKey: ['userProfile', user?.id],
		queryFn: async () => {
			return await auth.getGuestProfile(user?.id as number);
		},
		enabled: !!user?.id,
	});

	if (isLoading) {
		return (
			<View className="flex-1 bg-background-default">
				<View className="flex-1 justify-center items-center">
					<View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center">
						<ActivityIndicator size="large" color="#6F00FF" />
						<Text className="text-text-muted mt-4 font-montserrat text-lg">
							Loading your profile...
						</Text>
						<View className="w-32 h-2 bg-neutral-200 rounded-full mt-4 overflow-hidden">
							<View
								className="h-full bg-brand-primary rounded-full animate-pulse"
								style={{ width: '60%' }}
							/>
						</View>
					</View>
				</View>
			</View>
		);
	}

	if (error) {
		return (
			<View className="flex-1 bg-background-default">
				<View className="flex-1 justify-center items-center p-6">
					<View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center max-w-sm">
						<View className="w-16 h-16 bg-feedback-error-light rounded-full items-center justify-center mb-4">
							<Text className="text-feedback-error-DEFAULT text-2xl">
								!
							</Text>
						</View>
						<Text className="text-feedback-error-DEFAULT text-xl font-playfair-bold text-center mb-2">
							Oops! Something went wrong
						</Text>
						<Text className="text-text-muted font-montserrat text-center mb-6">
							We couldn&apos;t load your profile. Please check
							your connection and try again.
						</Text>
						<TouchableOpacity className="bg-brand-primary px-6 py-3 rounded-xl">
							<Text className="text-text-inverse font-montserrat-bold">
								Try Again
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		);
	}

	if (!data) {
		return (
			<View className="flex-1 bg-background-default">
				<View className="flex-1 justify-center items-center p-6">
					<View className="bg-surface-default rounded-3xl p-8 shadow-lg items-center">
						<Text className="text-text-muted font-playfair text-lg">
							No profile data found
						</Text>
					</View>
				</View>
			</View>
		);
	}

	const guest = data.data;
	const guestFullName = `${guest.first_name} ${guest.last_name}`;
	const verificationStatus = getVerificationDisplay(guest.is_verified);

	return (
		<View className="flex-1 bg-background-default">
			<ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
				{/* Profile Card with Modern Design */}
				<View className="bg-surface-default rounded-3xl shadow-xl mx-4 mb-6 border-2 border-brand-primary overflow-hidden">
					<View className="p-6">
						<View className="flex-row items-center justify-between">
							{/* Left side - Profile Image and Info */}
							<View className="flex-row items-center flex-1">
								<View className="relative mr-4">
									<View className="w-20 h-20 rounded-full bg-gradient-to-br from-brand-primary to-brand-secondary p-1">
										<Image
											source={{
												uri: guest.profile_image,
												cache: 'default',
											}}
											className="w-full h-full rounded-full bg-neutral-200"
										/>
									</View>
									<View
										className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full border-2 border-white shadow-lg flex items-center justify-center ${verificationStatus.color}`}
									>
										<Text className="text-white text-xs font-bold">
											{verificationStatus.icon}
										</Text>
									</View>
								</View>

								<View className="flex-1">
									<Text className="text-4xl font-playfair-bold text-text-primary mb-1">
										{guestFullName}
									</Text>
									<View className="flex-row items-center">
										<FontAwesome
											name="envelope"
											size={16}
											color="#6B7280"
											className="mr-2"
										/>
										<Text className="text-text-secondary font-montserrat text-base">
											{guest.email}
										</Text>
									</View>
								</View>
							</View>
						</View>
					</View>
				</View>

				<View className="bg-surface-default/95 backdrop-blur-xl border-brand-primary rounded-3xl shadow-2xl mx-4 p-6 mb-6 border-2">
					{/* Enhanced Verification Status with Better Visual Hierarchy */}
					{guest.is_verified !== IsVerified.VERIFIED && (
						<View
							className={`p-6 rounded-2xl mb-6 border-l-4 ${verificationStatus.bgColor} ${verificationStatus.borderColor}`}
						>
							<View className="flex-row items-center justify-between">
								<View className="flex-row items-center">
									<View
										className={`w-3 h-3 rounded-full mr-3 ${verificationStatus.color}`}
									/>
									<Text
										className={`font-playfair-semibold text-lg ${verificationStatus.textColor}`}
									>
										ID Verification
									</Text>
								</View>
								<View
									className={`px-3 py-1 rounded-full ${verificationStatus.color}`}
								>
									<Text className="text-white font-montserrat-bold text-xs">
										{verificationStatus.text}
									</Text>
								</View>
							</View>
							{(guest.is_verified === IsVerified.REJECTED ||
								guest.is_verified === IsVerified.PENDING) &&
								guest.valid_id_rejection_reason && (
									<View className="mt-3 p-3 bg-feedback-error-DEFAULT/10 rounded-xl">
										<Text className="text-feedback-error-dark font-montserrat-bold text-sm mb-1">
											{guest.is_verified ===
											IsVerified.REJECTED
												? 'Rejection Reason:'
												: 'Note:'}
										</Text>
										<Text className="text-feedback-error-dark font-montserrat text-sm">
											{guest.valid_id_rejection_reason}
										</Text>
									</View>
								)}
							{guest.is_verified === IsVerified.UNVERIFIED && (
								<View className="mt-3 p-3 bg-feedback-info-light rounded-xl">
									<Text className="text-feedback-info-DEFAULT font-montserrat text-sm">
										Please upload your valid ID documents to
										verify your account and access all
										features.
									</Text>
								</View>
							)}
						</View>
					)}

					{/* Settings List */}
					<View className="space-y-3">
						<Text className="text-2xl font-playfair-bold text-text-primary mb-4">
							Account Settings
						</Text>
						{/* Build settings locally so we can filter based on guest state */}
						{(() => {
							const baseSettings = [
								{ label: 'Change Password', href: '/(profile)/settings/change-password' },
								{ label: 'Verify your Account', href: '/(profile)/settings/verify-account' },
							];

							const filteredSettings = baseSettings.filter((s) => {
								if (s.label === 'Verify your Account') {
									return guest.is_verified !== IsVerified.VERIFIED;
								}
								return true;
							});

							return filteredSettings.map((setting) => (
								<Link key={setting.label} href={setting.href as any} asChild>
									<TouchableOpacity
										className="bg-background-default/50 rounded-2xl p-4 flex-row items-center justify-between"
										activeOpacity={0.5}
									>
										<View className="flex-row items-center flex-1">
											<View className="w-10 h-10 bg-brand-primary/10 rounded-full items-center justify-center mr-3">
												<Text className="text-brand-primary text-lg">⚙️</Text>
											</View>
											<View className="flex-1">
												<Text className="text-text-primary font-montserrat text-xl">{setting.label}</Text>
											</View>
										</View>
									</TouchableOpacity>
								</Link>
							));
						})()}
					</View>
				</View>

				<View className="mx-4 mb-8 items-center">
					<Pressable
						onPress={() => logoutMutation.mutate()}
						className="bg-feedback-error-DEFAULT px-8 py-4 rounded-xl shadow-sm active:bg-red-600"
					>
						<Text className="text-text-inverse font-montserrat-bold">
							Logout
						</Text>
					</Pressable>
				</View>


			{/* Bottom Spacing for better scroll experience */}
			<View className="h-8" />
		</ScrollView>
	</View>
);
}