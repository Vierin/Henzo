import {
	generateSalonSlug,
	extractSalonIdFromSlug,
	isValidSalonSlug,
} from '@/utils/slug';
import { Salon } from '@/types';

/**
 * Хук для работы с slug салонов
 */
export function useSalonSlug() {
	/**
	 * Генерирует slug для салона (использует slug из БД или генерирует)
	 */
	const getSalonSlug = (salon: Salon): string => {
		// Используем slug из БД, если есть, иначе генерируем
		return salon.slug || generateSalonSlug(salon.name, salon.id, salon.address);
	};

	/**
	 * Извлекает ID салона из slug
	 */
	const getSalonIdFromSlug = (slug: string): string | null => {
		return extractSalonIdFromSlug(slug);
	};

	/**
	 * Проверяет валидность slug
	 */
	const isSlugValid = (slug: string): boolean => {
		return isValidSalonSlug(slug);
	};

	/**
	 * Создает URL для салона с slug (использует slug из БД)
	 */
	const getSalonUrl = (salon: Salon): string => {
		const slug = getSalonSlug(salon);
		return `/salon/${slug}`;
	};

	/**
	 * Создает URL для салона по slug
	 */
	const getSalonUrlBySlug = (slug: string): string => {
		return `/salon/${slug}`;
	};

	return {
		getSalonSlug,
		getSalonIdFromSlug,
		isSlugValid,
		getSalonUrl,
		getSalonUrlBySlug,
	};
}
