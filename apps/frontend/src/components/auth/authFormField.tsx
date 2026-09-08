'use client';

import { useState, type InputHTMLAttributes, type ReactNode } from 'react';
import { Eye, EyeOff } from 'lucide-react';

/** Previous web auth field chrome — border + compact height; mobile SVG icons. */
export const authFieldClassName =
  'w-full rounded-xl border border-[#E8E0D8] bg-white py-3 text-sm text-[#3F3F3F] outline-none transition placeholder:text-[#878787] focus:border-[#E86D4F]';

const iconWrap =
  'pointer-events-none absolute left-3.5 top-1/2 flex -translate-y-1/2 items-center opacity-60';

export function AuthFieldIcon({
  src,
  width,
  height,
}: {
  src: string;
  width: number;
  height: number;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt="" width={width} height={height} aria-hidden />
  );
}

type AuthFormFieldProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'className'
> & {
  icon?: ReactNode;
  passwordToggle?: boolean;
  invalid?: boolean;
  inputClassName?: string;
};

export function AuthFormField({
  icon,
  passwordToggle,
  invalid,
  inputClassName,
  type,
  ...rest
}: AuthFormFieldProps) {
  const [show, setShow] = useState(false);
  const isPassword = passwordToggle || type === 'password';
  const resolvedType = isPassword ? (show ? 'text' : 'password') : type;

  return (
    <div className="relative">
      {icon ? <span className={iconWrap}>{icon}</span> : null}
      <input
        {...rest}
        type={resolvedType}
        className={[
          authFieldClassName,
          icon ? 'pl-11' : 'px-4',
          isPassword ? 'pr-11' : icon ? 'pr-4' : '',
          invalid ? 'border-red-500 focus:border-red-500' : '',
          inputClassName ?? '',
        ]
          .filter(Boolean)
          .join(' ')}
      />
      {isPassword ? (
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#878787] transition hover:text-[#3F3F3F]"
          aria-label={show ? 'Hide password' : 'Show password'}
          tabIndex={-1}
        >
          {show ? (
            <EyeOff className="h-5 w-5" aria-hidden />
          ) : (
            <Eye className="h-5 w-5" aria-hidden />
          )}
        </button>
      ) : null}
    </div>
  );
}

export const authPrimaryButtonClassName =
  'w-full rounded-xl bg-[#E86D4F] py-3 text-sm font-semibold text-white transition hover:bg-[#d85e42] disabled:opacity-60';

export const authSocialButtonClassName =
  'flex w-full items-center justify-center gap-3 rounded-xl border border-[#E8E0D8] bg-white py-3 text-sm font-medium text-[#3F3F3F] transition hover:border-[#E86D4F]/30 disabled:opacity-60';
