'use client';

import { useState, useEffect } from 'react';

interface Service {
	id: string;
	name: string;
	description: string;
	duration: number;
	price: number;
}

interface EditServiceModalProps {
	isOpen: boolean;
	onClose: () => void;
	service: Service | null;
	onSave: (service: Service) => void;
}

export default function EditServiceModal({
	isOpen,
	onClose,
	service,
	onSave,
}: EditServiceModalProps) {
	const [formData, setFormData] = useState({
		name: '',
		description: '',
		duration: 0,
		price: 0,
	});
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState('');

	useEffect(() => {
		if (service) {
			setFormData({
				name: service.name,
				description: service.description || '',
				duration: service.duration,
				price: service.price,
			});
		}
	}, [service]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);
		setError('');

		try {
			if (!service) return;

			const response = await fetch(`/api/services/${service.id}`, {
				method: 'PUT',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || 'Failed to update service');
			}

			const updatedService = await response.json();
			onSave(updatedService.service);
			onClose();
		} catch (err: any) {
			setError(err.message);
		} finally {
			setLoading(false);
		}
	};

	if (!isOpen || !service) return null;

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
				<div className="p-6">
					<div className="flex items-center justify-between mb-6">
						<h2 className="text-2xl font-bold text-gray-900">Edit Service</h2>
						<button
							onClick={onClose}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
						>
							<svg
								className="w-6 h-6 text-gray-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									strokeLinecap="round"
									strokeLinejoin="round"
									strokeWidth={2}
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>

					<form onSubmit={handleSubmit} className="space-y-4">
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
								placeholder="Enter service name"
							/>
						</div>

						<div>
							<label className="block text-sm font-medium text-gray-700 mb-2">
								Description
							</label>
							<textarea
								value={formData.description}
								onChange={(e) =>
									setFormData({ ...formData, description: e.target.value })
								}
								rows={3}
								className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
								placeholder="Enter service description"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
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
										setFormData({
											...formData,
											duration: parseInt(e.target.value),
										})
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="60"
								/>
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
										setFormData({
											...formData,
											price: parseFloat(e.target.value),
										})
									}
									className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-[#ff5b5b] text-gray-900"
									placeholder="50.00"
								/>
							</div>
						</div>

						{error && (
							<div className="text-red-600 text-sm text-center bg-red-50 border border-red-200 rounded-md p-3">
								{error}
							</div>
						)}

						<div className="flex gap-3 pt-4">
							<button
								type="button"
								onClick={onClose}
								className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-500"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={loading}
								className="flex-1 bg-[#ff5b5b] text-white px-4 py-2 rounded-md hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 disabled:opacity-50"
							>
								{loading ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</form>
				</div>
			</div>
		</div>
	);
}
