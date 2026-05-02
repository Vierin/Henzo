import type { Metadata } from 'next';
import Link from 'next/link';
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

function AppleStoreIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-hidden>
			<path
				fill="currentColor"
				d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
			/>
		</svg>
	);
}

function GooglePlayIcon({ className }: { className?: string }) {
	return (
		<svg className={className} viewBox="0 0 24 24" aria-hidden>
			<path fill="#00D9FF" d="m3.04 2.29 10.17 10.18L3 21.72c-.59-.33-.99-.96-.99-1.69V4.03c0-.69.36-1.3.93-1.64z" />
			<path fill="#FFCE00" d="m14.21 12.47 3.01 1.74L5.09 2.15l-.05-.03c-.23-.13-.48-.2-.74-.21l9.91 10.56z" />
			<path fill="#00F076" d="m14.46 11.53-9.97-10.6c.26 0 .52.07.75.21l17.37 10.03c.74.43.74 1.51 0 1.94l-3.31 1.91-4.84-2.49z" />
			<path fill="#FF3A44" d="m3.04 21.71 11.17-9.24-2.85-1.47L3.04 21.71z" />
		</svg>
	);
}

function ChaoticUnderline({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 120 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M4 10c18-4 38-5 58-4 12 1 24 2 36 1"
				stroke="#E53935"
				strokeWidth="3"
				strokeLinecap="round"
				strokeLinejoin="round"
				opacity="0.95"
			/>
			<path
				d="M8 11c22-5 48-6 72-4"
				stroke="#E53935"
				strokeWidth="2.2"
				strokeLinecap="round"
				opacity="0.75"
			/>
		</svg>
	);
}

function LandingHeroMockup({
	notificationText,
	newClientsTitle,
	newBadge,
	clientsBadge,
	autoBadge,
	notificationBadge,
	activeUserLabel,
	clients,
}: {
	notificationText: string;
	newClientsTitle: string;
	newBadge: string;
	clientsBadge: string;
	autoBadge: string;
	notificationBadge: string;
	activeUserLabel: string;
	clients: Array<{ name: string; initials: string }>;
}) {
	return (
		<div className="relative mx-auto flex min-h-[380px] w-full max-w-[720px] justify-center px-2 sm:min-h-[440px] md:max-w-none">
			{/* Decorative blurs */}
			<div
				className="pointer-events-none absolute -left-4 bottom-8 h-28 w-28 rounded-full bg-gradient-to-br from-amber-200/90 to-orange-400/40 blur-2xl sm:h-36 sm:w-36"
				aria-hidden
			/>
			<div
				className="pointer-events-none absolute -right-2 bottom-4 h-32 w-32 rounded-full bg-gradient-to-br from-orange-400/80 to-red-500/50 blur-2xl sm:h-40 sm:w-40"
				aria-hidden
			/>

			{/* Left stack: notification + bell + pills */}
			<div className="absolute left-0 top-4 z-10 w-[min(42%,200px)] sm:left-2 md:left-4 md:top-8 lg:left-8">
				<div className="rounded-2xl bg-white px-3 py-2.5 text-[11px] font-medium leading-snug text-[#1A202C] shadow-[0_12px_40px_-12px_rgba(26,32,44,0.35)] sm:text-xs md:px-4 md:py-3 md:text-[13px]">
					{notificationText}
				</div>
				<div className="relative mt-3 flex items-center">
					<div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-[0_10px_30px_-8px_rgba(26,32,44,0.25)] ring-1 ring-black/5 sm:h-14 sm:w-14">
						<span className="text-2xl sm:text-3xl" aria-hidden>
							🔔
						</span>
					</div>
					<div className="absolute left-10 top-10 flex -translate-y-1 flex-wrap items-center gap-1 sm:left-12">
						<span className="rounded-full bg-[#FF7A5C] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md">
							{autoBadge}
						</span>
						<span className="rounded-full bg-[#3D2B5C] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-md">
							{notificationBadge}
						</span>
					</div>
				</div>
			</div>

			{/* Phone */}
			<div className="relative z-[5] mt-8 w-[min(52%,280px)] shrink-0 select-none sm:mt-10 sm:w-[300px] md:w-[min(46%,320px)]">
				<div className="relative rounded-[2.75rem] bg-gradient-to-b from-[#3d3d45] to-[#12141a] p-[11px] shadow-[0_40px_80px_-24px_rgba(0,0,0,0.55)] ring-1 ring-black/20">
					<div className="aspect-[9/19.5] overflow-hidden rounded-[2.35rem] bg-white">
						<div className="flex justify-center pt-3 pb-2">
							<div className="h-[24px] w-[78px] rounded-full bg-[#1A202C]" />
						</div>
						<div className="h-full bg-white" />
					</div>
				</div>
			</div>

			{/* Right: new clients */}
			<div className="absolute right-0 top-6 z-10 w-[min(48%,220px)] sm:right-2 md:right-4 md:top-10 lg:right-8">
				<div className="mb-2 flex flex-wrap items-center justify-end gap-1">
					<span className="rounded-full bg-[#B8E986] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-[#1a3d0a] shadow-sm">
						{newBadge}
					</span>
					<span className="rounded-full bg-[#1E5C3A] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white shadow-sm">
						{clientsBadge}
					</span>
				</div>
				<div className="rounded-2xl bg-white/95 px-2.5 py-2 shadow-[0_16px_44px_-14px_rgba(26,32,44,0.35)] ring-1 ring-[#eadfd7]/80 backdrop-blur-sm sm:px-3 sm:py-2.5">
					<p className="mb-2 text-[11px] font-semibold text-[#1A202C] sm:text-xs">
						{newClientsTitle}
					</p>
					<ul className="space-y-2">
						{clients.map((c) => (
							<li key={c.name}>
								<div className="flex items-center gap-2 rounded-xl bg-[#faf8f5] px-2 py-1.5">
									<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#E8E0FF] to-[#C4B5FD] text-[10px] font-bold text-[#4C1D95]">
										{c.initials}
									</span>
									<div className="min-w-0 flex-1">
										<p className="truncate text-[11px] font-semibold leading-tight text-[#1A202C] sm:text-xs">
											{c.name}
										</p>
										<p className="text-[9px] text-[#718096] sm:text-[10px]">
											{activeUserLabel}
										</p>
									</div>
									<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[#B8E986] text-[#1a3d0a] shadow-sm">
										<svg
											width="14"
											height="14"
											viewBox="0 0 24 24"
											fill="none"
											stroke="currentColor"
											strokeWidth="2.5"
											aria-hidden
										>
											<path d="M9 18l6-6-6-6" />
										</svg>
									</span>
								</div>
							</li>
						))}
					</ul>
				</div>
			</div>
		</div>
	);
}

type HomeContent = {
	heroLine1Lead: string;
	heroLine1Highlight: string;
	heroLine1Trail: string;
	heroLine2Lead: string;
	heroLine2Highlight: string;
	heroLine2Trail: string;
	storeAppStore: string;
	storeGooglePlay: string;
	heroNotification: string;
	heroNewClientsTitle: string;
	heroNewBadge: string;
	heroClientsBadge: string;
	heroAutoBadge: string;
	heroNotificationBadge: string;
	heroActiveUser: string;
	heroClients: Array<{ name: string; initials: string }>;
	description: string;
	secondary: string;
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
		heroLine1Lead: 'From',
		heroLine1Highlight: 'chaotic',
		heroLine1Trail: 'bookings',
		heroLine2Lead: 'to a',
		heroLine2Highlight: 'clear schedule',
		heroLine2Trail: '',
		storeAppStore: 'App Store',
		storeGooglePlay: 'Google Play',
		heroNotification: 'Remember to train today at 3pm',
		heroNewClientsTitle: 'New Clients',
		heroNewBadge: 'New',
		heroClientsBadge: 'Clients',
		heroAutoBadge: 'Auto',
		heroNotificationBadge: 'Notification',
		heroActiveUser: 'Active user',
		heroClients: [
			{ name: 'Anna Nowak', initials: 'AN' },
			{ name: 'Ivan Founder', initials: 'IF' },
			{ name: 'Maria Kowalski', initials: 'MK' },
		],
		description:
			'Run your studio from mobile: schedule, coach slots, and client bookings in one flow.',
		secondary:
			'Download for Android or iOS and onboard your team without friction.',
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
		heroLine1Lead: 'От',
		heroLine1Highlight: 'хаотичных',
		heroLine1Trail: 'записей',
		heroLine2Lead: 'к',
		heroLine2Highlight: 'понятному расписанию',
		heroLine2Trail: '',
		storeAppStore: 'App Store',
		storeGooglePlay: 'Google Play',
		heroNotification: 'Не забудьте: тренировка сегодня в 15:00',
		heroNewClientsTitle: 'Новые клиенты',
		heroNewBadge: 'New',
		heroClientsBadge: 'Клиенты',
		heroAutoBadge: 'Авто',
		heroNotificationBadge: 'Пуш',
		heroActiveUser: 'Активен',
		heroClients: [
			{ name: 'Анна Новак', initials: 'АН' },
			{ name: 'Иван Основатель', initials: 'ИО' },
			{ name: 'Мария К.', initials: 'МК' },
		],
		description:
			'Расписание, тренеры и записи клиентов в одном мобильном рабочем процессе.',
		secondary:
			'Скачайте приложение на Android или iOS и запустите студию без лишних шагов.',
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
		heroLine1Lead: 'Từ lịch',
		heroLine1Highlight: 'hỗn loạn',
		heroLine1Trail: '',
		heroLine2Lead: 'đến',
		heroLine2Highlight: 'lịch rõ ràng',
		heroLine2Trail: '',
		storeAppStore: 'App Store',
		storeGooglePlay: 'Google Play',
		heroNotification: 'Nhắc tập hôm nay lúc 15:00',
		heroNewClientsTitle: 'Khách mới',
		heroNewBadge: 'Mới',
		heroClientsBadge: 'Khách',
		heroAutoBadge: 'Tự động',
		heroNotificationBadge: 'Thông báo',
		heroActiveUser: 'Đang hoạt động',
		heroClients: [
			{ name: 'Anna Nowak', initials: 'AN' },
			{ name: 'Ivan Founder', initials: 'IF' },
			{ name: 'Maria K.', initials: 'MK' },
		],
		description:
			'Quản lý lịch, huấn luyện viên và đặt chỗ học viên trong một quy trình.',
		secondary:
			'Tải ứng dụng Android hoặc iOS để vận hành studio ngay.',
		androidCta: 'Tải cho Android',
		iosCta: 'Tải cho iOS',
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
			<section className="bg-[#2B1B4A] pb-10 pt-5 md:pb-14 md:pt-8">
				<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
					<div className="overflow-hidden rounded-[1.75rem] bg-[#FDF6F0] shadow-[0_28px_90px_-20px_rgba(0,0,0,0.55)] sm:rounded-[2rem]">
						<div className="border-b border-[#eadfd7]/60 bg-white px-2 py-2 shadow-sm sm:px-4 sm:py-3">
							<PublicHeader variant="landing" embedded />
						</div>

						<div className="px-4 pb-6 pt-10 text-center sm:px-8 md:pb-8 md:pt-14">
							<h1 className="mx-auto max-w-[24rem] font-sans text-[2rem] font-semibold leading-[1.18] tracking-tight text-[#1A202C] sm:max-w-3xl sm:text-4xl sm:leading-[1.15] md:text-5xl md:leading-[1.12] lg:text-[3.15rem]">
								<span className="block">
									{content.heroLine1Lead}{' '}
									<span className="relative inline-block px-0.5">
										{content.heroLine1Highlight}
										<ChaoticUnderline className="pointer-events-none absolute -bottom-0.5 left-0 w-[108%] -translate-x-[4%]" />
									</span>
									{content.heroLine1Trail ? `\u00a0${content.heroLine1Trail}` : ''}
								</span>
								<span className="mt-2 block sm:mt-3">
									{content.heroLine2Lead}{' '}
									<span className="text-[#FF6B4A]">{content.heroLine2Highlight}</span>
									{content.heroLine2Trail ? `\u00a0${content.heroLine2Trail}` : ''}
								</span>
							</h1>

							<div
								id="get-app"
								className="mt-9 flex scroll-mt-28 flex-wrap items-center justify-center gap-3 sm:mt-11 sm:gap-4"
							>
								<a
									href={appStoreUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center gap-2 rounded-full border-2 border-[#1A202C] bg-white px-6 py-2.5 text-sm font-semibold text-[#1A202C] shadow-sm transition hover:bg-[#faf8f5] sm:min-w-[180px] sm:px-8 sm:text-base"
								>
									<AppleStoreIcon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
									{content.storeAppStore}
								</a>
								<a
									href={playStoreUrl}
									target="_blank"
									rel="noreferrer"
									className="inline-flex min-h-[48px] min-w-[160px] items-center justify-center gap-2 rounded-full border-2 border-[#1A202C] bg-white px-6 py-2.5 text-sm font-semibold text-[#1A202C] shadow-sm transition hover:bg-[#faf8f5] sm:min-w-[180px] sm:px-8 sm:text-base"
								>
									<GooglePlayIcon className="h-6 w-6 shrink-0 sm:h-7 sm:w-7" />
									{content.storeGooglePlay}
								</a>
							</div>
						</div>

						<div className="relative px-2 pb-8 pt-2 md:px-6 md:pb-12">
							<LandingHeroMockup
								notificationText={content.heroNotification}
								newClientsTitle={content.heroNewClientsTitle}
								newBadge={content.heroNewBadge}
								clientsBadge={content.heroClientsBadge}
								autoBadge={content.heroAutoBadge}
								notificationBadge={content.heroNotificationBadge}
								activeUserLabel={content.heroActiveUser}
								clients={content.heroClients}
							/>
						</div>
					</div>
				</div>
			</section>

			<main className="w-full pb-20 pt-10 md:pb-28 md:pt-14">
				<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
					<div className="mx-auto max-w-2xl text-center">
						<p className="text-base leading-relaxed text-[#4A5568] md:text-lg">
							{content.description}
						</p>
						<p className="mt-3 text-sm leading-relaxed text-[#718096] md:text-base">
							{content.secondary}
						</p>
					</div>
				</div>

				<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
				<section className="mt-16 md:mt-24">
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

				<section className="mt-16 md:mt-24" id="benefits">
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

				<section className="mt-16 md:mt-24" id="pricing">
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
