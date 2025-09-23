/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,jsx,ts,tsx}', './index.{js,jsx,ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				// Core brand colors
				brand: {
					primary: '#6F00FF',      // Main brand color
					secondary: '#3B0270',    // Darker variant
					accent: '#E9B3FB',       // Light accent
					surface: '#FFF1F1',      // Lightest surface
				},

				// Background system
				background: {
					DEFAULT: '#FFF1F1',      // Main app background
					elevated: '#FFFFFF',     // Cards, modals, elevated surfaces
					subtle: '#E9B3FB',       // Subtle background areas
					overlay: 'rgba(59, 2, 112, 0.8)', // Modal overlays
				},

				// Foreground/Text system
				text: {
					primary: '#3B0270',      // Primary text color
					secondary: '#6F00FF',    // Secondary text, links
					muted: '#6F00FF80',      // Muted text (50% opacity)
					disabled: '#E9B3FB',     // Disabled text
					inverse: '#FFF1F1',      // Text on dark backgrounds
				},

				// Interactive elements (Buttons, Touchables)
				interactive: {
					primary: {
						DEFAULT: '#6F00FF',
						hover: '#8533FF',      // Slightly lighter for hover
						pressed: '#3B0270',    // Darker when pressed
						disabled: '#E9B3FB',   // Disabled state
						foreground: '#FFF1F1', // Text on primary buttons
					},
					secondary: {
						DEFAULT: '#E9B3FB',
						hover: '#D299F7',      // Slightly darker hover
						pressed: '#6F00FF',    // Primary color when pressed
						foreground: '#3B0270', // Text on secondary buttons
					},
					outline: {
						DEFAULT: 'transparent',
						border: '#6F00FF',
						hover: '#E9B3FB',      // Light fill on hover
						pressed: '#6F00FF1A',  // Very light primary (10% opacity)
						foreground: '#6F00FF', // Text color
					},
					ghost: {
						DEFAULT: 'transparent',
						hover: '#E9B3FB',      // Light fill on hover
						pressed: '#6F00FF1A',  // Very light primary
						foreground: '#3B0270', // Text color
					},
				},

				// Input system
				input: {
					background: '#FFFFFF',
					border: '#E9B3FB',
					'border-focus': '#6F00FF',
					'border-error': '#EF4444',
					placeholder: '#E9B3FB',
					text: '#3B0270',
				},

				// Navigation system
				navigation: {
					background: '#FFFFFF',
					'tab-active': '#6F00FF',
					'tab-inactive': '#E9B3FB',
					'tab-text-active': '#FFF1F1',
					'tab-text-inactive': '#3B0270',
					separator: '#E9B3FB',
				},

				// Border system
				border: {
					DEFAULT: '#E9B3FB',      // Default borders
					focus: '#6F00FF',        // Focused state borders
					strong: '#3B0270',       // Prominent borders
					subtle: '#F0E6FF',       // Very light borders
				},

				// Status/Feedback colors
				feedback: {
					success: {
						DEFAULT: '#10B981',
						light: '#D1FAE5',
						dark: '#047857',
					},
					error: {
						DEFAULT: '#EF4444',
						light: '#FEE2E2',
						dark: '#DC2626',
					},
					warning: {
						DEFAULT: '#F59E0B',
						light: '#FEF3C7',
						dark: '#D97706',
					},
					info: {
						DEFAULT: '#3B82F6',
						light: '#DBEAFE',
						dark: '#1D4ED8',
					},
				},

				// Surface variations for components
				surface: {
					DEFAULT: '#FFFFFF',      // Default surface (cards, etc)
					elevated: '#FFFFFF',     // Elevated surfaces
					overlay: '#FFF1F1',      // Overlay backgrounds
					disabled: '#F5F5F5',     // Disabled surfaces
				},

				// Legacy support (keeping neutral for any existing usage)
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

				// Direct color access (for flexibility)
				violet: {
					primary: '#6F00FF',
					dark: '#3B0270',
					light: '#E9B3FB',
					surface: '#FFF1F1',
				},
			},

			fontFamily: {
				playfair: ['PlayfairDisplay_400Regular'],
				'playfair-medium': ['PlayfairDisplay_500Medium'],
				'playfair-semibold': ['PlayfairDisplay_600SemiBold'], 
				'playfair-bold': ['PlayfairDisplay_700Bold'],
				'playfair-extrabold': ['PlayfairDisplay_800ExtraBold'],
				'playfair-black': ['PlayfairDisplay_900Black'],
				montserrat: ['Montserrat_400Regular'],
				'montserrat-bold': ['Montserrat_700Bold'],
				raleway: ['Raleway_400Regular'],
				'raleway-bold': ['Raleway_700Bold'],
			},

			// Additional utilities for React Native
			spacing: {
				'safe-top': '44px',      // iOS safe area top
				'safe-bottom': '34px',   // iOS safe area bottom
			},
		},
	},
	plugins: [],
};