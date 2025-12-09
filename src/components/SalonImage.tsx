'use client';

import { useState } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';

interface SalonImageProps {
	src?: string;
	alt: string;
	width: number;
	height: number;
	className?: string;
	style?: React.CSSProperties;
	priority?: boolean;
	sizes?: string;
}

export default function SalonImage({
	src,
	alt,
	width,
	height,
	className = '',
	style,
	priority = false,
	sizes,
}: SalonImageProps) {
	const [imageError, setImageError] = useState(false);

	// If no src or image failed to load, show placeholder
	if (!src || imageError) {
		return (
			<div
				className={`bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center overflow-hidden ${className}`}
			>
				<Image
					src="/images/placeholder.webp"
					alt={alt || 'Salon placeholder'}
					width={width}
					height={height}
					className="w-full h-full object-cover"
					loading="lazy"
					sizes={
						sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
					}
				/>
			</div>
		);
	}

	const getImageSrc = (imageSrc: string) => {
		// If it's a URL, return it directly
		if (imageSrc.startsWith('http')) {
			return imageSrc;
		}
		// If it's a file path, get the public URL from Supabase
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(imageSrc);
		return data.publicUrl;
	};

	const isExternalUrl = (imageSrc: string) => {
		return imageSrc.startsWith('http');
	};

	return (
		<Image
			src={getImageSrc(src)}
			alt={alt}
			width={width}
			height={height}
			className={className}
			style={style}
			priority={priority}
			loading={priority ? 'eager' : 'lazy'} // P1: Lazy loading для не приоритетных
			sizes={
				sizes || '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
			} // P1: Responsive sizes
			onError={() => setImageError(true)}
			unoptimized={isExternalUrl(src)} // External URLs (Supabase) не могут быть оптимизированы Next.js
		/>
	);
}
