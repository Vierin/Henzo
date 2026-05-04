import { appStoreUrl, playStoreUrl } from '@/constants/appStores';
import {
	AppleStoreIcon,
	GooglePlayIcon,
} from '@/components/landing/storeIcons';

const btnClass =
	'inline-flex min-h-[50px] w-[169px] items-center justify-center gap-2 rounded-full border-1 border-[#3F3F3F] px-6 py-2 text-sm font-semibold text-[#3F3F3F] shadow-sm whitespace-nowrap transition hover:bg-[#faf8f5] sm:px-8 sm:text-[1em]';

type StoreBadgeLinksProps = {
	appStoreLabel: string;
	googlePlayLabel: string;
	/** e.g. scroll-mt for anchor targets */
	id?: string;
	className?: string;
};

export function StoreBadgeLinks({
	appStoreLabel,
	googlePlayLabel,
	id,
	className,
}: StoreBadgeLinksProps) {
	return (
		<div
			id={id}
			className={
				className ??
				'mt-9 flex scroll-mt-28 flex-wrap items-center justify-center gap-6 sm:mt-11 sm:gap-9'
			}
		>
			<a
				href={appStoreUrl}
				target="_blank"
				rel="noreferrer"
				className={btnClass}
			>
				<AppleStoreIcon className="w-6 shrink-0 sm:w-7 aspect-square" />
				{appStoreLabel}
			</a>
			<a
				href={playStoreUrl}
				target="_blank"
				rel="noreferrer"
				className={btnClass}
			>
				<GooglePlayIcon className="w-6 shrink-0 sm:w-7 aspect-square" />
				{googlePlayLabel}
			</a>
		</div>
	);
}
