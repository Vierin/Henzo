'use client';

import { useState } from 'react';

interface SalonLogoProps {
	logo?: string;
	name: string;
	className?: string;
}

export default function SalonLogo({
	logo,
	name,
	className = 'h-12 w-12',
}: SalonLogoProps) {
	const [imageError, setImageError] = useState(false);
	const [imageLoaded, setImageLoaded] = useState(false);

	// Функция для получения правильного URL изображения
	const getImageUrl = (logoPath: string) => {
		if (!logoPath) return null;

		// Если это уже полный URL (http/https), используем как есть
		if (logoPath.startsWith('http')) {
			return logoPath;
		}

		// Если это путь к файлу в Supabase Storage
		if (logoPath.startsWith('salons/') || logoPath.includes('supabase')) {
			// Предполагаем, что это Supabase Storage URL
			return logoPath;
		}

		// Для относительных путей, добавляем базовый URL
		return `/api/storage/${logoPath}`;
	};

	const imageUrl = logo ? getImageUrl(logo) : null;

	// Если нет логотипа или произошла ошибка загрузки
	if (!logo || imageError) {
		return (
			<div
				className={`${className} rounded-lg bg-gray-200 flex items-center justify-center`}
			>
				<span className="text-gray-400 text-lg">🏢</span>
			</div>
		);
	}

	return (
		<div className={`${className} rounded-lg overflow-hidden bg-gray-100`}>
			<img
				className="w-full h-full object-cover"
				src={imageUrl || ''}
				alt={`${name} logo`}
				onLoad={() => setImageLoaded(true)}
				onError={() => setImageError(true)}
				style={{
					display: imageLoaded ? 'block' : 'none',
					opacity: imageLoaded ? 1 : 0,
					transition: 'opacity 0.2s ease-in-out',
				}}
			/>
			{!imageLoaded && !imageError && (
				<div className="w-full h-full flex items-center justify-center">
					<div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
				</div>
			)}
		</div>
	);
}
