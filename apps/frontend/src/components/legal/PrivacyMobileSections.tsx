import Link from 'next/link';

export function PrivacyScopeSection() {
	return (
		<section>
			<h2 className="text-2xl font-bold text-gray-900 mb-4">Scope</h2>
			<p className="text-gray-700 leading-relaxed text-base mb-4">
				This Privacy Policy applies to the Henzo website (henzo.app), our
				iOS and Android mobile applications, and related services
				(collectively, the &quot;Service&quot;). It describes how we handle
				personal information when you use Henzo as a fitness studio owner or
				staff member, or as a client discovering studios and booking training
				sessions.
			</p>
		</section>
	);
}

export function PrivacyMobileAppSection() {
	return (
		<section>
			<h2 className="text-2xl font-bold text-gray-900 mb-4">
				Mobile Applications
			</h2>
			<p className="text-gray-700 leading-relaxed text-base mb-4">
				When you use our iOS or Android apps, we may collect and process the
				following in addition to the categories above:
			</p>
			<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
				<li>
					<strong>Push notifications:</strong> device push token, platform, and
					app language to send booking and service notifications
				</li>
				<li>
					<strong>Analytics (optional):</strong> app events, app version, user
					identifier, role, and locale when you enable &quot;Analytics &amp;
					crash reports&quot; in app Settings
				</li>
				<li>
					<strong>Crash diagnostics (optional):</strong> crash logs and
					associated user identifier when analytics is enabled
				</li>
				<li>
					<strong>Subscriptions:</strong> purchase and entitlement status via
					Apple App Store or Google Play (processed by the store and RevenueCat;
					we do not receive your full payment card details)
				</li>
				<li>
					<strong>Location (optional):</strong> approximate or precise location
					if you grant permission — to find nearby studios or set a studio
					address on the map
				</li>
				<li>
					<strong>Photos (optional):</strong> images you choose from your gallery
					for profile or studio photos, stored in our cloud storage
				</li>
			</ul>
			<p className="text-gray-700 leading-relaxed text-base mb-4">
				<strong className="font-semibold">Mobile service providers:</strong>
			</p>
			<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
				<li>
					<strong>Google Firebase</strong> (Analytics, Crashlytics, Cloud
					Messaging) —{' '}
					<a
						href="https://firebase.google.com/support/privacy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
					>
						Firebase Privacy
					</a>
				</li>
				<li>
					<strong>RevenueCat</strong> (subscription management) —{' '}
					<a
						href="https://www.revenuecat.com/privacy"
						target="_blank"
						rel="noopener noreferrer"
						className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
					>
						RevenueCat Privacy
					</a>
				</li>
				<li>
					<strong>Apple App Store / Google Play</strong> — payment processing
					for in-app subscriptions
				</li>
			</ul>
			<p className="text-gray-700 leading-relaxed text-base">
				We do not use Apple&apos;s App Tracking Transparency (ATT) framework
				for cross-app tracking. Firebase Analytics is used for product analytics
				only when you opt in inside the app.
			</p>
		</section>
	);
}

export function PrivacyHealthDataSection() {
	return (
		<section>
			<h2 className="text-2xl font-bold text-gray-900 mb-4">
				Health and Fitness Data
			</h2>
			<p className="text-gray-700 leading-relaxed text-base mb-4">
				If you choose to connect Apple Health (iOS) or Health Connect
				(Android), the app may read steps, calories, and workout summaries to
				display an optional activity summary on your profile. This access is
				entirely optional.
			</p>
			<ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
				<li>
					Health data is processed on your device for display in the app
				</li>
				<li>
					We do not sell health data or use it for advertising
				</li>
				<li>
					We do not upload HealthKit or Health Connect data to Henzo servers
					unless we explicitly inform you otherwise in a future update
				</li>
				<li>
					You can revoke access at any time in iOS Health settings or Android
					Health Connect permissions
				</li>
			</ul>
		</section>
	);
}

export function PrivacySubscriptionsSection() {
	return (
		<section>
			<h2 className="text-2xl font-bold text-gray-900 mb-4">
				Subscriptions and Store Accounts
			</h2>
			<p className="text-gray-700 leading-relaxed text-base mb-4">
				Studio owners may purchase a Pro subscription through the Apple App
				Store or Google Play. Payment is charged to your store account.
				Manage or cancel subscriptions in your device settings:{' '}
				<strong>
					iOS: Settings → Apple ID → Subscriptions; Android: Google Play →
					Subscriptions
				</strong>
				.
			</p>
			<p className="text-gray-700 leading-relaxed text-base">
				For subscription terms, see our{' '}
				<Link
					href="/terms-of-service"
					className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
				>
					Terms of Service
				</Link>
				.
			</p>
		</section>
	);
}
