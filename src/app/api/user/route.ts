import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// GET /api/user - Get current user data
export async function GET(request: NextRequest) {
	try {
		// Get session from Supabase
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user from database
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
			include: {
				bookings: {
					include: {
						salon: true,
						service: true,
						staff: true,
					},
					orderBy: { time: 'desc' },
				},
				salons: true,
			},
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		return NextResponse.json({ user });
	} catch (error: any) {
		console.error('Error fetching user:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch user' },
			{ status: 500 }
		);
	}
}

// PUT /api/user - Update user data
export async function PUT(request: NextRequest) {
	try {
		// Get session from Supabase
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { name, phone } = await request.json();

		// Update user in database
		const user = await prisma.user.update({
			where: { id: session.user.id },
			data: {
				name,
				phone,
			},
		});

		return NextResponse.json({ user });
	} catch (error: any) {
		console.error('Error updating user:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to update user' },
			{ status: 500 }
		);
	}
}
