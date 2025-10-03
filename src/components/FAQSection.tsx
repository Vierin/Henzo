'use client';

import React, { useState } from 'react';

interface FAQItem {
	id: string;
	question: string;
	answer: string;
}

interface FAQData {
	general: FAQItem[];
	account: FAQItem[];
	billing: FAQItem[];
}

export default function FAQSection() {
	const [activeTab, setActiveTab] = useState<'general' | 'account' | 'billing'>(
		'general'
	);
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

	const toggleQuestion = (questionId: string) => {
		setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
	};

	const faqData: FAQData = {
		general: [
			{
				id: 'what-is-henzo',
				question: 'What is Henzo?',
				answer:
					'Henzo is a comprehensive beauty and wellness booking platform that connects clients with the best salons, spas, and wellness providers. We make it easy to discover, book, and manage your beauty appointments all in one place.',
			},
			{
				id: 'international-availability',
				question: 'Is Henzo available internationally?',
				answer:
					'Currently, Henzo is available in select regions. We are continuously expanding our services to new markets. Check our website or contact support to see if we operate in your area.',
			},
			{
				id: 'get-started',
				question: 'How can I get started with Henzo?',
				answer:
					"Getting started is easy! Simply create an account, browse available salons and services in your area, select your preferred appointment time, and complete your booking. You'll receive confirmation details via email.",
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
		<div>
			{/* FAQ Tabs */}
			<div className="flex space-x-8 mb-8 border-b border-gray-200">
				<button
					onClick={() => setActiveTab('general')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'general'
							? 'text-orange-600 border-b-2 border-orange-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					General
				</button>
				<button
					onClick={() => setActiveTab('account')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'account'
							? 'text-orange-600 border-b-2 border-orange-600'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					Account
				</button>
				<button
					onClick={() => setActiveTab('billing')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'billing'
							? 'text-orange-600 border-b-2 border-orange-600'
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
						className="border border-gray-200 rounded-lg overflow-hidden bg-white"
					>
						<button
							onClick={() => toggleQuestion(item.id)}
							className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
						>
							<span className="font-semibold text-black text-left">
								{item.question}
							</span>
							<svg
								className={`w-5 h-5 text-gray-500 transition-transform flex-shrink-0 ml-4 ${
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
							<div className="px-6 pb-4 border-t border-gray-100">
								<p className="text-gray-600 pt-4">{item.answer}</p>
							</div>
						)}
					</div>
				))}
			</div>
		</div>
	);
}
