'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import SalonImagePlaceholder from './SalonImagePlaceholder';
import RatingBadge from './RatingBadge';
import { Salon } from '@/types';

interface SalonPhotoSliderProps {
	photos: string[];
	salonName: string;
	salon?: Salon;
}

export default function SalonPhotoSlider({
	photos,
	salonName,
	salon,
}: SalonPhotoSliderProps) {
	const [currentIndex, setCurrentIndex] = useState(0);

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

	// Показываем только фотографии салона (без логотипа)
	const allImages = useMemo(() => {
		const images: Array<{ url: string; type: string; isExternal: boolean }> =
			[];
		if (photos && photos.length > 0) {
			photos.forEach((photo) => {
				images.push({
					url: getImageSrc(photo),
					type: 'photo',
					isExternal: isExternalUrl(photo),
				});
			});
		}
		return images;
	}, [photos]);

	// Функции навигации
	const nextSlide = useCallback(() => {
		setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
	}, [allImages.length]);

	const prevSlide = useCallback(() => {
		setCurrentIndex((prevIndex) =>
			prevIndex === 0 ? allImages.length - 1 : prevIndex - 1
		);
	}, [allImages.length]);

	const goToSlide = useCallback((index: number) => {
		setCurrentIndex(index);
	}, []);

	// Добавляем клавиатурную навигацию
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				prevSlide();
			} else if (event.key === 'ArrowRight') {
				nextSlide();
			}
		};

		document.addEventListener('keydown', handleKeyPress);
		return () => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, [prevSlide, nextSlide]);

	// Если нет фотографий, показываем placeholder
	if (allImages.length === 0) {
		return (
			<div className="w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center overflow-hidden">
				<div className="w-full h-full rounded-xl overflow-hidden">
					<SalonImagePlaceholder 
						className="rounded-xl"
						showText={true}
						variant="large"
					/>
				</div>
			</div>
		);
	}

	// Если только одно изображение, показываем его без слайдера
	if (allImages.length === 1) {
		return (
			<div className="relative w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl overflow-hidden">
				<Image
					src={allImages[0].url}
					alt={salonName}
					width={400}
					height={320}
					className="w-full h-full object-cover rounded-xl"
					priority
					sizes="(max-width: 768px) 100vw, 50vw"
					unoptimized={allImages[0].isExternal}
					onError={(e) => {
						e.currentTarget.style.display = 'none';
						const nextSibling = e.currentTarget
							.nextElementSibling as HTMLElement;
						if (nextSibling) {
							nextSibling.style.display = 'flex';
						}
					}}
				/>
				<div
					className="w-full h-full rounded-xl overflow-hidden"
					style={{ display: 'none' }}
				>
					<SalonImagePlaceholder 
						className="rounded-xl"
						showText={true}
						variant="large"
					/>
				</div>
				{salon && <RatingBadge salon={salon} variant="badge" />}
			</div>
		);
	}

	// Если больше одного изображения, показываем слайдер

	return (
		<div className="relative w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl overflow-hidden group">
			{/* Rating Badge */}
			{salon && <RatingBadge salon={salon} variant="badge" />}
			{/* Main Image */}
			<div className="relative w-full h-full">
				<Image
					src={allImages[currentIndex].url}
					alt={salonName}
					width={400}
					height={320}
					className="w-full h-full object-cover rounded-xl transition-opacity duration-300"
					loading={currentIndex === 0 ? 'eager' : 'lazy'}
					sizes="(max-width: 768px) 100vw, 50vw"
					unoptimized={allImages[currentIndex].isExternal}
					onError={(e) => {
						e.currentTarget.style.display = 'none';
						const nextSibling = e.currentTarget
							.nextElementSibling as HTMLElement;
						if (nextSibling) {
							nextSibling.style.display = 'flex';
						}
					}}
				/>
				<div
					className="w-full h-full rounded-xl overflow-hidden"
					style={{ display: 'none' }}
				>
					<SalonImagePlaceholder 
						className="rounded-xl"
						showText={true}
						variant="large"
					/>
				</div>
			</div>

			{/* Navigation Arrows - Hidden on mobile */}
			<button
				onClick={prevSlide}
				className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 hidden md:block"
				aria-label="Previous image"
			>
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M15 19l-7-7 7-7"
					/>
				</svg>
			</button>

			<button
				onClick={nextSlide}
				className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-all duration-200 hidden md:block"
				aria-label="Next image"
			>
				<svg
					className="w-6 h-6"
					fill="none"
					stroke="currentColor"
					viewBox="0 0 24 24"
				>
					<path
						strokeLinecap="round"
						strokeLinejoin="round"
						strokeWidth={2}
						d="M9 5l7 7-7 7"
					/>
				</svg>
			</button>

			{/* Dots Indicator */}
			<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2">
				{allImages.map((_, index) => (
					<button
						key={index}
						onClick={() => goToSlide(index)}
						className={`w-3 h-3 rounded-full transition-colors duration-200 ${
							index === currentIndex
								? 'bg-[#ff5b5b]'
								: 'bg-white bg-opacity-50 hover:bg-opacity-75'
						}`}
						aria-label={`Go to image ${index + 1}`}
					/>
				))}
			</div>
		</div>
	);
}
