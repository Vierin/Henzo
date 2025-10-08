'use client';

import Link from 'next/link';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';

export default function UnauthorizedClient() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
			<div className="max-w-md w-full">
				<div className="bg-white rounded-2xl shadow-xl p-8 text-center">
					{/* Icon */}
					<div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
						<ShieldX className="w-10 h-10 text-red-600" />
					</div>

					{/* Title */}
					<h1 className="text-2xl font-bold text-gray-900 mb-2">
						Access Denied
					</h1>
					<p className="text-gray-600 mb-8">
						You do not have permission to access this page. Please check your
						account type or contact support if you believe this is an error.
					</p>

					{/* Actions */}
					<div className="space-y-3">
						<Link
							href="/"
							className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
						>
							<Home className="w-4 h-4" />
							Go to Homepage
						</Link>

						<button
							onClick={() => window.history.back()}
							className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center gap-2"
						>
							<ArrowLeft className="w-4 h-4" />
							Go Back
						</button>
					</div>

					{/* Help Text */}
					<div className="mt-8 pt-6 border-t border-gray-200">
						<p className="text-sm text-gray-500">
							Need help?{' '}
							<Link
								href="/contact"
								className="text-blue-600 hover:text-blue-700 font-medium"
							>
								Contact Support
							</Link>
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
