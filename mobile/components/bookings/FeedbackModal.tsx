import {
	View,
	TouchableOpacity,
	Modal,
	TextInput,
	ScrollView,
	ActivityIndicator,
	Dimensions,
	Keyboard,
	Pressable
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { UserBooking } from '@/types/Bookings.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { booking } from '@/services/Booking';
import StyledText from '@/components/ui/StyledText';
import StyledAlert from '@/components/ui/StyledAlert';

interface FeedbackModalProps {
	visible: boolean;
	onClose: () => void;
	bookingItem: UserBooking;
}

const { height: screenHeight } = Dimensions.get('window');

const FeedbackModal = ({
	visible,
	onClose,
	bookingItem,
}: FeedbackModalProps) => {
	const [rating, setRating] = useState<number>(0);
	const [comment, setComment] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	const queryClient = useQueryClient();

	useEffect(() => {
		if (!bookingItem) {
			setRating(0);
			setComment('');
			setIsSubmitting(false);
		}
	}, [bookingItem]);

	const { mutate: submitReview } = useMutation({
		mutationFn: async (reviewData: {
			rating: number;
			review_text: string;
		}) => {
			return await booking.leaveBookingFeedback(
				bookingItem.id,
				reviewData
			);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
			showStyledAlert({
				type: 'success',
				title: 'Success',
				message: 'Thank you for your feedback!',
				buttons: [{ text: 'OK', onPress: () => handleClose() }],
			});
		},
		onError: () => {
			showStyledAlert({
				type: 'error',
				title: 'Error',
				message: 'Failed to submit review. Please try again.',
				buttons: [{ text: 'OK' }],
			});
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	const handleSubmit = () => {
		if (rating === 0) {
			showStyledAlert({
				title: 'Rating Required',
				message: 'Please select a rating before submitting.',
				type: 'warning',
			});
			return;
		}

		if (comment.length > 500) {
			showStyledAlert({
				title: 'Comment Too Long',
				message: 'Please keep your review under 500 characters.',
				type: 'warning',
			});
			return;
		}

		setIsSubmitting(true);
		Keyboard.dismiss();
		submitReview({ rating, review_text: comment });
	};

	const [alertState, setAlertState] = useState<{
		visible: boolean;
		type?: 'success' | 'error' | 'warning' | 'info';
		title: string;
		message?: string;
		buttons?: {
			text: string;
			onPress?: () => void;
			style?: 'default' | 'cancel' | 'destructive';
		}[];
	}>({ visible: false, title: '' });

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
		setAlertState({
			visible: true,
			type: opts.type || 'info',
			title: opts.title,
			message: opts.message,
			buttons: opts.buttons || [{ text: 'OK' }],
		});
	};

	const handleClose = () => {
		setRating(0);
		setComment('');
		onClose();
	};

	const getRatingLabel = (stars: number) => {
		const labels = {
			1: 'Poor',
			2: 'Fair',
			3: 'Good',
			4: 'Very Good',
			5: 'Excellent'
		};
		return labels[stars as keyof typeof labels];
	};

	const handleStarPress = (star: number) => {
		if (!isSubmitting) setRating(star);
	};

	const bookingName = bookingItem?.is_venue_booking
		? bookingItem?.area_details?.area_name
		: bookingItem?.room_details?.room_name;

	return (
		<>
			<Modal
				visible={visible}
				animationType="fade"
				transparent={true}
				onRequestClose={handleClose}
			>
				<View
					className="flex-1 justify-end"
					style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
				>
					<View
						className="w-full rounded-3xl overflow-hidden"
						style={{ height: screenHeight * 0.7 }}
					>
						{/* Header */}
						<View 
							className="px-6 py-5 flex-row items-center justify-between"
							style={{ backgroundColor: '#2D3748', borderBottomWidth: 1, borderBottomColor: '#4A5568' }}
						>
							<StyledText
								variant="montserrat-bold"
								className="text-2xl flex-1 text-white"
							>
								Leave Your Feedback
							</StyledText>
							<TouchableOpacity
								onPress={handleClose}
								disabled={isSubmitting}
								className="p-2 -mr-2"
								style={{ opacity: isSubmitting ? 0.5 : 1 }}
							>
								<Ionicons
									name="close"
									size={28}
									color="#FFFFFF"
								/>
							</TouchableOpacity>
						</View>

						<ScrollView
							className="flex-1"
							showsVerticalScrollIndicator={false}
							contentContainerStyle={{ paddingVertical: 24, paddingHorizontal: 24 }}
							style={{ backgroundColor: '#2D3748' }}
						>
							{/* Booking Info */}
							<View 
								className="mb-6 p-4 rounded-2xl"
								style={{ backgroundColor: '#1A202C' }}
							>
								<View className="mb-1">
									<StyledText
										variant="montserrat-regular"
										className="text-sm mb-1"
										style={{ color: '#A0AEC0' }}
									>
										Name: 
									</StyledText>
									<StyledText
										variant="montserrat-bold"
										className="text-lg text-white"
									>
										{bookingName}
									</StyledText>
								</View>
								<View>
									<StyledText
										variant="montserrat-regular"
										className="text-sm mb-1"
										style={{ color: '#A0AEC0' }}
									>
										Stay:
									</StyledText>
									<StyledText
										variant="montserrat-bold"
										className="text-lg text-white"
									>
										{bookingItem?.check_in_date} - {bookingItem?.check_out_date}
									</StyledText>
								</View>
							</View>

							{/* Rating Section */}
							<View className="mb-6">
								<StyledText
									variant="montserrat-regular"
									className="text-xl text-center mb-4"
									style={{ color: '#E2E8F0' }}
								>
									How would you rate your experience?
								</StyledText>

								<View className="flex-row justify-center items-center mb-3" style={{ gap: 8 }}>
									{[1, 2, 3, 4, 5].map((star) => (
										<Pressable
											key={star}
											onPress={() => handleStarPress(star)}
											disabled={isSubmitting}
											style={({ pressed }) => [
												{
													padding: 8,
													opacity: isSubmitting ? 0.5 : 1,
													transform: [{ scale: pressed ? 0.85 : 1 }],
												}
											]}
										>
											<Ionicons
												name={star <= rating ? 'star' : 'star-outline'}
												size={44}
												color={star <= rating ? '#FDB022' : '#4A5568'}
											/>
										</Pressable>
									))}
								</View>

								{rating > 0 && (
									<View className="items-center">
										<StyledText
											variant="playfair-semibold"
											className="text-2xl"
											style={{ color: '#FDB022' }}
										>
											{getRatingLabel(rating)}!
										</StyledText>
									</View>
								)}
							</View>

							{/* Review Text Section */}
							<View className="mb-4">
								<StyledText
									variant="montserrat-bold"
									className="text-base mb-3"
									style={{ color: '#E2E8F0' }}
								>
									Share your experience
								</StyledText>

								<View 
									className="rounded-2xl overflow-hidden"
									style={{ backgroundColor: '#1A202C' }}
								>
									<TextInput
										value={comment}
										onChangeText={setComment}
										placeholder="Tell us about your stay..."
										placeholderTextColor="#718096"
										multiline
										numberOfLines={5}
										maxLength={500}
										textAlignVertical="top"
										editable={!isSubmitting}
										className="p-4 text-base leading-6"
										style={{ 
											textAlign: 'left',
											color: '#E2E8F0',
											fontFamily: 'Montserrat_400Regular'
										}}
									/>
								</View>
							</View>
						</ScrollView>

						{/* Footer Actions */}
						<View 
							className="px-6 py-4 flex-row"
							style={{ 
								backgroundColor: '#1A202C',
								borderTopWidth: 1,
								borderTopColor: '#4A5568',
								gap: 12
							}}
						>
							<TouchableOpacity
								onPress={handleClose}
								disabled={isSubmitting}
								className="flex-1 py-4 rounded-xl"
								style={{ 
									backgroundColor: '#4A5568',
									opacity: isSubmitting ? 0.5 : 1 
								}}
							>
								<StyledText
									variant="montserrat-bold"
									className="text-center text-lg"
									style={{ color: '#E2E8F0' }}
								>
									Cancel
								</StyledText>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleSubmit}
								disabled={
									isSubmitting ||
									rating === 0 ||
									comment.length < 1
								}
								className="flex-1 py-4 rounded-xl"
								style={{ 
									backgroundColor: isSubmitting || rating === 0 || comment.length < 1
										? '#4A5568'
										: '#3B82F6'
								}}
							>
								<View className="flex-row items-center justify-center">
									{isSubmitting ? (
										<>
											<ActivityIndicator
												size="small"
												color="#FFFFFF"
											/>
											<StyledText
												variant="montserrat-bold"
												className="ml-2 text-lg"
												style={{ color: '#FFFFFF' }}
											>
												Submitting...
											</StyledText>
										</>
									) : (
										<>
											<Ionicons
												name="paper-plane"
												size={16}
												color="#FFFFFF"
												style={{ marginRight: 6 }}
											/>
											<StyledText
												variant="montserrat-bold"
												className="text-lg"
												style={{ color: '#FFFFFF' }}
											>
												Submit
											</StyledText>
										</>
									)}
								</View>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</Modal>

			{/* Styled Alert */}
			<StyledAlert
				visible={alertState.visible}
				type={alertState.type}
				title={alertState.title}
				message={alertState.message}
				buttons={alertState.buttons}
				onDismiss={() =>
					setAlertState((s) => ({ ...s, visible: false }))
				}
			/>
		</>
	);
};

export default FeedbackModal;