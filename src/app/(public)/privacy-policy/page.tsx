import { Metadata } from 'next';
import { seoConfig } from '@/constants/seoConfig';
import Link from 'next/link';

export const metadata: Metadata = seoConfig.privacy;

export default function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-white">
			<main className="max-w-4xl mx-auto px-6 py-12" role="main">
				<article className="prose prose-lg max-w-none">
					{/* Header */}
					<header className="text-center mb-12">
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Privacy Policy
						</h1>
						<p className="text-gray-600 text-lg">
							Last updated: October 26, 2023
						</p>
					</header>

					{/* Content */}
					<div className="space-y-8">
						{/* Introduction */}
						<section>
							<p className="text-gray-700 leading-relaxed text-base">
								This Privacy Policy describes how Henzo (&quot;we&quot;,
								&quot;us&quot;, or &quot;our&quot;) collects, uses, and shares
								your personal information when you use our services. We are
								committed to protecting your privacy and handling your
								information responsibly.
							</p>
						</section>

						{/* Information We Collect */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Information We Collect
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We collect information you provide directly to us, such as when
								you create an account, make a booking, or contact us for
								support. This may include your name, email address, phone
								number, and payment information. We also automatically collect
								certain information about your device and how you interact with
								our services, including your IP address, device information, and
								browsing activity.
							</p>
						</section>

						{/* How We Use Your Information */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								How We Use Your Information
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We use your information to provide and improve our services,
								process your bookings, communicate with you, and personalize
								your experience. We may also use your information for marketing
								purposes, such as sending you promotional emails about our
								services. You can opt out of these marketing communications at
								any time.
							</p>
						</section>

						{/* Information Sharing */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Information Sharing
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We may share your information with third-party service providers
								who help us operate our business, such as payment processors,
								customer support tools, and marketing partners. We may also
								share your information if required by law or to protect our
								rights and interests.
							</p>
						</section>

						{/* Data Security */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Data Security
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We take reasonable measures to protect your personal information
								from unauthorized access, use, or disclosure. However, no method
								of transmission over the internet or electronic storage is
								completely secure, and we cannot guarantee absolute security.
							</p>
						</section>

						{/* Your Rights */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Your Rights
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								You have the right to access, correct, or delete your personal
								information. You also have the right to object to or restrict
								certain processing of your information. To exercise these
								rights, please contact us using the information provided below.
							</p>
						</section>

						{/* Cookies and Tracking */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Cookies and Tracking Technologies
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We use cookies and similar tracking technologies to enhance your
								experience on our platform, analyze usage patterns, and provide
								personalized content. You can control cookie settings through
								your browser preferences, though some features may not function
								properly if cookies are disabled.
							</p>
						</section>

						{/* Data Retention */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Data Retention
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We retain your personal information for as long as necessary to
								provide our services and fulfill the purposes outlined in this
								Privacy Policy, unless a longer retention period is required by
								law. When you delete your account, we will securely delete or
								anonymize your personal information.
							</p>
						</section>

						{/* International Transfers */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								International Data Transfers
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								Your information may be transferred to and processed in
								countries other than your own. We ensure that such transfers are
								conducted in accordance with applicable data protection laws and
								implement appropriate safeguards to protect your personal
								information.
							</p>
						</section>

						{/* Children's Privacy */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Children&apos;s Privacy
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								Our services are not intended for children under the age of 13.
								We do not knowingly collect personal information from children
								under 13. If we become aware that we have collected personal
								information from a child under 13, we will take steps to delete
								such information promptly.
							</p>
						</section>

						{/* Changes to Privacy Policy */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Changes to This Privacy Policy
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								We may update this Privacy Policy from time to time to reflect
								changes in our practices or applicable laws. We will notify you
								of any material changes by posting the updated policy on our
								website and updating the &quot;Last updated&quot; date.
							</p>
						</section>

						{/* Contact Us */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								Contact Us
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								If you have any questions or concerns about this Privacy Policy,
								please contact us at{' '}
								<Link
									href="mailto:hello@henzo.app"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-[#ea4b4b] focus:ring-offset-2 rounded"
								>
									hello@henzo.app
								</Link>
							</p>
						</section>
					</div>

					{/* Footer */}
					<footer className="mt-12 pt-8 border-t border-gray-200">
						<p className="text-center text-gray-500 text-sm">
							This Privacy Policy is effective as of October 26, 2023.
						</p>
					</footer>
				</article>

				{/* Structured Data */}
				<script
					type="application/ld+json"
					dangerouslySetInnerHTML={{
						__html: JSON.stringify({
							'@context': 'https://schema.org',
							'@type': 'WebPage',
							name: 'Privacy Policy',
							description:
								'Henzo Privacy Policy - Learn how we collect, use, and protect your personal information',
							url: '/privacy-policy',
							dateModified: '2023-10-26',
							datePublished: '2023-10-26',
							author: {
								'@type': 'Organization',
								name: 'Henzo',
								url: 'https://henzo.app',
							},
							publisher: {
								'@type': 'Organization',
								name: 'Henzo',
								url: 'https://henzo.app',
							},
							breadcrumb: {
								'@type': 'BreadcrumbList',
								itemListElement: [
									{
										'@type': 'ListItem',
										position: 1,
										name: 'Home',
										item: '/',
									},
									{
										'@type': 'ListItem',
										position: 2,
										name: 'Privacy Policy',
										item: '/privacy-policy',
									},
								],
							},
						}),
					}}
				/>
			</main>
		</div>
	);
}
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
										href="mailto:hello@henzo.app"
										className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium transition-colors"
									>
										hello@henzo.app
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
