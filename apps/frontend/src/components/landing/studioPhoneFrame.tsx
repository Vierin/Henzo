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
				src="/images/screen-calendar.webp"
				alt=""
				width={417}
				height={799}
				className="block absolute inset-[15px_20px] w-[calc(100%-40px)] overflow-hidden h-[calc(100%-30px)] rounded-[2rem]"
				draggable={false}
				sizes="(max-width: 768px) 72vw, 400px"
			/>
			<Image
				src="/images/mockup.webp"
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
