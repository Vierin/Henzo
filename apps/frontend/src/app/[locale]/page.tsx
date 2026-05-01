import type { Metadata } from 'next';
import Link from 'next/link';
import { User } from 'lucide-react';
import PublicHeader from '@/components/PublicHeader';
import { isLocale, type Locale, withLocale } from '@/i18n/routing';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';
import { appStoreUrl, playStoreUrl } from '@/constants/appStores';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('home', resolveLocale(raw));
}

function LandingPhoneMockup() {
	return (
		<div className="relative w-full max-w-[300px] select-none sm:max-w-[320px]">
			<div className="relative rounded-[2.75rem] bg-gradient-to-b from-[#4a5568] to-[#1e293b] p-[11px] shadow-[0_32px_64px_-16px_rgba(30,41,59,0.45)] ring-1 ring-black/5">
				<div className="overflow-hidden rounded-[2.35rem] bg-[#F9F4F0] aspect-[9/19.2]">
					<div className="flex justify-center pt-3 pb-1">
						<div className="h-[26px] w-[88px] rounded-full bg-[#1A202C]/90" />
					</div>
					<div className="space-y-3 px-4 pb-8 font-sans">
						<p className="text-center font-serif text-[1.35rem] font-semibold leading-tight text-[#1A202C]">
							Henzo
						</p>
						<p className="text-center text-[11px] font-medium tracking-wide text-[#718096]">
							Today
						</p>
						<div className="rounded-[18px] bg-gradient-to-br from-[#1e293b] via-[#1a2234] to-[#0f172a] p-3.5 text-white shadow-lg">
							<p className="text-[10px] font-medium uppercase tracking-[0.12em] text-white/55">
								Next session
							</p>
							<p className="mt-1.5 text-[15px] font-semibold leading-snug">Morning flow</p>
							<div className="mt-3 flex items-center justify-between text-[11px] text-white/75">
								<span>9:00</span>
								<span className="rounded-full bg-emerald-500/20 px-2 py-0.5 text-emerald-200">
									Studio A
								</span>
							</div>
						</div>
						<div className="rounded-[18px] border border-[#eadfd7] bg-white/95 p-3.5 text-[#1A202C] shadow-sm">
							<div className="flex items-center justify-between text-[12px] font-medium">
								<span>Bookings</span>
								<span className="font-semibold text-emerald-600">+12%</span>
							</div>
							<div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#F9F4F0]">
								<div className="h-full w-[68%] rounded-full bg-[#E86D4F]/85" />
							</div>
						</div>
						<div className="rounded-[18px] border border-[#eadfd7]/80 bg-[#fffdfb] p-3 text-[11px] text-[#4A5568]">
							<div className="flex items-center justify-between">
								<span className="font-medium text-[#1A202C]">Daily schedule</span>
								<span className="text-[10px] text-[#718096]">3 classes</span>
							</div>
							<div className="mt-2.5 space-y-2.5">
								<div className="flex min-h-[56px] items-center justify-between rounded-xl border border-[#eadfd7] bg-white px-2.5 py-2">
									<div className="space-y-1">
										<p className="text-[10px] text-[#718096]">08:00</p>
										<p className="text-[11px] font-medium text-[#1A202C]">
											Morning Hatha
										</p>
									</div>
									<div className="flex items-center gap-1.5 text-[#4A5568]">
										<User className="h-3.5 w-3.5 text-[#E86D4F]" strokeWidth={2.2} />
										<span className="font-medium">12/15</span>
									</div>
								</div>
								<div className="flex min-h-[56px] items-center justify-between rounded-xl border border-[#eadfd7] bg-white px-2.5 py-2">
									<div className="space-y-1">
										<p className="text-[10px] text-[#718096]">11:30</p>
										<p className="text-[11px] font-medium text-[#1A202C]">
											Vinyasa Flow
										</p>
									</div>
									<div className="flex items-center gap-1.5 text-[#4A5568]">
										<User className="h-3.5 w-3.5 text-[#E86D4F]" strokeWidth={2.2} />
										<span className="font-medium">5/12</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}

type HomeContent = {
	badge: string;
	heroTitleMain: string;
	heroTitleAccent: string;
	description: string;
	secondary: string;
	getAppCta: string;
	androidCta: string;
	iosCta: string;
	contactCta: string;
	kpiTitle: string;
	kpis: string[];
	featureTitle: string;
	features: Array<{ title: string; description: string }>;
	workflowTitle: string;
	workflowSteps: Array<{ title: string; description: string }>;
	finalTitle: string;
	finalDescription: string;
};

const contentByLocale: Record<Locale, HomeContent> = {
	en: {
		badge: 'Henzo Fitness',
		heroTitleMain: 'The calm way to run your fitness studio',
		heroTitleAccent: 'From your phone, with clarity.',
		description:
			'Run your studio from mobile: schedule, coach slots, and client bookings in one flow.',
		secondary:
			'Download for Android or iOS and onboard your team without friction.',
		getAppCta: 'Get the app',
		androidCta: 'Download for Android',
		iosCta: 'Download for iOS',
		contactCta: 'Contact sales',
		kpiTitle: 'Everything owners need in one workflow',
		kpis: ['24/7 booking flow', 'Trainer schedule control', 'Mobile-first operation'],
		featureTitle: 'Built for studio operations',
		features: [
			{
				title: 'Schedules that stay synchronized',
				description:
					'Manage training slots, avoid conflicts, and keep daily operations predictable.',
			},
			{
				title: 'Trainer and service visibility',
				description:
					'Control active offerings, trainer availability, and booking capacity from one place.',
			},
			{
				title: 'Client booking experience',
				description:
					'Give clients a fast booking flow while your team keeps full control of sessions.',
			},
		],
		workflowTitle: 'How studios launch with Henzo',
		workflowSteps: [
			{
				title: '1. Install app',
				description: 'Download on Android or iOS and sign in as studio operator.',
			},
			{
				title: '2. Configure studio',
				description: 'Set up trainers, offerings, and your weekly schedule.',
			},
			{
				title: '3. Start taking bookings',
				description: 'Open booking flow to clients and manage sessions from mobile.',
			},
		],
		finalTitle: 'Ready to run your fitness studio faster?',
		finalDescription:
			'Start with the mobile app and move your daily operations into one clean flow.',
	},
	ru: {
		badge: 'Henzo Fitness',
		heroTitleMain: 'Спокойное управление фитнес-студией',
		heroTitleAccent: 'С телефона — без лишнего шума.',
		description:
			'Расписание, тренеры и записи клиентов в одном мобильном рабочем процессе.',
		secondary:
			'Скачайте приложение на Android или iOS и запустите студию без лишних шагов.',
		getAppCta: 'Скачать приложение',
		androidCta: 'Скачать для Android',
		iosCta: 'Скачать для iOS',
		contactCta: 'Связаться с отделом продаж',
		kpiTitle: 'Все, что нужно владельцу студии, в одном процессе',
		kpis: ['Запись 24/7', 'Контроль расписания тренеров', 'Управление со смартфона'],
		featureTitle: 'Структура под реальные задачи студии',
		features: [
			{
				title: 'Синхронизированное расписание',
				description:
					'Управляйте слотами тренировок, избегайте пересечений и держите день под контролем.',
			},
			{
				title: 'Прозрачность по тренерам и услугам',
				description:
					'Контролируйте предложения, доступность тренеров и загрузку студии в одном месте.',
			},
			{
				title: 'Удобная запись для клиентов',
				description:
					'Клиенты быстро бронируют занятия, а команда видит всю картину по сессиям.',
			},
		],
		workflowTitle: 'Как студии запускаются с Henzo',
		workflowSteps: [
			{
				title: '1. Установите приложение',
				description: 'Скачайте на Android или iOS и войдите как оператор студии.',
			},
			{
				title: '2. Настройте студию',
				description: 'Добавьте тренеров, услуги и рабочее расписание.',
			},
			{
				title: '3. Принимайте записи',
				description:
					'Откройте запись для клиентов и управляйте сессиями прямо с телефона.',
			},
		],
		finalTitle: 'Готовы ускорить работу вашей фитнес-студии?',
		finalDescription:
			'Начните с мобильного приложения и переведите ежедневные процессы в один понятный поток.',
	},
	vi: {
		badge: 'Henzo Fitness',
		heroTitleMain: 'Van hanh studio fitness mot cach thoai mai',
		heroTitleAccent: 'Tren dien thoai, ro rang.',
		description:
			'Quan ly lich, huan luyen vien va dat cho cua hoc vien trong mot quy trinh.',
		secondary:
			'Tai ung dung Android hoac iOS de bat dau van hanh studio ngay.',
		getAppCta: 'Tai ung dung',
		androidCta: 'Tai cho Android',
		iosCta: 'Tai cho iOS',
		contactCta: 'Lien he tu van',
		kpiTitle: 'Tat ca van hanh studio trong mot quy trinh',
		kpis: ['Dat lich 24/7', 'Kiem soat lich huan luyen vien', 'Van hanh mobile-first'],
		featureTitle: 'Thiet ke cho van hanh studio',
		features: [
			{
				title: 'Lich hoat dong dong bo',
				description:
					'Quan ly khung gio tap, tranh trung lich, giu van hanh moi ngay on dinh.',
			},
			{
				title: 'Ro rang ve trainer va goi tap',
				description:
					'Kiem soat dich vu dang mo, do san sang cua trainer va cong suat dat lich.',
			},
			{
				title: 'Trai nghiem dat lich cho hoc vien',
				description:
					'Cho phep dat lich nhanh, doi ngu van theo doi duoc toan bo session.',
			},
		],
		workflowTitle: 'Cach studio khoi dong voi Henzo',
		workflowSteps: [
			{
				title: '1. Cai dat app',
				description: 'Tai tren Android hoac iOS va dang nhap vai tro operator.',
			},
			{
				title: '2. Cau hinh studio',
				description: 'Thiet lap trainer, offering va lich theo tuan.',
			},
			{
				title: '3. Bat dau nhan dat lich',
				description: 'Mo booking cho hoc vien va quan ly session tren mobile.',
			},
		],
		finalTitle: 'San sang van hanh studio nhanh hon?',
		finalDescription:
			'Bat dau voi app mobile va dua toan bo quy trinh hang ngay vao mot luong don gian.',
	},
};

const coral = {
	btn: 'bg-[#E86D4F] hover:bg-[#d85e42] shadow-[0_12px_32px_rgba(232,109,79,0.28)]',
	btnGhost:
		'border-[#eadfd7] text-[#1A202C] hover:bg-white hover:border-[#E86D4F]/35',
};

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale: raw } = await params;
	const locale = (isLocale(raw) ? raw : 'en') as Locale;
	const content = contentByLocale[locale];

	return (
		<div className="min-h-screen bg-[#F9F4F0] text-[#1A202C]">
			<PublicHeader variant="landing" />

			<main className="w-full pb-20 pt-8 md:pb-28 md:pt-12">
				<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
				<section className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-14 xl:gap-16">
					<div className="text-left">
						<p className="inline-flex rounded-full border border-[#eadfd7] bg-white/70 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-[#718096]">
							{content.badge}
						</p>

						<h1 className="mt-8 max-w-[28ch] font-serif text-[2.35rem] font-semibold leading-[1.12] tracking-tight text-[#1A202C] sm:max-w-2xl sm:text-5xl xl:text-[3.25rem] xl:leading-[1.08]">
							{content.heroTitleMain}
						</h1>
						<p className="mt-4 max-w-xl font-serif text-2xl italic text-[#E86D4F] sm:text-3xl lg:text-[2rem]">
							{content.heroTitleAccent}
						</p>

						<p className="mt-8 max-w-xl text-base leading-relaxed text-[#4A5568] md:text-lg">
							{content.description}
						</p>
						<p className="mt-3 max-w-lg text-sm leading-relaxed text-[#718096] md:text-base">
							{content.secondary}
						</p>

						<div
							id="get-app"
							className="mt-10 flex scroll-mt-28 flex-col items-start gap-4 sm:mt-12"
						>
							<a
								href={playStoreUrl}
								target="_blank"
								rel="noreferrer"
								className={`inline-flex min-h-[52px] min-w-[200px] items-center justify-center rounded-full px-10 py-3.5 text-base font-semibold text-white transition ${coral.btn}`}
							>
								{content.getAppCta}
							</a>
							<div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm font-medium">
								<a
									href={playStoreUrl}
									target="_blank"
									rel="noreferrer"
									className="text-[#4A5568] underline decoration-[#eadfd7] decoration-2 underline-offset-4 transition hover:text-[#E86D4F]"
								>
									{content.androidCta}
								</a>
								<span className="hidden text-[#cbd5e0] sm:inline" aria-hidden>
									·
								</span>
								<a
									href={appStoreUrl}
									target="_blank"
									rel="noreferrer"
									className="text-[#4A5568] underline decoration-[#eadfd7] decoration-2 underline-offset-4 transition hover:text-[#E86D4F]"
								>
									{content.iosCta}
								</a>
							</div>
						</div>
					</div>

					<div className="flex justify-center lg:justify-end">
						<LandingPhoneMockup />
					</div>
				</section>

				<section className="mt-20 md:mt-28">
					<div className="rounded-[28px] border border-[#eadfd7] bg-white/70 p-8 shadow-[0_20px_50px_-24px_rgba(26,32,44,0.12)] backdrop-blur-sm md:p-10">
						<p className="text-center font-serif text-lg font-semibold text-[#E86D4F] md:text-xl">
							{content.kpiTitle}
						</p>
						<ul className="mx-auto mt-8 flex max-w-2xl flex-col gap-4 text-left text-[#4A5568] md:text-lg">
							{content.kpis.map((item) => (
								<li key={item} className="flex gap-3 leading-snug">
									<span
										className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#E86D4F]"
										aria-hidden
									/>
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="mt-16 md:mt-24">
					<h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-[#1A202C] md:text-4xl">
						{content.featureTitle}
					</h2>
					<div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
						{content.features.map((feature) => (
							<article
								key={feature.title}
								className="rounded-[22px] border border-[#eadfd7] bg-[#fffdfb] p-7 shadow-[0_12px_40px_-20px_rgba(26,32,44,0.1)] transition hover:border-[#E86D4F]/25"
							>
								<h3 className="font-serif text-xl font-semibold text-[#1A202C]">
									{feature.title}
								</h3>
								<p className="mt-3 text-sm leading-relaxed text-[#4A5568] md:text-[15px]">
									{feature.description}
								</p>
							</article>
						))}
					</div>
				</section>

				<section className="mt-16 md:mt-24">
					<h2 className="text-center font-serif text-3xl font-semibold tracking-tight text-[#1A202C] md:text-4xl">
						{content.workflowTitle}
					</h2>
					<div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
						{content.workflowSteps.map((step) => (
							<article
								key={step.title}
								className="rounded-[22px] border border-[#eadfd7]/90 bg-white/85 p-7 shadow-[0_8px_30px_-18px_rgba(26,32,44,0.08)]"
							>
								<h3 className="font-serif text-lg font-semibold text-[#1A202C]">
									{step.title}
								</h3>
								<p className="mt-3 text-sm leading-relaxed text-[#718096]">
									{step.description}
								</p>
							</article>
						))}
					</div>
				</section>

				<section className="mt-16 overflow-hidden rounded-[28px] bg-gradient-to-br from-[#1e293b] via-[#1a2332] to-[#0f172a] px-8 py-12 text-center shadow-[0_28px_60px_-20px_rgba(15,23,42,0.45)] md:mt-24 md:px-14 md:py-16">
					<h2 className="font-serif text-2xl font-semibold leading-tight text-[#F9F4F0] md:text-3xl">
						{content.finalTitle}
					</h2>
					<p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-white/75 md:text-lg">
						{content.finalDescription}
					</p>
					<div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row sm:flex-wrap">
						<a
							href={playStoreUrl}
							target="_blank"
							rel="noreferrer"
							className={`inline-flex min-h-[48px] items-center justify-center rounded-full px-8 py-3 text-sm font-semibold text-white transition ${coral.btn}`}
						>
							{content.androidCta}
						</a>
						<a
							href={appStoreUrl}
							target="_blank"
							rel="noreferrer"
							className={`inline-flex min-h-[48px] items-center justify-center rounded-full border-2 bg-[#F9F4F0] px-8 py-3 text-sm font-semibold transition ${coral.btnGhost}`}
						>
							{content.iosCta}
						</a>
						<Link
							href={withLocale('/contact', locale)}
							className="inline-flex min-h-[48px] items-center justify-center rounded-full border border-white/35 px-8 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
						>
							{content.contactCta}
						</Link>
					</div>
				</section>
				</div>
			</main>
		</div>
	);
}
