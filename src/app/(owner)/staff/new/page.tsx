'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSalonId } from '@/hooks/useSalon';
import { useCreateStaff } from '@/hooks/useStaff';
import Image from 'next/image';

export default function NewStaffPage() {
	const [formData, setFormData] = useState({
		name: '',
		accessLevel: 'EMPLOYEE',
		email: '',
		phone: '',
	});
	const [photo, setPhoto] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [error, setError] = useState('');
	const router = useRouter();

	// Используем оптимизированный хук для получения данных салона
	const { salonId, isLoading: salonLoading, hasSalon } = useSalonId();

	// Хук для создания работника
	const createStaffMutation = useCreateStaff();

	// Перенаправляем на создание салона, если салон не найден
	if (!salonLoading && !hasSalon) {
		router.push('/salon-info');
		return null;
	}

	const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (file) {
			setPhoto(file);
			const reader = new FileReader();
			reader.onload = (e) => {
				setPhotoPreview(e.target?.result as string);
			};
			reader.readAsDataURL(file);
		}
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError('');

		// Validate form
		if (!formData.name || !salonId) {
			setError('Please fill in all required fields');
			return;
		}

		try {
			// Create staff member using mutation
			await createStaffMutation.mutateAsync({
				...formData,
				salonId,
				accessLevel: formData.accessLevel as 'ADMIN' | 'EMPLOYEE',
			});

			// Redirect to staff page after successful creation
			setTimeout(() => {
				router.push('/staff');
			}, 100);
		} catch (err: unknown) {
			const errorMessage =
				err instanceof Error ? err.message : 'Failed to create staff member';
			setError(errorMessage);
		}
	};

	const removePhoto = () => {
		setPhoto(null);
		setPhotoPreview(null);
	};

	// Показываем загрузку пока не получили salonId или идет создание
	if (salonLoading || createStaffMutation.isPending) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">Loading...</p>
				</div>
			</div>
		);
	}

	// Если salonId не получен, не показываем форму
	if (!salonId) {
		return null;
	}

	return (
		<div>
			<div className="mb-8">
				<button
					onClick={() => router.back()}
					className="flex items-center gap-2 text-[#6b6b6b] hover:text-black mb-4"
				>
					<svg
						className="w-4 h-4"
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
					Back
				</button>
				<h1 className="text-3xl font-bold text-gray-900 mb-2">
					Add New Staff Member
				</h1>
				<p className="text-gray-600">
					Add a new team member to your salon with their details and photo.
				</p>
			</div>

			<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
				<form onSubmit={handleSubmit} className="space-y-6">
					{/* Photo Upload Section */}
					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Photo
						</label>
						<div className="flex items-center gap-6">
							{/* Photo Preview */}
							<div className="flex-shrink-0">
								{photoPreview ? (
									<div className="relative">
										<Image
											src={photoPreview}
											alt="Staff preview"
											width={80}
											height={80}
											className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
										/>
										<button
											type="button"
											onClick={removePhoto}
											className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
										>
											×
										</button>
									</div>
								) : (
									<div className="w-20 h-20 rounded-full bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
										<svg
											className="w-8 h-8 text-gray-400"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
											/>
										</svg>
									</div>
								)}
							</div>

							{/* Upload Button */}
							<div className="flex-1">
								<input
									type="file"
									id="photo"
									accept="image/*"
									onChange={handlePhotoChange}
									className="hidden"
								/>
								<label
									htmlFor="photo"
									className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#ff5b5b]"
								>
									<svg
										className="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
										/>
									</svg>
									{photo ? 'Change Photo' : 'Upload Photo'}
								</label>
								<p className="text-xs text-gray-500 mt-1">
									JPG, PNG or GIF. Max size 5MB.
								</p>
							</div>
						</div>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Full Name *
						</label>
						<input
							type="text"
							required
							value={formData.name}
							onChange={(e) =>
								setFormData({ ...formData, name: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							placeholder="e.g., Emily Carter"
						/>
					</div>

					<div>
						<label className="block text-sm font-medium text-gray-700 mb-2">
							Access Level *
						</label>
						<select
							required
							value={formData.accessLevel}
							onChange={(e) =>
								setFormData({ ...formData, accessLevel: e.target.value })
							}
							className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
						>
							<option value="EMPLOYEE">Employee - Limited access</option>
							<option value="ADMIN">
								Admin - Full access to salon management
							</option>
						</select>
						<p className="text-xs text-gray-500 mt-1">
							Admins can manage staff, services, and appointments. Employees
							have limited access.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Email
							</label>
							<input
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="emily@salon.com"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Phone
							</label>
							<input
								type="tel"
								value={formData.phone}
								onChange={(e) =>
									setFormData({ ...formData, phone: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="+1 (555) 123-4567"
							/>
						</div>
					</div>

					{error && (
						<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
							{error}
						</div>
					)}

					<div className="flex gap-4 pt-4">
						<button
							type="button"
							onClick={() => router.back()}
							className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
						>
							Cancel
						</button>
						<button
							type="submit"
							disabled={createStaffMutation.isPending}
							className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
						>
							{createStaffMutation.isPending ? 'Adding...' : 'Add Staff Member'}
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
