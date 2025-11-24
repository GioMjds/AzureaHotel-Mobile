import { Ionicons } from "@expo/vector-icons";

interface Guideline {
    icon: keyof typeof Ionicons.glyphMap;
    text: string;
}

export const guidelines: Guideline[] = [
	{
		icon: 'camera',
		text: 'Use clear, high-quality photos',
	},
	{
		icon: 'sunny',
		text: 'Ensure good lighting with no glare',
	},
	{
		icon: 'document-text',
		text: 'All information must be readable',
	},
	{
		icon: 'checkmark-circle',
		text: 'ID must be valid and not expired',
	},
];

export const ID_TYPES = [
	'Passport',
	`Driver's License`,
	'National ID',
	'SSS ID',
	'Unified Multi-Purpose ID (UMID)',
	'PhilHealth ID',
	'PRC ID',
	'Student ID',
	'Senior Citizen ID',
	'Other Government-Issued ID',
];
