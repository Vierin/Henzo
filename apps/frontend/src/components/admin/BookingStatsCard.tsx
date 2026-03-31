import BookingTrendsChart from './BookingTrendsChart';

interface BookingStatsCardProps {
	title: string;
	totalBookings: number;
	changePercent: number;
	trends: Array<{
		date: string;
		count: number;
	}>;
	period?: string;
}

export default function BookingStatsCard({
	title,
	totalBookings,
	changePercent,
	trends,
	period = '30d',
}: BookingStatsCardProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-600">Total Bookings</span>
					<span className="text-2xl font-bold text-gray-900">
						{totalBookings}
					</span>
				</div>
				<div className="text-sm text-gray-600">
					Last 30 Days
					<span
						className={`ml-2 ${
							changePercent >= 0 ? 'text-green-600' : 'text-red-600'
						}`}
					>
						{changePercent >= 0 ? '+' : ''}
						{changePercent}%
					</span>
				</div>
			</div>

			{/* Booking Trends Chart */}
			<div className="mt-6">
				<h4 className="text-sm font-medium text-gray-700 mb-3">
					Booking Trends
				</h4>
				<BookingTrendsChart data={trends} period={period} />
			</div>
		</div>
	);
}
