import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { TimeBlock } from '@/types';
import {
	CreateTimeBlockDto,
	UpdateTimeBlockDto,
	TimeBlockDto,
} from '@/types/dto/time-block.dto';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';

// Query keys
export const timeBlockKeys = {
	all: ['timeBlocks'] as const,
	lists: () => [...timeBlockKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...timeBlockKeys.lists(), filters] as const,
	details: () => [...timeBlockKeys.all, 'detail'] as const,
	detail: (id: string) => [...timeBlockKeys.details(), id] as const,
};

// Convert DTO to TimeBlock
const convertTimeBlockDtoToTimeBlock = (dto: TimeBlockDto): TimeBlock => {
	return {
		id: dto.id,
		salonId: dto.salonId,
		staffId: dto.staffId,
		type: dto.type,
		startDate: dto.startDate,
		endDate: dto.endDate,
		notes: dto.notes,
		conflictAction:
			dto.conflictAction === 'RESCHEDULE' ? 'KEEP' : dto.conflictAction,
		createdAt: dto.createdAt,
		staff: dto.staff
			? {
					id: dto.staff.id,
					name: dto.staff.name,
					email: dto.staff.email,
					salonId: dto.salonId,
					accessLevel: 'EMPLOYEE',
				}
			: undefined,
		conflictingBookings: dto.conflictingBookings?.map((booking) => ({
			id: booking.id,
			salonId: dto.salonId,
			userId: booking.userId,
			clientId: booking.userId,
			serviceId: '',
			time: booking.time,
			status: 'CONFIRMED' as const,
			createdAt: '',
			user: booking.user
				? {
						id: booking.userId,
						email: booking.user.email || '',
						name: booking.user.name,
						role: 'CLIENT' as const,
						createdAt: '',
					}
				: undefined,
			service: booking.service
				? {
						id: '',
						name: booking.service.name,
						duration: 60,
						price: 0,
					}
				: undefined,
		})),
	};
};

// Get all time blocks for current salon
export const useTimeBlocks = (filters?: {
	staffId?: string;
	type?: 'TIME_OFF' | 'BUSY' | 'CLOSURE';
	startDate?: string;
	endDate?: string;
}, options?: { enabled?: boolean }) => {
	const { user, isLoading: authLoading, isOwner } = useAuth();
	const isQueryEnabled =
		(options?.enabled ?? true) && !authLoading && !!user && isOwner();

	return useQuery({
		queryKey: timeBlockKeys.list(filters || {}),
		queryFn: async (): Promise<TimeBlock[]> => {
			const params = new URLSearchParams();
			if (filters?.staffId) params.append('staffId', filters.staffId);
			if (filters?.type) params.append('type', filters.type);
			if (filters?.startDate) params.append('startDate', filters.startDate);
			if (filters?.endDate) params.append('endDate', filters.endDate);

			const queryString = params.toString();
			const endpoint = queryString
				? `/time-blocks?${queryString}`
				: '/time-blocks';

			const response = await apiClient.get<TimeBlockDto[]>(endpoint);
			return (response || []).map(convertTimeBlockDtoToTimeBlock);
		},
		enabled: isQueryEnabled,
		staleTime: 15 * 60 * 1000, // P2: 15 minutes - блокировки времени меняются редко
		refetchOnMount: false, // Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Get single time block
export const useTimeBlock = (id: string) => {
	return useQuery({
		queryKey: timeBlockKeys.detail(id),
		queryFn: async (): Promise<TimeBlock> => {
			const response = await apiClient.get<TimeBlockDto>(`/time-blocks/${id}`);
			return convertTimeBlockDtoToTimeBlock(response);
		},
		enabled: !!id,
		staleTime: 2 * 60 * 1000,
	});
};

// Create time block
export const useCreateTimeBlock = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: CreateTimeBlockDto): Promise<TimeBlock> => {
			const response = await apiClient.post<TimeBlockDto>('/time-blocks', data);
			return convertTimeBlockDtoToTimeBlock(response);
		},
		onSuccess: (data) => {
			// Invalidate all time block queries
			queryClient.invalidateQueries({ queryKey: timeBlockKeys.lists() });

			// Also invalidate bookings since availability changed
			queryClient.invalidateQueries({ queryKey: ['bookings'] });

			// Show success message based on conflict action
			if (data.conflictingBookings && data.conflictingBookings.length > 0) {
				if (data.conflictAction === 'CANCEL') {
					toast.success(
						`Time blocked successfully. ${data.conflictingBookings.length} conflicting booking(s) have been cancelled and clients notified.`
					);
				} else {
					toast.success(
						`Time blocked successfully. Note: ${data.conflictingBookings.length} existing booking(s) remain scheduled during this time.`,
						{ duration: 5000 }
					);
				}
			} else {
				toast.success('Time blocked successfully');
			}
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to block time');
		},
	});
};

// Update time block
export const useUpdateTimeBlock = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: UpdateTimeBlockDto;
		}): Promise<TimeBlock> => {
			const response = await apiClient.put<TimeBlockDto>(
				`/time-blocks/${id}`,
				data
			);
			return convertTimeBlockDtoToTimeBlock(response);
		},
		onSuccess: (_, variables) => {
			// Invalidate specific time block
			queryClient.invalidateQueries({
				queryKey: timeBlockKeys.detail(variables.id),
			});
			// Invalidate all time block lists
			queryClient.invalidateQueries({ queryKey: timeBlockKeys.lists() });
			// Invalidate bookings
			queryClient.invalidateQueries({ queryKey: ['bookings'] });

			toast.success('Time block updated successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update time block');
		},
	});
};

// Delete time block
export const useDeleteTimeBlock = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/time-blocks/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.invalidateQueries({ queryKey: timeBlockKeys.lists() });
			queryClient.removeQueries({ queryKey: timeBlockKeys.detail(id) });
			// Invalidate bookings
			queryClient.invalidateQueries({ queryKey: ['bookings'] });

			toast.success('Time block removed successfully');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to remove time block');
		},
	});
};

// Check for conflicts (doesn't create block, just checks)
export const useCheckTimeBlockConflicts = () => {
	return useMutation({
		mutationFn: async (data: CreateTimeBlockDto): Promise<TimeBlockDto> => {
			const response = await apiClient.post<TimeBlockDto>(
				'/time-blocks/check-conflicts',
				data
			);
			return response;
		},
	});
};
