export enum IsVerified {
    UNVERIFIED = 'unverified',
    PENDING = 'pending',
    REJECTED = 'rejected',
    VERIFIED = 'verified'
}

export interface Guest {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    profile_image: string;
    valid_id_type_display: string;
    valid_id_front: string;
    valid_id_back: string;
    is_verified: IsVerified;
    valid_id_rejection_reason: string | null;
    last_booking_date: string | null;
    is_senior_or_pwd: boolean;
}

export interface GuestResponse {
    data: Guest;
}