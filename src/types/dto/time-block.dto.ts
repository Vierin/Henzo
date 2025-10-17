export interface CreateTimeBlockDto {
	staffId?: string; // undefined = весь салон
	type: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	reason: string;
	startDate: string; // ISO string
	endDate: string; // ISO string
	notes?: string;
	conflictAction: 'KEEP' | 'CANCEL';
}

export interface UpdateTimeBlockDto {
	type?: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	reason?: string;
	startDate?: string;
	endDate?: string;
	notes?: string;
	conflictAction?: 'KEEP' | 'CANCEL';
}

export interface TimeBlockDto {
	id: string;
	salonId: string;
	staffId?: string;
	type: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	reason: string;
	startDate: string;
	endDate: string;
	notes?: string;
	conflictAction: 'KEEP' | 'CANCEL';
	createdAt: string;
	updatedAt?: string;
	// Relations
	staff?: {
		id: string;
		name: string;
		email?: string;
	};
	conflictingBookings?: Array<{
		id: string;
		time: string;
		userId: string;
		user?: {
			name?: string;
			email?: string;
		};
		service?: {
			name: string;
		};
	}>;
}


