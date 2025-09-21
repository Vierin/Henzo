import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@db/client';

// GET /api/appointments - Get all appointments
export async function GET() {
	try {
		const appointments = await prisma.booking.findMany({
			include: {
				client: true,
				service: true,
				staff: true,
				salon: true,
			},
			orderBy: {
				time: 'asc',
			},
		});

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
		if (
			!clientName ||
			!clientPhone ||
			!serviceId ||
			!staffId ||
			!date ||
			!time ||
			!salonId
		) {
			return NextResponse.json(
				{ error: 'All required fields must be provided' },
				{ status: 400 }
			);
		}

		// Create or find client
		let client = await prisma.client.findUnique({
			where: { phone: clientPhone },
		});

		if (!client) {
			client = await prisma.client.create({
				data: {
					name: clientName,
					phone: clientPhone,
					email: clientEmail || '',
				},
			});
		}

		// Create appointment
		const appointment = await prisma.booking.create({
			data: {
				salonId,
				clientId: client.id,
				serviceId,
				staffId,
				time: new Date(`${date}T${time}`),
				status: 'CONFIRMED',
				notes: notes || '',
			},
			include: {
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
