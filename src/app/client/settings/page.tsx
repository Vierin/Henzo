'use client';

import { useState } from 'react';
import ClientLayout from '@/components/ClientLayout';

export default function ClientSettingsPage() {
	const [formData, setFormData] = useState({
		name: 'John Doe',
		email: 'john.doe@example.com',
		phone: '+1 (555) 123-4567',
		address: '123 Main St, New York, NY 10001',
	});

	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		// Simulate API call
		setTimeout(() => {
			setLoading(false);
			alert('Settings saved successfully!');
		}, 1000);
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	return (
		<ClientLayout activeTab="settings">
			<div>
				<h1 className="text-3xl font-bold text-gray-900 mb-8">
					Account Settings
				</h1>

				<form onSubmit={handleSubmit} className="max-w-2xl">
					<div className="bg-white rounded-xl p-6 shadow-sm">
						<h2 className="text-xl font-semibold text-gray-900 mb-6">
							Personal Information
						</h2>

						<div className="space-y-6">
							{/* Name */}
							<div>
								<label
									htmlFor="name"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Full Name
								</label>
								<input
									type="text"
									id="name"
									name="name"
									value={formData.name}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
									required
								/>
							</div>

							{/* Email */}
							<div>
								<label
									htmlFor="email"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Email Address
								</label>
								<input
									type="email"
									id="email"
									name="email"
									value={formData.email}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
									required
								/>
							</div>

							{/* Phone */}
							<div>
								<label
									htmlFor="phone"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Phone Number
								</label>
								<input
									type="tel"
									id="phone"
									name="phone"
									value={formData.phone}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								/>
							</div>

							{/* Address */}
							<div>
								<label
									htmlFor="address"
									className="block text-sm font-medium text-gray-700 mb-2"
								>
									Address
								</label>
								<input
									type="text"
									id="address"
									name="address"
									value={formData.address}
									onChange={handleInputChange}
									className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent"
								/>
							</div>
						</div>

						{/* Save Button */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<button
								type="submit"
								disabled={loading}
								className="bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
							>
								{loading ? 'Saving...' : 'Save Changes'}
							</button>
						</div>
					</div>
				</form>
			</div>
		</ClientLayout>
	);
}
