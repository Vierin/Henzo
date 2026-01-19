export default function OwnerDashboardLoading() {
	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8">
					<div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Stats Cards Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="bg-white border border-gray-200 rounded-lg p-4 md:p-6"
						>
							<div className="h-4 w-24 bg-gray-200 rounded-lg animate-pulse mb-4" />
							<div className="h-8 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
							<div className="h-3 w-20 bg-gray-200 rounded-lg animate-pulse" />
						</div>
					))}
				</div>

				{/* Content Grid Skeleton */}
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
					<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
						<div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse mb-4" />
						<div className="space-y-3">
							{[...Array(5)].map((_, i) => (
								<div
									key={i}
									className="h-16 bg-gray-100 rounded-lg animate-pulse"
								/>
							))}
						</div>
					</div>
					<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
						<div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse mb-4" />
						<div className="h-64 bg-gray-100 rounded-lg animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}
