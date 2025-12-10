'use client';

import { useEffect, useRef } from 'react';

interface TelegramLoginButtonProps {
	botId: string;
	onAuth: (data: {
		id: number;
		first_name: string;
		last_name?: string;
		username?: string;
		photo_url?: string;
		auth_date: number;
		hash: string;
	}) => void;
	buttonSize?: 'large' | 'medium' | 'small';
	cornerRadius?: number;
	requestAccess?: 'write' | 'read';
	usePic?: boolean;
	lang?: string;
}

export default function TelegramLoginButton({
	botId,
	onAuth,
	buttonSize = 'large',
	cornerRadius = 0,
	requestAccess = 'write',
	usePic = true,
	lang = 'en',
}: TelegramLoginButtonProps) {
	const containerRef = useRef<HTMLDivElement>(null);
	const onAuthRef = useRef(onAuth);
	const scriptCreatedRef = useRef(false);
	const callbackNameRef = useRef<string | null>(null);

	// Обновляем ref при изменении onAuth, чтобы избежать пересоздания скрипта
	useEffect(() => {
		onAuthRef.current = onAuth;
	}, [onAuth]);

	useEffect(() => {
		if (!containerRef.current || !botId) return;

		// Предотвращаем повторное создание виджета (защита от StrictMode)
		if (scriptCreatedRef.current) return;

		// Очищаем контейнер перед добавлением нового скрипта
		containerRef.current.innerHTML = '';

		// Создаем уникальное имя функции для каждого экземпляра компонента
		const callbackName = `onTelegramAuth_${botId}_${Date.now()}`;
		callbackNameRef.current = callbackName;

		// Создаем глобальную функцию для обработки авторизации
		// Важно: создаем функцию ДО загрузки скрипта, чтобы она была доступна
		(window as any)[callbackName] = (user: any) => {
			if (!user) {
				console.error('❌ User data is null or undefined');
				return;
			}

			if (!user.id || !user.hash || !user.first_name || !user.auth_date) {
				console.error('❌ Missing required Telegram data:', {
					hasId: !!user.id,
					hasHash: !!user.hash,
					hasFirstName: !!user.first_name,
					hasAuthDate: !!user.auth_date,
				});
				return;
			}

			try {
				// Используем ref для получения актуальной функции onAuth
				onAuthRef.current({
					id: user.id,
					first_name: user.first_name || '',
					last_name: user.last_name,
					username: user.username,
					photo_url: user.photo_url,
					auth_date: user.auth_date,
					hash: user.hash,
				});
			} catch (error) {
				console.error('❌ Error in onAuth callback:', error);
			}
		};

		// Проверяем, что botId указан
		if (!botId) {
			console.error('❌ Invalid botId. botId is required');
			return;
		}

		// Загружаем Telegram Widget скрипт
		const script = document.createElement('script');
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.setAttribute('data-telegram-login', 'henzo_app_bot');
		script.setAttribute('data-size', buttonSize);
		script.setAttribute('data-radius', cornerRadius.toString());
		script.setAttribute('data-request-access', requestAccess);
		script.setAttribute('data-userpic', usePic.toString());
		script.setAttribute('data-lang', lang);
		script.setAttribute('data-onauth', callbackName);
		script.async = true;

		// Обработка успешной загрузки скрипта
		script.onload = () => {
			scriptCreatedRef.current = true;
		};

		// Обработка ошибок загрузки скрипта
		script.onerror = () => {
			console.error('❌ Failed to load Telegram Widget script');
			scriptCreatedRef.current = false;
		};

		// Добавляем скрипт в контейнер
		if (containerRef.current) {
			containerRef.current.appendChild(script);
		}

		return () => {
			// Cleanup
			scriptCreatedRef.current = false;
			if (containerRef.current) {
				containerRef.current.innerHTML = '';
			}
			if (callbackNameRef.current && (window as any)[callbackNameRef.current]) {
				delete (window as any)[callbackNameRef.current];
			}
		};
	}, [botId, buttonSize, cornerRadius, requestAccess, usePic, lang]);

	return <div ref={containerRef} />;
}
