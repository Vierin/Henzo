import { plainToClass } from 'class-transformer';
import { supabase } from './supabase';
import { logger } from './logger';

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
		options: RequestInit & { responseType?: 'blob' } = {}
	): Promise<T> {
		const url = `${this.baseUrl}${endpoint}`;
		const { responseType, ...fetchOptions } = options;

		// Get current session and add authorization header
		const {
			data: { session },
		} = await supabase.auth.getSession();
		const headers: HeadersInit = {};

		// Don't set Content-Type for blob requests
		if (responseType !== 'blob') {
			headers['Content-Type'] = 'application/json';
		}

		// Add any custom headers
		if (options.headers) {
			Object.assign(headers, options.headers);
		}

		if (session?.access_token) {
			(headers as Record<string, string>)['Authorization'] =
				`Bearer ${session.access_token}`;
		}

		const config: RequestInit = {
			headers,
			...fetchOptions,
		};

		const response = await fetch(url, config);

		if (!response.ok) {
			// For blob responses, don't try to parse as JSON
			if (responseType === 'blob') {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const errorData = await response.json().catch(() => ({}));
			// NestJS returns errors as { message: string, statusCode: number }
			// But some endpoints might return { error: string }
			// For validation errors, extract specific constraint messages
			let errorMessage =
				errorData.message ||
				errorData.error ||
				`HTTP error! status: ${response.status}`;

			// If it's a validation error, extract the first constraint message
			if (
				errorData.errors &&
				Array.isArray(errorData.errors) &&
				errorData.errors.length > 0
			) {
				const firstError = errorData.errors[0];
				if (firstError.constraints) {
					const constraintKeys = Object.keys(firstError.constraints);
					if (constraintKeys.length > 0) {
						errorMessage = firstError.constraints[constraintKeys[0]];
					}
				}
			}

			throw new Error(errorMessage);
		}

		// Handle blob responses
		if (responseType === 'blob') {
			const blob = await response.blob();
			// Blob responses don't need logging in production
			// Return the blob directly as T
			return blob as T;
		}

		// Check if response has content
		const contentType = response.headers.get('content-type');
		if (contentType && contentType.includes('application/json')) {
			const text = await response.text();
			if (text.trim() === '') {
				return null as T; // Return null for empty responses
			}
			const data = JSON.parse(text);

			return data;
		}

		// For non-JSON responses, return the text
		return (await response.text()) as T;
	}

	// Generic CRUD operations
	async get<T>(
		endpoint: string,
		options?: { responseType?: 'blob' }
	): Promise<T> {
		return this.request<T>(endpoint, { method: 'GET', ...options });
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
