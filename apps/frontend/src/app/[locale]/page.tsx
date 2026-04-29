import type { Metadata } from 'next';
import Link from 'next/link';
import PublicHeader from '@/components/PublicHeader';
import { isLocale, type Locale, withLocale } from '@/i18n/routing';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';

const playStoreUrl =
	process.env.NEXT_PUBLIC_ANDROID_APP_URL ??
	'https://play.google.com/store/apps/details?id=com.henzo.app';
const appStoreUrl =
	process.env.NEXT_PUBLIC_IOS_APP_URL ?? 'https://apps.apple.com/';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('home', resolveLocale(raw));
}

const contentByLocale: Record<
	Locale,
	{
		badge: string;
		title: string;
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
	}
> = {
	en: {
		badge: 'Henzo Fitness',
		title: 'Fitness studio management in your pocket',
		description:
			'Run your studio from mobile: schedule, coach slots, and client bookings in one flow.',
		secondary:
			'Download the app for Android or iOS and start onboarding your studio team.',
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
		title: 'Управление фитнес-студией в одном приложении',
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
		badge: 'Henzo Fitness',
		title: 'Quan ly studio fitness ngay tren dien thoai',
		description:
			'Quan ly lich, huan luyen vien va dat cho cua hoc vien trong mot quy trinh.',
		secondary:
			'Tai ung dung Android hoac iOS de bat dau van hanh studio ngay.',
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

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale: raw } = await params;
	const locale = (isLocale(raw) ? raw : 'en') as Locale;
	const content = contentByLocale[locale];

	return (
		<div className="min-h-screen bg-[#F8F5F2]">
			<PublicHeader />

			<main className="mx-auto w-full max-w-6xl px-4 sm:px-6 py-10 md:py-16">
				<div className="mx-auto w-full max-w-5xl space-y-5 md:space-y-7">
				<section className="grid gap-6 md:gap-8 md:grid-cols-2 bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 md:p-10 border border-[#f1e9e5]">
					<div>
						<p className="inline-flex items-center rounded-full bg-[#fff2f2] px-3 py-1 text-sm font-medium text-[#ff5b5b]">
							{content.badge}
						</p>
						<h1 className="mt-4 text-3xl md:text-5xl font-semibold tracking-tight text-gray-900 max-w-3xl">
							{content.title}
						</h1>
						<p className="mt-4 text-base md:text-lg text-gray-700 max-w-2xl">
							{content.description}
						</p>
						<p className="mt-2 text-sm md:text-base text-gray-600 max-w-2xl">
							{content.secondary}
						</p>

						<div className="mt-6 flex flex-col sm:flex-row gap-3">
							<a
								href={playStoreUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center justify-center rounded-lg bg-[#ff5b5b] px-5 py-3 text-white text-sm font-semibold hover:bg-[#e04a4a] transition-colors"
							>
								{content.androidCta}
							</a>
							<a
								href={appStoreUrl}
								target="_blank"
								rel="noreferrer"
								className="inline-flex items-center justify-center rounded-lg bg-gray-900 px-5 py-3 text-white text-sm font-semibold hover:bg-black transition-colors"
							>
								{content.iosCta}
							</a>
						</div>
					</div>

					<div className="rounded-2xl bg-[#fff7f6] border border-[#ffd9d9] p-5 md:p-6">
						<p className="text-sm font-semibold text-[#ff5b5b]">{content.kpiTitle}</p>
						<ul className="mt-4 space-y-3">
							{content.kpis.map((item) => (
								<li key={item} className="text-sm md:text-base text-gray-800 flex gap-2">
									<span className="mt-1 h-2 w-2 rounded-full bg-[#ff5b5b]" />
									<span>{item}</span>
								</li>
							))}
						</ul>
					</div>
				</section>

				<section className="bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 md:p-10 border border-[#f1e9e5]">
					<h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
						{content.featureTitle}
					</h2>
					<div className="mt-6 grid gap-4 md:grid-cols-3">
						{content.features.map((feature) => (
							<article
								key={feature.title}
								className="rounded-2xl border border-gray-200 bg-gray-50/80 p-5"
							>
								<h3 className="text-base md:text-lg font-semibold text-gray-900">
									{feature.title}
								</h3>
								<p className="mt-2 text-sm text-gray-600">{feature.description}</p>
							</article>
						))}
					</div>
				</section>

				<section className="bg-white/95 rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.06)] p-6 md:p-10 border border-[#f1e9e5]">
					<h2 className="text-2xl md:text-3xl font-semibold text-gray-900">
						{content.workflowTitle}
					</h2>
					<div className="mt-6 grid gap-4 md:grid-cols-3">
						{content.workflowSteps.map((step) => (
							<article
								key={step.title}
								className="rounded-2xl border border-gray-200 bg-white p-5"
							>
								<h3 className="text-base md:text-lg font-semibold text-gray-900">
									{step.title}
								</h3>
								<p className="mt-2 text-sm text-gray-600">{step.description}</p>
							</article>
						))}
					</div>
				</section>

				<section className="rounded-3xl bg-[#1f1f1f] text-white p-6 md:p-10 shadow-[0_10px_30px_rgba(31,31,31,0.22)]">
					<h2 className="text-2xl md:text-3xl font-semibold">{content.finalTitle}</h2>
					<p className="mt-3 text-white/80 max-w-2xl">{content.finalDescription}</p>
					<div className="mt-6 flex flex-col sm:flex-row gap-3">
						<a
							href={playStoreUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center justify-center rounded-lg bg-[#ff5b5b] px-5 py-3 text-white text-sm font-semibold hover:bg-[#e04a4a] transition-colors"
						>
							{content.androidCta}
						</a>
						<a
							href={appStoreUrl}
							target="_blank"
							rel="noreferrer"
							className="inline-flex items-center justify-center rounded-lg bg-white px-5 py-3 text-gray-900 text-sm font-semibold hover:bg-gray-100 transition-colors"
						>
							{content.iosCta}
						</a>
						<Link
							href={withLocale('/contact', locale)}
							className="inline-flex items-center justify-center rounded-lg border border-white/40 px-5 py-3 text-sm font-semibold text-white hover:bg-white/10 transition-colors"
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
