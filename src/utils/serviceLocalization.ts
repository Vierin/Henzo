import { ServiceResponseDto } from '@/types/dto/service.dto';

// Helper function to get localized service name
export const getLocalizedServiceName = (
	service: ServiceResponseDto,
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
	service: ServiceResponseDto,
	language: 'vi' | 'en' | 'ru'
): string | undefined => {
	switch (language) {
		case 'vi':
			return service.descriptionVi || service.description;
		case 'ru':
			return service.descriptionRu || service.description;
		case 'en':
			return service.descriptionEn || service.description;
		default:
			return service.description;
	}
};






