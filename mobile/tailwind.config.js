/** @type {import('tailwindcss').Config} */
module.exports = {
	content: ['./app/**/*.{js,jsx,ts,tsx}', './index.{js,jsx,ts,tsx}'],
	presets: [require('nativewind/preset')],
	theme: {
		extend: {
			colors: {
				'brand-primary': '#6F00FF',
				'brand-secondary': '#3B0270',
				'brand-accent': '#E9B3FB',
				'brand-surface': '#FFF1F1',

				'background-default': '#FFF8F1',
				'background-elevated': '#FFFFFF',
				'background-subtle': '#E9B3FB',
				'background-overlay': 'rgba(59, 2, 112, 0.8)',

				'border-default': '#E9B3FB',
				'border-focus': '#6F00FF',
				'border-strong': '#3B0270',
				'border-subtle': '#F0E6FF',

				'text-primary': '#3B0270',
				'text-secondary': '#6F00FF',
				'text-muted': '#6F00FF80',
				'text-disabled': '#E9B3FB',
				'text-inverse': '#FFF1F1',

				'interactive-primary': '#6F00FF',
				'interactive-primary-hover': '#8533FF',
				'interactive-primary-pressed': '#3B0270',
				'interactive-primary-disabled': '#E9B3FB',
				'interactive-primary-foreground': '#FFF1F1',

				'interactive-secondary': '#E9B3FB',
				'interactive-secondary-hover': '#D299F7',
				'interactive-secondary-pressed': '#6F00FF',
				'interactive-secondary-foreground': '#3B0270',

				'interactive-outline': 'transparent',
				'interactive-outline-border': '#6F00FF',
				'interactive-outline-hover': '#E9B3FB',
				'interactive-outline-pressed': '#6F00FF1A',
				'interactive-outline-foreground': '#6F00FF',

				'interactive-ghost': 'transparent',
				'interactive-ghost-hover': '#E9B3FB',
				'interactive-ghost-pressed': '#6F00FF1A',
				'interactive-ghost-foreground': '#3B0270',

				'input-background': '#FFFFFF',
				'input-border': '#E9B3FB',
				'input-border-focus': '#6F00FF',
				'input-border-error': '#EF4444',
				'input-placeholder': '#E9B3FB',
				'input-text': '#3B0270',

				'navigation-background': '#FFFFFF',
				'navigation-tab-active': '#6F00FF',
				'navigation-tab-inactive': '#E9B3FB',
				'navigation-tab-text-active': '#FFF1F1',
				'navigation-tab-text-inactive': '#3B0270',
				'navigation-separator': '#E9B3FB',

				'feedback-success-DEFAULT': '#10B981',
				'feedback-success-light': '#D1FAE5',
				'feedback-success-dark': '#047857',
				'feedback-error-DEFAULT': '#EF4444',
				'feedback-error-light': '#FEE2E2',
				'feedback-error-dark': '#DC2626',
				'feedback-warning-DEFAULT': '#F59E0B',
				'feedback-warning-light': '#FEF3C7',
				'feedback-warning-dark': '#D97706',
				'feedback-info-DEFAULT': '#3B82F6',
				'feedback-info-light': '#DBEAFE',
				'feedback-info-dark': '#1D4ED8',

				'surface-default': '#FFFFFF',
				'surface-elevated': '#FFFFFF',
				'surface-overlay': '#FFF1F1',
				'surface-disabled': '#F5F5F5',

				'neutral-50': '#fafaf9',
				'neutral-100': '#f5f3ff',
				'neutral-200': '#e7e5e4',
				'neutral-300': '#d6d3d1',
				'neutral-400': '#a8a29e',
				'neutral-500': '#78716c',
				'neutral-600': '#57534e',
				'neutral-700': '#44403c',
				'neutral-800': '#292524',
				'neutral-900': '#1c1917',

				'violet-primary': '#6F00FF',
				'violet-dark': '#3B0270',
				'violet-light': '#E9B3FB',
				'violet-surface': '#FFF1F1',
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