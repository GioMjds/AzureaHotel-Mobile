import { View } from 'react-native';
import StyledText from './StyledText';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
	FadeInDown,
	FadeOutUp,
} from 'react-native-reanimated';
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
			className="bg-feedback-warning-DEFAULT px-4 py-3 flex-row items-center border-b border-feedback-warning-light"
		>
			<Ionicons
				name="cloud-offline"
				size={20}
				color="#78350F"
				style={{ marginRight: 8 }}
			/>
			<StyledText className="font-raleway text-sm text-feedback-warning-dark flex-1">
				No internet connection
			</StyledText>
		</Animated.View>
	);
};

export default OfflineBanner;
