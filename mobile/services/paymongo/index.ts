import { httpClient } from '@/configs/axios';
import { BookingRoutes } from '@/configs/axios.routes';

export interface CreateSourceResponse {
  data: any;
}

export class PaymongoService {
  async createSource(bookingId: string, amountPhp?: number, opts?: { success_url?: string; failed_url?: string }) {
    const payload: any = {};
    if (amountPhp !== undefined) payload.amount = amountPhp;
    if (opts?.success_url) payload.success_url = opts.success_url;
    if (opts?.failed_url) payload.failed_url = opts.failed_url;

    const url = `${BookingRoutes.BOOKINGS}/${bookingId}/paymongo/create`;
    const resp = await httpClient.post<CreateSourceResponse>(url, payload);
    console.log('[PaymongoService] createSource -> backend response:', resp);
    return resp;
  }

  async verifySource(sourceId: string) {
    const url = `/booking/paymongo/sources/${sourceId}/verify`;
    const resp = await httpClient.get(url);
    console.log('[PaymongoService] verifySource -> backend response:', resp);
    return resp;
  }
}

export const paymongoService = new PaymongoService();
