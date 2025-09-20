import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/../../packages/db/client';

// GET /api/services - Get all services
export async function GET() {
	try {
		const services = await prisma.service.findMany({
			orderBy: {
				name: 'asc',
			},
		});

		return NextResponse.json({ services });
	} catch (error: any) {
		console.error('Error fetching services:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch services' },
			{ status: 500 }
		);
	}
}

// POST /api/services - Create new service
export async function POST(request: NextRequest) {
	try {
		const { name, description, duration, price, salonId } =
			await request.json();

		// Validate required fields
		if (!name || !duration || !price || !salonId) {
			return NextResponse.json(
				{ error: 'Name, duration, price, and salonId are required' },
				{ status: 400 }
			);
		}

		// Create service
		const service = await prisma.service.create({
			data: {
				name,
				description: description || '',
				duration: parseInt(duration),
				price: parseFloat(price),
				salonId,
			},
		});

		return NextResponse.json({ service }, { status: 201 });
	} catch (error: any) {
		console.error('Error creating service:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to create service' },
			{ status: 500 }
		);
	}
}
