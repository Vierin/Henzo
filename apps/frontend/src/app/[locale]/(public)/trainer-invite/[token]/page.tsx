'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useParams } from 'next/navigation';

const APP_STORE_URL = 'https://apps.apple.com/app/henzo/id6738666750';
const PLAY_STORE_URL =
  'https://play.google.com/store/apps/details?id=com.henzo.app';

function getDeepLink(token: string) {
  return `henzo://trainer-invite/${token}`;
}

function getPlatform(): 'ios' | 'android' | 'other' {
  if (typeof navigator === 'undefined') return 'other';
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/.test(ua)) return 'ios';
  if (/Android/.test(ua)) return 'android';
  return 'other';
}

export default function TrainerInvitePage() {
  const { token } = useParams<{ token: string }>();
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>(
    'other',
  );
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setPlatform(getPlatform());
  }, []);

  function handleOpenApp() {
    window.location.href = getDeepLink(token);
    setAttempted(true);
  }

  const storeUrl = platform === 'ios' ? APP_STORE_URL : PLAY_STORE_URL;
  const isMobile = platform !== 'other';

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12">
      {/* Logo */}
      <div className="mb-10">
        <Image src="/logo.png" alt="Henzo" width={160} height={56} priority />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-2xl border border-gray-100 shadow-sm p-8 flex flex-col items-center text-center gap-6">
        {/* Icon */}
        <div className="w-16 h-16 rounded-2xl bg-orange-50 flex items-center justify-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
              fill="#ff5b5b"
            />
            <circle cx="12" cy="9" r="2.5" fill="white" />
          </svg>
        </div>

        <div>
          <h1 className="text-xl font-bold text-gray-900 mb-2">
            You've been invited!
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed">
            You've been added as a trainer on Henzo. Open the app to complete
            your registration.
          </p>
        </div>

        {/* Primary CTA */}
        <button
          onClick={handleOpenApp}
          className="w-full py-3 px-6 bg-[#ff5b5b] hover:bg-[#e54f4f] text-white font-semibold rounded-xl transition-colors"
        >
          Open Henzo App
        </button>

        {/* After attempting deep link, show store fallback */}
        {attempted && (
          <p className="text-xs text-gray-400">
            App didn&apos;t open?{' '}
            <a
              href={storeUrl}
              className="text-[#ff5b5b] underline font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download Henzo
            </a>
          </p>
        )}

        {/* Divider */}
        <div className="w-full flex items-center gap-3">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">or download the app</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Store buttons */}
        <div className="flex flex-col gap-3 w-full">
          <a
            href={APP_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {/* Apple icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98l-.09.06c-.22.14-2.15 1.26-2.13 3.75.03 2.98 2.61 3.97 2.64 3.98l-.06.29zM13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">App Store</span>
          </a>
          <a
            href={PLAY_STORE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            {/* Play Store icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M3.18 23.76c.3.17.65.19.96.07l12.14-7.37-2.76-2.76-10.34 10zm16.35-9.75L5.82 5.92c-.36-.18-.78-.14-1.1.1L16.86 18.16l2.67-4.15zM2.22 6.44c-.14.27-.22.56-.22.88v9.36c0 .32.08.61.22.88l10.4-10.4-10.4-.72zM19.77 10.5l-1.96-1.2-3.08 3.08 3.08 3.08 1.98-1.21c.56-.34.9-.94.9-1.57s-.36-1.24-.92-1.18z" />
            </svg>
            <span className="text-sm font-medium text-gray-800">
              Google Play
            </span>
          </a>
        </div>

        <p className="text-xs text-gray-400">
          This invitation expires in 7 days.
        </p>
      </div>

      {/* Footer */}
      <p className="mt-8 text-xs text-gray-400">
        © {new Date().getFullYear()} Henzo
      </p>
    </div>
  );
}
