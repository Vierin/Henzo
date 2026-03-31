export default function ServicesLoading() {
	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8">
					<div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Search and Filter Skeleton */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6 mb-6">
					<div className="flex flex-col md:flex-row gap-4">
						<div className="flex-1 h-10 bg-gray-200 rounded-lg animate-pulse" />
						<div className="w-full md:w-48 h-10 bg-gray-200 rounded-lg animate-pulse" />
						<div className="w-full md:w-48 h-10 bg-gray-200 rounded-lg animate-pulse" />
					</div>
				</div>

				{/* Services Grid Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
					{[...Array(6)].map((_, i) => (
						<div
							key={i}
							className="bg-white border border-gray-200 rounded-lg p-4 md:p-6"
						>
							<div className="h-6 w-3/4 bg-gray-200 rounded-lg animate-pulse mb-4" />
							<div className="h-4 w-full bg-gray-200 rounded-lg animate-pulse mb-2" />
							<div className="h-4 w-2/3 bg-gray-200 rounded-lg animate-pulse mb-4" />
							<div className="flex justify-between items-center">
								<div className="h-5 w-20 bg-gray-200 rounded-lg animate-pulse" />
								<div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

