type Step = { title: string; description: string };

type LandingWorkflowSectionProps = {
	title: string;
	steps: Step[];
};

export function LandingWorkflowSection({
	title,
	steps,
}: LandingWorkflowSectionProps) {
	return (
		<section className="mt-16 md:mt-24" id="pricing">
			<h2 className="text-center text-3xl font-semibold tracking-tight text-[#3F3F3F] md:text-4xl">
				{title}
			</h2>
			<div className="mt-10 grid gap-6 md:grid-cols-3 md:gap-8">
				{steps.map((step) => (
					<article
						key={step.title}
						className="rounded-[22px] border border-[#eadfd7]/90 bg-white/85 p-7 shadow-[0_8px_30px_-18px_rgba(26,32,44,0.08)]"
					>
						<h3 className="text-lg font-semibold text-[#3F3F3F]">{step.title}</h3>
						<p className="mt-3 text-sm leading-relaxed text-[#718096]">
							{step.description}
						</p>
					</article>
				))}
			</div>
		</section>
	);
}
