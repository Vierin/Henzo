import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/../../packages/db/client';

export async function POST(request: NextRequest) {
	try {
		const { userId, email, name } = await request.json();

		// Create user profile
		const user = await prisma.user.create({
			data: {
				id: userId,
				email,
				name,
				role: 'OWNER',
			},
		});

		return NextResponse.json({
			success: true,
			user,
		});
	} catch (error: any) {
		console.error('Registration error:', error);
		return NextResponse.json(
			{ error: error.message || 'Registration failed' },
			{ status: 500 }
		);
	}
}
