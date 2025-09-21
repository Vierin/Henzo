import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// GET /api/user/bookings - Get bookings for current user
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
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Get bookings for the user
		const bookings = await prisma.booking.findMany({
			where: { userId: user.id },
			include: {
				salon: {
					select: {
						id: true,
						name: true,
						address: true,
						phone: true,
						logo: true,
					},
				},
				service: {
					select: {
						id: true,
						name: true,
						description: true,
						duration: true,
						price: true,
					},
				},
				staff: {
					select: {
						id: true,
						name: true,
					},
				},
			},
			orderBy: { time: 'desc' },
		});

		return NextResponse.json({ bookings });
	} catch (error: any) {
		console.error('Error fetching user bookings:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch bookings' },
			{ status: 500 }
		);
	}
}
