'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function NewServicePage() {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		duration: '',
		price: '',
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');
	const router = useRouter();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		// Validate form
		if (!formData.name || !formData.duration || !formData.price) {
			setError('Please fill in all required fields');
			setLoading(false);
			return;
		}

		if (isNaN(Number(formData.duration)) || Number(formData.duration) <= 0) {
			setError('Duration must be a positive number');
			setLoading(false);
			return;
		}

		if (isNaN(Number(formData.price)) || Number(formData.price) <= 0) {
			setError('Price must be a positive number');
			setLoading(false);
			return;
		}

		try {
			// Save service to database
			const response = await fetch('/api/services', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					...formData,
					duration: Number(formData.duration),
					price: Number(formData.price),
					salonId: '1', // TODO: Get from user context
				}),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to create service');
			}

			// Redirect to services page or dashboard
			router.push('/');
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
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
						Add New Service
					</h1>
					<p className="text-gray-600">
						Create a new service for your salon with pricing and duration
						details.
					</p>
				</div>

				<div className="bg-white rounded-xl border border-[#f1d9d7] p-6">
					<form onSubmit={handleSubmit} className="space-y-6">
						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Service Name *
							</label>
							<input
								type="text"
								required
								value={formData.name}
								onChange={(e) =>
									setFormData({ ...formData, name: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="e.g., Haircut, Manicure, Facial"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Description
							</label>
							<textarea
								rows={4}
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Describe what this service includes..."
							/>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Duration (minutes) *
								</label>
								<input
									type="number"
									required
									min="1"
									value={formData.duration}
									onChange={(e) =>
										setFormData({ ...formData, duration: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="60"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Enter duration in minutes (e.g., 60 for 1 hour)
								</p>
							</div>

							<div>
								<label className="block text-sm font-medium text-gray-700 mb-2">
									Price ($) *
								</label>
								<input
									type="number"
									required
									min="0"
									step="0.01"
									value={formData.price}
									onChange={(e) =>
										setFormData({ ...formData, price: e.target.value })
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="50.00"
								/>
								<p className="text-xs text-gray-500 mt-1">
									Enter price in dollars (e.g., 50.00)
								</p>
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
								{loading ? 'Creating...' : 'Create Service'}
							</button>
						</div>
					</form>
				</div>
			</main>
		</div>
	);
}
