interface BookingDetails {
    type: string;
    name: string;
    check_in_date: string;
    check_out_date: string;
}

export interface Reviews {
    id: number;
    rating: number;
    user_id: number;
    booking: number;
    review_text: string;
    created_at: string;
    room_id: number | null;
    area_id: number | null;
    user_profile_image: string;
    formatted_date: string;
    user_name: string;
    booking_details: BookingDetails;
}