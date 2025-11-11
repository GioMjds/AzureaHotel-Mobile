import { View, TouchableOpacity, Platform } from 'react-native';
import StyledText from './StyledText';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
	FadeIn,
	FadeOut,
	SlideInUp,
	SlideOutUp,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';

interface OfflineSuspenseProps {
	isOffline: boolean;
	onRetry?: () => void;
}

const OfflineSuspense = ({ isOffline, onRetry }: OfflineSuspenseProps) => {
	if (!isOffline) return null;

	return (
		<Animated.View
			entering={FadeIn.duration(300)}
			exiting={FadeOut.duration(300)}
			className="absolute inset-0 z-50"
		>
			{/* Overlay */}
			<View className="absolute inset-0 bg-background-overlay" />

			{/* Content */}
			<View className="flex-1 items-center justify-center px-6">
				<Animated.View
					entering={SlideInUp.delay(200).springify()}
					exiting={SlideOutUp.springify()}
					className="items-center"
				>
					{/* Icon Container */}
					<View className="mb-8 items-center justify-center w-32 h-32 rounded-full bg-background-elevated">
						<LinearGradient
							colors={['#6F00FF', '#3B0270']}
							start={{ x: 0, y: 0 }}
							end={{ x: 1, y: 1 }}
							className="absolute inset-0 rounded-full opacity-10"
						/>
						<Ionicons
							name="cloud-offline-outline"
							size={64}
							color="#6F00FF"
						/>
					</View>

					{/* Title */}
					<StyledText className="font-playfair-bold text-3xl text-text-primary text-center mb-3">
						No Internet Connection
					</StyledText>

					{/* Description */}
					<StyledText className="font-montserrat text-base text-text-secondary text-center mb-8 max-w-sm">
						It looks like you're offline. Please check your internet
						connection and try again.
					</StyledText>

					{/* Retry Button */}
					{onRetry && (
						<TouchableOpacity
							onPress={onRetry}
							className="bg-interactive-primary-DEFAULT px-8 py-4 rounded-xl flex-row items-center active:bg-interactive-primary-pressed"
							activeOpacity={0.8}
						>
							<Ionicons
								name="refresh"
								size={20}
								color="#FFF1F1"
								style={{ marginRight: 8 }}
							/>
							<StyledText className="text-interactive-primary-foreground font-montserrat-bold text-base">
								Try Again
							</StyledText>
						</TouchableOpacity>
					)}

					{/* Tips */}
					<View className="mt-8 bg-background-elevated rounded-xl p-4 max-w-sm">
						<StyledText className="font-raleway-bold text-sm text-text-primary mb-2">
							Tips:
						</StyledText>
						<View className="space-y-2">
							<View className="flex-row items-start">
								<StyledText className="text-text-secondary mr-2">•</StyledText>
								<StyledText className="font-raleway text-sm text-text-secondary flex-1">
									Check if {Platform.OS === 'ios' ? 'Wi-Fi or Cellular Data' : 'Wi-Fi or Mobile Data'} is enabled
								</StyledText>
							</View>
							<View className="flex-row items-start">
								<StyledText className="text-text-secondary mr-2">•</StyledText>
								<StyledText className="font-raleway text-sm text-text-secondary flex-1">
									Try turning Airplane Mode off
								</StyledText>
							</View>
							<View className="flex-row items-start">
								<StyledText className="text-text-secondary mr-2">•</StyledText>
								<StyledText className="font-raleway text-sm text-text-secondary flex-1">
									Move to an area with better signal
								</StyledText>
							</View>
						</View>
					</View>
				</Animated.View>
			</View>
		</Animated.View>
	);
};

export default OfflineSuspense;
