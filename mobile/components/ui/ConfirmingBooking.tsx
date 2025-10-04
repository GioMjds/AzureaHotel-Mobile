import React, { useEffect } from 'react';
import { View, Text, Modal } from 'react-native';
import Animated, {
	useSharedValue,
	useAnimatedStyle,
	withRepeat,
	withTiming,
	withSpring,
	withSequence,
	Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';

interface ConfirmingBookingProps {
	isVisible: boolean;
	message?: string;
}

const ConfirmingBooking: React.FC<ConfirmingBookingProps> = ({
	isVisible,
	message = 'Processing your booking...',
}) => {
	const rotation = useSharedValue(0);
	const scale = useSharedValue(0.8);
	const opacity = useSharedValue(0);
	const dotOpacity1 = useSharedValue(0.3);
	const dotOpacity2 = useSharedValue(0.3);
	const dotOpacity3 = useSharedValue(0.3);

	useEffect(() => {
		if (isVisible) {
			// Fade in
			opacity.value = withTiming(1, { duration: 300 });
			scale.value = withSpring(1, {
				damping: 15,
				stiffness: 200,
			});

			// Rotating animation for the outer circle
			rotation.value = withRepeat(
				withTiming(360, {
					duration: 2000,
					easing: Easing.linear,
				}),
				-1,
				false
			);

			// Pulsing dots animation
			dotOpacity1.value = withRepeat(
				withSequence(
					withTiming(1, { duration: 400 }),
					withTiming(0.3, { duration: 400 })
				),
				-1,
				false
			);
			dotOpacity2.value = withRepeat(
				withSequence(
					withTiming(0.3, { duration: 133 }),
					withTiming(1, { duration: 400 }),
					withTiming(0.3, { duration: 400 })
				),
				-1,
				false
			);
			dotOpacity3.value = withRepeat(
				withSequence(
					withTiming(0.3, { duration: 266 }),
					withTiming(1, { duration: 400 }),
					withTiming(0.3, { duration: 400 })
				),
				-1,
				false
			);
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isVisible]);

	const overlayStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
	}));

	const containerStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
		opacity: opacity.value,
	}));

	const rotatingStyle = useAnimatedStyle(() => ({
		transform: [{ rotate: `${rotation.value}deg` }],
	}));

	const dot1Style = useAnimatedStyle(() => ({
		opacity: dotOpacity1.value,
	}));

	const dot2Style = useAnimatedStyle(() => ({
		opacity: dotOpacity2.value,
	}));

	const dot3Style = useAnimatedStyle(() => ({
		opacity: dotOpacity3.value,
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
				className="absolute inset-0 bg-brand-secondary/95 justify-center items-center"
			>
				<Animated.View
					style={containerStyle}
					className="items-center justify-center"
				>
					{/* Rotating outer ring */}
					<Animated.View
						style={rotatingStyle}
						className="absolute w-32 h-32 rounded-full border-4 border-transparent border-t-brand-accent border-r-brand-accent"
					/>

					{/* Inner circle with hotel icon */}
					<View className="w-28 h-28 rounded-full bg-background-elevated/10 items-center justify-center border-2 border-brand-accent/30">
						<View className="w-20 h-20 rounded-full bg-brand-primary items-center justify-center">
							<Ionicons name="business" size={40} color="#FFF1F1" />
						</View>
					</View>

					{/* Hotel Management Icons - Decorative */}
					<View className="absolute w-48 h-48 items-center justify-center">
						<View className="absolute top-0">
							<Ionicons name="bed-outline" size={20} color="#E9B3FB" />
						</View>
						<View className="absolute bottom-0">
							<Ionicons name="key-outline" size={20} color="#E9B3FB" />
						</View>
						<View className="absolute left-0">
							<Ionicons name="calendar-outline" size={20} color="#E9B3FB" />
						</View>
						<View className="absolute right-0">
							<Ionicons name="card-outline" size={20} color="#E9B3FB" />
						</View>
					</View>

					{/* Text Content */}
					<View className="mt-12 items-center px-8">
						<Text className="text-text-inverse font-playfair-bold text-2xl mb-2 text-center">
							Confirming Booking
						</Text>
						<Text className="text-brand-accent font-montserrat text-base text-center mb-4">
							{message}
						</Text>

						{/* Animated dots */}
						<View className="flex-row items-center space-x-2">
							<Animated.View
								style={dot1Style}
								className="w-2 h-2 rounded-full bg-brand-accent"
							/>
							<Animated.View
								style={dot2Style}
								className="w-2 h-2 rounded-full bg-brand-accent"
							/>
							<Animated.View
								style={dot3Style}
								className="w-2 h-2 rounded-full bg-brand-accent"
							/>
						</View>

						{/* Additional info */}
						<View className="mt-6 items-center">
							<View className="flex-row items-center space-x-2 mb-2">
								<Ionicons name="shield-checkmark" size={16} color="#E9B3FB" />
								<Text className="text-brand-accent/80 font-raleway text-xs">
									Secure Payment Processing
								</Text>
							</View>
							<View className="flex-row items-center space-x-2">
								<Ionicons name="time-outline" size={16} color="#E9B3FB" />
								<Text className="text-brand-accent/80 font-raleway text-xs">
									This may take a few moments
								</Text>
							</View>
						</View>
					</View>
				</Animated.View>
			</Animated.View>
		</Modal>
	);
};

export default ConfirmingBooking;
