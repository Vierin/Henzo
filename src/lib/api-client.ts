import { plainToClass } from 'class-transformer';
import { supabase } from './supabase';

export interface ApiResponse<T> {
	data?: T;
	error?: string;
	message?: string;
}

export interface PaginatedResponse<T> {
	data: T[];
	total: number;
	page: number;
	limit: number;
}

export class ApiClient {
	private baseUrl: string;

	constructor(baseUrl: string = 'http://localhost:3001') {
		this.baseUrl = baseUrl;
	}

	private async request<T>(
		endpoint: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;

		// Get current session and add authorization header
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const headers: HeadersInit = {
			'Content-Type': 'application/json',
			...(options.headers as Record<string, string>),
		};

		if (session?.access_token) {
			(headers as Record<string, string>)['Authorization'] =
				`Bearer ${session.access_token}`;
		}

		const config: RequestInit = {
			headers,
			...options,
		};

		const response = await fetch(url, config);

		if (!response.ok) {
			const errorData = await response.json().catch(() => ({}));
			// NestJS returns errors as { message: string, statusCode: number }
			// But some endpoints might return { error: string }
			const errorMessage =
				errorData.message ||
				errorData.error ||
				`HTTP error! status: ${response.status}`;
			throw new Error(errorMessage);
		}

		// Check if response has content
		const contentType = response.headers.get('content-type');
		if (contentType && contentType.includes('application/json')) {
			const text = await response.text();
			if (text.trim() === '') {
				return null as T; // Return null for empty responses
			}
			const data = JSON.parse(text);

			// Debug log for salon data
			if (
				url.includes('/salons/') &&
				!url.includes('/salons?') &&
				!url.includes('/salons/with-services')
			) {
				console.log('API Client - Salon data received:', {
					url,
					data,
					hasReviews: !!data.reviews,
					reviewsCount: data.reviews?.length || 0,
				});
			}

			return data;
		}

		// For non-JSON responses, return the text
		return (await response.text()) as T;
	}

	// Generic CRUD operations
	async get<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET' });
	}

	async post<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'POST',
			body: data ? JSON.stringify(data) : undefined,
		});
	}

	async put<T>(endpoint: string, data?: unknown): Promise<T> {
		return this.request<T>(endpoint, {
			method: 'PUT',
			body: data ? JSON.stringify(data) : undefined,
		});
	}

	async delete<T>(endpoint: string): Promise<T> {
		return this.request<T>(endpoint, { method: 'DELETE' });
	}

	// Utility method to transform response data
	transformResponse<T>(data: unknown, DtoClass: new () => T): T {
		return plainToClass(DtoClass, data);
	}

	// Utility method to transform array response data
	transformArrayResponse<T>(data: unknown[], DtoClass: new () => T): T[] {
		return data.map((item) => plainToClass(DtoClass, item));
	}
}

// Create a default API client instance
// В продакшене будет использоваться URL бэкенда на Digital Ocean
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
export const apiClient = new ApiClient(API_BASE_URL);
