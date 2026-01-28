'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import { stripLocaleFromPath } from '@/i18n/routing';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

export default function PublicLayoutClient({
	children,
}: {
	children: React.ReactNode;
}) {
	const pathname = usePathname();
	const router = useRouter();
	const [isScrolled, setIsScrolled] = useState(false);

	const pathWithoutLocale = useMemo(
		() => stripLocaleFromPath(pathname),
		[pathname]
	);
	const shouldShowSearch =
		pathWithoutLocale.startsWith('/category/') ||
		pathWithoutLocale.startsWith('/salons') ||
		pathWithoutLocale.startsWith('/salon/');
	const isBusinessPage = pathWithoutLocale === '/business';

	// Обработка hash токенов от Supabase magic link (если пользователь попал на главную с токенами)
	useEffect(() => {
		const handleHashTokens = async () => {
			// Проверяем hash фрагмент на наличие токенов
			const hash = window.location.hash.substring(1);
			if (!hash) return;

			const hashParams = new URLSearchParams(hash);
			const accessToken = hashParams.get('access_token');
			const refreshToken = hashParams.get('refresh_token');
			const type = hashParams.get('type');

			// Если это magic link токены
			if (accessToken && refreshToken && type === 'magiclink') {
				try {
					console.log('✅ Found magic link tokens in hash, setting session...');
					
					// Устанавливаем сессию
					const { data: sessionData, error: sessionError } =
						await supabase.auth.setSession({
							access_token: accessToken,
							refresh_token: refreshToken,
						});

					if (sessionError) {
						console.error('❌ Failed to set session from hash:', sessionError);
						// Очищаем hash и продолжаем
						window.history.replaceState(null, '', pathname);
						return;
					}

					if (sessionData?.session) {
						console.log('✅ Session set successfully from hash tokens');
						
						// Проверяем роль пользователя для редиректа
						const userRole = sessionData.session.user.app_metadata?.role || 
							sessionData.session.user.user_metadata?.role;
						
						// Очищаем hash из URL
						window.history.replaceState(null, '', pathname);
						
						// Редиректим в зависимости от роли
						if (userRole === 'OWNER') {
							router.push('/business/complete-setup');
						} else if (userRole === 'CLIENT') {
							router.push('/dashboard');
						} else {
							// Обновляем страницу для применения изменений
							router.refresh();
						}
					}
				} catch (error) {
					console.error('❌ Error handling hash tokens:', error);
					// Очищаем hash при ошибке
					window.history.replaceState(null, '', pathname);
				}
			}
		};

		handleHashTokens();
	}, [pathname, router]);

	useEffect(() => {
		const handleScroll = () => {
			setIsScrolled(window.scrollY > 50);
		};
		window.addEventListener('scroll', handleScroll);
		return () => window.removeEventListener('scroll', handleScroll);
	}, []);

	return (
		<div className={`min-h-screen ${!isBusinessPage ? 'bg-[#fff7f6]' : ''}`}>
			{!isBusinessPage && <PublicHeader />}
			<main>
				{children}
			</main>
		</div>
	);
}

