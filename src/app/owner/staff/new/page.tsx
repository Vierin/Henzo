'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewStaffPage() {
	const [formData, setFormData] = useState({
		name: '',
		role: '',
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
		if (!formData.name || !formData.role) {
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
					salonId: '1', // TODO: Get from user context
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create staff member');
			}

			// Redirect to staff page or dashboard
			router.push('/');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	const removePhoto = () => {
		setPhoto(null);
		setPhotoPreview(null);
	};

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			{/* Header */}
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a className="text-[#6b6b6b] hover:text-black" href="/">
							Dashboard
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Calendar
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Customers
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Reports
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-[#6b6b6b]"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-2xl px-6 py-8">
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
											<img
												src={photoPreview}
												alt="Staff preview"
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
								Role/Position *
							</label>
							<select
								required
								value={formData.role}
								onChange={(e) =>
									setFormData({ ...formData, role: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
							>
								<option value="">Select a role</option>
								<option value="Hair Stylist">Hair Stylist</option>
								<option value="Barber">Barber</option>
								<option value="Esthetician">Esthetician</option>
								<option value="Nail Technician">Nail Technician</option>
								<option value="Massage Therapist">Massage Therapist</option>
								<option value="Makeup Artist">Makeup Artist</option>
								<option value="Receptionist">Receptionist</option>
								<option value="Manager">Manager</option>
								<option value="Other">Other</option>
							</select>
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
								disabled={loading}
								className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
							>
								{loading ? 'Adding...' : 'Add Staff Member'}
							</button>
						</div>
					</form>
				</div>
			</main>
		</div>
	);
}
