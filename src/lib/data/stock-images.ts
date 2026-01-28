/**
 * Curated stock images for event and group cover photos
 * Categories organized by event/group type for easy selection
 *
 * In production, these would be:
 * - Hosted in Supabase Storage or a CDN
 * - High-quality 1920x1080 images (16:9 aspect ratio)
 * - Optimized for web (WebP format, ~200KB each)
 * - Licensed for use (e.g., Unsplash, Pexels, or custom photography)
 */

export interface StockImage {
	id: string;
	url: string;
	category: string;
	alt: string;
	thumbnail?: string; // Optional smaller version for gallery display
}

export const STOCK_IMAGE_CATEGORIES = [
	'Technology',
	'Sports & Fitness',
	'Arts & Crafts',
	'Food & Drink',
	'Nature & Outdoors',
	'Business',
	'Social',
	'Education',
	'Music',
	'Games'
] as const;

export type StockImageCategory = (typeof STOCK_IMAGE_CATEGORIES)[number];

/**
 * Curated stock images organized by category
 *
 * Note: These URLs are placeholders using picsum.photos for demonstration.
 * In production, replace with actual curated images from:
 * - Unsplash API (https://unsplash.com/developers)
 * - Pexels API (https://www.pexels.com/api/)
 * - Custom photography stored in Supabase Storage
 */
export const STOCK_IMAGES: StockImage[] = [
	// Technology (bright, modern, tech-focused images)
	{
		id: 'tech-1',
		url: 'https://picsum.photos/seed/tech1/1920/1080',
		category: 'Technology',
		alt: 'Modern technology and devices'
	},
	{
		id: 'tech-2',
		url: 'https://picsum.photos/seed/tech2/1920/1080',
		category: 'Technology',
		alt: 'Code and programming'
	},
	{
		id: 'tech-3',
		url: 'https://picsum.photos/seed/tech3/1920/1080',
		category: 'Technology',
		alt: 'Digital innovation'
	},

	// Sports & Fitness (active, energetic, motivating)
	{
		id: 'sports-1',
		url: 'https://picsum.photos/seed/sports1/1920/1080',
		category: 'Sports & Fitness',
		alt: 'Fitness and exercise'
	},
	{
		id: 'sports-2',
		url: 'https://picsum.photos/seed/sports2/1920/1080',
		category: 'Sports & Fitness',
		alt: 'Team sports'
	},
	{
		id: 'sports-3',
		url: 'https://picsum.photos/seed/sports3/1920/1080',
		category: 'Sports & Fitness',
		alt: 'Outdoor activities'
	},

	// Arts & Crafts (creative, colorful, inspiring)
	{
		id: 'arts-1',
		url: 'https://picsum.photos/seed/arts1/1920/1080',
		category: 'Arts & Crafts',
		alt: 'Art supplies and creativity'
	},
	{
		id: 'arts-2',
		url: 'https://picsum.photos/seed/arts2/1920/1080',
		category: 'Arts & Crafts',
		alt: 'Creative workspace'
	},
	{
		id: 'arts-3',
		url: 'https://picsum.photos/seed/arts3/1920/1080',
		category: 'Arts & Crafts',
		alt: 'Artistic expression'
	},

	// Food & Drink (appetizing, social, welcoming)
	{
		id: 'food-1',
		url: 'https://picsum.photos/seed/food1/1920/1080',
		category: 'Food & Drink',
		alt: 'Delicious food spread'
	},
	{
		id: 'food-2',
		url: 'https://picsum.photos/seed/food2/1920/1080',
		category: 'Food & Drink',
		alt: 'Coffee and conversation'
	},
	{
		id: 'food-3',
		url: 'https://picsum.photos/seed/food3/1920/1080',
		category: 'Food & Drink',
		alt: 'Dining together'
	},

	// Nature & Outdoors (peaceful, expansive, refreshing)
	{
		id: 'nature-1',
		url: 'https://picsum.photos/seed/nature1/1920/1080',
		category: 'Nature & Outdoors',
		alt: 'Mountain landscape'
	},
	{
		id: 'nature-2',
		url: 'https://picsum.photos/seed/nature2/1920/1080',
		category: 'Nature & Outdoors',
		alt: 'Forest and trees'
	},
	{
		id: 'nature-3',
		url: 'https://picsum.photos/seed/nature3/1920/1080',
		category: 'Nature & Outdoors',
		alt: 'Beach and ocean'
	},

	// Business (professional, clean, corporate)
	{
		id: 'business-1',
		url: 'https://picsum.photos/seed/business1/1920/1080',
		category: 'Business',
		alt: 'Professional meeting space'
	},
	{
		id: 'business-2',
		url: 'https://picsum.photos/seed/business2/1920/1080',
		category: 'Business',
		alt: 'Modern office'
	},
	{
		id: 'business-3',
		url: 'https://picsum.photos/seed/business3/1920/1080',
		category: 'Business',
		alt: 'Team collaboration'
	},

	// Social (friendly, diverse, inclusive)
	{
		id: 'social-1',
		url: 'https://picsum.photos/seed/social1/1920/1080',
		category: 'Social',
		alt: 'People socializing'
	},
	{
		id: 'social-2',
		url: 'https://picsum.photos/seed/social2/1920/1080',
		category: 'Social',
		alt: 'Friends gathering'
	},
	{
		id: 'social-3',
		url: 'https://picsum.photos/seed/social3/1920/1080',
		category: 'Social',
		alt: 'Community event'
	},

	// Education (knowledge, learning, growth)
	{
		id: 'education-1',
		url: 'https://picsum.photos/seed/education1/1920/1080',
		category: 'Education',
		alt: 'Learning environment'
	},
	{
		id: 'education-2',
		url: 'https://picsum.photos/seed/education2/1920/1080',
		category: 'Education',
		alt: 'Books and study'
	},
	{
		id: 'education-3',
		url: 'https://picsum.photos/seed/education3/1920/1080',
		category: 'Education',
		alt: 'Workshop setting'
	},

	// Music (rhythmic, vibrant, energetic)
	{
		id: 'music-1',
		url: 'https://picsum.photos/seed/music1/1920/1080',
		category: 'Music',
		alt: 'Musical instruments'
	},
	{
		id: 'music-2',
		url: 'https://picsum.photos/seed/music2/1920/1080',
		category: 'Music',
		alt: 'Live performance'
	},
	{
		id: 'music-3',
		url: 'https://picsum.photos/seed/music3/1920/1080',
		category: 'Music',
		alt: 'Concert atmosphere'
	},

	// Games (fun, playful, competitive)
	{
		id: 'games-1',
		url: 'https://picsum.photos/seed/games1/1920/1080',
		category: 'Games',
		alt: 'Board games and fun'
	},
	{
		id: 'games-2',
		url: 'https://picsum.photos/seed/games2/1920/1080',
		category: 'Games',
		alt: 'Gaming setup'
	},
	{
		id: 'games-3',
		url: 'https://picsum.photos/seed/games3/1920/1080',
		category: 'Games',
		alt: 'Playful activities'
	}
];

/**
 * Get images by category
 */
export function getImagesByCategory(category: StockImageCategory): StockImage[] {
	return STOCK_IMAGES.filter((img) => img.category === category);
}

/**
 * Get image by ID
 */
export function getImageById(id: string): StockImage | undefined {
	return STOCK_IMAGES.find((img) => img.id === id);
}

/**
 * Get all categories
 */
export function getAllCategories(): StockImageCategory[] {
	return STOCK_IMAGE_CATEGORIES.slice();
}
