import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@db/client';

// PUT /api/services/[id] - Update service
export async function PUT(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		const { name, description, duration, price } = await request.json();

		// Validate required fields
		if (!name || !duration || !price) {
			return NextResponse.json(
				{ error: 'Name, duration and price are required' },
				{ status: 400 }
			);
		}

		// Update service
		const service = await prisma.service.update({
			where: { id: params.id },
			data: {
				name,
				description: description || '',
				duration: parseInt(duration.toString()),
				price: parseFloat(price.toString()),
			},
		});

		return NextResponse.json({ service });
	} catch (error: any) {
		console.error('Error updating service:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to update service' },
			{ status: 500 }
		);
	}
}

// DELETE /api/services/[id] - Delete service
export async function DELETE(
	request: NextRequest,
	{ params }: { params: { id: string } }
) {
	try {
		// Delete service
		await prisma.service.delete({
			where: { id: params.id },
		});

		return NextResponse.json({ success: true });
	} catch (error: any) {
		console.error('Error deleting service:', error);
		return NextResponse.json(
			{ error: error.message || 'Failed to delete service' },
			{ status: 500 }
		);
	}
}
