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
        className={`flex w-full items-center rounded-[14px] bg-white text-left outline-none transition duration-150 disabled:opacity-50 ${triggerPad} ${
          open
            ? 'shadow-[0_0_0_2px_rgba(241,89,66,0.28)]'
            : 'hover:bg-[#FFFCF9]'
        }`}
        style={{ color: ownerTheme.text }}
      >
        <span
          className={`min-w-0 flex-1 truncate ${
            !selected ? 'font-normal opacity-60' : 'font-medium'
          }`}
        >
          {display}
        </span>
        <span
          className={`absolute right-2.5 flex h-7 w-7 items-center justify-center rounded-full transition ${
            open ? 'bg-[#FFF1ED]' : 'bg-[#F8F3EB]'
          }`}
        >
          <ChevronDown
            className={`h-4 w-4 shrink-0 transition-transform duration-200 ${
              open ? 'rotate-180' : ''
            }`}
            style={{
              color: open ? ownerTheme.accent : ownerTheme.textSecondary,
            }}
            aria-hidden
          />
        </span>
      </button>

      {open ? (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 z-[80] mt-2 max-h-64 w-max min-w-full max-w-[min(100vw-1.5rem,22rem)] origin-top overflow-y-auto rounded-[16px] border bg-white p-1.5 shadow-[0_16px_40px_rgba(63,50,135,0.14)]"
          style={{ borderColor: ownerTheme.borderSoft }}
        >
          {placeholder != null && placeholder !== '' ? (
            <li role="option" aria-selected={value === ''}>
              <button
                type="button"
                className="flex w-full items-center gap-2 rounded-[12px] px-3.5 py-2.5 text-left text-[15px] transition hover:bg-[#FFF8F4]"
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
                  className="flex w-full items-center gap-2.5 rounded-[12px] px-3.5 py-2.5 text-left text-[15px] transition disabled:opacity-40"
                  style={{
                    color: ownerTheme.text,
                    backgroundColor: isOn
                      ? 'rgba(241, 89, 66, 0.1)'
                      : undefined,
                    fontWeight: isOn ? 600 : 500,
                  }}
                  onMouseEnter={(e) => {
                    if (!isOn) {
                      e.currentTarget.style.backgroundColor = '#FFF8F4';
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = isOn
                      ? 'rgba(241, 89, 66, 0.1)'
                      : 'transparent';
                  }}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                  }}
                >
                  <span className="whitespace-nowrap">{opt.label}</span>
                  {isOn ? (
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
                      style={{ backgroundColor: ownerTheme.accent }}
                    >
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                  ) : (
                    <span className="h-5 w-5 shrink-0" aria-hidden />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
