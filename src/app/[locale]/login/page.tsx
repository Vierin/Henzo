import { Suspense } from 'react';
import LoginClient from './LoginClient';

export default function LoginPage() {
	return (
		<Suspense
			fallback={
				<div className="min-h-screen flex items-center justify-center bg-gray-50">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#ff5b5b]"></div>
				</div>
			}
		>
			<LoginClient />
		</Suspense>
	);
}
