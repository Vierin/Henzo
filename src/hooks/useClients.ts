import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuth } from '@/lib/auth-unified';

export interface Client {
	id: string;
	name: string | null;
	email: string;
	phone: string | null;
	createdAt: string;
	totalSpent: number;
	visitCount: number;
	lastVisit: Date | null;
	completedVisits: number;
}

export interface ClientsResponse {
	data: Client[];
	pagination: {
		page: number;
		limit: number;
		total: number;
		totalPages: number;
		hasNextPage: boolean;
		hasPreviousPage: boolean;
	};
}

export interface ClientDetails extends Client {
	bookings: Array<{
		id: string;
		dateTime: string;
		status: string;
		notes: string | null;
		createdAt: string;
		Service: {
			id: string;
			name: string;
			price: number;
			duration: number;
		};
		Staff: {
			id: string;
			name: string;
		} | null;
		Salon: {
			id: string;
			name: string;
		};
	}>;
}

export interface ClientNote {
	id: string;
	salonId: string;
	userId: string;
	note: string;
	createdAt: string;
	updatedAt: string;
}

export const clientKeys = {
	all: ['clients'] as const,
	lists: () => [...clientKeys.all, 'list'] as const,
	list: (filters: Record<string, unknown>) =>
		[...clientKeys.lists(), filters] as const,
	details: () => [...clientKeys.all, 'detail'] as const,
	detail: (id: string) => [...clientKeys.details(), id] as const,
	bookings: (id: string) => [...clientKeys.detail(id), 'bookings'] as const,
	notes: (id: string) => [...clientKeys.detail(id), 'notes'] as const,
};

export const useClients = (search?: string, page: number = 1) => {
	const { user, isLoading: authLoading, isOwner } = useAuth();

	return useQuery({
		queryKey: clientKeys.list({ search, page }),
		queryFn: async (): Promise<ClientsResponse> => {
			if (!user || !isOwner()) {
				throw new Error(
					'Unauthorized: Only salon owners can access this endpoint'
				);
			}

			const params = new URLSearchParams();
			if (search) params.append('search', search);
			params.append('page', page.toString());
			params.append('limit', '50');

			const endpoint = `/clients?${params.toString()}`;

			const response = await apiClient.get<ClientsResponse>(endpoint);
			return response || { data: [], pagination: { page: 1, limit: 50, total: 0, totalPages: 0, hasNextPage: false, hasPreviousPage: false } };
		},
		enabled: !authLoading && !!user && isOwner(),
		staleTime: 2 * 60 * 1000,
	});
};

export const useClient = (clientId: string | null) => {
	const { user, isLoading: authLoading, isOwner } = useAuth();

	return useQuery({
		queryKey: clientKeys.detail(clientId || ''),
		queryFn: async (): Promise<ClientDetails> => {
			if (!user || !isOwner() || !clientId) {
				throw new Error(
					'Unauthorized: Only salon owners can access this endpoint'
				);
			}

			const response = await apiClient.get<ClientDetails>(`/clients/${clientId}`);
			return response;
		},
		enabled: !authLoading && !!user && isOwner() && !!clientId,
		staleTime: 2 * 60 * 1000,
	});
};

export const useClientNotes = (clientId: string | null) => {
	const { user, isLoading: authLoading, isOwner } = useAuth();

	return useQuery({
		queryKey: clientKeys.notes(clientId || ''),
		queryFn: async (): Promise<ClientNote[]> => {
			if (!user || !isOwner() || !clientId) {
				throw new Error(
					'Unauthorized: Only salon owners can access this endpoint'
				);
			}

			const response = await apiClient.get<ClientNote[]>(
				`/clients/${clientId}/notes`
			);
			return response || [];
		},
		enabled: !authLoading && !!user && isOwner() && !!clientId,
		staleTime: 1 * 60 * 1000,
	});
};

export const useCreateClientNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			clientId,
			salonId,
			note,
		}: {
			clientId: string;
			salonId: string;
			note: string;
		}) => {
			return apiClient.post<ClientNote>(`/clients/${clientId}/notes`, {
				salonId,
				note,
			});
		},
		onSuccess: (_, variables) => {
			queryClient.invalidateQueries({
				queryKey: clientKeys.notes(variables.clientId),
			});
		},
	});
};

export const useUpdateClientNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async ({
			noteId,
			note,
		}: {
			noteId: string;
			note: string;
		}) => {
			return apiClient.put<ClientNote>(`/clients/notes/${noteId}`, { note });
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: clientKeys.all });
		},
	});
};

export const useDeleteClientNote = () => {
	const queryClient = useQueryClient();

	return useMutation({
		mutationFn: async (noteId: string) => {
			return apiClient.delete(`/clients/notes/${noteId}`);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: clientKeys.all });
		},
	});
};

