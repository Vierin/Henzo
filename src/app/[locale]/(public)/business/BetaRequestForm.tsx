'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';

export default function BetaRequestForm() {
	const [formData, setFormData] = useState({
		fullName: '',
		email: '',
	});
	const [loading, setLoading] = useState(false);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const API_URL =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${API_URL}/auth/send-business-magic-link`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					name: formData.fullName,
					email: formData.email,
				}),
			});

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({}));
				const errorMessage = errorData.message || 'Failed to send magic link';
				throw new Error(errorMessage);
			}

			toast.success(
				'Magic link sent to your email! Please check your inbox to complete registration.',
				{
					duration: 5000,
				}
			);

			// Reset form
			setFormData({
				fullName: '',
				email: '',
			});
		} catch (error) {
			const errorMessage =
				error instanceof Error
					? error.message
					: 'Failed to submit request. Please try again.';
			toast.error(errorMessage);
			console.error('Beta request error:', error);
		} finally {
			setLoading(false);
		}
	};

	return (
		<section className="py-20 px-4 bg-muted/30 scroll-mt-20">
			<div className="container mx-auto max-w-3xl">
				<div className="text-center mb-16">
					<div className="inline-block px-4 py-2 bg-secondary rounded-full mb-4">
						<span className="text-primary">Beta Access</span>
					</div>
					<h2 className="text-4xl lg:text-5xl tracking-tight mb-4">
						Request Beta Access
					</h2>
					<p className="text-xl text-muted-foreground">
						Fill out the form below to join our beta testing program and get
						early access to Henzo.
					</p>
				</div>

				<div className="bg-card rounded-lg md:rounded-2xl border border-border shadow-lg p-4 md:p-12">
					<form onSubmit={handleSubmit} className="space-y-6">
						{/* Full Name */}
						<div>
							<label
								htmlFor="fullName"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Full Name <span className="text-destructive">*</span>
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
								className="block w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
							/>
						</div>

						{/* Email */}
						<div>
							<label
								htmlFor="email"
								className="block text-sm font-medium text-foreground mb-2"
							>
								Email <span className="text-destructive">*</span>
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
								className="block w-full px-4 py-3 border border-border rounded-lg bg-background text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-colors"
							/>
						</div>

						{/* Submit Button */}
						<button
							type="submit"
							disabled={loading}
							className="w-full bg-primary text-white px-8 py-4 rounded-lg text-lg font-medium hover:bg-primary/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
						>
							{loading ? 'Submitting...' : 'Request Beta Access'}
						</button>

						<p className="text-sm text-muted-foreground text-center">
							By submitting this form, you agree to be contacted about the beta
							testing program.
						</p>
					</form>
				</div>
			</div>
		</section>
	);
}
