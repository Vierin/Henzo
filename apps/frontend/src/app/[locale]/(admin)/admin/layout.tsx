'use client';

import { usePathname } from 'next/navigation';
import { AdminGuard } from '@/components/admin/admin-guard';
import { stripLocaleFromPath } from '@/i18n/routing';

const AUTH_PATH_PREFIXES = ['/admin/login', '/admin/mfa', '/admin/auth'];

function isAdminAuthRoute(pathname: string): boolean {
  const stripped = stripLocaleFromPath(pathname);
  return AUTH_PATH_PREFIXES.some(
    (prefix) => stripped === prefix || stripped.startsWith(`${prefix}/`),
  );
}

/**
 * Keeps AdminGuard + sidebar mounted across panel navigations so only
 * the main content remounts. Auth routes (login / MFA / OAuth) render bare.
 */
export default function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  if (isAdminAuthRoute(pathname)) {
    return <>{children}</>;
  }

  return <AdminGuard>{children}</AdminGuard>;
}
