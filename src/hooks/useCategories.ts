import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { Service } from '@/types';

export interface Category {
	id: string;
	name: string;
	salonId: string;
	createdAt: string;
	services?: Service[];
}

// Query keys
export const categoryKeys = {
	all: ['categories'] as const,
	lists: () => [...categoryKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...categoryKeys.lists(), filters] as const,
	details: () => [...categoryKeys.all, 'detail'] as const,
	detail: (id: string) => [...categoryKeys.details(), id] as const,
	bySalon: (salonId: string) =>
		[...categoryKeys.all, 'salon', salonId] as const,
};

// Get all categories for a salon
export const useCategoriesBySalon = (salonId: string) => {
	return useQuery({
		queryKey: categoryKeys.bySalon(salonId),
		queryFn: async (): Promise<Category[]> => {
			const response = await apiClient.get<Category[]>(
				`/categories?salonId=${salonId}`
			);
			return response || [];
		},
		enabled: !!salonId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Get single category
export const useCategory = (id: string) => {
	return useQuery({
		queryKey: categoryKeys.detail(id),
		queryFn: async (): Promise<Category> => {
			return apiClient.get<Category>(`/categories/${id}`);
		},
		enabled: !!id,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};

// Create category mutation
export const useCreateCategory = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (data: {
			name: string;
			salonId: string;
		}): Promise<Category> => {
			return apiClient.post<Category>('/categories', data);
		},
		onSuccess: (data) => {
			// Invalidate categories lists for the salon
			queryClient.invalidateQueries({
				queryKey: categoryKeys.bySalon(data.salonId),
			});
			toast.success('Category created successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to create category');
		},
	});
};

// Update category mutation
export const useUpdateCategory = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: string;
			data: {
				name?: string;
			};
		}): Promise<Category> => {
			return apiClient.put<Category>(`/categories/${id}`, data);
		},
		onSuccess: (data, variables) => {
			// Update the specific category in cache
			queryClient.setQueryData(categoryKeys.detail(variables.id), data);
			// Invalidate lists for the salon
			queryClient.invalidateQueries({
				queryKey: categoryKeys.bySalon(data.salonId),
			});
			toast.success('Category updated successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to update category');
		},
	});
};

// Delete category mutation
export const useDeleteCategory = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (id: string): Promise<void> => {
			await apiClient.delete(`/categories/${id}`);
		},
		onSuccess: (_, id) => {
			// Remove from cache
			queryClient.removeQueries({ queryKey: categoryKeys.detail(id) });
			// Invalidate all category lists
			queryClient.invalidateQueries({ queryKey: categoryKeys.lists() });
			toast.success('Category deleted successfully!');
		},
		onError: (error: Error) => {
			toast.error(error.message || 'Failed to delete category');
		},
	});
};
