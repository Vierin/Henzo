'use client';

import React, { useState, useMemo } from 'react';
import { useTranslation } from '@/contexts/LanguageContext';

type FAQTab = 'general' | 'business' | 'account';

const GENERAL_KEYS = [1, 2, 3] as const;
const BUSINESS_KEYS = [1, 2, 3, 4, 5] as const;
const ACCOUNT_KEYS = [1, 2, 3] as const;

export default function FAQSection() {
	const t = useTranslation();
	const [activeTab, setActiveTab] = useState<FAQTab>('general');
	const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

	const toggleQuestion = (questionId: string) => {
		setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
	};

	const generalItems = useMemo(
		() =>
			GENERAL_KEYS.map((n) => ({
				id: `general-${n}`,
				question: t(`contact.faq.general.q${n}`),
				answer: t(`contact.faq.general.a${n}`),
			})),
		[t]
	);

	const businessItems = useMemo(
		() =>
			BUSINESS_KEYS.map((n) => ({
				id: `business-${n}`,
				question: t(`contact.faq.business.q${n}`),
				answer: t(`contact.faq.business.a${n}`),
			})),
		[t]
	);

	const accountItems = useMemo(
		() =>
			ACCOUNT_KEYS.map((n) => ({
				id: `account-${n}`,
				question: t(`contact.faq.account.q${n}`),
				answer: t(`contact.faq.account.a${n}`),
			})),
		[t]
	);

	const itemsByTab = {
		general: generalItems,
		business: businessItems,
		account: accountItems,
	};

	const items = itemsByTab[activeTab];

	return (
		<div>
			<div className="flex space-x-8 mb-8 border-b border-gray-200">
				<button
					onClick={() => setActiveTab('general')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'general'
							? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					{t('contact.faq.tabGeneral')}
				</button>
				<button
					onClick={() => setActiveTab('business')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'business'
							? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					{t('contact.faq.tabBusiness')}
				</button>
				<button
					onClick={() => setActiveTab('account')}
					className={`pb-4 text-sm font-medium transition-colors relative ${
						activeTab === 'account'
							? 'text-[#ff5b5b] border-b-2 border-[#ff5b5b]'
							: 'text-gray-600 hover:text-gray-900'
					}`}
				>
					{t('contact.faq.tabAccount')}
				</button>
			</div>

			<div className="space-y-4">
				{items.map((item) => (
					<div
						key={item.id}
						className="border border-gray-200 rounded-lg overflow-hidden bg-white"
					>
						<button
							onClick={() => toggleQuestion(item.id)}
							className="w-full px-6 py-4 text-left hover:bg-gray-50 transition-colors flex justify-between items-center"
						>
							<span className="font-semibold text-[#3F3F3F] text-left">
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
