import { httpClient } from '@/configs/axios';

export interface CreateSourceParams {
	bookingId: string;
	amountPhp?: number;
	successUrl?: string;
	failedUrl?: string;
}

export interface CreateSourcePrebookingParams {
	amountPhp: number;
	bookingData: {
		room_id?: string;
		area_id?: string;
		first_name: string;
		last_name: string;
		phone_number: string;
		check_in?: string;
		check_out?: string;
		start_time?: string;
		end_time?: string;
		total_price: number;
		number_of_guests: number;
		special_requests?: string;
		arrival_time?: string;
	};
	successUrl: string;
	failedUrl: string;
}

export interface PayMongoSource {
	id: string;
	type: string;
	attributes: {
		amount: number;
		currency: string;
		type: string;
		status: 'pending' | 'chargeable' | 'paid' | 'failed' | 'expired';
		redirect: {
			checkout_url: string;
			success: string;
			failed: string;
		};
		metadata: {
			booking_id: string;
		};
	};
}

export interface PayMongoSourceResponse {
	data: PayMongoSource;
}

export interface PayMongoVerifyResponse {
	status: 'pending' | 'chargeable' | 'paid' | 'failed' | 'expired';
	booking_id?: number;
	booking_created?: boolean;
	down_payment?: number;
	payment_status?: string;
	message?: string;
}

class PayMongoService {
	/**
	 * Create a PayMongo source for a booking
	 * @param bookingId - The booking ID
	 * @param amountPhp - Optional amount in PHP (will be converted to centavos on backend)
	 * @param opts - Optional success and failed URLs
	 * @returns PayMongo source response with checkout URL
	 */
	async createSource(
		bookingId: string,
		amountPhp?: number,
		opts?: { success_url?: string; failed_url?: string }
	): Promise<PayMongoSourceResponse> {
		try {
			const payload: any = {};
			
			if (amountPhp !== undefined) {
				payload.amount = amountPhp;
			}
			
			if (opts?.success_url) {
				payload.success_url = opts.success_url;
			}
			
			if (opts?.failed_url) {
				payload.failed_url = opts.failed_url;
			}

			const response = await httpClient.post<PayMongoSourceResponse>(
				`/booking/bookings/${bookingId}/paymongo/create`,
				payload
			);

			return response;
		} catch (error: any) {
			console.error('PayMongo createSource error:', error);
			throw new Error(
				error.response?.data?.error || 
				error.message || 
				'Failed to create PayMongo source'
			);
		}
	}

	/**
	 * Verify the status of a PayMongo source and create booking if payment succeeded
	 * @param sourceId - The PayMongo source ID
	 * @returns Verification result with booking information if created
	 */
	async verifySource(sourceId: string): Promise<PayMongoVerifyResponse> {
		try {
			const response = await httpClient.get<PayMongoVerifyResponse>(
				`/booking/paymongo/sources/${sourceId}/verify`
			);

			return response;
		} catch (error: any) {
			console.error('PayMongo verifySource error:', error);
			throw new Error(
				error.response?.data?.error || 
				error.message || 
				'Failed to verify PayMongo source'
			);
		}
	}

	/**
	 * Create a PayMongo source WITHOUT creating a booking first
	 * Booking will be created by webhook after successful payment
	 * @param params - Amount, booking data, and redirect URLs
	 * @returns PayMongo source response with checkout URL
	 */
	async createSourcePrebooking(
		params: CreateSourcePrebookingParams
	): Promise<PayMongoSourceResponse> {
		try {
			const payload = {
				amount: params.amountPhp,
				booking_data: params.bookingData,
				success_url: params.successUrl,
				failed_url: params.failedUrl,
			};

			const response = await httpClient.post<PayMongoSourceResponse>(
				`/booking/paymongo/create-without-booking`,
				payload
			);

			return response;
		} catch (error: any) {
			console.error('PayMongo createSourcePrebooking error:', error);
			throw new Error(
				error.response?.data?.error || 
				error.message || 
				'Failed to create PayMongo source'
			);
		}
	}
}

export const paymongoService = new PayMongoService();
