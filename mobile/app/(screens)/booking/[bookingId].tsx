import { useLocalSearchParams, useRouter } from 'expo-router';
import {
	ActivityIndicator,
	ScrollView,
	TouchableOpacity,
	View,
	RefreshControl,
	Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { booking } from '@/services/Booking';
import { UserBooking } from '@/types/Bookings.types';
import { pesoFormatter, formatDate, formatTime } from '@/utils/formatters';
import { getCloudinaryUrl } from '@/utils/cloudinary';
import { Ionicons } from '@expo/vector-icons';
import CancellationModal from '@/components/ui/CancellationModal';
import StyledAlert from '@/components/ui/StyledAlert';
import useAlertStore from '@/store/AlertStore';
import { guestCancellationReasons } from '@/constants/dropdown-options';
import StyledText from '@/components/ui/StyledText';

export default function BookingDetailsScreen() {
	const [cancellationModal, setCancellationModal] = useState<boolean>(false);
	const { alertConfig, setAlertConfig } = useAlertStore();

	const showStyledAlert = (opts: {
		title: string;
		message?: string;
		type?: 'success' | 'error' | 'warning' | 'info';
		buttons?: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[];
	}) => {
		setAlertConfig({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK', style: 'default' }],
		});
	};

	const { bookingId } = useLocalSearchParams();

	const router = useRouter();
	const queryClient = useQueryClient();

	const { data, isLoading, isError, error, refetch } = useQuery({
		queryKey: ['bookingDetails', bookingId],
		queryFn: () => booking.getBookingDetail(bookingId as string),
		refetchOnMount: false,
		refetchOnWindowFocus: false,
		retry: true,
	});

	const cancelMutation = useMutation({
		mutationFn: ({
			bookingId,
			reason,
		}: {
			bookingId: string;
			reason: string;
		}) => {
			return booking.cancelBooking(bookingId, reason);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['bookingDetails', bookingId],
			});
			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });

			showStyledAlert({
				type: 'success',
				title: 'Cancellation Submitted',
				message:
					'Your cancellation request has been submitted successfully.',
				buttons: [
					{
						text: 'OK',
						onPress: () => router.back(),
					},
				],
			});
		},
		onError: (error) => {
			showStyledAlert({
				type: 'error',
				title: 'Cancellation Failed',
				message:
					error.message ||
					'Failed to cancel booking. Please try again.',
				buttons: [{ text: 'OK' }],
			});
		},
	});

	const bookingData: UserBooking = data?.data;

	const handleCancelBooking = () => {
		if (bookingData?.status === 'pending') {
			setCancellationModal(true);
		} else {
			showStyledAlert({
				title: 'Cancel Booking',
				message: 'Are you sure you want to cancel this booking?',
				type: 'warning',
				buttons: [
					{ text: 'No', style: 'cancel' },
					{
						text: 'Yes',
						style: 'destructive',
						onPress: async () => {
							try {
								await cancelMutation.mutateAsync({
									bookingId: bookingData.id.toString(),
									reason: 'Guest requested cancellation',
								});
							} catch (error) {
								console.error(`Cancellation error: ${error}`);
							}
						},
					},
				],
			});
		}
	};

	const handleConfirmCancellation = async (reason: string) => {
		if (!reason.trim()) {
			showStyledAlert({
				type: 'warning',
				title: 'Cancellation Reason Required',
				message: 'Please provide a reason for cancellation.',
				buttons: [{ text: 'OK' }],
			});
			return;
		}

		try {
			await cancelMutation.mutateAsync({
				bookingId: bookingData.id.toString(),
				reason: reason.trim(),
			});
			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
		} catch (error) {
			console.error(`Cancellation error: ${error}`);
		}
	};

	const calculateNights = () => {
		if (!bookingData?.check_in_date || !bookingData?.check_out_date)
			return 0;
		const checkIn = new Date(bookingData.check_in_date);
		const checkOut = new Date(bookingData.check_out_date);
		const diffTime = Math.abs(checkOut.getTime() - checkIn.getTime());
		return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
	};

	// Status badge configuration
	const getStatusConfig = (status: string) => {
		const config = {
			pending: {
				color: 'bg-feedback-warning-light',
				text: 'text-feedback-warning-dark',
				label: 'Pending',
			},
			reserved: {
				color: 'bg-feedback-info-light',
				text: 'text-feedback-info-dark',
				label: 'Reserved',
			},
			confirmed: {
				color: 'bg-feedback-success-light',
				text: 'text-feedback-success-dark',
				label: 'Confirmed',
			},
			cancelled: {
				color: 'bg-feedback-error-light',
				text: 'text-feedback-error-dark',
				label: 'Cancelled',
			},
			rejected: {
				color: 'bg-feedback-error-light',
				text: 'text-feedback-error-dark',
				label: 'Rejected',
			},
			checked_in: {
				color: 'bg-feedback-success-dark',
				text: 'text-feedback-success-light',
				label: 'Checked In',
			},
			checked_out: {
				color: 'bg-feedback-info-light',
				text: 'text-feedback-info-dark',
				label: 'Checked Out',
			},
			no_show: {
				color: 'bg-feedback-info-dark',
				text: 'text-feedback-info-light',
				label: 'No Show',
			},
		};
		return config[status as keyof typeof config] || config.pending;
	};

	if (isLoading) {
		return (
			<View className="flex-1 bg-background-default justify-center items-center">
				<ActivityIndicator size="large" color="#6F00FF" />
				<StyledText
					variant="montserrat-bold"
					className="text-brand-primary text-base mt-4"
				>
					Loading booking details...
				</StyledText>
			</View>
		);
	}

	if (isError) {
		return (
			<View className="flex-1 bg-background-default justify-center items-center px-6">
				<View className="items-center">
					<View className="bg-feedback-error-light rounded-full p-4 mb-4">
						<Ionicons
							name="alert-circle"
							size={48}
							color="#EF4444"
						/>
					</View>
					<StyledText
						variant="playfair-bold"
						className="text-feedback-error-DEFAULT text-2xl text-center mb-2"
					>
						Error Loading Details
					</StyledText>
					<StyledText
						variant="montserrat-regular"
						className="text-text-muted text-center mb-6 px-4"
					>
						{error?.message ||
							'Unable to load booking information. Please try again.'}
					</StyledText>
					<TouchableOpacity
						className="bg-interactive-primary-DEFAULT active:bg-interactive-primary-pressed px-8 py-4 rounded-xl"
						onPress={() => refetch()}
					>
						<StyledText
							variant="montserrat-bold"
							className="text-interactive-primary-foreground text-base"
						>
							Try Again
						</StyledText>
					</TouchableOpacity>
				</View>
			</View>
		);
	}

	if (!bookingData) {
		return (
			<View className="flex-1 bg-background-default justify-center items-center px-6">
				<View className="items-center">
					<View className="bg-background-subtle rounded-full p-4 mb-4">
						<Ionicons
							name="document-text-outline"
							size={48}
							color="#3B0270"
						/>
					</View>
					<StyledText
						variant="playfair-bold"
						className="text-text-primary text-2xl text-center mb-2"
					>
						Booking Not Found
					</StyledText>
					<StyledText
						variant="montserrat-regular"
						className="text-text-muted text-center"
					>
						The booking you&apos;re looking for doesn&apos;t exist.
					</StyledText>
				</View>
			</View>
		);
	}

	const isAreaBooking = bookingData.is_venue_booking;

	const isGcashPayment = bookingData.payment_method.toLowerCase() === 'gcash';

	const propertyName = isAreaBooking
		? bookingData.area_details?.area_name
		: bookingData.room_details?.room_name;

	const propertyImage = isAreaBooking
		? bookingData.area_details?.images?.[0]?.area_image
		: bookingData.room_details?.images?.[0]?.room_image;

	const statusConfig = getStatusConfig(bookingData.status);

	return (
		<View className="flex-1 bg-background-default">
			<ScrollView
				className="flex-1"
				showsVerticalScrollIndicator={false}
				contentContainerStyle={{ paddingBottom: 130 }}
				refreshControl={
					<RefreshControl
						refreshing={false}
						onRefresh={() => refetch()}
						tintColor="#6F00FF"
						colors={['#6F00FF']}
					/>
				}
			>
				{/* Header Section */}
				<View className="bg-background-elevated rounded-b-3xl pb-6 shadow-lg">
					{propertyImage && (
						<View className="relative">
							<Image
								source={{ uri: getCloudinaryUrl(propertyImage) }}
								className="w-full h-64"
								contentFit="cover"
								transition={200}
								placeholder={{ uri: 'https://via.placeholder.com/400x300?text=Loading...' }}
							/>
							<View className="absolute top-4 left-4 flex-row">
								<View className="bg-brand-primary px-4 py-2 rounded-full">
									<StyledText
										variant="montserrat-bold"
										className="text-text-inverse text-xs uppercase tracking-wide"
									>
										{isAreaBooking ? 'Area' : 'Room'}
									</StyledText>
								</View>
							</View>
							<View className="absolute top-4 right-4 flex-row space-x-2">
								<View
									className={`px-4 py-2 rounded-full ${statusConfig.color}`}
								>
									<StyledText
										variant="montserrat-bold"
										className={`text-xs uppercase tracking-wide ${statusConfig.text}`}
									>
										{statusConfig.label}
									</StyledText>
								</View>
							</View>
						</View>
					)}

					<View className="px-6 pt-6">
						<StyledText
							variant="playfair-bold"
							className="text-text-primary text-4xl mb-3"
						>
							{propertyName}
						</StyledText>

						{/* Quick Info Row */}
						<View className="flex-row justify-between items-center bg-background-subtle rounded-2xl p-4">
							<View className="items-center flex-1">
								<StyledText
									variant="montserrat-bold"
									className="text-text-primary text-lg"
								>
									{bookingData.number_of_guests}
								</StyledText>
								<StyledText
									variant="montserrat-regular"
									className="text-text-secondary text-xs"
								>
									Guests
								</StyledText>
							</View>
							<View className="h-8 w-px bg-border-subtle" />
							{!isAreaBooking && (
								<View className="items-center flex-1">
									<StyledText
										variant="montserrat-bold"
										className="text-text-primary text-lg"
									>
										{calculateNights()}
									</StyledText>
									<StyledText
										variant="montserrat-regular"
										className="text-text-secondary text-xs"
									>
										{isAreaBooking ? 'Days' : 'Nights'}
									</StyledText>
								</View>
							)}
							<View className="h-8 w-px bg-border-subtle" />
							<View className="items-center flex-1">
								<StyledText
									variant="montserrat-bold"
									className="text-text-primary text-lg"
								>
									{pesoFormatter.format(
										bookingData.total_price
									)}
								</StyledText>
								<StyledText
									variant="montserrat-regular"
									className="text-text-secondary text-xs"
								>
									Total
								</StyledText>
							</View>
						</View>
					</View>
				</View>

				<View className="px-6 pt-6 space-y-5">
					{/* Main Details Container */}
					<View className="bg-background-elevated rounded-3xl p-6 border border-border-subtle shadow-sm">
						{/* Status Alerts */}
						{(bookingData.status === 'cancelled' ||
							bookingData.status === 'rejected') &&
							bookingData.cancellation_reason && (
								<View
									className={`rounded-2xl mb-6 p-5 border-l-4 ${
										bookingData.status === 'cancelled'
											? 'bg-feedback-error-light border-feedback-error-DEFAULT'
											: 'bg-feedback-error-light border-feedback-error-dark'
									}`}
								>
									<View className="flex-row items-start">
										<Ionicons
											name="alert-circle"
											size={24}
											color={
												bookingData.status ===
												'cancelled'
													? '#EF4444'
													: '#DC2626'
											}
											className="mr-3 mt-1"
										/>
										<View className="flex-1">
											<StyledText
												variant="montserrat-bold"
												className={`text-base mb-2 ${
													bookingData.status ===
													'cancelled'
														? 'text-feedback-error-dark'
														: 'text-feedback-error-dark'
												}`}
											>
												{bookingData.status ===
												'cancelled'
													? 'Booking Cancelled'
													: 'Booking Rejected'}
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-text-primary text-sm leading-relaxed"
											>
												{
													bookingData.cancellation_reason
												}
											</StyledText>
											{bookingData.cancellation_date && (
												<StyledText
													variant="montserrat-regular"
													className="text-text-muted text-xs mt-2"
												>
													{`${bookingData.status === 'cancelled' ? 'Cancelled' : 'Rejected'} on ${formatDate(bookingData.cancellation_date)}`}
												</StyledText>
											)}
										</View>
									</View>
								</View>
							)}

						{bookingData.status === 'pending' && (
							<View className="bg-feedback-warning-light rounded-2xl mb-6 p-5 border-l-4 border-feedback-warning-DEFAULT">
								<View className="flex-row items-start">
									<Ionicons
										name="time"
										size={24}
										color="#F59E0B"
										className="mr-3 mt-1"
									/>
									<View className="flex-1">
										<StyledText
											variant="montserrat-bold"
											className="text-feedback-warning-dark text-base mb-1"
										>
											Awaiting Confirmation
										</StyledText>
										<StyledText
											variant="montserrat-regular"
											className="text-text-primary text-sm leading-relaxed"
										>
											Your booking is being reviewed by
											our team. You&apos;ll receive a
											notification once it&apos;s
											confirmed.
										</StyledText>
									</View>
								</View>
							</View>
						)}

						{/* Dates Section */}
						<View className="mb-8">
							<View className="flex-row items-center mb-6">
								<View className="bg-brand-accent rounded-full p-3 mr-4">
									<Ionicons
										name="calendar"
										size={24}
										color="#3B0270"
									/>
								</View>
								<StyledText
									variant="playfair-bold"
									className="text-text-primary text-2xl"
								>
									{isAreaBooking
										? 'Event Schedule'
										: 'Stay Duration'}
								</StyledText>
							</View>

							<View className="space-y-4">
								<View className="p-2">
									<View className="flex-row items-center mb-2">
										<Ionicons
											name="log-in-outline"
											size={20}
											color="#6F00FF"
										/>
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-base ml-3"
										>
											{isAreaBooking
												? 'Start Date'
												: 'Check-in'}
										</StyledText>
									</View>
									<View className="ml-8">
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-lg mb-1"
										>
											{bookingData.check_in_date
												? formatDate(
														bookingData.check_in_date
													)
												: 'N/A'}
										</StyledText>
										{!isAreaBooking && bookingData.time_of_arrival && (
											<View className="flex-row items-center mt-2">
												<Ionicons
													name="time-outline"
													size={16}
													color="#6F00FF"
												/>
												<StyledText
													variant="montserrat-regular"
													className="text-text-secondary text-sm ml-2"
												>
													Arrival Time: {formatTime(bookingData.time_of_arrival)}
												</StyledText>
											</View>
										)}
									</View>
								</View>

								<View className="p-2">
									<View className="flex-row items-center mb-2">
										<Ionicons
											name="log-out-outline"
											size={20}
											color="#6F00FF"
										/>
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-base ml-3"
										>
											{isAreaBooking
												? 'End Date'
												: 'Check-out'}
										</StyledText>
									</View>
									<View className="ml-8">
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-lg mb-1"
										>
											{bookingData.check_out_date
												? formatDate(
														bookingData.check_out_date
													)
												: 'N/A'}
										</StyledText>
									</View>
								</View>
							</View>
						</View>

						{/* Payment Method Section */}
						<View className="mb-8">
							<View className="flex-row items-center mb-4">
								<View className="bg-brand-accent rounded-full p-3 mr-4">
									<Ionicons
										name="card"
										size={24}
										color="#3B0270"
									/>
								</View>
								<StyledText
									variant="playfair-bold"
									className="text-text-primary text-2xl"
								>
									Payment Method
								</StyledText>
							</View>
							<View className="rounded-2xl p-4">
								<StyledText
									variant="montserrat-bold"
									className="text-text-primary text-lg capitalize mb-2"
								>
									{bookingData.payment_method.replace(
										'_',
										' '
									)}
								</StyledText>
								{bookingData.payment_date && (
									<StyledText
										variant="montserrat-regular"
										className="text-text-muted text-sm"
									>
										Paid on{' '}
										{formatDate(bookingData.payment_date)}
									</StyledText>
								)}

								{/* Show GCash payment proof image when available */}
								{isGcashPayment && bookingData.payment_proof && (
									<View className="mt-4">
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-sm mb-2"
										>
											Payment Proof
										</StyledText>
										<TouchableOpacity>
											<Image
												source={{
													uri: bookingData.payment_proof,
												}}
												className="w-full h-48 rounded-lg"
												contentFit="cover"
												transition={200}
												accessibilityLabel="GCash payment proof"
											/>
										</TouchableOpacity>
									</View>
								)}
							</View>
						</View>

						{/* Contact Information Section */}
						<View className="mb-8">
							<View className="flex-row items-center mb-4">
								<View className="bg-brand-accent rounded-full p-3 mr-4">
									<Ionicons
										name="call"
										size={24}
										color="#3B0270"
									/>
								</View>
								<StyledText
									variant="playfair-bold"
									className="text-text-primary text-2xl"
								>
									Contact Information
								</StyledText>
							</View>
							<View className="rounded-2xl p-4">
								<StyledText
									variant="montserrat-bold"
									className="text-text-primary text-lg mb-2"
								>
									{bookingData.phone_number}
								</StyledText>
							</View>
						</View>

						{/* Booking Timeline Section */}
						<View className="mb-8">
							<View className="flex-row items-center mb-6">
								<View className="bg-brand-accent rounded-full p-3 mr-4">
									<Ionicons
										name="time-outline"
										size={24}
										color="#3B0270"
									/>
								</View>
								<StyledText
									variant="playfair-bold"
									className="text-text-primary text-2xl"
								>
									Booking Timeline
								</StyledText>
							</View>

							<View className="space-y-6">
								<View className="flex-row">
									<View className="mr-4 items-center">
										<View className="bg-brand-primary rounded-full w-4 h-4" />
										{(bookingData.updated_at !==
											bookingData.created_at ||
											bookingData.cancellation_date) && (
											<View
												className="w-0.5 flex-1 bg-border-subtle mt-3"
												style={{ minHeight: 40 }}
											/>
										)}
									</View>
									<View className="flex-1 pb-2">
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-base mb-1"
										>
											Booking Created
										</StyledText>
										<StyledText
											variant="montserrat-regular"
											className="text-text-muted text-sm"
										>
											{formatDate(bookingData.created_at)}
										</StyledText>
									</View>
								</View>

								{bookingData.updated_at !==
									bookingData.created_at && (
									<View className="flex-row">
										<View className="mr-4 items-center">
											<View className="bg-brand-secondary rounded-full w-4 h-4" />
											{bookingData.cancellation_date && (
												<View
													className="w-0.5 flex-1 bg-border-subtle mt-3"
													style={{ minHeight: 40 }}
												/>
											)}
										</View>
										<View className="flex-1 pb-2">
											<StyledText
												variant="montserrat-bold"
												className="text-text-primary text-base mb-1"
											>
												Last Updated
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-text-muted text-sm"
											>
												{formatDate(
													bookingData.updated_at
												)}
											</StyledText>
										</View>
									</View>
								)}

								{bookingData.cancellation_date && (
									<View className="flex-row">
										<View className="mr-4 items-center">
											<View className="bg-feedback-error-DEFAULT rounded-full w-4 h-4" />
										</View>
										<View className="flex-1">
											<StyledText
												variant="montserrat-bold"
												className="text-feedback-error-dark text-base mb-1"
											>
												{bookingData.status ===
												'cancelled'
													? 'Booking Cancelled'
													: 'Booking Rejected'}
											</StyledText>
											<StyledText
												variant="montserrat-regular"
												className="text-text-muted text-sm"
											>
												{formatDate(
													bookingData.cancellation_date
												)}
											</StyledText>
										</View>
									</View>
								)}
							</View>
						</View>

						{/* Pricing Breakdown Section */}
						<View className="mb-8">
							<View className="flex-row items-center mb-6">
								<View className="bg-brand-accent rounded-full p-3 mr-4">
									<Ionicons
										name="receipt"
										size={24}
										color="#3B0270"
									/>
								</View>
								<StyledText
									variant="playfair-bold"
									className="text-text-primary text-2xl"
								>
									Price Breakdown
								</StyledText>
							</View>

							<View className="space-y-4">
								{!isAreaBooking && (
									<View className="flex-row justify-between items-center py-3 border-b border-border-subtle">
										<StyledText
											variant="montserrat-regular"
											className="text-text-secondary text-base"
										>
											{!isAreaBooking &&
												`Room Rate × ${calculateNights()} night${calculateNights() !== 1 ? 's' : ''}`}
										</StyledText>
										<StyledText
											variant="montserrat-bold"
											className="text-text-primary text-base"
										>
											{pesoFormatter.format(
												bookingData.original_price
											)}
										</StyledText>
									</View>
								)}

								{bookingData.discount_percent > 0 && (
									<View className="flex-row justify-between items-center py-3 border-b border-border-subtle">
										<View className="flex-row items-center">
											<Ionicons
												name="pricetag"
												size={18}
												color="#10B981"
											/>
											<StyledText
												variant="montserrat-regular"
												className="text-feedback-success-dark text-base ml-2"
											>
												Discount (
												{bookingData.discount_percent}%)
											</StyledText>
										</View>
										<StyledText
											variant="montserrat-bold"
											className="text-feedback-success-dark text-base"
										>
											-
											{pesoFormatter.format(
												bookingData.original_price -
													(bookingData.discounted_price ||
														bookingData.total_price)
											)}
										</StyledText>
									</View>
								)}

								{/* Down Payment */}
								{bookingData.down_payment && (
									<View className="flex-row justify-between items-center py-3 border-b border-border-subtle">
										<View className="flex-row items-center">
											<Ionicons
												name="wallet"
												size={18}
												color="#3B82F6"
											/>
											<StyledText
												variant="montserrat-regular"
												className="text-feedback-info-dark text-base ml-2"
											>
												Down Payment
											</StyledText>
										</View>
										<StyledText
											variant="montserrat-bold"
											className="text-feedback-info-dark text-base"
										>
											{pesoFormatter.format(
												bookingData.down_payment
											)}
										</StyledText>
									</View>
								)}

								{/* Remaining Balance */}
								{bookingData.total_amount > 0 && (
									<View className="flex-row justify-between items-center py-3 border-b border-border-subtle">
										<View className="flex-row items-center">
											<Ionicons
												name="wallet"
												size={18}
												color="#3B82F6"
											/>
											<StyledText
												variant="montserrat-regular"
												className="text-feedback-info-dark text-base ml-2"
											>
												Remaining Balance
											</StyledText>
										</View>
										<StyledText
											variant="montserrat-bold"
											className="text-feedback-info-dark text-base"
										>
											{pesoFormatter.format(
												bookingData?.total_price -
													bookingData?.down_payment!
											)}
										</StyledText>
									</View>
								)}

								{/* Total Amount to Pay */}
								<View className="pt-4 mt-2 rounded-2xl">
									<View className="flex-row justify-between items-center">
										<StyledText
											variant="montserrat-bold"
											className="text-feedback-info-dark text-3xl"
										>
											Total Amount
										</StyledText>
										<StyledText
											variant="montserrat-bold"
											className="text-brand-primary text-3xl"
										>
											{pesoFormatter.format(
												bookingData.discounted_price ||
													bookingData.total_price
											)}
										</StyledText>
									</View>
								</View>
							</View>
						</View>

						{/* Special Requests Section */}
						{bookingData.special_request && (
							<View className="mb-8">
								<View className="flex-row items-center mb-4">
									<View className="bg-brand-accent rounded-full p-3 mr-4">
										<Ionicons
											name="chatbox-ellipses"
											size={24}
											color="#3B0270"
										/>
									</View>
									<StyledText
										variant="playfair-bold"
										className="text-text-primary text-2xl"
									>
										Special Requests
									</StyledText>
								</View>
								<View className="bg-background-subtle rounded-2xl p-5">
									<StyledText
										variant="montserrat-regular"
										className="text-text-primary text-base leading-relaxed"
									>
										{bookingData.special_request}
									</StyledText>
								</View>
							</View>
						)}

						{/* Action Buttons */}
						<View className="space-y-4 mt-2">
							{(bookingData.status === 'confirmed' ||
								bookingData.status === 'pending') && (
								<TouchableOpacity
									className="bg-feedback-error-DEFAULT active:bg-feedback-error-dark rounded-2xl py-5 flex-row items-center justify-center shadow-lg"
									onPress={handleCancelBooking}
								>
									<Ionicons
										name="close-circle-outline"
										size={24}
										color="white"
									/>
									<StyledText
										variant="montserrat-bold"
										className="text-white text-lg ml-3"
									>
										{bookingData.status === 'pending'
											? 'Request Cancellation'
											: 'Cancel Booking'}
									</StyledText>
								</TouchableOpacity>
							)}
						</View>
					</View>
				</View>
			</ScrollView>

			{/* Alert */}
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

			{/* Cancellation Modal */}
			<CancellationModal
				isOpen={cancellationModal}
				onClose={() => setCancellationModal(false)}
				onConfirm={handleConfirmCancellation}
				title="Request Cancellation"
				description="Your booking is currently pending confirmation. Please provide a reason for your cancellation request."
				reasonLabel="Select Cancellation Reason"
				reasonPlaceholder="Please specify your reason for cancellation..."
				confirmButtonText="Submit"
				reasons={guestCancellationReasons}
				isSubmitting={cancelMutation.isPending}
			/>
		</View>
	);
}
