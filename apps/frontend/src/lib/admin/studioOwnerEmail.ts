/** Email to show in admin studios list/hub — never the tech owner placeholder. */
export function adminStudioOwnerEmail(s: {
  intendedOwnerEmail?: string | null;
  email?: string | null;
  isSystemOwned?: boolean;
  isUnclaimed?: boolean;
  User?: { email?: string | null } | null;
}): string {
  const intended = s.intendedOwnerEmail?.trim();
  if (intended) return intended;
  const contact = s.email?.trim();
  if (contact) return contact;
  if (s.isSystemOwned) return '—';
  return s.User?.email?.trim() || '—';
}
