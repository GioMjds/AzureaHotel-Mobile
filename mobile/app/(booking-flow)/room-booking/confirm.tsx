import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Alert,
	Image,
	TextInput,
	Platform,
	Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { format, parseISO, differenceInDays } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import DateTimePicker from '@react-native-community/datetimepicker';
import useAuthStore from '@/store/AuthStore';
import { calculateRoomPricing, formatPrice, getDiscountLabel } from '@/utils/pricing';
import { booking } from '@/services/Booking';
import ConfirmingBooking from '@/components/ui/ConfirmingBooking';
import { Amenities } from '@/types/Amenity.types';
import { Room } from '@/types/Room.types';

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
	const [gcashFile, setGcashFile] = useState<any>(null);
	const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
	const [showTimePicker, setShowTimePicker] = useState<boolean>(false);
	const [showDownPaymentModal, setShowDownPaymentModal] = useState<boolean>(false);
	const [selectedDownPayment, setSelectedDownPayment] = useState<number | null>(null);

	const getDefaultCheckInTime = () => {
		const date = new Date();
		date.setHours(14, 0, 0, 0);
		return date;
	};
	
	const [selectedTime, setSelectedTime] = useState<Date>(getDefaultCheckInTime());

	const { user } = useAuthStore();
	const router = useRouter();

	const { roomId, checkInDate, checkOutDate, totalPrice } = useLocalSearchParams<{
		roomId: string;
		checkInDate: string;
		checkOutDate: string;
		totalPrice: string;
	}>();

	const {
		control,
		handleSubmit,
		formState: { errors },
		watch,
	} = useForm<FormData>({
		mode: 'onSubmit',
		defaultValues: {
			firstName: user?.first_name || '',
			lastName: user?.last_name || '',
			phoneNumber: '',
			numberOfGuests: 1,
			arrivalTime: '',
			specialRequests: '',
			paymentMethod: 'gcash',
		},
	});

	const paymentMethod = watch('paymentMethod');

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
		? (calculateRoomPricing
			? calculateRoomPricing({
				roomData: roomData as any,
				userDetails: user ? { ...user, username: user.email || `user_${user.id}` } : null,
				nights,
			})
		: null)
		: null;

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
		// Check if down payment is required for GCash
		if (data.paymentMethod === 'gcash' && !selectedDownPayment) {
			Alert.alert(
				'Down Payment Required',
				'Please enter your desired down payment amount for GCash payment'
			);
			return;
		}

		if (!data.arrivalTime) {
			Alert.alert(
				'Arrival Time Required',
				'Please select your expected arrival time'
			);
			return;
		}
		
		// Validate check-in time is between 2:00 PM and 11:00 PM
		if (!validateCheckInTime(data.arrivalTime)) {
			Alert.alert(
				'Invalid Check-in Time',
				'Check-in time must be between 2:00 PM and 11:00 PM'
			);
			return;
		}

		if (data.paymentMethod === 'gcash' && !gcashFile) {
			Alert.alert(
				'Payment Proof Required',
				'Please upload GCash payment proof'
			);
			return;
		}

		// Validate phone number format
		const cleanedValue = data.phoneNumber.replace(/[^\d+]/g, '');
		const phPattern = /^(\+639\d{9}|09\d{9})$/;
		if (!phPattern.test(cleanedValue)) {
			Alert.alert(
				'Invalid Phone Number',
				'Phone number must be a Philippine number (+639XXXXXXXXX or 09XXXXXXXXX)'
			);
			return;
		}

		// Validate number of guests
		if (roomData?.max_guests && data.numberOfGuests > roomData.max_guests) {
			Alert.alert(
				'Exceeds Capacity',
				`Maximum capacity is ${roomData.max_guests} guests`
			);
			return;
		}

		if (!roomId || !checkInDate || !checkOutDate || !totalPrice) {
			Alert.alert(
				'Error',
				'Missing booking information. Please try again.'
			);
			return;
		}

		setPendingFormData(data);
		setShowConfirmModal(true);
	};

	const handleConfirmBooking = async () => {
		if (!roomId || !checkInDate || !checkOutDate || !totalPrice || !pendingFormData) {
			return;
		}

		setShowConfirmModal(false);
		setIsSubmitting(true);

		try {
			const formData = new FormData();
			formData.append('firstName', pendingFormData.firstName);
			formData.append('lastName', pendingFormData.lastName);
			formData.append('phoneNumber', pendingFormData.phoneNumber.replace(/\s+/g, ''));
			formData.append('numberOfGuests', pendingFormData.numberOfGuests.toString());
			formData.append('specialRequests', pendingFormData.specialRequests || '');
			formData.append('roomId', roomId!);
			formData.append('checkIn', checkInDate!);
			formData.append('checkOut', checkOutDate!);
			formData.append('totalPrice', totalPrice!);
			formData.append('status', 'pending');
			formData.append('isVenueBooking', 'false');
			formData.append('paymentMethod', pendingFormData.paymentMethod);

			// Add down payment if GCash is selected
			if (pendingFormData.paymentMethod === 'gcash' && selectedDownPayment) {
				formData.append('downPayment', selectedDownPayment.toString());
			}

			if (pendingFormData.arrivalTime) {
				const arrivalTime24h = convertTo24Hour(pendingFormData.arrivalTime);
				formData.append('arrivalTime', arrivalTime24h);
			}

			if (pendingFormData.paymentMethod === 'gcash' && gcashFile) {
				formData.append('paymentProof', gcashFile as any);
			}

			await booking.createRoomBooking(formData);

			setTimeout(() => {
				setIsSubmitting(false);
				Alert.alert(
					'Booking Successful!',
					'Your room booking has been submitted. You will receive a confirmation shortly.',
					[
						{
							text: 'OK',
							onPress: () => router.replace('/(screens)'),
						},
					]
				);
			}, 1500);
		} catch (error: any) {
			console.error('❌ Booking error:', error);
			setIsSubmitting(false);

			const errorMessage = error.response?.data?.error 
				? JSON.stringify(error.response.data.error, null, 2)
				: error.message || 'An unknown error occurred';
			
			Alert.alert(
				'Booking Failed',
				`Error: ${errorMessage}`,
				[{ text: 'OK' }]
			);
		}
	};

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<Text className="text-text-primary font-montserrat mt-4">
					Loading room details...
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-background-default">
			{/* Header */}
			<View className="bg-surface-default px-6 py-4 border-b border-border-focus">
				<View className="flex-row items-center justify-between">
					<TouchableOpacity
						onPress={() => router.back()}
						className="flex-row items-center p-2"
					>
						<Ionicons name="arrow-back" size={24} color="#3B0270" />
					</TouchableOpacity>
					<Text className="text-text-primary font-playfair-semibold text-3xl text-center">
						Confirm Booking
					</Text>
					<View className="w-10" />
				</View>
			</View>

			<ScrollView className="flex-1">
				<View className="p-6">
					{/* Room Info Card */}
					{roomData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-focus">
							<Image
								source={{ uri: roomData.images?.[0].room_image }}
								className="w-full h-48"
								resizeMode="cover"
							/>
							<View className="p-4">
								<Text className="text-text-primary font-playfair-bold text-4xl mb-3">
									{roomData.room_name}
								</Text>
								<View className="flex-row items-center mb-2">
									<Ionicons
										name="people-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										Max Guests: {roomData.max_guests}
									</Text>
								</View>
								<View className="flex-row items-center mb-3">
									<Ionicons
										name="moon-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										{nights} {nights === 1 ? 'Night' : 'Nights'}
									</Text>
								</View>
								
								{/* Amenities */}
								{roomData.amenities && roomData.amenities.length > 0 && (
									<View className="mt-2">
										<Text className="text-text-primary font-montserrat-bold text-sm mb-2">
											Amenities:
										</Text>
										<View className="flex-row flex-wrap gap-2">
											{roomData.amenities.map((amenity: Amenities) => (
												<View
													key={amenity.id}
													className="bg-brand-primary rounded-full px-3 py-1.5 flex-row items-center"
												>
													<Text className="text-text-inverse font-montserrat text-md ml-1">
														{amenity.description}
													</Text>
												</View>
											))}
										</View>
									</View>
								)}
							</View>
						</View>
					)}

					{/* Booking Form */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-focus">
						<Text className="text-text-primary font-playfair-bold text-3xl mb-4">
							Guest Information
						</Text>

						{/* Name Fields */}
						<View className="flex-row space-x-4 mb-4">
							<View className="flex-1 mr-1">
								<Text className="text-text-primary font-montserrat mb-2">
									First Name
								</Text>
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
									<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
										{errors.firstName.message}
									</Text>
								)}
							</View>
							<View className="flex-1 ml-1">
								<Text className="text-text-primary font-montserrat mb-2">
									Last Name
								</Text>
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
									<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
										{errors.lastName.message}
									</Text>
								)}
							</View>
						</View>

						{/* Phone Number */}
						<View className="mb-4">
							<Text className="text-text-primary font-montserrat mb-2">
								Phone Number *
							</Text>
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
								<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.phoneNumber.message}
								</Text>
							)}
						</View>

						{/* Number of Guests */}
						<View className="mb-4">
							<Text className="text-text-primary font-montserrat mb-2">
								Number of Guests *
							</Text>
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
								<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.numberOfGuests.message}
								</Text>
							)}
							{roomData?.max_guests && (
								<Text className="text-text-muted font-montserrat text-sm mt-1">
									Maximum capacity: {roomData.max_guests} guests
								</Text>
							)}
						</View>

						{/* Down Payment for GCash */}
						{paymentMethod === 'gcash' && (
							<View className="mb-4">
								<Text className="text-text-primary font-montserrat mb-2">
									Down Payment (GCash) *
								</Text>
								<TouchableOpacity
									onPress={() => setShowDownPaymentModal(true)}
									className="border border-interactive-primary rounded-xl p-4 bg-interactive-primary-hover/10 flex-row items-center justify-between"
								>
									<View>
										<Text className="text-text-secondary font-montserrat text-sm mb-1">
											Enter your desired down payment amount
										</Text>
										<Text className="text-text-primary font-montserrat-bold text-lg">
											{selectedDownPayment 
												? `₱ ${selectedDownPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
												: 'Tap to set amount'
											}
										</Text>
									</View>
									<Ionicons name="chevron-forward" size={24} color="#6F00FF" />
								</TouchableOpacity>
								<Text className="text-text-muted font-montserrat text-xs mt-2">
									Total booking amount: ₱ {parseFloat(totalPrice || '0').toLocaleString()}
								</Text>
							</View>
						)}

						{/* Arrival Time */}
						<View className="mb-4">
							<Text className="text-text-primary font-montserrat mb-2">
								Expected Arrival Time *
							</Text>
							<Controller
								control={control}
								name="arrivalTime"
								rules={{
									required: 'Arrival time is required',
								}}
								render={({ field: { onChange, value } }) => (
									<>
										<TouchableOpacity
											onPress={() => setShowTimePicker(true)}
											className={`border rounded-xl p-3 flex-row items-center justify-between ${
												errors.arrivalTime
													? 'border-feedback-error-DEFAULT'
													: 'border-border-focus'
											}`}
										>
											<Text className={`font-montserrat ${value ? 'text-text-primary' : 'text-text-muted'}`}>
												{formatTimeDisplay(value)}
											</Text>
											<Ionicons name="time-outline" size={20} color="#6F00FF" />
										</TouchableOpacity>
										{showTimePicker && (
											<DateTimePicker
												value={selectedTime}
												mode="time"
												is24Hour={false}
												display={Platform.OS === 'ios' ? 'spinner' : 'default'}
												onChange={(event, date) => {
													if (Platform.OS === 'android') {
														setShowTimePicker(false);
													}
													if (date) {
														setSelectedTime(date);
														const formattedTime = format(date, 'hh:mm a');
														onChange(formattedTime);
													}
												}}
											/>
										)}
										{Platform.OS === 'ios' && showTimePicker && (
											<TouchableOpacity
												onPress={() => setShowTimePicker(false)}
												className="bg-interactive-primary rounded-xl py-2 px-4 mt-2"
											>
												<Text className="text-interactive-primary-foreground font-montserrat-bold text-center">
													Done
												</Text>
											</TouchableOpacity>
										)}
									</>
								)}
							/>
							{errors.arrivalTime && (
								<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.arrivalTime.message}
								</Text>
							)}
						</View>

						{/* Special Requests */}
						<View className="mb-4">
							<Text className="text-text-primary font-montserrat mb-2">
								Special Requests
							</Text>
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
						<Text className="text-text-primary font-playfair-bold text-3xl mb-4">
							Booking Details
						</Text>

						<View className="space-y-3">
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									Check-in:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									{formattedCheckIn}
								</Text>
							</View>
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									Check-out:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									{formattedCheckOut}
								</Text>
							</View>
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									Duration:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									{nights} {nights === 1 ? 'Night' : 'Nights'}
								</Text>
							</View>
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									No. of Guest(s):
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									{pendingFormData?.numberOfGuests || control._formValues.numberOfGuests}
								</Text>
							</View>
							<View className="flex-row justify-between pt-2 border-t border-border-subtle">
								<Text className="text-text-primary font-montserrat-bold text-xl">
									Total:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-2xl">
									₱{' '}
									{parseFloat(totalPrice || '0').toLocaleString()}
								</Text>
							</View>

							{/* Discount breakdown */}
							{pricingResult && pricingResult.discountType !== 'none' && (
								<View className="mt-3 p-3 bg-brand-primary rounded-lg">
									<Text className="text-text-inverse font-montserrat mb-1">
										{getDiscountLabel(pricingResult.discountType, pricingResult.discountPercent)}
									</Text>
									<Text className="text-text-inverse font-montserrat text-sm">
										Price/night: {formatPrice(pricingResult.finalPrice)} • Original/night: {formatPrice(pricingResult.originalPrice)}
									</Text>
								</View>
							)}
						</View>
					</View>

					{/* Submit Button */}
					<TouchableOpacity
						onPress={handleSubmit(onSubmit)}
						disabled={isSubmitting || (paymentMethod === 'gcash' && (!gcashFile || !selectedDownPayment))}
						className={`rounded-2xl py-4 px-6 mb-8 ${
							(isSubmitting || (paymentMethod === 'gcash' && (!gcashFile || !selectedDownPayment))) 
								? 'bg-neutral-300' 
								: 'bg-violet-primary'
						}`}
					>
						<Text className="text-center font-montserrat-bold text-lg text-text-inverse">
							Complete Booking
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Down Payment Modal */}
			<Modal
				visible={showDownPaymentModal}
				transparent
				animationType="fade"
				onRequestClose={() => setShowDownPaymentModal(false)}
			>
				<View className="flex-1 bg-black/50 justify-center items-center p-4">
					<View className="bg-surface-default rounded-3xl p-6 w-full max-w-sm">
						<Text className="text-text-primary font-playfair-bold text-2xl mb-4">
							Down Payment Amount
						</Text>
						<Text className="text-text-secondary font-montserrat text-sm mb-4">
							Enter your desired down payment for this booking. You&apos;ll pay the remainder at checkout.
						</Text>

						<View className="mb-4">
							<Text className="text-text-muted font-montserrat text-xs mb-2">
								Total Booking Amount: ₱ {parseFloat(totalPrice || '0').toLocaleString()}
							</Text>
							<View className="flex-row items-center border border-border-focus rounded-xl p-3">
								<Text className="text-text-primary font-montserrat text-xl mr-2">₱</Text>
								<TextInput
									keyboardType="decimal-pad"
									placeholder="0.00"
									defaultValue={selectedDownPayment ? selectedDownPayment.toString() : ''}
									onChangeText={(text) => {
										const num = parseFloat(text) || 0;
										setSelectedDownPayment(num > 0 ? num : null);
									}}
									className="flex-1 font-montserrat text-lg text-text-primary"
								/>
							</View>
						</View>

						<View className="flex-row gap-3 mt-6">
							<TouchableOpacity
								onPress={() => setShowDownPaymentModal(false)}
								className="flex-1 border border-border-focus rounded-xl py-3"
							>
								<Text className="text-text-primary font-montserrat-bold text-center">
									Cancel
								</Text>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={() => {
									if (selectedDownPayment && selectedDownPayment > 0) {
										setShowDownPaymentModal(false);
									} else {
										Alert.alert('Invalid Amount', 'Please enter a valid down payment amount.');
									}
								}}
								className="flex-1 bg-interactive-primary rounded-xl py-3"
							>
								<Text className="text-interactive-primary-foreground font-montserrat-bold text-center">
									Confirm
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Loading Overlay */}
			{isSubmitting && (
				<ConfirmingBooking isVisible={true} />
			)}
		</SafeAreaView>
	);
}