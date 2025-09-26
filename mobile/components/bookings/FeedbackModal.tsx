import {
	View,
	Text,
	TouchableOpacity,
	Modal,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { UserBooking } from '@/types/Bookings.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { booking } from '@/services/Booking';

interface FeedbackModalProps {
	visible: boolean;
	onClose: () => void;
	bookingItem: UserBooking;
}

const FeedbackModal = ({
	visible,
	onClose,
	bookingItem,
}: FeedbackModalProps) => {
	const [rating, setRating] = useState<number>(0);
	const [comment, setComment] = useState<string>('');
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
	const [dragOffset, setDragOffset] = useState(0);
	const queryClient = useQueryClient();
	// Remove gestureActive state, not needed with Gesture API

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
			queryClient.invalidateQueries({
				queryKey: ['booking-review', bookingItem.id],
			});
			Alert.alert('Success', 'Thank you for your feedback!');
			handleClose();
		},
		onError: (error) => {
			Alert.alert('Error', 'Failed to submit review. Please try again.');
			console.error('Review submission error:', error);
		},
		onSettled: () => {
			setIsSubmitting(false);
		},
	});

	const handleSubmit = () => {
		if (rating === 0) {
			Alert.alert(
				'Rating Required',
				'Please select a rating before submitting.'
			);
			return;
		}

		if (comment.length > 500) {
			Alert.alert(
				'Comment Too Long',
				'Please keep your review under 500 characters.'
			);
			return;
		}

		setIsSubmitting(true);
		submitReview({ rating, review_text: comment });
	};

	const handleClose = () => {
		setRating(0);
		setComment('');
		onClose();
	};

	// Header swipe-to-close with native modal behavior
	const headerPanGesture = Gesture.Pan()
		.onUpdate((event) => {
			// Track the drag offset for visual feedback
			if (event.translationY >= 0) {
				setDragOffset(event.translationY);
			}
		})
		.onEnd((event) => {
			// Reset drag offset
			setDragOffset(0);

			// Close modal if dragged down far enough
			if (event.translationY > 100) {
				handleClose();
			}
		})
		.enabled(!isSubmitting);

	return (
		<Modal
			visible={visible}
			animationType="slide"
			presentationStyle="pageSheet"
			onRequestClose={handleClose}
		>
			<View
				className="flex-1 bg-background-elevate"
				style={{ transform: [{ translateY: dragOffset }] }}
			>
				{/* Enhanced Header with swipe-to-close */}
				<GestureDetector gesture={headerPanGesture}>
					<View className="border-b border-border-subtle px-6 py-4 shadow-sm bg-background-elevated">
						<View className="flex-row items-center justify-between mb-3">
							<TouchableOpacity
								onPress={handleClose}
								disabled={isSubmitting}
								className="p-2 -ml-2 rounded-full active:bg-background-subtle"
							>
								<Ionicons
									name="close"
									size={24}
									color="#3B0270"
								/>
							</TouchableOpacity>

							<View className="flex-1 items-center">
								<View className="flex-row items-center mb-1">
									<Ionicons
										name="star"
										size={20}
										color="#6F00FF"
										style={{ marginRight: 8 }}
									/>
									<Text className="font-playfair-bold text-xl text-text-primary">
										Leave Review
									</Text>
								</View>
							</View>

							<View className="w-10" />
						</View>

						<View className="bg-background-subtle rounded-xl p-4 border border-border-subtle">
							<Text className="text-text-secondary font-montserrat-bold text-xs uppercase tracking-wide mb-1">
								Your Stay
							</Text>
							<Text className="text-text-primary font-playfair-medium text-lg">
								{bookingItem.is_venue_booking
									? bookingItem.area_details?.area_name
									: bookingItem.room_details?.room_name}
							</Text>
							<Text className="text-text-muted font-montserrat text-sm mt-1">
								Booking #{bookingItem.id} •{' '}
								{bookingItem.is_venue_booking
									? 'Venue'
									: 'Room'}
							</Text>
						</View>
					</View>
				</GestureDetector>

				<ScrollView
					className="flex-1 bg-background-default px-6"
					showsVerticalScrollIndicator={false}
					contentContainerStyle={{ paddingVertical: 24 }}
				>
					{/* Rating Section */}
					<View className="mb-8">
						<Text className="text-2xl font-playfair-bold text-text-primary text-center mb-2">
							How was your experience?
						</Text>
						<Text className="text-text-muted font-montserrat text-center mb-8">
							Tap the stars to rate your stay
						</Text>

						<View className="flex-row justify-center space-x-2 mb-4">
							{[1, 2, 3, 4, 5].map((star) => (
								<TouchableOpacity
									key={star}
									onPress={() => setRating(star)}
									disabled={isSubmitting}
									className={`p-3 rounded-xl shadow-sm ${
										star <= rating
											? 'bg-feedback-warning-light border-2 border-feedback-warning-DEFAULT'
											: 'bg-background-elevated border border-border-default'
									} ${isSubmitting ? 'opacity-50' : 'active:scale-95'}`}
								>
									<Ionicons
										name={
											star <= rating
												? 'star'
												: 'star-outline'
										}
										size={28}
										color={
											star <= rating
												? '#F59E0B'
												: '#E9B3FB'
										}
									/>
								</TouchableOpacity>
							))}
						</View>

						{rating > 0 && (
							<View className="bg-background-elevated rounded-xl p-4 border border-border-subtle">
								<Text className="text-center text-text-primary font-montserrat-bold text-base">
									{rating === 1 &&
										'⭐ Poor - We apologize for the experience'}
									{rating === 2 &&
										"⭐⭐ Fair - There's room for improvement"}
									{rating === 3 &&
										'⭐⭐⭐ Good - A solid experience'}
									{rating === 4 &&
										'⭐⭐⭐⭐ Very Good - Great stay!'}
									{rating === 5 &&
										'⭐⭐⭐⭐⭐ Excellent - Outstanding experience!'}
								</Text>
							</View>
						)}
					</View>

					{/* Review Text Section */}
					<View className="mb-8">
						<Text className="text-lg font-playfair-bold text-text-primary mb-3">
							Share your experience
						</Text>
						<Text className="text-text-muted font-montserrat text-sm mb-6">
							Help other guests by sharing what made your stay
							special
						</Text>

						<View className="bg-background-elevated rounded-xl border border-input-border overflow-hidden">
							<TextInput
								value={comment}
								onChangeText={setComment}
								placeholder="Tell us about your stay - what did you enjoy most? Any suggestions for improvement?"
								placeholderTextColor="#6F00FF50"
								multiline
								numberOfLines={6}
								maxLength={500}
								textAlignVertical="top"
								editable={!isSubmitting}
								className="p-6 text-input-text font-montserrat text-base min-h-32"
								style={{ textAlign: 'left' }}
							/>
							<View className="border-t border-border-subtle px-6 py-3 bg-background-subtle/50">
								<Text
									className={`text-xs font-montserrat text-right ${
										comment.length > 450
											? 'text-feedback-error-DEFAULT'
											: 'text-text-muted'
									}`}
								>
									{comment.length}/500 characters
								</Text>
							</View>
						</View>
					</View>
				</ScrollView>

				{/* Enhanced Footer Actions */}
				<View className="bg-background-elevated border-t border-border-subtle px-6 py-6 shadow-sm">
					<View className="flex-row space-x-4 mb-4">
						<TouchableOpacity
							onPress={handleClose}
							disabled={isSubmitting}
							className="flex-1 bg-interactive-secondary py-4 rounded-xl border border-interactive-secondary-pressed active:bg-interactive-secondary-hover"
						>
							<Text className="text-interactive-secondary-foreground font-montserrat-bold text-center text-base">
								Cancel
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleSubmit}
							disabled={isSubmitting || rating === 0}
							className={`flex-1 py-4 rounded-xl shadow-sm ${
								isSubmitting || rating === 0
									? 'bg-interactive-primary-disabled'
									: 'bg-interactive-primary active:bg-interactive-primary-pressed'
							}`}
						>
							<View className="flex-row items-center justify-center">
								{isSubmitting ? (
									<>
										<ActivityIndicator
											size="small"
											color="#FFF1F1"
										/>
										<Text className="text-interactive-primary-foreground font-montserrat-bold ml-2 text-base">
											Submitting...
										</Text>
									</>
								) : (
									<>
										<Ionicons
											name="send"
											size={18}
											color="#FFF1F1"
											style={{ marginRight: 8 }}
										/>
										<Text className="text-interactive-primary-foreground font-montserrat-bold text-base">
											Submit Review
										</Text>
									</>
								)}
							</View>
						</TouchableOpacity>
					</View>

					<View className="flex-row items-center justify-center">
						<Ionicons
							name="star"
							size={14}
							color="#6F00FF"
							style={{ marginRight: 4 }}
						/>
						<Text className="text-text-muted font-montserrat text-xs text-center">
							Rating is required • Review text is optional
						</Text>
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default FeedbackModal;
