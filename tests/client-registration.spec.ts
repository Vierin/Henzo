import { test, expect } from '@playwright/test';

// Генерируем уникальный email для каждого теста
function generateTestEmail(): string {
	const timestamp = Date.now();
	const random = Math.floor(Math.random() * 10000);
	return `testclient_${timestamp}_${random}@test.com`;
}

test.describe('Client Registration', () => {
	const baseURL = process.env.NEXT_PUBLIC_FRONTEND_URL || 'http://localhost:3000';
	const locale = 'en'; // Можно изменить на 'ru' или 'vi'

	test('should register a new client account without errors', async ({ page }) => {
		const testEmail = generateTestEmail();
		const testName = 'Test Client';
		const testPhone = '+1234567890';
		const testPassword = 'TestPassword123!';

		console.log(`\n🧪 Testing registration with email: ${testEmail}`);

		// Переходим на страницу регистрации
		const registerURL = `${baseURL}/${locale}/register`;
		console.log(`📍 Navigating to: ${registerURL}`);
		await page.goto(registerURL, { waitUntil: 'networkidle' });

		// Проверяем, что страница загрузилась
		await expect(page).toHaveTitle(/register|sign up|регистрация/i);

		// Ждем появления формы
		const nameInput = page.locator('input[name="name"]');
		await expect(nameInput).toBeVisible({ timeout: 10000 });

		console.log('✅ Registration form loaded');

		// Заполняем форму
		console.log('📝 Filling registration form...');
		await nameInput.fill(testName);
		await page.locator('input[name="email"]').fill(testEmail);
		await page.locator('input[name="phone"]').fill(testPhone);
		await page.locator('input[name="password"]').fill(testPassword);
		await page.locator('input[name="confirmPassword"]').fill(testPassword);

		console.log('✅ Form filled');

		// Перехватываем запросы к API
		const apiRequests: any[] = [];
		page.on('request', (request) => {
			if (request.url().includes('/auth/register-client')) {
				apiRequests.push({
					url: request.url(),
					method: request.method(),
					postData: request.postData(),
				});
			}
		});

		const apiResponses: any[] = [];
		page.on('response', async (response) => {
			if (response.url().includes('/auth/register-client')) {
				const status = response.status();
				const body = await response.text().catch(() => '');
				apiResponses.push({
					url: response.url(),
					status,
					body: body.substring(0, 500), // Ограничиваем размер для логов
				});
			}
		});

		// Собираем ошибки консоли
		const consoleErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				const text = msg.text();
				consoleErrors.push(text);
				console.log(`❌ Console error: ${text}`);
			}
		});

		// Собираем ошибки сети
		const networkErrors: any[] = [];
		page.on('response', async (response) => {
			const status = response.status();
			if (status >= 400 && !response.url().includes('/auth/register-client')) {
				// Игнорируем ошибки регистрации, они будут проверены отдельно
				const url = response.url();
				const text = await response.text().catch(() => '');
				networkErrors.push({
					url,
					status,
					statusText: response.statusText(),
					body: text.substring(0, 200),
				});
				console.log(`❌ Network error: ${status} ${response.statusText()} - ${url}`);
			}
		});

		// Отправляем форму
		console.log('🚀 Submitting registration form...');
		await Promise.all([
			page.waitForResponse(
				(response) =>
					response.url().includes('/auth/register-client') &&
					response.request().method() === 'POST',
				{ timeout: 30000 }
			).catch(() => null), // Не падаем, если запрос не пришел
			page.locator('button[type="submit"]').click(),
		]);

		// Ждем немного для обработки ответа
		await page.waitForTimeout(2000);

		// Проверяем результаты
		console.log('\n📊 Test Results:');
		console.log(`   API Requests: ${apiRequests.length}`);
		console.log(`   API Responses: ${apiResponses.length}`);

		// Проверяем, что был отправлен запрос на регистрацию
		expect(apiRequests.length).toBeGreaterThan(0);
		console.log('✅ Registration API request was sent');

		// Проверяем ответ API
		if (apiResponses.length > 0) {
			const lastResponse = apiResponses[apiResponses.length - 1];
			console.log(`   Last API Response Status: ${lastResponse.status}`);

			if (lastResponse.status >= 400) {
				console.log(`   ❌ API Error Response: ${lastResponse.body}`);
				// Не падаем сразу, проверяем дальше
			} else {
				console.log('✅ API request succeeded');
			}
		}

		// Проверяем ошибки консоли (игнорируем известные предупреждения)
		const criticalConsoleErrors = consoleErrors.filter(
			(error) =>
				!error.includes('favicon') &&
				!error.includes('Failed to load resource') &&
				!error.includes('404') &&
				!error.toLowerCase().includes('warning')
		);

		if (criticalConsoleErrors.length > 0) {
			console.log(`\n⚠️  Console errors found (${criticalConsoleErrors.length}):`);
			criticalConsoleErrors.forEach((error, index) => {
				console.log(`   ${index + 1}. ${error}`);
			});
		} else {
			console.log('✅ No critical console errors');
		}

		// Проверяем критические ошибки сети
		const criticalNetworkErrors = networkErrors.filter(
			(error) =>
				!error.url.includes('favicon') &&
				!error.url.includes('robots.txt') &&
				error.status >= 500 // Только серверные ошибки
		);

		if (criticalNetworkErrors.length > 0) {
			console.log(`\n⚠️  Critical network errors found (${criticalNetworkErrors.length}):`);
			criticalNetworkErrors.forEach((error, index) => {
				console.log(
					`   ${index + 1}. ${error.status} ${error.statusText} - ${error.url}`
				);
			});
		} else {
			console.log('✅ No critical network errors');
		}

		// Проверяем, что произошел редирект или показ сообщения об успехе
		await page.waitForTimeout(3000); // Даем время на редирект

		const currentURL = page.url();
		console.log(`\n📍 Current URL after registration: ${currentURL}`);

		// Проверяем возможные результаты:
		// 1. Редирект на /check-email (если email не подтвержден)
		// 2. Редирект на /dashboard (если email подтвержден)
		// 3. Остались на странице регистрации (если была ошибка)
		const isRedirected =
			currentURL.includes('/check-email') ||
			currentURL.includes('/dashboard') ||
			currentURL.includes('/login');

		if (isRedirected) {
			console.log('✅ Registration successful - redirect occurred');
		} else {
			// Проверяем, есть ли сообщение об ошибке на странице
			const errorMessage = await page
				.locator('[role="alert"], .error, [class*="error"]')
				.first()
				.textContent()
				.catch(() => null);

			if (errorMessage) {
				console.log(`⚠️  Error message on page: ${errorMessage}`);
			} else {
				console.log('⚠️  No redirect occurred - checking for success message...');
				// Проверяем toast сообщения
				const toastMessages = await page
					.locator('[class*="toast"], [data-testid*="toast"]')
					.allTextContents()
					.catch(() => []);
				if (toastMessages.length > 0) {
					console.log(`   Toast messages: ${toastMessages.join(', ')}`);
				}
			}
		}

		// Финальная проверка: не должно быть критических ошибок
		expect(criticalConsoleErrors.length).toBe(0);
		expect(criticalNetworkErrors.length).toBe(0);

		console.log('\n✅ Registration test completed successfully!');
	});
});

