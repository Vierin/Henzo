import Link from 'next/link';

export function TermsSubscriptionSection() {
  return (
    <section>
      <h2 className="text-2xl font-bold text-gray-900 mb-4">
        6. Subscriptions (Pro Plan)
      </h2>
      <p className="text-gray-700 leading-relaxed text-base mb-4">
        Studio owners may subscribe to Henzo Pro through in-app purchases on iOS
        or Android. By subscribing, you agree to the following:
      </p>
      <ul className="list-disc list-inside text-gray-700 leading-relaxed text-base mb-4 space-y-2 ml-4">
        <li>
          <strong>Auto-renewal:</strong> Subscriptions renew automatically
          unless you cancel at least 24 hours before the end of the current
          billing period
        </li>
        <li>
          <strong>Billing:</strong> Payment is charged to your Apple ID or
          Google Play account at confirmation of purchase and on each renewal
        </li>
        <li>
          <strong>Manage or cancel:</strong> You can manage or cancel
          subscriptions in your device account settings (Apple ID →
          Subscriptions or Google Play → Subscriptions)
        </li>
        <li>
          <strong>Restore:</strong> Use &quot;Restore purchases&quot; in the app
          if you reinstall or change devices
        </li>
        <li>
          <strong>Refunds:</strong> Refunds are handled by Apple or Google
          according to their policies; Henzo does not process store refunds
          directly except as required by law
        </li>
        <li>
          <strong>Free trials:</strong> If offered, any unused portion of a free
          trial is forfeited when you purchase a subscription, where applicable
          under store rules
        </li>
      </ul>
      <p className="text-gray-700 leading-relaxed text-base">
        Subscription processing may involve RevenueCat and the app stores as
        described in our{' '}
        <Link
          href="/privacy-policy"
          className="text-[#ea4b4b] hover:text-[#d43d3d] font-medium underline"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </section>
  );
}
