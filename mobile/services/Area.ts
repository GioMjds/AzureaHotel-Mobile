import { httpClient } from "@/configs/axios";
import { PropertyRoutes } from "@/configs/axios.routes";

class AreaService {
    async getAreas() {
        return httpClient.get(PropertyRoutes.AREAS);
    }
}

export const area = new AreaService();