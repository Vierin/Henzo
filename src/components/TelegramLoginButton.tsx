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

	useEffect(() => {
		if (!containerRef.current || !botId) return;

		// Очищаем контейнер перед добавлением нового скрипта
		containerRef.current.innerHTML = '';

		// Создаем уникальное имя функции для каждого экземпляра компонента
		const callbackName = `onTelegramAuth_${botId}_${Date.now()}`;

		// Создаем глобальную функцию для обработки авторизации
		(window as any)[callbackName] = (user: any) => {
			console.log('📱 Telegram Widget callback called');
			console.log('📱 Raw user data:', user);
			console.log('📱 User type:', typeof user);
			console.log('📱 User keys:', user ? Object.keys(user) : 'null');
			console.log('📱 User stringified:', JSON.stringify(user, null, 2));
			
			if (!user) {
				console.error('❌ User data is null or undefined');
				return;
			}

			if (!user.id) {
				console.error('❌ User ID is missing:', user);
				return;
			}

			if (!user.hash) {
				console.error('❌ User hash is missing:', user);
				return;
			}

			if (!user.first_name) {
				console.error('❌ User first_name is missing:', user);
				return;
			}

			if (!user.auth_date) {
				console.error('❌ User auth_date is missing:', user);
				return;
			}

			console.log('✅ All required fields present, calling onAuth');
			try {
				onAuth({
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
		// Telegram Login Widget принимает как bot_id (число), так и username (строка)
		if (!botId) {
			console.error('❌ Invalid botId. botId is required');
			return;
		}

		console.log('🔧 Telegram Widget script setup:', {
			botId,
			botIdType: typeof botId,
			isNumeric: !isNaN(Number(botId)),
			callbackName,
			buttonSize,
			requestAccess,
			lang,
			currentOrigin: typeof window !== 'undefined' ? window.location.origin : 'N/A',
		});

		// Загружаем Telegram Widget скрипт
		// Важно: Telegram Login Widget НЕ использует return_to (это для OAuth)
		// Widget использует только callback функцию через data-onauth
		// Виджет автоматически определяет origin из window.location.origin
		const script = document.createElement('script');
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.setAttribute('data-telegram-login', botId);
		script.setAttribute('data-size', buttonSize);
		script.setAttribute('data-radius', cornerRadius.toString());
		script.setAttribute('data-request-access', requestAccess);
		script.setAttribute('data-userpic', usePic.toString());
		script.setAttribute('data-lang', lang);
		script.setAttribute('data-onauth', `${callbackName}(user)`);
		// НЕ добавляем origin или return_to - виджет автоматически определяет origin
		script.async = true;

		// Обработка ошибок загрузки скрипта
		script.onerror = () => {
			console.error('❌ Failed to load Telegram Widget script');
		};

		containerRef.current.appendChild(script);

		return () => {
			// Cleanup
			if (containerRef.current) {
				containerRef.current.innerHTML = '';
			}
			if ((window as any)[callbackName]) {
				delete (window as any)[callbackName];
			}
		};
	}, [botId, buttonSize, cornerRadius, requestAccess, usePic, lang, onAuth]);

	return <div ref={containerRef} />;
}

