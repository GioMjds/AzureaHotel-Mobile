import { httpClient } from '@/configs/axios';
import { PropertyRoutes } from '@/configs/axios.routes';

class AreaService {
	async getAreas() {
		return await httpClient.get(PropertyRoutes.AREAS);
	}

	async getSingleArea(areaId: string) {
		return await httpClient.get(`${PropertyRoutes.AREAS}/${areaId}`);
	}
}

export const area = new AreaService();
