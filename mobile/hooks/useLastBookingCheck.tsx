import { useMemo } from 'react';
import useAuthStore from '@/store/AuthStore';

export default function useLastBookingCheck() {
	const user = useAuthStore((s) => s.user);

	const { isBookingLocked, bookingLockedMessage } = useMemo(() => {
		if (!user)
			return { isBookingLocked: false, bookingLockedMessage: undefined };

		const isVerified = (user.is_verified as string) === 'verified';

		const lastBooking = user.last_booking_date;

		const today = new Date();
		const yyyy = today.getFullYear();
		const mm = String(today.getMonth() + 1).padStart(2, '0');
		const dd = String(today.getDate()).padStart(2, '0');
		const todayStr = `${yyyy}-${mm}-${dd}`;

		const locked = !isVerified && !!lastBooking && lastBooking === todayStr;

		const msg = locked
			? 'You can only make one booking per day until your ID is verified.'
			: undefined;

		return { isBookingLocked: locked, bookingLockedMessage: msg };
	}, [user]);

	return { isBookingLocked, bookingLockedMessage };
}
