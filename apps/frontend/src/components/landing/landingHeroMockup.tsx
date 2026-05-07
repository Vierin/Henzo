export function LandingHeroMockup({
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
		<div className="relative mx-auto flex w-full max-w-[720px] justify-center px-2 md:max-w-none">
			<div className="absolute left-0 top-4 z-10 w-[min(42%,200px)] sm:left-2 md:left-4 md:top-8 lg:left-8">
				<div className="rounded-2xl bg-white px-3 py-2.5 text-[11px] font-medium leading-snug text-[#3F3F3F] shadow-[0_12px_40px_-12px_rgba(26,32,44,0.35)] sm:text-xs md:px-4 md:py-3 md:text-[13px]">
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
					<p className="mb-2 text-[11px] font-semibold text-[#3F3F3F] sm:text-xs">
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
										<p className="truncate text-[11px] font-semibold leading-tight text-[#3F3F3F] sm:text-xs">
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
