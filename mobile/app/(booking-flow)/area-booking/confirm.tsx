import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	View,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Image,
	TextInput,
	Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format, parseISO } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import useAuthStore from '@/store/AuthStore';
import { booking } from '@/services/Booking';
import { calculateAreaPricing } from '@/utils/pricing';
import ConfirmBookingModal from '@/components/bookings/ConfirmBookingModal';
import ConfirmingBooking from '@/components/ui/ConfirmingBooking';
import { Area } from '@/types/Area.types';
import StyledAlert from '@/components/ui/StyledAlert';
import StyledText from '@/components/ui/StyledText';

interface FormData {
	firstName: string;
	lastName: string;
	phoneNumber: string;
	numberOfGuests: number;
	specialRequests: string;
	paymentMethod: 'gcash' | 'physical';
}

interface AlertState {
	visible: boolean;
	type: 'success' | 'error' | 'warning' | 'info';
	title: string;
	message: string;
	buttons: {
		text: string;
		onPress?: () => void;
		style?: 'default' | 'cancel' | 'destructive';
	}[];
}

export default function ConfirmAreaBookingScreen() {
	const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [gcashProof, setGcashProof] = useState<string | null>(null);
	const [gcashFile, setGcashFile] = useState<any>(null);
	const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
	const [qrModalVisible, setQrModalVisible] = useState<boolean>(false);
	const [selectedQrImage, setSelectedQrImage] = useState<number | null>(null);
	
	// Alert state
	const [alertState, setAlertState] = useState<AlertState>({
		visible: false,
		type: 'info',
		title: '',
		message: '',
		buttons: [],
	});

	const { user } = useAuthStore();
	const router = useRouter();
	const queryClient = useQueryClient();
	
	const { areaId, startTime, endTime, totalPrice } = useLocalSearchParams<{
		areaId: string;
		startTime: string;
		endTime: string;
		totalPrice: string;
	}>();

	const {
		control,
		handleSubmit,
		formState: { errors },
	} = useForm<FormData>({
		mode: 'onSubmit',
		defaultValues: {
			firstName: user?.first_name || '',
			lastName: user?.last_name || '',
			phoneNumber: '',
			numberOfGuests: 0,
			specialRequests: '',
			paymentMethod: 'gcash',
		},
	});

	const { data: areaResponse, isLoading } = useQuery({
		queryKey: ['area', areaId],
		queryFn: () => booking.getAreaById(areaId!),
		enabled: !!areaId,
		refetchOnMount: false
	});

	const areaData: Area = areaResponse?.data;

	// Helper function to show styled alerts
	const showAlert = (
		type: 'success' | 'error' | 'warning' | 'info',
		title: string,
		message: string,
		buttons: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[] = [{ text: 'OK', style: 'default' }]
	) => {
		setAlertState({
			visible: true,
			type,
			title,
			message,
			buttons,
		});
	};

	const hideAlert = () => {
		setAlertState((prev) => ({ ...prev, visible: false }));
	};

	const formatDateTime = (dateTimeString: string | null) => {
		if (!dateTimeString) return '';
		try {
			const date = parseISO(dateTimeString);
			return format(date, 'EEE, MMM dd, yyyy');
		} catch {
			return dateTimeString;
		}
	};

	const formattedStartTime = formatDateTime(startTime);

	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		
		if (status !== 'granted') {
			showAlert(
				'warning',
				'Permission Required',
				'Sorry, we need camera roll permissions to upload payment proof.',
				[{ text: 'OK', style: 'default' }]
			);
			return;
		}

		const result = await ImagePicker.launchImageLibraryAsync({
			mediaTypes: ['images'],
			allowsEditing: true,
			aspect: [4, 3],
			quality: 0.8,
		});

		if (!result.canceled && result.assets[0]) {
			const asset = result.assets[0];
			setGcashProof(asset.uri);

			const fileName = asset.uri.split('/').pop();
			setGcashFile({
				uri: asset.uri,
				name: fileName,
				type: 'image/jpeg',
			} as any);
		}
	};

	const handleViewQrCode = (qrNumber: number) => {
		setSelectedQrImage(qrNumber);
		setQrModalVisible(true);
	};

	const onSubmit = (data: FormData) => {
		if (data.paymentMethod === 'gcash' && !gcashFile) {
			showAlert(
				'error',
				'Payment Proof Required',
				'Please upload GCash payment proof',
				[{ text: 'OK', style: 'default' }]
			);
			return;
		}

		// Validate phone number format
		const cleanedValue = data.phoneNumber.replace(/[^\d+]/g, '');
		const phPattern = /^(\+639\d{9}|09\d{9})$/;
		if (!phPattern.test(cleanedValue)) {
			showAlert(
				'error',
				'Invalid Phone Number',
				'Phone number must be a Philippine number (+639XXXXXXXXX or 09XXXXXXXXX)',
				[{ text: 'OK', style: 'default' }]
			);
			return;
		}

		// Validate number of guests
		if (areaData?.capacity && data.numberOfGuests > areaData.capacity) {
			showAlert(
				'warning',
				'Exceeds Capacity',
				`Maximum capacity is ${areaData.capacity} guests`,
				[{ text: 'OK', style: 'default' }]
			);
			return;
		}

		if (!areaId || !startTime || !endTime || !totalPrice) {
			showAlert(
				'error',
				'Error',
				'Missing booking information. Please try again.',
				[{ text: 'OK', style: 'default' }]
			);
			return;
		}

		setPendingFormData(data);
		setShowConfirmModal(true);
	};

	const handleConfirmBooking = async () => {
		if (!areaId || !startTime || !endTime || !totalPrice || !pendingFormData) return;

		setShowConfirmModal(false);
		setIsSubmitting(true);

		try {
			let finalPrice = parseFloat(totalPrice);

			if (areaData) {
				const userForPricing = user
					? { ...user, username: user.email || `user_${user.id}` }
					: null;
				const areaForPricing = {
					...areaData,
					price_per_hour: areaData.price_per_hour || '0',
					discounted_price: areaData.discounted_price || undefined,
					senior_discounted_price:
						areaData.senior_discounted_price || undefined,
				};

				const pricingResult = calculateAreaPricing({
					areaData: areaForPricing as any,
					userDetails: userForPricing as any,
					hours: 1,
				});
				finalPrice = pricingResult.finalPrice;
			}

			const reservationData = {
				firstName: pendingFormData.firstName,
				lastName: pendingFormData.lastName,
				phoneNumber: pendingFormData.phoneNumber.replace(/\s+/g, ''),
				specialRequests: pendingFormData.specialRequests,
				areaId: areaId,
				startTime: new Date(startTime).toISOString(),
				endTime: new Date(endTime).toISOString(),
				totalPrice: finalPrice,
				status: 'pending',
				isVenueBooking: true,
				numberOfGuests: pendingFormData.numberOfGuests,
				paymentMethod: pendingFormData.paymentMethod,
				paymentProof: gcashFile,
			};

			await booking.createAreaBooking(reservationData);

			setTimeout(() => {
				setIsSubmitting(false);
				showAlert(
					'success',
					'Booking Successful!',
					'Your area booking has been submitted. You will receive a confirmation shortly.',
					[
						{
							text: 'OK',
							style: 'default',
							onPress: () => {
								hideAlert();
								router.replace('/(screens)');
							},
						},
					]
				);
			}, 1500);

			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
		} catch (error: any) {
			console.error('Booking error:', error);
			setIsSubmitting(false);
			showAlert(
				'error',
				'Booking Failed',
				'An error occurred while processing your booking. Please try again.',
				[{ text: 'OK', style: 'default' }]
			);
		}
	};

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<StyledText className="text-text-primary font-montserrat mt-4">
					Loading venue details...
				</StyledText>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-surface-default">
			{/* Header */}
			<View className="bg-surface-default px-4 py-2 border-b border-border-focus">
				<View className="flex-row items-center justify-between">
					<TouchableOpacity
						onPress={() => router.back()}
						className="flex-row items-center p-2"
					>
						<Ionicons name="arrow-back" size={24} color="#3B0270" />
					</TouchableOpacity>
					<StyledText className="text-text-primary font-playfair-semibold text-3xl text-center">
						Confirm Booking
					</StyledText>
					<View className="w-10" />
				</View>
			</View>

			<ScrollView className="flex-1">
				<View className="p-6">
					{/* Area Info Card */}
					{areaData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-focus">
							<Image
								source={{ uri: areaData.images?.[0].area_image }}
								className="w-full h-48"
								resizeMode="cover"
							/>
							<View className="p-4">
								<StyledText className="text-text-primary font-playfair-semibold text-4xl mb-3">
									{areaData.area_name}
								</StyledText>
								<View className="flex-row items-center mb-2">
									<Ionicons
										name="people-outline"
										size={16}
										color="#6F00FF"
									/>
									<StyledText className="text-text-primary font-montserrat ml-2">
										Capacity: {areaData.capacity} pax
									</StyledText>
								</View>
								<View className="flex-row items-center">
									<Ionicons
										name="time-outline"
										size={16}
										color="#6F00FF"
									/>
									<StyledText className="text-text-primary font-montserrat ml-2">
										9 hours (8:00 AM - 5:00 PM)
									</StyledText>
								</View>
							</View>
						</View>
					)}

					{/* Booking Form */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-focus">
						<StyledText className="text-text-primary font-playfair-bold text-3xl mb-4">
							Guest Information
						</StyledText>

						{/* Name Fields */}
						<View className="flex-row space-x-4 mb-4">
							<View className="flex-1 mr-1">
								<StyledText className="text-text-primary font-montserrat mb-2">
									First Name
								</StyledText>
								<Controller
									control={control}
									name="firstName"
									rules={{
										required: 'First name is required',
										pattern: {
											value: /^[A-Za-z\s]+$/,
											message: 'Name should contain only letters and spaces',
										},
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											editable={false}
											selectTextOnFocus={false}
											className={`border rounded-xl p-3 font-montserrat opacity-60 ${
												errors.firstName
													? 'border-feedback-error-DEFAULT'
													: 'border-border-focus'
											}`}
											placeholder="Enter first name"
										/>
									)}
								/>
								{errors.firstName && (
									<StyledText className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
										{errors.firstName.message}
									</StyledText>
								)}
							</View>
							<View className="flex-1 ml-1">
								<StyledText className="text-text-primary font-montserrat mb-2">
									Last Name
								</StyledText>
								<Controller
									control={control}
									name="lastName"
									rules={{
										required: 'Last name is required',
										pattern: {
											value: /^[A-Za-z\s]+$/,
											message: 'Name should contain only letters and spaces',
										},
									}}
									render={({ field: { onChange, onBlur, value } }) => (
										<TextInput
											value={value}
											onChangeText={onChange}
											onBlur={onBlur}
											editable={false}
											selectTextOnFocus={false}
											className={`border rounded-xl p-3 font-montserrat opacity-60 ${
												errors.lastName
													? 'border-feedback-error-DEFAULT'
													: 'border-border-focus'
											}`}
											placeholder="Enter last name"
										/>
									)}
								/>
								{errors.lastName && (
									<StyledText className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
										{errors.lastName.message}
									</StyledText>
								)}
							</View>
						</View>

						{/* Phone Number */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat mb-2">
								Phone Number *
							</StyledText>
							<Controller
								control={control}
								name="phoneNumber"
								rules={{
									required: 'Phone number is required',
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<TextInput
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										keyboardType="phone-pad"
										className={`border rounded-xl p-3 font-montserrat ${
											errors.phoneNumber
												? 'border-feedback-error-DEFAULT'
												: 'border-border-focus'
										}`}
										placeholder="+639XXXXXXXXX or 09XXXXXXXXX"
									/>
								)}
							/>
							{errors.phoneNumber && (
								<StyledText className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.phoneNumber.message}
								</StyledText>
							)}
						</View>

						{/* Number of Guests */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat mb-2">
								Number of Guests *
							</StyledText>
							<Controller
								control={control}
								name="numberOfGuests"
								rules={{
									required: 'Number of guests is required',
									validate: (value) => {
										const numValue = parseInt(value.toString()) || 0;
										if (numValue < 1) {
											return 'At least 1 guest is required';
										}
										return true;
									},
								}}
								render={({ field: { onChange, onBlur, value } }) => (
									<TextInput
										value={value > 0 ? value.toString() : ''}
										onChangeText={(text) => {
											const numValue = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g, '')) || 0;
											onChange(numValue);
										}}
										onBlur={onBlur}
										keyboardType="numeric"
										placeholder="Enter number of guests"
										className={`border rounded-xl p-3 font-montserrat ${
											errors.numberOfGuests
												? 'border-feedback-error-DEFAULT'
												: 'border-border-focus'
										}`}
									/>
								)}
							/>
							{errors.numberOfGuests && (
								<StyledText className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.numberOfGuests.message}
								</StyledText>
							)}
							{areaData?.capacity && (
								<StyledText className="text-text-muted font-montserrat text-sm mt-1">
									Maximum capacity: {areaData.capacity} guests
								</StyledText>
							)}
						</View>

						{/* GCash Payment Proof */}
						<View className="mb-4">
							<StyledText variant='montserrat-bold' className="text-text-primary text-lg mb-3">
								GCash Payment Proof *
							</StyledText>
							
							{/* GCash QR Codes */}
							<View className="mb-4 bg-background-elevated rounded-2xl p-2">
								<View className="flex-row items-center mb-3">
									<Ionicons name="qr-code" size={20} color="#6F00FF" />
									<StyledText variant='montserrat-bold' className="text-text-primary ml-2">
										Scan to Pay with GCash
									</StyledText>
								</View>
								<StyledText variant='raleway-regular' className="text-text-muted text-xs mb-3">
									Scan either QR code below to complete your payment
								</StyledText>
								<View className="flex-row justify-around gap-3">
									<TouchableOpacity 
										onPress={() => handleViewQrCode(1)}
										className="flex-1 items-center rounded-xl border border-border-focus p-3"
										activeOpacity={0.8}
									>
										<View className="relative">
											<Image
												source={require('@/assets/images/GCash_MOP1.jpg')}
												className="w-48 h-40"
												resizeMode="contain"
											/>
										</View>
										<StyledText className="text-text-primary font-montserrat-bold text-xs mt-2">
											GCash QR 1
										</StyledText>
									</TouchableOpacity>
									<TouchableOpacity 
										onPress={() => handleViewQrCode(2)}
										className="flex-1 items-center rounded-xl border border-border-focus p-3"
										activeOpacity={0.8}
									>
										<View className="relative">
											<Image
												source={require('@/assets/images/GCash_MOP2.jpg')}
												className="w-48 h-40"
												resizeMode="center"
											/>
										</View>
										<StyledText className="text-text-primary font-montserrat-bold text-xs mt-2">
											GCash QR 2
										</StyledText>
									</TouchableOpacity>
								</View>
							</View>

							<StyledText className="text-text-primary font-montserrat mb-2">
								Upload Payment Screenshot *
							</StyledText>
							<TouchableOpacity
								onPress={handlePickImage}
								className="border border-border-focus rounded-xl p-4 items-center"
							>
								<Ionicons
									name="cloud-upload-outline"
									size={24}
									color="#6F00FF"
								/>
								<StyledText className="text-text-secondary font-montserrat mt-2">
									{gcashProof
										? 'Payment Proof Uploaded'
										: 'Upload Payment Proof'}
								</StyledText>
							</TouchableOpacity>
							{gcashProof && (
								<View className="mt-3">
									<Image
										source={{ uri: gcashProof }}
										className="w-full h-40 rounded-xl"
										resizeMode="contain"
									/>
									<TouchableOpacity
										onPress={() => {
											setGcashProof(null);
											setGcashFile(null);
										}}
										className="absolute top-2 right-2 bg-surface-default rounded-full p-2"
									>
										<Ionicons
											name="close"
											size={16}
											color="#EF4444"
										/>
									</TouchableOpacity>
								</View>
							)}
						</View>

						{/* Special Requests */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat mb-2">
								Special Requests
							</StyledText>
							<Controller
								control={control}
								name="specialRequests"
								render={({ field: { onChange, onBlur, value } }) => (
									<TextInput
										value={value}
										onChangeText={onChange}
										onBlur={onBlur}
										multiline
										numberOfLines={4}
										className="border border-border-focus rounded-xl p-3 font-montserrat"
										placeholder="Any special requirements or notes for your stay..."
									/>
								)}
							/>
						</View>
					</View>

					{/* Booking Details */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-focus">
						<StyledText className="text-text-primary font-playfair-bold text-3xl mb-4">
							Booking Details
						</StyledText>

						<View className="space-y-3">
							<View className="flex-row justify-between">
								<StyledText className="text-text-primary font-montserrat text-lg">
									Date:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									{formattedStartTime}
								</StyledText>
							</View>
							<View className="flex-row justify-between">
								<StyledText className="text-text-primary font-montserrat text-lg">
									Time:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									8:00 AM - 5:00 PM
								</StyledText>
							</View>
							<View className="flex-row justify-between pt-2 border-t border-border-subtle">
								<StyledText className="text-text-primary font-montserrat-bold text-xl">
									Total:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-2xl">
									₱{' '}
									{parseFloat(totalPrice || '0').toLocaleString()}
								</StyledText>
							</View>
						</View>
					</View>

					{/* Submit Button */}
					<TouchableOpacity
						onPress={handleSubmit(onSubmit)}
						disabled={!gcashFile}
						className={`rounded-2xl py-4 px-6 mb-8 ${
							gcashFile ? 'bg-violet-primary' : 'bg-neutral-300'
						}`}
					>
						<StyledText className="text-center font-montserrat-bold text-lg text-text-inverse">
							Complete Booking
						</StyledText>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Styled Alert */}
			<StyledAlert
				visible={alertState.visible}
				type={alertState.type}
				title={alertState.title}
				message={alertState.message}
				buttons={alertState.buttons}
				onDismiss={hideAlert}
			/>

			{/* Confirmation Modal */}
			<ConfirmBookingModal
				isVisible={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmBooking}
				title="Confirm Your Booking"
				message={`You're about to book ${areaData?.area_name} in ${formattedStartTime}. Would you like to proceed?`}
				confirmText="Confirm Booking"
				cancelText="Cancel"
			/>

			{/* Loading Overlay */}
			<ConfirmingBooking
				isVisible={isSubmitting}
				message="Securing your reservation and processing payment..."
			/>

			{/* QR Code Viewer Modal */}
			<Modal
				visible={qrModalVisible}
				transparent={true}
				animationType="fade"
				onRequestClose={() => setQrModalVisible(false)}
			>
				<View 
					className="flex-1 justify-center items-center"
					style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
				>
					<View className="bg-background-elevated rounded-3xl p-6 mx-4 w-11/12 max-w-md">
						{/* Header */}
						<View className="flex-row justify-between items-center mb-4">
							<View className="flex-row items-center">
								<Ionicons name="qr-code" size={24} color="#6F00FF" />
								<StyledText className="text-text-primary font-playfair-bold text-xl ml-2">
									GCash QR Code {selectedQrImage}
								</StyledText>
							</View>
							<TouchableOpacity
								onPress={() => setQrModalVisible(false)}
								className="w-8 h-8 rounded-full items-center justify-center"
							>
								<Ionicons name="close" size={20} color="#3B0270" />
							</TouchableOpacity>
						</View>

						{/* QR Code Image */}
						<View className="p-4 mb-4">
							<Image
								source={
									selectedQrImage === 1
										? require('@/assets/images/GCash_MOP1.jpg')
										: require('@/assets/images/GCash_MOP2.jpg')
								}
								className="w-full h-80"
								resizeMode="contain"
							/>
						</View>

						{/* Instructions */}
						<View className="bg-feedback-info-light rounded-xl p-3 mb-4">
							<View className="flex-row items-start">
								<Ionicons name="information-circle" size={20} color="#3B82F6" style={{ marginRight: 8, marginTop: 2 }} />
								<View className="flex-1">
									<StyledText variant='montserrat-bold' className="text-feedback-info-dark text-sm mb-1">
										How to Pay
									</StyledText>
									<StyledText variant='raleway-regular' className="text-feedback-info-dark text-xs">
										1. Open your GCash app{'\n'}
										2. Tap "Scan QR" on the home screen{'\n'}
										3. Scan this QR code{'\n'}
										4. Complete the payment{'\n'}
										5. Take a screenshot of the receipt
									</StyledText>
								</View>
							</View>
						</View>

						{/* Action Buttons */}
						<View className="flex-row gap-3">
							<TouchableOpacity
								onPress={() => setQrModalVisible(false)}
								className="flex-1 rounded-xl py-3 px-4 flex-row items-center justify-center border border-border-default"
								activeOpacity={0.8}
							>
								<StyledText className="text-text-primary font-montserrat-bold">
									Close
								</StyledText>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>
		</SafeAreaView>
	);
}