import { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { database } from '@/configs/firebase';

interface BookingUpdate {
    id: number;
    status: string;
    last_updated: string;
    updated_by: string;
    changes?: {
        status?: {
            to: string;
            timestamp: string;
        };
    };
}

export function useBookingUpdates(bookingId?: number) {
    const [bookingUpdate, setBookingUpdate] = useState<BookingUpdate | null>(null);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!bookingId) {
            setLoading(false);
            return;
        }

        const bookingRef = ref(database, `booking-updates/${bookingId}`);
        
        const unsubscribe = onValue(bookingRef, (snapshot) => {
            const data = snapshot.val();
            if (data) {
                setBookingUpdate(data);
            } else {
                setBookingUpdate(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, [bookingId]);

    return { bookingUpdate, loading };
}

// Hook for getting all booking updates for a user
export function useUserBookingUpdates(userId?: number) {
    const [bookingUpdates, setBookingUpdates] = useState<Record<number, BookingUpdate>>({});
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        if (!userId) {
            setLoading(false);
            return;
        }

        // Get all user's bookings first, then listen to their updates
        const userBookingsRef = ref(database, `user-bookings/user_${userId}`);
        
        const unsubscribe = onValue(userBookingsRef, (snapshot) => {
            const userBookings = snapshot.val();
            if (userBookings) {
                const bookingIds = Object.keys(userBookings);
                
                // Listen to updates for all user's bookings
                const updatePromises = bookingIds.map(bookingId => {
                    return new Promise<void>((resolve) => {
                        const bookingUpdateRef = ref(database, `booking-updates/${bookingId}`);
                        onValue(bookingUpdateRef, (updateSnapshot) => {
                            const updateData = updateSnapshot.val();
                            if (updateData) {
                                setBookingUpdates(prev => ({
                                    ...prev,
                                    [bookingId]: updateData
                                }));
                            }
                            resolve();
                        });
                    });
                });

                Promise.all(updatePromises).then(() => setLoading(false));
            } else {
                setBookingUpdates({});
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, [userId]);

    return { bookingUpdates, loading };
}