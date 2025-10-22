import { httpClient } from '@/configs/axios';
import { ApiRoutes } from '@/configs/axios.routes';
import { UserBookingResponse } from '@/types/Bookings.types';

class UserAuthService {
	async login(email: string, password: string) {
		return await httpClient.post(ApiRoutes.LOGIN, { email, password });
	}

	async logout() {
		return await httpClient.post(ApiRoutes.LOGOUT);
	}

	async sendRegisterOtp(
		firstName: string,
		lastName: string,
		email: string,
		password: string,
		confirmPassword: string
	) {
		return await httpClient.post(ApiRoutes.REGISTER, {
			first_name: firstName,
			last_name: lastName,
			email: email,
			password: password,
			confirm_password: confirmPassword,
		});
	}

	async verifyOtp(
		email: string,
		password: string,
		otp: string,
		firstName: string,
		lastName: string
	) {
		return await httpClient.post(ApiRoutes.VERIFY_OTP, {
			email,
			password,
			otp,
			first_name: firstName,
			last_name: lastName,
		});
	}

	async resendOtp(email: string) {
		return await httpClient.post(ApiRoutes.RESEND_OTP, {
			email: email,
		});
	}

	async forgotPassword(email: string) {
		return await httpClient.post(ApiRoutes.FORGOT_PASSWORD, {
			email: email,
		});
	}

	async verifyResetOtp(email: string, otp: string) {
		return await httpClient.post(ApiRoutes.VERIFY_RESET_OTP, {
			email: email,
			otp: otp,
		});
	}

	async resetPassword(
		email: string,
		newPassword: string,
		confirmNewPassword: string
	) {
		return await httpClient.post(ApiRoutes.RESET_PASSWORD, {
			email: email,
			new_password: newPassword,
			confirm_password: confirmNewPassword,
		});
	}

	async userAuth() {
		return await httpClient.get(ApiRoutes.USER_AUTH);
	}

	async getGuestBookings(params?: {
		status?: string;
		page?: number;
		page_size?: number;
	}): Promise<UserBookingResponse> {
		return await httpClient.get(ApiRoutes.GUEST_BOOKINGS, {
			params: {
				status: params?.status,
				page: params?.page,
				page_size: params?.page_size,
			},
		});
	}

	async getGuestProfile(userId: number) {
		return await httpClient.get(ApiRoutes.USER_DETAILS(userId));
	}
}

export const auth = new UserAuthService();
