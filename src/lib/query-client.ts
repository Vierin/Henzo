import { QueryClient } from '@tanstack/react-query';

const defaultOptions = {
	queries: {
		staleTime: 5 * 60 * 1000,
		gcTime: 10 * 60 * 1000,
		retry: (failureCount: number, error: unknown) => {
			if (error && typeof error === 'object' && 'status' in error) {
				const status = (error as { status: number }).status;
				if (status >= 400 && status < 500) return false;
			}
			return failureCount < 3;
		},
		refetchOnWindowFocus: false,
	},
	mutations: {
		retry: (failureCount: number, error: unknown) => {
			if (error && typeof error === 'object' && 'status' in error) {
				const status = (error as { status: number }).status;
				if (status >= 400 && status < 500) return false;
			}
			return failureCount < 2;
		},
	},
};

export function makeQueryClient() {
	return new QueryClient({ defaultOptions });
}

/** @deprecated Use makeQueryClient() in QueryProvider so each tree gets its own client. */
export const queryClient = makeQueryClient();
