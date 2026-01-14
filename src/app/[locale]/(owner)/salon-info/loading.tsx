export default function SalonInfoLoading() {
	return (
		<div className="min-h-screen bg-[#fff7f6] p-4 md:p-8">
			<div className="max-w-7xl mx-auto">
				{/* Header Skeleton */}
				<div className="mb-8 text-center">
					<div className="h-8 w-64 bg-gray-200 rounded-lg animate-pulse mx-auto mb-2" />
					<div className="h-4 w-96 bg-gray-200 rounded-lg animate-pulse mx-auto" />
				</div>

				{/* Form Sections Skeleton */}
				<div className="space-y-6 md:space-y-8">
					{[...Array(4)].map((_, i) => (
						<div
							key={i}
							className="bg-white border border-gray-200 rounded-lg p-3 md:p-6"
						>
							<div className="h-6 w-48 bg-gray-200 rounded-lg animate-pulse mb-4 md:mb-6" />
							<div className="space-y-4">
								<div className="h-10 w-full bg-gray-200 rounded-lg animate-pulse" />
								<div className="h-24 w-full bg-gray-200 rounded-lg animate-pulse" />
								<div className="h-10 w-1/2 bg-gray-200 rounded-lg animate-pulse" />
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	);
}
