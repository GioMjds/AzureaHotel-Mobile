import {
	View,
	TouchableOpacity,
	Modal,
	TextInput,
	ScrollView,
	Alert,
	ActivityIndicator,
	Dimensions,
	Keyboard,
	AccessibilityInfo,
} from 'react-native';
import { useState, useEffect } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { UserBooking } from '@/types/Bookings.types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { booking } from '@/services/Booking';
import StyledText from '@/components/ui/StyledText';
import * as Haptics from 'expo-haptics';

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
		if (visible) {
			AccessibilityInfo.announceForAccessibility('Leave review modal opened');
		}
	}, [visible]);

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
			if (!bookingItem) throw new Error('No booking selected');
			return await booking.leaveBookingFeedback(bookingItem.id, reviewData);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({
				queryKey: ['booking-review', bookingItem.id],
			});
			// Also refresh guest bookings list so the Review button updates in the list
			queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
			// Haptic feedback on success
			try {
				Haptics.selectionAsync();
			} catch {
				// ignore haptics errors if not available
			}
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
		Keyboard.dismiss();
		submitReview({ rating, review_text: comment });
	};

	const handleClose = () => {
		setRating(0);
		setComment('');
		onClose();
	};

	return (
		<Modal
			visible={visible}
			animationType="fade"
			transparent={true}
			onRequestClose={handleClose}
		>
			<View className="flex-1 justify-end" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
				{/* Modal Container - Half Screen Height */}
				<View 
					className="bg-background-elevated rounded-t-3xl border-t border-border-default"
					style={{ height: screenHeight * 0.5 }}
				>
					{/* Header */}
					<View className="border-b border-border-subtle px-6 py-4">
						<View className="flex-row items-center justify-between mb-2">
							<TouchableOpacity
								onPress={handleClose}
								disabled={isSubmitting}
								className="p-2 -ml-2 rounded-full active:bg-background-subtle"
							>
								<Ionicons name="close" size={24} color="#3B0270" />
							</TouchableOpacity>

							<View className="flex-1 items-center">
								<View className="flex-row items-center">
									<Ionicons
										name="star"
										size={20}
										color="#6F00FF"
										style={{ marginRight: 8 }}
									/>
									<StyledText
										variant="playfair-bold"
										className="text-text-primary text-xl"
									>
										Leave Review
									</StyledText>
								</View>
							</View>

							<View className="w-10" />
						</View>
					</View>

					<ScrollView
						className="flex-1 bg-background-default px-6"
						showsVerticalScrollIndicator={false}
						contentContainerStyle={{ paddingVertical: 20 }}
					>
						{/* Rating Section */}
						<View className="mb-6">
							<StyledText
								variant="playfair-bold"
								className="text-text-primary text-lg text-center mb-1"
							>
								How was your experience?
							</StyledText>
							<StyledText
								variant="montserrat-regular"
								className="text-text-muted text-sm text-center mb-6"
							>
								Tap the stars to rate your stay
							</StyledText>

							<View className="flex-row justify-center space-x-3 mb-4">
								{[1, 2, 3, 4, 5].map((star) => (
									<TouchableOpacity
										key={star}
										onPress={() => setRating(star)}
										disabled={isSubmitting}
										className={`p-2 rounded-lg ${
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
											size={24}
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
								<View className="items-center">
									<StyledText
										variant="montserrat-bold"
										className="text-feedback-warning-DEFAULT text-sm"
									>
										{rating} {rating === 1 ? 'star' : 'stars'} selected
									</StyledText>
								</View>
							)}
						</View>

						{/* Review Text Section */}
						<View className="mb-6">
							<StyledText
								variant="playfair-bold"
								className="text-text-primary text-lg mb-2"
							>
								Share your experience
							</StyledText>
							<StyledText
								variant="montserrat-regular"
								className="text-text-primary text-sm mb-4"
							>
								Help other guests by sharing what made your stay special
							</StyledText>

							<View className="bg-background-elevated rounded-xl border border-input-border overflow-hidden">
								<TextInput
									value={comment}
									onChangeText={setComment}
									placeholder="Tell us about your stay - what did you enjoy most? Any suggestions for improvement?"
									placeholderTextColor="#6F00FF50"
									multiline
									numberOfLines={4}
									maxLength={500}
									textAlignVertical="top"
									editable={!isSubmitting}
									className="p-4 text-input-text font-montserrat text-sm min-h-24"
									style={{ textAlign: 'left' }}
								/>
								<View className="border-t border-border-subtle px-4 py-2 bg-background-subtle/30">
									<StyledText
										variant="montserrat-regular"
										className={`text-xs text-right ${
											comment.length > 450
												? 'text-feedback-error-DEFAULT'
												: 'text-text-muted'
										}`}
									>
										{comment.length}/500 characters
									</StyledText>
								</View>
							</View>
						</View>
					</ScrollView>

					{/* Footer Actions */}
					<View className="border-t border-border-subtle p-4 bg-background-elevated">
						<View className="flex-row space-x-3">
							<TouchableOpacity
								onPress={handleClose}
								disabled={isSubmitting}
								className="flex-1 bg-interactive-secondary py-3 rounded-xl border border-interactive-secondary-pressed active:bg-interactive-secondary-hover"
							>
								<StyledText
									variant="montserrat-bold"
									className="text-interactive-secondary-foreground text-center text-sm"
								>
									Cancel
								</StyledText>
							</TouchableOpacity>
							<TouchableOpacity
								onPress={handleSubmit}
								disabled={isSubmitting || rating === 0 || comment.length < 1}
								className={`flex-1 py-3 rounded-xl ${
									isSubmitting || rating === 0 || comment.length < 1
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
											<StyledText
												variant="montserrat-bold"
												className="text-interactive-primary-foreground ml-2 text-sm"
											>
												Submitting...
											</StyledText>
										</>
									) : (
										<>
											<Ionicons
												name="send"
												size={16}
												color="#FFF1F1"
												style={{ marginRight: 6 }}
											/>
											<StyledText
												variant="montserrat-bold"
												className="text-interactive-primary-foreground text-sm"
											>
												Submit Review
											</StyledText>
										</>
									)}
								</View>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default FeedbackModal;