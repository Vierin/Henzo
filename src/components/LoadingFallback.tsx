interface LoadingFallbackProps {
	message?: string;
	fullScreen?: boolean;
}

export default function LoadingFallback({
	message = 'Loading...',
	fullScreen = true,
}: LoadingFallbackProps) {
	const containerClass = fullScreen
		? 'min-h-screen flex items-center justify-center bg-gray-50 px-4'
		: 'flex items-center justify-center py-12 px-4';

	return (
		<div className={containerClass}>
			<div className="text-center">
				<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#ff5b5b] mx-auto mb-4"></div>
				<p className="text-gray-600">{message}</p>
			</div>
		</div>
	);
}

