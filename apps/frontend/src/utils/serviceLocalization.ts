import { ServiceResponseDto } from '@/types/dto/service.dto';
import { Service } from '@/types';

// Type for services that can have localized fields
type LocalizableService = Service | ServiceResponseDto;

// Helper function to get localized service name
export const getLocalizedServiceName = (
	service: LocalizableService,
	language: 'vi' | 'en' | 'ru'
): string => {
	switch (language) {
		case 'vi':
			return service.nameVi || service.name;
		case 'ru':
			return service.nameRu || service.name;
		case 'en':
			return service.nameEn || service.name;
		default:
			return service.name;
	}
};

// Helper function to get localized service description
export const getLocalizedServiceDescription = (
	service: LocalizableService,
	language: 'vi' | 'en' | 'ru'
): string | undefined => {
	// Get the appropriate translated description based on language
	let translatedDescription: string | undefined;
	
	switch (language) {
		case 'vi':
			translatedDescription = service.descriptionVi;
			break;
		case 'ru':
			translatedDescription = service.descriptionRu;
			break;
		case 'en':
			translatedDescription = service.descriptionEn;
			break;
		default:
			translatedDescription = service.descriptionEn;
	}
	
	// Return translated description if available and not empty, otherwise fallback to base description
	// Check if translated description exists and is not empty string
	if (translatedDescription && translatedDescription.trim().length > 0) {
		return translatedDescription;
	}
	
	// Fallback to base description if translation is not available
	return service.description;
};

// Type for service groups that can have localized fields
type LocalizableServiceGroup = {
	name: string;
	nameEn?: string | null;
	nameVi?: string | null;
	nameRu?: string | null;
};

// Helper function to get localized service group name
export const getLocalizedGroupName = (
	group: LocalizableServiceGroup,
	language: 'vi' | 'en' | 'ru'
): string => {
	switch (language) {
		case 'vi':
			return group.nameVi || group.name;
		case 'ru':
			return group.nameRu || group.name;
		case 'en':
			return group.nameEn || group.name;
		default:
			return group.name;
	}
};



