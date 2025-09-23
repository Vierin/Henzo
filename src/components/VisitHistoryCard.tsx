'use client';

import Image from 'next/image';

interface VisitHistory {
	id: string;
	salonName: string;
	serviceName: string;
	date: string;
	image: string;
}

interface VisitHistoryCardProps {
	visit: VisitHistory;
	onBookAgain?: (visit: VisitHistory) => void;
}

export default function VisitHistoryCard({
	visit,
	onBookAgain,
}: VisitHistoryCardProps) {
	const handleBookAgain = () => {
		onBookAgain?.(visit);
	};

	return (
		<div className="bg-white rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
			<div className="flex items-center gap-4">
				{/* Service Image */}
				<div className="w-20 h-20 bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center flex-shrink-0">
					<Image
						src={visit.image}
						alt={visit.serviceName}
						className="w-full h-full object-cover rounded-lg"
						onError={(e) => {
							e.currentTarget.style.display = 'none';
							const nextSibling = e.currentTarget
								.nextElementSibling as HTMLElement;
							if (nextSibling) {
								nextSibling.style.display = 'flex';
							}
						}}
					/>
					<div className="w-full h-full bg-gradient-to-br from-pink-100 to-pink-200 rounded-lg flex items-center justify-center hidden">
						<span className="text-2xl">💇‍♀️</span>
					</div>
				</div>

				{/* Service Info */}
				<div className="flex-1">
					<h3 className="text-lg font-semibold text-gray-900 mb-1">
						{visit.salonName}
					</h3>
					<p className="text-gray-600 text-sm mb-2">{visit.serviceName}</p>
					<p className="text-gray-500 text-xs">{visit.date}</p>
				</div>

				{/* Book Again Button */}
				<button
					onClick={handleBookAgain}
					className="bg-[#ff5b5b] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e04a4a] transition-colors"
				>
					Book Again
				</button>
			</div>
		</div>
	);
}
