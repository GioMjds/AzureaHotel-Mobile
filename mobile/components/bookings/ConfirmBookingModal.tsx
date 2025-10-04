import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, Modal } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from 'react-native-reanimated';

interface ConfirmBookingModalProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
}

const ConfirmBookingModal: React.FC<ConfirmBookingModalProps> = ({
	isVisible,
	onClose,
	onConfirm,
	title,
	message,
	confirmText = 'Confirm',
	cancelText = 'Cancel',
}) => {
	const opacity = useSharedValue(0);
	const scale = useSharedValue(0.9);

	useEffect(() => {
		if (isVisible) {
			opacity.value = withTiming(1, { duration: 150 });
			scale.value = withSpring(1, {
				damping: 20,
				stiffness: 300,
				mass: 0.5,
			});
		} else {
			opacity.value = withTiming(0, { duration: 100 });
			scale.value = withTiming(0.95, { duration: 100 });
		}
	}, [isVisible, opacity, scale]);

	const overlayAnimatedStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const modalAnimatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	return (
		<Modal
			visible={isVisible}
			transparent
			animationType="none"
			statusBarTranslucent
			onRequestClose={onClose}
		>
			<Animated.View
				style={[overlayAnimatedStyle, { flex: 1 }]}
				className="bg-black/40 justify-center items-center p-6"
			>
				<Animated.View
					style={modalAnimatedStyle}
					className="bg-surface-default rounded-2xl p-6 w-full max-w-sm"
				>
					<Text className="text-text-primary font-playfair-bold text-2xl mb-2">
						{title}
					</Text>
					<Text className="text-text-primary font-montserrat mb-6">
						{message}
					</Text>
					<View className="flex-row space-x-4">
						<TouchableOpacity
							onPress={onClose}
							className="flex-1 border border-border-default rounded-xl py-3 items-center"
						>
							<Text className="text-text-primary font-montserrat-bold">
								{cancelText}
							</Text>
						</TouchableOpacity>
						<TouchableOpacity
							onPress={onConfirm}
							className="flex-1 bg-violet-primary rounded-xl py-3 items-center"
						>
							<Text className="text-text-inverse font-montserrat-bold">
								{confirmText}
							</Text>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
};

export default ConfirmBookingModal;
