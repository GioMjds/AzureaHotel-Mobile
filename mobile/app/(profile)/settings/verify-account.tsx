import { useState, useEffect } from 'react';
import {
	View,
	TouchableOpacity,
	ActivityIndicator,
	Modal,
	FlatList,
	Pressable,
	Image,
	StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ScrollView } from 'react-native-gesture-handler';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { useUploadImage } from '@/hooks/useUploadImage';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import StyledText from '@/components/ui/StyledText';
import StyledAlert from '@/components/ui/StyledAlert';
import useAuthStore from '@/store/AuthStore';
import useAlertStore from '@/store/AlertStore';
import { IsVerified, VerificationStatus } from '@/types/GuestUser.types';

const ID_TYPES = [
	'Passport',
	`Driver's License`,
	'National ID',
	'SSS ID',
	'Unified Multi-Purpose ID (UMID)',
	'PhilHealth ID',
	'PRC ID',
	'Student ID',
	'Senior Citizen ID',
	'Other Government-Issued ID',
];

export default function VerifyAccountScreen() {
	const [frontImageUri, setFrontImageUri] = useState<string | null>(null);
	const [backImageUri, setBackImageUri] = useState<string | null>(null);
	const [idType, setIdType] = useState<string>('');
	const [isPickerOpen, setIsPickerOpen] = useState<boolean>(false);
	const [isImageSourceModalOpen, setIsImageSourceModalOpen] = useState<boolean>(false);
	const [currentImageSide, setCurrentImageSide] = useState<'front' | 'back'>('front');
	const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
	const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);
	const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
	const { alertConfig, setAlertConfig } = useAlertStore();

	const router = useRouter();
	const { uploadValidIdMutation } = useUploadImage();
	const authUser = useAuthStore((s) => s.user);

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: { text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }[];
	}) => {
		setAlertConfig({
			visible: true,
			...opts,
		});
	};

	useEffect(() => {
		if (authUser) {
			setVerificationStatus({
				isVerified: authUser.is_verified === IsVerified.VERIFIED,
				isPending: authUser.is_verified === IsVerified.PENDING,
				isRejected: authUser.is_verified === IsVerified.REJECTED,
				rejectionReason: authUser.valid_id_rejection_reason || null,
				submittedIdType: authUser.valid_id_type_display || null,
				frontImageUri: authUser.valid_id_front || null,
				backImageUri: authUser.valid_id_back || null,
			});
		} else {
			setVerificationStatus(null);
		}
	}, [authUser]);

	useEffect(() => {
		(async () => {
			const { status: libraryStatus } =
				await ImagePicker.requestMediaLibraryPermissionsAsync();
			const { status: cameraStatus } =
				await ImagePicker.requestCameraPermissionsAsync();
			
			if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
				showStyledAlert({
					title: 'Permission Required',
					message: 'Please allow access to camera and photos to upload ID images.',
					type: 'warning',
					buttons: [{ text: 'OK', style: 'default' }]
				});
			}
		})();
	}, []);

	const openImageSourceModal = (side: 'front' | 'back') => {
		setCurrentImageSide(side);
		setIsImageSourceModalOpen(true);
	};

	const pickImage = async (source: 'camera' | 'library') => {
		try {
			const options: ImagePicker.ImagePickerOptions = {
				mediaTypes: ImagePicker.MediaTypeOptions.Images,
				allowsEditing: true,
				quality: 0.9,
				aspect: [4, 3],
			};

			let result;
			if (source === 'camera') {
				result = await ImagePicker.launchCameraAsync(options);
			} else {
				result = await ImagePicker.launchImageLibraryAsync(options);
			}

			if (!result.canceled) {
				const setUri = currentImageSide === 'front' ? setFrontImageUri : setBackImageUri;
				setUri(result.assets[0].uri);
			}
		} catch (err) {
			console.warn('Image pick error', err);
			showStyledAlert({
				title: 'Error',
				message: 'Failed to capture image. Please try again.',
				type: 'error',
				buttons: [{ text: 'OK', style: 'default' }]
			});
		} finally {
			setIsImageSourceModalOpen(false);
		}
	};

	const handleUpload = () => {
		if (!idType) {
			return showStyledAlert({
				title: 'Missing ID Type',
				message: 'Please select an ID type.',
				type: 'warning',
				buttons: [{ text: 'OK', style: 'default' }]
			});
		}
		if (!frontImageUri || !backImageUri) {
			return showStyledAlert({
				title: 'Missing Images',
				message: 'Please pick both front and back images.',
				type: 'warning',
				buttons: [{ text: 'OK', style: 'default' }]
			});
		}

		uploadValidIdMutation.mutate(
			{ frontUri: frontImageUri, backUri: backImageUri, idType },
			{
				onSuccess: () => {
					showStyledAlert({
						title: 'Success',
						message: 'Your ID was uploaded. Verification pending.',
						type: 'success',
						buttons: [{ text: 'OK', style: 'default' }]
					});
					setVerificationStatus({
						isVerified: false,
						isPending: true,
						isRejected: false,
						rejectionReason: null,
						submittedIdType: idType,
						frontImageUri,
						backImageUri,
					});
					// Clear form
					setFrontImageUri(null);
					setBackImageUri(null);
					setIdType('');
				},
				onError: (error: any) => {
					const msg =
						error?.message || 'Upload failed. Please try again.';
					showStyledAlert({
						title: 'Upload Failed',
						message: msg,
						type: 'error',
						buttons: [{ text: 'OK', style: 'default' }]
					});
				},
			}
		);
	};

	const openPreview = (imageUri: string) => {
		setPreviewImageUri(imageUri);
		setIsPreviewModalOpen(true);
	};

	const isFormComplete = frontImageUri && backImageUri && idType;
	const hasSubmittedVerification = verificationStatus && (verificationStatus.isPending || verificationStatus.isVerified || verificationStatus.isRejected);

	// Helper to produce the verification message text
	const getVerificationMessage = (status: VerificationStatus | null) => {
		if (!status) return '';
		if (status.isVerified) return 'Your account has been successfully verified. You now have full access to all platform features.';
		if (status.isRejected) return `Your verification was rejected. ${status.rejectionReason || 'Please try again with clearer images.'}`;
		return 'Your verification is currently under review. This usually takes 1-2 business days.';
	};

	// UI helpers for status-based classes and text
	const getBannerClasses = (status: VerificationStatus | null) => {
		if (!status) return 'bg-feedback-warning-light border-feedback-warning-DEFAULT';
		if (status.isVerified) return 'bg-feedback-success-light border-feedback-success-DEFAULT';
		if (status.isRejected) return 'bg-feedback-error-light border-feedback-error-DEFAULT';
		return 'bg-feedback-warning-light border-feedback-warning-DEFAULT';
	};

	const getPillBgClass = (status: VerificationStatus | null) => {
		if (!status) return 'bg-feedback-warning-DEFAULT';
		if (status.isVerified) return 'bg-feedback-success-DEFAULT';
		if (status.isRejected) return 'bg-feedback-error-DEFAULT';
		return 'bg-feedback-warning-DEFAULT';
	};

	const getStatusIconName = (status: VerificationStatus | null) => {
		if (!status) return 'time';
		if (status.isVerified) return 'checkmark-circle';
		if (status.isRejected) return 'close-circle';
		return 'time';
	};

	const getStatusTitle = (status: VerificationStatus | null) => {
		if (!status) return 'Verification Pending';
		if (status.isVerified) return 'Verification Approved';
		if (status.isRejected) return 'Verification Rejected';
		return 'Verification Pending';
	};

	const getStatusTextClass = (status: VerificationStatus | null) => {
		if (!status) return 'text-feedback-warning-dark';
		if (status.isVerified) return 'text-feedback-success-dark';
		if (status.isRejected) return 'text-feedback-error-dark';
		return 'text-feedback-warning-dark';
	};

	const getSubmitButtonClass = (isComplete: boolean, isPending: boolean) => {
		return !isComplete || isPending ? 'bg-interactive-primary-disabled' : 'bg-interactive-primary';
	};

	const getSubmitButtonLabel = (status: VerificationStatus | null, isPending: boolean) => {
		if (isPending) return 'Submitting Verification...';
		return status?.isRejected ? 'Resubmit for Verification' : 'Submit for Verification';
	};

	return (
		<SafeAreaView className="flex-1 bg-background">
			{/* Custom Status Bar for Modal */}
			<StatusBar 
				backgroundColor={isPickerOpen || isImageSourceModalOpen || isPreviewModalOpen ? "rgba(0, 0, 0, 0.4)" : "transparent"} 
				translucent 
			/>
			
			{/* Header */}
			<View className="px-5 py-4 flex-row items-center justify-between border-b border-border-subtle bg-surface-default">
				<TouchableOpacity
					onPress={() => router.back()}
					className="p-2"
					activeOpacity={0.7}
				>
					<Ionicons name="arrow-back" size={24} color="#3B0270" />
				</TouchableOpacity>
				<StyledText
					variant="playfair-semibold"
					className="text-lg text-text-primary"
				>
					Account Verification
				</StyledText>
				<View className="w-10" />
			</View>

			<ScrollView
				className="flex-1"
				contentContainerStyle={{ paddingBottom: 24 }}
				showsVerticalScrollIndicator={false}
			>
				{/* Verification Status Banner */}
				{hasSubmittedVerification && (
					<View className="mx-5 mt-5">
						<View className={`rounded-2xl p-5 border ${getBannerClasses(verificationStatus)}`}>
							<View className="flex-row items-start">
								<View className={`${getPillBgClass(verificationStatus)} p-2 rounded-full mr-3`}>
									<Ionicons name={getStatusIconName(verificationStatus)} size={24} color="#FFF" />
								</View>
								<View className="flex-1">
									<StyledText variant="playfair-semibold" className={`text-base mb-2 ${getStatusTextClass(verificationStatus)}`}>
										{getStatusTitle(verificationStatus)}
									</StyledText>
									<StyledText variant="montserrat-regular" className={`text-sm leading-5 ${getStatusTextClass(verificationStatus)}`}>
										{getVerificationMessage(verificationStatus)}
									</StyledText>
									{verificationStatus.submittedIdType && (
										<StyledText
											variant="montserrat-regular"
											className={`text-xs ${
												verificationStatus.isVerified 
													? 'text-feedback-success-dark' 
													: verificationStatus.isRejected
													? 'text-feedback-error-dark'
													: 'text-feedback-warning-dark'
											}`}
										>
											ID Type: {verificationStatus.submittedIdType}
										</StyledText>
									)}
								</View>
							</View>
						</View>

						{/* Submitted ID Preview */}
						<View className="mt-4 bg-surface-default rounded-2xl p-5 border border-border-subtle">
							<StyledText
								variant="playfair-semibold"
								className="text-base text-text-primary mb-3"
							>
								Submitted ID Images
							</StyledText>
							<View className="flex-row space-x-4">
								{authUser?.valid_id_front && (
									<View className="flex-1">
										<StyledText
											variant="montserrat-bold"
											className="text-sm text-text-secondary mb-2"
										>
											Front Side
										</StyledText>
										<TouchableOpacity
											onPress={() => openPreview(authUser!.valid_id_front)}
											className="bg-surface-default border border-border-default rounded-2xl overflow-hidden"
											activeOpacity={0.8}
										>
											<Image
												source={{ uri: authUser!.valid_id_front }}
												className="w-full h-32"
												resizeMode="cover"
											/>
										</TouchableOpacity>
									</View>
								)}
								{authUser?.valid_id_back && (
									<View className="flex-1">
										<StyledText
											variant="montserrat-bold"
											className="text-sm text-text-secondary mb-2"
										>
											Back Side
										</StyledText>
										<TouchableOpacity
											onPress={() => openPreview(authUser!.valid_id_back)}
											className="bg-surface-default border border-border-default rounded-2xl overflow-hidden"
											activeOpacity={0.8}
										>
											<Image
												source={{ uri: authUser!.valid_id_back }}
												className="w-full h-32"
												resizeMode="cover"
											/>
										</TouchableOpacity>
									</View>
								)}
							</View>
							<StyledText
								variant="montserrat-regular"
								className="text-xs text-text-muted text-center mt-3"
							>
								Tap on images to preview
							</StyledText>
						</View>
					</View>
				)}

				{/* Info Banner - Only show if not verified */}
				{(!hasSubmittedVerification || verificationStatus?.isRejected) && (
					<LinearGradient
						colors={['#6F00FF', '#3B0270']}
						start={{ x: 0, y: 0 }}
						end={{ x: 1, y: 1 }}
						className="mx-5 mt-5 rounded-2xl p-5"
					>
						<View className="flex-row items-start">
							<View className="bg-white/20 p-2 rounded-full mr-3">
								<Ionicons name="shield-checkmark" size={24} color="#FFF1F1" />
							</View>
							<View className="flex-1">
								<StyledText
									variant="playfair-semibold"
									className="text-base text-interactive-primary-foreground mb-2"
								>
									Why verify your account?
								</StyledText>
								<StyledText
									variant="montserrat-regular"
									className="text-sm text-interactive-primary-foreground leading-5"
								>
									Verification increases your account security and unlocks full
									access to all platform features.
								</StyledText>
							</View>
						</View>
					</LinearGradient>
				)}

				{/* Upload Form - Only show if not pending/verified or if rejected */}
				{(!hasSubmittedVerification || verificationStatus?.isRejected) && (
					<>
						{/* Guidelines Card */}
						<View className="mx-5 mt-4 bg-surface-default rounded-2xl p-5 border border-border-subtle">
							<View className="flex-row items-center mb-3">
								<Ionicons name="information-circle" size={20} color="#6F00FF" />
								<StyledText
									variant="playfair-semibold"
									className="text-base text-text-primary ml-2"
								>
									Verification Guidelines
								</StyledText>
							</View>

							<View className="space-y-3">
								{[
									{
										icon: 'camera',
										text: 'Use clear, high-quality photos',
									},
									{
										icon: 'sunny',
										text: 'Ensure good lighting with no glare',
									},
									{
										icon: 'document-text',
										text: 'All information must be readable',
									},
									{
										icon: 'checkmark-circle',
										text: 'ID must be valid and not expired',
									},
								].map((item, index) => (
									<View key={index} className="flex-row items-start">
										<View className="bg-violet-light/30 p-1.5 rounded-full mr-3 mt-0.5">
											<Ionicons name={item.icon as any} size={14} color="#6F00FF" />
										</View>
										<StyledText
											variant="montserrat-regular"
											className="flex-1 text-sm text-text-primary leading-5"
										>
											{item.text}
										</StyledText>
									</View>
								))}
							</View>
						</View>

						{/* ID Type Selection */}
						<View className="mx-5 mt-5">
							<StyledText
								variant="playfair-semibold"
								className="text-base text-text-primary mb-2"
							>
								Select ID Type
							</StyledText>
							<TouchableOpacity
								onPress={() => setIsPickerOpen(true)}
								className="flex-row items-center justify-between bg-input-background border border-input-border rounded-2xl px-4 py-4"
								activeOpacity={0.7}
								accessibilityRole="button"
							>
								<View className="flex-row items-center flex-1">
									<Ionicons
										name="card"
										size={20}
										color={idType ? '#6F00FF' : '#E9B3FB'}
									/>
									<StyledText
										variant="montserrat-regular"
										className={`ml-3 ${idType ? 'text-text-primary' : 'text-input-placeholder'}`}
									>
										{idType || 'Choose your ID type'}
									</StyledText>
								</View>
								<Ionicons name="chevron-down" size={20} color="#6F00FF" />
							</TouchableOpacity>
						</View>

						{/* Image Upload Section */}
						<View className="mx-5 mt-5">
							<StyledText
								variant="playfair-semibold"
								className="text-base text-text-primary mb-3"
							>
								Upload ID Images
							</StyledText>

							{/* Front Side */}
							<View className="mb-4">
								<StyledText
									variant="montserrat-bold"
									className="text-sm text-text-secondary mb-2"
								>
									Front Side
								</StyledText>
								<TouchableOpacity
									activeOpacity={0.8}
									onPress={() => openImageSourceModal('front')}
									className="bg-surface-default border-2 border-dashed border-border-default rounded-2xl overflow-hidden"
									accessibilityRole="button"
									accessibilityLabel="Select front ID image"
								>
									{frontImageUri ? (
										<View className="relative">
											<Image
												source={{ uri: frontImageUri }}
												className="w-full h-48"
												resizeMode="cover"
											/>
											<View className="absolute top-2 right-2 bg-feedback-success-DEFAULT rounded-full p-2">
												<Ionicons name="checkmark" size={16} color="#FFF" />
											</View>
										</View>
									) : (
										<View className="h-48 items-center justify-center">
											<View className="bg-violet-light/20 p-4 rounded-full mb-3">
												<Ionicons name="cloud-upload" size={32} color="#6F00FF" />
											</View>
											<StyledText
												variant="montserrat-bold"
												className="text-text-secondary mb-1"
											>
												Tap to upload front
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-xs text-text-muted"
											>
												JPG, PNG up to 10MB
											</StyledText>
										</View>
									)}
								</TouchableOpacity>
							</View>

							{/* Back Side */}
							<View>
								<StyledText
									variant="montserrat-bold"
									className="text-sm text-text-secondary mb-2"
								>
									Back Side
								</StyledText>
								<TouchableOpacity
									activeOpacity={0.8}
									onPress={() => openImageSourceModal('back')}
									className="bg-surface-default border-2 border-dashed border-border-default rounded-2xl overflow-hidden"
									accessibilityRole="button"
									accessibilityLabel="Select back ID image"
								>
									{backImageUri ? (
										<View className="relative">
											<Image
												source={{ uri: backImageUri }}
												className="w-full h-48"
												resizeMode="cover"
											/>
											<View className="absolute top-2 right-2 bg-feedback-success-DEFAULT rounded-full p-2">
												<Ionicons name="checkmark" size={16} color="#FFF" />
											</View>
										</View>
									) : (
										<View className="h-48 items-center justify-center">
											<View className="bg-violet-light/20 p-4 rounded-full mb-3">
												<Ionicons name="cloud-upload" size={32} color="#6F00FF" />
											</View>
											<StyledText
												variant="montserrat-bold"
												className="text-text-secondary mb-1"
											>
												Tap to upload back
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-xs text-text-muted"
											>
												JPG, PNG up to 10MB
											</StyledText>
										</View>
									)}
								</TouchableOpacity>
							</View>
						</View>

						{/* Privacy Notice */}
						<View className="mx-5 mt-5 bg-feedback-info-light rounded-2xl p-4 flex-row items-start">
							<Ionicons name="lock-closed" size={20} color="#3B82F6" />
							<StyledText
								variant="montserrat-regular"
								className="flex-1 text-xs text-feedback-info-dark leading-5 ml-3"
							>
								Your information is encrypted and stored securely. We never share
								your personal data with third parties.
							</StyledText>
						</View>
					</>
				)}
			</ScrollView>

			{/* Bottom Action Bar - Only show if not pending/verified or if rejected */}
			{(!hasSubmittedVerification || verificationStatus?.isRejected) && (
				<View className="bg-surface-default border-t border-border-subtle px-5 py-4">
						<TouchableOpacity
							onPress={handleUpload}
							disabled={!isFormComplete || uploadValidIdMutation.isPending}
							activeOpacity={0.8}
							className={`rounded-2xl py-4 ${getSubmitButtonClass(Boolean(isFormComplete), Boolean(uploadValidIdMutation.isPending))}`}>
							<View className="flex-row items-center justify-center">
								{uploadValidIdMutation.isPending && (
									<ActivityIndicator color="#FFF1F1" size="small" />
								)}
								{!uploadValidIdMutation.isPending && (
									<Ionicons name="checkmark-circle" size={22} color="#FFF1F1" />
								)}
								<StyledText
									variant="montserrat-bold"
									className="text-interactive-primary-foreground ml-2"
								>
									{getSubmitButtonLabel(verificationStatus, Boolean(uploadValidIdMutation.isPending))}
								</StyledText>
							</View>
						</TouchableOpacity>

					{!isFormComplete && (
						<StyledText
							variant="montserrat-regular"
							className="text-xs text-text-muted text-center mt-3"
						>
							Complete all fields to submit
						</StyledText>
					)}
				</View>
			)}

			{/* ID Type Picker Modal */}
			<Modal
				visible={isPickerOpen}
				transparent
				animationType="slide"
				onRequestClose={() => setIsPickerOpen(false)}
			>
				<Pressable
					className="flex-1 justify-end"
					style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
					onPress={() => setIsPickerOpen(false)}
				>
					<Pressable
						onPress={(e) => e.stopPropagation()}
						className="bg-surface-default rounded-t-3xl"
					>
						<View className="p-5 border-b border-border-subtle">
							<View className="flex-row items-center justify-between">
								<StyledText
									variant="playfair-semibold"
									className="text-lg text-text-primary"
								>
									Select ID Type
								</StyledText>
								<TouchableOpacity
									onPress={() => setIsPickerOpen(false)}
									className="p-2"
								>
									<Ionicons name="close" size={24} color="#3B0270" />
								</TouchableOpacity>
							</View>
							<StyledText
								variant="montserrat-regular"
								className="text-xs text-text-muted mt-1"
							>
								Choose the type of ID you&apos;re uploading
							</StyledText>
						</View>

						<FlatList
							data={ID_TYPES}
							keyExtractor={(item) => item}
							style={{ maxHeight: 400 }}
							renderItem={({ item }) => (
								<TouchableOpacity
									onPress={() => {
										setIdType(item);
										setIsPickerOpen(false);
									}}
									className="py-4 px-5 flex-row items-center justify-between"
									activeOpacity={0.7}
								>
									<View className="flex-row items-center flex-1">
										<View
											className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
												item === idType
													? 'border-interactive-primary bg-interactive-primary'
													: 'border-border-default'
											}`}
										>
											{item === idType && (
												<Ionicons name="checkmark" size={14} color="#FFF1F1" />
											)}
										</View>
										<StyledText
											variant="montserrat-regular"
											className={`text-base ${
												item === idType
													? 'text-interactive-primary'
													: 'text-text-primary'
											}`}
										>
											{item}
										</StyledText>
									</View>
								</TouchableOpacity>
							)}
							ItemSeparatorComponent={() => (
								<View className="h-px bg-border-subtle mx-5" />
							)}
							showsVerticalScrollIndicator={false}
						/>
					</Pressable>
				</Pressable>
			</Modal>

			{/* Image Source Selection Modal */}
			<Modal
				visible={isImageSourceModalOpen}
				transparent
				animationType="slide"
				onRequestClose={() => setIsImageSourceModalOpen(false)}
			>
				<Pressable
					className="flex-1 justify-end"
					style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
					onPress={() => setIsImageSourceModalOpen(false)}
				>
					<Pressable
						onPress={(e) => e.stopPropagation()}
						className="bg-surface-default rounded-t-3xl"
					>
						<View className="p-5 border-b border-border-subtle">
							<View className="flex-row items-center justify-between">
								<StyledText
									variant="playfair-semibold"
									className="text-lg text-text-primary"
								>
									Upload {currentImageSide === 'front' ? 'Front' : 'Back'} Side
								</StyledText>
								<TouchableOpacity
									onPress={() => setIsImageSourceModalOpen(false)}
									className="p-2"
								>
									<Ionicons name="close" size={24} color="#3B0270" />
								</TouchableOpacity>
							</View>
							<StyledText
								variant="montserrat-regular"
								className="text-xs text-text-muted mt-1"
							>
								Choose how to capture your ID image
							</StyledText>
						</View>

						<View className="p-5">
							<TouchableOpacity
								onPress={() => pickImage('camera')}
								className="flex-row items-center py-4 px-4 bg-violet-surface rounded-2xl mb-4"
								activeOpacity={0.7}
							>
								<View className="bg-violet-light/30 p-3 rounded-full mr-4">
									<Ionicons name="camera" size={24} color="#6F00FF" />
								</View>
								<View className="flex-1">
									<StyledText
										variant="montserrat-bold"
										className="text-text-primary text-base"
									>
										Take Photo
									</StyledText>
									<StyledText
										variant="montserrat-regular"
										className="text-text-muted text-sm"
									>
										Use your camera to capture a new photo
									</StyledText>
								</View>
								<Ionicons name="chevron-forward" size={20} color="#6F00FF" />
							</TouchableOpacity>

							<TouchableOpacity
								onPress={() => pickImage('library')}
								className="flex-row items-center py-4 px-4 bg-violet-surface rounded-2xl"
								activeOpacity={0.7}
							>
								<View className="bg-violet-light/30 p-3 rounded-full mr-4">
									<Ionicons name="images" size={24} color="#6F00FF" />
								</View>
								<View className="flex-1">
									<StyledText
										variant="montserrat-bold"
										className="text-text-primary text-base"
									>
										Choose from Gallery
									</StyledText>
									<StyledText
										variant="montserrat-regular"
										className="text-text-muted text-sm"
									>
										Select an existing photo from your device
									</StyledText>
								</View>
								<Ionicons name="chevron-forward" size={20} color="#6F00FF" />
							</TouchableOpacity>
						</View>
					</Pressable>
				</Pressable>
			</Modal>

			{/* Image Preview Modal */}
			<Modal
				visible={isPreviewModalOpen}
				transparent
				animationType="fade"
				onRequestClose={() => setIsPreviewModalOpen(false)}
			>
				<Pressable
					className="flex-1 bg-black/90 justify-center items-center"
					onPress={() => setIsPreviewModalOpen(false)}
				>
					<Pressable
						onPress={(e) => e.stopPropagation()}
						className="w-full h-full justify-center items-center"
					>
						{previewImageUri && (
							<Image
								source={{ uri: previewImageUri }}
								className="w-full h-2/3"
								resizeMode="contain"
							/>
						)}
						<TouchableOpacity
							onPress={() => setIsPreviewModalOpen(false)}
							className="absolute top-10 right-5 bg-black/50 rounded-full p-3"
						>
							<Ionicons name="close" size={24} color="#FFF" />
						</TouchableOpacity>
					</Pressable>
				</Pressable>
			</Modal>
			
			{/* Styled Alert */}
			<StyledAlert
				visible={alertConfig.visible}
				type={alertConfig.type}
				title={alertConfig.title}
				message={alertConfig.message}
				buttons={alertConfig.buttons}
				onDismiss={() => setAlertConfig({ ...alertConfig, visible: false })}
			/>
		</SafeAreaView>
	);
}