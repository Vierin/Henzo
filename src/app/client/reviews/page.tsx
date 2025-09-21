'use client';

import { useState } from 'react';
import PublicHeader from '../../../components/PublicHeader';

interface Review {
	id: string;
	salonName: string;
	serviceName: string;
	date: string;
	rating: number;
	review: string;
	image: string;
}

export default function ClientReviewsPage() {
	const [reviews] = useState<Review[]>([
		{
			id: '1',
			salonName: 'Chic & Sleek Salon',
			serviceName: 'Haircut & Styling',
			date: 'March 15, 2024',
			rating: 5,
			review:
				'Amazing service! The stylist was very professional and gave me exactly what I wanted. Highly recommended!',
			image: '/api/placeholder/80/80',
		},
		{
			id: '2',
			salonName: 'Nail Nirvana',
			serviceName: 'Manicure',
			date: 'March 10, 2024',
			rating: 4,
			review:
				'Great nail art and friendly staff. The salon is clean and has a nice atmosphere.',
			image: '/api/placeholder/80/80',
		},
		{
			id: '3',
			salonName: 'The Glow Up Studio',
			serviceName: 'Facial Treatment',
			date: 'February 28, 2024',
			rating: 5,
			review:
				'Relaxing facial treatment. The therapist was knowledgeable and the products felt great on my skin.',
			image: '/api/placeholder/80/80',
		},
	]);

	const renderStars = (rating: number) => {
		return Array.from({ length: 5 }, (_, index) => (
			<svg
				key={index}
				className={`w-5 h-5 ${index < rating ? 'text-yellow-400' : 'text-gray-300'}`}
				fill="currentColor"
				viewBox="0 0 20 20"
			>
				<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
			</svg>
		));
	};

	return (
		<div className="min-h-screen bg-[#fff7f6]">
			<PublicHeader />

			<div className="flex">
				{/* Left Sidebar */}
				<div className="w-64 bg-white shadow-sm border-r border-gray-200 min-h-screen">
					<div className="p-6">
						{/* Brand */}
						<div className="mb-8">
							<h1 className="text-2xl font-bold text-gray-900">Henzo</h1>
						</div>

						{/* Navigation */}
						<nav className="space-y-2">
							<a
								href="/client/history"
								className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
									/>
								</svg>
								<span>Visit History</span>
							</a>

							<div className="flex items-center gap-3 px-3 py-2 bg-[#fff7f6] rounded-lg border-l-4 border-[#ff5b5b]">
								<svg
									className="w-5 h-5 text-gray-700"
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
								<span className="text-gray-800 font-medium">Your Reviews</span>
							</div>

							<a
								href="/client/settings"
								className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer"
							>
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
									/>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
									/>
								</svg>
								<span>Account Settings</span>
							</a>
						</nav>

						{/* Logout */}
						<div className="mt-8 pt-6 border-t border-gray-200">
							<div className="flex items-center gap-3 px-3 py-2 text-gray-600 hover:bg-gray-50 rounded-lg cursor-pointer">
								<svg
									className="w-5 h-5"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										strokeLinecap="round"
										strokeLinejoin="round"
										strokeWidth={2}
										d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
									/>
								</svg>
								<span>Log Out</span>
							</div>
						</div>
					</div>
				</div>

				{/* Main Content */}
				<div className="flex-1 p-8">
					<h1 className="text-3xl font-bold text-gray-900 mb-8">
						Your Reviews
					</h1>

					<div className="space-y-6">
						{reviews.map((review) => (
							<div
								key={review.id}
								className="bg-white rounded-lg p-6 shadow-sm border border-gray-100"
							>
								<div className="flex items-start gap-4">
									{/* Service Image */}
									<div className="w-20 h-20 rounded-lg bg-gray-200 flex items-center justify-center overflow-hidden">
										<img
											src={review.image}
											alt={review.salonName}
											className="w-full h-full object-cover"
											onError={(e) => {
												e.currentTarget.style.display = 'none';
												e.currentTarget.nextElementSibling.style.display =
													'flex';
											}}
										/>
										<div
											className="w-full h-full bg-gradient-to-br from-pink-200 to-purple-200 flex items-center justify-center text-2xl"
											style={{ display: 'none' }}
										>
											⭐
										</div>
									</div>

									{/* Review Details */}
									<div className="flex-1">
										<div className="flex items-center justify-between mb-2">
											<h3 className="text-lg font-semibold text-gray-900">
												{review.salonName}
											</h3>
											<div className="flex items-center gap-1">
												{renderStars(review.rating)}
											</div>
										</div>
										<p className="text-gray-600 mb-2">
											{review.serviceName} • {review.date}
										</p>
										<p className="text-gray-700 leading-relaxed">
											{review.review}
										</p>
									</div>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
