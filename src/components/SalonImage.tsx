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
	placeholder?: string;
	style?: React.CSSProperties;
}

export default function SalonImage({
	src,
	alt,
	width,
	height,
	className = '',
	placeholder = '💇‍♀️',
	style,
}: SalonImageProps) {
	const [imageError, setImageError] = useState(false);

	// If no src or image failed to load, show placeholder
	if (!src || imageError) {
		return (
			<div
				className={`bg-gradient-to-br from-pink-100 to-pink-200 flex items-center justify-center ${className}`}
			>
				<span className="text-4xl">{placeholder}</span>
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
			onError={() => setImageError(true)}
			unoptimized={isExternalUrl(src)} // Don't optimize external URLs
		/>
	);
}
