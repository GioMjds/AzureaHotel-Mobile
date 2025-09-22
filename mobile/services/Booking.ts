import { httpClient } from "@/configs/axios";
import { BookingRoutes } from "@/configs/axios.routes";

class BookingService {
    async getBookingDetail(bookingId: string) {
        return await httpClient.get(BookingRoutes.BOOKING_DETAIL(bookingId));
    }
}

export const booking = new BookingService();