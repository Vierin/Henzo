'use client';

import { ChevronRight } from 'lucide-react';
import { OwnerPinIcon } from '@/components/owner/ownerPinIcon';
import { ownerTheme } from '@/lib/owner/owner-theme';

/** Mobile add-training / studio profile location row */
export function OwnerLocationField({
  name,
  address,
  onClick,
  label,
  disabled,
}: {
  name: string;
  address?: string | null;
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  const addr = (address ?? '').trim();
  return (
    <div className="min-w-0">
      {label ? (
        <span
          className="mb-1.5 block text-[13px] font-medium"
          style={{ color: ownerTheme.textSecondary }}
        >
          {label}
        </span>
      ) : null}
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        className="flex w-full items-start gap-3.5 rounded-[14px] bg-white px-3.5 py-3.5 text-left transition hover:bg-[#FFFCF9] disabled:opacity-50"
      >
        <OwnerPinIcon className="mt-0.5 shrink-0" width={15} height={18} />
        <span className="min-w-0 flex-1">
          <span
            className="block text-[16px] font-bold leading-snug"
            style={{ color: ownerTheme.text }}
          >
            {name.trim() || 'Studio'}
          </span>
          <span
            className="mt-0.5 block text-sm leading-snug"
            style={{ color: addr ? ownerTheme.textSecondary : '#9CA3AF' }}
          >
            {addr || 'No address'}
          </span>
        </span>
        <ChevronRight
          className="mt-1 h-5 w-5 shrink-0"
          style={{ color: ownerTheme.textSecondary }}
        />
      </button>
    </div>
  );
}
