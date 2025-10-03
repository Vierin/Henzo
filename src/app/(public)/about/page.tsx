import React from 'react';
import { seoConfig } from '@/constants/seoConfig';

export const metadata = seoConfig.about;

export default function AboutPage() {
	return (
		<>
			<div className="min-h-screen flex flex-col">
				<main className="flex-1 bg-white">
					{/* Hero Section */}
					<section className="bg-gray-800 flex items-center justify-center min-h-[75vh]">
						<div className="max-w-4xl mx-auto px-6 text-center">
							<h1 className="text-5xl font-bold text-white mb-6">
								The Heart of Beauty & Wellness
							</h1>
							<p className="text-xl text-white leading-relaxed">
								Discover the story behind Henzo, our mission, and the values
								that drive us to connect you with the best beauty and wellness
								experiences.
							</p>
						</div>
					</section>

					{/* Statistics Section */}
					<section className="py-16 bg-white">
						<div className="max-w-6xl mx-auto px-6">
							<div className="grid md:grid-cols-3 gap-12 text-center">
								<div>
									<div className="text-6xl font-bold text-[#ea4b4b] mb-4">
										1500
									</div>
									<h3 className="text-2xl font-semibold text-gray-900 mb-2">
										Partner Salons
									</h3>
									<p className="text-gray-600">
										Trusted professionals across the nation.
									</p>
								</div>
								<div>
									<div className="text-6xl font-bold text-[#ea4b4b] mb-4">
										50000
									</div>
									<h3 className="text-2xl font-semibold text-gray-900 mb-2">
										Happy Clients
									</h3>
									<p className="text-gray-600">
										Joined our community for better self-care.
									</p>
								</div>
								<div>
									<div className="text-6xl font-bold text-[#ea4b4b] mb-4">
										200000
									</div>
									<h3 className="text-2xl font-semibold text-gray-900 mb-2">
										Services Booked
									</h3>
									<p className="text-gray-600">
										Seamlessly connecting you to services you love.
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Our Mission Section */}
					<section className="py-16 bg-gray-50">
						<div className="max-w-4xl mx-auto px-6 text-center">
							<h2 className="text-4xl font-bold text-gray-900 mb-8">
								Our Mission
							</h2>
							<p className="text-lg text-gray-600 leading-relaxed">
								At Henzo, our mission is to revolutionize the beauty and
								wellness industry by providing a seamless platform that connects
								clients with top-tier salons and professionals. We strive to
								empower individuals to discover and book personalized services
								that enhance their well-being and confidence.
							</p>
						</div>
					</section>

					{/* Our Values Section */}
					<section className="py-16 bg-white">
						<div className="max-w-6xl mx-auto px-6">
							<div className="text-center mb-12">
								<h2 className="text-4xl font-bold text-gray-900 mb-4">
									Our Values
								</h2>
								<p className="text-lg text-gray-600">
									The principles that guide our every decision and interaction.
								</p>
							</div>
							<div className="grid md:grid-cols-3 gap-8">
								<div className="bg-gray-100 p-8 rounded-lg text-center">
									<div className="w-16 h-16 bg-[#ea4b4b] rounded-full flex items-center justify-center mx-auto mb-6">
										<svg
											className="w-8 h-8 text-white"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-4">
										Client-Centric
									</h3>
									<p className="text-gray-600">
										We prioritize our clients' needs, ensuring a personalized
										and exceptional experience.
									</p>
								</div>
								<div className="bg-gray-100 p-8 rounded-lg text-center">
									<div className="w-16 h-16 bg-[#ea4b4b] rounded-full flex items-center justify-center mx-auto mb-6">
										<svg
											className="w-8 h-8 text-white"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3z" />
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-4">
										Community
									</h3>
									<p className="text-gray-600">
										We foster a vibrant community of clients and professionals,
										promoting collaboration and growth.
									</p>
								</div>
								<div className="bg-gray-100 p-8 rounded-lg text-center">
									<div className="w-16 h-16 bg-[#ea4b4b] rounded-full flex items-center justify-center mx-auto mb-6">
										<svg
											className="w-8 h-8 text-white"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-4">
										Trust & Safety
									</h3>
									<p className="text-gray-600">
										We are committed to maintaining a safe and secure platform,
										ensuring trust and peace of mind for all users.
									</p>
								</div>
							</div>
						</div>
					</section>

					{/* Our Story Section */}
					<section className="py-16 bg-gray-50">
						<div className="max-w-4xl mx-auto px-6">
							<div className="text-center mb-12">
								<h2 className="text-4xl font-bold text-gray-900 mb-8">
									Our Story
								</h2>
							</div>
							<div className="relative">
								{/* Timeline Line */}
								<div className="absolute left-8 top-0 bottom-0 w-1 bg-[#ea4b4b]"></div>

								{/* Timeline Items */}
								<div className="space-y-12">
									<div className="relative flex items-start">
										<div className="absolute left-6 w-4 h-4 bg-[#ea4b4b] rounded-full border-4 border-white"></div>
										<div className="ml-16 bg-gray-100 p-6 rounded-lg">
											<div className="text-sm font-semibold text-[#ea4b4b] mb-2">
												2018
											</div>
											<h3 className="text-xl font-semibold text-gray-900 mb-3">
												The Vision
											</h3>
											<p className="text-gray-600">
												Henzo was founded with a vision to simplify finding and
												booking beauty services.
											</p>
										</div>
									</div>

									<div className="relative flex items-start">
										<div className="absolute left-6 w-4 h-4 bg-[#ea4b4b] rounded-full border-4 border-white"></div>
										<div className="ml-16 bg-gray-100 p-6 rounded-lg">
											<div className="text-sm font-semibold text-[#ea4b4b] mb-2">
												2020
											</div>
											<h3 className="text-xl font-semibold text-gray-900 mb-3">
												Launch & Growth
											</h3>
											<p className="text-gray-600">
												We launched our platform, quickly connecting thousands
												of clients with salons.
											</p>
										</div>
									</div>

									<div className="relative flex items-start">
										<div className="absolute left-6 w-4 h-4 bg-[#ea4b4b] rounded-full border-4 border-white"></div>
										<div className="ml-16 bg-gray-100 p-6 rounded-lg">
											<div className="text-sm font-semibold text-[#ea4b4b] mb-2">
												2023
											</div>
											<h3 className="text-xl font-semibold text-gray-900 mb-3">
												Expanding Horizons
											</h3>
											<p className="text-gray-600">
												Expanded services and reach, becoming a leading platform
												in the industry.
											</p>
										</div>
									</div>
								</div>
							</div>
						</div>
					</section>

					{/* Meet Our Team Section */}
					<section className="py-16 bg-white">
						<div className="max-w-6xl mx-auto px-6">
							<div className="text-center mb-12">
								<h2 className="text-4xl font-bold text-gray-900 mb-6">
									Meet Our Team
								</h2>
								<p className="text-lg text-gray-600 max-w-3xl mx-auto">
									Meet the passionate individuals who power Henzo. Our team is
									comprised of industry experts, tech innovators, and dedicated
									professionals committed to delivering exceptional service.
								</p>
							</div>
							<div className="grid md:grid-cols-3 gap-12 text-center">
								<div>
									<div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-6 flex items-center justify-center">
										<svg
											className="w-16 h-16 text-gray-600"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Sophia Clark
									</h3>
									<p className="text-[#ea4b4b] font-medium">CEO</p>
								</div>
								<div>
									<div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-6 flex items-center justify-center">
										<svg
											className="w-16 h-16 text-gray-600"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Ethan Bennett
									</h3>
									<p className="text-[#ea4b4b] font-medium">CTO</p>
								</div>
								<div>
									<div className="w-32 h-32 bg-gray-300 rounded-full mx-auto mb-6 flex items-center justify-center">
										<svg
											className="w-16 h-16 text-gray-600"
											fill="currentColor"
											viewBox="0 0 20 20"
										>
											<path
												fillRule="evenodd"
												d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
												clipRule="evenodd"
											/>
										</svg>
									</div>
									<h3 className="text-xl font-semibold text-gray-900 mb-2">
										Olivia Hayes
									</h3>
									<p className="text-[#ea4b4b] font-medium">
										Head of Marketing
									</p>
								</div>
							</div>
						</div>
					</section>
				</main>
			</div>
		</>
	);
}
