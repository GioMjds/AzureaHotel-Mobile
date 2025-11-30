import { memo, useCallback, useState } from 'react';
import StyledText from '@/components/ui/StyledText';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/services/UserAuth';
import { GuestResponse, IsVerified } from '@/types/GuestUser.types';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter, usePathname } from 'expo-router';
import {
	Image,
	TouchableOpacity,
	View,
	Pressable,
	Modal,
	ActivityIndicator,
} from 'react-native';
import NotificationBell from '@/components/ui/NotificationBell';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontAwesome } from '@expo/vector-icons';
import StyledModal from '@/components/ui/StyledModal';
import StyledAlert from '@/components/ui/StyledAlert';
import useAlertStore from '@/store/AlertStore';
import * as ImagePicker from 'expo-image-picker';
import OfflineBanner from '@/components/ui/OfflineBanner';
import { useNetwork } from '@/components/NetworkProvider';

interface HeaderProps {
	headerLabel: string;
}

const Header = ({ headerLabel }: HeaderProps) => {
	const [isDropdownOpen, setDropdownOpen] = useState<boolean>(false);
	const [isUploadingImage, setUploadingImage] = useState<boolean>(false);
	const [isLogoutAlertOpen, setLogoutAlertOpen] = useState<boolean>(false);

	const { user, logout } = useAuth();
	const { isOffline } = useNetwork();

	const router = useRouter();
	const pathname = usePathname();

	const { data } = useQuery<GuestResponse>({
		queryKey: ['userProfile', user?.id],
		queryFn: async () => {
			return await auth.getGuestProfile(user?.id as number);
		},
		enabled: !!user?.id,
	});

	const queryClient = useQueryClient();

	const { alertConfig, setAlertConfig } = useAlertStore();

	const showAlert = useCallback((
		type: 'success' | 'error' | 'warning' | 'info',
		title: string,
		message?: string,
		buttons?: {
			text: string;
			onPress?: (() => void) | undefined;
			style?: 'default' | 'cancel' | 'destructive';
		}[]
	) => {
		setAlertConfig({ visible: true, type, title, message, buttons });
	}, []);

	const handleChangeProfileImage = useCallback(async () => {
		try {
			const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
			if (!permissionResult.granted) {
				showAlert(
					'warning',
					'Permission required',
					'Please allow photo access to change your profile image.',
					[
						{
							text: 'OK',
							style: 'default',
							onPress: () =>
								setAlertConfig({ ...alertConfig, visible: false }),
						},
					]
				);
				return;
			}

			const pickerResult = await ImagePicker.launchImageLibraryAsync({
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				aspect: [1, 1],
				quality: 0.8,
			});

			const cancelled =
				(pickerResult as any).cancelled ??
				(pickerResult as any).canceled;
			if (cancelled) return;

			const pickedUri =
				(pickerResult as any).uri ||
				(pickerResult as any).assets?.[0]?.uri;
			if (!pickedUri) {
				showAlert(
					'error',
					'Image error',
					'Could not read selected image.',
					[
						{
							text: 'OK',
							style: 'default',
							onPress: () =>
								setAlertConfig({ ...alertConfig, visible: false }),
						},
					]
				);
				return;
			}

			setUploadingImage(true);

			// Build filename
			const nameParts = pickedUri.split('.');
			const ext = (nameParts.pop() || 'jpg').split('?')[0];
			const fileName = `profile_${Date.now()}.${ext}`;

			// Upload the (possibly edited/cropped) picked uri
			await auth.changeProfileImage(pickedUri, fileName, 'image/jpeg');

			// Refresh profile query
			queryClient.invalidateQueries({
				queryKey: ['userProfile', user?.id],
			});
			setUploadingImage(false);
			setDropdownOpen(false);
			showAlert(
				'success',
				'Success',
				'Profile image updated successfully.',
				[
					{
						text: 'OK',
						style: 'default',
						onPress: () =>
							setAlertConfig({ ...alertConfig, visible: false }),
					},
				]
			);
		} catch (error: any) {
			console.warn('Failed to change profile image', error);
			setUploadingImage(false);
			showAlert(
				'error',
				'Upload failed',
				error?.message || 'Could not upload image.',
				[
					{
						text: 'OK',
						style: 'default',
						onPress: () =>
							setAlertConfig({ ...alertConfig, visible: false }),
					},
				]
			);
		}
	}, [queryClient, user?.id, showAlert]);

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
		<>
			<SafeAreaView
				edges={['top']}
				className="bg-background-elevated border-b border-border-subtle"
			>
				<View className="flex-row items-center justify-between px-6 py-4">
					<View className="flex-row items-center">
						<NotificationBell />
					</View>

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
					<View style={isOffline ? { opacity: 0.4 } : undefined}>
						<TouchableOpacity
							hitSlop={20}
							onPress={handleProfilePress}
							activeOpacity={0.7}
							disabled={isOnProfileRoute || !!isOffline}
							accessibilityState={{ disabled: isOnProfileRoute || !!isOffline }}
						>
							<Image
								source={{ uri: guest.profile_image, cache: 'default' }}
								className="w-14 h-14 rounded-full border-2 border-gray-400"
								style={isOffline 
									? { backgroundColor: 'rgba(0, 0, 0, 0.3)', borderColor: '#9ca3af' } 
									: { borderColor: '#16a34a' }}
								resizeMode="cover"
							/>
						</TouchableOpacity>
					</View>

				{/* Dropdown Modal for profile actions */}
				<Modal
					visible={isDropdownOpen}
					transparent
					onRequestClose={closeDropdown}
					animationType="fade"
				>
					<Pressable style={{ flex: 1 }} onPress={closeDropdown}>
						{/* Enlarged dropdown container: wider, more padding */}
						<View className="absolute right-4 top-20 bg-background-elevated rounded-3xl p-6 shadow-lg border border-border-subtle w-64">
							<View className="flex-row items-center mb-4">
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
												size={18}
												color="#34D399"
												style={{ marginLeft: 6 }}
											/>
										)}
									</StyledText>
									<StyledText
										variant="montserrat-regular"
										className="text-text-muted text-sm mt-1"
									>
										{guest.email}
									</StyledText>
								</View>
							</View>

							<View className="space-y-3">
								<TouchableOpacity
									activeOpacity={0.8}
									onPress={handleChangeProfileImage}
									disabled={isUploadingImage}
									className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
								>
									<FontAwesome
										name="image"
										size={18}
										color="#6F00FF"
										style={{ width: 28 }}
									/>
									{isUploadingImage ? (
										<ActivityIndicator
											size="small"
											color="#6F00FF"
											style={{ marginLeft: 6 }}
										/>
									) : (
										<StyledText
											variant="montserrat-regular"
											className="text-text-primary ml-1"
										>
											Change Profile Image
										</StyledText>
									)}
								</TouchableOpacity>

								<TouchableOpacity
									activeOpacity={0.8}
									onPress={() =>
										handleNavigateTo(
											'/(profile)/settings/change-password'
										)
									}
									className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
								>
									<FontAwesome
										name="lock"
										size={18}
										color="#6F00FF"
										style={{ width: 28 }}
									/>
									<StyledText
										variant="montserrat-regular"
										className="text-text-primary ml-1"
									>
										Change Password
									</StyledText>
								</TouchableOpacity>

								{/* Verification menu logic:
									- If user was REJECTED: allow them to replace by navigating to verify screen
									- If user already submitted a valid id (front/back) and not rejected: show "View Verification" with status
									- Otherwise (unverified): show Verify Account CTA
								*/}
								{guest.is_verified === IsVerified.REJECTED ? (
									<TouchableOpacity
										activeOpacity={0.8}
										onPress={() =>
											handleNavigateTo(
												'/(profile)/settings/verify-account'
											)
										}
										className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
									>
										<FontAwesome
											name="id-card"
											size={18}
											color="#3B0270"
											style={{ width: 28 }}
										/>
										<StyledText
											variant="montserrat-regular"
											className="text-text-primary ml-1"
										>
											Replace Verification
										</StyledText>
									</TouchableOpacity>
								) : guest.valid_id_front || guest.valid_id_back ? (
									<TouchableOpacity
										activeOpacity={0.8}
										onPress={() =>
											handleNavigateTo(
												'/(profile)/settings/verify-account'
											)
										}
										className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
									>
										<FontAwesome
											name="id-card"
											size={18}
											color="#3B0270"
											style={{ width: 28 }}
										/>
										<View className="flex-row items-center">
											<StyledText
												variant="montserrat-regular"
												className="text-text-primary ml-1"
											>
												View Verification
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-sm ml-2 text-text-muted"
											>
												{guest.is_verified === IsVerified.PENDING
													? ' (Pending)'
													: guest.is_verified === IsVerified.VERIFIED
													? ' (Verified)'
													: ''}
											</StyledText>
										</View>
									</TouchableOpacity>
								) : (
									<TouchableOpacity
										activeOpacity={0.8}
										onPress={() =>
											handleNavigateTo(
												'/(profile)/settings/verify-account'
											)
										}
										className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
									>
										<FontAwesome
											name="id-card"
											size={18}
											color="#3B0270"
											style={{ width: 28 }}
										/>
										<StyledText
											variant="montserrat-regular"
											className="text-text-primary ml-1"
										>
											Verify Account
										</StyledText>
									</TouchableOpacity>
								)}

								<TouchableOpacity
									activeOpacity={0.8}
									onPress={openLogoutAlert}
									className="flex-row items-center p-2 rounded-lg bg-interactive-ghost-hover"
								>
									<FontAwesome
										name="sign-out"
										size={18}
										color="#EF4444"
										style={{ width: 28 }}
									/>
									<StyledText
										variant="montserrat-regular"
										className="text-text-primary ml-1"
									>
										Log Out
									</StyledText>
								</TouchableOpacity>
							</View>
						</View>
					</Pressable>
				</Modal>

				{/* Styled alerts (used by image upload flow) */}
				<StyledAlert
					visible={alertConfig.visible}
					type={alertConfig.type}
					title={alertConfig.title}
					message={alertConfig.message}
					buttons={alertConfig.buttons}
					onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
				/>

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

			{/* Offline Banner */}
			<OfflineBanner />
		</>
	);
};

export default memo(Header);
