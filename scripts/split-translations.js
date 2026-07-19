/**
 * Script to split large translation JSON files into modular files
 * Usage: node scripts/split-translations.js [locale]
 * Example: node scripts/split-translations.js en
 */

const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '../src/i18n/locales');
const MODULE_MAP = {
	meta: 'meta',
	common: 'common',
	navigation: 'navigation',
	weekdays: 'weekdays',
	months: 'months',
	homepage: 'homepage',
	salon: 'salon',
	booking: 'booking',
	forms: 'forms',
	auth: 'auth',
	categories: 'categories',
	header: 'header',
	footer: 'footer',
	cookieBanner: 'cookieBanner',
	map: 'map',
	emptyStates: 'emptyStates',
	business: 'business',
	contact: 'contact',
	feedback: 'feedback',
	about: 'about',
	owner: 'owner',
	clientSettings: 'clientSettings',
};

// Nested modules that should be in subdirectories
const NESTED_MODULES = {
	'owner/dashboard': (obj) => {
		const owner = obj.owner || {};
		return {
			dashboard: owner.dashboard,
			calendar: owner.calendar,
			services: owner.services?.title ? { title: owner.services.title } : undefined,
			staff: owner.staff?.title ? { title: owner.staff.title } : undefined,
			marketing: owner.marketing,
			settings: owner.settings,
			logOut: owner.logOut,
			welcomeBack: owner.welcomeBack,
			businessOverview: owner.businessOverview,
			totalRevenue: owner.totalRevenue,
			totalClients: owner.totalClients,
			bookings: owner.bookings,
			completionRate: owner.completionRate,
			last7Days: owner.last7Days,
			last30Days: owner.last30Days,
			last1Year: owner.last1Year,
			newAppointment: owner.newAppointment,
			upcomingBookings: owner.upcomingBookings,
			noUpcomingBookings: owner.noUpcomingBookings,
			noUpcomingBookingsNext7Days: owner.noUpcomingBookingsNext7Days,
			loadingBookings: owner.loadingBookings,
			topSellingServices: owner.topSellingServices,
			noCompletedServices: owner.noCompletedServices,
			serviceName: owner.serviceName,
			totalRevenue: owner.totalRevenue,
			additionalMetrics: owner.additionalMetrics,
			noShowRate: owner.noShowRate,
			missed: owner.missed,
			repeatClients: owner.repeatClients,
			avgRevenuePerClient: owner.avgRevenuePerClient,
			perClient: owner.perClient,
			vsLastMonth: owner.vsLastMonth,
			client: owner.client,
			service: owner.service,
			date: owner.date,
			time: owner.time,
			status: owner.status,
			actions: owner.actions,
			confirm: owner.confirm,
			reject: owner.reject,
			edit: owner.edit,
			cancel: owner.cancel,
			pending: owner.pending,
			confirmed: owner.confirmed,
			completed: owner.completed,
			cancelled: owner.cancelled,
			noShow: owner.noShow,
			unassigned: owner.unassigned,
			cannotCreateBooking: owner.cannotCreateBooking,
		};
	},
	'owner/salonInfo': (obj) => obj.owner?.salonInfo || {},
	'owner/services': (obj) => obj.owner?.services || {},
	'owner/staff': (obj) => obj.owner?.staff || {},
	'owner/calendar': (obj) => obj.owner?.calendarPage || {},
	'owner/staffNew': (obj) => obj.owner?.staffNew || {},
	'owner/servicesNew': (obj) => obj.owner?.servicesNew || {},
};

function cleanObject(obj) {
	if (obj === null || obj === undefined) return undefined;
	if (typeof obj !== 'object') return obj;
	if (Array.isArray(obj)) return obj.map(cleanObject);

	const cleaned = {};
	for (const [key, value] of Object.entries(obj)) {
		const cleanedValue = cleanObject(value);
		if (cleanedValue !== undefined) {
			cleaned[key] = cleanedValue;
		}
	}
	return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

function splitTranslations(locale) {
	const inputFile = path.join(LOCALES_DIR, `${locale}.json`);
	const outputDir = path.join(LOCALES_DIR, locale);

	if (!fs.existsSync(inputFile)) {
		console.error(`File not found: ${inputFile}`);
		process.exit(1);
	}

	// Create output directory
	if (!fs.existsSync(outputDir)) {
		fs.mkdirSync(outputDir, { recursive: true });
	}

	// Read the full translation file
	const fullTranslations = JSON.parse(fs.readFileSync(inputFile, 'utf8'));

	// Split into modules
	for (const [moduleKey, moduleName] of Object.entries(MODULE_MAP)) {
		if (fullTranslations[moduleKey]) {
			const moduleData = cleanObject(fullTranslations[moduleKey]);
			if (moduleData) {
				const outputFile = path.join(outputDir, `${moduleName}.json`);
				fs.writeFileSync(
					outputFile,
					JSON.stringify(moduleData, null, '\t') + '\n',
					'utf8'
				);
				console.log(`✓ Created ${outputFile}`);
			}
		}
	}

	// Handle nested modules
	for (const [modulePath, extractor] of Object.entries(NESTED_MODULES)) {
		const moduleData = cleanObject(extractor(fullTranslations));
		if (moduleData) {
			const [parentDir, fileName] = modulePath.split('/');
			const nestedDir = path.join(outputDir, parentDir);
			if (!fs.existsSync(nestedDir)) {
				fs.mkdirSync(nestedDir, { recursive: true });
			}
			const outputFile = path.join(nestedDir, `${fileName}.json`);
			fs.writeFileSync(
				outputFile,
				JSON.stringify(moduleData, null, '\t') + '\n',
				'utf8'
			);
			console.log(`✓ Created ${outputFile}`);
		}
	}

	console.log(`\n✓ Successfully split ${locale}.json into modules!`);
	console.log(`  Output directory: ${outputDir}`);
}

// Main execution
const locale = process.argv[2] || 'en';
console.log(`Splitting translations for locale: ${locale}\n`);
splitTranslations(locale);

