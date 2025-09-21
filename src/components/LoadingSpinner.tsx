interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	message?: string;
}

export default function LoadingSpinner({
	size = 'md',
	message = 'Loading...',
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-6 w-6',
		md: 'h-12 w-12',
		lg: 'h-16 w-16',
	};

	return (
		<div className="text-center py-8">
			<div
				className={`animate-spin rounded-full border-b-2 border-[#ff5b5b] mx-auto mb-4 ${sizeClasses[size]}`}
			></div>
			<p className="text-gray-600">{message}</p>
		</div>
	);
}
