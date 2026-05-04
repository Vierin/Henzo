type LandingIntroProps = {
	description: string;
	secondary: string;
};

export function LandingIntro({ description, secondary }: LandingIntroProps) {
	return (
		<div className="mx-auto w-full max-w-6xl px-4 sm:px-6">
			<div className="mx-auto max-w-2xl text-center">
				<p className="text-base leading-relaxed text-[#4A5568] md:text-lg">
					{description}
				</p>
				<p className="mt-3 text-sm leading-relaxed text-[#718096] md:text-base">
					{secondary}
				</p>
			</div>
		</div>
	);
}
