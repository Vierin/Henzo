'use client';

import { Scissors, Camera } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

interface SalonImagePlaceholderProps {
	size?: number;
	className?: string;
	showText?: boolean;
	variant?: 'small' | 'large';
}

export default function SalonImagePlaceholder({
	size,
	className = '',
	showText = false,
	variant = 'small',
}: SalonImagePlaceholderProps) {
	const t = useTranslation();
	const isLarge = variant === 'large' || showText;
	const iconSize = size ? Math.max(size * 0.35, 24) : isLarge ? 48 : 24;
	
	return (
		<div
			className={`w-full h-full bg-gradient-to-br from-[#fff7f6] via-[#ffe8e6] to-[#ffd4d1] flex flex-col items-center justify-center overflow-hidden relative ${className}`}
		>
			{/* Декоративные элементы */}
			<div className="absolute inset-0 opacity-10">
				<div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-[#ff5b5b] blur-sm"></div>
				<div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-[#ff5b5b] blur-sm"></div>
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-[#ff5b5b] blur-md"></div>
			</div>
			
			{/* Иконка */}
			{isLarge ? (
				<Camera
					size={iconSize}
					className="text-[#ff5b5b] relative z-10 mb-3"
					strokeWidth={1.5}
				/>
			) : (
				<Scissors
					size={iconSize}
					className="text-[#ff5b5b] relative z-10"
					strokeWidth={1.5}
				/>
			)}
			
			{/* Текст для больших заглушек */}
			{showText && (
				<p className="text-[#ff5b5b] text-sm font-medium text-center px-4 relative z-10">
					{t('common.photoComingSoon')}
				</p>
			)}
		</div>
	);
}

