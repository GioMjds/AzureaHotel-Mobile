import { useQuery } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
	View,
	Text,
	TouchableOpacity,
	ScrollView,
	ActivityIndicator,
	Image,
	TextInput,
	Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { format, parseISO } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import useAuthStore from '@/store/AuthStore';
import { booking } from '@/services/Booking';
import { usePaymongo } from '@/hooks/usePayMongo';
import { calculateAreaPricing } from '@/utils/pricing';
import ConfirmingBooking from '@/components/ui/ConfirmingBooking';
import { Area } from '@/types/Area.types';
import StyledAlert from '@/components/ui/StyledAlert';
import { queryClient } from '@/lib/queryClient';

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
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [paymentPollingActive, setPaymentPollingActive] = useState<boolean>(false);
	const [showDownPaymentModal, setShowDownPaymentModal] = useState<boolean>(false);
	const [selectedDownPayment, setSelectedDownPayment] = useState<number | null>(null);
	
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
	const { createSourceAndRedirect, startPolling, stopPolling, paymentStatus } = usePaymongo();
	
	// Cleanup polling on unmount
	useEffect(() => {
		return () => {
			stopPolling();
		};
	}, [stopPolling]);
	
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

	const onSubmit = (data: FormData) => {
		if (data.paymentMethod === 'gcash' && !selectedDownPayment) {
			showAlert('warning', 'Down Payment Required', 'Please enter your desired down payment amount for GCash payment', [{ text: 'OK' }]);
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

		handleConfirmBooking(data);
	};

	const handleConfirmBooking = async (data: FormData) => {
		if (!areaId || !startTime || !endTime || !totalPrice) return;

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
				firstName: data.firstName,
				lastName: data.lastName,
				phoneNumber: data.phoneNumber.replace(/\s+/g, ''),
				specialRequests: data.specialRequests,
				areaId: areaId,
				startTime: new Date(startTime).toISOString(),
				endTime: new Date(endTime).toISOString(),
				totalPrice: finalPrice,
				status: 'pending',
				isVenueBooking: true,
				numberOfGuests: data.numberOfGuests,
				paymentMethod: data.paymentMethod,
				// For PayMongo: send guest-selected down payment when GCash is chosen
				downPayment: data.paymentMethod === 'gcash' && selectedDownPayment ? selectedDownPayment : undefined,
			};

			// Create booking first
			const resp: any = await booking.createAreaBooking(reservationData);
			const createdBookingId = resp?.id || resp?.data?.id;

			// If user selected GCash, create PayMongo source and redirect
			if (data.paymentMethod === 'gcash' && createdBookingId && selectedDownPayment) {
				try {
					// Ensure we include redirect URLs (PayMongo requires redirect.success and redirect.failed)
					const baseUrl = (process.env.EXPO_PUBLIC_DJANGO_URL || '').replace(/\/$/, '');
					const successUrl = `${baseUrl}/booking/paymongo/redirect/success?booking_id=${createdBookingId}`;
					const failedUrl = `${baseUrl}/booking/paymongo/redirect/failed?booking_id=${createdBookingId}`;

					const createResult = await createSourceAndRedirect(String(createdBookingId), selectedDownPayment, {
						success_url: successUrl,
						failed_url: failedUrl,
					});
					console.log('PayMongo create source response:', createResult);
					if (createResult.success && createResult.sourceId) {
						// Start polling for payment status
						setPaymentPollingActive(true);
						startPolling(createResult.sourceId, (status) => {
							if (status === 'paid' || status === 'chargeable') {
								setPaymentPollingActive(false);
								queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
								showAlert(
									'success',
									'Payment Confirmed!',
									'Your payment has been confirmed. Your booking is now complete.',
									[{
										text: 'OK',
										onPress: () => {
											hideAlert();
											router.replace('/(screens)');
										}
									}]
								);
							} else if (status === 'failed' || status === 'expired') {
								setPaymentPollingActive(false);
								showAlert(
									'error',
									'Payment Failed',
									'Your payment was not successful. Please try again or contact support.',
									[{ text: 'OK' }]
								);
							}
						});
					}
				} catch (pmErr: any) {
					console.error('PayMongo create source error', pmErr);
					setIsSubmitting(false);
					showAlert('error', 'Payment Error', 'Failed to initiate PayMongo payment. Please try again.', [{ text: 'OK' }]);
				}
			}

			setTimeout(() => {
				setIsSubmitting(false);
				if (data.paymentMethod !== 'gcash') {
					showAlert(
						'success',
						'Booking Submitted',
						'Your area booking has been submitted successfully.',
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
				} else {
					showAlert(
						'info',
						'Payment Processing',
						'Your booking has been created. Please complete the payment in the opened window. We will notify you once payment is confirmed.',
						[
							{
								text: 'OK',
								style: 'default',
								onPress: () => {
									hideAlert();
								},
							},
						]
					);
				}
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
				<Text className="text-text-primary font-montserrat mt-4">
					Loading venue details...
				</Text>
			</View>
		);
	}

	return (
		<SafeAreaView className="flex-1 bg-background">
			{/* Header */}
			<View className="bg-background px-6 py-4 border-b border-border-focus">
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
						<View className="bg-surface-default rounded-2xl shadow-lg mb-6 overflow-hidden border border-border-focus">
							<Image
								source={{ uri: areaData.images?.[0].area_image }}
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
							{areaData?.capacity && (
								<Text className="text-text-muted font-montserrat text-sm mt-1">
									Maximum capacity: {areaData.capacity} guests
								</Text>
							)}
						</View>

						<Controller
							control={control}
							name="paymentMethod"
							render={({ field: { value } }) => (
								<>
									{value === 'gcash' && (
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
								</>
							)}
						/>
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

					{/* Payment Status Indicator */}
					{paymentPollingActive && (
						<View className="bg-feedback-info-light rounded-2xl p-4 mb-4 border border-feedback-info-DEFAULT">
							<View className="flex-row items-center">
								<ActivityIndicator size="small" color="#3B82F6" className="mr-3" />
								<View className="flex-1">
									<Text className="text-feedback-info-DEFAULT font-montserrat-bold text-base mb-1">
										Verifying Payment
									</Text>
									<Text className="text-feedback-info-DEFAULT font-montserrat text-sm">
										Status: {paymentStatus || 'pending'}
									</Text>
									<Text className="text-feedback-info-DEFAULT font-montserrat text-xs mt-1">
										Please wait while we confirm your payment...
									</Text>
								</View>
							</View>
						</View>
					)}

					{/* Submit Button */}
					<TouchableOpacity
						onPress={handleSubmit(onSubmit)}
						disabled={isSubmitting}
						className={`rounded-2xl py-4 px-6 mb-8 ${isSubmitting ? 'bg-neutral-300' : 'bg-violet-primary'}`}
					>
						<Text className="text-center font-montserrat-bold text-lg text-text-inverse">
							Complete Booking
						</Text>
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
								}
							}}
							disabled={!selectedDownPayment || selectedDownPayment <= 0}
							className={`flex-1 rounded-xl py-3 ${
								selectedDownPayment && selectedDownPayment > 0
									? 'bg-interactive-primary'
									: 'bg-neutral-300'
							}`}
						>
							<Text className={`font-montserrat-bold text-center ${
								selectedDownPayment && selectedDownPayment > 0
									? 'text-text-inverse'
									: 'text-text-disabled'
							}`}>
								Confirm
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>			{/* Loading Overlay */}
			<ConfirmingBooking
				isVisible={isSubmitting}
				message="Securing your reservation and processing payment..."
			/>
		</SafeAreaView>
	);
}