import { NextResponse } from 'next/server';
import { prisma } from '@/../../packages/db/client';

// GET /api/salons/with-services - Get all salons with their services
export async function GET() {
	try {
		const salons = await prisma.salon.findMany({
			include: {
				services: {
					orderBy: {
						name: 'asc',
					},
				},
				staff: {
					orderBy: {
						name: 'asc',
					},
				},
			},
			orderBy: {
				name: 'asc',
			},
		});

		// Parse workingHours JSON for each salon
		const salonsWithParsedHours = salons.map(salon => ({
			...salon,
			workingHours: salon.workingHours ? JSON.parse(salon.workingHours as string) : null,
		}));

		return NextResponse.json({ salons: salonsWithParsedHours });
	} catch (error: any) {
		console.error('Error fetching salons with services:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to fetch salons' },
			{ status: 500 }
		);
	}
}
