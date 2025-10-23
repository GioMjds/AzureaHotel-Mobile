import { FC } from 'react';
import { View, Modal, TouchableOpacity, Pressable } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import StyledText from './StyledText';

type AlertType = 'success' | 'error' | 'warning' | 'info';

interface AlertButton {
	text: string;
	onPress?: () => void;
	style?: 'default' | 'cancel' | 'destructive';
}

interface StyledAlertProps {
	visible: boolean;
	type?: AlertType;
	title: string;
	message?: string;
	buttons?: AlertButton[];
	onDismiss?: () => void;
}

const StyledAlert: FC<StyledAlertProps> = ({
	visible,
	type = 'info',
	title,
	message,
	buttons = [{ text: 'OK', style: 'default' }],
	onDismiss,
}) => {
	const getIconConfig = () => {
		switch (type) {
			case 'success':
				return {
					name: 'check-circle' as const,
					color: '#10B981',
					bgColor: 'bg-feedback-success-light',
				};
			case 'error':
				return {
					name: 'times-circle' as const,
					color: '#EF4444',
					bgColor: 'bg-feedback-error-light',
				};
			case 'warning':
				return {
					name: 'exclamation-triangle' as const,
					color: '#F59E0B',
					bgColor: 'bg-feedback-warning-light',
				};
			case 'info':
			default:
				return {
					name: 'info-circle' as const,
					color: '#6F00FF',
					bgColor: 'bg-brand-accent/20',
				};
		}
	};

	const iconConfig = getIconConfig();

	const handleButtonPress = (button: AlertButton) => {
		button.onPress?.();
		onDismiss?.();
	};

	const getButtonStyle = (style?: string) => {
		switch (style) {
			case 'cancel':
				return 'bg-interactive-outline border-2 border-interactive-outline-border';
			case 'destructive':
				return 'bg-feedback-error-DEFAULT';
			default:
				return 'bg-interactive-primary';
		}
	};

	const getButtonTextStyle = (style?: string) => {
		switch (style) {
			case 'cancel':
				return 'text-interactive-outline-foreground';
			case 'destructive':
				return 'text-white';
			default:
				return 'text-interactive-primary-foreground';
		}
	};

	return (
		<Modal
			visible={visible}
			transparent
			animationType="fade"
			onRequestClose={onDismiss}
		>
            <StatusBar backgroundColor='rgba(0, 0, 0, 0.4)' />

			<Pressable
                style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
				className="flex-1 justify-center items-center px-8"
				onPress={onDismiss}
			>
				<Pressable
					className="bg-background-elevated rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden"
					onPress={(e) => e.stopPropagation()}
				>
					{/* Icon Header */}
					<View className={`${iconConfig.bgColor} py-6 items-center`}>
						<View className="bg-white rounded-full p-3 shadow-lg">
							<FontAwesome
								name={iconConfig.name}
								size={48}
								color={iconConfig.color}
							/>
						</View>
					</View>

					{/* Content */}
					<View className="px-6 py-6">
						<StyledText variant='playfair-bold' className="text-text-primary text-4xl text-center mb-3">
							{title}
						</StyledText>

						{message && (
							<StyledText variant='montserrat-regular' className="text-text-secondary text-lg text-center leading-6">
								{message}
							</StyledText>
						)}
					</View>

					{/* Buttons */}
					<View className="px-6 pb-6 gap-3">
						{buttons.map((button, index) => (
							<TouchableOpacity
								key={index}
								onPress={() => handleButtonPress(button)}
								className={`${getButtonStyle(button.style)} py-4 rounded-xl active:opacity-80`}
							>
								<StyledText variant='montserrat-bold' className={`${getButtonTextStyle(button.style)} text-center text-2xl`}>
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

// Static method to mimic React Native's Alert.alert API
export const Alert = {
	alert: (
		title: string,
		message?: string,
		buttons?: AlertButton[],
		options?: { type?: AlertType }
	) => {
		// This is a placeholder - you'll need to integrate this with a state management solution
		// or create a provider to actually show the alert
		console.warn(
			'Use StyledAlert component with state management instead of Alert.alert'
		);
	},
};

export default StyledAlert;
