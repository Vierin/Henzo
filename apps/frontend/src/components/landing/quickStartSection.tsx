import { StudioPhoneFrame } from '@/components/landing/studioPhoneFrame';

function QuickStartFiveMinuteUnderline({ className }: { className?: string }) {
	return (
		<svg
			className={className}
			viewBox="0 0 160 14"
			fill="none"
			xmlns="http://www.w3.org/2000/svg"
			aria-hidden
		>
			<path
				d="M3 9c22-5 52-7 78-5 18 1 36 2 54 0"
				stroke="#D9534F"
				strokeWidth="2.8"
				strokeLinecap="round"
				strokeLinejoin="round"
			/>
			<path
				d="M6 11c28-6 60-8 92-5"
				stroke="#D9534F"
				strokeWidth="1.8"
				strokeLinecap="round"
				opacity="0.78"
			/>
		</svg>
	);
}

const scriptClass =
	"font-[family-name:'Caveat',cursive] text-[1.65rem] leading-none font-semibold text-[#D9534F] sm:text-[1.85rem]";

type QuickStartSectionProps = {
	line1: string;
	line2Before: string;
	line2Accent: string;
	steps: Array<{ label: string; text: string }>;
};

export function QuickStartSection({
	line1,
	line2Before,
	line2Accent,
	steps,
}: QuickStartSectionProps) {
	return (
		<section
			className="   px-5 py-12   md:px-10 md:py-16"
			aria-labelledby="quick-start-heading"
		>
			<div className="mx-auto max-w-5xl">
				<h2
					id="quick-start-heading"
					className="text-center text-[#3F3F3F] [&_span]:tracking-tight"
				>
					<span className="block text-[1.85rem] font-semibold leading-tight sm:text-4xl md:text-[2.65rem] md:leading-[1.1]">
						{line1}
					</span>
					<span className="mt-2 block text-lg font-normal sm:text-xl md:mt-3 md:text-2xl">
						{line2Before}
						<span className="relative inline-block px-0.5">
							{line2Accent}
							<QuickStartFiveMinuteUnderline className="pointer-events-none absolute -bottom-1 left-1/2 w-[108%] min-w-[7rem] max-w-[11rem] -translate-x-1/2 sm:max-w-[12rem]" />
						</span>
					</span>
				</h2>

				<div className="mt-12 flex flex-col items-center gap-10 lg:hidden">
					{steps.map((s) => (
						<div key={s.label} className="max-w-md text-center">
							<p className={scriptClass}>{s.label}</p>
							<p className="mt-2 text-base leading-snug text-[#3F3F3F]">
								{s.text}
							</p>
						</div>
					))}
					<StudioPhoneFrame className="w-[min(72vw,260px)] sm:w-[280px]" />
				</div>

				<div className="relative mx-auto mt-14 hidden min-h-[520px] max-w-[920px] lg:block">
					<div className="absolute left-1/2 top-1/2 z-[2] w-[280px] -translate-x-1/2 -translate-y-[46%]">
						<StudioPhoneFrame className="w-[280px]" />
					</div>

					<div className="absolute left-0 top-[2%] max-w-[min(240px,28vw)] text-right">
						<p className={scriptClass}>{steps[0]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[0]?.text}
						</p>
						<svg
							className="pointer-events-none absolute -right-[4.5rem] top-[52%] hidden h-[120px] w-[140px] lg:block"
							viewBox="0 0 140 120"
							fill="none"
							aria-hidden
						>
							<path
								d="M4 12 C 52 28 78 72 128 98"
								stroke="#6B46C1"
								strokeWidth="2.6"
								strokeLinecap="round"
								opacity="0.95"
							/>
							<path
								d="M118 88 L 132 100 L 124 104"
								stroke="#6B46C1"
								strokeWidth="2.4"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
					</div>

					<div className="absolute right-0 top-[34%] max-w-[min(280px,30vw)] text-left">
						<p className={scriptClass}>{steps[1]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[1]?.text}
						</p>
						<svg
							className="pointer-events-none absolute -left-[5.5rem] top-[40%] hidden h-[100px] w-[120px] lg:block"
							viewBox="0 0 120 100"
							fill="none"
							aria-hidden
						>
							<path
								d="M116 18 C 68 34 38 58 8 78"
								stroke="#6B46C1"
								strokeWidth="2.6"
								strokeLinecap="round"
								opacity="0.95"
							/>
							<path
								d="M18 70 L 6 82 L 14 86"
								stroke="#6B46C1"
								strokeWidth="2.4"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
					</div>

					<div className="absolute bottom-[6%] left-0 max-w-[min(260px,28vw)] text-right">
						<p className={scriptClass}>{steps[2]?.label}</p>
						<p className="mt-1.5 text-[15px] leading-snug text-[#3F3F3F]">
							{steps[2]?.text}
						</p>
						<svg
							className="pointer-events-none absolute -right-[4rem] bottom-[72%] hidden h-[110px] w-[130px] lg:block"
							viewBox="0 0 130 110"
							fill="none"
							aria-hidden
						>
							<path
								d="M8 96 C 48 72 82 38 122 16"
								stroke="#6B46C1"
								strokeWidth="2.6"
								strokeLinecap="round"
								opacity="0.95"
							/>
							<path
								d="M108 22 L 126 12 L 122 24"
								stroke="#6B46C1"
								strokeWidth="2.4"
								strokeLinecap="round"
								strokeLinejoin="round"
								fill="none"
							/>
						</svg>
					</div>
				</div>
			</div>
		</section>
	);
}
