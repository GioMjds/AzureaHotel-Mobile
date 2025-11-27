import { Area } from "./Area.types";
import { Guest } from "./GuestUser.types";
import { Room } from "./Room.types";

export interface UserBooking {
    id: number;
    user: Guest;
    room: Room['id'] | null;
    room_details: Room | null;
    area: Area['id'] | null;
    area_details: Area | null;
    check_in_date: string | null;
    check_out_date: string | null;
    status: string;
    special_request: string | null;
    cancellation_date: string | null;
    cancellation_reason: string | null;
    time_of_arrival: string | null;
    is_venue_booking: boolean;
    total_price: number;
    number_of_guests: number;
    created_at: string;
    updated_at: string;
    payment_method: string;
    payment_proof: string | null;
    payment_date: string;
    down_payment: number | null;
    phone_number: string;
    total_amount: number;
    original_price: number;
    discount_percent: number;
    discounted_price: number | null;
    paymongo_source_id: string | null;
    paymongo_payment_id: string | null;
}

export interface UserBookingResponse {
    data: UserBooking[];
    pagination: {
        total_pages: number;
        current_page: number;
        total_items: number;
        page_size: number;
    }
}