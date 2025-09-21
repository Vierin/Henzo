import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// GET /api/salon - Get salon data for the current user
export async function GET() {
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

		// Only owners and admins can access salon data
		if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Get salon for the current user
		const salon = await prisma.salon.findFirst({
			where: { ownerId: user.id },
			include: {
				services: true,
				staff: true,
				bookings: {
					include: {
						user: true,
						client: true,
						service: true,
						staff: true,
					},
				},
			},
		});

		if (!salon) {
			return NextResponse.json({ salon: null });
		}

		return NextResponse.json({ salon });
	} catch (error: any) {
		console.error('Error fetching salon:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch salon' },
			{ status: 500 }
		);
	}
}

// PUT /api/salon - Update salon data
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

		// Get user from database
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Only owners and admins can update salon data
		if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { name, address, phone, logo, workingHours } = await request.json();

		// Get salon for the current user
		const salon = await prisma.salon.findFirst({
			where: { ownerId: user.id },
		});

		if (!salon) {
			return NextResponse.json({ error: 'No salon found' }, { status: 404 });
		}

		const updatedSalon = await prisma.salon.update({
			where: { id: salon.id },
			data: {
				name: name || salon.name,
				address: address || salon.address,
				phone: phone || salon.phone,
				logo: logo || salon.logo,
				workingHours: workingHours || salon.workingHours,
			},
		});

		return NextResponse.json({ salon: updatedSalon });
	} catch (error: any) {
		console.error('Error updating salon:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to update salon' },
			{ status: 500 }
		);
	}
}
