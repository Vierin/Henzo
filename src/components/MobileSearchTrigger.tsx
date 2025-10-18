'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';
import SearchBookingForm from './SearchBookingForm';

export default function MobileSearchTrigger() {
	const [isOpen, setIsOpen] = useState(false);

	return (
		<>
			{/* Trigger button */}
			<button
				onClick={() => setIsOpen(true)}
				className="w-full flex items-center gap-3 px-4 py-3 bg-white rounded-xl shadow-md text-left text-gray-500 hover:shadow-lg transition-shadow"
			>
				<Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
				<span className="text-sm">Search services, salons...</span>
			</button>

			{/* Fullscreen modal */}
			{isOpen && (
				<div className="fixed inset-0 bg-white z-50 overflow-y-auto">
					{/* Header */}
					<div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between shadow-sm">
						<h2 className="text-lg font-semibold text-gray-900">
							Find Your Perfect Salon
						</h2>
						<button
							onClick={() => setIsOpen(false)}
							className="p-2 hover:bg-gray-100 rounded-full transition-colors"
							aria-label="Close search"
						>
							<svg
								className="w-6 h-6 text-gray-600"
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
						</button>
					</div>

					{/* Search Form */}
					<div className="p-4">
						<SearchBookingForm className="!max-w-none !shadow-none" />
					</div>

					{/* Quick hints */}
					<div className="px-4 pb-6">
						<p className="text-xs text-gray-500 mb-3">Popular searches:</p>
						<div className="flex flex-wrap gap-2">
							{[
								'Haircut',
								'Manicure',
								'Massage',
								'Facial',
								'Hair Coloring',
							].map((term) => (
								<button
									key={term}
									onClick={() => {
										// Could pre-fill search with this term
										setIsOpen(false);
									}}
									className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs hover:bg-gray-200 transition-colors"
								>
									{term}
								</button>
							))}
						</div>
					</div>
				</div>
			)}
		</>
	);
}
