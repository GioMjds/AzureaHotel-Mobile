/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,jsx,ts,tsx}', './index.{js,jsx,ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				// Primary violet/purple shades
				primary: {
					50: '#f5f3ff',
					100: '#ede9fe',
					200: '#ddd6fe',
					300: '#c4b5fd',
					400: '#a78bfa',
					500: '#8b5cf6',
					600: '#7c3aed',
					700: '#6d28d9',
					800: '#5b21b6',
					900: '#4c1d95',
					950: '#2e1065',
				},
				// Secondary indigo shades for complementary colors
				secondary: {
					50: '#eef2ff',
					100: '#e0e7ff',
					200: '#c7d2fe',
					300: '#a5b4fc',
					400: '#818cf8',
					500: '#6366f1',
					600: '#4f46e5',
					700: '#4338ca',
					800: '#3730a3',
					900: '#312e81',
					950: '#1e1b4b',
				},
				// Accent colors for UI elements
				accent: {
					pink: '#ec4899',
					fuchsia: '#d946ef',
					violet: '#8b5cf6',
					light: '#ddd6fe',
				},
				// Neutral colors with purple undertones
				neutral: {
					50: '#fafaf9',
					100: '#f5f3ff',
					200: '#e7e5e4',
					300: '#d6d3d1',
					400: '#a8a29e',
					500: '#78716c',
					600: '#57534e',
					700: '#44403c',
					800: '#292524',
					900: '#1c1917',
				},
			},
			fontFamily: {
				playfair: ['"Playfair Display"', 'serif'],
				montserrat: ['Montserrat', 'sans-serif'],
				raleway: ['Raleway', 'sans-serif'],
			},
		},
	},
	plugins: [],
};
