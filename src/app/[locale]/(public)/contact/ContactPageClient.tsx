'use client';

import React, { useState } from 'react';
import toast from 'react-hot-toast';
import FAQSection from '@/components/FAQSection';
import { useTranslation } from '@/contexts/LanguageContext';

export default function ContactPageClient() {
	const t = useTranslation();
	const [formData, setFormData] = useState({
		name: '',
		email: '',
		message: '',
	});

	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleInputChange = (
		e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
	) => {
		const { name, value } = e.target;
		setFormData((prev) => ({
			...prev,
			[name]: value,
		}));
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setIsSubmitting(true);

		try {
			const backendUrl =
				process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
			const response = await fetch(`${backendUrl}/contact/send-message`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify(formData),
			});

			const result = await response.json();

			if (response.ok) {
				toast.success(t.contact.successMessage);
				setFormData({ name: '', email: '', message: '' });
			} else {
				// Handle validation errors from backend
				if (result.errors && Array.isArray(result.errors)) {
					const errorMessages = result.errors
						.map((err: any) => Object.values(err.constraints || {}).join(', '))
						.join('; ');
					toast.error(errorMessages);
				} else {
					toast.error(result.message || t.contact.errorMessage);
				}
				console.error('Backend error:', result);
			}
		} catch (error) {
			console.error('Network error:', error);
			toast.error(t.contact.networkError);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<>
			<div className="min-h-screen flex flex-col">
				<main className="flex-1 bg-white" role="main">
					{/* Hero Section */}
					<section
						className="py-16 px-6"
						aria-labelledby="contact-hero-heading"
					>
						<div className="max-w-4xl mx-auto text-center">
							<p className="text-[#ff5b5b] text-sm font-semibold uppercase tracking-wide mb-4">
								{t.contact.title}
							</p>
							<h1
								id="contact-hero-heading"
								className="text-4xl md:text-5xl font-bold text-black mb-6"
							>
								{t.contact.heroTitle}
							</h1>
							<p className="text-xl text-gray-600 mb-12">
								{t.contact.heroSubtitle}
							</p>
						</div>
					</section>

					{/* Contact Form & Contact Info */}
					<section
						className="py-16 px-6"
						aria-labelledby="contact-form-heading"
					>
						<div className="max-w-6xl mx-auto">
							<div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
								{/* Contact Form */}
								<div>
									<h2
										id="contact-form-heading"
										className="text-2xl font-bold text-black mb-2"
									>
										{t.contact.formTitle}
									</h2>
									<p className="text-gray-600 mb-8">{t.contact.formSubtitle}</p>

									<form
										onSubmit={handleSubmit}
										className="space-y-6"
										role="form"
										aria-labelledby="contact-form-heading"
									>
										<div>
											<label htmlFor="name" className="sr-only">
												{t.contact.nameLabel}
											</label>
											<input
												type="text"
												id="name"
												name="name"
												value={formData.name}
												onChange={handleInputChange}
												placeholder={t.contact.namePlaceholder}
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-500"
												required
												disabled={isSubmitting}
												aria-required="true"
												aria-describedby="name-error"
											/>
										</div>
										<div>
											<label htmlFor="email" className="sr-only">
												{t.contact.emailLabel}
											</label>
											<input
												type="email"
												id="email"
												name="email"
												value={formData.email}
												onChange={handleInputChange}
												placeholder={t.contact.emailPlaceholder}
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-500"
												required
												disabled={isSubmitting}
												aria-required="true"
												aria-describedby="email-error"
											/>
										</div>
										<div>
											<label htmlFor="message" className="sr-only">
												{t.contact.messageLabel}
											</label>
											<textarea
												id="message"
												name="message"
												rows={6}
												value={formData.message}
												onChange={handleInputChange}
												placeholder={t.contact.messagePlaceholder}
												className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-gray-500 resize-none"
												required
												disabled={isSubmitting}
												aria-required="true"
												aria-describedby="message-error"
											></textarea>
										</div>
										<button
											type="submit"
											disabled={isSubmitting}
											className="w-full bg-[#ff5b5b] text-white py-3 px-6 rounded-lg font-semibold hover:bg-[#ea4b4b] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
											aria-describedby="submit-status"
										>
											{isSubmitting ? t.contact.sending : t.contact.sendMessage}
										</button>
										<div
											id="submit-status"
											aria-live="polite"
											className="sr-only"
										>
											{isSubmitting
												? t.contact.sendingStatus
												: t.contact.readyStatus}
										</div>
									</form>
								</div>

								{/* Contact Information */}
								<div>
									<h2
										id="contact-info-heading"
										className="text-2xl font-bold text-black mb-2"
									>
										{t.contact.contactInfoTitle}
									</h2>
									<p className="text-gray-600 mb-8">
										{t.contact.contactInfoSubtitle}
									</p>
									<div
										className="space-y-8"
										role="region"
										aria-labelledby="contact-info-heading"
									>
										{/* Email */}
										<div className="flex items-start space-x-4">
											<div
												className="w-8 h-8 bg-[#ffe5e5] rounded-full flex items-center justify-center flex-shrink-0 mt-1"
												aria-hidden="true"
											>
												<svg
													className="w-4 h-4 text-[#ff5b5b]"
													fill="none"
													stroke="currentColor"
													viewBox="0 0 24 24"
													aria-hidden="true"
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
													{t.contact.email}
												</h3>
												<p className="text-gray-600 mb-1">
													{t.contact.emailDescription}
												</p>
												<a
													href="mailto:hello@henzo.app"
													className="text-[#ff5b5b] font-medium hover:text-[#ea4b4b] transition-colors"
													aria-label="Send email to hello@henzo.app"
												>
													hello@henzo.app
												</a>
											</div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* FAQ Section */}
					<section
						className="py-16 px-6 bg-gray-50"
						aria-labelledby="faq-heading"
					>
						<div className="max-w-4xl mx-auto">
							<div className="text-center mb-12">
								<h2
									id="faq-heading"
									className="text-3xl font-bold text-black mb-4"
								>
									{t.contact.faqTitle}
								</h2>
								<p className="text-gray-600">{t.contact.faqSubtitle}</p>
							</div>
							<FAQSection />
						</div>
					</section>
				</main>
			</div>
		</>
	);
}
