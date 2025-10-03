'use client';

import React, { useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import Footer from '@/components/Footer';
import FAQSection from '@/components/FAQSection';

export default function ContactPageClient() {
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Handle form submission
		console.log('Form submitted:', formData);
	};

	return (
		<>
			<div className="min-h-screen flex flex-col">
				<main className="flex-1 bg-white">
					{/* Hero Section */}
					<section className="py-16 px-6">
						<div className="max-w-4xl mx-auto text-center">
							<p className="text-orange-600 text-sm font-semibold uppercase tracking-wide mb-4">
								CONTACT US
							</p>
							<h1 className="text-4xl md:text-5xl font-bold text-black mb-6">
								We're here to help
							</h1>
							<p className="text-xl text-gray-600 mb-12">
								Have a question, comment, or concern? Our team is ready to
								assist you.
							</p>
						</div>
					</section>

					{/* Contact Form & Contact Info */}
					<section className="py-16 px-6">
						<div className="max-w-6xl mx-auto">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
								{/* Contact Form */}
								<div>
									<h2 className="text-2xl font-bold text-black mb-2">
										Send us a message
									</h2>
									<p className="text-gray-600 mb-8">
										Fill out the form and we'll get back to you.
									</p>
									<form onSubmit={handleSubmit} className="space-y-6">
										<div>
											<input
												type="text"
												id="name"
												name="name"
												value={formData.name}
												onChange={handleInputChange}
												placeholder="Your name"
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-500"
												required
											/>
										</div>
										<div>
											<input
												type="email"
												id="email"
												name="email"
												value={formData.email}
												onChange={handleInputChange}
												placeholder="Your email"
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-500"
												required
											/>
										</div>
										<div>
											<textarea
												id="message"
												name="message"
												rows={6}
												value={formData.message}
												onChange={handleInputChange}
												placeholder="Your message"
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-gray-500 resize-none"
												required
											></textarea>
										</div>
										<button
											type="submit"
											className="w-full bg-orange-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-orange-700 transition-colors"
										>
											Send Message
										</button>
									</form>
								</div>

								{/* Contact Information */}
								<div>
									<h2 className="text-2xl font-bold text-black mb-2">
										Contact Information
									</h2>
									<p className="text-gray-600 mb-8">
										Reach out to us via email or phone.
									</p>
									<div className="space-y-8">
										{/* Email */}
										<div className="flex items-start space-x-4">
											<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
												<svg
													className="w-4 h-4 text-orange-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
													/>
												</svg>
											</div>
											<div>
												<h3 className="text-lg font-semibold text-black mb-1">
													Email
												</h3>
												<p className="text-gray-600 mb-1">
													For general inquiries
												</p>
												<p className="text-orange-600 font-medium">
													support@henzo.com
												</p>
											</div>
										</div>

										{/* Phone */}
										<div className="flex items-start space-x-4">
											<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
												<svg
													className="w-4 h-4 text-orange-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
													/>
												</svg>
											</div>
											<div>
												<h3 className="text-lg font-semibold text-black mb-1">
													Phone
												</h3>
												<p className="text-gray-600 mb-1">
													Talk to our support team
												</p>
												<p className="text-orange-600 font-medium">
													+1 (555) 123-4567
												</p>
											</div>
										</div>

										{/* Sales */}
										<div className="flex items-start space-x-4">
											<div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
												<svg
													className="w-4 h-4 text-orange-600"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
												>
													<path
														strokeLinecap="round"
														strokeLinejoin="round"
														strokeWidth={2}
														d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
													/>
												</svg>
											</div>
											<div>
												<h3 className="text-lg font-semibold text-black mb-1">
													Sales
												</h3>
												<p className="text-gray-600 mb-1">
													For business inquiries
												</p>
												<p className="text-orange-600 font-medium">
													sales@henzo.com
												</p>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* FAQ Section */}
					<section className="py-16 px-6 bg-gray-50">
						<div className="max-w-4xl mx-auto">
							<div className="text-center mb-12">
								<h2 className="text-3xl font-bold text-black mb-4">
									Frequently Asked Questions
								</h2>
								<p className="text-gray-600">
									Find answers to common questions about Henzo.
								</p>
							</div>
							<FAQSection />
						</div>
					</section>
				</main>
			</div>
		</>
	);
}
