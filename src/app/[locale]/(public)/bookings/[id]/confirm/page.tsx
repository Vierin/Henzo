'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import LoadingSpinner from '@/components/LoadingSpinner';
import { logger } from '@/lib/logger';

export default function ConfirmBookingPage() {
	const params = useParams();
	const router = useRouter();
	const bookingId = params.id as string;
	const [status, setStatus] = useState<'loading' | 'success' | 'error'>(
		'loading'
	);
	const [message, setMessage] = useState('');

	useEffect(() => {
		const confirmBooking = async () => {
			try {
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

				const response = await fetch(
					`${API_BASE_URL}/bookings/${bookingId}/confirm`,
					{
						method: 'PUT',
					}
				);

				if (!response.ok) {
					const result = await response.json();
					throw new Error(result.message || 'Failed to confirm booking');
				}

				setStatus('success');
				setMessage(
					'Booking confirmed successfully! The client has been notified via email.'
				);

				// Redirect to home page after 5 seconds
				setTimeout(() => {
					router.push('/');
				}, 5000);
			} catch (error) {
				logger.error('Error confirming booking:', error);
				setStatus('error');
				setMessage(
					error instanceof Error
						? error.message
						: 'Failed to confirm booking. Please try again or contact support.'
				);
			}
		};

		if (bookingId) {
			confirmBooking();
		}
	}, [bookingId, router]);

	if (status === 'loading') {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<div className="text-center">
					<LoadingSpinner />
					<p className="mt-4 text-gray-600">Confirming booking...</p>
				</div>
			</div>
		);
	}

	if (status === 'error') {
		return (
			<div className="min-h-screen bg-[#fff7f6] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
				<div className="max-w-md w-full space-y-8 text-center">
					<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100">
						<svg
							className="h-8 w-8 text-red-600"
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
						Confirmation Failed
					</h2>
					<p className="mt-2 text-sm text-gray-600">{message}</p>
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
					Booking Confirmed!
				</h2>
				<p className="mt-2 text-sm text-gray-600">{message}</p>
				<div className="mt-6 bg-white rounded-lg shadow p-6">
					<p className="text-sm text-gray-700">
						The client will receive a confirmation email with all the
						appointment details. You will be redirected to the home page
						shortly.
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
