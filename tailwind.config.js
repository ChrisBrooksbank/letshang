/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {
			// Mobile-first spacing scale
			spacing: {
				// Touch-friendly minimum target size (44px)
				'touch-min': '44px',
				// Common mobile spacing values
				'safe-top': 'env(safe-area-inset-top)',
				'safe-bottom': 'env(safe-area-inset-bottom)',
				'safe-left': 'env(safe-area-inset-left)',
				'safe-right': 'env(safe-area-inset-right)'
			},
			// Mobile-first breakpoints (min-width)
			screens: {
				xs: '320px', // Small phone
				sm: '640px', // Large phone
				md: '768px', // Tablet
				lg: '1024px', // Desktop
				xl: '1280px', // Large desktop
				'2xl': '1536px' // Extra large desktop
			},
			// Mobile-optimized max widths
			maxWidth: {
				'mobile-content': '100vw',
				'tablet-content': '768px',
				'desktop-content': '1200px',
				'wide-content': '1400px'
			},
			// Prevent horizontal scroll
			minWidth: {
				0: '0',
				full: '100%'
			}
		}
	},
	plugins: []
};
