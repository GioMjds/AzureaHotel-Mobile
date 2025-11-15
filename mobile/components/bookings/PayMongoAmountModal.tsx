import { FC, useState } from 'react';
import { View, Modal, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import StyledText from '../ui/StyledText';

interface PayMongoAmountModalProps {
	visible: boolean;
	onClose: () => void;
	onConfirm: (amount: number) => void;
	totalAmount: number;
	isProcessing?: boolean;
}

const PayMongoAmountModal: FC<PayMongoAmountModalProps> = ({
	visible,
	onClose,
	onConfirm,
	totalAmount,
	isProcessing = false,
}) => {
	const [amount, setAmount] = useState<string>('');
	const [error, setError] = useState<string>('');

	const handleAmountChange = (text: string) => {
		// Only allow numbers and decimal point
		const cleaned = text.replace(/[^0-9.]/g, '');
		
		// Ensure only one decimal point
		const parts = cleaned.split('.');
		if (parts.length > 2) {
			return;
		}
		
		// Limit to 2 decimal places
		if (parts[1] && parts[1].length > 2) {
			return;
		}
		
		setAmount(cleaned);
		setError('');
	};

	const handleConfirm = () => {
		const numAmount = parseFloat(amount);
		
		// Validation
		if (!amount || isNaN(numAmount)) {
			setError('Please enter a valid amount');
			return;
		}
		
		if (numAmount <= 0) {
			setError('Amount must be greater than zero');
			return;
		}
		
		if (numAmount > totalAmount) {
			setError(`Amount cannot exceed total (₱${totalAmount.toFixed(2)})`);
			return;
		}
		
		// Minimum down payment (e.g., 20% of total)
		const minDownPayment = totalAmount * 0.2;
		if (numAmount < minDownPayment) {
			setError(`Minimum down payment is ₱${minDownPayment.toFixed(2)} (20% of total)`);
			return;
		}
		
		onConfirm(numAmount);
	};

	const handleClose = () => {
		setAmount('');
		setError('');
		onClose();
	};

	const suggestedAmounts = [
		{ label: '20%', value: totalAmount * 0.2 },
		{ label: '50%', value: totalAmount * 0.5 },
		{ label: '100%', value: totalAmount },
	];

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={handleClose}
		>
			<KeyboardAvoidingView 
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				className="flex-1"
			>
				<View 
					className="flex-1 items-center justify-center px-6"
					style={{ backgroundColor: "rgba(0, 0, 0, 0.4)" }}
				>
					<View className="bg-background-elevated rounded-2xl p-6 w-full max-w-md shadow-lg">
						{/* Header */}
						<View className="flex-row items-center justify-between mb-4">
							<StyledText className="font-playfair-bold text-2xl text-text-primary">
								Enter Down Payment
							</StyledText>
							<TouchableOpacity 
								onPress={handleClose}
								disabled={isProcessing}
								className="p-2"
							>
								<Ionicons name="close" size={24} color="#3B0270" />
							</TouchableOpacity>
						</View>

						{/* Total Amount Display */}
						<View className="bg-background-subtle p-4 rounded-xl mb-4">
							<StyledText className="font-raleway text-xs text-text-muted mb-1">
								Total Booking Amount
							</StyledText>
							<StyledText className="font-playfair-semibold text-2xl text-brand-primary">
								₱{totalAmount.toFixed(2)}
							</StyledText>
						</View>

						{/* Amount Input */}
						<View className="mb-4">
							<StyledText className="font-raleway text-sm text-text-primary mb-2">
								Down Payment Amount
							</StyledText>
							<View className="flex-row items-center bg-input-background border-2 border-input-border rounded-xl px-4 py-3">
								<StyledText className="font-montserrat-bold text-lg text-text-primary mr-2">
									₱
								</StyledText>
								<TextInput
									className="flex-1 font-montserrat text-lg text-text-primary"
									placeholder="0.00"
									placeholderTextColor="#E9B3FB"
									keyboardType="decimal-pad"
									value={amount}
									onChangeText={handleAmountChange}
									editable={!isProcessing}
								/>
							</View>
							{error && (
								<StyledText className="font-raleway text-xs text-feedback-error-DEFAULT mt-1">
									{error}
								</StyledText>
							)}
						</View>

						{/* Suggested Amounts */}
						<View className="mb-6">
							<StyledText className="font-raleway text-xs text-text-muted mb-2">
								Quick Select
							</StyledText>
							<View className="flex-row gap-2">
								{suggestedAmounts.map((suggestion, index) => (
									<TouchableOpacity
										key={index}
										onPress={() => setAmount(suggestion.value.toFixed(2))}
										disabled={isProcessing}
										className="flex-1 bg-background-subtle px-3 py-2 rounded-lg border border-border-DEFAULT"
									>
										<StyledText className="font-montserrat text-xs text-text-primary text-center">
											{suggestion.label}
										</StyledText>
										<StyledText className="font-montserrat-bold text-xs text-brand-primary text-center mt-0.5">
											₱{suggestion.value.toFixed(2)}
										</StyledText>
									</TouchableOpacity>
								))}
							</View>
						</View>

						{/* Info */}
						<View className="bg-feedback-info-light p-3 rounded-lg mb-4">
							<View className="flex-row items-start">
								<Ionicons name="information-circle" size={16} color="#3B82F6" className="mr-2 mt-0.5" />
								<StyledText className="flex-1 font-raleway text-xs text-feedback-info-DEFAULT">
									Minimum down payment is 20% of the total amount. The remaining balance will be paid upon check-in.
								</StyledText>
							</View>
						</View>

						{/* Buttons */}
						<View className="flex-row gap-3">
							<TouchableOpacity
								onPress={handleClose}
								disabled={isProcessing}
								className="flex-1 bg-interactive-secondary-DEFAULT px-4 py-3 rounded-xl border border-interactive-outline-border"
							>
								<StyledText className="text-interactive-secondary-foreground font-montserrat-bold text-center">
									Cancel
								</StyledText>
							</TouchableOpacity>
							
							<TouchableOpacity
								onPress={handleConfirm}
								disabled={isProcessing || !amount}
								className={`flex-1 px-4 py-3 rounded-xl border border-interactive-outline-border ${
									isProcessing || !amount
										? 'bg-interactive-primary-DEFAULT opacity-50'
										: 'bg-interactive-primary-DEFAULT'
								}`}
							>
								<StyledText 
									variant='montserrat-bold' 
									className={`text-black text-center ${
										isProcessing || !amount ? 'opacity-50' : ''
									}`}
								>
									{isProcessing ? 'Processing...' : 'Confirm & Pay'}
								</StyledText>
							</TouchableOpacity>
						</View>
					</View>
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
};

export default PayMongoAmountModal;
