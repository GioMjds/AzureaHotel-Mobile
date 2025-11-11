import { View } from 'react-native';
import StyledText from './StyledText';
import { Ionicons } from '@expo/vector-icons';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';
import { useNetwork } from '@/components/NetworkProvider';

interface OfflineBannerProps {
	show?: boolean;
}

const OfflineBanner = ({ show }: OfflineBannerProps) => {
	const { isOffline } = useNetwork();
	const shouldShow = show !== undefined ? show : isOffline;

	if (!shouldShow) return null;

	return (
		<Animated.View
			entering={FadeInDown.springify()}
			exiting={FadeOutUp.springify()}
			className="bg-feedback-warning-DEFAULT px-2 py-1 flex-row items-center justify-center border-b border-feedback-warning-light"
		>
			<View className="flex-row items-center justify-center flex-1">
				<Ionicons
					name="cloud-offline-outline"
					size={20}
					color="#92400e"
					className="mr-2"
				/>
				<StyledText
					variant="raleway-regular"
					className="text-sm text-black"
				>
					No internet connection
				</StyledText>
			</View>
		</Animated.View>
	);
};

export default OfflineBanner;
