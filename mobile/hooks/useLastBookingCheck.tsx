import { useMemo } from 'react';
import useAuthStore from '@/store/AuthStore';

export default function useLastBookingCheck() {
  const user = useAuthStore((s) => s.user);

  const { isBookingLocked, bookingLockedMessage } = useMemo(() => {
    // If no user, not locked (UI can handle requiring auth separately)
    if (!user) return { isBookingLocked: false, bookingLockedMessage: undefined };

    // is_verified values in backend: 'unverified' | 'pending' | 'rejected' | 'verified'
    const isVerified = (user.is_verified as string) === 'verified';

    // last_booking_date is stored as a string 'YYYY-MM-DD' or null
    const lastBooking = user.last_booking_date;

    // Normalize today's date as 'YYYY-MM-DD' in UTC-local format for simple comparison
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    const todayStr = `${yyyy}-${mm}-${dd}`;

    // Booking is locked if user is NOT verified and last_booking_date equals today
    const locked = !isVerified && !!lastBooking && lastBooking === todayStr;

    const msg = locked
      ? 'You can only make one booking per day until your ID is verified.'
      : undefined;

    return { isBookingLocked: locked, bookingLockedMessage: msg };
  }, [user]);

  return { isBookingLocked, bookingLockedMessage };
}
