'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import Image from 'next/image';
import { useTranslation } from '@/contexts/LanguageContext';

export function Header() {
	const t = useTranslation();
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<Link href="/" className="flex items-center gap-2 cursor-pointer">
					<Image
						src="/logo.png"
						alt="Henzo Logo"
						width={88}
						height={40}
						priority
						sizes="88px"
					/>
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					<a
						href="#features"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t.business.header.features}
					</a>
					<a
						href="#benefits"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t.business.header.benefits}
					</a>
					<a
						href="#beta-form"
						className="text-foreground/70 hover:text-foreground transition-colors cursor-pointer"
					>
						{t.business.header.betaAccess}
					</a>
				</nav>

				<div className="flex items-center gap-3">
					<Link href="/login" className="cursor-pointer">
						<Button variant="ghost" className="hidden sm:inline-flex">
							{t.business.header.signIn}
						</Button>
					</Link>
					<Link href="#beta-form" className="cursor-pointer">
						<Button className="bg-primary text-white hover:bg-primary/90">
							{t.business.header.startFree}
						</Button>
					</Link>
				</div>
			</div>
		</header>
	);
}
