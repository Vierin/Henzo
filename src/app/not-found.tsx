import Link from 'next/link';
import Head from 'next/head';

export default function NotFound() {
	return (
		<>
			<Head>
				<title>Page Not Found - Henzo</title>
				<meta
					name="description"
					content="The page you are looking for could not be found."
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>

			<div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
				<div className="text-center max-w-md mx-auto">
					{/* Title */}
					<h1 className="text-7xl font-bold text-gray-900 mb-4">Lost?</h1>

					{/* Subtitle */}
					<h2 className="text-2xl font-semibold text-[#ea4b4b] mb-4">
						Page Not Found
					</h2>

					{/* Description */}
					<p className="text-gray-600 mb-8 text-lg">
						It seems you've ventured off the beaten path. Let's get you back on
						track.
					</p>

					{/* Single Button */}
					<Link
						href="/"
						className="inline-block bg-[#ea4b4b] text-white px-8 py-3 rounded-lg font-medium hover:bg-[#d43d3d] transition-colors duration-200"
					>
						Return to Homepage
					</Link>
				</div>
			</div>
		</>
	);
}
