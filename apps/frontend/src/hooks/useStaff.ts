import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Staff } from '@/types';
import { toast } from 'react-hot-toast';
import { useTranslation } from '@/contexts/LanguageContext';

// Query keys
export const staffKeys = {
	all: ['staff'] as const,
	lists: () => [...staffKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...staffKeys.lists(), filters] as const,
	details: () => [...staffKeys.all, 'detail'] as const,
	detail: (id: string) => [...staffKeys.details(), id] as const,
	bySalon: (salonId: string) => [...staffKeys.all, 'salon', salonId] as const,
};

// Get all staff for a salon
export const useStaffBySalon = (salonId: string) => {
	return useQuery({
		queryKey: staffKeys.bySalon(salonId),
		queryFn: async (): Promise<Staff[]> => {
			const response = await apiClient.get<Staff[]>(
				`/staff?salonId=${salonId}`
			);
			return response || [];
		},
		enabled: !!salonId,
		staleTime: 10 * 60 * 1000, // 10 minutes - данные редко меняются
		refetchOnMount: false, // P1: Не перезапрашивать если данные свежие
		refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
	});
};

// Get single staff member
export const useStaff = (id: string) => {
	return useQuery({
		queryKey: staffKeys.detail(id),
		queryFn: async (): Promise<Staff> => {
			return apiClient.get<Staff>(`/staff/${id}`);
		},
		enabled: !!id,
		staleTime: 10 * 60 * 1000, // Важно: 10 minutes - детали сотрудника меняются редко
		gcTime: 30 * 60 * 1000, // 30 минут в кэше
	});
};

// Create staff mutation
export const useCreateStaff = () => {
	const queryClient = useQueryClient();
	const t = useTranslation();

	return useMutation({
		mutationFn: async (data: {
			name: string;
			email?: string;
			phone?: string;
			accessLevel: 'ADMIN' | 'EMPLOYEE';
			salonId: string;
			serviceIds?: string[];
		}): Promise<Staff> => {
			return apiClient.post<Staff>('/staff', data);
		},
		onSuccess: (data) => {
			// Optimistically update the cache
			const queryKey = staffKeys.bySalon(data.salonId);
			const existingStaff = queryClient.getQueryData<Staff[]>(queryKey) || [];
			queryClient.setQueryData<Staff[]>(queryKey, [...existingStaff, data]);

			// Invalidate and refetch to ensure we have the latest data
			queryClient.invalidateQueries({
				queryKey: staffKeys.bySalon(data.salonId),
			});
			queryClient.refetchQueries({
				queryKey: staffKeys.bySalon(data.salonId),
			});

			toast.success(
				t('owner.staff.createdSuccessfully') ||
					t('owner.staff.createdSucesfully') ||
					t('owner.staffNew.createdSuccessfully')
			);
		},
		onError: (error: Error) => {
			toast.error(error.message || t('owner.staffNew.failedToCreate'));
		},
	});
};

// Update staff mutation
export const useUpdateStaff = () => {
	const queryClient = useQueryClient();
	const t = useTranslation();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: {
				name?: string;
				email?: string;
				phone?: string;
				accessLevel?: 'ADMIN' | 'EMPLOYEE';
				serviceIds?: string[];
			};
		}): Promise<Staff> => {
			return apiClient.put<Staff>(`/staff/${id}`, data);
		},
		onSuccess: (data, variables) => {
			// Update the specific staff in cache
			queryClient.setQueryData(staffKeys.detail(variables.id), data);
			// Invalidate lists for the salon
			queryClient.invalidateQueries({
				queryKey: staffKeys.bySalon(data.salonId),
			});
			// Services list shows service.Staff — keep in sync when staff.Service changes
			queryClient.invalidateQueries({ queryKey: ['services'] });
			toast.success(t('owner.staffNew.updatedSuccessfully'));
		},
		onError: (error: Error) => {
			toast.error(error.message || t('owner.staffNew.failedToUpdate'));
		},
	});
};

// Delete staff mutation
export const useDeleteStaff = () => {
	const queryClient = useQueryClient();
	const t = useTranslation();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/staff/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: staffKeys.detail(id) });
			// Invalidate all staff lists
			queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
			// Services list shows service.Staff — keep in sync
			queryClient.invalidateQueries({ queryKey: ['services'] });
			toast.success(t('owner.staffNew.deletedSuccessfully'));
		},
		onError: (error: Error) => {
			toast.error(error.message || t('owner.staffNew.failedToDelete'));
		},
	});
};
