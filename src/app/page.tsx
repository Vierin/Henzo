import PublicHeader from '../components/PublicHeader';

export default function HomePage() {
	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main>
				{/* Hero Section */}
				<section className="py-16 px-6">
					<div className="mx-auto max-w-6xl">
						<div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-2xl p-12 text-center">
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								Find Your Perfect Beauty Salon
							</h1>
							<p className="text-lg text-gray-700 mb-8 max-w-2xl mx-auto">
								Discover the best beauty salons, barbershops, and spas in your
								city. Book your visit online in seconds.
							</p>
							<div className="flex max-w-2xl mx-auto">
								<div className="flex-1 relative">
									<input
										type="text"
										placeholder="Search for services, salons, or specialists"
										className="w-full px-4 py-4 pl-12 pr-4 bg-white rounded-l-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-[#8B4513] focus:border-transparent"
									/>
									<svg
										className="absolute left-4 top-4 h-6 w-6 text-gray-400"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											strokeLinecap="round"
											strokeLinejoin="round"
											strokeWidth={2}
											d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
										/>
									</svg>
								</div>
								<button className="bg-[#ff5b5b] text-white px-8 py-4 rounded-r-xl font-medium hover:bg-[#e04a4a] transition-colors">
									Search
								</button>
							</div>
						</div>
					</div>
				</section>

				{/* Popular Services Section */}
				<section className="py-16 px-6">
					<div className="mx-auto max-w-6xl">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Popular Services
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-4 gap-6">
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">💇‍♀️</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Haircut</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">💅</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">
									Manicure
								</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">✨</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Facial</h3>
							</div>
							<div className="bg-white rounded-xl p-6 text-center hover:shadow-lg transition-shadow">
								<div className="w-20 h-20 bg-gray-100 rounded-xl mx-auto mb-4 flex items-center justify-center">
									<span className="text-3xl">🧘‍♀️</span>
								</div>
								<h3 className="text-lg font-semibold text-gray-900">Massage</h3>
							</div>
						</div>
					</div>
				</section>

				{/* Recommended Salons Section */}
				<section className="py-16 px-6 bg-white">
					<div className="mx-auto max-w-6xl">
						<h2 className="text-3xl font-bold text-gray-900 mb-8">
							Recommended Salons
						</h2>
						<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
									<span className="text-6xl">💇‍♀️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Orchid" Beauty Salon
									</h3>
									<p className="text-[#ff5b5b] text-sm">12 Lenin St, Moscow</p>
								</div>
							</div>
							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-amber-100 to-amber-200 flex items-center justify-center">
									<span className="text-6xl">✂️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Style" Barbershop
									</h3>
									<p className="text-[#ff5b5b] text-sm">
										34 Pushkin St, Moscow
									</p>
								</div>
							</div>
							<div className="bg-white rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-shadow">
								<div className="h-48 bg-gradient-to-br from-green-100 to-green-200 flex items-center justify-center">
									<span className="text-6xl">🧘‍♀️</span>
								</div>
								<div className="p-6">
									<h3 className="text-xl font-bold text-gray-900 mb-2">
										"Relax" Spa Center
									</h3>
									<p className="text-[#ff5b5b] text-sm">
										56 Turgenev St, Moscow
									</p>
								</div>
							</div>
						</div>
					</div>
				</section>
			</main>

			{/* Footer */}
			<footer className="bg-[#F8F5F2] py-12 px-6">
				<div className="mx-auto max-w-6xl">
					<div className="flex flex-col md:flex-row justify-between items-center">
						<div className="flex gap-8 mb-4 md:mb-0">
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								About Us
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Contact
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Privacy Policy
							</a>
							<a href="#" className="text-gray-700 hover:text-[#8B4513]">
								Terms of Use
							</a>
						</div>
						<div className="text-gray-500 text-sm">
							© 2023 Henzo. All rights reserved.
						</div>
					</div>
				</div>
			</footer>
		</div>
	);
}
