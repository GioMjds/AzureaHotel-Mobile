import React from 'react';
import StyledText from '@/components/ui/StyledText';
import { useThemedStyles } from '@/hooks/useThemedStyles';
import { Ionicons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { Modal, Pressable, TouchableOpacity, View } from 'react-native';

interface AlertButton {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive';
}

interface AlertProps {
	visible: boolean;
	title?: string;
	message?: string;
	icon?: keyof typeof Ionicons.glyphMap;
	iconColor?: string;
	buttons?: AlertButton[];
	onClose: () => void;
}

const StyledModal = ({
	visible,
	title,
	message,
	icon,
	iconColor = '#7C3AED',
	buttons = [{ text: 'OK', style: 'default' }],
	onClose,
}: AlertProps) => {
	const { colors } = useThemedStyles();

	const handleButtonPress = (button: AlertButton) => {
		if (button.onPress) {
			button.onPress();
		}
		onClose();
	};

	const getButtonBackgroundColor = (style?: string) => {
		switch (style) {
			case 'cancel':
				return colors.neutral || '#E5E7EB';
			case 'destructive':
				return '#ef4444';
			default:
				return '#7C3AED';
		}
	};

	const getButtonTextColor = (style?: string) => {
		switch (style) {
			case 'cancel':
				return colors.text || '#111827';
			case 'destructive':
				return '#fff';
			default:
				return '#fff';
		}
	};

	return (
		<Modal
			transparent
			visible={visible}
			onRequestClose={onClose}
			animationType="fade"
			statusBarTranslucent
		>
			{visible && <StatusBar style="light" />}

			<Pressable
				className="flex-1 justify-center items-center px-6"
				onPress={onClose}
				style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
			>
				<Pressable
					className="rounded-2xl p-6 w-full max-w-md"
					onPress={(e: any) => e.stopPropagation()}
					style={{ backgroundColor: colors.surface }}
				>
					{/* Icon */}
					{icon && (
						<View className="items-center mb-4">
							<View
								className="rounded-full items-center justify-center"
								style={{
									width: 64,
									height: 64,
									backgroundColor: `${iconColor}20`,
								}}
							>
								<Ionicons
									name={icon}
									size={32}
									color={iconColor}
								/>
							</View>
						</View>
					)}

					{/* Title */}
					{title && (
						<StyledText
							variant="playfair-extrabold"
							style={{
								fontSize: 28,
								textAlign: 'center',
								color: colors.text,
							}}
						>
							{title}
						</StyledText>
					)}

					{/* Message */}
					{message && (
						<StyledText
							variant="montserrat-regular"
							style={{
								fontSize: 16,
								textAlign: 'center',
								marginTop: 8,
								color: colors.text,
							}}
						>
							{message}
						</StyledText>
					)}

					{/* Buttons */}
					<View className="mt-6">
						{buttons.map((button, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => handleButtonPress(button)}
								activeOpacity={0.3}
								className="py-3 rounded-xl"
								style={[
									{
										backgroundColor: getButtonBackgroundColor(button.style),
									},
									index > 0 ? { marginTop: 12 } : {},
								]}
							>
								<StyledText
									variant="montserrat-bold"
									style={{
										textAlign: 'center',
										color: getButtonTextColor(button.style),
										fontSize: 20,
									}}
								>
									{button.text}
								</StyledText>
							</TouchableOpacity>
						))}
					</View>
				</Pressable>
			</Pressable>
		</Modal>
	);
};

export default StyledModal;
