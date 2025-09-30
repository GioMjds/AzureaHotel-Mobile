import { httpClient } from '@/configs/axios';
import { PropertyRoutes, BookingRoutes } from '@/configs/axios.routes';

class AreaService {
	async getAreas() {
		return await httpClient.get(PropertyRoutes.AREAS);
	}

	async getSingleArea(areaId: string) {
		return await httpClient.get(`${PropertyRoutes.AREAS}/${areaId}`);
	}

    async getAreaById(areaId: string) {
        return await httpClient.get(BookingRoutes.AREA_DETAIL(areaId));
    }

	async getAreaBookings(
		areaId: string,
		startDate?: string,
		endDate?: string
	) {
		const params: Record<string, string> = {};

		if (startDate) params.start_date = startDate;
		if (endDate) params.end_date = endDate;

		const queryString = Object.keys(params).length
			? '?' + new URLSearchParams(params).toString()
			: '';

		return await httpClient.get(`${BookingRoutes.AREA_BOOKINGS(areaId)}${queryString}`);
	}
}

export const area = new AreaService();
