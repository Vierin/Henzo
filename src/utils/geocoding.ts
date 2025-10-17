/**
 * Geocoding utilities for converting addresses to coordinates
 */

export interface GeocodingResult {
	latitude: number;
	longitude: number;
	formattedAddress: string;
}

/**
 * Geocode an address to coordinates using OpenStreetMap Nominatim API
 * @param address - The address to geocode
 * @returns Promise with geocoding result or null if not found
 */
export async function geocodeAddress(
	address: string
): Promise<GeocodingResult | null> {
	if (!address || address.trim() === '') {
		return null;
	}

	try {
		// Use OpenStreetMap Nominatim API (free, no API key required)
		const response = await fetch(
			`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1&addressdetails=1`
		);

		if (!response.ok) {
			console.error('Geocoding API error:', response.status);
			return null;
		}

		const data = await response.json();

		if (!data || data.length === 0) {
			console.log('No geocoding results found for:', address);
			return null;
		}

		const result = data[0];
		return {
			latitude: parseFloat(result.lat),
			longitude: parseFloat(result.lon),
			formattedAddress: result.display_name || address,
		};
	} catch (error) {
		console.error('Geocoding error:', error);
		return null;
	}
}

/**
 * Reverse geocode coordinates to address
 * @param latitude - Latitude coordinate
 * @param longitude - Longitude coordinate
 * @returns Promise with address or null if not found
 */
export async function reverseGeocode(
	latitude: number,
	longitude: number
): Promise<string | null> {
	try {
		const response = await fetch(
			`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`
		);

		if (!response.ok) {
			console.error('Reverse geocoding API error:', response.status);
			return null;
		}

		const data = await response.json();

		if (!data || !data.display_name) {
			console.log(
				'No reverse geocoding results found for:',
				latitude,
				longitude
			);
			return null;
		}

		return data.display_name;
	} catch (error) {
		console.error('Reverse geocoding error:', error);
		return null;
	}
}

/**
 * Batch geocode multiple addresses
 * @param addresses - Array of addresses to geocode
 * @returns Promise with array of geocoding results
 */
export async function batchGeocodeAddresses(
	addresses: string[]
): Promise<GeocodingResult[]> {
	const results: GeocodingResult[] = [];

	// Process addresses in batches to avoid rate limiting
	const batchSize = 5;
	const delay = 1000; // 1 second delay between batches

	for (let i = 0; i < addresses.length; i += batchSize) {
		const batch = addresses.slice(i, i + batchSize);

		const batchPromises = batch.map(async (address) => {
			const result = await geocodeAddress(address);
			return result;
		});

		const batchResults = await Promise.all(batchPromises);
		results.push(
			...batchResults.filter(
				(result): result is GeocodingResult => result !== null
			)
		);

		// Add delay between batches to respect rate limits
		if (i + batchSize < addresses.length) {
			await new Promise((resolve) => setTimeout(resolve, delay));
		}
	}

	return results;
}
