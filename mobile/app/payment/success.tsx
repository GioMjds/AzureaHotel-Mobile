import { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useQueryClient } from '@tanstack/react-query';
import AsyncStorage from '@react-native-async-storage/async-storage';
import StyledText from '@/components/ui/StyledText';
import useAlertStore from '@/store/AlertStore';
import { paymongoService } from '@/services/paymongo';

export default function PaymentSuccessScreen() {
	const [isVerifying, setIsVerifying] = useState<boolean>(true);

	const router = useRouter();
	const queryClient = useQueryClient();

	const { setAlertConfig } = useAlertStore();
	const { source_id } = useLocalSearchParams<{ source_id?: string }>();

	useEffect(() => {
		const verifyPaymentAndCreateBooking = async () => {
			let sourceIdToVerify = source_id;
			
			if (!sourceIdToVerify) {
				try {
					const storedSourceId = await AsyncStorage.getItem('paymongo_pending_source_id');
					if (storedSourceId) {
						sourceIdToVerify = storedSourceId;
						await AsyncStorage.removeItem('paymongo_pending_source_id');
					}
				} catch (error) {
					console.error('Error reading from AsyncStorage:', error);
				}
			}
			
			if (!sourceIdToVerify) {
				setIsVerifying(false);
				setAlertConfig({
					visible: true,
					type: 'error',
					title: 'Error',
					message: 'No payment information found. Please try booking again.',
					buttons: [
						{
							text: 'OK',
							style: 'default',
							onPress: () => router.replace('/(screens)'),
						},
					],
				});
				return;
			}

			try {
				const response = await paymongoService.verifySource(sourceIdToVerify as string);

				// Invalidate bookings to refresh the list
				queryClient.invalidateQueries({ queryKey: ['guest-bookings'] });
				queryClient.invalidateQueries({ queryKey: ['bookings'] });

				setIsVerifying(false);

				// Show success alert
				setTimeout(() => {
					setAlertConfig({
						visible: true,
						type: 'success',
						title: 'Payment Successful!',
						message: response.booking_created 
							? `Your booking has been confirmed! Down payment of ₱${response.down_payment?.toFixed(2)} has been processed.`
							: 'Your payment has been processed successfully. Your booking is now confirmed.',
						buttons: [
							{
								text: 'View My Bookings',
								style: 'default',
								onPress: () => {
									router.replace('/(screens)');
								},
							},
						],
					});
				}, 500);
			} catch (error: any) {
				setIsVerifying(false);
				
				setAlertConfig({
					visible: true,
					type: 'warning',
					title: 'Verification Pending',
					message: 'Your payment was successful, but we\'re still confirming your booking. Please check your bookings in a moment.',
					buttons: [
						{
							text: 'OK',
							style: 'default',
							onPress: () => router.replace('/(screens)'),
						},
					],
				});
			}
		};

		verifyPaymentAndCreateBooking();
	}, [source_id, router, queryClient, setAlertConfig]);

	return (
		<View className="flex-1 items-center justify-center bg-background-DEFAULT">
			{isVerifying ? (
				<>
					<ActivityIndicator size="large" color="#10B981" />
					<StyledText className="text-text-primary font-montserrat-bold text-lg mt-4">
						Verifying payment...
					</StyledText>
					<StyledText className="text-text-muted font-raleway text-sm mt-2 px-6 text-center">
						Please wait while we confirm your payment and create your booking
					</StyledText>
				</>
			) : (
				<>
					<ActivityIndicator size="large" color="#10B981" />
					<StyledText className="text-text-primary font-montserrat-bold text-lg mt-4">
						Processing complete
					</StyledText>
				</>
			)}
		</View>
	);
}
