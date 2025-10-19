'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSalonId } from '@/hooks/useSalon';
import { useCurrentUserSalon } from '@/hooks/useSalons';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface OwnerLayoutContextType {
	salonId: string | null;
	salonData: any;
	isLoading: boolean;
	hasSalon: boolean;
}

const OwnerLayoutContext = createContext<OwnerLayoutContextType | undefined>(undefined);

interface OwnerLayoutProviderProps {
	children: ReactNode;
}

export function OwnerLayoutProvider({ children }: OwnerLayoutProviderProps) {
	const router = useRouter();
	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();
	const { data: salonData, isLoading: salonDataLoading } = useCurrentUserSalon();

	const isLoading = salonLoading || salonDataLoading;

	// Handle redirect if no salon exists
	useEffect(() => {
		if (!salonLoading && !hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router]);

	const value = {
		salonId,
		salonData,
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
		throw new Error('useOwnerLayout must be used within an OwnerLayoutProvider');
	}
	return context;
}
