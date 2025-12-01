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
			console.log('📱 Telegram Widget auth data:', user);
			if (user && user.id && user.hash) {
				onAuth({
					id: user.id,
					first_name: user.first_name || '',
					last_name: user.last_name,
					username: user.username,
					photo_url: user.photo_url,
					auth_date: user.auth_date,
					hash: user.hash,
				});
			} else {
				console.error('❌ Invalid Telegram auth data:', user);
			}
		};

		// Загружаем Telegram Widget скрипт
		const script = document.createElement('script');
		script.src = 'https://telegram.org/js/telegram-widget.js?22';
		script.setAttribute('data-telegram-login', botId);
		script.setAttribute('data-size', buttonSize);
		script.setAttribute('data-radius', cornerRadius.toString());
		script.setAttribute('data-request-access', requestAccess);
		script.setAttribute('data-userpic', usePic.toString());
		script.setAttribute('data-lang', lang);
		script.setAttribute('data-onauth', `${callbackName}(user)`);
		script.async = true;

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

