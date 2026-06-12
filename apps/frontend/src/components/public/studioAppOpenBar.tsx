'use client';

import { useEffect, useState } from 'react';
import {
  buildStudioDeepLink,
  getMobilePlatform,
  storeUrlForPlatform,
  tryOpenDeepLink,
} from '@/lib/appOpenFallback';

type Props = {
  slug: string;
};

export function StudioAppOpenButton({ slug }: Props) {
  const [visible, setVisible] = useState(false);
  const [attempted, setAttempted] = useState(false);

  useEffect(() => {
    setVisible(getMobilePlatform() !== 'other');
  }, []);

  if (!visible || !slug) return null;

  const deepLink = buildStudioDeepLink(slug);
  const storeUrl = storeUrlForPlatform(getMobilePlatform());

  return (
    <div className="flex flex-1 flex-col gap-1">
      <button
        type="button"
        onClick={() => {
          tryOpenDeepLink(deepLink);
          setAttempted(true);
        }}
        className="w-full rounded-lg bg-[#ff5b5b] py-3 text-center text-xs font-semibold uppercase tracking-wide text-white"
      >
        Open in App
      </button>
      {attempted && (
        <a
          href={storeUrl}
          className="text-center text-[10px] font-medium text-[#ff5b5b] underline"
          target="_blank"
          rel="noopener noreferrer"
        >
          Get Henzo
        </a>
      )}
    </div>
  );
}
