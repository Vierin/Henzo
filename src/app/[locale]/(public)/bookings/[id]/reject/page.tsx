'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingFallback from '@/components/LoadingFallback';
import ErrorFallback from '@/components/ErrorFallback';
import { apiClient } from '@/lib/api-client';
import { useErrorHandler } from '@/hooks/useErrorHandler';

export default function RejectBookingPage() {
	const params = useParams();
	const router = useRouter();
	const { handleError } = useErrorHandler({ showToast: false });
	const bookingId = params.id as string;
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const rejectBooking = async () => {
			try {
				await apiClient.put(`/bookings/${bookingId}/reject`, {
					reason:
						'The salon is unable to accommodate this booking at the requested time.',
				});

				setStatus('success');
				setMessage(
					'Booking has been rejected. The client has been notified via email and can choose a different time or salon.'
				);

				// Redirect to home page after 5 seconds
				setTimeout(() => {
					router.push('/');
				}, 5000);
			} catch (error) {
				const errorMessage = handleError(
					error,
					'Failed to reject booking. Please try again or contact support.'
				);
				setStatus('error');
				setMessage(errorMessage);
			}
		};

		if (bookingId) {
			rejectBooking();
		}
	}, [bookingId, router, handleError]);

	if (status === 'loading') {
		return <LoadingFallback message="Processing rejection..." />;
	}

	if (status === 'error') {
		return <ErrorFallback title="Rejection Failed" message={message} />;
	}

	return (
		<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8 text-center">
				<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
					<svg
						className="h-8 w-8 text-[#ff5b5b]"
						fill="none"
						viewBox="0 0 24 24"
						stroke="currentColor"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
					Booking Rejected
				</h2>
				<p className="mt-2 text-sm text-gray-600">{message}</p>
				<div className="mt-6 bg-white rounded-lg shadow p-6">
					<p className="text-sm text-gray-700">
						The client has been notified and can try booking a different time
						slot or explore other salons. You will be redirected to the home
						page shortly.
					</p>
				</div>
				<div className="mt-6">
					<Link
						href="/"
						className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
					>
						Go to Home
					</Link>
				</div>
			</div>
		</div>
	);
}
