/// Исход оплаты после Stripe Checkout (deep link `henzo://subscription-checkout`).
enum SubscriptionCheckoutOutcomeKind { success, cancelled }

class SubscriptionCheckoutOutcome {
  const SubscriptionCheckoutOutcome._({required this.kind, this.sessionId});

  final SubscriptionCheckoutOutcomeKind kind;
  final String? sessionId;

  factory SubscriptionCheckoutOutcome.success({String? sessionId}) {
    return SubscriptionCheckoutOutcome._(
      kind: SubscriptionCheckoutOutcomeKind.success,
      sessionId: sessionId,
    );
  }

  factory SubscriptionCheckoutOutcome.cancelled() {
    return const SubscriptionCheckoutOutcome._(
      kind: SubscriptionCheckoutOutcomeKind.cancelled,
    );
  }
}

/// Разбор `henzo://subscription-checkout?...`
SubscriptionCheckoutOutcome? parseSubscriptionCheckoutDeepLink(Uri uri) {
  const scheme = 'henzo';
  const host = 'subscription-checkout';
  if (uri.scheme != scheme || uri.host != host) return null;
  final status = uri.queryParameters['status']?.toLowerCase() ?? '';
  if (status == 'success') {
    final sid = uri.queryParameters['session_id'];
    return SubscriptionCheckoutOutcome.success(
      sessionId: sid != null && sid.isNotEmpty ? sid : null,
    );
  }
  if (status == 'cancelled' || status == 'canceled' || status == 'cancel') {
    return SubscriptionCheckoutOutcome.cancelled();
  }
  return null;
}
