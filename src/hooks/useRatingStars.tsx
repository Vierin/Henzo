'use client';

import { useCallback, type CSSProperties } from 'react';
import { Star } from 'lucide-react';

/**
 * Half-star gradient rating row (Henzo coral). Replaces duplicated renderStars across review UIs.
 */
export function useRatingStars(size: number = 16) {
	return useCallback(
		(rating: number) =>
			Array.from({ length: 5 }, (_, i) => {
				const starIndex = i + 1;
				let starClass = 'text-gray-300';
				let style: CSSProperties = {};

				if (starIndex <= Math.floor(rating)) {
					starClass = 'text-[#ff5b5b] fill-[#ff5b5b]';
				} else if (starIndex - 0.5 <= rating && rating < starIndex) {
					starClass = 'text-gray-300';
					style = {
						background: 'linear-gradient(90deg, #ff5b5b 50%, transparent 50%)',
						WebkitBackgroundClip: 'text',
						WebkitTextFillColor: 'transparent',
						backgroundClip: 'text',
					};
				}

				return (
					<Star
						key={i}
						size={size}
						className={starClass}
						style={style}
						aria-hidden="true"
					/>
				);
			}),
		[size]
	);
}
