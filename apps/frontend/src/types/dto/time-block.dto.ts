export interface CreateTimeBlockDto {
	staffId?: string; // undefined = весь салон
	type: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	startDate: string; // ISO string
	endDate: string; // ISO string
	notes?: string;
	conflictAction: 'RESCHEDULE' | 'CANCEL';
	rescheduleStaffId?: string; // ID сотрудника для переноса при conflictAction === 'RESCHEDULE'
}

export interface UpdateTimeBlockDto {
	type?: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	startDate?: string;
	endDate?: string;
	notes?: string;
	conflictAction?: 'RESCHEDULE' | 'CANCEL';
	rescheduleStaffId?: string;
}

export interface TimeBlockDto {
	id: string;
	salonId: string;
	staffId?: string;
	type: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	reason?: string; // deprecated, use notes
	startDate: string;
	endDate: string;
	notes?: string;
	conflictAction: 'RESCHEDULE' | 'CANCEL';
	rescheduleStaffId?: string;
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
		serviceId?: string;
		time: string;
		userId: string;
		user?: {
			name?: string;
			email?: string;
		};
		service?: {
			id?: string;
			name: string;
			Staff?: { id: string }[];
		};
	}>;
}
