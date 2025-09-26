import { useQuery } from '@tanstack/react-query';
import { booking } from '@/services/Booking';

export function useBookingReview(bookingId: number, enabled: boolean = true) {
    return useQuery({
        queryKey: ['booking-reviews', bookingId],
        queryFn: () => booking.getBookingReviews(bookingId),
        enabled: enabled && !!bookingId,
        staleTime: 5 * 60 * 1000, // 5 minutes
        select: (data) => {
            // Check if current user has already left a review
            const hasReview = data?.data && Array.isArray(data.data) && data.data.length > 0;
            return {
                hasReview,
                reviews: data?.data || [],
                count: data?.data?.length || 0
            };
        }
    });
}