import { Metadata } from 'next';
import Link from 'next/link';
import { seoConfig } from '@/constants/seoConfig';

export const metadata: Metadata = seoConfig.terms;

export default function TermsOfService() {
	return (
		<div className="min-h-screen bg-white">
			<main className="max-w-4xl mx-auto px-6 py-12" role="main">
				<article className="prose prose-lg max-w-7xl mx-auto">
					{/* Header */}
					<header className="text-center mb-12">
						<p className="text-[#ea4b4b] text-sm font-semibold uppercase tracking-wide mb-4">
							LEGAL
						</p>
						<h1 className="text-4xl font-bold text-gray-900 mb-4">
							Terms of Service
						</h1>
						<p className="text-gray-600 text-lg">
							Last updated: January 15, 2025
						</p>
					</header>

					{/* Content */}
					<div className="space-y-8">
						{/* Section 1 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								1. Acceptance of Terms
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								By accessing or using Henzo&apos;s services
								(&quot;Service&quot;, &quot;Platform&quot;), you agree to be
								bound by these Terms of Service (&quot;Terms&quot;). If you do
								not agree to these terms, please do not use our services. These
								Terms constitute a legally binding agreement between you and
								IVAN VIERIN PEREBIICHUK (operating as &quot;Henzo&quot;).
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								If you are using the Service on behalf of a business or other
								entity, you represent and warrant that you have the authority to
								bind that entity to these Terms.
							</p>
						</section>

						{/* Section 2 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								2. Description of Service
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Henzo operates as an online marketplace platform that connects
								clients with beauty salons, barbershops, massage parlors, and
								other related service providers (&quot;Service Providers&quot;
								or &quot;Businesses&quot;) in Southeast Asia (SEA) region. We
								provide a technology platform that facilitates the booking and
								scheduling of appointments.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Important:</strong> Henzo is
								NOT a service provider. We do not provide beauty, barbering, or
								massage services. We are a technology platform that connects
								users with independent service providers. The actual services
								are provided by third-party businesses that are independent
								contractors and not employees, agents, or partners of Henzo.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								Henzo does not control, manage, or supervise the services
								provided by Service Providers. We are not responsible for the
								quality, safety, legality, or any other aspect of the services
								provided by Service Providers.
							</p>
						</section>

						{/* Section 3 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								3. Age Restrictions and Eligibility
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Our Service is available to users of all ages. However, if you
								are under the age of 18 (or the age of majority in your
								jurisdiction), you represent that you have obtained parental or
								guardian consent to use the Service and that your parent or
								guardian agrees to be bound by these Terms on your behalf.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								If you are under 13 years of age, you may only use the Service
								with the express consent and supervision of a parent or legal
								guardian. By using the Service, you represent and warrant that
								you have the legal capacity to enter into these Terms or that
								you have obtained the necessary consent from your parent or
								guardian.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								Parents and guardians are responsible for supervising their
								children&apos;s use of the Service and ensuring that their
								children understand and comply with these Terms.
							</p>
						</section>

						{/* Section 4 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								4. User Accounts and Responsibilities
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								You are responsible for:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									Maintaining the confidentiality of your account credentials
								</li>
								<li>
									Providing accurate, current, and complete information when
									creating an account or making a booking
								</li>
								<li>
									All activities that occur under your account, regardless of
									whether you authorized such activities
								</li>
								<li>
									Notifying us immediately of any unauthorized use of your
									account
								</li>
								<li>
									Using the Service only for lawful purposes and in accordance
									with these Terms
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								You agree not to use the Service in any way that infringes on
								the rights of others, violates any applicable laws, or
								interferes with the operation of the Service.
							</p>
						</section>

						{/* Section 5 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								5. Booking Terms and Cancellation Policy
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Booking Process:</strong>
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									When you make a booking, it is initially in
									&quot;PENDING&quot; status and must be confirmed by the
									Service Provider
								</li>
								<li>
									Pending bookings that are not confirmed within 3 hours may be
									automatically canceled by the system
								</li>
								<li>
									Once confirmed, the booking becomes binding between you and
									the Service Provider
								</li>
								<li>
									Henzo facilitates the booking but is not a party to the
									agreement between you and the Service Provider
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Cancellation Policy:</strong>
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									You may cancel a booking at any time before the scheduled
									appointment time, subject to the Service Provider&apos;s
									cancellation policy
								</li>
								<li>
									You cannot cancel a booking that has already been completed or
									has passed
								</li>
								<li>
									Service Providers may have their own cancellation policies,
									including fees for late cancellations or no-shows
								</li>
								<li>
									Any refunds or cancellation fees are determined by the Service
									Provider, not by Henzo
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">No-Show Policy:</strong>
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								If you fail to appear for a confirmed booking without canceling
								(&quot;No-Show&quot;), the Service Provider may charge a no-show
								fee or take other actions in accordance with their policies.
								Henzo is not responsible for any fees or penalties imposed by
								Service Providers.
							</p>
						</section>

						{/* Section 6 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								6. Service Provider Terms
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								If you are a Service Provider using our Platform:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									You are responsible for the accuracy of all information you
									provide about your business, services, prices, and
									availability
								</li>
								<li>
									You must maintain appropriate licenses, permits, and insurance
									as required by applicable laws
								</li>
								<li>
									You are solely responsible for the quality, safety, and
									legality of the services you provide
								</li>
								<li>
									You must respond to booking requests in a timely manner and
									honor confirmed bookings
								</li>
								<li>
									You are responsible for setting and communicating your own
									cancellation policies, pricing, and terms of service
								</li>
								<li>
									Subscription fees, if applicable, are non-refundable except as
									required by law
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								Henzo reserves the right to suspend or terminate Service
								Provider accounts that violate these Terms, engage in fraudulent
								activity, or fail to maintain service quality standards.
							</p>
						</section>

						{/* Section 7 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								7. Reviews and Ratings
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Users may post reviews and ratings about Service Providers. By
								posting a review, you agree that:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									Your review is based on your actual experience with the
									Service Provider
								</li>
								<li>
									Your review is truthful, accurate, and not defamatory,
									libelous, or otherwise unlawful
								</li>
								<li>
									You will not post fake, misleading, or fraudulent reviews
								</li>
								<li>
									You will not post reviews on behalf of others or accept
									compensation for posting reviews
								</li>
								<li>
									You grant Henzo a perpetual, irrevocable license to use,
									display, and distribute your reviews
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Henzo reserves the right to remove, edit, or refuse to post any
								review that violates these Terms, contains false information, is
								defamatory, or violates any applicable laws. We are not
								obligated to monitor or review user-generated content, but we
								may do so at our discretion.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								Service Providers may respond to reviews, but responses must
								also comply with these Terms and applicable laws.
							</p>
						</section>

						{/* Section 8 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								8. Prohibited Activities
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								You agree NOT to:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									Use the Service for any illegal purpose or in violation of any
									applicable laws
								</li>
								<li>
									Create fake bookings, spam bookings, or otherwise abuse the
									booking system
								</li>
								<li>
									Impersonate any person or entity or falsely state or otherwise
									misrepresent your affiliation with any person or entity
								</li>
								<li>
									Interfere with or disrupt the Service or servers or networks
									connected to the Service
								</li>
								<li>
									Use automated systems (bots, scrapers) to access the Service
									without authorization
								</li>
								<li>
									Attempt to gain unauthorized access to any portion of the
									Service or any other accounts, systems, or networks
								</li>
								<li>
									Post or transmit any content that is harmful, threatening,
									abusive, harassing, defamatory, vulgar, obscene, or otherwise
									objectionable
								</li>
								<li>
									Violate any intellectual property rights of Henzo or third
									parties
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								Violation of these prohibitions may result in immediate
								termination of your account and may subject you to legal
								liability.
							</p>
						</section>

						{/* Section 9 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								9. Intellectual Property
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">
									Henzo&apos;s Intellectual Property:
								</strong>{' '}
								All content and materials on the Henzo Platform, including but
								not limited to logos, trademarks, text, graphics, software,
								code, design elements, and the overall look and feel of the
								Platform, are the property of Henzo or its licensors and are
								protected by copyright, trademark, and other intellectual
								property laws.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">
									User-Generated Content:
								</strong>
								By posting, uploading, or submitting any content (including
								reviews, photos, comments) to the Platform, you grant Henzo a
								worldwide, non-exclusive, royalty-free, perpetual, irrevocable,
								transferable license to use, reproduce, modify, adapt, publish,
								translate, distribute, and display such content in any media for
								the purpose of operating and promoting the Platform.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								You represent and warrant that you own or have the necessary
								rights to grant the license described above and that your
								content does not infringe any third-party rights.
							</p>
						</section>

						{/* Section 10 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								10. Limitations of Liability
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">
									DISCLAIMER OF WARRANTIES:
								</strong>
								THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS
								AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS
								OR IMPLIED, INCLUDING BUT NOT LIMITED TO WARRANTIES OF
								MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND
								NON-INFRINGEMENT.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">
									LIMITATION OF LIABILITY:
								</strong>
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>
									<strong>Third-Party Services:</strong> HENZO IS NOT LIABLE FOR
									ANY DAMAGES, INJURIES, LOSSES, OR CLAIMS ARISING FROM OR
									RELATED TO THE SERVICES PROVIDED BY SERVICE PROVIDERS. THE
									RELATIONSHIP BETWEEN YOU AND SERVICE PROVIDERS IS SOLELY
									BETWEEN YOU AND THEM. HENZO ACTS ONLY AS A TECHNOLOGY PLATFORM
									AND IS NOT A PARTY TO ANY AGREEMENT BETWEEN YOU AND SERVICE
									PROVIDERS.
								</li>
								<li>
									<strong>Platform Availability:</strong> HENZO DOES NOT
									GUARANTEE THAT THE SERVICE WILL BE UNINTERRUPTED, SECURE, OR
									ERROR-FREE. WE ARE NOT LIABLE FOR ANY LOSSES RESULTING FROM
									SERVICE INTERRUPTIONS, TECHNICAL FAILURES, OR UNAVAILABILITY.
								</li>
								<li>
									<strong>Maximum Liability:</strong> TO THE MAXIMUM EXTENT
									PERMITTED BY LAW, HENZO&apos;S TOTAL LIABILITY FOR ANY CLAIMS
									ARISING OUT OF OR RELATED TO THE SERVICE SHALL NOT EXCEED THE
									AMOUNT YOU PAID TO HENZO (IF ANY) IN THE 12 MONTHS PRECEDING
									THE CLAIM, OR $100 USD, WHICHEVER IS GREATER.
								</li>
								<li>
									<strong>Excluded Damages:</strong> IN NO EVENT SHALL HENZO BE
									LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
									OR PUNITIVE DAMAGES, INCLUDING LOST PROFITS, LOST DATA, OR
									BUSINESS INTERRUPTION, REGARDLESS OF THE THEORY OF LIABILITY.
								</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								Some jurisdictions do not allow the exclusion of certain
								warranties or limitations of liability, so some of the above
								limitations may not apply to you. In such cases, our liability
								will be limited to the maximum extent permitted by law.
							</p>
						</section>

						{/* Section 11 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								11. Indemnification
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								You agree to indemnify, defend, and hold harmless Henzo, its
								officers, directors, employees, agents, and affiliates from and
								against any and all claims, damages, obligations, losses,
								liabilities, costs, and expenses (including reasonable
								attorney&apos;s fees) arising from: (a) your use of the Service;
								(b) your violation of these Terms; (c) your violation of any
								third-party rights, including intellectual property rights; (d)
								your interaction with Service Providers; or (e) any content you
								post or submit to the Platform.
							</p>
						</section>

						{/* Section 12 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								12. Account Termination
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								You may terminate your account at any time by contacting us or
								using the account deletion features in the Service.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Henzo reserves the right to suspend or terminate your account
								immediately, without prior notice, if you:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>Violate these Terms or any applicable laws</li>
								<li>Engage in fraudulent, abusive, or illegal activity</li>
								<li>
									Fail to pay any fees owed to Henzo (for Service Providers)
								</li>
								<li>Provide false, inaccurate, or misleading information</li>
								<li>Interfere with the operation of the Service</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								Upon termination, your right to use the Service will immediately
								cease. We may retain certain information as required by law or
								for legitimate business purposes. Provisions of these Terms that
								by their nature should survive termination will survive.
							</p>
						</section>

						{/* Section 13 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								13. Data and Privacy
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Your privacy is important to us. Our collection, use, and
								disclosure of your personal information is governed by our{' '}
								<Link
									href="/privacy-policy"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									Privacy Policy
								</Link>
								, which is incorporated into these Terms by reference.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								By using the Service, you consent to the collection and use of
								your information as described in our Privacy Policy. We may
								share certain information with Service Providers to facilitate
								bookings, but we do not sell your personal information to third
								parties.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								We are committed to protecting your personal data in accordance
								with applicable data protection laws. For more information about
								your rights and how we process your data, please see our Privacy
								Policy. If you have any questions or wish to exercise your data
								protection rights, please contact us at{' '}
								<a
									href="mailto:hello@henzo.app"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									hello@henzo.app
								</a>
								.
							</p>
						</section>

						{/* Section 14 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								14. Force Majeure
							</h2>
							<p className="text-gray-700 leading-relaxed text-base">
								Henzo shall not be liable for any failure or delay in
								performance under these Terms resulting from circumstances
								beyond our reasonable control, including but not limited to acts
								of God, natural disasters, war, terrorism, pandemics, government
								actions, internet outages, or failures of third-party service
								providers.
							</p>
						</section>

						{/* Section 15 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								15. Dispute Resolution
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Informal Resolution:</strong>
								Before filing a claim, you agree to try to resolve the dispute
								informally by contacting us at{' '}
								<a
									href="mailto:hello@henzo.app"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									hello@henzo.app
								</a>
								. We will try to resolve the dispute within 60 days of receiving
								your notice.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">
									Disputes with Service Providers:
								</strong>{' '}
								Any disputes between you and a Service Provider regarding the
								services provided must be resolved directly with the Service
								Provider. Henzo is not responsible for resolving disputes
								between users and Service Providers, though we may provide
								assistance at our discretion.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Binding Arbitration:</strong>{' '}
								If we cannot resolve a dispute informally, you and Henzo agree
								to resolve any disputes arising out of or relating to these
								Terms or the Service through final and binding arbitration,
								except as set forth below. The arbitration will be conducted by
								a single arbitrator in accordance with the rules of the
								arbitration organization selected by mutual agreement.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Exceptions:</strong> Either
								party may bring a lawsuit solely for injunctive relief to stop
								unauthorized use or abuse of the Service or intellectual
								property infringement without first engaging in the informal
								dispute resolution process described above.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								<strong className="font-semibold">Class Action Waiver:</strong>
								You agree that disputes will be resolved on an individual basis
								and waive any right to participate in a class action, collective
								action, or representative proceeding.
							</p>
						</section>

						{/* Section 16 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								16. Governing Law and Jurisdiction
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								These Terms shall be governed by and construed in accordance
								with the laws of the Republic of Poland, without regard to its
								conflict of law provisions.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Any legal action or proceeding arising out of or relating to
								these Terms or the Service (except for disputes subject to
								arbitration) shall be brought exclusively in the competent
								courts of Poland. You consent to the personal jurisdiction of
								such courts.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								<strong className="font-semibold">Service Availability:</strong>{' '}
								The Service is provided to users in Southeast Asia (SEA) region.
								By using the Service, you represent that you are located in a
								jurisdiction where the Service is available and that you are not
								located in a jurisdiction where the use of the Service is
								prohibited by law.
							</p>
						</section>

						{/* Section 17 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								17. Modifications to Terms
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								Henzo reserves the right to modify these Terms at any time. We
								will notify users of material changes by:
							</p>
							<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
								<li>Posting the updated Terms on this page</li>
								<li>Updating the &quot;Last updated&quot; date</li>
								<li>
									Sending an email notification for significant changes (if you
									have provided an email address)
								</li>
								<li>Displaying a notice on the Platform</li>
							</ul>
							<p className="text-gray-700 leading-relaxed text-base">
								Your continued use of the Service after such modifications
								constitutes acceptance of the updated Terms. If you do not agree
								to the modified Terms, you must stop using the Service and may
								terminate your account.
							</p>
						</section>

						{/* Section 18 */}
						<section>
							<h2 className="text-2xl font-bold text-gray-900 mb-4">
								18. General Provisions
							</h2>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Entire Agreement:</strong>
								These Terms, together with our Privacy Policy, constitute the
								entire agreement between you and Henzo regarding the Service.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Severability:</strong> If any
								provision of these Terms is found to be unenforceable or
								invalid, that provision will be limited or eliminated to the
								minimum extent necessary, and the remaining provisions will
								remain in full force and effect.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Waiver:</strong> The failure
								of Henzo to enforce any right or provision of these Terms will
								not be deemed a waiver of such right or provision.
							</p>
							<p className="text-gray-700 leading-relaxed text-base mb-4">
								<strong className="font-semibold">Assignment:</strong> You may
								not assign or transfer these Terms or your account without
								Henzo&apos;s prior written consent. Henzo may assign these Terms
								without restriction.
							</p>
							<p className="text-gray-700 leading-relaxed text-base">
								<strong className="font-semibold">Contact Information:</strong>
								If you have any questions about these Terms, please contact us
								at{' '}
								<a
									href="mailto:hello@henzo.app"
									className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
								>
									hello@henzo.app
								</a>
								.
							</p>
						</section>
					</div>

					{/* Footer */}
					<footer className="mt-12 pt-8 border-t border-gray-200">
						<p className="text-center text-gray-500 text-sm">
							These Terms of Service are effective as of January 15, 2025.
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
							name: 'Terms of Service',
							description:
								'Henzo Terms of Service - Legal terms and conditions for using our beauty salon booking platform',
							url: '/terms-of-service',
							dateModified: '2025-01-15',
							datePublished: '2025-01-15',
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
										name: 'Terms of Service',
										item: '/terms-of-service',
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
