import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { supabase } from '@/lib/supabase';

// GET /api/services - Get services for current user's salon
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

		// Only owners and admins can access services
		if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		// Get services for user's salon
		const services = await prisma.service.findMany({
			where: {
				salon: {
					ownerId: user.id,
				},
			},
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

		// Only owners and admins can create services
		if (user.role !== 'OWNER' && user.role !== 'ADMIN') {
			return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
		}

		const { name, description, duration, price } = await request.json();

		// Validate required fields
		if (!name || !duration || !price) {
			return NextResponse.json(
				{ error: 'Name, duration, and price are required' },
				{ status: 400 }
			);
		}

		// Get user's salon
		const salon = await prisma.salon.findFirst({
			where: { ownerId: user.id },
		});

		if (!salon) {
			return NextResponse.json(
				{ error: 'No salon found for user' },
				{ status: 404 }
			);
		}

		// Create service
		const service = await prisma.service.create({
			data: {
				name,
				description: description || '',
				duration: parseInt(duration),
				price: parseFloat(price),
				salonId: salon.id,
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
