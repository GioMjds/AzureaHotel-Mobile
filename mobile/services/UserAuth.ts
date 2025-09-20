import { httpClient } from "@/configs/axios";
import { ApiRoutes } from "@/configs/axios.routes";

class UserAuthService {
    async login(email: string, password: string) {
        return httpClient.post(ApiRoutes.LOGIN, { email, password });
    }

    async logout() {
        return httpClient.post(ApiRoutes.LOGOUT);
    }

    async sendRegisterOtp(email: string, password: string, confirmPassword: string) {
        return httpClient.post(ApiRoutes.REGISTER, {
            email: email,
            password: password,
            confirm_password: confirmPassword,
        });
    }

    async verifyOtp(email: string, password: string, otp: string, firstName: string, lastName: string) {
        return httpClient.post(ApiRoutes.VERIFY_OTP, { 
            email,
            password, 
            otp,
            first_name: firstName,
            last_name: lastName
        });
    }

    async getGuestProfile(userId: number) {
        return httpClient.get(ApiRoutes.USER_DETAILS(userId));
    }
}

export const auth = new UserAuthService();