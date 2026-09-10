'use client';

import { SettingsSubpageShell } from '@/components/owner/settingsSubpageShell';
import { ownerTheme } from '@/lib/owner/owner-theme';

export default function ReviewsSettingsPage() {
  return (
    <SettingsSubpageShell title="Reviews">
      <div className="rounded-[14px] bg-white px-4 py-8 text-center">
        <p className="font-medium" style={{ color: ownerTheme.text }}>
          No reviews to moderate yet
        </p>
        <p className="mt-1 text-sm" style={{ color: ownerTheme.textSecondary }}>
          Studio reviews will appear here.
        </p>
      </div>
    </SettingsSubpageShell>
  );
}
