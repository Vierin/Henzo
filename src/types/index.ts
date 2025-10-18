// Common types used across the application

export interface User {
	id: string;
	email: string;
	name?: string;
	phone?: string;
	role: 'OWNER' | 'ADMIN' | 'CLIENT';
	createdAt: string;
	bookings?: Booking[];
}

export interface Salon {
	id: string;
	name: string;
	description?: string;
	address?: string;
	phone?: string;
	email?: string;
	website?: string;
	instagram?: string;
	logo?: string;
	photos?: string[];
	workingHours?: WorkingHours;
	categoryIds?: number[];
	categories?: { id: string; name: string }[];
	ownerId: string;
	createdAt: string;
	services?: Service[];
	reviews?: Review[];
	// Map coordinates
	latitude?: number;
	longitude?: number;
	// Rating and review count
	rating?: number;
	avgRating?: number;
	reviewCount?: number;
	_count?: {
		reviews?: number;
		services?: number;
	};
	// Метод для генерации slug (не сохраняется в БД)
	getSlug?(): string;
}

export interface Service {
	id: string;
	name: string;
	description?: string;
	duration: number;
	price: number;
	salonId?: string;
	categoryId?: string;
	category?: Category;
	serviceCategoryId?: number;
	serviceCategory?: ServiceCategory;
}

export interface ServiceCategory {
	id: number;
	nameEn: string;
	nameVn: string;
}

export interface Category {
	id: string;
	name: string;
	salonId: string;
	createdAt: string;
	services?: Service[];
}

export interface Staff {
	id: string;
	name: string;
	email?: string;
	phone?: string;
	role?: string;
	accessLevel: 'ADMIN' | 'EMPLOYEE';
	salonId: string;
}

export interface Booking {
	id: string;
	salonId: string;
	userId: string;
	clientId: string;
	serviceId: string;
	staffId?: string;
	time: string;
	status: 'PENDING' | 'CONFIRMED' | 'CANCELED' | 'COMPLETED';
	notes?: string;
	createdAt: string;
	service?: Service;
	salon?: Salon;
	staff?: Staff;
	user?: User;
}

export interface Client {
	id: string;
	name: string;
	phone: string;
	email?: string;
}

export interface WorkingHours {
	monday?: { open: string; close: string; closed?: boolean };
	tuesday?: { open: string; close: string; closed?: boolean };
	wednesday?: { open: string; close: string; closed?: boolean };
	thursday?: { open: string; close: string; closed?: boolean };
	friday?: { open: string; close: string; closed?: boolean };
	saturday?: { open: string; close: string; closed?: boolean };
	sunday?: { open: string; close: string; closed?: boolean };
}

export interface TimeSlot {
	value: string;
	display: string;
	available: boolean;
}

export interface FormData {
	clientName: string;
	clientPhone: string;
	clientEmail: string;
	serviceId: string;
	staffId: string;
	date: string;
	time: string;
	notes: string;
}

export interface Review {
	id: string;
	salonId: string;
	userId: string;
	bookingId?: string;
	rating: number;
	comment?: string;
	createdAt: string;
	user?: {
		name?: string;
		email?: string;
	};
}

export interface ApiError {
	error: string;
	message?: string;
}

export interface TimeBlock {
	id: string;
	salonId: string;
	staffId?: string; // null/undefined = весь салон
	type: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	reason: string;
	startDate: string; // ISO string
	endDate: string; // ISO string
	notes?: string;
	conflictAction: 'KEEP' | 'CANCEL'; // что делать с existing bookings
	createdAt: string;
	staff?: Staff;
	conflictingBookings?: Booking[]; // bookings that conflict with this block
}

	createdAt: string;
	staff?: Staff;
	conflictingBookings?: Booking[]; // bookings that conflict with this block
}

	createdAt: string;
	staff?: Staff;
	conflictingBookings?: Booking[]; // bookings that conflict with this block
}
