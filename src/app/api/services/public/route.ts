import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/services/public - Get all services from all salons (public access)
export async function GET(request: NextRequest) {
	try {
		const { searchParams } = new URL(request.url);
		const salonId = searchParams.get('salonId');

		let whereClause = {};
		if (salonId) {
			whereClause = { salonId };
		}

		const services = await prisma.service.findMany({
			where: whereClause,
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
			},
			orderBy: {
				name: 'asc',
			},
		});

		return NextResponse.json({ services });
	} catch (error: any) {
		console.error('Error fetching public services:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch services' },
			{ status: 500 }
		);
	}
}
