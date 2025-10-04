import { httpClient } from '@/configs/axios';
import { PropertyRoutes } from '@/configs/axios.routes';

class RoomService {
	async getRooms() {
		return await httpClient.get(PropertyRoutes.ROOMS);
	}

	async getSingleRoom(roomId: string) {
		return await httpClient.get(`${PropertyRoutes.ROOMS}/${roomId}`);
	}
}

export const room = new RoomService();
