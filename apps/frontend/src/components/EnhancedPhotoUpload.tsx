'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Image from 'next/image';
import { useTranslation } from '@/contexts/LanguageContext';
import { convertImageToWebp } from '@/utils/image-upload';

interface EnhancedPhotoUploadProps {
	photos: string[];
	onPhotosChange: (photos: string[]) => void;
	maxPhotos?: number;
	maxSize?: number; // in MB
	disabled?: boolean;
}

export default function EnhancedPhotoUpload({
	photos,
	onPhotosChange,
	maxPhotos = 3,
	maxSize = 2,
	disabled = false,
}: EnhancedPhotoUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const t = useTranslation();

	const uploadPhoto = async (file: File) => {
		if (photos.length >= maxPhotos) {
			toast.error(`Maximum ${maxPhotos} photos allowed`);
			return;
		}

		const processedFile = await convertImageToWebp(file, 1400);

		if (processedFile.size > maxSize * 1024 * 1024) {
			toast.error(
				`${t('common.photoSizeMustBeLessThan') || 'Photo size must be less than'} ${maxSize}MB`
			);
			return;
		}

		setIsUploading(true);
		const uploadToast = toast.loading('Uploading photo...');

		try {
			// Generate unique filename
			const fileExt = processedFile.name.split('.').pop() || 'webp';
			const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
			const filePath = `salon-photos/${fileName}`;

			// Upload to Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from('salon-files')
				.upload(filePath, processedFile);

			if (uploadError) {
				throw uploadError;
			}

			toast.success(
				t('common.photoUploadedSuccessfully') || 'Photo uploaded successfully!',
				{ id: uploadToast }
			);
			onPhotosChange([...photos, filePath]);
		} catch (error: unknown) {
			console.error('Upload error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to upload photo',
				{
					id: uploadToast,
				}
			);
		} finally {
			setIsUploading(false);
		}
	};


	const removePhoto = async (index: number) => {
		const photoToRemove = photos[index];
		const removeToast = toast.loading('Removing photo...');

		try {
			// Remove from Supabase Storage
			const { error } = await supabase.storage
				.from('salon-files')
				.remove([photoToRemove]);

			if (error) {
				throw error;
			}

			// Remove from array
			const newPhotos = photos.filter((_, i) => i !== index);
			onPhotosChange(newPhotos);
			toast.success('Photo removed successfully!', { id: removeToast });
		} catch (error: unknown) {
			console.error('Remove error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Failed to remove photo',
				{
					id: removeToast,
				}
			);
		}
	};

	const setAsCoverPhoto = (index: number) => {
		if (index <= 0 || index >= photos.length) {
			return;
		}

		const selectedPhoto = photos[index];
		const reorderedPhotos = [
			selectedPhoto,
			...photos.filter((_, photoIndex) => photoIndex !== index),
		];

		onPhotosChange(reorderedPhotos);
		toast.success(
			t('owner.salonInfo.coverPhotoUpdated') || 'Cover photo updated'
		);
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		if (!disabled && photos.length < maxPhotos) {
			setIsDragging(true);
		}
	};

	const handleDragLeave = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);
	};

	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragging(false);

		if (disabled || photos.length >= maxPhotos) return;

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			uploadPhoto(files[0]);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			uploadPhoto(files[0]);
		}
	};


	const getImageSrc = (photo: string) => {
		// Get the public URL from Supabase
		const { data } = supabase.storage.from('salon-files').getPublicUrl(photo);
		return data.publicUrl;
	};

	return (
		<div className="space-y-4">
			{/* Upload Area */}
			{photos.length < maxPhotos && (
				<div className="space-y-3">
					{/* File Upload Area */}
					<div
						className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
							isDragging
								? 'border-[#ff5b5b] bg-red-50'
								: 'border-gray-300 hover:border-gray-400'
						} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
						onDragOver={handleDragOver}
						onDragLeave={handleDragLeave}
						onDrop={handleDrop}
						onClick={() =>
							!disabled && document.getElementById('photo-upload')?.click()
						}
					>
						<input
							id="photo-upload"
							type="file"
							accept="image/*"
							onChange={handleFileSelect}
							className="hidden"
							disabled={disabled}
						/>

						{isUploading ? (
							<div className="space-y-2">
								<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b] mx-auto"></div>
								<p className="text-sm text-gray-600">Uploading...</p>
							</div>
						) : (
							<div className="space-y-2">
								<svg
									className="mx-auto h-8 w-8 text-gray-400"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
									/>
								</svg>
								<p className="text-sm text-gray-600">
									Click or drag and drop photos here
								</p>
								<p className="text-xs text-gray-500">
									Max {maxPhotos} photos, {maxSize}MB each
								</p>
							</div>
						)}
					</div>
				</div>
			)}

			{/* Photo Grid */}
			{photos.length > 0 && (
				<div className="grid grid-cols-3 gap-4">
					{photos.map((photo, index) => (
						<div key={index} className="relative group">
							<Image
								src={getImageSrc(photo)}
								alt={`Salon photo ${index + 1}`}
								width={640}
								height={480}
								className="w-full aspect-[4/3] object-cover rounded-lg"
								loading="lazy"
								sizes="(max-width: 768px) 30vw, 360px"
								quality={95}
							/>
							{index === 0 && (
								<span className="absolute top-2 left-2 rounded-md bg-black/70 px-2 py-1 text-xs font-medium text-white">
									{t('owner.salonInfo.coverPhoto') || 'Cover photo'}
								</span>
							)}
							{!disabled && index > 0 && (
								<div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
									<button
										type="button"
										onClick={() => setAsCoverPhoto(index)}
										className="rounded-md bg-white px-3 py-1.5 text-xs font-semibold text-gray-900 shadow-sm hover:bg-gray-100"
									>
										{t('owner.salonInfo.makeCoverPhoto') ||
											'Make cover photo'}
									</button>
								</div>
							)}
							{!disabled && (
								<button
									type="button"
									onClick={() => removePhoto(index)}
									className="absolute top-2 right-2 p-1 bg-red-400 !text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
								>
									<svg
										className="h-4 w-4"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M6 18L18 6M6 6l12 12"
										/>
									</svg>
								</button>
							)}
						</div>
					))}
				</div>
			)}

			{/* Progress indicator */}
			{photos.length > 0 && (
				<p className="text-sm text-gray-500 text-center font-medium">
					{photos.length} / {maxPhotos}  
				</p>
			)}
		</div>
	);
}
