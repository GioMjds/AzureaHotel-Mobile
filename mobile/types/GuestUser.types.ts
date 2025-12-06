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
    name_last_updated: string | null;
}

export interface GuestResponse {
    data: Guest;
}

export interface LoginResponse {
    message: string;
    user: Guest;
    access_token: string;
    refresh_token: string;
    firebase_token?: string; // Optional Firebase custom token
}

export interface GoogleAuthResponse {
    success: boolean;
    message: string;
    user: Guest;
    access_token: string;
    refresh_token: string;
    firebase_token?: string; // Optional Firebase custom token
    exists: boolean;
}

export interface GoogleAuthVerificationResponse {
    success: boolean;
    message: string;
    email: string;
    password: string;
    otp?: string;
    requires_verification: boolean;
}

export type VerificationStatus = {
	isVerified: boolean;
	isPending: boolean;
	isRejected: boolean;
	rejectionReason: string | null;
	submittedIdType: string | null;
	frontImageUri: string | null;
	backImageUri: string | null;
};