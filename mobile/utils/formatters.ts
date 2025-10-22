import { IsVerified } from '@/types/GuestUser.types';

interface ColorMap {
	[key: string]: string;
}

export const pesoFormatter = new Intl.NumberFormat('en-PH', {
	style: 'currency',
	currency: 'PHP',
	minimumFractionDigits: 2,
	maximumFractionDigits: 2,
});

/**
 * Format a number as a currency string (₱)
 */
export const formatCurrency = (value: number): string => {
	const abs = Math.abs(value);
	const basic = pesoFormatter.format(abs);
	return value < 0 ? `(${basic})` : basic;
};

/**
 * Format month and year from a date string
 */
export const formatMonthYear = (month: number, year: number) => {
	return new Date(year, month).toLocaleString('en-US', {
		month: 'long',
		year: 'numeric',
	});
};

/**
 * Get the number of days in a month
 */
export const getDaysInMonth = (
	month: number,
	year: number,
	adjustForDisplay?: boolean
) => {
	const adjustedMonth = month - 1;
	const date = new Date(year, adjustedMonth, 1);
	const days = [];
	while (date.getMonth() === adjustedMonth) {
		days.push(adjustForDisplay ? date.getDate() : new Date(date));
		date.setDate(date.getDate() + 1);
	}
	return days;
};

/**
 * Parse a price value from a formatted string (removes ₱ and commas)
 * @param price The price string or number to parse
 * @returns A numeric value
 */
export const parsePriceValue = (price: string | number): number => {
	if (typeof price === 'number') return price;

	const numericString = price.replace(/[^\d.]/g, '');
	return parseFloat(numericString) || 0;
};

/**
 * Format a date string to a readable format
 */
export const formatDate = (dateString: string): string => {
	if (!dateString) return 'N/A';
	try {
		const options: Intl.DateTimeFormatOptions = {
			month: 'short',
			day: 'numeric',
			year: 'numeric',
		};
		return new Date(dateString).toLocaleDateString(undefined, options);
	} catch (e) {
		console.error(`Error formatting date: ${dateString}`, e);
		return dateString;
	}
};

/**
 * Format a date with time
 */
export const formatDateTime = (dateString: string): string => {
	if (!dateString) return '';

	const date = new Date(dateString);
	return date.toLocaleDateString('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric',
		hour: '2-digit',
		minute: '2-digit',
	});
};

/**
 * Format a time string to a readable format
 */
export const getBookingPrice = (booking: any): number => {
	const priceString = booking.total_price?.toString() || '0';
	const numericString = priceString.replace(/[^0-9.]/g, '');
	return parseFloat(numericString) || 0;
};

/**
 * Format a status string to a more readable format
 */
export const formatStatus = (status: string): string => {
	return status.toUpperCase().replace(/_/g, ' ');
};

/**
 * Format a status color based on the status string using brand colors
 */
export const colorMap: ColorMap = {
	pending: 'bg-feedback-warning-DEFAULT',
	reserved: 'bg-interactive-primary',
	checked_in: 'bg-feedback-success-DEFAULT',
	checked_out: 'bg-feedback-info-DEFAULT',
	completed: 'bg-text-primary',
	cancelled: 'bg-feedback-error-DEFAULT',
	rejected: 'bg-feedback-error-DEFAULT',
};

export const getStatusColor = (status: string): string => {
	return colorMap[status] || 'bg-interactive-primary';
};

export const statusStyles: Record<string, object> = {
	pending: { backgroundColor: '#F59E0B' }, // feedback-warning-DEFAULT
	reserved: { backgroundColor: '#6F00FF' }, // interactive-primary
	checked_in: { backgroundColor: '#10B981' }, // feedback-success-DEFAULT
	checked_out: { backgroundColor: '#3B82F6' }, // feedback-info-DEFAULT
	completed: { backgroundColor: '#3B0270' }, // text-primary
	cancelled: { backgroundColor: '#EF4444' }, // feedback-error-DEFAULT
	rejected: { backgroundColor: '#EF4444' }, // feedback-error-DEFAULT
};

export const getStatusStyle = (status: string) => {
	return statusStyles[status];
};

/**
 * Calculate the number of days until the next stay
 */
export const calculateDaysUntilNextStay = (
	bookings: any[]
): number | string => {
	if (!bookings || bookings.length === 0) return 'N/A';

	const today = new Date();
	const upcomingBookings = bookings
		.filter((booking) => new Date(booking.check_in_date) > today)
		.sort(
			(a, b) =>
				new Date(a.check_in_date).getTime() -
				new Date(b.check_in_date).getTime()
		);

	if (upcomingBookings.length === 0) return 'N/A';

	const nextBooking = upcomingBookings[0];
	const nextStayDate = new Date(nextBooking.check_in_date);
	const diffTime = nextStayDate.getTime() - today.getTime();
	const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

	return diffDays;
};

/**
 * Format time into 12-hour format
 */
export const formatTime = (time: string): string => {
	if (!time) return '';

	const [hours, minutes] = time.split(':');
	const hour = parseInt(hours, 10);

	const period = hour >= 12 ? 'PM' : 'AM';
	const formattedHour = hour % 12 || 12;

	return `${formattedHour}:${minutes} ${period}`;
};

/**
 * Shows the rendered discounted price if the
 * area / room has a discount applied.
 * Otherwise, it returns the original price.
 */
export const formatDiscountedPrice = (
	price: number,
	discount: number | null
): string => {
	if (discount && discount > 0) {
		const discountedPrice = price - (price * discount) / 100;
		return pesoFormatter.format(discountedPrice);
	}
	return pesoFormatter.format(price);
};

/**
 * Display the guest user's verification status in profile.tsx
 * Returns text, color, backgroundColor, borderColor, icon, and isVerified
 */
export const getVerificationDisplay = (status: IsVerified) => {
	switch (status) {
		case IsVerified.VERIFIED:
			return {
				text: 'VERIFIED',
				color: 'bg-green-600',
				textColor: 'text-feedback-success-dark',
				bgColor: 'bg-feedback-success-light',
				borderColor: 'border-feedback-success-DEFAULT',
				icon: '✓',
				isVerified: true,
			};
		case IsVerified.PENDING:
			return {
				text: 'PENDING',
				color: 'bg-feedback-warning-DEFAULT',
				textColor: 'text-feedback-warning-dark',
				bgColor: 'bg-feedback-warning-light',
				borderColor: 'border-feedback-warning-DEFAULT',
				icon: '⏳',
				isVerified: false,
			};
		case IsVerified.REJECTED:
			return {
				text: 'REJECTED',
				color: 'bg-feedback-error-DEFAULT',
				textColor: 'text-feedback-error-dark',
				bgColor: 'bg-feedback-error-light',
				borderColor: 'border-feedback-error-DEFAULT',
				icon: '✗',
				isVerified: false,
			};
		case IsVerified.UNVERIFIED:
		default:
			return {
				text: 'UNVERIFIED',
				color: 'bg-feedback-error-DEFAULT',
				textColor: 'text-feedback-error-dark',
				bgColor: 'bg-feedback-error-light',
				borderColor: 'border-feedback-error-DEFAULT',
				icon: '!',
				isVerified: false,
			};
	}
};
