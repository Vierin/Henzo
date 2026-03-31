import Link from 'next/link';

interface ErrorFallbackProps {
	title?: string;
	message?: string;
	onRetry?: () => void;
	showHomeLink?: boolean;
}

export default function ErrorFallback({
	title = 'Something went wrong',
	message = 'An unexpected error occurred',
	onRetry,
	showHomeLink = true,
}: ErrorFallbackProps) {
	return (
		<div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
			<div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center">
				<div className="mb-4">
					<svg
						className="w-16 h-16 text-red-500 mx-auto"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							strokeLinecap="round"
							strokeLinejoin="round"
							strokeWidth={2}
							d="M6 18L18 6M6 6l12 12"
						/>
					</svg>
				</div>
				<h1 className="text-2xl font-bold text-gray-900 mb-4">{title}</h1>
				<p className="text-gray-600 mb-6">{message}</p>
				<div className="flex gap-3 justify-center">
					{onRetry && (
						<button
							onClick={onRetry}
							className="px-6 py-3 bg-[#ff5b5b] text-white rounded-lg hover:bg-[#e04a4a] transition-colors"
						>
							Try Again
						</button>
					)}
					{showHomeLink && (
						<Link
							href="/"
							className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
						>
							Go to Home
						</Link>
					)}
				</div>
			</div>
		</div>
	);
}

