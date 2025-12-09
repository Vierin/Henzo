'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';
import Image from 'next/image';

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
	const [showUrlInput, setShowUrlInput] = useState(false);
	const [urlInput, setUrlInput] = useState('');
	const [isValidatingUrl, setIsValidatingUrl] = useState(false);

	const uploadPhoto = async (file: File) => {
		if (photos.length >= maxPhotos) {
			toast.error(`Maximum ${maxPhotos} photos allowed`);
			return;
		}

		if (file.size > maxSize * 1024 * 1024) {
			toast.error(`Photo size must be less than ${maxSize}MB`);
			return;
		}

		setIsUploading(true);
		const uploadToast = toast.loading('Uploading photo...');

		try {
			// Generate unique filename
			const fileExt = file.name.split('.').pop();
			const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
			const filePath = `salon-photos/${fileName}`;

			// Upload to Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from('salon-files')
				.upload(filePath, file);

			if (uploadError) {
				throw uploadError;
			}

			toast.success('Photo uploaded successfully!', { id: uploadToast });
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

	const addPhotoUrl = async (url: string) => {
		if (photos.length >= maxPhotos) {
			toast.error(`Maximum ${maxPhotos} photos allowed`);
			return;
		}

		setIsValidatingUrl(true);
		const validateToast = toast.loading('Validating image URL...');

		try {
			// Validate URL format
			const urlObj = new URL(url);
			if (!['http:', 'https:'].includes(urlObj.protocol)) {
				throw new Error('Invalid URL protocol');
			}

			// Check if URL is an image by trying to load it
			const img = document.createElement('img');
			img.crossOrigin = 'anonymous';

			await new Promise((resolve, reject) => {
				img.onload = () => resolve(null);
				img.onerror = () => reject(new Error('Invalid image URL'));
				img.src = url;
			});

			toast.success('Image URL added successfully!', { id: validateToast });
			onPhotosChange([...photos, url]);
			setUrlInput('');
			setShowUrlInput(false);
		} catch (error: unknown) {
			console.error('URL validation error:', error);
			toast.error(
				error instanceof Error ? error.message : 'Invalid image URL',
				{
					id: validateToast,
				}
			);
		} finally {
			setIsValidatingUrl(false);
		}
	};

	const removePhoto = async (index: number) => {
		const photoToRemove = photos[index];
		const removeToast = toast.loading('Removing photo...');

		try {
			// Only try to remove from Supabase if it's a file path (not a URL)
			if (!photoToRemove.startsWith('http')) {
				const { error } = await supabase.storage
					.from('salon-files')
					.remove([photoToRemove]);

				if (error) {
					throw error;
				}
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

	const handleUrlSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		if (urlInput.trim()) {
			addPhotoUrl(urlInput.trim());
		}
	};

	const getImageSrc = (photo: string) => {
		// If it's a URL, return it directly
		if (photo.startsWith('http')) {
			return photo;
		}
		// If it's a file path, get the public URL from Supabase
		const { data } = supabase.storage.from('salon-files').getPublicUrl(photo);
		return data.publicUrl;
	};

	const isUrl = (photo: string) => {
		return photo.startsWith('http');
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

					{/* URL Input Section */}
					<div className="border-t border-gray-200 pt-3">
						{!showUrlInput ? (
							<button
								type="button"
								onClick={() => setShowUrlInput(true)}
								disabled={disabled}
								className="w-full text-sm text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors disabled:opacity-50"
							>
								+ Add image from URL
							</button>
						) : (
							<form onSubmit={handleUrlSubmit} className="space-y-2">
								<div className="flex gap-2">
									<input
										type="url"
										value={urlInput}
										onChange={(e) => setUrlInput(e.target.value)}
										placeholder="Enter image URL (https://...)"
										className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm"
										disabled={disabled || isValidatingUrl}
									/>
									<button
										type="submit"
										disabled={disabled || isValidatingUrl || !urlInput.trim()}
										className="px-4 py-2 bg-[#ff5b5b] text-white rounded-md hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
									>
										{isValidatingUrl ? 'Adding...' : 'Add'}
									</button>
									<button
										type="button"
										onClick={() => {
											setShowUrlInput(false);
											setUrlInput('');
										}}
										disabled={disabled || isValidatingUrl}
										className="px-3 py-2 text-gray-500 hover:text-gray-700 transition-colors disabled:opacity-50"
									>
										Cancel
									</button>
								</div>
								<p className="text-xs text-gray-500">
									Enter a direct link to an image (JPG, PNG, GIF, etc.)
								</p>
							</form>
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
								width={100}
								height={96}
								className="w-full h-24 object-cover rounded-lg"
								loading="lazy"
								sizes="(max-width: 768px) 33vw, 100px"
								unoptimized={isUrl(photo)}
							/>
							{/* Photo type indicator */}
							<div className="absolute top-1 left-1">
								{isUrl(photo) ? (
									<span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
										URL
									</span>
								) : (
									<span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
										File
									</span>
								)}
							</div>
							{!disabled && (
								<button
									onClick={() => removePhoto(index)}
									className="absolute top-2 right-2 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
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
				<p className="text-sm text-gray-500 text-center">
					{photos.length} of {maxPhotos} photos uploaded
				</p>
			)}
		</div>
	);
}
