export type AdminOverview = {
	activeStudios: number;
	todayBookings: number;
	failedNotifications24h: number;
	failedPayments24h: number;
	crashFreeRate7d: number | null;
	links: { crashlytics: string; sentry: string };
};

export type AdminStudioRow = {
	id: string;
	name: string;
	slug: string | null;
	status: string;
	createdAt: string;
	User: { id: string; email: string; name: string | null };
	Subscription: {
		type: string;
		status: string;
		currentPeriodEnd: string | null;
	} | null;
};

export type Paginated<T> = {
	items: T[];
	total: number;
	page: number;
	limit: number;
};

export type AdminSettings = {
	nodeEnv: string;
	ga4Enabled: boolean;
	sentryEnabled: boolean;
	firebasePushEnabled: boolean;
	telegramFeedbackEnabled: boolean;
	links: { crashlytics: string; sentry: string };
	adminAllowedEmailsConfigured: boolean;
};
