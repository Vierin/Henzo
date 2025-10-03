'use client';

import PublicHeader from '@/components/PublicHeader';
import SearchBookingForm from '@/components/SearchBookingForm';
import RecommendedSalons from '@/components/RecommendedSalons';

export default function HomePageClient() {
	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main>
				{/* Hero Section */}
				<section
					className="py-12 px-6 bg-[#F8F5F2]"
					aria-label="Book beauty appointments"
				>
					<div className="mx-auto max-w-7xl">
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
							<div>
								{/* Left Panel - Search/Booking Form */}
								<SearchBookingForm />
							</div>

							{/* Right Section - Image and Slogan */}
							<div className="relative">
								{/* Slogan */}
								<div className="absolute left-0 top-1/2 transform -translate-y-1/2 z-10">
									<h1 className="text-4xl lg:text-5xl font-bold text-blue-900 leading-tight">
										Book your
										<br />
										<span className="text-[#ff5b5b]">favorite treatments</span>
									</h1>
									<p className="text-lg text-gray-700 mt-4 max-w-md">
										Find and book the best beauty and wellness services near
										you. Hair salons, spas, massage, nails and more.
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>

				{/* Recommended Salons Section */}
				<RecommendedSalons />

				{/* Why Choose Henzo Section */}
				<section className="py-16 px-6 bg-[#FBF7F5]">
					<div className="mx-auto max-w-6xl">
						{/* Heading */}
						<div className="text-center mb-12">
							<h2 className="text-3xl font-bold text-gray-900 mb-4">
								Why Choose Henzo?
							</h2>
							<p className="text-lg text-gray-700">
								Henzo makes booking your next beauty appointment simple and
								convenient.
							</p>
						</div>

						{/* Features Grid */}
						<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
							{/* Feature 1 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">🔍</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Easy Search
								</h3>
								<p className="text-gray-600">
									Find salons and services near you with our smart search and
									filtering options.
								</p>
							</article>

							{/* Feature 2 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">📅</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Flexible Booking
								</h3>
								<p className="text-gray-600">
									Book appointments at your convenience with real-time
									availability and instant confirmation.
								</p>
							</article>

							{/* Feature 3 */}
							<article className="text-center">
								<div className="w-16 h-16 bg-[#ff5b5b] rounded-full flex items-center justify-center mx-auto mb-4">
									<span className="text-2xl text-white">⭐</span>
								</div>
								<h3 className="text-xl font-semibold text-gray-900 mb-2">
									Trusted Reviews
								</h3>
								<p className="text-gray-600">
									Read authentic reviews from real customers to make informed
									decisions.
								</p>
							</article>
						</div>
					</div>
				</section>
			</main>
		</div>
	);
}
