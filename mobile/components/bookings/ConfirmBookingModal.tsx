import { FC, useEffect } from 'react';
import { View, TouchableOpacity, Modal } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withSpring,
	withTiming,
} from 'react-native-reanimated';
import StyledText from '../ui/StyledText';

interface ConfirmBookingModalProps {
	isVisible: boolean;
	onClose: () => void;
	onConfirm: () => void;
	title: string;
	message: string;
	confirmText?: string;
	cancelText?: string;
}

const ConfirmBookingModal: FC<ConfirmBookingModalProps> = ({
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
				style={[
					overlayAnimatedStyle,
					{ flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.4)' },
				]}
				className="justify-center items-center p-6"
			>
				<Animated.View
					style={modalAnimatedStyle}
					className="bg-surface-default rounded-2xl p-6 w-full max-w-md"
				>
					<StyledText
						variant="playfair-bold"
						className="text-text-primary text-center text-4xl mb-2"
					>
						{title}
					</StyledText>
					<StyledText
						variant="montserrat-regular"
						className="text-text-primary text-center text-lg mb-4"
					>
						{message}
					</StyledText>
					<View className="flex-row py-1">
						<TouchableOpacity
							onPress={onClose}
							className="flex-1 border border-black my-4 rounded-xl py-4 items-center justify-center"
						>
							<StyledText
								variant="montserrat-bold"
								className="text-text-primary text-2xl"
							>
								{cancelText}
							</StyledText>
						</TouchableOpacity>
					</View>
					<View className="flex-row py-1">
						<TouchableOpacity
							onPress={onConfirm}
							className="flex-1 bg-violet-primary rounded-xl my-4 py-4 items-center justify-center"
						>
							<StyledText
								variant="montserrat-bold"
								className="text-text-inverse text-2xl"
							>
								{confirmText}
							</StyledText>
						</TouchableOpacity>
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
};

export default ConfirmBookingModal;
