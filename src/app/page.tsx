import Image from 'next/image';

export default function Home() {
	return (
		<div className="min-h-screen bg-[#fff7f6] text-[#1b1b1b]">
			<header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-[#f1d9d7]">
				<div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
					<div className="flex items-center gap-3">
						<div className="h-8 w-8 rounded-full bg-[#ff5b5b]" />
						<span className="text-xl font-semibold">Henzo</span>
					</div>
					<nav className="hidden md:flex items-center gap-8 text-[15px]">
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Dashboard
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Calendar
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Customers
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Reports
						</a>
						<a className="text-[#6b6b6b] hover:text-black" href="#">
							Marketing
						</a>
					</nav>
					<div className="flex items-center gap-4">
						<button
							aria-label="notifications"
							className="h-9 w-9 rounded-full border border-[#ead2d0] grid place-items-center text-[#6b6b6b]"
						>
							🔔
						</button>
						<div className="h-9 w-9 rounded-full bg-[#ffd6d2]" />
					</div>
				</div>
			</header>

			<main className="mx-auto max-w-7xl px-6 py-8">
				<h1 className="text-[34px] font-semibold tracking-[-0.02em]">
					Appointments
				</h1>

				<div className="mt-6 flex items-center justify-between">
					<div className="flex items-center gap-8 text-[15px]">
						<button className="relative pb-3 text-black font-medium">
							Upcoming
							<span className="absolute -bottom-px left-0 right-0 h-[3px] rounded-full bg-[#ea4b4b]" />
						</button>
						<button className="text-[#8a8a8a] pb-3">Past</button>
						<button className="text-[#8a8a8a] pb-3">Cancelled</button>
					</div>
					<button className="inline-flex items-center gap-2 rounded-full bg-[#ea4b4b] text-white px-4 py-2 text-sm shadow-sm hover:opacity-95">
						<span className="text-lg leading-none">＋</span>
						New Appointment
					</button>
				</div>

				<div className="mt-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
					<section className="rounded-xl overflow-hidden border border-[#f1d9d7] bg-white">
						<div className="grid grid-cols-6 px-6 py-3 text-[13px] text-[#7a7a7a] bg-[#fff2f1]">
							<div>Customer</div>
							<div>Service</div>
							<div>Staff</div>
							<div>Date</div>
							<div>Time</div>
							<div>Status</div>
						</div>
						<ul className="divide-y divide-[#f3e3e1]">
							{[
								{
									c: 'Sophia Bennett',
									s: 'Haircut',
									st: 'Emily Carter',
									d: 'Jul 15, 2024',
									t: '10:00 AM',
								},
								{
									c: 'Olivia Harper',
									s: 'Manicure',
									st: 'Ava Thompson',
									d: 'Jul 15, 2024',
									t: '11:30 AM',
								},
								{
									c: 'Isabella Clark',
									s: 'Facial',
									st: 'Chloe Davis',
									d: 'Jul 16, 2024',
									t: '2:00 PM',
								},
								{
									c: 'Mia Wilson',
									s: 'Massage',
									st: 'Grace Evans',
									d: 'Jul 17, 2024',
									t: '3:30 PM',
								},
								{
									c: 'Amelia Turner',
									s: 'Hair Color',
									st: 'Lily Foster',
									d: 'Jul 18, 2024',
									t: '1:00 PM',
								},
							].map((row, idx) => (
								<li
									key={idx}
									className="grid grid-cols-6 px-6 py-4 text-[15px]"
								>
									<div className="truncate pr-4">{row.c}</div>
									<div className="truncate pr-4 text-[#5b5b5b]">{row.s}</div>
									<div className="truncate pr-4 text-[#5b5b5b]">{row.st}</div>
									<div className="truncate pr-4 text-[#5b5b5b]">{row.d}</div>
									<div className="truncate pr-4 text-[#5b5b5b]">{row.t}</div>
									<div>
										<span className="inline-flex items-center rounded-full bg-[#e8faee] text-[#2b8a3e] px-3 py-1 text-[12px] font-medium">
											Confirmed
										</span>
									</div>
								</li>
							))}
						</ul>
					</section>

					<aside className="rounded-xl border border-[#f1d9d7] bg-white p-6">
						<h3 className="text-[18px] font-semibold">Quick Actions</h3>
						<ul className="mt-4 space-y-3 text-[15px]">
							<li className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6]">
								<span>Add New Services</span>
								<span className="text-xl">＋</span>
							</li>
							<li className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6]">
								<span>Add New Staff</span>
								<span className="text-xl">＋</span>
							</li>
							<li className="flex items-center justify-between rounded-lg border border-[#f6e7e6] px-4 py-3 hover:bg-[#fff7f6]">
								<span>Account Settings</span>
								<span>⚙️</span>
							</li>
						</ul>
					</aside>
				</div>
			</main>
		</div>
	);
}
