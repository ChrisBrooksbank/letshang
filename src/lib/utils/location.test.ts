import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
	calculateDistance,
	formatDistance,
	getCurrentLocation,
	isValidCoordinate,
	parseCoordinates,
	formatCoordinates,
	type Coordinates
} from './location';

describe('Location Utils', () => {
	describe('calculateDistance', () => {
		it('should calculate distance between two close coordinates', () => {
			const sanFrancisco: Coordinates = { lat: 37.7749, lng: -122.4194 };
			const oakland: Coordinates = { lat: 37.8044, lng: -122.2712 };

			const distance = calculateDistance(sanFrancisco, oakland);

			// Distance should be approximately 8-9 miles
			expect(distance).toBeGreaterThan(8);
			expect(distance).toBeLessThan(10);
		});

		it('should calculate distance between distant coordinates', () => {
			const newYork: Coordinates = { lat: 40.7128, lng: -74.006 };
			const losAngeles: Coordinates = { lat: 34.0522, lng: -118.2437 };

			const distance = calculateDistance(newYork, losAngeles);

			// Distance should be approximately 2400-2500 miles
			expect(distance).toBeGreaterThan(2400);
			expect(distance).toBeLessThan(2500);
		});

		it('should return 0 for identical coordinates', () => {
			const coord: Coordinates = { lat: 37.7749, lng: -122.4194 };

			const distance = calculateDistance(coord, coord);

			expect(distance).toBe(0);
		});

		it('should handle negative coordinates', () => {
			const coord1: Coordinates = { lat: -33.8688, lng: 151.2093 }; // Sydney
			const coord2: Coordinates = { lat: -37.8136, lng: 144.9631 }; // Melbourne

			const distance = calculateDistance(coord1, coord2);

			// Distance should be approximately 440-450 miles
			expect(distance).toBeGreaterThan(440);
			expect(distance).toBeLessThan(450);
		});

		it('should handle coordinates across the prime meridian', () => {
			const london: Coordinates = { lat: 51.5074, lng: -0.1278 };
			const paris: Coordinates = { lat: 48.8566, lng: 2.3522 };

			const distance = calculateDistance(london, paris);

			// Distance should be approximately 210-220 miles
			expect(distance).toBeGreaterThan(210);
			expect(distance).toBeLessThan(220);
		});
	});

	describe('formatDistance', () => {
		it('should format very small distances', () => {
			expect(formatDistance(0.05)).toBe('<0.1 mi');
			expect(formatDistance(0.09)).toBe('<0.1 mi');
		});

		it('should format distances less than 1 mile with 1 decimal', () => {
			expect(formatDistance(0.1)).toBe('0.1 mi');
			expect(formatDistance(0.5)).toBe('0.5 mi');
			expect(formatDistance(0.9)).toBe('0.9 mi');
		});

		it('should format distances between 1-10 miles with 1 decimal', () => {
			expect(formatDistance(1.2)).toBe('1.2 mi');
			expect(formatDistance(5.7)).toBe('5.7 mi');
			expect(formatDistance(9.8)).toBe('9.8 mi');
		});

		it('should format distances >= 10 miles as integers', () => {
			expect(formatDistance(10)).toBe('10 mi');
			expect(formatDistance(15.4)).toBe('15 mi');
			expect(formatDistance(99.7)).toBe('100 mi');
			expect(formatDistance(250.3)).toBe('250 mi');
		});
	});

	describe('getCurrentLocation', () => {
		let mockGeolocation: {
			getCurrentPosition: ReturnType<typeof vi.fn>;
		};

		beforeEach(() => {
			mockGeolocation = {
				getCurrentPosition: vi.fn()
			};
			vi.stubGlobal('navigator', {
				geolocation: mockGeolocation
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		it('should return coordinates on successful geolocation', async () => {
			const mockPosition = {
				coords: {
					latitude: 37.7749,
					longitude: -122.4194
				}
			};

			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success(mockPosition);
			});

			const result = await getCurrentLocation();

			expect(result).toEqual({ lat: 37.7749, lng: -122.4194 });
		});

		it('should return null when geolocation is denied', async () => {
			mockGeolocation.getCurrentPosition.mockImplementation((_, error) => {
				error(new Error('User denied'));
			});

			const result = await getCurrentLocation();

			expect(result).toBeNull();
		});

		it('should return null when geolocation is unavailable', async () => {
			vi.stubGlobal('navigator', {});

			const result = await getCurrentLocation();

			expect(result).toBeNull();
		});

		it('should use correct geolocation options', async () => {
			const mockPosition = {
				coords: {
					latitude: 37.7749,
					longitude: -122.4194
				}
			};

			mockGeolocation.getCurrentPosition.mockImplementation((success) => {
				success(mockPosition);
			});

			await getCurrentLocation();

			expect(mockGeolocation.getCurrentPosition).toHaveBeenCalledWith(
				expect.any(Function),
				expect.any(Function),
				{
					enableHighAccuracy: false,
					timeout: 10000,
					maximumAge: 300000
				}
			);
		});
	});

	describe('isValidCoordinate', () => {
		it('should return true for valid coordinates', () => {
			expect(isValidCoordinate({ lat: 37.7749, lng: -122.4194 })).toBe(true);
			expect(isValidCoordinate({ lat: 0, lng: 0 })).toBe(true);
			expect(isValidCoordinate({ lat: 90, lng: 180 })).toBe(true);
			expect(isValidCoordinate({ lat: -90, lng: -180 })).toBe(true);
		});

		it('should return false for null or undefined', () => {
			expect(isValidCoordinate(null)).toBe(false);
			expect(isValidCoordinate(undefined)).toBe(false);
		});

		it('should return false for invalid latitude', () => {
			expect(isValidCoordinate({ lat: 91, lng: 0 })).toBe(false);
			expect(isValidCoordinate({ lat: -91, lng: 0 })).toBe(false);
			expect(isValidCoordinate({ lat: NaN, lng: 0 })).toBe(false);
		});

		it('should return false for invalid longitude', () => {
			expect(isValidCoordinate({ lat: 0, lng: 181 })).toBe(false);
			expect(isValidCoordinate({ lat: 0, lng: -181 })).toBe(false);
			expect(isValidCoordinate({ lat: 0, lng: NaN })).toBe(false);
		});

		it('should return false for non-number values', () => {
			expect(isValidCoordinate({ lat: '37.7749' as any, lng: -122.4194 })).toBe(false);

			expect(isValidCoordinate({ lat: 37.7749, lng: '-122.4194' as any })).toBe(false);
		});

		it('should return false for objects without lat/lng', () => {
			expect(isValidCoordinate({} as any)).toBe(false);

			expect(isValidCoordinate({ lat: 37.7749 } as any)).toBe(false);

			expect(isValidCoordinate({ lng: -122.4194 } as any)).toBe(false);
		});
	});

	describe('parseCoordinates', () => {
		it('should parse valid coordinate string', () => {
			expect(parseCoordinates('37.7749,-122.4194')).toEqual({ lat: 37.7749, lng: -122.4194 });
			expect(parseCoordinates('0,0')).toEqual({ lat: 0, lng: 0 });
			expect(parseCoordinates('-33.8688,151.2093')).toEqual({ lat: -33.8688, lng: 151.2093 });
		});

		it('should return null for invalid formats', () => {
			expect(parseCoordinates('37.7749')).toBeNull();
			expect(parseCoordinates('37.7749,-122.4194,0')).toBeNull();
			expect(parseCoordinates('invalid,data')).toBeNull();
			expect(parseCoordinates('')).toBeNull();
		});

		it('should return null for null or undefined', () => {
			expect(parseCoordinates(null)).toBeNull();
			expect(parseCoordinates(undefined)).toBeNull();
		});

		it('should return null for invalid coordinates', () => {
			expect(parseCoordinates('91,0')).toBeNull(); // Invalid lat
			expect(parseCoordinates('0,181')).toBeNull(); // Invalid lng
			expect(parseCoordinates('-91,0')).toBeNull(); // Invalid lat
			expect(parseCoordinates('0,-181')).toBeNull(); // Invalid lng
		});

		it('should handle whitespace', () => {
			expect(parseCoordinates(' 37.7749 , -122.4194 ')).toEqual({ lat: 37.7749, lng: -122.4194 });
		});
	});

	describe('formatCoordinates', () => {
		it('should format valid coordinates', () => {
			expect(formatCoordinates({ lat: 37.7749, lng: -122.4194 })).toBe('37.7749,-122.4194');
			expect(formatCoordinates({ lat: 0, lng: 0 })).toBe('0,0');
			expect(formatCoordinates({ lat: -33.8688, lng: 151.2093 })).toBe('-33.8688,151.2093');
		});

		it('should return null for invalid coordinates', () => {
			expect(formatCoordinates({ lat: 91, lng: 0 })).toBeNull();
			expect(formatCoordinates({ lat: 0, lng: 181 })).toBeNull();
			expect(formatCoordinates(null)).toBeNull();
			expect(formatCoordinates(undefined)).toBeNull();
		});

		it('should return null for non-coordinate objects', () => {
			expect(formatCoordinates({} as any)).toBeNull();

			expect(formatCoordinates({ lat: 37.7749 } as any)).toBeNull();
		});
	});

	describe('parseCoordinates and formatCoordinates round-trip', () => {
		it('should maintain values through parse and format cycle', () => {
			const originalString = '37.7749,-122.4194';
			const parsed = parseCoordinates(originalString);
			const formatted = formatCoordinates(parsed);

			expect(formatted).toBe(originalString);
		});

		it('should maintain values through format and parse cycle', () => {
			const originalCoord: Coordinates = { lat: 37.7749, lng: -122.4194 };
			const formatted = formatCoordinates(originalCoord);
			const parsed = parseCoordinates(formatted);

			expect(parsed).toEqual(originalCoord);
		});
	});
});
