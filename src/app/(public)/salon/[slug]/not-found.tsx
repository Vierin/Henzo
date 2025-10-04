import Link from 'next/link';
import { Metadata } from 'next';

export const metadata: Metadata = {
	title: 'Salon Not Found',
	description: 'The requested salon could not be found.',
};

export default function NotFound() {
	return (
		<div className="min-h-screen bg-[#F8F5F2] flex items-center justify-center">
			<div className="text-center max-w-md mx-auto px-4">
				<div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
					<span className="text-4xl" role="img" aria-label="Salon not found">
						🏪
					</span>
				</div>
				<h1 className="text-3xl font-bold text-gray-900 mb-4">
					Salon Not Found
				</h1>
				<p className="text-gray-600 mb-8">
					The salon you&apos;re looking for doesn&apos;t exist or may have been
					removed.
				</p>
				<div className="space-y-4">
					<Link
						href="/"
						className="inline-block bg-[#ff5b5b] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#e04a4a] transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2"
					>
						Go Home
					</Link>
					<div>
						<Link
							href="/salons"
							className="text-[#ff5b5b] hover:text-[#e04a4a] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#ff5b5b] focus:ring-offset-2 rounded"
						>
							Browse All Salons
						</Link>
					</div>
				</div>
			</div>
		</div>
	);
}
