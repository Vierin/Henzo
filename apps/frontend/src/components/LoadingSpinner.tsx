interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	message?: string;
	fullScreen?: boolean;
}

export default function LoadingSpinner({
	size = 'md',
	message = 'Loading...',
	fullScreen = false,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
	};

	const spinner = (
		<div className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'text-center py-8'}`}>
			<div className="flex flex-col items-center gap-3">
				<div
					className={`animate-spin rounded-full border-b-2 border-[#ff5b5b] ${sizeClasses[size]} ${!fullScreen ? 'mx-auto' : ''}`}
				></div>
				{message && (
					<p className="text-gray-600">{message}</p>
				)}
			</div>
		</div>
	);

	if (fullScreen) {
		return (
			<div className="fixed inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
				{spinner}
			</div>
		);
	}

	return spinner;
}
