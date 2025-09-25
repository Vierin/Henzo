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
}

export default function SalonImage({
	src,
	alt,
	width,
	height,
	className = '',
	placeholder = '💇‍♀️',
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

	const getPublicUrl = (filePath: string) => {
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(filePath);
		return data.publicUrl;
	};

	return (
		<Image
			src={getPublicUrl(src)}
			alt={alt}
			width={width}
			height={height}
			className={className}
			onError={() => setImageError(true)}
		/>
	);
}
