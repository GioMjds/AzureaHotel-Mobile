import { useState, useRef, FC } from 'react';
import {
	View,
	Text,
	Modal,
	TouchableOpacity,
	ScrollView,
	Pressable,
	NativeSyntheticEvent,
	NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface TermsModalProps {
	isOpen: boolean;
	onClose: () => void;
	onAgree: () => void;
}

const TermsModal: FC<TermsModalProps> = ({ isOpen, onClose, onAgree }) => {
	const [hasScrolledToBottom, setHasScrolledToBottom] = useState<boolean>(false);
	const [isChecked, setIsChecked] = useState<boolean>(false);
	const scrollViewRef = useRef<ScrollView>(null);

	const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
		const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent;
		const isAtBottom =
			contentOffset.y + layoutMeasurement.height >= contentSize.height - 20;
		
		if (isAtBottom && !hasScrolledToBottom) {
			setHasScrolledToBottom(true);
		}
	};

	const handleAgree = () => {
		if (hasScrolledToBottom && isChecked) {
			onAgree();
			// Reset state for next time
			setHasScrolledToBottom(false);
			setIsChecked(false);
		}
	};

	const handleClose = () => {
		onClose();
		// Reset state when closing
		setHasScrolledToBottom(false);
		setIsChecked(false);
	};

	return (
		<Modal
			visible={isOpen}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
			statusBarTranslucent
		>
			<View 
                className="flex-1 justify-center items-center px-4"
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}
            >
				{/* Backdrop - dismiss on press */}
				<Pressable
					className="absolute inset-0"
					onPress={handleClose}
				/>

				{/* Modal Content */}
				<View className="w-full max-w-md bg-surface-default rounded-3xl shadow-2xl overflow-hidden border-2 border-border-subtle">
					{/* Header */}
					<View className="bg-brand-primary px-6 py-5 flex-row items-center justify-between">
						<Text className="text-2xl font-playfair-bold text-text-inverse flex-1 text-center">
							Terms and Conditions
						</Text>
						<TouchableOpacity
							onPress={handleClose}
							className="absolute right-4 w-10 h-10 rounded-full bg-text-inverse/20 items-center justify-center active:bg-text-inverse/30"
							activeOpacity={0.8}
						>
							<Ionicons name="close" size={24} color="#FFF1F1" />
						</TouchableOpacity>
					</View>

					{/* Scrollable Content */}
					<View className="bg-background-elevated">
						<ScrollView
							ref={scrollViewRef}
							className="px-6 py-4"
							onScroll={handleScroll}
                            style={{ maxHeight: 650 }}
							scrollEventThrottle={16}
							showsVerticalScrollIndicator={true}
						>
							<View className="pb-4">
								{/* Section 1 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									1. Acceptance of Terms
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									By registering an account with Azurea Hotel Management System, you agree to be bound by these Terms and Conditions. If you do not agree to all the terms, you may not access or use our services.
								</Text>

								{/* Section 2 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									2. Account Registration
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									You must provide accurate and complete information when creating an account. You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.
								</Text>

								{/* Section 3 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									3. Privacy Policy
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									Your personal information will be handled in accordance with our Privacy Policy. By using our services, you consent to the collection, use, and sharing of your information as described in the Privacy Policy.
								</Text>

								{/* Section 4 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									4. Booking and Cancellation
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									Room reservations are subject to availability. Cancellation policies vary by room type and rate plan. Please review the specific cancellation policy at the time of booking.
								</Text>

								{/* Section 5 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									5. Payment
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									All payments must be made with valid payment methods. You authorize us to charge the provided payment method for all charges incurred under your account.
								</Text>

								{/* Section 6 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									6. Guest Responsibilities
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									Guests are responsible for any damage to hotel property caused by themselves or their visitors. The hotel reserves the right to charge the guest's account for any such damages.
								</Text>

								{/* Section 7 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									7. Prohibited Activities
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									The following activities are prohibited: unauthorized access to hotel systems, reselling of rooms, any illegal activities, or behavior that disturbs other guests.
								</Text>

								{/* Section 8 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									8. Limitation of Liability
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									Azurea Hotel Management System shall not be liable for any indirect, incidental, special, or consequential damages resulting from the use or inability to use our services.
								</Text>

								{/* Section 9 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									9. Changes to Terms
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									We reserve the right to modify these terms at any time. Continued use of our services after such changes constitutes your acceptance of the new terms.
								</Text>

								{/* Section 10 */}
								<Text className="text-lg font-playfair-semibold text-text-primary mb-2">
									10. Governing Law
								</Text>
								<Text className="text-sm font-montserrat text-text-secondary mb-4 leading-5">
									These terms shall be governed by and construed in accordance with the laws of the jurisdiction where the hotel is located, without regard to its conflict of law provisions.
								</Text>

								{/* Final Notice */}
								<View className="bg-background-subtle rounded-2xl p-4 mt-2 mb-8">
									<Text className="text-center font-raleway text-text-primary leading-5">
										By checking the box below, you acknowledge that you have read, understood, and agree to be bound by these Terms and Conditions.
									</Text>
								</View>
							</View>
						</ScrollView>

						{/* Scroll Indicator */}
						{!hasScrolledToBottom && (
							<View className="bg-feedback-warning-light border-t border-feedback-warning-DEFAULT px-4 py-2">
								<View className="flex-row items-center">
									<Ionicons name="arrow-down-circle" size={20} color="#F59E0B" />
									<Text className="text-xs font-montserrat text-feedback-warning-dark ml-2">
										Please scroll to the bottom to continue
									</Text>
								</View>
							</View>
						)}

						{/* Checkbox Section */}
						<View className="px-6 py-4 border-t border-border-subtle">
							<TouchableOpacity
								onPress={() => hasScrolledToBottom && setIsChecked(!isChecked)}
								className="flex-row items-start"
								activeOpacity={0.7}
								disabled={!hasScrolledToBottom}
							>
								<View
									className={`w-6 h-6 rounded-md border-2 items-center justify-center mr-3 mt-0.5 ${
										isChecked
											? 'bg-brand-primary border-brand-primary'
											: hasScrolledToBottom
											? 'border-border-focus bg-input-background'
											: 'border-border-default bg-surface-disabled'
									}`}
								>
									{isChecked && (
										<Ionicons name="checkmark" size={18} color="#FFF1F1" />
									)}
								</View>
								<Text
									className={`flex-1 text-sm font-montserrat leading-5 ${
										hasScrolledToBottom
											? 'text-text-primary'
											: 'text-text-disabled'
									}`}
								>
									I have read and agree to the Terms and Conditions
									{!hasScrolledToBottom && (
										<Text className="text-feedback-warning-dark font-montserrat-bold">
											{' '}
											(please scroll to bottom)
										</Text>
									)}
								</Text>
							</TouchableOpacity>
						</View>

						{/* Action Buttons */}
						<View className="px-6 pb-6 flex-row space-x-3">
							<TouchableOpacity
								onPress={handleAgree}
								disabled={!hasScrolledToBottom || !isChecked}
								className={`flex-1 rounded-xl py-4 ml-2 ${
									hasScrolledToBottom && isChecked
										? 'bg-interactive-primary active:bg-interactive-primary-pressed'
										: 'bg-surface-disabled border border-border-default'
								}`}
								activeOpacity={0.8}
							>
								<Text
									className={`text-center font-montserrat-bold text-base ${
										hasScrolledToBottom && isChecked
											? 'text-interactive-primary-foreground'
											: 'text-text-disabled'
									}`}
								>
									I Agree
								</Text>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</View>
		</Modal>
	);
};

export default TermsModal;
