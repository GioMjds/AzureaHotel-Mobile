import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import StyledText from '@/components/ui/StyledText';
import useAlertStore from '@/store/AlertStore';

export default function PaymentFailedScreen() {
	const router = useRouter();
	const { setAlertConfig } = useAlertStore();
	const { source_id } = useLocalSearchParams<{ source_id?: string }>();

	useEffect(() => {
		const timer = setTimeout(() => {
			setAlertConfig({
				visible: true,
				type: 'error',
				title: 'Payment Failed',
				message: 'We couldn\'t process your payment. Please try again or use a different payment method.',
				buttons: [
					{
						text: 'Try Again',
						style: 'default',
						onPress: () => {
							router.replace('/(screens)');
						},
					},
				],
			});
		}, 1000);

		return () => clearTimeout(timer);
	}, [source_id, router, setAlertConfig]);

	return (
		<View className="flex-1 items-center justify-center bg-background-DEFAULT">
			<ActivityIndicator size="large" color="#EF4444" />
			<StyledText className="text-text-primary font-montserrat-bold text-lg mt-4">
				Payment Processing...
			</StyledText>
			<StyledText className="text-text-muted font-raleway text-sm mt-2 px-6 text-center">
				Checking payment status
			</StyledText>
		</View>
	);
}
