'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewStaffPage() {
	const [formData, setFormData] = useState({
		name: '',
		accessLevel: 'EMPLOYEE',
		email: '',
		phone: '',
	});
	const [photo, setPhoto] = useState<File | null>(null);
	const [photoPreview, setPhotoPreview] = useState<string | null>(null);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

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
		setLoading(true);
		setError('');

		// Validate form
		if (!formData.name) {
			setError('Please fill in all required fields');
			setLoading(false);
			return;
		}

		try {
			// Save staff member to database
			const response = await fetch('/api/staff', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					salonId: '1', // Временное решение
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create staff member');
			}

			// Redirect to staff list
			router.push('/staff');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

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
					Add a new team member to your salon staff
				</p>
			</div>

			<form onSubmit={handleSubmit} className="space-y-8">
				{/* Basic Information */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Basic Information
					</h2>
					<div className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Full Name *
							</label>
							<input
								type="text"
								name="name"
								value={formData.name}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Enter full name"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Access Level *
							</label>
							<select
								name="accessLevel"
								value={formData.accessLevel}
								onChange={handleInputChange}
								required
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="EMPLOYEE">Employee</option>
								<option value="ADMIN">Admin</option>
							</select>
							<p className="text-xs text-gray-500 mt-1">
								Admins have full access to manage the salon, employees have
								limited access.
							</p>
						</div>
					</div>
				</div>

				{/* Contact Information */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Contact Information
					</h2>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Email Address
							</label>
							<input
								type="email"
								name="email"
								value={formData.email}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="staff@salon.com"
							/>
						</div>
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Phone Number
							</label>
							<input
								type="tel"
								name="phone"
								value={formData.phone}
								onChange={handleInputChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="+1 (555) 123-4567"
							/>
						</div>
					</div>
				</div>

				{/* Photo Upload */}
				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<h2 className="text-xl font-semibold text-gray-900 mb-6">
						Profile Photo
					</h2>
					<div className="flex items-start gap-6">
						{/* Photo Preview */}
						<div className="flex-shrink-0">
							<div className="w-32 h-32 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
								{photoPreview ? (
									<img
										src={photoPreview}
										alt="Staff photo preview"
										className="w-full h-full object-cover"
									/>
								) : (
									<svg
										className="w-12 h-12 text-gray-400"
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
								)}
							</div>
						</div>

						{/* Upload Controls */}
						<div className="flex-1">
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Upload Photo
							</label>
							<input
								type="file"
								accept="image/*"
								onChange={handlePhotoChange}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							/>
							<p className="text-xs text-gray-500 mt-1">
								Upload a profile photo for the staff member (optional)
							</p>
						</div>
					</div>
				</div>

				{error && (
					<div className="bg-red-50 border border-red-200 rounded-md p-4">
						<div className="flex">
							<div className="flex-shrink-0">
								<svg
									className="h-5 w-5 text-red-400"
									viewBox="0 0 20 20"
									fill="currentColor"
								>
									<path
										fillRule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<div className="ml-3">
								<h3 className="text-sm font-medium text-red-800">Error</h3>
								<div className="mt-2 text-sm text-red-700">
									<p>{error}</p>
								</div>
							</div>
						</div>
					</div>
				)}

				{/* Submit Button */}
				<div className="flex justify-end gap-4">
					<button
						type="button"
						onClick={() => router.back()}
						className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
					>
						Cancel
					</button>
					<button
						type="submit"
						disabled={loading}
						className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
					>
						{loading ? 'Creating...' : 'Create Staff Member'}
					</button>
				</div>
			</form>
		</div>
	);
}
