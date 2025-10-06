interface StatusFilter {
    label: string;
    value: string;
    icon: string;
}

export const statusFilters: StatusFilter[] = [
	{ label: 'All Bookings', value: '', icon: 'list' },
	{ label: 'Pending', value: 'pending', icon: 'time' },
	{ label: 'Reserved', value: 'reserved', icon: 'bookmark' },
	{ label: 'Checked In', value: 'checked_in', icon: 'enter' },
	{ label: 'Checked Out', value: 'checked_out', icon: 'exit' },
	{ label: 'Completed', value: 'completed', icon: 'checkmark-circle' },
];
