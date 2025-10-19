import Link from 'next/link';

export default function Footer() {
	return (
		<footer className="bg-[#F8F5F2] pt-6 md:py-12 md:px-6 px-4 border-t border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex md:flex-col gap-5 md:gap-0 flex-col-reverse md:flex-row justify-between items-start md:items-center">
					<div className="mb-4 md:mb-0">
						<p className="text-gray-400">© 2024 Henzo. All rights reserved.</p>
					</div>
					<div className="flex md:flex-row flex-col justify-start gap-2 md:gap-0 space-x-6">
						<Link href="/about" className="text-gray-700 hover:text-[#8B4513]">
							About Us
						</Link>
						<Link
							href="/contact"
							className="text-gray-700 hover:text-[#8B4513]"
						>
							Contact
						</Link>
						<Link
							href="/terms-of-service"
							className="text-gray-700 hover:text-[#8B4513]"
						>
							Terms of Service
						</Link>
						<Link
							href="/privacy-policy"
							className="text-gray-700 hover:text-[#8B4513]"
						>
							Privacy Policy
						</Link>
					</div>
				</div>
			</div>
		</footer>
	);
}
