export default function StaffLoading() {
	return (
		<div className="min-h-screen bg-[#fff7f6] p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8">
					<div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Search Skeleton */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 mb-6">
					<div className="h-10 w-full md:w-96 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Staff Grid Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					{[...Array(6)].map((_, i) => (
						<div
							key={i}
							className="bg-white border border-gray-200 rounded-lg p-4 md:p-6"
						>
							<div className="flex items-center gap-4 mb-4">
								<div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse" />
								<div className="flex-1">
									<div className="h-5 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
									<div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse" />
								</div>
							</div>
							<div className="space-y-2">
								<div className="h-4 w-full bg-gray-200 rounded-lg animate-pulse" />
								<div className="h-4 w-2/3 bg-gray-200 rounded-lg animate-pulse" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
