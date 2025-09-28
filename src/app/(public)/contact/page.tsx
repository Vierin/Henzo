'use client';

import React, { useState } from 'react';
import Head from 'next/head';
import PublicHeader from '@/components/PublicHeader';
import Footer from '@/components/Footer';

export default function ContactPage() {
	const [activeTab, setActiveTab] = useState<'general' | 'account' | 'billing'>(
		'general'
	);
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
	});

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		// Handle form submission here
		console.log('Form submitted:', formData);
		// Reset form
		setFormData({ name: '', email: '', message: '' });
	};

	const toggleQuestion = (questionId: string) => {
		setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
	};

	const faqData = {
		general: [
			{
				id: 'what-is-henzo',
				question: 'What is Henzo?',
				answer:
					'Henzo is a comprehensive beauty salon booking platform that connects clients with professional beauty services including hair styling, massage, nail care, and more.',
			},
			{
				id: 'international-availability',
				question: 'Is Henzo available internationally?',
				answer:
					'Currently, Henzo is available in Vietnam with plans to expand to other countries in the near future. We are working on bringing our services to a global audience.',
			},
			{
				id: 'get-started',
				question: 'How can I get started with Henzo?',
				answer:
					'Getting started with Henzo is easy! Simply create an account, browse available salons and services, and book your appointment. For salon owners, you can register as a business and start managing your bookings right away.',
			},
		],
		account: [
			{
				id: 'create-account',
				question: 'How do I create an account?',
				answer:
					'You can create an account by clicking the "Sign Up" button on our homepage and following the registration process. You can also sign up using your Google account for faster registration.',
			},
			{
				id: 'reset-password',
				question: 'How do I reset my password?',
				answer:
					'To reset your password, go to the login page and click "Forgot Password". Enter your email address and follow the instructions sent to your email.',
			},
		],
		billing: [
			{
				id: 'payment-methods',
				question: 'What payment methods do you accept?',
				answer:
					'We accept all major credit cards, bank transfers, and digital wallets. Payment is processed securely at the time of booking.',
			},
			{
				id: 'refund-policy',
				question: 'What is your refund policy?',
				answer:
					'Refunds are processed according to our terms of service. Cancellations made more than 24 hours in advance are eligible for full refunds.',
			},
		],
	};

	return (
		<>
			<Head>
				<title>Contact Us - Henzo</title>
				<meta
					name="description"
					content="Get in touch with Henzo. We're here to help with any questions or concerns you may have."
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>

			<div className="min-h-screen flex flex-col">
				<main className="flex-1 bg-white">
					{/* Contact Us Section */}
					<div className="max-w-7xl mx-auto px-6 py-16">
						{/* Header */}
						<div className="text-center mb-12">
							<p className="text-[#ea4b4b] text-sm font-semibold uppercase tracking-wide mb-4">
								CONTACT US
							</p>
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								We're here to help
							</h1>
							<p className="text-gray-600 text-lg max-w-2xl mx-auto">
								Have a question, comment, or concern? Our team is ready to
								assist you.
							</p>
						</div>

						{/* Contact Form and Info */}
						<div className="grid lg:grid-cols-2 gap-12 mb-16">
							{/* Contact Form */}
							<div>
								<h2 className="text-2xl font-semibold text-gray-900 mb-2">
									Send us a message
								</h2>
								<p className="text-gray-600 mb-6">
									Fill out the form and we'll get back to you.
								</p>

								<form onSubmit={handleSubmit} className="space-y-6">
									<div>
										<input
											type="text"
											name="name"
											placeholder="Your name"
											value={formData.name}
											onChange={handleInputChange}
											required
											className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent text-gray-900 placeholder-gray-500"
										/>
									</div>
									<div>
										<input
											type="email"
											name="email"
											placeholder="Your email"
											value={formData.email}
											onChange={handleInputChange}
											required
											className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent text-gray-900 placeholder-gray-500"
										/>
									</div>
									<div>
										<textarea
											name="message"
											placeholder="Your message"
											rows={6}
											value={formData.message}
											onChange={handleInputChange}
											required
											className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:border-transparent text-gray-900 placeholder-gray-500 resize-none"
										/>
									</div>
									<button
										type="submit"
										className="w-full bg-[#ea4b4b] text-white py-3 px-6 rounded-lg font-medium hover:bg-[#d43d3d] transition-colors"
									>
										Send Message
									</button>
								</form>
							</div>

							{/* Contact Information */}
							<div>
								<h2 className="text-2xl font-semibold text-gray-900 mb-2">
									Contact Information
								</h2>
								<p className="text-gray-600 mb-8">
									Reach out to us via email or phone.
								</p>

								<div className="space-y-6">
									{/* Email */}
									<div className="flex items-start space-x-4">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
												<svg
													className="w-5 h-5 text-[#ea4b4b]"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
													<path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
												</svg>
											</div>
										</div>
										<div>
											<h3 className="text-lg font-medium text-gray-900">
												Email
											</h3>
											<p className="text-gray-600 text-sm mb-1">
												For general inquiries
											</p>
											<a
												href="mailto:support@henzo.com"
												className="text-[#ea4b4b] hover:text-[#d43d3d] transition-colors"
											>
												support@henzo.com
											</a>
										</div>
									</div>

									{/* Phone */}
									<div className="flex items-start space-x-4">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
												<svg
													className="w-5 h-5 text-[#ea4b4b]"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path d="M2 3a1 1 0 011-1h2.153a1 1 0 01.986.836l.74 4.435a1 1 0 01-.54 1.06l-1.548.773a11.037 11.037 0 006.105 6.105l.774-1.548a1 1 0 011.059-.54l4.435.74a1 1 0 01.836.986V17a1 1 0 01-1 1h-2C7.82 18 2 12.18 2 5V3z" />
												</svg>
											</div>
										</div>
										<div>
											<h3 className="text-lg font-medium text-gray-900">
												Phone
											</h3>
											<p className="text-gray-600 text-sm mb-1">
												Talk to our support team
											</p>
											<a
												href="tel:+15551234567"
												className="text-[#ea4b4b] hover:text-[#d43d3d] transition-colors"
											>
												+1 (555) 123-4567
											</a>
										</div>
									</div>

									{/* Sales */}
									<div className="flex items-start space-x-4">
										<div className="flex-shrink-0">
											<div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
												<svg
													className="w-5 h-5 text-[#ea4b4b]"
													fill="currentColor"
													viewBox="0 0 20 20"
												>
													<path
														fillRule="evenodd"
														d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
														clipRule="evenodd"
													/>
												</svg>
											</div>
										</div>
										<div>
											<h3 className="text-lg font-medium text-gray-900">
												Sales
											</h3>
											<p className="text-gray-600 text-sm mb-1">
												For business inquiries
											</p>
											<a
												href="mailto:sales@henzo.com"
												className="text-[#ea4b4b] hover:text-[#d43d3d] transition-colors"
											>
												sales@henzo.com
											</a>
										</div>
									</div>
								</div>
							</div>
						</div>

						{/* FAQ Section */}
						<div className="text-center mb-12">
							<h2 className="text-4xl font-bold text-gray-900 mb-4">
								Frequently Asked Questions
							</h2>
							<p className="text-gray-600 text-lg max-w-2xl mx-auto">
								Find answers to common questions about Henzo.
							</p>
						</div>

						{/* FAQ Tabs */}
						<div className="flex justify-center mb-8">
							<div className="flex border-b border-gray-200">
								{(['general', 'account', 'billing'] as const).map((tab) => (
									<button
										key={tab}
										onClick={() => setActiveTab(tab)}
										className={`px-6 py-3 text-sm font-medium capitalize transition-colors ${
											activeTab === tab
												? 'text-[#ea4b4b] border-b-2 border-[#ea4b4b]'
												: 'text-gray-600 hover:text-gray-900'
										}`}
									>
										{tab}
									</button>
								))}
							</div>
						</div>

						{/* FAQ Items */}
						<div className="max-w-3xl mx-auto">
							<div className="space-y-4">
								{faqData[activeTab].map((item) => (
									<div
										key={item.id}
										className="border border-gray-200 rounded-lg overflow-hidden"
									>
										<button
											onClick={() => toggleQuestion(item.id)}
											className="w-full px-6 py-4 text-left flex items-center justify-between hover:bg-gray-50 transition-colors"
										>
											<span className="text-lg font-medium text-gray-900">
												{item.question}
											</span>
											<svg
												className={`w-5 h-5 text-gray-500 transition-transform ${
													expandedQuestion === item.id ? 'rotate-45' : ''
												}`}
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													strokeLinecap="round"
													strokeLinejoin="round"
													strokeWidth={2}
													d="M12 6v6m0 0v6m0-6h6m-6 0H6"
												/>
											</svg>
										</button>
										{expandedQuestion === item.id && (
											<div className="px-6 pb-4">
												<p className="text-gray-600 leading-relaxed">
													{item.answer}
												</p>
											</div>
										)}
									</div>
								))}
							</div>
						</div>
					</div>
				</main>
			</div>
		</>
	);
}
