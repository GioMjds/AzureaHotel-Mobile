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

interface FormData {
	firstName: string;
	lastName: string;
	phoneNumber: string;
	numberOfGuests: number;
	specialRequests: string;
	paymentMethod: 'gcash' | 'physical';
}

export default function ConfirmAreaBookingScreen() {
    const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
    const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
    const [gcashProof, setGcashProof] = useState<string | null>(null);
    const [gcashFile, setGcashFile] = useState<any>(null);
    const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
	
    const { user } = useAuthStore();
	const router = useRouter();
	
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

	const areaData = areaResponse?.data;

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
	const formattedEndTime = formatDateTime(endTime);

	const handlePickImage = async () => {
		const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
		
		if (status !== 'granted') {
			Alert.alert(
				'Permission Required',
				'Sorry, we need camera roll permissions to upload payment proof.'
			);
			return;
		}

		// Pick image
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

	const onSubmit = (data: FormData) => {
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
		if (areaData?.capacity && data.numberOfGuests > areaData.capacity) {
			Alert.alert(
				'Exceeds Capacity',
				`Maximum capacity is ${areaData.capacity} guests`
			);
			return;
		}

		if (!areaId || !startTime || !endTime || !totalPrice) {
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

			console.log('Sending reservation data:', {
				...reservationData,
				paymentProof: gcashFile ? 'File attached' : 'No file'
			});

			await booking.createAreaBooking(reservationData);
			
			// Keep the loading screen visible for a moment before navigating
			setTimeout(() => {
				setIsSubmitting(false);
				Alert.alert(
					'Booking Successful!',
					'Your venue booking has been submitted. You will receive a confirmation shortly.',
					[
						{
							text: 'OK',
							onPress: () => router.replace('/(screens)'),
						},
					]
				);
			}, 1500);
		} catch (error: any) {
			console.error('Booking error:', error);
			console.error('Error response:', error.response);
			console.error('Error response data:', error.response?.data);
			setIsSubmitting(false);
			
			// Extract error message from response
			let errorMessage = 'Failed to create booking. Please try again.';
			
			if (error.response?.data) {
				const errorData = error.response.data;
				console.log('Error data type:', typeof errorData);
				console.log('Error data:', JSON.stringify(errorData, null, 2));
				
				// Handle error object with nested errors
				if (errorData.error) {
					if (typeof errorData.error === 'string') {
						errorMessage = errorData.error;
					} else if (typeof errorData.error === 'object') {
						// Convert error object to readable message
						const errorMessages = Object.entries(errorData.error)
							.map(([key, value]) => {
								if (Array.isArray(value)) {
									return `${key}: ${value.join(', ')}`;
								}
								return `${key}: ${value}`;
							})
							.join('\n');
						errorMessage = errorMessages || errorMessage;
					}
				} else if (errorData.message) {
					errorMessage = errorData.message;
				} else if (typeof errorData === 'string') {
					errorMessage = errorData;
				}
			} else if (error.message) {
				errorMessage = error.message;
			}
			
			Alert.alert(
				'Booking Failed',
				errorMessage
			);
		}
	};

	if (isLoading) {
		return (
			<View className="flex-1 justify-center items-center bg-background-default">
				<ActivityIndicator size="large" color="#6F00FF" />
				<Text className="text-text-primary font-montserrat mt-4">
					Loading venue details...
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-background-default">
			{/* Header */}
			<View className="bg-surface-default px-6 py-4 border-b border-border-default">
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
					{/* Area Info Card */}
					{areaData && (
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-default">
							<Image
								source={{
									uri:
										Array.isArray(areaData.images) &&
										areaData.images.length > 0
											? areaData.images[0].area_image
											: 'https://via.placeholder.com/300x200?text=Venue+Image',
								}}
								className="w-full h-48"
								resizeMode="cover"
							/>
							<View className="p-4">
								<Text className="text-text-primary font-playfair-semibold text-4xl mb-3">
									{areaData.area_name}
								</Text>
								<View className="flex-row items-center mb-2">
									<Ionicons
										name="people-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										Capacity: {areaData.capacity} pax
									</Text>
								</View>
								<View className="flex-row items-center">
									<Ionicons
										name="time-outline"
										size={16}
										color="#6F00FF"
									/>
									<Text className="text-text-primary font-montserrat ml-2">
										9 hours (8:00 AM - 5:00 PM)
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Booking Form */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-default">
						<Text className="text-text-primary font-playfair-bold text-3xl mb-4">
							Guest Information
						</Text>

						{/* Name Fields */}
						<View className="flex-row space-x-4 mb-4">
							<View className="flex-1">
								<Text className="text-text-primary font-montserrat mb-2">
									First Name *
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
											className={`border rounded-xl p-3 font-montserrat ${
												errors.firstName
													? 'border-feedback-error-DEFAULT'
													: 'border-border-default'
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
							<View className="flex-1">
								<Text className="text-text-primary font-montserrat mb-2">
									Last Name *
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
											className={`border rounded-xl p-3 font-montserrat ${
												errors.lastName
													? 'border-feedback-error-DEFAULT'
													: 'border-border-default'
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
												: 'border-border-default'
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
                                                : 'border-border-default'
                                        }`}
                                    />
                                )}
                            />
							{errors.numberOfGuests && (
								<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-1">
									{errors.numberOfGuests.message}
								</Text>
							)}
							{areaData?.capacity && (
								<Text className="text-text-muted font-montserrat text-sm mt-1">
									Maximum capacity: {areaData.capacity} guests
								</Text>
							)}
						</View>

						{/* GCash Payment Proof */}
						<View className="mb-4">
							<Text className="text-text-primary font-montserrat mb-2">
								GCash Payment Proof *
							</Text>
							<TouchableOpacity
								onPress={handlePickImage}
								className="border border-border-default rounded-xl p-4 items-center"
							>
								<Ionicons
									name="cloud-upload-outline"
									size={24}
									color="#6F00FF"
								/>
								<Text className="text-text-secondary font-montserrat mt-2">
									{gcashProof
										? 'Payment Proof Uploaded'
										: 'Upload Payment Proof'}
								</Text>
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
										className="border border-border-default rounded-xl p-3 font-montserrat"
										placeholder="Any special requirements or notes for your stay..."
									/>
								)}
							/>
						</View>
					</View>

                    {/* Booking Details */}
					<View className="bg-surface-default rounded-2xl p-4 mb-6 border border-border-default">
						<Text className="text-text-primary font-playfair-bold text-3xl mb-4">
							Booking Details
						</Text>

						<View className="space-y-3">
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									Date:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									{formattedStartTime}
								</Text>
							</View>
							<View className="flex-row justify-between">
								<Text className="text-text-primary font-montserrat text-lg">
									Time:
								</Text>
								<Text className="text-text-secondary font-montserrat-bold text-lg">
									8:00 AM - 5:00 PM
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
						<Text className="text-center font-montserrat-bold text-lg text-text-inverse">
							Complete Booking
						</Text>
					</TouchableOpacity>
				</View>
			</ScrollView>

			{/* Confirmation Modal */}
			<ConfirmBookingModal
				isVisible={showConfirmModal}
				onClose={() => setShowConfirmModal(false)}
				onConfirm={handleConfirmBooking}
				title="Confirm Your Booking"
				message={`You're about to book ${areaData?.area_name} for ${formattedStartTime} to ${formattedEndTime}. The total price is ₱${parseFloat(totalPrice || '0').toLocaleString()}. Would you like to proceed?`}
				confirmText="Confirm"
				cancelText="Cancel"
			/>

			{/* Loading Overlay */}
			<ConfirmingBooking
				isVisible={isSubmitting}
				message="Securing your reservation and processing payment..."
			/>
		</SafeAreaView>
	);
}
