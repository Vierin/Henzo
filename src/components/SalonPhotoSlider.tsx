'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

interface SalonPhotoSliderProps {
	photos: string[];
	logo?: string;
	salonName: string;
}

export default function SalonPhotoSlider({
	photos,
	logo,
	salonName,
}: SalonPhotoSliderProps) {
	const [currentIndex, setCurrentIndex] = useState(0);
	const [isAutoPlaying, setIsAutoPlaying] = useState(true);

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
	const allImages: Array<{ url: string; type: string; isExternal: boolean }> =
		[];
	if (photos && photos.length > 0) {
		photos.forEach((photo) => {
			allImages.push({
				url: getImageSrc(photo),
				type: 'photo',
				isExternal: isExternalUrl(photo),
			});
		});
	}

	// Функции навигации
	const nextSlide = () => {
		setIsAutoPlaying(false);
		setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
	};

	const prevSlide = () => {
		setIsAutoPlaying(false);
		setCurrentIndex((prevIndex) =>
			prevIndex === 0 ? allImages.length - 1 : prevIndex - 1
		);
	};

	const goToSlide = (index: number) => {
		setIsAutoPlaying(false);
		setCurrentIndex(index);
	};

	// Добавляем клавиатурную навигацию и автопрокрутку
	useEffect(() => {
		const handleKeyPress = (event: KeyboardEvent) => {
			if (event.key === 'ArrowLeft') {
				setIsAutoPlaying(false);
				prevSlide();
			} else if (event.key === 'ArrowRight') {
				setIsAutoPlaying(false);
				nextSlide();
			}
		};

		document.addEventListener('keydown', handleKeyPress);
		return () => {
			document.removeEventListener('keydown', handleKeyPress);
		};
	}, [allImages.length]);

	// Автопрокрутка (только если больше одного изображения)
	useEffect(() => {
		if (allImages.length <= 1 || !isAutoPlaying) return;

		const interval = setInterval(() => {
			setCurrentIndex((prevIndex) => (prevIndex + 1) % allImages.length);
		}, 4000); // Меняем слайд каждые 4 секунды

		return () => clearInterval(interval);
	}, [allImages.length, isAutoPlaying]);

	// Если нет фотографий, показываем логотип или placeholder
	if (allImages.length === 0) {
		return (
			<div className="w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center overflow-hidden">
				{logo ? (
					<>
						<Image
							src={getImageSrc(logo)}
							alt={salonName}
							width={400}
							height={320}
							className="w-full h-full object-cover rounded-xl"
							unoptimized={isExternalUrl(logo)}
							onError={(e) => {
								e.currentTarget.style.display = 'none';
								const placeholder =
									e.currentTarget.parentElement?.querySelector(
										'.placeholder'
									) as HTMLElement;
								if (placeholder) {
									placeholder.style.display = 'flex';
								}
							}}
						/>
						<div
							className="placeholder w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center"
							style={{ display: 'none' }}
						>
							<span className="text-6xl">💇‍♀️</span>
						</div>
					</>
				) : (
					<div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center">
						<span className="text-6xl">💇‍♀️</span>
					</div>
				)}
			</div>
		);
	}

	// Если только одно изображение, показываем его без слайдера
	if (allImages.length === 1) {
		return (
			<div className="w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl overflow-hidden">
				<Image
					src={allImages[0].url}
					alt={salonName}
					width={400}
					height={320}
					className="w-full h-full object-cover rounded-xl"
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
					className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center"
					style={{ display: 'none' }}
				>
					<span className="text-6xl">💇‍♀️</span>
				</div>
			</div>
		);
	}

	// Если больше одного изображения, показываем слайдер

	return (
		<div className="relative w-full h-80 bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl overflow-hidden group">
			{/* Main Image */}
			<div className="relative w-full h-full">
				<Image
					src={allImages[currentIndex].url}
					alt={salonName}
					width={400}
					height={320}
					className="w-full h-full object-cover rounded-xl transition-opacity duration-300"
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
					className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-xl flex items-center justify-center"
					style={{ display: 'none' }}
				>
					<span className="text-6xl">💇‍♀️</span>
				</div>
			</div>

			{/* Navigation Arrows */}
			<button
				onClick={prevSlide}
				className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
				className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-200"
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
								? 'bg-white'
								: 'bg-white bg-opacity-50 hover:bg-opacity-75'
						}`}
						aria-label={`Go to image ${index + 1}`}
					/>
				))}
			</div>

			{/* Image Counter and Auto-play Toggle */}
			<div className="absolute top-4 right-4 flex items-center gap-2">
				{allImages.length > 1 && (
					<button
						onClick={() => setIsAutoPlaying(!isAutoPlaying)}
						className="bg-black bg-opacity-50 hover:bg-opacity-70 text-white p-2 rounded-full transition-opacity duration-200"
						aria-label={isAutoPlaying ? 'Pause slideshow' : 'Play slideshow'}
					>
						{isAutoPlaying ? (
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
							</svg>
						) : (
							<svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
								<path d="M8 5v14l11-7z" />
							</svg>
						)}
					</button>
				)}
				<div className="bg-black bg-opacity-50 text-white px-3 py-1 rounded-full text-sm">
					{currentIndex + 1} / {allImages.length}
				</div>
			</div>
		</div>
	);
}
