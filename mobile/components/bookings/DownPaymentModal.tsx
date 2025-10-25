import React, { useMemo, useState } from 'react';
import { Modal, View, Text, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
	visible: boolean;
	totalAmount: number; // in PHP
	initialAmount?: number | null;
	onConfirm: (amountPhp: number) => void;
	onClose: () => void;
};

const percentageOptions = [10, 20, 50, 100] as const;

export default function DownPaymentModal({
	visible,
	totalAmount,
	initialAmount,
	onConfirm,
	onClose,
}: Props) {
	const [input, setInput] = useState<string>(
		initialAmount ? String(initialAmount) : ''
	);
	const [error, setError] = useState<string | null>(null);

	const formattedTotal = useMemo(
		() => (Number(totalAmount) || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }),
		[totalAmount]
	);

	const setPercent = (pct: number) => {
		const val = Math.round((totalAmount * pct) / 100);
		setInput(String(val));
		setError(null);
	};

	const handleConfirm = () => {
		const amt = Number(input);
		if (!amt || isNaN(amt) || amt <= 0) {
			setError('Enter a valid amount greater than 0');
			return;
		}
		if (amt > totalAmount) {
			setError('Down payment cannot exceed total amount');
			return;
		}
		setError(null);
		onConfirm(amt);
	};

	return (
		<Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
			<View className="flex-1 bg-black/50 justify-center items-center p-4">
				<View className="bg-surface-default rounded-3xl p-6 w-full max-w-sm border border-border-focus">
					<View className="flex-row items-center justify-between mb-2">
						<Text className="text-text-primary font-playfair-bold text-2xl">
							Down Payment
						</Text>
						<TouchableOpacity onPress={onClose} accessibilityLabel="Close">
							<Ionicons name="close" size={22} color="#3B0270" />
						</TouchableOpacity>
					</View>

					<Text className="text-text-secondary font-montserrat text-sm mb-4">
						Choose an amount to pay now. The remaining balance can be settled at checkout.
					</Text>

					<Text className="text-text-muted font-montserrat text-xs mb-2">
						Total booking: ₱ {formattedTotal}
					</Text>

					<View className="flex-row gap-2 mb-3">
						{percentageOptions.map((p) => (
							<TouchableOpacity
								key={p}
								className="px-3 py-2 rounded-xl border border-border-focus"
								onPress={() => setPercent(p)}
								accessibilityLabel={`${p}% of total`}
							>
								<Text className="font-montserrat text-text-primary">{p}%</Text>
							</TouchableOpacity>
						))}
					</View>

					<View className="flex-row items-center border border-border-focus rounded-xl p-3">
						<Text className="text-text-primary font-montserrat text-xl mr-2">₱</Text>
						<TextInput
							value={input}
							onChangeText={(t) => {
								// allow numbers and optional decimal
								const sanitized = t.replace(/[^0-9.]/g, '');
								setInput(sanitized);
								if (error) setError(null);
							}}
							keyboardType="decimal-pad"
							placeholder="0.00"
							className="flex-1 font-montserrat text-lg text-text-primary"
						/>
					</View>
					{error && (
						<Text className="text-feedback-error-DEFAULT font-montserrat text-sm mt-2">
							{error}
						</Text>
					)}

					<View className="flex-row gap-3 mt-6">
						<TouchableOpacity
							onPress={onClose}
							className="flex-1 border border-border-focus rounded-xl py-3"
						>
							<Text className="text-text-primary font-montserrat-bold text-center">
								Cancel
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={handleConfirm}
							className="flex-1 bg-interactive-primary rounded-xl py-3"
							accessibilityLabel="Confirm down payment"
						>
							<Text className="text-interactive-primary-foreground font-montserrat-bold text-center">
								Confirm & Pay
							</Text>
						</TouchableOpacity>
					</View>
				</View>
			</View>
		</Modal>
	);
}
