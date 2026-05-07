'use client';

import Image from 'next/image';

type LandingEntryNotificationCardProps = {
	title: string;
	text: string;
	time: string;
	iconSrc: string;
	iconAlt: string;
};

export function LandingEntryNotificationCard({
	title,
	text,
	time,
	iconSrc,
	iconAlt,
}: LandingEntryNotificationCardProps) {
	return (
		<div className="relative">
			<div
				aria-hidden
				data-entry-shadow-far
				className="pointer-events-none absolute left-[12%] top-0 h-full w-[76%] rounded-[1rem] bg-white/45"
			/>
			<div
				aria-hidden
				data-entry-shadow-near
				className="pointer-events-none absolute left-[7%] top-0 h-full w-[86%] rounded-[1rem] bg-white/70"
			/>

			<div
				data-entry-main
				className="relative rounded-[1rem] border border-[#F4DCBA] bg-[#fff] p-2.5"
			>
				<div className="flex items-start gap-2">
					<div className="relative flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#F2B2A6] bg-[#F4DCBA]">
						<div className="relative -right-2 top-[54%] flex w-[3rem] -translate-y-1/2 items-center justify-center">
							<Image className="scale-[1.2]" src="/images/icon-logo.png" alt="Logo icon" width={200} height={200} />
						</div>
					</div>
					<div className="min-w-0 flex-1">
						<div className="flex items-center justify-between gap-3">
							<p className="truncate text-[1rem] leading-none font-semibold text-[#3F3F3F] flex items-center gap-2">
								{title}
								<span className="relative inline-flex h-5 w-5 shrink-0">
									<Image src={iconSrc} alt={iconAlt} fill sizes="20px" />
								</span>
							</p>
							<span className="shrink-0 text-[0.9rem] leading-none font-medium text-[#B6B6B6]">
								{time}
							</span>
						</div>
						<p className="mt-1 text-[0.9rem] leading-tight text-[#3F3F3F]">
							{text}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}
