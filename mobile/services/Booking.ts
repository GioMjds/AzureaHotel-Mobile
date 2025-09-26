import { httpClient } from "@/configs/axios";
import { BookingRoutes } from "@/configs/axios.routes";

interface ReviewData {
    rating: number;
    review_text: string;
}

class BookingService {
    async getBookingDetail(bookingId: string) {
        return await httpClient.get(BookingRoutes.BOOKING_DETAIL(bookingId));
    }

    async leaveBookingFeedback(bookingId: number, reviewData: ReviewData) {
        return await httpClient.post(BookingRoutes.BOOKING_REVIEWS(bookingId), reviewData);
    }

    async getBookingReviews(bookingId: number) {
        return await httpClient.get(BookingRoutes.BOOKING_REVIEWS(bookingId));
    }
}

export const booking = new BookingService();