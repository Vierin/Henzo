import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { Staff } from '@/types';
import { toast } from 'react-hot-toast';

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
		staleTime: 5 * 60 * 1000, // 5 minutes
		refetchOnMount: 'always', // Перезапрашивать при монтировании если данные устарели
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
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Create staff mutation
export const useCreateStaff = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			name: string;
			email?: string;
			phone?: string;
			accessLevel: 'ADMIN' | 'EMPLOYEE';
			salonId: string;
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
			
			toast.success('Staff member created successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create staff member');
		},
	});
};

// Update staff mutation
export const useUpdateStaff = () => {
	const queryClient = useQueryClient();

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
			toast.success('Staff member updated successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update staff member');
		},
	});
};

// Delete staff mutation
export const useDeleteStaff = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/staff/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: staffKeys.detail(id) });
			// Invalidate all staff lists
			queryClient.invalidateQueries({ queryKey: staffKeys.lists() });
			toast.success('Staff member deleted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete staff member');
		},
	});
};
