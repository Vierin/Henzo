const DEFAULT_FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';
const DEFAULT_BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
const TIMEOUT_MS = Number(process.env.HEALTH_TIMEOUT_MS || 4000);

const checks = [
	{
		name: 'frontend',
		urls: [DEFAULT_FRONTEND_URL, `${DEFAULT_FRONTEND_URL}/api/health`],
	},
	{
		name: 'backend',
		urls: [
			`${DEFAULT_BACKEND_URL}/health`,
			`${DEFAULT_BACKEND_URL}/api/health`,
			DEFAULT_BACKEND_URL,
		],
	},
];

async function fetchWithTimeout(url, timeoutMs) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), timeoutMs);

	try {
		const response = await fetch(url, {
			method: 'GET',
			signal: controller.signal,
		});
		return response;
	} finally {
		clearTimeout(timer);
	}
}

async function checkService(service) {
	for (const url of service.urls) {
		try {
			const response = await fetchWithTimeout(url, TIMEOUT_MS);
			return {
				ok: true,
				url,
				status: response.status,
			};
		} catch {
			// Try next URL for this service
		}
	}

	return {
		ok: false,
		url: service.urls[0],
		status: null,
	};
}

const results = await Promise.all(checks.map(checkService));
let hasFailures = false;

for (const [index, result] of results.entries()) {
	const serviceName = checks[index].name;
	if (result.ok) {
		console.log(
			`[ok] ${serviceName} -> ${result.url} (HTTP ${result.status})`
		);
		continue;
	}

	hasFailures = true;
	console.error(`[fail] ${serviceName} is not reachable: ${result.url}`);
}

if (hasFailures) {
	process.exit(1);
}

console.log('All dev services are reachable.');
