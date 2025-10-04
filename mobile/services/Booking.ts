import { httpClient } from '@/configs/axios';
import { BookingRoutes } from '@/configs/axios.routes';

interface ReviewData {
	rating: number;
	review_text: string;
}

interface ReservationFormData {
	firstName: string;
	lastName: string;
	phoneNumber: string;
	specialRequests: string;
	areaId: string;
	startTime: string;
	endTime: string;
	totalPrice: number;
	status: string;
	isVenueBooking: boolean;
	numberOfGuests: number;
	paymentMethod: string;
	paymentProof?: File | null;
}

class BookingService {
	async getBookingDetail(bookingId: string) {
		return await httpClient.get(BookingRoutes.BOOKING_DETAIL(bookingId));
	}

	async leaveBookingFeedback(bookingId: number, reviewData: ReviewData) {
		return await httpClient.post(
			BookingRoutes.BOOKING_REVIEWS(bookingId),
			reviewData
		);
	}

	async getBookingReviews(bookingId: number) {
		return await httpClient.get(BookingRoutes.BOOKING_REVIEWS(bookingId));
	}

	async createAreaBooking(reservationData: ReservationFormData) {
		const formData = new FormData();

		formData.append('firstName', reservationData.firstName);
		formData.append('lastName', reservationData.lastName);
		// Ensure phone number is in correct format
		const cleanedPhone = reservationData.phoneNumber.replace(/\s+/g, '');
		formData.append('phoneNumber', cleanedPhone);
		formData.append('specialRequests', reservationData.specialRequests || '');
		// Backend expects 'roomId' for venue bookings (area ID is sent as roomId)
		formData.append('roomId', reservationData.areaId);
		formData.append('isVenueBooking', 'true');
		formData.append('status', reservationData.status || 'pending');

		if (reservationData.startTime) {
			const startDate = new Date(reservationData.startTime);
			const formattedStartDate = startDate.toISOString().split('T')[0];
			formData.append('checkIn', formattedStartDate);

			// Set start time to 8:00 AM for area bookings
			formData.append('startTime', '08:00');
		}

		if (reservationData.endTime) {
			const endDate = new Date(reservationData.endTime);
			const formattedEndDate = endDate.toISOString().split('T')[0];
			formData.append('checkOut', formattedEndDate);

			// Set end time to 5:00 PM for area bookings
			formData.append('endTime', '17:00');
		}

		formData.append('totalPrice', reservationData.totalPrice?.toString() || '0');
		formData.append('numberOfGuests', reservationData.numberOfGuests.toString());
		formData.append('paymentMethod', reservationData.paymentMethod);

		if (
			reservationData.paymentMethod === 'gcash' &&
			reservationData.paymentProof
		) {
			formData.append('paymentProof', reservationData.paymentProof);
		}

		// Log what we're sending for debugging
		console.log('Area Booking - FormData being sent:');
		console.log('- firstName:', reservationData.firstName);
		console.log('- lastName:', reservationData.lastName);
		console.log('- phoneNumber:', cleanedPhone);
		console.log('- roomId (areaId):', reservationData.areaId);
		console.log('- isVenueBooking: true');
		console.log('- checkIn:', new Date(reservationData.startTime).toISOString().split('T')[0]);
		console.log('- checkOut:', new Date(reservationData.endTime).toISOString().split('T')[0]);
		console.log('- totalPrice:', reservationData.totalPrice);
		console.log('- numberOfGuests:', reservationData.numberOfGuests);
		console.log('- paymentMethod:', reservationData.paymentMethod);
		console.log('- paymentProof:', reservationData.paymentProof ? 'Attached' : 'None');

        return await httpClient.post(BookingRoutes.BOOKINGS, formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            }
        });
	}

    async getAreaById(areaId: string) {
        return await httpClient.get(BookingRoutes.AREA_DETAIL(areaId));
    }

    async getRoomById(roomId: string) {
		return await httpClient.get(BookingRoutes.ROOM_DETAIL(roomId));
	}

    async getAreaBookings(
		areaId: string,
		startDate?: string,
		endDate?: string
	) {
		const params: Record<string, string> = {};

		if (startDate) params.start_date = startDate;
		if (endDate) params.end_date = endDate;

		const queryString = Object.keys(params).length
			? '?' + new URLSearchParams(params).toString()
			: '';

		return await httpClient.get(`${BookingRoutes.AREA_BOOKINGS(areaId)}${queryString}`);
	}

    async getRoomBookings(
		roomId: string,
		startDate?: string,
		endDate?: string
	) {
		const params: Record<string, string> = {};

		if (startDate) params.start_date = startDate;
		if (endDate) params.end_date = endDate;

        const queryString = Object.keys(params).length
			? '?' + new URLSearchParams(params).toString()
			: '';

		return await httpClient.get(`${BookingRoutes.ROOM_BOOKINGS(roomId)}${queryString}`);
	}

    async cancelBooking(bookingId: string, reason: string) {
        return await httpClient.post(BookingRoutes.CANCEL_BOOKING(bookingId), { reason });
    }

    async getUserBookings(
        page: number,
        pageSize: number,
    ) {
        return await httpClient.get(BookingRoutes.USER_BOOKINGS, {
            params: { page, page_size: pageSize }
        });
    }
}

export const booking = new BookingService();
