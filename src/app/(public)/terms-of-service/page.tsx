import React from 'react';
import Head from 'next/head';

export default function TermsOfService() {
	return (
		<>
			<Head>
				<title>Terms of Service - Henzo</title>
				<meta
					name="description"
					content="Henzo Terms of Service - Learn about the terms and conditions for using our beauty salon booking platform."
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>

			<div className="min-h-screen bg-white">
				<div className="max-w-4xl mx-auto px-6 py-12">
					<div className="prose prose-lg max-w-none">
						{/* Header */}
						<div className="text-center mb-12">
							<p className="text-[#ea4b4b] text-sm font-semibold uppercase tracking-wide mb-4">
								LEGAL
							</p>
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								Terms of Service
							</h1>
							<p className="text-gray-600 text-lg">
								Last updated: September 28, 2025
							</p>
						</div>

						{/* Content */}
						<div className="space-y-8">
							{/* Section 1 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									1. Acceptance of Terms
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									By accessing or using Henzo&apos;s services, you agree to be
									bound by these Terms of Service. If you do not agree to these
									terms, please do not use our services.
								</p>
							</div>

							{/* Section 2 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									2. Description of Service
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									Henzo provides a platform for booking appointments with beauty
									salons, barbershops, massage parlors, and other related
									service providers. We facilitate the booking process but are
									not responsible for the services provided by third-party
									businesses.
								</p>
							</div>

							{/* Section 3 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									3. User Responsibilities
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									You are responsible for providing accurate information when
									booking appointments, adhering to the terms and conditions of
									service providers, and using our service only for lawful
									purposes. You agree not to use the service in any way that
									infringes on the rights of others.
								</p>
							</div>

							{/* Section 4 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									4. Intellectual Property
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									All content and materials on Henzo, including but not limited
									to logos, text, software, and design elements, are the
									property of Henzo or its licensors and are protected by
									copyright and other intellectual property laws.
								</p>
							</div>

							{/* Section 5 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									5. Limitations of Liability
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									Henzo shall not be liable for any direct, indirect,
									incidental, special, or consequential damages arising out of
									or in connection with the use of our service. We do not
									guarantee the quality of services provided by third-party
									businesses.
								</p>
							</div>

							{/* Section 6 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									6. Modifications to Terms
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									Henzo reserves the right to modify these Terms of Service at
									any time. We will notify users of any significant changes, and
									continued use of our service after such modifications
									constitutes acceptance of the updated terms.
								</p>
							</div>

							{/* Section 7 */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									7. Governing Law
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									These Terms of Service shall be governed by and construed in
									accordance with the laws of the jurisdiction in which Henzo
									operates, without regard to its conflict of law provisions.
								</p>
							</div>
						</div>

						{/* Footer */}
						<div className="mt-12 pt-8 border-t border-gray-200">
							<p className="text-center text-gray-500 text-sm">
								These Terms of Service are effective as of October 26, 2023.
							</p>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
