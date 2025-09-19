import { httpClient } from "@/configs/axios";
import { ApiRoutes } from "@/configs/axios.routes";

class UserAuthService {
    async login(email: string, password: string) {
        return httpClient.post(ApiRoutes.LOGIN, { email, password });
    }
}

export const auth = new UserAuthService();