import Image from 'next/image';

import { cn } from '@/lib/utils';

type StudioPhoneFrameProps = {
  className?: string;
  src?: string;
};

/** Phone mock image for landing sections (decorative, not interactive). */
export function StudioPhoneFrame({
  className,
  src = '/images/phone-1.webp',
}: StudioPhoneFrameProps) {
  return (
    <div
      className={cn(
        'relative mx-auto w-[min(72vw,400px)] shrink-0 select-none ',
        className,
      )}
    >
      <Image
        src={src}
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
