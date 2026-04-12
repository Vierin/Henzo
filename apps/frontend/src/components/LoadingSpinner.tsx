interface LoadingSpinnerProps {
	size?: 'sm' | 'md' | 'lg';
	/** Shown below the spinner; default "Loading...". Ignored when `inline`. */
	message?: string;
	fullScreen?: boolean;
	/** Spinner ring only — for buttons and inline rows. No label, no extra padding. */
	inline?: boolean;
}

export default function LoadingSpinner({
	size = 'md',
	message,
	fullScreen = false,
	inline = false,
}: LoadingSpinnerProps) {
	const sizeClasses = {
		sm: 'h-4 w-4',
		md: 'h-8 w-8',
		lg: 'h-12 w-12',
	};

	const ringClass = `animate-spin rounded-full border-b-2 border-[#ff5b5b] ${sizeClasses[size]}`;

	if (inline && !fullScreen) {
		return <div className={ringClass} aria-hidden />;
	}

	const displayMessage =
		message !== undefined ? message : 'Loading...';

	const spinner = (
		<div
			className={`flex items-center justify-center ${fullScreen ? 'min-h-screen' : 'text-center py-8'}`}
		>
			<div className="flex flex-col items-center gap-3">
				<div className={`${ringClass} ${!fullScreen ? 'mx-auto' : ''}`} />
				{displayMessage ? (
					<p className="text-gray-600">{displayMessage}</p>
				) : null}
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
