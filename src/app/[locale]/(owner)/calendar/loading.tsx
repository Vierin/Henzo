export default function CalendarLoading() {
	return (
		<div className="min-h-screen bg-[#fff7f6] p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-6">
					<div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Filters Skeleton */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
					<div className="flex flex-wrap gap-4">
						<div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
						<div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
						<div className="h-10 w-48 bg-gray-200 rounded-lg animate-pulse" />
						<div className="h-10 w-24 bg-gray-200 rounded-lg animate-pulse" />
					</div>
				</div>

				{/* Calendar View Skeleton */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
					<div className="h-96 bg-gray-100 rounded-lg animate-pulse" />
				</div>
			</div>
		</div>
	);
}

