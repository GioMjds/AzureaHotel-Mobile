interface StatusFilter {
    label: string;
    value: string;
    icon: string;
}

export const statusFilters: StatusFilter[] = [
	{ label: 'All', value: '', icon: 'list' },
	{ label: 'Pending', value: 'pending', icon: 'time' },
	{ label: 'Reserved', value: 'reserved', icon: 'bookmark' },
	{ label: 'Checked In', value: 'checked_in', icon: 'enter' },
	{ label: 'Checked Out', value: 'checked_out', icon: 'exit' },
];
