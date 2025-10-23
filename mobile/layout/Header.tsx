import React, { useCallback, useState } from 'react';
import StyledText from '@/components/ui/StyledText';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/services/UserAuth';
import { GuestResponse, IsVerified } from '@/types/GuestUser.types';
import { useQuery } from '@tanstack/react-query';
import { useRouter, usePathname } from 'expo-router';
import { Image, TouchableOpacity, View, Pressable, Modal } from 'react-native';
import NotificationBell from '@/components/ui/NotificationBell';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import StyledModal from '@/components/ui/StyledModal';

interface HeaderProps {
	headerLabel: string;
}

const Header = ({ headerLabel }: HeaderProps) => {
	const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);

	const { user, logout } = useAuth();

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
		setDropdownOpen(true);
	}, [isOnProfileRoute]);

	const closeDropdown = useCallback(() => setDropdownOpen(false), []);

	const handleNavigateTo = useCallback(
		(path: string) => {
			setDropdownOpen(false);
			(router as any).push(path);
		},
		[router]
	);

	// Logout alert state and handlers
	const [isLogoutAlertOpen, setLogoutAlertOpen] = useState(false);

	const openLogoutAlert = useCallback(() => {
		setDropdownOpen(false);
		setLogoutAlertOpen(true);
	}, []);

	const closeLogoutAlert = useCallback(() => setLogoutAlertOpen(false), []);

	const confirmLogout = useCallback(async () => {
		try {
			await logout();
		} catch (error) {
			console.warn('Logout failed', error);
		} finally {
			setLogoutAlertOpen(false);
			setDropdownOpen(false);
		}
	}, [logout]);

	if (!data) return null;

	const guest = data.data;

	return (
		<SafeAreaView
			edges={['top']}
			className="bg-background-elevated border-b border-border-subtle"
		>
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

				{/* Dropdown Modal for profile actions */}
				<Modal
					visible={isDropdownOpen}
					transparent
					onRequestClose={closeDropdown}
					animationType="fade"
				>
					<Pressable style={{ flex: 1 }} onPress={closeDropdown}>
						<View className="absolute right-4 top-20 bg-background-elevated rounded-2xl p-4 shadow-lg border border-border-subtle">
							<View className="flex-row items-center mb-3">
								<View className="flex-1">
									<StyledText
										variant="montserrat-bold"
										className="text-text-primary text-xl"
									>
										{`${guest.first_name} ${guest.last_name}`}{' '}
										{guest.is_verified ===
											IsVerified.VERIFIED && (
											<FontAwesome
												name="check-circle"
												size={20}
												color="#34D399"
												className="ml-1"
											/>
										)}
									</StyledText>
									<StyledText
										variant="montserrat-regular"
										className="text-text-muted text-sm"
									>
										{guest.email}
									</StyledText>
								</View>
							</View>

							<View className="space-y-2">
								<TouchableOpacity
									activeOpacity={0.7}
									onPress={() =>
										handleNavigateTo(
											'/(profile)/settings/change-password'
										)
									}
									className="py-2 px-4 rounded-lg bg-interactive-ghost-hover"
								>
									<StyledText
										variant="montserrat-regular"
										className="text-text-primary"
									>
										Change Password
									</StyledText>
								</TouchableOpacity>

								{guest.is_verified === 'pending' ||
									((guest.is_verified === 'unverified' ||
										guest.is_verified === 'rejected') && (
										<TouchableOpacity
											activeOpacity={0.7}
											onPress={() =>
												handleNavigateTo(
													'/(profile)/settings/verify-account'
												)
											}
											className="py-2 px-4 rounded-lg bg-interactive-ghost-hover"
										>
											<StyledText
												variant="montserrat-regular"
												className="text-text-primary"
											>
												Verify Account
											</StyledText>
										</TouchableOpacity>
									))}

								<TouchableOpacity
									activeOpacity={0.7}
									onPress={openLogoutAlert}
									className="py-2 px-4 rounded-lg bg-interactive-ghost-hover"
								>
									<StyledText
										variant="montserrat-regular"
										className="text-text-primary"
									>
										Log Out
									</StyledText>
								</TouchableOpacity>
							</View>
						</View>
					</Pressable>
				</Modal>

				{/* Logout confirmation alert */}
				<StyledModal
					visible={isLogoutAlertOpen}
					title="Log Out"
					message="Are you sure you want to log out? You will need to sign in again to access your bookings."
					icon="log-out"
					iconColor="#EF4444"
					buttons={[
						{ text: 'Cancel', style: 'cancel' },
						{
							text: 'Log Out',
							style: 'destructive',
							onPress: confirmLogout,
						},
					]}
					onClose={closeLogoutAlert}
				/>
			</View>
		</SafeAreaView>
	);
};

export default React.memo(Header);
