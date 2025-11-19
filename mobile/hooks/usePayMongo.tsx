import { useCallback, useState, useRef } from 'react';
import * as WebBrowser from 'expo-web-browser';
import {
	paymongoService,
	CreateSourcePrebookingParams,
} from '@/services/paymongo';

type CreateResult = {
	success: boolean;
	data?: any;
	error?: any;
	sourceId?: string;
};

type PaymentStatus = 'pending' | 'chargeable' | 'paid' | 'failed' | 'expired';

export function usePaymongo() {
	const [isProcessing, setIsProcessing] = useState<boolean>(false);
	const [error, setError] = useState<string | null>(null);
	const [paymentStatus, setPaymentStatus] =
		useState<PaymentStatus>('pending');
	const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
		null
	);

	const createSourceAndRedirect = useCallback(
		async (
			bookingId: string,
			amountPhp?: number,
			opts?: { success_url?: string; failed_url?: string }
		): Promise<CreateResult> => {
			setIsProcessing(true);
			setError(null);
			setPaymentStatus('pending');

			try {
				const resp: any = await paymongoService.createSource(
					bookingId,
					amountPhp,
					opts
				);
				const data = resp.data || resp;

				// Extract source data
				const source = data.data || data;
				const sourceId = source.id;
				const redirectUrl =
					source.attributes?.redirect?.checkout_url ||
					source.attributes?.redirect?.success ||
					source.attributes?.redirect?.failed ||
					null;

				if (redirectUrl) {
					// Open in system browser
					await WebBrowser.openBrowserAsync(redirectUrl);
				}

				setIsProcessing(false);
				return { success: true, data, sourceId };
			} catch (e: any) {
				setIsProcessing(false);
				setError(e?.message || String(e));
				return { success: false, error: e };
			}
		},
		[]
	);

	const verifySource = useCallback(async (sourceId: string) => {
		try {
			const resp: any = await paymongoService.verifySource(sourceId);
			console.log('[usePaymongo] verifySource raw response:', resp);
			const sourceData = resp.data?.data || resp.data || resp;
			const status = sourceData.attributes?.status as PaymentStatus;
			setPaymentStatus(status || 'pending');
			return { status, data: sourceData };
		} catch (e) {
			throw e;
		}
	}, []);

	const startPolling = useCallback(
		(
			sourceId: string,
			onStatusChange: (status: PaymentStatus) => void,
			maxAttempts = 60
		) => {
			let attempts = 0;

			// Clear any existing polling
			if (pollingIntervalRef.current) {
				clearInterval(pollingIntervalRef.current);
			}

			pollingIntervalRef.current = setInterval(async () => {
				attempts++;

				try {
					const result = await verifySource(sourceId);
					const status = result.status;

					onStatusChange(status);

					// Stop polling if payment is complete or failed
					if (
						status === 'paid' ||
						status === 'chargeable' ||
						status === 'failed' ||
						status === 'expired'
					) {
						if (pollingIntervalRef.current) {
							clearInterval(pollingIntervalRef.current);
							pollingIntervalRef.current = null;
						}
					}

					// Stop after max attempts
					if (attempts >= maxAttempts) {
						if (pollingIntervalRef.current) {
							clearInterval(pollingIntervalRef.current);
							pollingIntervalRef.current = null;
						}
					}
				} catch (error) {
					console.error('Polling error:', error);
				}
			}, 3000);

			return () => {
				if (pollingIntervalRef.current) {
					clearInterval(pollingIntervalRef.current);
					pollingIntervalRef.current = null;
				}
			};
		},
		[verifySource]
	);

	const stopPolling = useCallback(() => {
		if (pollingIntervalRef.current) {
			clearInterval(pollingIntervalRef.current);
			pollingIntervalRef.current = null;
		}
	}, []);

	const createSourcePrebookingAndRedirect = useCallback(
		async (params: CreateSourcePrebookingParams): Promise<CreateResult> => {
			setIsProcessing(true);
			setError(null);
			setPaymentStatus('pending');

			try {
				const resp: any =
					await paymongoService.createSourcePrebooking(params);
				console.log(
					'[usePaymongo] createSourcePrebooking raw response:',
					resp
				);
				const data = resp.data || resp;

				// Extract source data
				const source = data.data || data;
				const sourceId = source.id;
				const redirectUrl =
					source.attributes?.redirect?.checkout_url ||
					source.attributes?.redirect?.success ||
					source.attributes?.redirect?.failed ||
					null;

				if (redirectUrl) {
					if (sourceId) {
						const AsyncStorage =
							require('@react-native-async-storage/async-storage').default;
						await AsyncStorage.setItem(
							'paymongo_pending_source_id',
							sourceId
						);
					}

					await WebBrowser.openBrowserAsync(redirectUrl);
				}

				setIsProcessing(false);
				return { success: true, data, sourceId };
			} catch (e: any) {
				setIsProcessing(false);
				setError(e?.message || String(e));
				return { success: false, error: e };
			}
		},
		[]
	);

	return {
		createSourceAndRedirect,
		createSourcePrebookingAndRedirect,
		verifySource,
		startPolling,
		stopPolling,
		isProcessing,
		error,
		paymentStatus,
	};
}

export default usePaymongo;
