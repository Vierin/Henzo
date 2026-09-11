import type { ReactNode } from 'react';
import { ownerTheme } from '@/lib/owner/owner-theme';

export function OwnerUsageChip({
  label,
  used,
  limit,
  icon,
}: {
  label: string;
  used: number;
  limit: number | null | undefined;
  icon: ReactNode;
}) {
  if (limit == null || limit <= 0) return null;
  const ratio = Math.min(1, used / limit);
  return (
    <div
      className="min-w-0 flex-1 rounded-[12px] px-4 py-3 text-white"
      style={{ backgroundColor: ownerTheme.accent }}
    >
      <div className="flex items-center gap-1.5">
        <span className="shrink-0 text-white">{icon}</span>
        <span className="min-w-0 truncate text-sm font-medium">{label}</span>
      </div>
      <div className="mt-2 flex items-center gap-2.5">
        <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-white/25">
          <div
            className="h-full rounded-full bg-white"
            style={{ width: `${ratio * 100}%` }}
          />
        </div>
        <span className="shrink-0 text-sm font-semibold tabular-nums">
          {used}/{limit}
        </span>
      </div>
    </div>
  );
}

/** Mobile `icon-calendar.svg` — white stroke for usage chips */
export function UsageCalendarIcon() {
  return (
    <svg className="h-3.5 w-3.5" viewBox="0 0 13 12" fill="none" aria-hidden>
      <path
        d="M0.5 4.77778H12.5M3.16667 0.5V1.72222M9.83333 0.5V1.72222M2.63333 11.5H10.3667C11.1134 11.5 11.4868 11.5 11.772 11.3668C12.0229 11.2496 12.2269 11.0626 12.3547 10.8327C12.5 10.5712 12.5 10.2289 12.5 9.54444V3.67778C12.5 2.99327 12.5 2.65101 12.3547 2.38957C12.2269 2.15959 12.0229 1.97261 11.772 1.85544C11.4868 1.72222 11.1134 1.72222 10.3667 1.72222H2.63333C1.8866 1.72222 1.51323 1.72222 1.22801 1.85544C0.977127 1.97261 0.773153 2.15959 0.645327 2.38957C0.5 2.65101 0.5 2.99327 0.5 3.67778V9.54444C0.5 10.2289 0.5 10.5712 0.645327 10.8327C0.773153 11.0626 0.977127 11.2496 1.22801 11.3668C1.51323 11.5 1.88659 11.5 2.63333 11.5Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mobile `icon-people.svg` style — people group */
export function UsagePeopleIcon() {
  return (
    <svg className="h-3.5 w-4" viewBox="0 0 22 20" fill="none" aria-hidden>
      <path
        d="M16.2225 18.5435V16.7384C16.2225 15.7809 15.815 14.8626 15.0895 14.1856C14.3641 13.5085 13.3803 13.1282 12.3544 13.1282H4.61812C3.59223 13.1282 2.60836 13.5085 1.88295 14.1856C1.15753 14.8626 0.75 15.7809 0.75 16.7384V18.5435"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M8.48531 8.48649C10.6216 8.48649 12.3534 6.75467 12.3534 4.61837C12.3534 2.48206 10.6216 0.750244 8.48531 0.750244C6.34901 0.750244 4.61719 2.48206 4.61719 4.61837C4.61719 6.75467 6.34901 8.48649 8.48531 8.48649Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M20.9675 18.5435V16.6984C20.9669 15.8808 20.6626 15.0865 20.1025 14.4403C19.5424 13.7941 18.7582 13.3326 17.873 13.1282"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M14.0039 0.750244C14.8891 0.970154 15.6737 1.46967 16.234 2.17003C16.7943 2.87039 17.0984 3.73177 17.0984 4.61837C17.0984 5.50496 16.7943 6.36634 16.234 7.0667C15.6737 7.76707 14.8891 8.26658 14.0039 8.48649"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
