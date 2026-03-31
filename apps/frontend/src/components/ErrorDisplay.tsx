interface ErrorDisplayProps {
	error: Error;
	message?: string;
	onRetry?: () => void;
}

export default function ErrorDisplay({
	error,
	message,
	onRetry,
}: ErrorDisplayProps) {
	return (
		<div className="text-center py-8">
			<div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
				<span className="text-2xl">⚠️</span>
			</div>
			<h3 className="text-xl font-semibold text-gray-900 mb-2">
				{message || 'Something went wrong'}
			</h3>
			<p className="text-gray-600 mb-4">
				{error.message || 'An unexpected error occurred'}
			</p>
			{onRetry && (
				<button
					onClick={onRetry}
					className="bg-[#ff5b5b] text-white px-6 py-2 rounded-lg hover:bg-[#e04a4a] transition-colors"
				>
					Try Again
				</button>
			)}
		</div>
	);
}
