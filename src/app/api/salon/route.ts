import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/../../packages/db/client';

// GET /api/salon - Get salon data for the current user
export async function GET() {
	try {
		// For now, we'll get the first salon. In a real app, you'd get the salon for the current user
		const salon = await prisma.salon.findFirst({
			include: {
				services: true,
				staff: true,
			},
		});

		if (!salon) {
			return NextResponse.json({ salon: null });
		}

		// Parse workingHours JSON if it exists
		const salonWithParsedHours = {
			...salon,
			workingHours: salon.workingHours ? JSON.parse(salon.workingHours as string) : null,
		};

		return NextResponse.json({ salon: salonWithParsedHours });
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
		const { name, address, phone, logo, workingHours } = await request.json();

		// For now, we'll update the first salon. In a real app, you'd update the salon for the current user
		const salon = await prisma.salon.findFirst();

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
				workingHours: workingHours ? JSON.stringify(workingHours) : salon.workingHours,
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
