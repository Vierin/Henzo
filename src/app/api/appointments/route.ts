import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// GET /api/appointments - Get appointments for current user
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

		// Get user from database to check role
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		let appointments;

		if (user.role === 'CLIENT') {
			// For clients, get their own appointments
			appointments = await prisma.booking.findMany({
				where: { userId: user.id },
				include: {
					user: true,
					client: true,
					service: true,
					staff: true,
					salon: true,
				},
				orderBy: { time: 'desc' },
			});
		} else {
			// For owners/admins, get all appointments for their salons
			appointments = await prisma.booking.findMany({
				where: {
					salon: {
						ownerId: user.id,
					},
				},
				include: {
					user: true,
					client: true,
					service: true,
					staff: true,
					salon: true,
				},
				orderBy: { time: 'desc' },
			});
		}

		return NextResponse.json({ appointments });
	} catch (error: any) {
		console.error('Error fetching appointments:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch appointments' },
			{ status: 500 }
		);
	}
}

// POST /api/appointments - Create new appointment
export async function POST(request: NextRequest) {
	try {
		// Get session from Supabase
		const {
			data: { session },
			error: sessionError,
		} = await supabase.auth.getSession();

		if (sessionError || !session?.user) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const {
			clientName,
			clientPhone,
			clientEmail,
			serviceId,
			staffId,
			date,
			time,
			notes,
			salonId,
		} = await request.json();

		// Validate required fields
		if (!serviceId || !staffId || !date || !time || !salonId) {
			return NextResponse.json(
				{ error: 'All required fields must be provided' },
				{ status: 400 }
			);
		}

		// Get current user
		const user = await prisma.user.findUnique({
			where: { id: session.user.id },
		});

		if (!user) {
			return NextResponse.json({ error: 'User not found' }, { status: 404 });
		}

		// Create or find client (for backward compatibility)
		let client = await prisma.client.findUnique({
			where: { phone: clientPhone || user.phone || '' },
		});

		if (!client) {
			client = await prisma.client.create({
				data: {
					name: clientName || user.name || 'Unknown Client',
					phone: clientPhone || user.phone || '',
					email: clientEmail || user.email || '',
				},
			});
		}

		// Create appointment
		const appointment = await prisma.booking.create({
			data: {
				salonId,
				userId: user.id,
				clientId: client.id,
				serviceId,
				staffId,
				time: new Date(`${date}T${time}`),
				status: 'CONFIRMED',
				notes: notes || '',
			},
			include: {
				user: true,
				client: true,
				service: true,
				staff: true,
				salon: true,
			},
		});

		return NextResponse.json({ appointment }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating appointment:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to create appointment' },
			{ status: 500 }
		);
	}
}
