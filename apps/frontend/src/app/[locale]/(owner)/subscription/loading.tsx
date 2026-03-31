export default function SubscriptionLoading() {
	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8 text-center">
					<div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2" />
					<div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse mx-auto" />
				</div>

				{/* Subscription Plans Skeleton */}
				<div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
					{[...Array(3)].map((_, i) => (
						<div
							key={i}
							className="bg-white border border-gray-200 rounded-lg p-4 md:p-6"
						>
							<div className="h-6 w-32 bg-gray-200 rounded-lg animate-pulse mb-4" />
							<div className="h-8 w-24 bg-gray-200 rounded-lg animate-pulse mb-4" />
							<div className="space-y-3 mb-6">
								{[...Array(4)].map((_, j) => (
									<div key={j} className="h-4 w-full bg-gray-200 rounded-lg animate-pulse" />
								))}
							</div>
							<div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
						</div>
					))}
				</div>
			</div>
		</div>
	);
}

