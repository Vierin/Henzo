'use client';

import { useEffect, useId, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { ownerTheme } from '@/lib/owner/owner-theme';

export type OwnerSelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

/**
 * Custom select — native `<select>` options can't be styled on Windows.
 * Matches owner cream/white fields + accent highlight.
 */
export function OwnerSelect({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  className,
  size = 'field',
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  options: OwnerSelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** `field` = form inputs; `compact` = toolbar filters */
  size?: 'field' | 'compact';
  'aria-label'?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value);
  const display = selected?.label || placeholder || (value ? value : 'Select…');

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const triggerPad =
    size === 'compact'
      ? 'py-2.5 pl-3 pr-9 text-sm font-semibold'
      : 'px-3.5 py-3.5 pr-10 text-[15px]';

  return (
    <div ref={rootRef} className={`relative ${className ?? ''}`}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-label={ariaLabel}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`flex w-full items-center rounded-[14px] bg-white text-left outline-none transition disabled:opacity-50 ${triggerPad} ${
          open ? 'ring-2 ring-[#F15942]/40' : ''
        }`}
        style={{ color: ownerTheme.text }}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            !selected ? 'font-normal opacity-60' : ''
          }`}
        >
          {display}
        </span>
        <ChevronDown
          className={`absolute right-3 h-4 w-4 shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
          style={{ color: ownerTheme.textSecondary }}
          aria-hidden
        />
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 z-[80] mt-1.5 max-h-60 overflow-y-auto rounded-[14px] border bg-white py-1.5 shadow-[0_8px_28px_rgba(63,63,63,0.12)]"
          style={{ borderColor: ownerTheme.borderSoft }}
        >
          {placeholder != null && placeholder !== '' ? (
            <li role="option">
              <button
                type="button"
                className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#FFFCF9]"
                style={{ color: ownerTheme.textSecondary }}
                onClick={() => {
                  onChange('');
                  setOpen(false);
                }}
              >
                {placeholder}
              </button>
            </li>
          ) : null}
          {options.map((opt) => {
            const isOn = opt.value === value;
            return (
              <li key={opt.value} role="option" aria-selected={isOn}>
                <button
                  type="button"
                  disabled={opt.disabled}
                  className="flex w-full items-center gap-2 px-3.5 py-2.5 text-left text-[15px] hover:bg-[#FFFCF9] disabled:opacity-40"
                  style={{
                    color: ownerTheme.text,
                    backgroundColor: isOn
                      ? 'rgba(241, 89, 66, 0.08)'
                      : undefined,
                    fontWeight: isOn ? 600 : 400,
                  }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                  {isOn ? (
                    <Check
                      className="h-4 w-4 shrink-0"
                      style={{ color: ownerTheme.accent }}
                      aria-hidden
                    />
                  ) : null}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
