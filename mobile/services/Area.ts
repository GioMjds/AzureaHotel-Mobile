import { httpClient } from '@/configs/axios';
import { PropertyRoutes } from '@/configs/axios.routes';

class AreaService {
	async getAreas(page: number = 1, pageSize: number = 6) {
		return await httpClient.get(`${PropertyRoutes.AREAS}?page=${page}&page_size=${pageSize}`);
	}

	async getSingleArea(areaId: string) {
		return await httpClient.get(`${PropertyRoutes.AREAS}/${areaId}`);
	}
}

export const area = new AreaService();
