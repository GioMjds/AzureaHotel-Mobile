import { httpClient } from '@/configs/axios';
import { PropertyRoutes } from '@/configs/axios.routes';

class RoomService {
	async getRooms() {
		return await httpClient.get(PropertyRoutes.ROOMS);
	}

	async getSingleRoom(roomId: string) {
		return await httpClient.get(`${PropertyRoutes.ROOMS}/${roomId}`);
	}

	async getRoomBookings(
		roomId: string,
		startDate?: string,
		endDate?: string
	) {
		const params: Record<string, string> = {};

		if (startDate) params.start_date = startDate;
		if (endDate) params.end_date = endDate;

        const queryString = Object.keys(params).length
			? '?' + new URLSearchParams(params).toString()
			: '';

		return await httpClient.get(
			`${PropertyRoutes.ROOMS}/${roomId}/bookings${queryString}`
		);
	}
}

export const room = new RoomService();
