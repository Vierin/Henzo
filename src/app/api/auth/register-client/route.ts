import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
	try {
		const { userId, email, name, phone } = await request.json();

		// Create client user profile
		const user = await prisma.user.create({
			data: {
				id: userId,
				email,
				name,
				phone,
				role: 'CLIENT',
			},
		});

		return NextResponse.json({
			success: true,
			user,
		});
	} catch (error: any) {
		console.error('Client registration error:', error);
		return NextResponse.json(
			{ error: error.message || 'Client registration failed' },
			{ status: 500 }
		);
	}
}
