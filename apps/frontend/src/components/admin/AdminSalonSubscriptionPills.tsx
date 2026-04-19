import type { AdminSalon } from '@/hooks/useAdmin';

const DAY_MS = 86_400_000;

function parseIso(s?: string): Date | null {
	if (!s) return null;
	const d = new Date(s);
	return Number.isNaN(d.getTime()) ? null : d;
}

/** Period end or next anchor for admin list UI */
export function getSubscriptionValidUntil(
	sub: NonNullable<AdminSalon['subscription']>
): Date | null {
	if (sub.type === 'TRIAL') {
		return parseIso(sub.trialEndDate) ?? parseIso(sub.endDate);
	}
	return parseIso(sub.endDate) ?? parseIso(sub.nextPaymentDate);
}

function dateLocale(lang: string): string {
	const m: Record<string, string> = { en: 'en-GB', ru: 'ru-RU', vi: 'vi-VN' };
	return m[lang] ?? 'en-GB';
}

type Urgency = 'ok' | 'soon' | 'bad';

function getDateUrgency(
	sub: NonNullable<AdminSalon['subscription']>,
	validUntil: Date | null,
	now: Date
): Urgency {
	const st = sub.status;
	if (st === 'EXPIRED' || st === 'CANCELLED' || st === 'INACTIVE') return 'bad';
	if (validUntil && validUntil.getTime() < now.getTime()) return 'bad';
	if (validUntil) {
		const days = Math.ceil((validUntil.getTime() - now.getTime()) / DAY_MS);
		if (days <= 7 && days >= 0) return 'soon';
	}
	return 'ok';
}

const pillBase =
	'inline-flex max-w-full items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset';

export function AdminSalonSubscriptionPills({
	subscription,
	language,
}: {
	subscription: AdminSalon['subscription'];
	language: string;
}) {
	const now = new Date();
	const locale = dateLocale(language);

	if (!subscription) {
		return (
			<span
				className={`${pillBase} bg-slate-100 text-slate-700 ring-slate-200`}
			>
				No plan
			</span>
		);
	}

	const validUntil = getSubscriptionValidUntil(subscription);
	const urgency = getDateUrgency(subscription, validUntil, now);

	const planClass =
		subscription.type === 'TRIAL'
			? 'bg-violet-50 text-violet-900 ring-violet-200'
			: 'bg-sky-50 text-sky-900 ring-sky-200';

	const planLabel = subscription.type === 'TRIAL' ? 'Trial' : 'Starter';

	let dateClass: string;
	if (!validUntil) {
		dateClass = 'bg-slate-50 text-slate-700 ring-slate-200';
	} else if (urgency === 'bad') {
		dateClass = 'bg-red-50 text-red-900 ring-red-200';
	} else if (urgency === 'soon') {
		dateClass = 'bg-amber-50 text-amber-950 ring-amber-200';
	} else {
		dateClass = 'bg-emerald-50 text-emerald-900 ring-emerald-200';
	}

	let dateText: string;
	if (!validUntil) {
		dateText = 'No end date';
	} else if (urgency === 'bad') {
		const ended = validUntil.getTime() < now.getTime();
		dateText = ended
			? `Ended ${validUntil.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`
			: `Until ${validUntil.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
	} else {
		dateText = `Until ${validUntil.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}`;
	}

	return (
		<span className="flex flex-wrap items-center gap-1.5">
			<span className={`${pillBase} ${planClass}`}>{planLabel}</span>
			<span className={`${pillBase} ${dateClass}`}>
				<span className="truncate">{dateText}</span>
			</span>
		</span>
	);
}
