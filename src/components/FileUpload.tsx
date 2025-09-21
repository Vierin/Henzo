'use client';

import { useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import toast from 'react-hot-toast';

interface FileUploadProps {
	onUpload: (filePath: string) => void;
	onRemove?: () => void;
	currentFile?: string;
	accept?: string;
	maxSize?: number; // in MB
	className?: string;
	placeholder?: string;
	disabled?: boolean;
}

export default function FileUpload({
	onUpload,
	onRemove,
	currentFile,
	accept = 'image/*',
	maxSize = 2,
	className = '',
	placeholder = 'Click or drag and drop files here',
	disabled = false,
}: FileUploadProps) {
	const [isDragging, setIsDragging] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const uploadFile = async (file: File) => {
		if (file.size > maxSize * 1024 * 1024) {
			toast.error(`File size must be less than ${maxSize}MB`);
			return;
		}

		setIsUploading(true);
		const uploadToast = toast.loading('Uploading file...');

		try {
			// Generate unique filename
			const fileExt = file.name.split('.').pop();
			const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
			const filePath = `salon-uploads/${fileName}`;

			// Upload to Supabase Storage
			const { error: uploadError } = await supabase.storage
				.from('salon-files')
				.upload(filePath, file);

			if (uploadError) {
				throw uploadError;
			}

			// Get public URL
			const { data } = supabase.storage
				.from('salon-files')
				.getPublicUrl(filePath);

			toast.success('File uploaded successfully!', { id: uploadToast });
			onUpload(filePath); // Pass the file path, not the URL
		} catch (error: any) {
			console.error('Upload error:', error);
			toast.error(error.message || 'Failed to upload file', {
				id: uploadToast,
			});
		} finally {
			setIsUploading(false);
		}
	};

	const removeFile = async () => {
		if (!currentFile) return;

		const removeToast = toast.loading('Removing file...');

		try {
			// Remove from Supabase Storage
			const { error } = await supabase.storage
				.from('salon-files')
				.remove([currentFile]);

			if (error) {
				throw error;
			}

			toast.success('File removed successfully!', { id: removeToast });
			onRemove?.();
		} catch (error: any) {
			console.error('Remove error:', error);
			toast.error(error.message || 'Failed to remove file', {
				id: removeToast,
			});
		}
	};

	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		if (!disabled) {
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

		if (disabled) return;

		const files = Array.from(e.dataTransfer.files);
		if (files.length > 0) {
			uploadFile(files[0]);
		}
	};

	const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
		const files = e.target.files;
		if (files && files.length > 0) {
			uploadFile(files[0]);
		}
	};

	const getPublicUrl = (filePath: string) => {
		const { data } = supabase.storage
			.from('salon-files')
			.getPublicUrl(filePath);
		return data.publicUrl;
	};

	return (
		<div className={`space-y-4 ${className}`}>
			{/* Upload Area */}
			<div
				className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
					isDragging
						? 'border-[#ff5b5b] bg-red-50'
						: 'border-gray-300 hover:border-gray-400'
				} ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
				onDragOver={handleDragOver}
				onDragLeave={handleDragLeave}
				onDrop={handleDrop}
				onClick={() => !disabled && fileInputRef.current?.click()}
			>
				<input
					ref={fileInputRef}
					type="file"
					accept={accept}
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
								d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
							/>
						</svg>
						<p className="text-sm text-gray-600">{placeholder}</p>
						<p className="text-xs text-gray-500">Max size: {maxSize}MB</p>
					</div>
				)}
			</div>

			{/* Current File Preview */}
			{currentFile && (
				<div className="relative">
					<div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
						<div className="flex-shrink-0">
							{accept.includes('image') ? (
								<img
									src={getPublicUrl(currentFile)}
									alt="Preview"
									className="h-16 w-16 object-cover rounded-lg"
								/>
							) : (
								<div className="h-16 w-16 bg-gray-200 rounded-lg flex items-center justify-center">
									<svg
										className="h-8 w-8 text-gray-400"
										fill="none"
										viewBox="0 0 24 24"
										stroke="currentColor"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
										/>
									</svg>
								</div>
							)}
						</div>
						<div className="flex-1 min-w-0">
							<p className="text-sm font-medium text-gray-900 truncate">
								{currentFile.split('/').pop()}
							</p>
							<p className="text-sm text-gray-500">
								{accept.includes('image') ? 'Image file' : 'File'}
							</p>
						</div>
						{!disabled && (
							<button
								onClick={(e) => {
									e.stopPropagation();
									removeFile();
								}}
								className="flex-shrink-0 p-2 text-red-600 hover:text-red-800 hover:bg-red-100 rounded-lg transition-colors"
							>
								<svg
									className="h-5 w-5"
									fill="none"
									viewBox="0 0 24 24"
									stroke="currentColor"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
									/>
								</svg>
							</button>
						)}
					</div>
				</div>
			)}
		</div>
	);
}
