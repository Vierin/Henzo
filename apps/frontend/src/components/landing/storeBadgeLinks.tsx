import Link from 'next/link';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import {
  AppleStoreIcon,
  GooglePlayIcon,
} from '@/components/landing/storeIcons';
import { cn } from '@/lib/utils';

const btnClass =
  'inline-flex min-h-[40px] sm:min-h-[50px] w-[140px] sm:w-[169px] items-center justify-center gap-2 rounded-full border-1 border-[#3F3F3F] px-6 py-2 text-sm font-semibold text-[#3F3F3F] shadow-sm whitespace-nowrap transition hover:bg-[#faf8f5] sm:px-7 sm:text-[1em]';

const webBtnClass =
  'w-auto border-transparent bg-[#3F3F3F] text-white hover:bg-[#2a2a2a] sm:w-auto';

type StoreBadgeLinksProps = {
  appStoreLabel: string;
  googlePlayLabel: string;
  webLabel?: string;
  webHref?: string;
  /** e.g. scroll-mt for anchor targets */
  id?: string;
  className?: string;
  buttonClassName?: string;
};

export function StoreBadgeLinks({
  appStoreLabel,
  googlePlayLabel,
  webLabel,
  webHref,
  id,
  className,
  buttonClassName,
}: StoreBadgeLinksProps) {
  const showWeb = Boolean(webLabel && webHref);

  return (
    <div
      id={id}
      className={
        className ??
        'mt-9 flex scroll-mt-28 flex-wrap items-center justify-center gap-6 sm:mt-11 sm:gap-9'
      }
    >
      {showWeb ? (
        <Link href={webHref!} className={cn(btnClass, webBtnClass)}>
          {webLabel}
        </Link>
      ) : null}
      <a
        href={appStoreUrl}
        target="_blank"
        rel="noreferrer"
        className={
          buttonClassName ? `${btnClass} ${buttonClassName}` : btnClass
        }
      >
        <AppleStoreIcon className="w-6 shrink-0 sm:w-7 aspect-square" />
        {appStoreLabel}
      </a>
      <a
        href={playStoreUrl}
        target="_blank"
        rel="noreferrer"
        className={
          buttonClassName ? `${btnClass} ${buttonClassName}` : btnClass
        }
      >
        <GooglePlayIcon className="w-6 shrink-0 sm:w-7 aspect-square" />
        {googlePlayLabel}
      </a>
    </div>
  );
}
