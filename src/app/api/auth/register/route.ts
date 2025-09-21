import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest) {
	try {
		const { userId, email, name, phone } = await request.json();

		// Create business owner user profile
		const user = await prisma.user.create({
			data: {
				id: userId,
				email,
				name,
				phone,
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
