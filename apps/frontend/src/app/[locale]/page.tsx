import type { Metadata } from 'next';
import PublicHeader from '@/components/PublicHeader';
import { LandingSpotlightSection } from '@/components/landingSpotlightSection';
import type { StudioLandingContent } from '@/components/landing/studioLanding.types';
import { LandingFinalCta } from '@/components/landing/landingFinalCta';
import { LandingFeaturesSection } from '@/components/landing/landingFeaturesSection';
import { LandingHeroSection } from '@/components/landing/landingHeroSection';
import { LandingPhoneShowcaseSection } from '@/components/landing/landingPhoneShowcaseSection';
import { LandingIntro } from '@/components/landing/landingIntro';
import { LandingWorkflowSection } from '@/components/landing/landingWorkflowSection';
import { QuickStartSection } from '@/components/landing/quickStartSection';
import { getDictionary } from '@/i18n/dictionaries';
import { isLocale, type Locale } from '@/i18n/routing';
import { buildStaticPageMetadata, resolveLocale } from '@/seo';

export async function generateMetadata({
	params,
}: {
	params: Promise<{ locale: string }>;
}): Promise<Metadata> {
	const { locale: raw } = await params;
	return buildStaticPageMetadata('home', resolveLocale(raw));
}

function studioFromDict(dict: unknown): StudioLandingContent {
	const studio = (dict as { homepage?: { studio?: StudioLandingContent } })
		?.homepage?.studio;
	if (!studio) {
		throw new Error('Missing homepage.studio in dictionary');
	}
	return studio;
}

export default async function HomePage({
	params,
}: {
	params: Promise<{ locale: string }>;
}) {
	const { locale: raw } = await params;
	const locale = (isLocale(raw) ? raw : 'en') as Locale;
	const dict = await getDictionary(locale, ['public/homepage']);
	const studio = studioFromDict(dict);

	return (
		<div className="min-h-screen bg-[#F9F4F0] font-wix-madefor-display text-[#3F3F3F]">
			<header className="absolute left-1/2 top-0 z-30 -translate-x-1/2 w-full max-w-4xl rounded-b-[1.35rem] bg-[#FDF5F0] px-2 py-2 sm:rounded-b-[1.75rem] sm:px-4 sm:py-3">
				<PublicHeader variant="landing" embedded />
			</header>

			<main className="w-full pb-20 md:pb-28">
				<LandingHeroSection hero={studio.hero} />
				{/* <LandingPhoneShowcaseSection /> */}

				<LandingSpotlightSection
					headingLine1={studio.spotlight.headingLine1}
					line2BeforeAccent={studio.spotlight.line2BeforeAccent}
					line2Accent={studio.spotlight.line2Accent}
					slides={studio.spotlight.slides}
				/>

				<LandingIntro
					description={studio.intro.description}
					secondary={studio.intro.secondary}
				/>

				<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
					<QuickStartSection
						line1={studio.quickStart.line1}
						line2Before={studio.quickStart.line2Before}
						line2Accent={studio.quickStart.line2Accent}
						steps={studio.quickStart.steps}
					/>

					<LandingFeaturesSection
						title={studio.features.title}
						features={studio.features.items}
					/>

					<LandingWorkflowSection
						title={studio.workflow.title}
						steps={studio.workflow.steps}
					/>

					<LandingFinalCta
						locale={locale}
						title={studio.finalCta.title}
						description={studio.finalCta.description}
						androidCta={studio.finalCta.androidCta}
						iosCta={studio.finalCta.iosCta}
						contactCta={studio.finalCta.contactCta}
					/>
				</div>
			</main>
		</div>
	);
}
