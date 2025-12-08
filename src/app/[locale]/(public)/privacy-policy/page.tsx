import { Metadata } from 'next';
import { seoConfig } from '@/constants/seoConfig';
import Link from 'next/link';

export const metadata: Metadata = seoConfig.privacy;

export default function PrivacyPolicy() {
	return (
		<div className="min-h-screen bg-white">
			<main className="max-w-4xl mx-auto px-6 py-12" role="main">
				{/* Header */}
				<header className="text-center mb-12">
					<h1 className="text-4xl font-bold text-gray-900 mb-4">
						Privacy Policy
					</h1>
					<p className="text-gray-600 text-lg">
						Last updated: January 15, 2025
					</p>
				</header>

				{/* Content */}
				<div className="space-y-8">
					{/* Introduction */}
					<section>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							This Privacy Policy describes how IVAN VIERIN PEREBIICHUK
							(operating as &quot;Henzo&quot;, &quot;we&quot;, &quot;us&quot;, or
							&quot;our&quot;) collects, uses, and shares your personal
							information when you use our services. We are committed to protecting
							your privacy and handling your information responsibly.
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">Data Controller Information:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-1 ml-4">
							<li>
								<strong>Company Name:</strong> IVAN VIERIN PEREBIICHUK
							</li>
							<li>
								<strong>Tax Identification Number (NIP):</strong> PL5252954316
							</li>
							<li>
								<strong>Registered Country:</strong> Poland
							</li>
							<li>
								<strong>Service Brand:</strong> Henzo
							</li>
							<li>
								<strong>Contact Email:</strong>{' '}
								<Link
									href="mailto:hello@henzo.app"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									hello@henzo.app
								</Link>
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							If you have any questions about this Privacy Policy or wish to
							exercise your data protection rights, please contact us using the
							information above.
						</p>
					</section>

					{/* Information We Collect */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Information We Collect
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We collect information from various sources, as described below:
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">1. Information You Provide
							Directly:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Account Information:</strong> Name, email address, phone
								number, password (hashed)
							</li>
							<li>
								<strong>Booking Information:</strong> Service preferences, booking
								dates and times, special requests, notes
							</li>
							<li>
								<strong>Profile Information:</strong> Profile photos (if
								uploaded), favorite salons, preferences
							</li>
							<li>
								<strong>Communication Data:</strong> Messages sent through our
								platform, support requests, feedback
							</li>
							<li>
								<strong>Business Information:</strong> If you are a service
								provider, we collect business name, address, services offered,
								pricing, working hours, photos, and other business-related
								information
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">2. Information Collected
							Automatically:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Device Information:</strong> IP address, browser type and
								version, operating system, device type, unique device identifiers
							</li>
							<li>
								<strong>Usage Information:</strong> Pages visited, time spent on
								pages, clicks, searches, interactions with features
							</li>
							<li>
								<strong>Location Information:</strong> Approximate location based
								on IP address (for location-based services), precise location if you
								grant permission
							</li>
							<li>
								<strong>Log Data:</strong> Access times, error logs, performance
								data
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">3. Information from Third
							Parties:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Authentication Providers:</strong> If you sign in using
								Google OAuth, we receive your email, name, and profile photo from
								Google
							</li>
							<li>
								<strong>Analytics Providers:</strong> Google Analytics provides us
								with aggregated usage statistics and analytics data
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							<strong className="font-semibold">Required vs. Optional
							Information:</strong> Some information is required to use our Service
							(e.g., email for account creation), while other information is
							optional (e.g., profile photo). We will indicate which fields are
							required at the time of collection.
						</p>
					</section>

					{/* Legal Basis for Processing */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Legal Basis for Processing Your Data
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We process your personal data based on the following legal grounds:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Contract Performance:</strong> To provide our booking
								services, process bookings, send confirmations, and communicate
								about your bookings
							</li>
							<li>
								<strong>Consent:</strong> For marketing communications, analytics
								cookies, and non-essential data processing. You can withdraw your
								consent at any time
							</li>
							<li>
								<strong>Legitimate Interest:</strong> To improve our services,
								ensure security, prevent fraud, analyze usage patterns, and
								maintain the safety and integrity of our platform
							</li>
							<li>
								<strong>Legal Obligation:</strong> To comply with legal
								requirements, such as tax obligations, accounting records, and
								responding to legal requests
							</li>
						</ul>
					</section>

					{/* How We Use Your Information */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							How We Use Your Information
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We use your information for the following purposes:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Service Provision:</strong> To create and manage your
								account, process bookings, send booking confirmations and
								reminders, facilitate communication between you and service
								providers
							</li>
							<li>
								<strong>Communication:</strong> To respond to your inquiries, send
								service-related notifications, and provide customer support
							</li>
							<li>
								<strong>Improvement:</strong> To analyze usage patterns, improve our
								services, develop new features, and enhance user experience
							</li>
							<li>
								<strong>Security:</strong> To detect and prevent fraud, abuse, and
								security threats, and to ensure platform safety
							</li>
							<li>
								<strong>Marketing:</strong> To send promotional communications about
								our services (only with your consent). You can opt out at any time
							</li>
							<li>
								<strong>Legal Compliance:</strong> To comply with applicable laws,
								regulations, and legal processes
							</li>
						</ul>
					</section>

					{/* Information Sharing */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Information Sharing and Third-Party Services
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We share your information with the following categories of recipients:
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">1. Service Providers:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Supabase</strong> (Database & Authentication): We use
								Supabase to store your personal data, manage user accounts, and
								handle authentication. Supabase processes data in accordance with
								their privacy policy and applicable data protection laws.
							</li>
							<li>
								<strong>Brevo (Sendinblue)</strong> (Email Service): We use Brevo to
								send transactional emails (booking confirmations, reminders) and
								marketing emails (with your consent). Brevo is located in the EU and
								processes email addresses and names.
							</li>
							<li>
								<strong>Google Analytics</strong> (Analytics): We use Google
								Analytics (ID: G-KBLFJ1533R) to analyze website usage and improve
								our services. Google Analytics collects IP addresses (anonymized),
								device information, and browsing behavior. This requires your
								consent. Google is located in the US.
							</li>
							<li>
								<strong>Google OAuth</strong> (Authentication): If you choose to
								sign in with Google, Google provides us with your email, name, and
								profile photo. Google is located in the US.
							</li>
							<li>
								<strong>Vercel</strong> (Hosting): Our website is hosted on Vercel,
								which processes server logs and IP addresses. Vercel may be located
								in the US or EU depending on the region.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">2. Service Providers (Business
							Users):</strong>
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							When you make a booking, we share necessary information (name, contact
							details, booking details) with the service provider (salon, barbershop,
							etc.) to facilitate the booking. Service providers are independent
							contractors and are responsible for their own data processing.
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">3. Legal Requirements:</strong>
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We may disclose your information if required by law, court order, or
							government regulation, or to protect our rights, property, or safety,
							or that of our users.
						</p>
						<p className="text-gray-700 leading-relaxed text-base">
							<strong className="font-semibold">4. Business Transfers:</strong> In
							the event of a merger, acquisition, or sale of assets, your
							information may be transferred to the acquiring entity.
						</p>
					</section>

					{/* Data Security */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Data Security
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We implement appropriate technical and organizational measures to
							protect your personal information:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Encryption:</strong> Data in transit is encrypted using TLS
								(Transport Layer Security). Sensitive data at rest is encrypted
								using industry-standard encryption methods.
							</li>
							<li>
								<strong>Access Controls:</strong> Access to personal data is
								restricted to authorized personnel only, on a need-to-know basis.
							</li>
							<li>
								<strong>Authentication:</strong> User accounts are protected by
								secure password hashing and authentication mechanisms.
							</li>
							<li>
								<strong>Regular Updates:</strong> We regularly update our systems
								and security measures to address potential vulnerabilities.
							</li>
							<li>
								<strong>Monitoring:</strong> We monitor our systems for security
								threats and unauthorized access attempts.
							</li>
							<li>
								<strong>Backup and Recovery:</strong> We maintain regular backups
								of data and have disaster recovery procedures in place.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							However, no method of transmission over the internet or electronic
							storage is completely secure. While we strive to protect your personal
							information, we cannot guarantee absolute security. If you become aware
							of any security breach, please contact us immediately.
						</p>
					</section>

					{/* Your Rights */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Your Data Protection Rights
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							You have the following rights regarding your personal data:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Right to Access (Article 15 GDPR):</strong> You have the
								right to request a copy of the personal data we hold about you.
							</li>
							<li>
								<strong>Right to Rectification (Article 16 GDPR):</strong> You have
								the right to request correction of inaccurate or incomplete personal
								data.
							</li>
							<li>
								<strong>Right to Erasure (Article 17 GDPR - &quot;Right to be
								Forgotten&quot;):</strong> You have the right to request deletion of
								your personal data in certain circumstances (e.g., when data is no
								longer necessary, you withdraw consent, or data was unlawfully
								processed).
							</li>
							<li>
								<strong>Right to Restrict Processing (Article 18 GDPR):</strong> You
								have the right to request that we limit the processing of your
								personal data in certain circumstances.
							</li>
							<li>
								<strong>Right to Data Portability (Article 20 GDPR):</strong> You
								have the right to receive your personal data in a structured,
								commonly used, and machine-readable format and to transmit that data
								to another controller.
							</li>
							<li>
								<strong>Right to Object (Article 21 GDPR):</strong> You have the
								right to object to processing of your personal data based on
								legitimate interests or for direct marketing purposes.
							</li>
							<li>
								<strong>Right to Withdraw Consent (Article 7 GDPR):</strong> If we
								process your data based on consent, you have the right to withdraw
								your consent at any time. Withdrawal does not affect the lawfulness
								of processing before withdrawal.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">How to Exercise Your Rights:</strong>
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							To exercise any of these rights, please contact us at{' '}
							<Link
								href="mailto:hello@henzo.app"
								className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
							>
								hello@henzo.app
							</Link>
							with the subject line &quot;Data Protection Request&quot;. We will
							respond to your request within 30 days (or as required by applicable
							law).
						</p>
						<p className="text-gray-700 leading-relaxed text-base">
							<strong className="font-semibold">Right to Lodge a Complaint:</strong>
							If you are located in the EU and believe we have not addressed your
							concerns, you have the right to lodge a complaint with your local data
							protection authority.
						</p>
					</section>

					{/* Cookies and Tracking */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Cookies and Tracking Technologies
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We use cookies and similar tracking technologies to enhance your
							experience, analyze usage, and provide personalized content.
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">Types of Cookies We Use:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Essential Cookies:</strong> Required for the Service to
								function. These include session cookies for authentication and
								security. These cookies do not require consent.
							</li>
							<li>
								<strong>Analytics Cookies:</strong> We use Google Analytics
								(G-KBLFJ1533R) to understand how users interact with our Service.
								These cookies collect anonymized information about your browsing
								behavior. <strong>These cookies require your consent.</strong>
							</li>
							<li>
								<strong>Functional Cookies:</strong> Remember your preferences and
								settings to enhance your experience.
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">Cookie Retention:</strong>
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Session Cookies:</strong> Deleted when you close your browser
							</li>
							<li>
								<strong>Persistent Cookies:</strong> Stored for up to 2 years or
								until you delete them
							</li>
							<li>
								<strong>Google Analytics:</strong> 26 months (default retention
								period)
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">Managing Cookies:</strong>
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							You can control cookies through:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								Our cookie banner, which appears when you first visit our website
							</li>
							<li>
								Your browser settings (most browsers allow you to refuse or delete
								cookies)
							</li>
							<li>
								Google Analytics opt-out:{' '}
								<a
									href="https://tools.google.com/dlpage/gaoptout"
									target="_blank"
									rel="noopener noreferrer"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									https://tools.google.com/dlpage/gaoptout
								</a>
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							Note: Disabling certain cookies may affect the functionality of our
							Service.
						</p>
					</section>

					{/* Data Retention */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Data Retention
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We retain your personal information for the following periods:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Account Data:</strong> While your account is active and for
								3 years after account deletion (for tax and legal compliance
								purposes)
							</li>
							<li>
								<strong>Booking Records:</strong> 7 years after the booking date (for
								accounting and legal requirements)
							</li>
							<li>
								<strong>Marketing Data:</strong> Until you withdraw consent or
								unsubscribe from marketing communications
							</li>
							<li>
								<strong>Server Logs:</strong> 90 days
							</li>
							<li>
								<strong>Analytics Data:</strong> 26 months (Google Analytics default
								retention period)
							</li>
							<li>
								<strong>Support Communications:</strong> 3 years after the last
								communication
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							After the retention period expires, we will securely delete or
							anonymize your personal information, except where we are required to
							retain it for longer periods by law (e.g., tax records, accounting
							requirements).
						</p>
						<p className="text-gray-700 leading-relaxed text-base">
							When you delete your account, we will delete or anonymize your personal
							information within 30 days, subject to the retention periods described
							above for legal compliance.
						</p>
					</section>

					{/* International Transfers */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							International Data Transfers
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							Your personal data may be transferred to and processed in countries
							outside of your country of residence, including:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>United States:</strong> Google Analytics, Google OAuth, and
								Vercel (hosting) process data in the US
							</li>
							<li>
								<strong>European Union:</strong> Brevo (email service) processes data
								in the EU
							</li>
							<li>
								<strong>Other Regions:</strong> Supabase may process data in various
								regions depending on your project configuration
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							<strong className="font-semibold">Safeguards for Data
							Transfers:</strong>
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							When we transfer your data outside the European Economic Area (EEA), we
							ensure appropriate safeguards are in place:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								<strong>Standard Contractual Clauses (SCCs):</strong> We use
								European Commission-approved Standard Contractual Clauses with our
								service providers
							</li>
							<li>
								<strong>Adequacy Decisions:</strong> We transfer data to countries
								with adequacy decisions by the European Commission where applicable
							</li>
							<li>
								<strong>Service Provider Commitments:</strong> Our service providers
								are required to maintain appropriate data protection standards
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							By using our Service, you consent to the transfer of your data to
							these countries. If you have questions about specific transfers, please
							contact us.
						</p>
					</section>

					{/* Children's Privacy */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Children&apos;s Privacy
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							Our Service is available to users of all ages. However, we take the
							privacy of children seriously. If you are under 13 years of age, you
							may only use the Service with the express consent and supervision of
							a parent or legal guardian.
						</p>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							If you are a parent or guardian and believe that your child under 13
							has provided us with personal information without your consent, please
							contact us immediately at{' '}
							<Link
								href="mailto:hello@henzo.app"
								className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
							>
								hello@henzo.app
							</Link>
							, and we will take steps to delete such information promptly.
						</p>
						<p className="text-gray-700 leading-relaxed text-base">
							For users between 13 and 18 years of age, we recommend that you obtain
							parental or guardian consent before using the Service, especially when
							making bookings or providing personal information.
						</p>
					</section>

					{/* Data Breach Notification */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Data Breach Notification
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							In the event of a data breach that may affect your personal
							information, we will:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>
								Notify the relevant data protection authority within 72 hours of
								becoming aware of the breach (as required by GDPR Article 33)
							</li>
							<li>
								Notify affected users without undue delay if the breach is likely to
								result in a high risk to your rights and freedoms (as required by
								GDPR Article 34)
							</li>
							<li>
								Provide information about the nature of the breach, the categories
								of data affected, the likely consequences, and measures taken to
								address the breach
							</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							If you become aware of any security breach or unauthorized access to
							your account, please contact us immediately at{' '}
							<Link
								href="mailto:hello@henzo.app"
								className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
							>
								hello@henzo.app
							</Link>
							.
						</p>
					</section>

					{/* Changes to Privacy Policy */}
					<section>
						<h2 className="text-2xl font-bold text-gray-900 mb-4">
							Changes to This Privacy Policy
						</h2>
						<p className="text-gray-700 leading-relaxed text-base mb-4">
							We may update this Privacy Policy from time to time to reflect changes
							in our practices, services, or applicable laws. We will notify you of
							material changes by:
						</p>
						<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
							<li>Posting the updated policy on this page</li>
							<li>Updating the &quot;Last updated&quot; date</li>
							<li>Sending an email notification for significant changes (if you have
								provided an email address)</li>
							<li>Displaying a notice on our website</li>
						</ul>
						<p className="text-gray-700 leading-relaxed text-base">
							Your continued use of the Service after such changes constitutes
							acceptance of the updated Privacy Policy. If you do not agree to the
							changes, you may stop using the Service and request deletion of your
							account.
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

					{/* Footer */}
					<footer className="mt-12 pt-8 border-t border-gray-200">
						<p className="text-center text-gray-500 text-sm">
							This Privacy Policy is effective as of January 15, 2025.
						</p>
					</footer>
				</div>
			</main>
		</div>
	);
}
