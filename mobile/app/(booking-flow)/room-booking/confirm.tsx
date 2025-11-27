import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import {
	View,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Image,
	TextInput,
	Platform,
	Modal,
	BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import useAuthStore from '@/store/AuthStore';
import useAlertStore from '@/store/AlertStore';
import {
	calculateRoomPricing,
	formatPrice,
	getDiscountLabel,
} from '@/utils/pricing';
import { booking } from '@/services/Booking';
import ConfirmBookingModal from '@/components/bookings/ConfirmBookingModal';
import ConfirmingBooking from '@/components/ui/ConfirmingBooking';
import PayMongoAmountModal from '@/components/bookings/PayMongoAmountModal';
import { Amenities } from '@/types/Amenity.types';
import { Room } from '@/types/Room.types';
import StyledText from '@/components/ui/StyledText';
import StyledAlert from '@/components/ui/StyledAlert';
import { usePaymongo } from '@/hooks/usePayMongo';
import { convertTo24Hour, formatDateTime, validateCheckInTime } from '@/utils/formatters';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';

interface FormData {
	firstName: string;
	lastName: string;
	phoneNumber: string;
	numberOfGuests: number;
	arrivalTime: string;
	specialRequests: string;
	paymentMethod: 'gcash' | 'paymongo';
}

export default function ConfirmRoomBookingScreen() {
	const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [gcashProof, setGcashProof] = useState<string | null>(null);
	const [gcashFile, setGcashFile] = useState<any>(null);
	const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
	const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
	const [qrModalVisible, setQrModalVisible] = useState<boolean>(false);
	const [selectedQrImage, setSelectedQrImage] = useState<number | null>(null);
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<'gcash' | 'paymongo'>('gcash');
	const [showPayMongoModal, setShowPayMongoModal] = useState<boolean>(false);
	const [confirmedDownPayment, setConfirmedDownPayment] = useState<number | null>(null);
	const [exitAlertVisible, setExitAlertVisible] = useState<boolean>(false);

	const { alertConfig, setAlertConfig } = useAlertStore();

	const getDefaultCheckInTime = () => {
		const date = new Date();
		date.setHours(14, 0, 0, 0);
		return date;
	};

	const [selectedTime, setSelectedTime] = useState<Date>(
		getDefaultCheckInTime()
	);

	const { user } = useAuthStore();
	const router = useRouter();
	const queryClient = useQueryClient();

	const {
		createSourcePrebookingAndRedirect,
		isProcessing: isPayMongoProcessing,
	} = usePaymongo();

	const { roomId, checkInDate, checkOutDate, totalPrice } =
		useLocalSearchParams<{
			roomId: string;
			checkInDate: string;
			checkOutDate: string;
			totalPrice: string;
		}>();

	const {
		control,
		handleSubmit,
		formState: { errors },
		setError,
	} = useForm<FormData>({
		mode: 'onSubmit',
		defaultValues: {
			firstName: user?.first_name || '',
			lastName: user?.last_name || '',
			phoneNumber: '',
			numberOfGuests: 0,
			arrivalTime: '',
			specialRequests: '',
			paymentMethod: 'gcash',
		},
	});

	const { data: roomResponse, isLoading } = useQuery({
		queryKey: ['room', roomId],
		queryFn: () => booking.getRoomById(roomId!),
		enabled: !!roomId,
		refetchOnMount: false,
	});

	const roomData: Room = roomResponse?.data;

	const createBookingMutation = useMutation({
		mutationFn: (data: any) => booking.createRoomBooking(data),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
			setAlertConfig({
				visible: true,
				type: 'success',
				title: 'Booking Successful!',
				message:
					'Your room booking has been submitted. You will receive a confirmation shortly.',
				buttons: [
					{
						text: 'OK',
						style: 'default',
						onPress: () => router.replace('/(screens)'),
					},
				],
			});
		},
		onError: (error: any) => {
			const errorMessage = error.response?.data?.error
				? JSON.stringify(error.response.data.error, null, 2)
				: error.message || 'An unknown error occurred';

			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Booking Failed',
				message: `Error: ${errorMessage}`,
				buttons: [{ text: 'OK', style: 'default' }],
			});
		}
	});

	const formattedCheckIn = formatDateTime(checkInDate);
	const formattedCheckOut = formatDateTime(checkOutDate);

	useFocusEffect(
		useCallback(() => {
			const backAction = () => {
				setExitAlertVisible(true);
				return true;
			};

			const backHandler = BackHandler.addEventListener(
				'hardwareBackPress',
				backAction
			);

			return () => backHandler.remove();
		}, [])
	);

	const handleExitBooking = () => {
		setExitAlertVisible(false);
		router.back();
	};

	const calculateNights = () => {
		if (!checkInDate || !checkOutDate) return 0;
		try {
			const checkIn = parseISO(checkInDate);
			const checkOut = parseISO(checkOutDate);
			const nights = differenceInDays(checkOut, checkIn);
			return nights > 0 ? nights : 0;
		} catch (error) {
			console.error('Error calculating nights:', error);
			return 0;
		}
	};

	const nights = calculateNights();

	const pricingResult = roomData
		? calculateRoomPricing
			? calculateRoomPricing({
					roomData: roomData as any,
					userDetails: user
						? { ...user, username: user.email || `user_${user.id}` }
						: null,
					nights,
				})
			: null
		: null;

	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== 'granted') {
			setError('paymentMethod', {
				type: 'manual',
				message: 'Camera roll permission is required to upload payment proof.',
			});
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

	const formatTimeDisplay = (timeString: string) => {
		if (!timeString) return 'Select arrival time';
		return timeString;
	};

	const onSubmit = (data: FormData) => {
		// Arrival time validation
		if (!data.arrivalTime) {
			setError('arrivalTime', {
				type: 'required',
				message: 'Please select your expected arrival time',
			});
			return;
		}

		// Validate check-in time is between 2:00 PM and 11:00 PM
		if (!validateCheckInTime(data.arrivalTime)) {
			setError('arrivalTime', {
				type: 'validate',
				message: 'Check-in time must be between 2:00 PM and 11:00 PM',
			});
			return;
		}

		if (data.paymentMethod === 'gcash' && !gcashFile) {
			setError('paymentMethod', {
				type: 'required',
				message: 'Please upload GCash payment proof',
			});
			return;
		}

		if (data.paymentMethod === 'paymongo' && !confirmedDownPayment) {
			setError('paymentMethod', {
				type: 'required',
				message: 'Please confirm down payment amount for PayMongo',
			});
			return;
		}

		const cleanedValue = data.phoneNumber.replace(/[^\d+]/g, '');
		const phPattern = /^(\+639\d{9}|09\d{9})$/;
		if (!phPattern.test(cleanedValue)) {
			setError('phoneNumber', {
				type: 'pattern',
				message: 'Phone number must be a Philippine number (+639XXXXXXXXX or 09XXXXXXXXX)',
			});
			return;
		}

		if (roomData?.max_guests && data.numberOfGuests > roomData.max_guests) {
			setError('numberOfGuests', {
				type: 'validate',
				message: `Maximum capacity is ${roomData.max_guests} guests`,
			});
			return;
		}

		setPendingFormData(data);

		if (!roomId || !checkInDate || !checkOutDate || !totalPrice) {
			// Attach a generic form error so the UI surfaces the issue instead of an alert
			setError('firstName', {
				type: 'manual',
				message: 'Missing booking information. Please try again.',
			});
			return;
		}

		setShowConfirmModal(true);
	};

	const handlePayMongoAmountConfirm = (amount: number) => {
		setConfirmedDownPayment(amount);
		setShowPayMongoModal(false);
	};

	const handlePayMongoModalClose = () => {
		setShowPayMongoModal(false);
		setConfirmedDownPayment(null);
		setSelectedPaymentMethod('gcash');
		control._formValues.paymentMethod = 'gcash';
	};

	const handleConfirmBooking = async () => {
		if (
			!roomId ||
			!checkInDate ||
			!checkOutDate ||
			!totalPrice ||
			!pendingFormData
		) {
			return;
		}

		setShowConfirmModal(false);

		// --- PAYMONGO FLOW (Kept manual to preserve redirect/hook logic) ---
		if (pendingFormData.paymentMethod === 'paymongo') {
			if (!confirmedDownPayment) {
				setAlertConfig({
					visible: true,
					type: 'error',
					title: 'Error',
					message: 'Please enter down payment amount first.',
					buttons: [{ text: 'OK', style: 'default' }],
				});
				return;
			}

			if (!user?.id) {
				setAlertConfig({
					visible: true,
					type: 'error',
					title: 'Authentication Error',
					message: 'Please log in to continue with booking.',
					buttons: [{ text: 'OK', style: 'default' }],
				});
				return;
			}

			setIsSubmitting(true);

			try {
				const baseUrl = process.env.EXPO_PUBLIC_DJANGO_URL;

				const bookingData = {
					user_id: user.id.toString(),
					room_id: roomId,
					first_name: pendingFormData.firstName,
					last_name: pendingFormData.lastName,
					phone_number: pendingFormData.phoneNumber.replace(
						/\s+/g,
						''
					),
					check_in: checkInDate,
					check_out: checkOutDate,
					total_price: parseFloat(totalPrice),
					number_of_guests: pendingFormData.numberOfGuests,
					special_requests: pendingFormData.specialRequests || '',
					arrival_time: pendingFormData.arrivalTime
						? convertTo24Hour(pendingFormData.arrivalTime)
						: '',
				};

				const result = await createSourcePrebookingAndRedirect({
					amountPhp: confirmedDownPayment,
					bookingData,
					successUrl: `${baseUrl}/booking/paymongo/payment-success`,
					failedUrl: `${baseUrl}/booking/paymongo/payment-failed`,
				});

				if (result.success) {
					setIsSubmitting(false);
					setAlertConfig({
						visible: true,
						type: 'info',
						title: 'Opening Payment Gateway',
						message: `You will be redirected to PayMongo to complete your ₱${confirmedDownPayment.toFixed(2)} payment. After payment, you'll be redirected back to the app automatically.`,
						buttons: [
							{
								text: 'Continue',
								style: 'default',
								onPress: () => {
									router.replace('/(screens)');
								},
							},
						],
					});
				}
			} catch (error: any) {
				setIsSubmitting(false);
				setAlertConfig({
					visible: true,
					type: 'error',
					title: 'Payment Failed',
					message:
						error.message ||
						'Failed to initiate payment. Please try again.',
					buttons: [{ text: 'OK', style: 'default' }],
				});
			}
			return;
		}

		const formData = new FormData();
		formData.append('firstName', pendingFormData.firstName);
		formData.append('lastName', pendingFormData.lastName);
		formData.append(
			'phoneNumber',
			pendingFormData.phoneNumber.replace(/\s+/g, '')
		);
		formData.append(
			'numberOfGuests',
			pendingFormData.numberOfGuests.toString()
		);
		formData.append(
			'specialRequests',
			pendingFormData.specialRequests || ''
		);
		formData.append('roomId', roomId!);
		formData.append('checkIn', checkInDate!);
		formData.append('checkOut', checkOutDate!);
		formData.append('totalPrice', totalPrice!);
		formData.append('status', 'pending');
		formData.append('isVenueBooking', 'false');
		formData.append('paymentMethod', pendingFormData.paymentMethod);

		if (pendingFormData.arrivalTime) {
			const arrivalTime24h = convertTo24Hour(
				pendingFormData.arrivalTime
			);
			formData.append('arrivalTime', arrivalTime24h);
		}

		if (pendingFormData.paymentMethod === 'gcash' && gcashFile) {
			formData.append('paymentProof', gcashFile as any);
		}

		createBookingMutation.mutate(formData);
	};

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<StyledText className="text-text-primary font-montserrat mt-4">
					Loading room details...
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

			<KeyboardAwareScrollView
				className="flex-1"
				enableOnAndroid={true}
				keyboardShouldPersistTaps="handled"
				extraScrollHeight={Platform.OS === 'ios' ? 20 : 120}
				contentContainerStyle={{ flexGrow: 1 }}
			>
				<View className="p-6">
					{/* Room Info Card */}
					{roomData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-focus">
							<Image
								source={{
									uri: roomData.images?.[0].room_image,
								}}
								className="w-full h-48"
								resizeMode="cover"
							/>
							<View className="p-4">
								<StyledText className="text-text-primary font-playfair-bold text-4xl mb-3">
									{roomData.room_name}
								</StyledText>
								<View className="flex-row items-center mb-2">
									<Ionicons
										name="people-outline"
										size={16}
										color="#6F00FF"
									/>
									<StyledText className="text-text-primary font-montserrat ml-2">
										Max Guests: {roomData.max_guests}
									</StyledText>
								</View>
								<View className="flex-row items-center mb-3">
									<Ionicons
										name="bed-outline"
										size={16}
										color="#6F00FF"
									/>
									<StyledText className="text-text-primary font-montserrat ml-2">
										{nights}{' '}
										{nights === 1 ? 'Night' : 'Nights'}
									</StyledText>
								</View>

								{/* Amenities */}
								{roomData.amenities &&
									roomData.amenities.length > 0 && (
										<View className="mt-2">
											<StyledText className="text-text-primary font-montserrat-bold text-sm mb-2">
												Amenities:
											</StyledText>
											<View className="flex-row flex-wrap gap-2">
												{roomData.amenities.map(
													(amenity: Amenities) => (
														<View
															key={amenity.id}
															className="bg-brand-primary rounded-full px-3 py-1.5 flex-row items-center"
														>
															<StyledText className="text-text-inverse font-montserrat text-md ml-1">
																{
																	amenity.description
																}
															</StyledText>
														</View>
													)
												)}
											</View>
										</View>
									)}
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
											message:
												'Name should contain only letters and spaces',
										},
									}}
									render={({
										field: { onChange, onBlur, value },
									}) => (
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
											message:
												'Name should contain only letters and spaces',
										},
									}}
									render={({
										field: { onChange, onBlur, value },
									}) => (
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
										pattern: {
											value: /^(\+639\d{9}|09\d{9})$/,
											message:
												'Phone number must be a Philippine number (+639XXXXXXXXX or 09XXXXXXXXX)',
										},
									}}
								render={({
									field: { onChange, onBlur, value },
								}) => (
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
											const numValue =
												parseInt(value.toString()) || 0;
											if (numValue < 1) {
												return 'At least 1 guest is required';
											}
											if (roomData?.max_guests && numValue > roomData.max_guests) {
												return `Maximum capacity is ${roomData.max_guests} guests`;
											}
											return true;
										},
									}}
								render={({
									field: { onChange, onBlur, value },
								}) => (
									<TextInput
										value={
											value > 0 ? value.toString() : ''
										}
										onChangeText={(text) => {
											const numValue =
												text === ''
													? 0
													: parseInt(
															text.replace(
																/[^0-9]/g,
																''
															)
														) || 0;
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
							{roomData?.max_guests && (
								<StyledText className="text-text-muted font-montserrat text-sm mt-1">
									Maximum capacity: {roomData.max_guests}{' '}
									guests
								</StyledText>
							)}
						</View>

						{/* Arrival Time */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat mb-2">
								Expected Arrival Time *
							</StyledText>
							<Controller
								control={control}
								name="arrivalTime"
								rules={{
									required: 'Arrival time is required',
								}}
								render={({ field: { onChange, value } }) => (
									<>
										<TouchableOpacity
											onPress={() =>
												setShowTimePicker(true)
											}
											className={`border rounded-xl p-3 flex-row items-center justify-between ${
												errors.arrivalTime
													? 'border-feedback-error-DEFAULT'
													: 'border-border-focus'
											}`}
										>
											<StyledText
												className={`font-montserrat ${value ? 'text-text-primary' : 'text-text-muted'}`}
											>
												{formatTimeDisplay(value)}
											</StyledText>
											<Ionicons
												name="time-outline"
												size={20}
												color="#6F00FF"
											/>
										</TouchableOpacity>
										{showTimePicker && (
											<DateTimePicker
												value={selectedTime}
												mode="time"
												is24Hour={false}
												display={
													Platform.OS === 'ios'
														? 'spinner'
														: 'default'
												}
												onChange={(event, date) => {
													if (
														Platform.OS ===
														'android'
													) {
														setShowTimePicker(
															false
														);
													}
													if (date) {
														setSelectedTime(date);
														const formattedTime =
															format(
																date,
																'hh:mm a'
															);
														onChange(formattedTime);
													}
												}}
											/>
										)}
										{Platform.OS === 'ios' &&
											showTimePicker && (
												<TouchableOpacity
													onPress={() =>
														setShowTimePicker(false)
													}
													className="bg-interactive-primary rounded-xl py-2 px-4 mt-2"
												>
													<StyledText className="text-interactive-primary-foreground font-montserrat-bold text-center">
														Done
													</StyledText>
												</TouchableOpacity>
											)}
									</>
								)}
							/>
							<StyledText
								variant="montserrat-regular"
								className="text-sm mt-1"
							>
								Expected arrival time between 2:00 PM and 11:00
								PM.
							</StyledText>
							{errors.arrivalTime && (
								<StyledText className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.arrivalTime.message}
								</StyledText>
							)}
						</View>

						{/* Payment Method Selection */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat-bold text-lg mb-3">
								Payment Method *
							</StyledText>
							<Controller
								control={control}
								name="paymentMethod"
								render={({ field: { onChange, value } }) => (
									<View className="space-y-3">
										{/* GCash Screenshot Option */}
										<TouchableOpacity
											onPress={() => {
												onChange('gcash');
												setSelectedPaymentMethod(
													'gcash'
												);
											}}
											className={`border-2 rounded-xl p-4 ${
												value === 'gcash'
													? 'border-brand-primary bg-brand-accent'
													: 'border-border-focus'
											}`}
										>
											<View className="flex-row items-center justify-between">
												<View className="flex-row items-center flex-1">
													<View
														className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
															value === 'gcash'
																? 'border-brand-primary bg-brand-primary'
																: 'border-border-focus'
														}`}
													>
														{value === 'gcash' && (
															<View className="w-2.5 h-2.5 rounded-full bg-white" />
														)}
													</View>
													<View className="flex-1">
														<StyledText className="text-text-primary font-montserrat-bold text-base">
															GCash Payment Proof
														</StyledText>
														<StyledText
															variant="raleway-regular"
															className="text-text-muted text-sm mt-1"
														>
															Upload screenshot of
															GCash payment
														</StyledText>
													</View>
												</View>
												<Ionicons
													name="image-outline"
													size={24}
													color="#6F00FF"
												/>
											</View>
										</TouchableOpacity>

										{/* PayMongo Option */}
										<TouchableOpacity
											onPress={() => {
												onChange('paymongo');
												setSelectedPaymentMethod(
													'paymongo'
												);
												// Show amount modal immediately when PayMongo is selected
												setShowPayMongoModal(true);
											}}
											className={`border-2 rounded-xl p-4 ${
												value === 'paymongo'
													? 'border-brand-primary bg-brand-accent'
													: 'border-border-focus'
											}`}
										>
											<View className="flex-row items-center justify-between">
												<View className="flex-row items-center flex-1">
													<View
														className={`w-5 h-5 rounded-full border-2 mr-3 items-center justify-center ${
															value === 'paymongo'
																? 'border-brand-primary bg-brand-primary'
																: 'border-border-focus'
														}`}
													>
														{value ===
															'paymongo' && (
															<View className="w-2.5 h-2.5 rounded-full bg-white" />
														)}
													</View>
													<View className="flex-1">
														<StyledText className="text-text-primary font-montserrat-bold text-base">
															PayMongo
														</StyledText>
														<StyledText
															variant="raleway-regular"
															className="text-text-muted text-sm mt-1"
														>
															Secure online
															payment via PayMongo
														</StyledText>
													</View>
												</View>
												<Ionicons
													name="card-outline"
													size={24}
													color="#6F00FF"
												/>
											</View>
										</TouchableOpacity>
									</View>
								)}
							/>
						</View>

						{/* GCash Payment Proof (only show when GCash is selected) */}
						{selectedPaymentMethod === 'gcash' && (
							<View className="mb-4">
								<StyledText className="text-text-primary font-montserrat-bold text-lg mb-3">
									GCash Payment Proof *
								</StyledText>

								{/* GCash QR Codes */}
								<View className="mb-4 bg-background-elevated rounded-2xl p-2">
									<View className="flex-row items-center mb-3">
										<Ionicons
											name="qr-code"
											size={20}
											color="#6F00FF"
										/>
										<StyledText className="text-text-primary font-montserrat-bold ml-2">
											Scan to Pay with GCash
										</StyledText>
									</View>
									<StyledText
										variant="raleway-regular"
										className="text-text-muted text-xs mb-3"
									>
										Scan either QR code below to complete
										your payment. Tap to view larger.
									</StyledText>
									<View className="flex-row justify-around gap-3">
										<TouchableOpacity
											className="flex-1 items-center rounded-xl border border-border-focus p-3"
											onPress={() => handleViewQrCode(1)}
											activeOpacity={0.7}
										>
											<Image
												source={require('@/assets/images/GCash_MOP1.jpg')}
												className="w-full h-40"
												resizeMode="contain"
											/>
											<View className="flex-row items-center mt-2">
												<StyledText className="text-text-primary font-montserrat-bold text-xs">
													GCash QR 1
												</StyledText>
											</View>
										</TouchableOpacity>
										<TouchableOpacity
											className="flex-1 items-center rounded-xl border border-border-focus p-3"
											onPress={() => handleViewQrCode(2)}
											activeOpacity={0.7}
										>
											<Image
												source={require('@/assets/images/GCash_MOP2.jpg')}
												className="w-full h-40"
												resizeMode="contain"
											/>
											<View className="flex-row items-center mt-2">
												<StyledText className="text-text-primary font-montserrat-bold text-xs">
													GCash QR 2
												</StyledText>
											</View>
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
						)}

						{/* Special Requests */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat mb-2">
								Special Requests
							</StyledText>
							<Controller
								control={control}
								name="specialRequests"
								render={({
									field: { onChange, onBlur, value },
								}) => (
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
									Check-in:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									{formattedCheckIn}
								</StyledText>
							</View>
							<View className="flex-row justify-between">
								<StyledText className="text-text-primary font-montserrat text-lg">
									Check-out:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									{formattedCheckOut}
								</StyledText>
							</View>
							<View className="flex-row justify-between">
								<StyledText className="text-text-primary font-montserrat text-lg">
									Duration:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									{nights} {nights === 1 ? 'Night' : 'Nights'}
								</StyledText>
							</View>
							<View className="flex-row justify-between">
								<StyledText className="text-text-primary font-montserrat text-lg">
									No. of Guest(s):
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-lg">
									{pendingFormData?.numberOfGuests ||
										control._formValues.numberOfGuests}
								</StyledText>
							</View>
							<View className="flex-row justify-between pt-2 border-t border-border-subtle">
								<StyledText className="text-text-primary font-montserrat-bold text-xl">
									Total:
								</StyledText>
								<StyledText className="text-text-secondary font-montserrat-bold text-2xl">
									₱{' '}
									{parseFloat(
										totalPrice || '0'
									).toLocaleString()}
								</StyledText>
							</View>

							{/* Down Payment Display - Only show for PayMongo when confirmed */}
							{selectedPaymentMethod === 'paymongo' &&
								confirmedDownPayment && (
									<View className="bg-feedback-success-light rounded-xl p-3 mt-2">
										<View className="flex-row items-center mb-2">
											<Ionicons
												name="checkmark-circle"
												size={20}
												color="#10B981"
											/>
											<StyledText className="text-feedback-success-dark font-montserrat-bold text-sm ml-2">
												Down Payment Confirmed
											</StyledText>
										</View>
										<View className="flex-row justify-between">
											<StyledText className="text-feedback-success-dark font-raleway text-sm">
												Amount to pay now:
											</StyledText>
											<StyledText className="text-feedback-success-dark font-montserrat-bold text-lg">
												₱
												{confirmedDownPayment.toLocaleString()}
											</StyledText>
										</View>
										<StyledText className="text-feedback-success-dark font-raleway text-xs mt-1">
											Remaining balance (₱
											{(
												parseFloat(totalPrice || '0') -
												confirmedDownPayment
											).toLocaleString()}
											) to be paid upon check-in
										</StyledText>
									</View>
								)}

							{/* Discount breakdown */}
							{pricingResult &&
								pricingResult.discountType !== 'none' && (
									<View className="mt-3 p-3 bg-brand-primary rounded-lg">
										<StyledText className="text-text-inverse font-montserrat mb-1">
											{getDiscountLabel(
												pricingResult.discountType,
												pricingResult.discountPercent
											)}
										</StyledText>
										<StyledText className="text-text-inverse font-montserrat text-sm">
											Price/night:{' '}
											{formatPrice(
												pricingResult.finalPrice
											)}{' '}
											• Original/night:{' '}
											{formatPrice(
												pricingResult.originalPrice
											)}
										</StyledText>
									</View>
								)}
						</View>
					</View>

					{/* Submit Button */}
					<TouchableOpacity
						onPress={handleSubmit(onSubmit)}
						disabled={
							selectedPaymentMethod === 'gcash' && !gcashFile
						}
						className={`rounded-2xl py-4 px-6 mb-8 ${
							selectedPaymentMethod === 'paymongo' ||
							(selectedPaymentMethod === 'gcash' && gcashFile)
								? 'bg-brand-primary'
								: 'bg-neutral-300'
						}`}
					>
						<StyledText className="text-center font-montserrat-bold text-lg text-text-inverse">
							{selectedPaymentMethod === 'paymongo'
								? 'Proceed to Payment'
								: 'Complete Booking'}
						</StyledText>
					</TouchableOpacity>
				</View>
			</KeyboardAwareScrollView>

			{/* Confirmation Modal */}
			<ConfirmBookingModal
				isVisible={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmBooking}
				title="Confirm Your Booking"
				message={`You're about to book ${roomData?.room_name} from ${formattedCheckIn} to ${formattedCheckOut}. The total price is ₱${parseFloat(totalPrice || '0').toLocaleString()}. Would you like to proceed?`}
				confirmText="Confirm"
				cancelText="Cancel"
			/>

			{/* Loading Overlay */}
			<ConfirmingBooking
				isVisible={isSubmitting || createBookingMutation.isPending}
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
								<Ionicons
									name="qr-code"
									size={24}
									color="#6F00FF"
								/>
								<StyledText className="text-text-primary font-playfair-bold text-xl ml-2">
									GCash QR Code {selectedQrImage}
								</StyledText>
							</View>
							<TouchableOpacity
								onPress={() => setQrModalVisible(false)}
								className="w-8 h-8 rounded-full items-center justify-center"
							>
								<Ionicons
									name="close"
									size={20}
									color="#3B0270"
								/>
							</TouchableOpacity>
						</View>

						{/* QR Code Image */}
						<View className="rounded-2xl p-4 mb-4">
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
								<Ionicons
									name="information-circle"
									size={20}
									color="#3B82F6"
									style={{ marginRight: 8, marginTop: 2 }}
								/>
								<View className="flex-1">
									<StyledText className="text-feedback-info-dark font-montserrat-bold text-sm mb-1">
										How to Pay
									</StyledText>
									<StyledText className="text-feedback-info-dark font-raleway-regular text-xs">
										1. Open your GCash app{'\n'}
										2. Tap "Scan QR" on the home screen
										{'\n'}
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
								className="flex-1 bg-background-subtle rounded-xl py-3 px-4 flex-row items-center justify-center border border-border-default"
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

			{/* PayMongo Amount Modal */}
			<PayMongoAmountModal
				visible={showPayMongoModal}
				onClose={handlePayMongoModalClose}
				onConfirm={handlePayMongoAmountConfirm}
				totalAmount={parseFloat(totalPrice || '0')}
				isProcessing={isPayMongoProcessing}
			/>

			{/* Styled Alert */}
			<StyledAlert
				visible={alertConfig.visible}
				type={alertConfig.type}
				title={alertConfig.title}
				message={alertConfig.message}
				buttons={alertConfig.buttons}
				onDismiss={() =>
					setAlertConfig({ ...alertConfig, visible: false })
				}
			/>

			{/* Confirm Exit Booking */}
			<StyledAlert 
				visible={exitAlertVisible}
				type="warning"
				title="Exit Booking"
				message="Are you sure you want to exit? Your booking progress will be lost."
				buttons={[
					{
						text: 'Cancel',
						onPress: () => setExitAlertVisible(false),
						style: 'cancel',
					},
					{
						text: 'Exit',
						onPress: handleExitBooking,
						style: 'destructive',
					},
				]}
				onDismiss={() => setExitAlertVisible(false)}
			/>
		</SafeAreaView>
	);
}