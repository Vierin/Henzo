'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function CheckEmailForm() {
	const router = useRouter();
	const searchParams = useSearchParams();
	const email = searchParams.get('email') || '';
	const userType = searchParams.get('type') || 'client';

	const getTitle = () => {
		switch (userType) {
			case 'business':
				return 'Check Your Email';
			case 'client':
			default:
				return 'Check Your Email';
		}
	};

	const getDescription = () => {
		switch (userType) {
			case 'business':
				return "We've sent a verification link to your email address. Please check your inbox and click the link to activate your business account.";
			case 'client':
			default:
				return "We've sent a verification link to your email address. Please check your inbox and click the link to activate your account.";
		}
	};

	const getNextSteps = () => {
		switch (userType) {
			case 'business':
				return [
					'Check your email inbox (and spam folder)',
					'Click the verification link in the email',
					'Complete your salon setup after verification',
					'Start managing your business',
				];
			case 'client':
			default:
				return [
					'Check your email inbox (and spam folder)',
					'Click the verification link in the email',
					'Log in to your account',
					'Start booking appointments',
				];
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
			<div className="max-w-md w-full space-y-8">
				<div className="text-center">
					{/* Email Icon */}
					<div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-blue-100 mb-4">
						<svg
							className="h-8 w-8 text-blue-600"
							fill="none"
							viewBox="0 0 24 24"
							stroke="currentColor"
						>
							<path
								strokeLinecap="round"
								strokeLinejoin="round"
								strokeWidth={2}
								d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
							/>
						</svg>
					</div>

					{/* Title */}
					<h2 className="mt-6 text-3xl font-extrabold text-gray-900">
						{getTitle()}
					</h2>

					{/* Description */}
					<p className="mt-2 text-sm text-gray-600">{getDescription()}</p>

					{/* Email Address */}
					{email && (
						<div className="mt-4 p-3 bg-gray-100 rounded-lg">
							<p className="text-sm text-gray-700">
								<span className="font-medium">Email sent to:</span> {email}
							</p>
						</div>
					)}

					{/* Next Steps */}
					<div className="mt-6 text-left">
						<h3 className="text-sm font-medium text-gray-900 mb-3">
							Next Steps:
						</h3>
						<ul className="space-y-2">
							{getNextSteps().map((step, index) => (
								<li key={index} className="flex items-start">
									<span className="flex-shrink-0 h-5 w-5 rounded-full bg-blue-100 flex items-center justify-center mr-3 mt-0.5">
										<span className="text-xs font-medium text-blue-600">
											{index + 1}
										</span>
									</span>
									<span className="text-sm text-gray-600">{step}</span>
								</li>
							))}
						</ul>
					</div>

					{/* Action Buttons */}
					<div className="mt-8 space-y-3">
						<button
							onClick={() => router.push('/login')}
							className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-[#ff5b5b] hover:bg-[#e04a4a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
						>
							Go to Login
						</button>

						<button
							onClick={() => router.push('/')}
							className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#ff5b5b]"
						>
							Back to Home
						</button>
					</div>

					{/* Help Text */}
					<div className="mt-6 text-center">
						<p className="text-xs text-gray-500">
							Didn't receive the email? Check your spam folder or{' '}
							<button
								onClick={() => router.push('/login')}
								className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium"
							>
								try logging in again
							</button>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export default function CheckEmailPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
				</div>
			}
		>
			<CheckEmailForm />
		</Suspense>
	);
}
