import { cn } from '@/lib/utils';

/** Decorative phone chrome for landing sections (no interactive UI). */
export function StudioPhoneFrame({ className }: { className?: string }) {
	return (
		<div
			className={cn(
				'relative mx-auto w-[min(72vw,280px)] shrink-0 select-none sm:w-[300px]',
				className,
			)}
		>
			<div className="relative rounded-[2.75rem] bg-gradient-to-b from-[#3d3d45] to-[#12141a] p-[11px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/20">
				<div className="aspect-[9/19.5] overflow-hidden rounded-[2.35rem] bg-white">
					<div className="flex justify-center pb-2 pt-3">
						<div className="h-[24px] w-[78px] rounded-full bg-[#1A202C]" />
					</div>
				</div>
			</div>
		</div>
	);
}
