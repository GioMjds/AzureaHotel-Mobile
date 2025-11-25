import { httpClient } from "@/configs/axios";
import { ApiRoutes } from "@/configs/axios.routes";
import { Logger } from "@/configs/logger";

const logger = Logger.getInstance({ context: 'UserNotificationService' });

interface Notification {
    id: number;
    title: string;
    message: string;
    type: 'booking' | 'payment' | 'general' | 'system';
    is_read: boolean;
    created_at: string;
    booking_id?: number;
    metadata?: Record<string, any>;
}

interface NotificationsResponse {
    data: Notification[];
    count: number;
    unread_count: number;
    has_more: boolean;
}

interface GetNotificationsParams {
    limit?: number;
    offset?: number;
}

class UserNotificationService {
    /**
     * Fetch all user notifications with pagination support
     * @param limit - Number of notifications to fetch (default: 10)
     * @param offset - Number of notifications to skip (default: 0)
     */
    async getUserNotifications(params?: GetNotificationsParams): Promise<NotificationsResponse> {
        try {
            const queryParams = new URLSearchParams();
            
            if (params?.limit) queryParams.append('limit', params.limit.toString());
            if (params?.offset !== undefined) queryParams.append('offset', params.offset.toString());

            const url = queryParams.toString() 
                ? `${ApiRoutes.NOTIFICATIONS}?${queryParams.toString()}`
                : ApiRoutes.NOTIFICATIONS;

            const response = await httpClient.get(url);

            return {
                data: response.notifications || [],
                count: response.notifications?.length || 0,
                unread_count: response.unread_count || 0,
                has_more: response.has_more || false
            };
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mark a single notification as read
     * @param notificationId - ID of the notification to mark as read
     */
    async markNotificationAsRead(notificationId: number): Promise<{ message: string }> {
        try {
            const response = await httpClient.patch<{ message: string }>(
                ApiRoutes.MARK_NOTIFICATION_READ(notificationId)
            );
            return response;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Mark all notifications as read for the current user
     */
    async markAllNotificationsAsRead(): Promise<{ message: string }> {
        try {
            const response = await httpClient.patch<{ message: string }>(
                ApiRoutes.MARK_ALL_NOTIFICATIONS_READ
            );
            return response;
        } catch (error) {
            throw error;
        }
    }
}

export const userNotif = new UserNotificationService();