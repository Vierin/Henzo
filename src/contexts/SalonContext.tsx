'use client';

import React, {
	createContext,
	useContext,
	useEffect,
	useState,
	ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';

interface Salon {
	id: string;
	name: string;
	description?: string;
	address: string;
	phone: string;
	email?: string;
	website?: string;
	instagram?: string;
	logo?: string;
	photos?: string[];
	workingHours?: {
		[key: string]: {
			open: string;
			close: string;
			isOpen: boolean;
		};
	};
}

interface SalonContextType {
	salon: Salon | null;
	salonId: string | null;
	loading: boolean;
	error: string | null;
	refetchSalon: () => Promise<void>;
}

const SalonContext = createContext<SalonContextType | undefined>(undefined);

interface SalonProviderProps {
	children: ReactNode;
}

export function SalonProvider({ children }: SalonProviderProps) {
	const [salon, setSalon] = useState<Salon | null>(null);
	const [salonId, setSalonId] = useState<string | null>(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const router = useRouter();

	const fetchSalon = async () => {
		try {
			setLoading(true);
			setError(null);

			const response = await apiClient.get<{
				success: boolean;
				data?: Salon;
				message?: string;
			}>('/salons/current');

			if (response.success && response.data && response.data.id) {
				setSalon(response.data);
				setSalonId(response.data.id);
			} else {
				setSalon(null);
				setSalonId(null);
				// Перенаправляем на создание салона только если мы не на странице salon-info
				if (
					typeof window !== 'undefined' &&
					!window.location.pathname.includes('/salon-info')
				) {
					router.push('/salon-info');
				}
			}
		} catch (error) {
			setError('Failed to load salon information');
			setSalon(null);
			setSalonId(null);
			// Перенаправляем на создание салона только если мы не на странице salon-info
			if (
				typeof window !== 'undefined' &&
				!window.location.pathname.includes('/salon-info')
			) {
				router.push('/salon-info');
			}
		} finally {
			setLoading(false);
		}
	};

	const refetchSalon = async () => {
		await fetchSalon();
	};

	useEffect(() => {
		fetchSalon();
	}, []);

	const value: SalonContextType = {
		salon,
		salonId,
		loading,
		error,
		refetchSalon,
	};

	return (
		<SalonContext.Provider value={value}>{children}</SalonContext.Provider>
	);
}

export function useSalon() {
	const context = useContext(SalonContext);
	if (context === undefined) {
		throw new Error('useSalon must be used within a SalonProvider');
	}
	return context;
}
