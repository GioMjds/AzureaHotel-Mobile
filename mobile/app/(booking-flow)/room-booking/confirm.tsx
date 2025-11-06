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
	Platform,
	Modal,
	Alert,
	Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import useAuthStore from '@/store/AuthStore';
import {
	calculateRoomPricing,
	formatPrice,
	getDiscountLabel,
} from '@/utils/pricing';
import { booking } from '@/services/Booking';
import ConfirmBookingModal from '@/components/bookings/ConfirmBookingModal';
import ConfirmingBooking from '@/components/ui/ConfirmingBooking';
import { Amenities } from '@/types/Amenity.types';
import { Room } from '@/types/Room.types';
import StyledText from '@/components/ui/StyledText';
import StyledAlert from '@/components/ui/StyledAlert';

interface FormData {
	firstName: string;
	lastName: string;
	phoneNumber: string;
	numberOfGuests: number;
	arrivalTime: string;
	specialRequests: string;
	paymentMethod: 'gcash' | 'physical';
}

export default function ConfirmRoomBookingScreen() {
	const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [gcashProof, setGcashProof] = useState<string | null>(null);
	const [gcashFile, setGcashFile] = useState<any>(null);
	const [pendingFormData, setPendingFormData] = useState<FormData | null>(
		null
	);
	const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
	const [qrModalVisible, setQrModalVisible] = useState<boolean>(false);
	const [selectedQrImage, setSelectedQrImage] = useState<number | null>(null);
	const [alertConfig, setAlertConfig] = useState<{
		visible: boolean;
		type: 'success' | 'error' | 'warning' | 'info';
		title: string;
		message?: string;
		buttons?: Array<{
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}>;
	}>({
		visible: false,
		type: 'info',
		title: '',
		message: '',
		buttons: [],
	});

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

	const formatDateTime = (dateTimeString: string | null) => {
		if (!dateTimeString) return '';
		try {
			const date = parseISO(dateTimeString);
			return format(date, 'EEE, MMM dd, yyyy');
		} catch {
			return dateTimeString;
		}
	};

	const formattedCheckIn = formatDateTime(checkInDate);
	const formattedCheckOut = formatDateTime(checkOutDate);

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

	// Compute pricing result for display (keeps consistent with calendar)
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
		const { status } =
			await ImagePicker.requestMediaLibraryPermissionsAsync();

		if (status !== 'granted') {
			setAlertConfig({
				visible: true,
				type: 'warning',
				title: 'Permission Required',
				message:
					'Sorry, we need camera roll permissions to upload payment proof.',
				buttons: [{ text: 'OK', style: 'default' }],
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

	const handleDownloadQrCode = async () => {
		try {
			// Request media library permissions
			const { status } = await MediaLibrary.requestPermissionsAsync();
			if (status !== 'granted') {
				Alert.alert(
					'Permission Required',
					'Please grant media library permissions to save the QR code.',
					[{ text: 'OK', style: 'default' }]
				);
				return;
			}

			// Determine which QR code to save
			const qrImageName = selectedQrImage === 1 ? 'GCash_MOP1.jpg' : 'GCash_MOP2.jpg';
			const qrImageUri = selectedQrImage === 1
				? require('@/assets/images/GCash_MOP1.jpg')
				: require('@/assets/images/GCash_MOP2.jpg');

			// Get the asset module URI
			const assetUri = Image.resolveAssetSource(qrImageUri).uri;
			
			// Create a temporary file in cache directory
			const cacheFile = new FileSystem.File(FileSystem.Paths.cache, qrImageName);
			
			// Download the asset to cache
			await FileSystem.downloadAsync(assetUri, cacheFile.uri);

			// Save to media library
			const asset = await MediaLibrary.createAssetAsync(cacheFile.uri);
			
			// Optionally create an album
			try {
				const album = await MediaLibrary.getAlbumAsync('Azurea Hotel');
				if (album == null) {
					await MediaLibrary.createAlbumAsync('Azurea Hotel', asset, false);
				} else {
					await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
				}
			} catch (albumError) {
				console.log('Album creation skipped:', albumError);
			}

			// Clean up cache file
			await cacheFile.delete();

			Alert.alert(
				'Success',
				'QR code saved to your gallery successfully!',
				[{ text: 'OK', style: 'default' }]
			);
		} catch (error) {
			console.error('Error downloading QR code:', error);
			Alert.alert(
				'Error',
				'Failed to save QR code. Please try taking a screenshot instead.',
				[{ text: 'OK', style: 'default' }]
			);
		}
	};

	const formatTimeDisplay = (timeString: string) => {
		if (!timeString) return 'Select arrival time';
		return timeString;
	};

	const convertTo24Hour = (time12h: string): string => {
		try {
			const [time, modifier] = time12h.split(' ');
			let [hours, minutes] = time.split(':');

			let hoursNum = parseInt(hours, 10);

			if (modifier === 'PM' && hoursNum !== 12) {
				hoursNum += 12;
			} else if (modifier === 'AM' && hoursNum === 12) {
				hoursNum = 0;
			}

			return `${hoursNum.toString().padStart(2, '0')}:${minutes}`;
		} catch (error) {
			console.error('Error converting time format:', error);
			return time12h;
		}
	};

	const validateCheckInTime = (timeString: string) => {
		if (!timeString) return false;

		try {
			const [time, period] = timeString.split(' ');
			const [hours] = time.split(':').map(Number);

			let hour24 = hours;
			if (period === 'PM' && hours !== 12) {
				hour24 = hours + 12;
			} else if (period === 'AM' && hours === 12) {
				hour24 = 0;
			}

			return hour24 >= 14 && hour24 <= 23;
		} catch {
			return false;
		}
	};

	const onSubmit = (data: FormData) => {
		if (!data.arrivalTime) {
			setAlertConfig({
				visible: true,
				type: 'warning',
				title: 'Arrival Time Required',
				message: 'Please select your expected arrival time',
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		// Validate check-in time is between 2:00 PM and 11:00 PM
		if (!validateCheckInTime(data.arrivalTime)) {
			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Invalid Check-in Time',
				message: 'Check-in time must be between 2:00 PM and 11:00 PM',
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		if (data.paymentMethod === 'gcash' && !gcashFile) {
			setAlertConfig({
				visible: true,
				type: 'warning',
				title: 'Payment Proof Required',
				message: 'Please upload GCash payment proof',
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		// Validate phone number format
		const cleanedValue = data.phoneNumber.replace(/[^\d+]/g, '');
		const phPattern = /^(\+639\d{9}|09\d{9})$/;
		if (!phPattern.test(cleanedValue)) {
			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Invalid Phone Number',
				message:
					'Phone number must be a Philippine number (+639XXXXXXXXX or 09XXXXXXXXX)',
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		// Validate number of guests
		if (roomData?.max_guests && data.numberOfGuests > roomData.max_guests) {
			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Exceeds Capacity',
				message: `Maximum capacity is ${roomData.max_guests} guests`,
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		if (!roomId || !checkInDate || !checkOutDate || !totalPrice) {
			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Error',
				message: 'Missing booking information. Please try again.',
				buttons: [{ text: 'OK', style: 'default' }],
			});
			return;
		}

		setPendingFormData(data);
		setShowConfirmModal(true);
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
		setIsSubmitting(true);

		try {
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

			await booking.createRoomBooking(formData);

			setTimeout(() => {
				setIsSubmitting(false);
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
			}, 1500);

			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
		} catch (error: any) {
			console.error('❌ Booking error:', error);
			setIsSubmitting(false);

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
			<View className="bg-surface-default px-6 py-4 border-b border-border-focus">
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
											const numValue = text === '' ? 0 : parseInt(text.replace(/[^0-9]/g,'')) || 0;
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

						{/* GCash Payment Proof */}
						<View className="mb-4">
							<StyledText className="text-text-primary font-montserrat-bold text-lg mb-3">
								GCash Payment Proof *
							</StyledText>
							
							{/* GCash QR Codes */}
							<View className="mb-4 bg-background-elevated rounded-2xl p-4 border border-border-subtle">
								<View className="flex-row items-center mb-3">
									<Ionicons name="qr-code" size={20} color="#6F00FF" />
									<StyledText className="text-text-primary font-montserrat-bold ml-2">
										Scan to Pay with GCash
									</StyledText>
								</View>
								<StyledText className="text-text-muted font-raleway-regular text-xs mb-3">
									Scan either QR code below to complete your payment. Tap to view larger.
								</StyledText>
								<View className="flex-row justify-around gap-3">
									<TouchableOpacity 
										className="flex-1 items-center bg-background-subtle rounded-xl p-3"
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
											<Ionicons name="expand-outline" size={12} color="#6F00FF" style={{ marginLeft: 4 }} />
										</View>
									</TouchableOpacity>
									<TouchableOpacity 
										className="flex-1 items-center bg-background-subtle rounded-xl p-3"
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
											<Ionicons name="expand-outline" size={12} color="#6F00FF" style={{ marginLeft: 4 }} />
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
				<View className="flex-1 bg-background-overlay justify-center items-center">
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
								className="w-8 h-8 rounded-full bg-background-subtle items-center justify-center"
							>
								<Ionicons name="close" size={20} color="#3B0270" />
							</TouchableOpacity>
						</View>

						{/* QR Code Image */}
						<View className="bg-background-subtle rounded-2xl p-4 mb-4">
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
									<StyledText className="text-feedback-info-dark font-montserrat-bold text-sm mb-1">
										How to Pay
									</StyledText>
									<StyledText className="text-feedback-info-dark font-raleway-regular text-xs">
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
								onPress={handleDownloadQrCode}
								className="flex-1 bg-brand-primary rounded-xl py-3 px-4 flex-row items-center justify-center"
								activeOpacity={0.8}
							>
								<Ionicons name="download-outline" size={20} color="#FFF1F1" />
								<StyledText className="text-text-inverse font-montserrat-bold ml-2">
									Save QR
								</StyledText>
							</TouchableOpacity>
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
		</SafeAreaView>
	);
}
