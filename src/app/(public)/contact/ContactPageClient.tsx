'use client';

import React, { useState } from 'react';
import PublicHeader from '@/components/PublicHeader';
import Footer from '@/components/Footer';

export default function ContactPageClient() {
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

	const toggleQuestion = (questionId: string) => {
		setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
	};

	const faqData = {
		general: [
			{
				id: 'how-to-book',
				question: 'How do I book an appointment?',
				answer:
					"Simply search for a salon or service, select your preferred date and time, and complete the booking process. You'll receive a confirmation email with all the details.",
			},
			{
				id: 'cancel-appointment',
				question: 'Can I cancel or reschedule my appointment?',
				answer:
					'Yes, you can cancel or reschedule your appointment up to 24 hours before the scheduled time. Log into your account and go to "My Appointments" to make changes.',
			},
			{
				id: 'payment-methods',
				question: 'What payment methods do you accept?',
				answer:
					'We accept all major credit cards, PayPal, and Apple Pay. Payment is processed securely at the time of booking.',
			},
			{
				id: 'salon-ratings',
				question: 'How are salon ratings calculated?',
				answer:
					'Ratings are based on customer reviews and feedback. We only show verified reviews from customers who have actually booked and completed appointments.',
			},
		],
		account: [
			{
				id: 'create-account',
				question: 'How do I create an account?',
				answer:
					'Click "Sign Up" in the top right corner, enter your email and password, and verify your email address. You can also sign up using your Google or Facebook account.',
			},
			{
				id: 'reset-password',
				question: 'I forgot my password. How do I reset it?',
				answer:
					'Click "Forgot Password" on the login page, enter your email address, and we\'ll send you a link to reset your password.',
			},
			{
				id: 'update-profile',
				question: 'How do I update my profile information?',
				answer:
					'Log into your account, go to "Profile Settings", and update your personal information, preferences, and notification settings.',
			},
		],
		billing: [
			{
				id: 'refund-policy',
				question: 'What is your refund policy?',
				answer:
					"Refunds are processed within 5-7 business days for cancelled appointments. The exact refund amount depends on the salon's cancellation policy.",
			},
			{
				id: 'billing-issues',
				question: 'I have a billing issue. Who should I contact?',
				answer:
					"Contact our support team with your booking reference number and details of the issue. We'll investigate and resolve it as quickly as possible.",
			},
			{
				id: 'receipts',
				question: 'How do I get a receipt for my booking?',
				answer:
					'Receipts are automatically sent to your email after each booking. You can also download them from your account under "Booking History".',
			},
		],
	};

	return (
		<>
			<div className="min-h-screen flex flex-col">
				<PublicHeader />
				<main className="flex-1 bg-white">
					{/* Hero Section */}
					<section className="bg-gray-800 flex items-center justify-center min-h-[50vh]">
						<div className="max-w-4xl mx-auto px-6 text-center">
							<h1 className="text-4xl md:text-5xl font-bold text-white mb-6">
								Get in Touch
							</h1>
							<p className="text-xl text-gray-300 mb-8">
								We're here to help with any questions or concerns you may have.
							</p>
						</div>
					</section>

					{/* Contact Form & FAQ */}
					<section className="py-16 px-6">
						<div className="max-w-6xl mx-auto">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
								{/* Contact Form */}
								<div>
									<h2 className="text-3xl font-bold text-gray-900 mb-8">
										Send us a Message
									</h2>
									<form onSubmit={handleSubmit} className="space-y-6">
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
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												required
											/>
										</div>
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
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												required
											/>
										</div>
										<div>
											<label
												htmlFor="message"
												className="block text-sm font-medium text-gray-700 mb-2"
											>
												Message
											</label>
											<textarea
												id="message"
												name="message"
												rows={6}
												value={formData.message}
												onChange={handleInputChange}
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
												placeholder="Tell us how we can help you..."
												required
											></textarea>
										</div>
										<button
											type="submit"
											className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition-colors"
										>
											Send Message
										</button>
									</form>
								</div>

								{/* FAQ Section */}
								<div>
									<h2 className="text-3xl font-bold text-gray-900 mb-8">
										Frequently Asked Questions
									</h2>

									{/* FAQ Tabs */}
									<div className="flex space-x-1 mb-6 bg-gray-100 p-1 rounded-lg">
										<button
											onClick={() => setActiveTab('general')}
											className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
												activeTab === 'general'
													? 'bg-white text-blue-600 shadow-sm'
													: 'text-gray-600 hover:text-gray-900'
											}`}
										>
											General
										</button>
										<button
											onClick={() => setActiveTab('account')}
											className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
												activeTab === 'account'
													? 'bg-white text-blue-600 shadow-sm'
													: 'text-gray-600 hover:text-gray-900'
											}`}
										>
											Account
										</button>
										<button
											onClick={() => setActiveTab('billing')}
											className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
												activeTab === 'billing'
													? 'bg-white text-blue-600 shadow-sm'
													: 'text-gray-600 hover:text-gray-900'
											}`}
										>
											Billing
										</button>
									</div>

									{/* FAQ Items */}
									<div className="space-y-4">
										{faqData[activeTab].map((item) => (
											<div
												key={item.id}
												className="border border-gray-200 rounded-lg overflow-hidden"
											>
												<button
													onClick={() => toggleQuestion(item.id)}
													className="w-full px-6 py-4 text-left bg-white hover:bg-gray-50 transition-colors flex justify-between items-center"
												>
													<span className="font-medium text-gray-900">
														{item.question}
													</span>
													<svg
														className={`w-5 h-5 text-gray-500 transition-transform ${
															expandedQuestion === item.id ? 'rotate-180' : ''
														}`}
														fill="none"
														stroke="currentColor"
														viewBox="0 0 24 24"
													>
														<path
															strokeLinecap="round"
															strokeLinejoin="round"
															strokeWidth={2}
															d="M19 9l-7 7-7-7"
														/>
													</svg>
												</button>
												{expandedQuestion === item.id && (
													<div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
														<p className="text-gray-700">{item.answer}</p>
													</div>
												)}
											</div>
										))}
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Contact Info */}
					<section className="bg-gray-50 py-16 px-6">
						<div className="max-w-4xl mx-auto text-center">
							<h2 className="text-3xl font-bold text-gray-900 mb-8">
								Other Ways to Reach Us
							</h2>
							<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
								<div>
									<div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
										<svg
											className="w-6 h-6 text-blue-600"
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
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Email Support
									</h3>
									<p className="text-gray-600">
										Get help via email within 24 hours
									</p>
									<p className="text-blue-600 font-medium">support@henzo.com</p>
								</div>
								<div>
									<div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
										<svg
											className="w-6 h-6 text-green-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
											/>
										</svg>
									</div>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Live Chat
									</h3>
									<p className="text-gray-600">Chat with us in real-time</p>
									<p className="text-green-600 font-medium">
										Available 9 AM - 6 PM EST
									</p>
								</div>
								<div>
									<div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
										<svg
											className="w-6 h-6 text-purple-600"
											fill="none"
											stroke="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												strokeLinecap="round"
												strokeLinejoin="round"
												strokeWidth={2}
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
									</div>
									<h3 className="text-lg font-semibold text-gray-900 mb-2">
										Response Time
									</h3>
									<p className="text-gray-600">We typically respond within</p>
									<p className="text-purple-600 font-medium">
										Less than 2 hours
									</p>
								</div>
							</div>
						</div>
					</section>
				</main>
				<Footer />
			</div>
		</>
	);
}
