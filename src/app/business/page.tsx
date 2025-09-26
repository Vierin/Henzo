'use client';

import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';

export default function BusinessLandingPage() {
	return (
		<div className="min-h-screen bg-white">
			{/* Header */}
			<PublicHeader />

			{/* Hero Section */}
			<section className="bg-gradient-to-br from-orange-50 to-pink-50 py-20">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
						{/* Left Content */}
						<div className="space-y-8">
							<h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight">
								The all-in-one platform for your beauty business.
							</h1>
							<p className="text-xl text-gray-600 leading-relaxed">
								Manage appointments, clients, and payments all in one place.
								Henzo helps you grow your business and keep clients coming back.
							</p>
							<div className="flex flex-col sm:flex-row gap-4">
								<Link
									href="/business/register"
									className="bg-orange-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-600 transition-colors text-center"
								>
									Get 2 months free
								</Link>
								<Link
									href="/login"
									className="bg-orange-100 text-orange-700 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-orange-200 transition-colors text-center"
								>
									Already with us? Login
								</Link>
							</div>
						</div>

						{/* Right Illustration */}
						<div className="relative">
							<div className="bg-gradient-to-br from-orange-200 to-pink-200 rounded-3xl p-8 transform rotate-3 shadow-2xl">
								<div className="bg-white rounded-2xl p-6 transform -rotate-3">
									{/* Salon Illustration */}
									<div className="space-y-4">
										{/* Salon counter with products */}
										<div className="flex items-end justify-between bg-gray-100 rounded-lg p-4">
											<div className="flex space-x-2">
												<div className="w-3 h-3 bg-orange-300 rounded-full"></div>
												<div className="w-3 h-3 bg-pink-300 rounded-full"></div>
												<div className="w-3 h-3 bg-purple-300 rounded-full"></div>
											</div>
											<div className="w-8 h-8 bg-orange-200 rounded-full"></div>
										</div>

										{/* People in salon */}
										<div className="grid grid-cols-2 gap-4">
											{/* Client at counter */}
											<div className="flex items-center space-x-2">
												<div className="w-8 h-8 bg-orange-200 rounded-full"></div>
												<div className="w-16 h-2 bg-gray-200 rounded"></div>
											</div>

											{/* Stylist working */}
											<div className="flex items-center space-x-2">
												<div className="w-8 h-8 bg-pink-200 rounded-full"></div>
												<div className="w-12 h-2 bg-gray-200 rounded"></div>
											</div>

											{/* Client in chair */}
											<div className="flex items-center space-x-2">
												<div className="w-8 h-8 bg-purple-200 rounded-full"></div>
												<div className="w-14 h-2 bg-gray-200 rounded"></div>
											</div>

											{/* Another client */}
											<div className="flex items-center space-x-2">
												<div className="w-8 h-8 bg-orange-200 rounded-full"></div>
												<div className="w-10 h-2 bg-gray-200 rounded"></div>
											</div>
										</div>

										{/* Mirrors */}
										<div className="flex justify-center space-x-4">
											<div className="w-12 h-8 bg-gray-300 rounded border-2 border-gray-400"></div>
											<div className="w-12 h-8 bg-gray-300 rounded border-2 border-gray-400"></div>
										</div>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* Run your business section */}
			<section id="features" className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
							Run your business, your way.
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Henzo gives you the tools to manage your business, your way. From
							scheduling to payments, we've got you covered.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Flexible scheduling */}
						<div className="bg-gray-50 rounded-2xl p-8 text-center">
							<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg
									className="w-8 h-8 text-orange-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path
										fillRule="evenodd"
										d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
										clipRule="evenodd"
									/>
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Flexible scheduling
							</h3>
							<p className="text-gray-600">
								Let clients book online, manage your calendar, and send
								automated reminders.
							</p>
						</div>

						{/* Client management */}
						<div className="bg-gray-50 rounded-2xl p-8 text-center">
							<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg
									className="w-8 h-8 text-orange-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Client management
							</h3>
							<p className="text-gray-600">
								Keep track of client preferences, history, and contact
								information.
							</p>
						</div>

						{/* Seamless payments */}
						<div className="bg-gray-50 rounded-2xl p-8 text-center">
							<div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
								<svg
									className="w-8 h-8 text-orange-500"
									fill="currentColor"
									viewBox="0 0 20 20"
								>
									<path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4zM18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Seamless payments
							</h3>
							<p className="text-gray-600">
								Accept payments online or in person, and get paid fast with
								secure processing.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Access from anywhere section */}
			<section className="py-20 bg-gray-50">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
							Access your business from anywhere.
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Henzo is available on any device, so you can manage your business
							from anywhere. Whether you're at the salon, at home, or on the go,
							you'll always have access to your business.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Mobile app */}
						<div className="bg-white rounded-2xl p-8 text-center">
							<div className="bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl p-6 mb-6">
								<div className="w-16 h-24 bg-white rounded-lg mx-auto shadow-lg flex items-center justify-center">
									<div className="w-8 h-12 bg-gray-200 rounded"></div>
								</div>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Mobile app
							</h3>
							<p className="text-gray-600">
								Manage your business on the go with our mobile app for iOS and
								Android.
							</p>
						</div>

						{/* Tablet app */}
						<div className="bg-white rounded-2xl p-8 text-center">
							<div className="bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl p-6 mb-6">
								<div className="w-20 h-16 bg-white rounded-lg mx-auto shadow-lg flex items-center justify-center">
									<div className="w-12 h-8 bg-gray-200 rounded"></div>
								</div>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Tablet app
							</h3>
							<p className="text-gray-600">
								Use our tablet app for a larger screen experience at your front
								desk.
							</p>
						</div>

						{/* Web app */}
						<div className="bg-white rounded-2xl p-8 text-center">
							<div className="bg-gradient-to-br from-orange-200 to-pink-200 rounded-2xl p-6 mb-6">
								<div className="w-20 h-12 bg-white rounded-lg mx-auto shadow-lg flex items-center justify-center">
									<div className="w-16 h-6 bg-gray-200 rounded"></div>
								</div>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-4">
								Web app
							</h3>
							<p className="text-gray-600">
								Access your business from any web browser with our full-featured
								web app.
							</p>
						</div>
					</div>
				</div>
			</section>

			{/* Testimonials section */}
			<section className="py-20 bg-white">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="text-center mb-16">
						<h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
							What our clients say.
						</h2>
						<p className="text-xl text-gray-600 max-w-3xl mx-auto">
							Hear from beauty professionals who have transformed their
							businesses with Henzo.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-3 gap-8">
						{/* Testimonial 1 */}
						<div className="bg-gray-50 rounded-2xl p-8">
							<div className="mb-6">
								<div className="flex text-orange-400 mb-4">
									{[...Array(5)].map((_, i) => (
										<svg
											key={i}
											className="w-5 h-5 fill-current"
											viewBox="0 0 20 20"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									))}
								</div>
								<blockquote className="text-gray-700 text-lg leading-relaxed">
									"Henzo has completely revolutionized how I manage my salon.
									The scheduling is so intuitive, and client communication has
									never been easier!"
								</blockquote>
							</div>
							<div className="border-t border-gray-200 pt-6">
								<div className="font-semibold text-gray-900">Sarah Chen</div>
								<div className="text-gray-600">Owner, Glow & Go Aesthetics</div>
							</div>
						</div>

						{/* Testimonial 2 */}
						<div className="bg-gray-50 rounded-2xl p-8">
							<div className="mb-6">
								<div className="flex text-orange-400 mb-4">
									{[...Array(5)].map((_, i) => (
										<svg
											key={i}
											className="w-5 h-5 fill-current"
											viewBox="0 0 20 20"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									))}
								</div>
								<blockquote className="text-gray-700 text-lg leading-relaxed">
									"As a freelance stylist, Henzo keeps me organized and
									professional. The payment processing is seamless, and my
									clients love the online booking."
								</blockquote>
							</div>
							<div className="border-t border-gray-200 pt-6">
								<div className="font-semibold text-gray-900">Mark Rivera</div>
								<div className="text-gray-600">Freelance Stylist</div>
							</div>
						</div>

						{/* Testimonial 3 */}
						<div className="bg-gray-50 rounded-2xl p-8">
							<div className="mb-6">
								<div className="flex text-orange-400 mb-4">
									{[...Array(5)].map((_, i) => (
										<svg
											key={i}
											className="w-5 h-5 fill-current"
											viewBox="0 0 20 20"
										>
											<path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
										</svg>
									))}
								</div>
								<blockquote className="text-gray-700 text-lg leading-relaxed">
									"The client management features are a lifesaver! I can easily
									access notes and history, making every client feel special and
									understood."
								</blockquote>
							</div>
							<div className="border-t border-gray-200 pt-6">
								<div className="font-semibold text-gray-900">Emily Carter</div>
								<div className="text-gray-600">
									Nail Technician, The Polished Look
								</div>
							</div>
						</div>
					</div>
				</div>
			</section>

			{/* CTA Section */}
			<section className="py-20 bg-gradient-to-r from-orange-500 to-pink-500">
				<div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
					<h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
						Ready to transform your business?
					</h2>
					<p className="text-xl text-orange-100 mb-8">
						Join thousands of beauty professionals who trust Henzo to manage
						their business.
					</p>
					<div className="flex flex-col sm:flex-row gap-4 justify-center">
						<Link
							href="/business/register"
							className="bg-white text-orange-500 px-8 py-4 rounded-lg text-lg font-semibold hover:bg-gray-100 transition-colors"
						>
							Start your free trial
						</Link>
						<Link
							href="/login"
							className="border-2 border-white text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white hover:text-orange-500 transition-colors"
						>
							Already have an account?
						</Link>
					</div>
				</div>
			</section>

			{/* Footer */}
			<footer className="bg-gray-900 text-white py-12">
				<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="mb-4 md:mb-0">
							<div className="text-2xl font-bold mb-2">Henzo</div>
							<p className="text-gray-400">
								© 2024 Henzo. All rights reserved.
							</p>
						</div>
						<div className="flex space-x-6">
							<Link
								href="/terms"
								className="text-gray-400 hover:text-white transition-colors"
							>
								Terms of Service
							</Link>
							<Link
								href="/privacy"
								className="text-gray-400 hover:text-white transition-colors"
							>
								Privacy Policy
							</Link>
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
