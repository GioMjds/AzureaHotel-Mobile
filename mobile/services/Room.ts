import { httpClient } from '@/configs/axios';
import { PropertyRoutes } from '@/configs/axios.routes';

class RoomService {
	async getRooms(page: number = 1, pageSize: number = 6) {
		return await httpClient.get(`${PropertyRoutes.ROOMS}?page=${page}&page_size=${pageSize}`);
	}

	async getSingleRoom(roomId: string) {
		return await httpClient.get(`${PropertyRoutes.ROOMS}/${roomId}`);
	}
}

export const room = new RoomService();
