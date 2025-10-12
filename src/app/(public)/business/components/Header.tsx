'use client';

import Link from 'next/link';
import { Button } from './ui/button';
import { Sparkles } from 'lucide-react';

export function Header() {
	return (
		<header className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
			<div className="container mx-auto px-4 py-4 flex items-center justify-between">
				<Link href="/" className="flex items-center gap-2">
					<div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center">
						<Sparkles className="w-5 h-5 text-white" />
					</div>
					<span className="text-xl tracking-tight">Henzo</span>
				</Link>

				<nav className="hidden md:flex items-center gap-8">
					<a
						href="#features"
						className="text-foreground/70 hover:text-foreground transition-colors"
					>
						Features
					</a>
					<a
						href="#benefits"
						className="text-foreground/70 hover:text-foreground transition-colors"
					>
						Benefits
					</a>
					<a
						href="#beta-form"
						className="text-foreground/70 hover:text-foreground transition-colors"
					>
						Beta Access
					</a>
				</nav>

				<div className="flex items-center gap-3">
					<Link href="/login">
						<Button variant="ghost" className="hidden sm:inline-flex">
							Sign In
						</Button>
					</Link>
					<Link href="#beta-form">
						<Button className="bg-primary hover:bg-primary/90">
							Start Free
						</Button>
					</Link>
				</div>
			</div>
		</header>
	);
}
