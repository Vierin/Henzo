type Feature = { title: string; description: string };

type LandingFeaturesSectionProps = {
	title: string;
	features: Feature[];
};

export function LandingFeaturesSection({
	title,
	features,
}: LandingFeaturesSectionProps) {
	return (
		<section className="mt-16 md:mt-24" id="benefits">
			<h2 className="text-center text-3xl font-semibold tracking-tight text-[#3F3F3F] md:text-4xl">
				{title}
			</h2>
			<div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
				{features.map((feature) => (
					<article
						key={feature.title}
						className="rounded-[22px] border border-[#eadfd7] bg-[#fffdfb] p-7 shadow-[0_12px_40px_-20px_rgba(26,32,44,0.1)] transition hover:border-[#E86D4F]/25"
					>
						<h3 className="text-xl font-semibold text-[#3F3F3F]">
							{feature.title}
						</h3>
						<p className="mt-3 text-sm leading-relaxed text-[#4A5568] md:text-[15px]">
							{feature.description}
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
