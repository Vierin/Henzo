'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import VisitHistoryCard from '@/components/VisitHistoryCard';

interface VisitHistory {
	id: string;
	salonName: string;
	serviceName: string;
	date: string;
	image: string;
}

export default function ClientDashboard() {
	const router = useRouter();

	// Mock data for visit history - in real app this would come from API
	const [visitHistory] = useState<VisitHistory[]>([
		{
			id: '1',
			salonName: 'Chic & Sleek Salon',
			serviceName: 'Haircut & Styling',
			date: 'March 15, 2024',
			image: '/api/placeholder/80/80',
		},
		{
			id: '2',
			salonName: 'Nail Nirvana',
			serviceName: 'Manicure',
			date: 'March 10, 2024',
			image: '/api/placeholder/80/80',
		},
		{
			id: '3',
			salonName: 'The Glow Up Studio',
			serviceName: 'Facial Treatment',
			date: 'February 28, 2024',
			image: '/api/placeholder/80/80',
		},
		{
			id: '4',
			salonName: 'Chic & Sleek Salon',
			serviceName: 'Coloring',
			date: 'April 05, 2024',
			image: '/api/placeholder/80/80',
		},
	]);

	const handleBookAgain = (visit: VisitHistory) => {
		// Navigate to booking page or open booking modal
		console.log('Book again:', visit);
	};

	return (
		<div>
			<h1 className="text-3xl font-bold text-gray-900 mb-8">Visit History</h1>

			{visitHistory.length === 0 ? (
				<div className="text-center py-12">
					<div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
						<span className="text-2xl">📅</span>
					</div>
					<h3 className="text-xl font-semibold text-gray-900 mb-2">
						No visits yet
					</h3>
					<p className="text-gray-600">
						Your appointment history will appear here once you start booking
						services.
					</p>
				</div>
			) : (
				<div className="space-y-4">
					{visitHistory.map((visit) => (
						<VisitHistoryCard
							key={visit.id}
							visit={visit}
							onBookAgain={handleBookAgain}
						/>
					))}
				</div>
			)}
		</div>
	);
}
