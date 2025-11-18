'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSalonId } from '@/hooks/useSalon';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface OwnerLayoutContextType {
	salonId: string | null;
	salonData: any;
	isLoading: boolean;
	hasSalon: boolean;
}

const OwnerLayoutContext = createContext<OwnerLayoutContextType | undefined>(
	undefined
);

interface OwnerLayoutProviderProps {
	children: ReactNode;
}

export function OwnerLayoutProvider({ children }: OwnerLayoutProviderProps) {
	const router = useRouter();
	// Используем только useSalonId - он уже использует useSalon с правильным кешированием
	// useCurrentUserSalon больше не нужен, т.к. данные уже есть в useSalon
	const { salonId, salon, isLoading: salonLoading, hasSalon } = useSalonId();

	const isLoading = salonLoading;

	// Handle redirect if no salon exists
	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router]);

	const value = {
		salonId,
		salonData: salon, // Используем данные из useSalon
		isLoading,
		hasSalon,
	};

	return (
		<OwnerLayoutContext.Provider value={value}>
			{children}
		</OwnerLayoutContext.Provider>
	);
}

export function useOwnerLayout() {
	const context = useContext(OwnerLayoutContext);
	if (context === undefined) {
		throw new Error(
			'useOwnerLayout must be used within an OwnerLayoutProvider'
		);
	}
	return context;
}
