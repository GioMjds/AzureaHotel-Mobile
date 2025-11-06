import { FC, useEffect } from 'react';
import { View, Modal } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	withSpring,
	withSequence,
	withDelay,
	Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import StyledText from '@/components/ui/StyledText';

interface ConfirmingBookingProps {
	isVisible: boolean;
	message?: string;
}

const ConfirmingBooking: FC<ConfirmingBookingProps> = ({
	isVisible,
	message = 'Please wait while we confirm your reservation details',
}) => {
	// Animation values
	const rotation = useSharedValue(0);
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);
	
	// Progress dots
	const dot1Opacity = useSharedValue(0.3);
	const dot2Opacity = useSharedValue(0.3);
	const dot3Opacity = useSharedValue(0.3);
	
	// Step cards
	const step1Scale = useSharedValue(0.95);
	const step2Scale = useSharedValue(0.95);
	const step3Scale = useSharedValue(0.95);
	
	const step1Opacity = useSharedValue(0.5);
	const step2Opacity = useSharedValue(0.5);
	const step3Opacity = useSharedValue(0.5);

	// Icon pulse
	const iconScale = useSharedValue(1);

	useEffect(() => {
		if (isVisible) {
			// Fade in overlay
			opacity.value = withTiming(1, { duration: 300 });
			scale.value = withSpring(1, {
				damping: 15,
				stiffness: 150,
			});

			// Rotating spinner
			rotation.value = withRepeat(
				withTiming(360, {
					duration: 1500,
					easing: Easing.linear,
				}),
				-1,
				false
			);

			// Pulsing icon
			iconScale.value = withRepeat(
				withSequence(
					withTiming(1.1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
					withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
				),
				-1,
				false
			);

			// Animated progress dots
			dot1Opacity.value = withRepeat(
				withSequence(
					withTiming(1, { duration: 500 }),
					withTiming(0.3, { duration: 500 })
				),
				-1,
				false
			);
			
			dot2Opacity.value = withRepeat(
				withSequence(
					withDelay(200, withTiming(1, { duration: 500 })),
					withTiming(0.3, { duration: 500 })
				),
				-1,
				false
			);
			
			dot3Opacity.value = withRepeat(
				withSequence(
					withDelay(400, withTiming(1, { duration: 500 })),
					withTiming(0.3, { duration: 500 })
				),
				-1,
				false
			);

			// Sequential step highlighting
			const stepDuration = 2000;
			
			// Step 1
			step1Opacity.value = withRepeat(
				withSequence(
					withTiming(1, { duration: 300 }),
					withDelay(stepDuration - 300, withTiming(0.5, { duration: 300 }))
				),
				-1,
				false
			);
			step1Scale.value = withRepeat(
				withSequence(
					withTiming(1, { duration: 300 }),
					withDelay(stepDuration - 300, withTiming(0.95, { duration: 300 }))
				),
				-1,
				false
			);

			// Step 2
			step2Opacity.value = withRepeat(
				withSequence(
					withDelay(stepDuration, withTiming(1, { duration: 300 })),
					withDelay(stepDuration - 300, withTiming(0.5, { duration: 300 }))
				),
				-1,
				false
			);
			step2Scale.value = withRepeat(
				withSequence(
					withDelay(stepDuration, withTiming(1, { duration: 300 })),
					withDelay(stepDuration - 300, withTiming(0.95, { duration: 300 }))
				),
				-1,
				false
			);

			// Step 3
			step3Opacity.value = withRepeat(
				withSequence(
					withDelay(stepDuration * 2, withTiming(1, { duration: 300 })),
					withDelay(stepDuration - 300, withTiming(0.5, { duration: 300 }))
				),
				-1,
				false
			);
			step3Scale.value = withRepeat(
				withSequence(
					withDelay(stepDuration * 2, withTiming(1, { duration: 300 })),
					withDelay(stepDuration - 300, withTiming(0.95, { duration: 300 }))
				),
				-1,
				false
			);
		} else {
			// Reset animations
			opacity.value = 0;
			scale.value = 0.8;
		}
	}, [isVisible]);

	// Animated styles
	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const containerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const spinnerStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	const iconScaleStyle = useAnimatedStyle(() => ({
		transform: [{ scale: iconScale.value }],
	}));

	const dot1Style = useAnimatedStyle(() => ({
		opacity: dot1Opacity.value,
	}));

	const dot2Style = useAnimatedStyle(() => ({
		opacity: dot2Opacity.value,
	}));

	const dot3Style = useAnimatedStyle(() => ({
		opacity: dot3Opacity.value,
	}));

	const step1Style = useAnimatedStyle(() => ({
		opacity: step1Opacity.value,
		transform: [{ scale: step1Scale.value }],
	}));

	const step2Style = useAnimatedStyle(() => ({
		opacity: step2Opacity.value,
		transform: [{ scale: step2Scale.value }],
	}));

	const step3Style = useAnimatedStyle(() => ({
		opacity: step3Opacity.value,
		transform: [{ scale: step3Scale.value }],
	}));

	if (!isVisible) return null;

	return (
		<Modal
			visible={isVisible}
			transparent
			animationType="none"
			statusBarTranslucent
		>
			<Animated.View
				style={overlayStyle}
				className="absolute inset-0 bg-background justify-center items-center"
			>
				<Animated.View style={containerStyle} className="items-center px-6">
					{/* Animated Spinner with Icon */}
					<View className="mb-8 items-center justify-center">
						<Animated.View
							style={spinnerStyle}
							className="w-24 h-24 rounded-full border-4 border-transparent border-t-brand-primary border-r-brand-primary absolute"
						/>
						<Animated.View
							style={iconScaleStyle}
							className="w-20 h-20 rounded-full bg-brand-primary items-center justify-center shadow-lg"
						>
							<Ionicons name="calendar-outline" size={36} color="#FFF1F1" />
						</Animated.View>
					</View>

					{/* Main Heading */}
					<StyledText
						variant="playfair-bold"
						className="text-2xl text-text-primary text-center mb-3"
					>
						Confirming Your Booking
					</StyledText>

					{/* Message */}
					<StyledText
						variant="montserrat-regular"
						className="text-base text-text-secondary text-center mb-8 leading-6 px-4"
					>
						{message}
					</StyledText>

					{/* Animated Progress Dots */}
					<View className="flex-row items-center mb-10 gap-3">
						<Animated.View
							style={dot1Style}
							className="w-3 h-3 rounded-full bg-brand-primary"
						/>
						<Animated.View
							style={dot2Style}
							className="w-3 h-3 rounded-full bg-brand-primary"
						/>
						<Animated.View
							style={dot3Style}
							className="w-3 h-3 rounded-full bg-brand-primary"
						/>
					</View>

					{/* Processing Steps */}
					<View className="w-full max-w-sm gap-4">
						{/* Step 1 */}
						<Animated.View
							style={step1Style}
							className="flex-row items-center bg-background-elevated rounded-2xl p-4 border border-border-subtle shadow-sm"
						>
							<View className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center mr-3">
								<Ionicons name="checkmark-circle" size={20} color="#6F00FF" />
							</View>
							<View className="flex-1">
								<StyledText
									variant="montserrat-bold"
									className="text-sm text-text-primary mb-0.5"
								>
									Verifying Availability
								</StyledText>
								<StyledText
									variant="raleway-regular"
									className="text-xs text-text-muted"
								>
									Checking room status
								</StyledText>
							</View>
						</Animated.View>

						{/* Step 2 */}
						<Animated.View
							style={step2Style}
							className="flex-row items-center bg-background-elevated rounded-2xl p-4 border border-border-subtle shadow-sm"
						>
							<View className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center mr-3">
								<Ionicons name="shield-checkmark" size={20} color="#6F00FF" />
							</View>
							<View className="flex-1">
								<StyledText
									variant="montserrat-bold"
									className="text-sm text-text-primary mb-0.5"
								>
									Securing Reservation
								</StyledText>
								<StyledText
									variant="raleway-regular"
									className="text-xs text-text-muted"
								>
									Processing payment securely
								</StyledText>
							</View>
						</Animated.View>

						{/* Step 3 */}
						<Animated.View
							style={step3Style}
							className="flex-row items-center bg-background-elevated rounded-2xl p-4 border border-border-subtle shadow-sm"
						>
							<View className="w-10 h-10 rounded-full bg-brand-accent items-center justify-center mr-3">
								<Ionicons name="document-text" size={20} color="#6F00FF" />
							</View>
							<View className="flex-1">
								<StyledText
									variant="montserrat-bold"
									className="text-sm text-text-primary mb-0.5"
								>
									Preparing Confirmation
								</StyledText>
								<StyledText
									variant="raleway-regular"
									className="text-xs text-text-muted"
								>
									Generating booking details
								</StyledText>
							</View>
						</Animated.View>
					</View>

					{/* Bottom Info */}
					<View className="mt-12 items-center">
						<View className="flex-row items-center gap-2 mb-3">
							<Ionicons name="time-outline" size={16} color="#6F00FF" />
							<StyledText
								variant="montserrat-regular"
								className="text-xs text-text-muted"
							>
								This usually takes just a few seconds
							</StyledText>
						</View>
						<View className="flex-row items-center gap-2">
							<Ionicons name="lock-closed" size={14} color="#6F00FF" />
							<StyledText
								variant="montserrat-regular"
								className="text-xs text-text-muted"
							>
								Your information is encrypted and secure
							</StyledText>
						</View>
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
};

export default ConfirmingBooking;