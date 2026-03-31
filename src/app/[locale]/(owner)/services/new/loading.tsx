export default function NewServiceLoading() {
	return (
		<div className="min-h-screen p-4 md:p-8">
			<div className="max-w-3xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8">
					<div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
					<div className="h-4 w-64 bg-gray-200 rounded-lg animate-pulse" />
				</div>

				{/* Form Skeleton */}
				<div className="bg-white border border-gray-200 rounded-lg p-4 md:p-6">
					<div className="space-y-6">
						{[...Array(6)].map((_, i) => (
							<div key={i}>
								<div className="h-4 w-32 bg-gray-200 rounded-lg animate-pulse mb-2" />
								<div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
							</div>
						))}
						<div className="h-10 w-32 bg-gray-200 rounded-lg animate-pulse" />
					</div>
				</div>
			</div>
		</div>
	);
}

