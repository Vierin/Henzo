import React from 'react';
import Head from 'next/head';

export default function PrivacyPolicy() {
	return (
		<>
			<Head>
				<title>Privacy Policy - Henzo</title>
				<meta
					name="description"
					content="Henzo Privacy Policy - Learn how we collect, use, and protect your personal information."
				/>
				<meta name="viewport" content="width=device-width, initial-scale=1" />
			</Head>

			<div className="min-h-screen bg-white">
				<div className="max-w-4xl mx-auto px-6 py-12">
					<div className="prose prose-lg max-w-none">
						{/* Header */}
						<div className="text-center mb-12">
							<h1 className="text-4xl font-bold text-gray-900 mb-4">
								Privacy Policy
							</h1>
							<p className="text-gray-600 text-lg">
								Last updated: October 26, 2023
							</p>
						</div>

						{/* Content */}
						<div className="space-y-8">
							{/* Introduction */}
							<div>
								<p className="text-gray-700 leading-relaxed text-base">
									This Privacy Policy describes how Henzo (&quot;we&quot;,
									&quot;us&quot;, or &quot;our&quot;) collects, uses, and shares
									your personal information when you use our services. We are
									committed to protecting your privacy and handling your
									information responsibly.
								</p>
							</div>

							{/* Information We Collect */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									Information We Collect
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									We collect information you provide directly to us, such as
									when you create an account, make a booking, or contact us for
									support. This may include your name, email address, phone
									number, and payment information. We also automatically collect
									certain information about your device and how you interact
									with our services, including your IP address, device
									information, and browsing activity.
								</p>
							</div>

							{/* How We Use Your Information */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									How We Use Your Information
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									We use your information to provide and improve our services,
									process your bookings, communicate with you, and personalize
									your experience. We may also use your information for
									marketing purposes, such as sending you promotional emails
									about our services. You can opt out of these marketing
									communications at any time.
								</p>
							</div>

							{/* Information Sharing */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									Information Sharing
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									We may share your information with third-party service
									providers who help us operate our business, such as payment
									processors, customer support tools, and marketing partners. We
									may also share your information if required by law or to
									protect our rights and interests.
								</p>
							</div>

							{/* Data Security */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									Data Security
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									We take reasonable measures to protect your personal
									information from unauthorized access, use, or disclosure.
									However, no method of transmission over the internet or
									electronic storage is completely secure, and we cannot
									guarantee absolute security.
								</p>
							</div>

							{/* Your Rights */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									Your Rights
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									You have the right to access, correct, or delete your personal
									information. You also have the right to object to or restrict
									certain processing of your information. To exercise these
									rights, please contact us using the information provided
									below.
								</p>
							</div>

							{/* Contact Us */}
							<div>
								<h2 className="text-2xl font-bold text-gray-900 mb-4">
									Contact Us
								</h2>
								<p className="text-gray-700 leading-relaxed text-base">
									If you have any questions or concerns about this Privacy
									Policy, please contact us at{' '}
									<a
										href="mailto:privacy@henzo.com"
										className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium transition-colors"
									>
										privacy@henzo.com
									</a>
								</p>
							</div>
						</div>

						{/* Footer */}
						<div className="mt-12 pt-8 border-t border-gray-200">
							<p className="text-center text-gray-500 text-sm">
								This Privacy Policy is effective as of October 26, 2023.
							</p>
						</div>
					</div>
				</div>
			</div>
		</>
	);
}
