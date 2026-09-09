'use client';

import { X } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';

export type OwnerSessionEditScope = 'single' | 'following';

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (scope: OwnerSessionEditScope) => void;
};

/** Mobile `showOwnerSessionEditScopeDialog` parity. */
export function OwnerSessionEditScopeModal({ open, onClose, onSelect }: Props) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[400] flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-scope-title"
      onClick={onClose}
    >
      <div
        className="w-full max-w-[400px] rounded-2xl bg-white p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start gap-2">
          <h2
            id="edit-scope-title"
            className="min-w-0 flex-1 text-[22px] font-bold leading-tight"
            style={{ color: ownerTheme.text }}
          >
            What to edit?
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ color: ownerTheme.textSecondary }}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p
          className="mt-2 text-[13px] leading-snug"
          style={{ color: ownerTheme.textSecondary }}
        >
          Name, price, and duration of the service are changed under Trainings —
          not here.
        </p>

        <div className="mt-4 space-y-2.5">
          <button
            type="button"
            onClick={() => onSelect('single')}
            className="flex w-full flex-col items-start rounded-xl border border-[#E8D5C8] px-4 py-3.5 text-left transition hover:bg-[#FFFCF9]"
          >
            <span
              className="text-[15px] font-bold"
              style={{ color: ownerTheme.text }}
            >
              This class only
            </span>
            <span
              className="mt-1 text-[13px] leading-snug"
              style={{ color: ownerTheme.textSecondary }}
            >
              Time and trainer for this day only.
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelect('following')}
            className="flex w-full flex-col items-start rounded-xl border border-[#E8D5C8] px-4 py-3.5 text-left transition hover:bg-[#FFFCF9]"
          >
            <span
              className="text-[15px] font-bold"
              style={{ color: ownerTheme.text }}
            >
              This class and all future ones
            </span>
            <span
              className="mt-1 text-[13px] leading-snug"
              style={{ color: ownerTheme.textSecondary }}
            >
              Same service: every scheduled class from this date onward (active
              slots only). Does not change the training card.
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
