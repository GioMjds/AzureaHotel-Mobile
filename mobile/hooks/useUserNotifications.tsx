import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { userNotif } from "@/services/UserNotifications";
import { Logger } from "@/configs/logger";

const logger = Logger.getInstance({ context: 'useUserNotifications' });

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

interface NotificationResponse {
    data: Notification[];
    count: number;
    unread_count: number;
    has_more: boolean;
}

const NOTIFICATIONS_LIMIT = 10;

export const useUserNotifications = () => {
    const queryClient = useQueryClient();

    const {
        data,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useInfiniteQuery<NotificationResponse>({
        queryKey: ['userNotifications'],
        queryFn: async ({ pageParam = 0 }) => {
            return await userNotif.getUserNotifications({
                limit: NOTIFICATIONS_LIMIT,
                offset: pageParam as number,
            });
        },
        getNextPageParam: (lastPage, allPages) => {
            if (!lastPage.has_more) return undefined;
            const totalFetched = allPages.reduce((sum, page) => sum + page.count, 0);
            return totalFetched;
        },
        initialPageParam: 0,
        staleTime: 30 * 1000,
        gcTime: 5 * 60 * 1000,
    });

    const notifications = data?.pages.flatMap(page => page.data) || [];
    const unreadCount = data?.pages[0]?.unread_count || 0;
    const totalCount = notifications.length;

    const markAsReadMutation = useMutation({
        mutationFn: (notificationId: number) => {
            return userNotif.markNotificationAsRead(notificationId);
        },
        onMutate: async (notificationId: number) => {
            await queryClient.cancelQueries({ queryKey: ['userNotifications'] });

            const previousData = queryClient.getQueryData(['userNotifications']);

            queryClient.setQueryData(['userNotifications'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: NotificationResponse) => ({
                        ...page,
                        data: page.data.map((notif: Notification) =>
                            notif.id === notificationId
                                ? { ...notif, is_read: true }
                                : notif
                        ),
                        unread_count: Math.max(0, page.unread_count - 1)
                    }))
                };
            });

            return { previousData };
        },
        onError: (err, notificationId, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['userNotifications'], context.previousData);
            }
            logger.error(`Error marking notification ${notificationId} as read: ${err}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
        }
    });

    // Mark all notifications as read
    const markAllAsReadMutation = useMutation({
        mutationFn: () => userNotif.markAllNotificationsAsRead(),
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['userNotifications'] });

            const previousData = queryClient.getQueryData(['userNotifications']);

            queryClient.setQueryData(['userNotifications'], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    pages: old.pages.map((page: NotificationResponse) => ({
                        ...page,
                        data: page.data.map((notif: Notification) => ({ ...notif, is_read: true })),
                        unread_count: 0
                    }))
                };
            });

            return { previousData };
        },
        onError: (error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['userNotifications'], context.previousData);
            }
            logger.error(`Error marking all notifications as read: ${error}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['userNotifications'] });
        }
    });

    return {
        notifications,
        totalCount,
        unreadCount,
        isLoading,
        error,
        refetch,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
        isMarkingAsRead: markAsReadMutation.isPending,
        isMarkingAllAsRead: markAllAsReadMutation.isPending,
    }
}