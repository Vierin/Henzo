import Image from 'next/image';

import { cn } from '@/lib/utils';

/** Phone mock image for landing sections (decorative, not interactive). */
export function StudioPhoneFrame({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        'relative mx-auto w-[min(72vw,400px)] shrink-0 select-none ',
        className,
      )}
    >
      <Image
        src="/images/phone-1.webp"
        alt=""
        width={417}
        height={799}
        className="block h-auto w-full relative z-2"
        draggable={false}
        sizes="(max-width: 768px) 72vw, 400px"
      />
    </div>
  );
}
