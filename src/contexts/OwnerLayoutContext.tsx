'use client';

import React, { createContext, useContext, ReactNode } from 'react';
import { useSalonId } from '@/hooks/useSalon';
import { useRouter, usePathname } from 'next/navigation';
import { useEffect } from 'react';
import LoadingSpinner from '@/components/LoadingSpinner';
import { useTranslation } from '@/contexts/LanguageContext';

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
	const pathname = usePathname();
	const t = useTranslation();
	// Используем только useSalonId - он уже использует useSalon с правильным кешированием
	// useCurrentUserSalon больше не нужен, т.к. данные уже есть в useSalon
	const { salonId, salon, isLoading: salonLoading, hasSalon } = useSalonId();

	const isLoading = salonLoading;

	// Получаем путь без локали
	const pathNoLocale = pathname.replace(/^\/[a-z]{2}/, '') || pathname;
	const isOnCompleteSetupPage = pathNoLocale.includes('/business/complete-setup');
	const isOnSalonInfoPage = pathNoLocale.includes('/salon-info');

	// Handle redirect if no salon exists (но только если мы не на странице настройки)
	useEffect(() => {
		// Не делаем редирект, пока идет загрузка
		if (salonLoading) {
			return;
		}

		// Не делаем редирект, если мы уже на странице настройки салона
		if (isOnCompleteSetupPage || isOnSalonInfoPage) {
			return;
		}

		// Редиректим только если салона нет и мы не на странице настройки
		if (!hasSalon) {
			router.push('/business/complete-setup');
		}
	}, [hasSalon, salonLoading, router, isOnCompleteSetupPage, isOnSalonInfoPage]);

	const value = {
		salonId,
		salonData: salon, // Используем данные из useSalon
		isLoading,
		hasSalon,
	};

	// Показываем лоадер, пока идет проверка салона (и мы не на странице настройки)
	if (isLoading && !isOnCompleteSetupPage && !isOnSalonInfoPage) {
		return (
			<div className="flex items-center justify-center min-h-screen bg-[#fff7f6]">
				<div className="text-center">
					<LoadingSpinner size="lg" />
					<p className="mt-4 text-gray-600 text-sm">{t('owner.loadingSalonInformation')}</p>
				</div>
			</div>
		);
	}

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
