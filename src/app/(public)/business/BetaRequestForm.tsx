'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function BetaRequestForm() {
	const [formData, setFormData] = useState({
		fullName: '',
		salonName: '',
		email: '',
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const response = await fetch(
				`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/contact/send-message`,
				{
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						name: formData.fullName,
						email: formData.email,
						message: `Beta Testing Request\n\nFull Name: ${formData.fullName}\nSalon Name: ${formData.salonName || 'Not provided'}\n\nRequesting access to beta testing program.`,
					}),
				}
			);

			if (!response.ok) {
				throw new Error('Failed to submit request');
			}

			toast.success(
				"Thank you! We'll contact you soon about the beta program.",
				{
					duration: 5000,
				}
			);

			// Reset form
			setFormData({
				fullName: '',
				salonName: '',
				email: '',
			});
		} catch (error) {
			toast.error('Failed to submit request. Please try again.');
			console.error('Beta request error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="py-20 bg-gradient-to-br from-orange-50 to-pink-50 scroll-mt-20">
			<div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="text-center mb-12">
					<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
						Request Beta Access
					</h2>
					<p className="text-xl text-gray-600">
						Fill out the form below to join our beta testing program and get
						early access to Henzo.
					</p>
				</div>

				<div className="bg-white rounded-2xl shadow-xl p-8 md:p-12">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Full Name */}
						<div>
							<label
								htmlFor="fullName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Full Name <span className="text-red-500">*</span>
							</label>
							<input
								type="text"
								id="fullName"
								required
								value={formData.fullName}
								onChange={(e) =>
									setFormData({ ...formData, fullName: e.target.value })
								}
								placeholder="John Doe"
								className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-500 transition-colors"
							/>
						</div>

						{/* Salon Name */}
						<div>
							<label
								htmlFor="salonName"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Salon Name <span className="text-gray-400">(Optional)</span>
							</label>
							<input
								type="text"
								id="salonName"
								value={formData.salonName}
								onChange={(e) =>
									setFormData({ ...formData, salonName: e.target.value })
								}
								placeholder="Beauty Lounge"
								className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-500 transition-colors"
							/>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-gray-700 mb-2"
							>
								Email <span className="text-red-500">*</span>
							</label>
							<input
								type="email"
								id="email"
								required
								value={formData.email}
								onChange={(e) =>
									setFormData({ ...formData, email: e.target.value })
								}
								placeholder="john@example.com"
								className="block w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-gray-500 transition-colors"
							/>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Submitting...' : 'Request Beta Access'}
						</button>

						<p className="text-sm text-gray-500 text-center">
							By submitting this form, you agree to be contacted about the beta
							testing program.
						</p>
					</form>
				</div>
			</div>
		</section>
	);
}
