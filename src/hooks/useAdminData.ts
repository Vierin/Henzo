import { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

interface PaginationParams {
	page: number;
	limit: number;
	search?: string;
	sortBy?: string;
	sortOrder?: 'asc' | 'desc';
	[key: string]: any;
}

interface UseAdminDataOptions<T> {
	endpoint: string;
	initialFilters?: Partial<T>;
	staleTime?: number;
	gcTime?: number;
	enabled?: boolean;
}

export const useAdminData = <T extends Record<string, any>>({
	endpoint,
	initialFilters = {},
	staleTime = 30000, // 30 seconds
	gcTime = 5 * 60 * 1000, // 5 minutes
	enabled = true,
}: UseAdminDataOptions<T>) => {
	const [filters, setFilters] = useState<T>(initialFilters as T);
	const [pagination, setPagination] = useState({
		page: 1,
		limit: 20,
	});

	// Build query params
	const queryParams = useMemo(() => {
		const params = new URLSearchParams();
		
		// Add pagination
		params.append('page', pagination.page.toString());
		params.append('limit', pagination.limit.toString());
		
		// Add filters
		Object.entries(filters).forEach(([key, value]) => {
			if (value !== undefined && value !== null && value !== '') {
				params.append(key, value.toString());
			}
		});
		
		return params.toString();
	}, [filters, pagination]);

	const query = useQuery({
		queryKey: [endpoint, queryParams],
		queryFn: () => apiClient.get<T[]>(`${endpoint}?${queryParams}`),
		staleTime,
		gcTime,
		enabled,
	});

	const updateFilters = (newFilters: Partial<T>) => {
		setFilters(prev => ({ ...prev, ...newFilters }));
		setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
	};

	const updatePagination = (newPagination: Partial<typeof pagination>) => {
		setPagination(prev => ({ ...prev, ...newPagination }));
	};

	const resetFilters = () => {
		setFilters(initialFilters as T);
		setPagination({ page: 1, limit: 20 });
	};

	return {
		data: query.data || [],
		isLoading: query.isLoading,
		error: query.error,
		refetch: query.refetch,
		filters,
		pagination,
		updateFilters,
		updatePagination,
		resetFilters,
	};
};

export const useAdminMutation = <T, P = any>({
	endpoint,
	method = 'PUT',
	queryKeys = [],
	optimisticUpdate,
}: {
	endpoint: string;
	method?: 'PUT' | 'POST' | 'DELETE' | 'PATCH';
	queryKeys?: (string | any)[][];
	optimisticUpdate?: (oldData: any, variables: P) => any;
}) => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: (data: P) => {
			const url = typeof endpoint === 'function' ? endpoint(data as any) : endpoint;
			switch (method) {
				case 'POST':
					return apiClient.post<T>(url, data);
				case 'PUT':
					return apiClient.put<T>(url, data);
				case 'DELETE':
					return apiClient.delete<T>(url);
				case 'PATCH':
					return apiClient.patch<T>(url, data);
				default:
					return apiClient.put<T>(url, data);
			}
		},
		onMutate: optimisticUpdate ? async (variables) => {
			// Cancel outgoing refetches
			await Promise.all(
				queryKeys.map(([key]) => queryClient.cancelQueries({ queryKey: [key] }))
			);

			// Snapshot previous values
			const previousData = queryKeys.map(([key]) => ({
				key,
				data: queryClient.getQueryData([key]),
			}));

			// Optimistically update
			queryKeys.forEach(([key]) => {
				queryClient.setQueryData([key], (old: any) => optimisticUpdate(old, variables));
			});

			return { previousData };
		} : undefined,
		onError: (err, variables, context) => {
			// Rollback on error
			if (context?.previousData) {
				context.previousData.forEach(({ key, data }) => {
					queryClient.setQueryData([key], data);
				});
			}
		},
		onSettled: () => {
			// Refetch after mutation
			queryKeys.forEach(([key]) => {
				queryClient.invalidateQueries({ queryKey: [key] });
			});
		},
	});
};
