/// Synthetic roster / enrollment users (anonymous spot, walk-in placeholder).
bool isSyntheticGuestEmail(String? email) {
  final e = email?.toLowerCase().trim() ?? '';
  return e.endsWith('@henzo.local');
}

/// Anonymous roster slot — hide from owner client list.
bool isAnonymousRosterClient({String? email, String? name}) {
  if (isSyntheticGuestEmail(email)) return true;
  if ((name ?? '').trim().toLowerCase() == 'walk-in') return true;
  return false;
}
