import { Salon } from '@/types';

export interface MapBounds {
	north: number;
	south: number;
	east: number;
	west: number;
}

/**
 * Проверить, находится ли салон в видимых границах карты
 */
export function isSalonInBounds(salon: Salon, bounds: MapBounds): boolean {
	if (!salon.latitude || !salon.longitude) {
		return false;
	}

	return (
		salon.latitude >= bounds.south &&
		salon.latitude <= bounds.north &&
		salon.longitude >= bounds.west &&
		salon.longitude <= bounds.east
	);
}

/**
 * Фильтровать салоны по видимым границам карты
 */
export function filterSalonsByBounds(
	salons: Salon[],
	bounds: MapBounds
): Salon[] {
	return salons.filter((salon) => isSalonInBounds(salon, bounds));
}

/**
 * Сортировать салоны по расстоянию от центра карты
 */
export function sortSalonsByDistance(
	salons: Salon[],
	center: { lat: number; lng: number }
): Salon[] {
	return salons.sort((a, b) => {
		if (!a.latitude || !a.longitude || !b.latitude || !b.longitude) {
			return 0;
		}

		const distanceA = getDistanceFromCenter(a, center);
		const distanceB = getDistanceFromCenter(b, center);

		return distanceA - distanceB;
	});
}

/**
 * Вычислить расстояние от салона до центра карты (в километрах)
 */
function getDistanceFromCenter(
	salon: Salon,
	center: { lat: number; lng: number }
): number {
	if (!salon.latitude || !salon.longitude) {
		return Infinity;
	}

	const R = 6371; // Радиус Земли в километрах
	const dLat = toRad(salon.latitude - center.lat);
	const dLon = toRad(salon.longitude - center.lng);
	const lat1 = toRad(center.lat);
	const lat2 = toRad(salon.latitude);

	const a =
		Math.sin(dLat / 2) * Math.sin(dLat / 2) +
		Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
	const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

	return R * c;
}

/**
 * Конвертировать градусы в радианы
 */
function toRad(deg: number): number {
	return deg * (Math.PI / 180);
}

/**
 * Получить границы карты с небольшим отступом для лучшего UX
 */
export function getBoundsWithPadding(
	bounds: MapBounds,
	padding: number = 0.01
): MapBounds {
	return {
		north: bounds.north + padding,
		south: bounds.south - padding,
		east: bounds.east + padding,
		west: bounds.west - padding,
	};
}








