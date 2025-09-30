interface OverviewCardProps {
	title: string;
	newSalons: number;
	totalSalons: number;
	deletedSalons?: number;
}

export default function OverviewCard({
	title,
	newSalons,
	totalSalons,
	deletedSalons = 0,
}: OverviewCardProps) {
	return (
		<div className="bg-white rounded-lg shadow p-6">
			<h3 className="text-lg font-medium text-gray-900 mb-4">{title}</h3>
			<div className="space-y-4">
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-600">New Salons</span>
					<span className="text-2xl font-bold text-green-600">{newSalons}</span>
				</div>
				<div className="flex justify-between items-center">
					<span className="text-sm text-gray-600">Deleted Accounts</span>
					<span className="text-2xl font-bold text-red-600">
						{deletedSalons}
					</span>
				</div>
				<div className="border-t pt-3">
					<div className="flex justify-between items-center">
						<span className="text-sm text-gray-600">Total Active Salons</span>
						<span className="text-2xl font-bold text-gray-900">
							{totalSalons}
						</span>
					</div>
				</div>
			</div>
		</div>
	);
}
