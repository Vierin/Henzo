import Link from 'next/link';

export default function Footer() {
	return (
		<footer className="bg-[#F8F5F2] py-12 px-6 border-t border-gray-200">
			<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
				<div className="flex flex-col md:flex-row justify-between items-center">
					<div className="mb-4 md:mb-0">
						<p className="text-gray-400">© 2024 Henzo. All rights reserved.</p>
					</div>
					<div className="flex space-x-6">
						<Link href="/about" className="text-gray-700 hover:text-[#8B4513]">
							About Us
						</Link>
						<Link
							href="/contact"
							className="text-gray-700 hover:text-[#8B4513]"
						>
							Contact
						</Link>
						<Link href="/terms" className="text-gray-700 hover:text-[#8B4513]">
							Terms of Service
						</Link>
						<Link
							href="/privacy"
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
