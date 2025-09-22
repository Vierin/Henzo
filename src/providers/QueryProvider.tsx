'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

interface QueryProviderProps {
	children: ReactNode;
}

export default function QueryProvider({ children }: QueryProviderProps) {
	const [queryClient] = useState(
		() =>
			new QueryClient({
				defaultOptions: {
					queries: {
						// Время, в течение которого данные считаются "свежими"
						staleTime: 5 * 60 * 1000, // 5 минут
						// Время хранения неиспользуемых данных в кэше
						gcTime: 10 * 60 * 1000, // 10 минут
						// Количество повторных попыток при ошибке
						retry: 2,
						// Задержка между повторными попытками
						retryDelay: 1000,
						// Не рефетчить данные при фокусе окна
						refetchOnWindowFocus: false,
					},
				},
			})
	);

	return (
		<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
	);
}
