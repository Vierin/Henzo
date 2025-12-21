'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api-client';
import toast from 'react-hot-toast';
import Link from 'next/link';
import { CheckCircle, Clock, Mail, ArrowRight } from 'lucide-react';
import { useTranslation } from '@/contexts/LanguageContext';

function BookingConfirmedContent() {
	const searchParams = useSearchParams();
	const router = useRouter();
	const token = searchParams.get('token');
	const t = useTranslation();
	const [loading, setLoading] = useState(true);
	const [bookingConfirmed, setBookingConfirmed] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [bookingId, setBookingId] = useState<string | null>(null);
	const [email, setEmail] = useState<string | null>(null);

	useEffect(() => {
		if (!token) {
			setError('Invalid confirmation link');
			setLoading(false);
			return;
		}

		// Проверяем, был ли токен уже подтвержден (сохранено в sessionStorage)
		const storageKey = `booking_confirmed_${token}`;
		const savedData = sessionStorage.getItem(storageKey);

		if (savedData) {
			try {
				const data = JSON.parse(savedData);
				setBookingId(data.bookingId);
				setEmail(data.email);
				setBookingConfirmed(true);
				setLoading(false);
				return;
			} catch (e) {
				// Если данные повреждены, продолжаем с подтверждением
				console.warn('Failed to parse saved booking data', e);
			}
		}

		const confirmBooking = async () => {
			try {
				setLoading(true);
				const API_BASE_URL =
					process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

				const response = await fetch(
					`${API_BASE_URL}/bookings/confirm-magic-link?token=${token}`,
					{
						method: 'GET',
						headers: {
							'Content-Type': 'application/json',
						},
					}
				);

				if (!response.ok) {
					const errorData = await response.json();
					const errorMessage = errorData.message || 'Failed to confirm booking';

					// Если токен уже использован или истек - это нормально, показываем успех
					// Это может произойти при повторном клике на ссылку или React Strict Mode
					if (
						errorMessage.includes('expired') ||
						errorMessage.includes('already') ||
						errorMessage.includes('already been used') ||
						errorMessage.includes('Invalid or expired') ||
						errorMessage.includes('confirmation link has already been used')
					) {
						// Проверяем, может быть уже был сохранен успешный результат
						const savedData = sessionStorage.getItem(storageKey);
						if (savedData) {
							try {
								const data = JSON.parse(savedData);
								setBookingId(data.bookingId);
								setEmail(data.email);
								setBookingConfirmed(true);
								setLoading(false);
								toast.success('Booking already confirmed!');
								return;
							} catch (e) {
								// Если данные повреждены, продолжаем
								console.warn('Failed to parse saved booking data', e);
							}
						}
						
						// Если токен уже использован, но нет сохраненных данных,
						// это означает, что бронирование уже создано, но мы не можем показать детали
						// Показываем успех с общим сообщением
						setBookingConfirmed(true);
						setLoading(false);
						toast.success('Your booking has already been confirmed!');
						return;
					}

					throw new Error(errorMessage);
				}

				const data = await response.json();
				setBookingId(data.bookingId);
				// Get email from response (API now returns it) or URL parameter as fallback
				const emailFromResponse = data.email || searchParams.get('email');
				if (emailFromResponse) {
					setEmail(emailFromResponse);
				}

				// Сохраняем результат в sessionStorage для предотвращения повторных запросов
				sessionStorage.setItem(
					storageKey,
					JSON.stringify({
						bookingId: data.bookingId,
						email: emailFromResponse,
					})
				);

				setBookingConfirmed(true);
				toast.success('Booking confirmed successfully!');
			} catch (err) {
				console.error('Error confirming booking:', err);
				const errorMessage =
					err instanceof Error ? err.message : t.booking.confirmFailed;
				setError(errorMessage);
				toast.error(errorMessage);
			} finally {
				setLoading(false);
			}
		};

		confirmBooking();
	}, [token, searchParams]);

	if (loading) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
				<div className="text-center">
					<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
					<p className="text-gray-600">{t.booking.confirming}</p>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
				<div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
					<div className="mb-4">
						<svg
							className="w-16 h-16 text-red-500 mx-auto"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</div>
					<h1 className="text-2xl font-bold text-gray-900 mb-4">
						{t.booking.confirmFailedTitle}
					</h1>
					<p className="text-gray-600 mb-6">{error}</p>
					<Link
						href="/"
						className="inline-block px-6 py-3 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
					>
						{t.common.goHome}
					</Link>
				</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
				{/* Success Icon */}
				<div className="text-center mb-6">
					<div className="inline-flex items-center justify-center w-20 h-20 bg-green-100 rounded-full mb-4">
						<CheckCircle className="w-12 h-12 text-green-500" />
					</div>
					<h1 className="text-3xl font-bold text-gray-900 mb-2">
						{t.booking.bookingConfirmed}
					</h1>
					<p className="text-gray-600">
						{t.booking.bookingConfirmedDescription}
					</p>
				</div>

				{/* Status Info */}
				<div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
					<div className="flex items-start gap-3">
						<Clock className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
						<div>
							<p className="text-sm font-medium text-blue-900 mb-1">
								{t.booking.waitingForSalonConfirmationTitle}
							</p>
							<p className="text-sm text-blue-700">
								{t.booking.waitingForSalonConfirmationDescription}
							</p>
						</div>
					</div>
				</div>

				{/* Complete Registration Section */}
				<div className="border-t border-gray-200 pt-6 mt-6">
					<div className="bg-gray-50 rounded-lg p-4 mb-4">
						<div className="flex items-start gap-3">
							<Mail className="w-5 h-5 text-gray-600 mt-0.5 flex-shrink-0" />
							<div className="flex-1">
								<p className="text-sm font-medium text-gray-900 mb-1">
									{t.auth.completeRegistrationTitle}
								</p>
								<p className="text-sm text-gray-600 mb-3">
									{t.auth.completeRegistrationSubtitle}
								</p>
								<Link
									href={
										email
											? `/register?email=${encodeURIComponent(email)}&verified=true`
											: '/register'
									}
									className="inline-flex items-center gap-2 text-sm font-medium text-[#ff5b5b] hover:text-[#e04a4a] transition-colors"
								>
									{t.auth.completeRegistrationCta}
									<ArrowRight className="w-4 h-4" />
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Actions */}
				<div className="flex gap-3 mt-6">
					<Link
						href="/"
						className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors text-center"
					>
						{t.common.goHome}
					</Link>
				</div>
			</div>
		</div>
	);
}

export default function BookingConfirmedPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
					<div className="text-center">
						<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
						<p className="text-gray-600">Loading...</p>
					</div>
				</div>
			}
		>
			<BookingConfirmedContent />
		</Suspense>
	);
}
