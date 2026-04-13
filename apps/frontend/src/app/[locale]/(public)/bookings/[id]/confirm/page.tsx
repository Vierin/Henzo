'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingFallback from '@/components/LoadingFallback';
import ErrorFallback from '@/components/ErrorFallback';
import { apiClient } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useTranslation } from '@/contexts/LanguageContext';
import { withLocale, isLocale, type Locale } from '@/i18n/routing';

export default function ConfirmBookingPage() {
	const params = useParams();
	const router = useRouter();
	const t = useTranslation();
	const { handleError } = useErrorHandler({ showToast: false });
	const bookingId = params.id as string;
	const localeRaw = params.locale as string | undefined;
	const locale: Locale = localeRaw && isLocale(localeRaw) ? localeRaw : 'en';
	const homePath = withLocale('/', locale);

	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const confirmBooking = async () => {
			try {
				await apiClient.put(`/bookings/${bookingId}/confirm`);

				setStatus('success');
				setMessage(t.booking.ownerConfirmSuccessMessage);

				setTimeout(() => {
					router.push(homePath);
				}, 5000);
			} catch (error) {
				const errorMessage = handleError(
					error,
					t.booking.ownerConfirmErrorFallback
				);
				setStatus('error');
				setMessage(errorMessage);
			}
		};

		if (bookingId) {
			confirmBooking();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps -- t.booking strings stable per locale load
	}, [bookingId, router, handleError, homePath]);

	if (status === 'loading') {
		return (
			<LoadingFallback message={t.booking.ownerConfirmLoading} />
		);
	}

	if (status === 'error') {
		return (
			<ErrorFallback
				title={t.booking.ownerConfirmErrorTitle}
				message={message}
			/>
		);
	}

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8 text-center">
				<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
					<svg
						className="h-8 w-8 text-green-600"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M5 13l4 4L19 7"
						/>
					</svg>
				</div>
				<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
					{t.booking.ownerConfirmSuccessTitle}
				</h2>
				<p className="mt-2 text-sm text-gray-600">{message}</p>
				<div className="mt-6 bg-white rounded-lg shadow p-6">
					<p className="text-sm text-gray-700">
						{t.booking.ownerConfirmSuccessDetail}
					</p>
				</div>
				<div className="mt-6">
					<Link
						href={homePath}
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
					>
						{t.common.goHome}
					</Link>
				</div>
			</div>
		</div>
	);
}
