'use client';

import { useState } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import { useAuth } from '@/lib/auth-unified';
import { useTranslation } from '@/contexts/LanguageContext';

export default function FeedbackButton() {
	const t = useTranslation();
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const { user } = useAuth();

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!message.trim()) {
			toast.error(t('owner.feedback.pleaseEnterMessage'));
			return;
		}

		setIsSubmitting(true);
		try {
			await apiClient.post('/feedback', {
				message: message.trim(),
				userId: user?.id,
				userEmail: user?.email,
				userName: user?.name,
			});
			toast.success(t('owner.feedback.thankYou'));
			setMessage('');
			setIsOpen(false);
		} catch (error) {
			// Extract error message from API response
			let errorMessage = t('owner.feedback.failedToSend');
			if (error instanceof Error) {
				errorMessage = error.message;
			}
			toast.error(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
			{/* Chat-like form */}
			{isOpen && (
				<div className="mb-4 w-80 bg-white rounded-lg shadow-2xl border border-gray-200 overflow-hidden">
					{/* Header */}
					<div className="bg-[#ff5b5b] text-white px-4 py-3 flex items-center justify-between">
						<div className="flex-1">
							<h3 className="font-semibold text-sm">{t('owner.feedback.title')}</h3>
							<p className="text-xs text-white/90">
								{t('owner.feedback.subtitle')}
							</p>
						</div>
						<button
							onClick={() => setIsOpen(false)}
							className="text-white hover:text-gray-200 transition-colors ml-2 flex-shrink-0"
							aria-label={t('owner.feedback.close')}
						>
							<X className="w-5 h-5" />
						</button>
					</div>

					{/* Form */}
					<form onSubmit={handleSubmit} className="p-4">
						<textarea
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							placeholder={t('owner.feedback.placeholder')}
							className="w-full min-h-[120px] p-3 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:border-transparent text-sm"
							disabled={isSubmitting}
						/>
						<button
							type="submit"
							disabled={isSubmitting || !message.trim()}
							className="mt-3 w-full bg-[#ff5b5b] text-white px-4 py-2 rounded-lg hover:bg-[#e04a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm font-medium"
						>
							{isSubmitting ? (
								<>
									<div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
									{t('owner.feedback.sending')}
								</>
							) : (
								<>
									<Send className="w-4 h-4" />
									{t('owner.feedback.send')}
								</>
							)}
						</button>
					</form>
				</div>
			)}

			{/* Floating button - fixed position */}
			<button
				onClick={() => setIsOpen(!isOpen)}
				className={`w-14 h-14 bg-[#ff5b5b] text-white rounded-full shadow-lg hover:bg-[#e04a4a] transition-all duration-200 flex items-center justify-center flex-shrink-0 ${
					isOpen ? 'rotate-180' : 'hover:scale-110'
				}`}
				aria-label={t('owner.feedback.sendFeedback')}
			>
				{isOpen ? (
					<X className="w-6 h-6" />
				) : (
					<MessageCircle className="w-6 h-6" />
				)}
			</button>
		</div>
	);
}
