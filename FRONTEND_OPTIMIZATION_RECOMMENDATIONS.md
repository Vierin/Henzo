# Рекомендации по оптимизации и улучшению фронтенда

## 🔴 Критические проблемы (исправить немедленно)

### 1. **Производственные console.log (217+ случаев)**

**Проблема:** Множество console.log в продакшене замедляет производительность и засоряет консоль.

**Решение:**

```typescript
// src/lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
	log: (...args: unknown[]) => {
		if (isDev) console.log(...args);
	},
	error: (...args: unknown[]) => {
		console.error(...args); // Всегда логируем ошибки
	},
	warn: (...args: unknown[]) => {
		if (isDev) console.warn(...args);
	},
};
```

**Действия:**

- Заменить все `console.log` на `logger.log`
- Использовать библиотеку типа `pino` или `winston` для продакшена
- Настроить удаленное логирование ошибок (Sentry, LogRocket)

### 2. **Игнорирование ESLint при билде**

**Проблема:** В `next.config.ts` отключен ESLint при сборке.

```typescript
eslint: {
  ignoreDuringBuilds: true, // ❌ Плохо
},
```

**Решение:**

- Убрать `ignoreDuringBuilds: true`
- Исправить все ESLint ошибки
- Настроить pre-commit hooks с husky + lint-staged

### 3. **Огромный компонент BookingModal (2774+ строк)**

**Проблема:** Монолитный компонент сложно поддерживать и тестировать.

**Решение:** Разбить на подкомпоненты:

```
components/BookingModal/
├── BookingModal.tsx (основной контейнер, только логика состояния)
├── BookingServiceSelector.tsx ✅ (уже есть)
├── BookingDateSelector.tsx ✅ (уже есть)
├── BookingTimeSelector.tsx ✅ (уже есть)
├── BookingStaffSelector.tsx ✅ (уже есть)
├── BookingFormFooter.tsx ✅ (уже есть)
├── BookingGuestForm.tsx (вынести форму для гостей)
├── BookingAuthForm.tsx (вынести форму аутентификации)
└── hooks/
    ├── useBookingForm.ts (вся логика формы)
    ├── useBookingTimeSlots.ts (логика временных слотов)
    └── useBookingValidation.ts (валидация)
```

## 🟡 Важные улучшения

### 4. **Оптимизация изображений**

**Проблема:** Нет использования Next.js Image компонента везде.

**Решение:**

```typescript
// Вместо <img src={logo} />
import Image from 'next/image';

<Image
  src={logo}
  alt="Salon logo"
  width={200}
  height={200}
  loading="lazy"
  placeholder="blur"
  blurDataURL={blurDataUrl}
/>
```

**Действия:**

- Найти все `<img>` теги и заменить на `next/image`
- Настроить `imageSizes` в `next.config.ts`
- Использовать `priority` только для above-the-fold изображений

### 5. **Мемоизация тяжелых компонентов**

**Проблема:** Отсутствие React.memo для компонентов, которые часто ре-рендерятся.

**Решение:**

```typescript
// components/SalonCard.tsx
import { memo } from 'react';

export const SalonCard = memo(
	({ salon, onBook }: SalonCardProps) => {
		// ...
	},
	(prevProps, nextProps) => {
		// Кастомная функция сравнения
		return (
			prevProps.salon.id === nextProps.salon.id &&
			prevProps.onBook === nextProps.onBook
		);
	}
);

SalonCard.displayName = 'SalonCard';
```

**Компоненты для мемоизации:**

- `SalonCard`
- `ServiceCard`
- `ReviewCard`
- `VisitHistoryCard`
- `CategoryCard`

### 6. **Виртуализация длинных списков**

**Проблема:** Рендеринг всех элементов списка одновременно.

**Решение:**

```typescript
// Использовать react-window или @tanstack/react-virtual
import { useVirtualizer } from '@tanstack/react-virtual';

const virtualizer = useVirtualizer({
  count: salons.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 200, // высота одного элемента
});

return (
  <div ref={parentRef} style={{ height: '600px', overflow: 'auto' }}>
    {virtualizer.getVirtualItems().map((virtualItem) => (
      <div key={virtualItem.key} style={{ height: virtualItem.size }}>
        <SalonCard salon={salons[virtualItem.index]} />
      </div>
    ))}
  </div>
);
```

### 7. **Code Splitting и динамические импорты**

**Проблема:** Все компоненты загружаются сразу.

**Решение:**

```typescript
// Динамический импорт тяжелых компонентов
import dynamic from 'next/dynamic';

const BookingModal = dynamic(() => import('@/components/BookingModal'), {
  loading: () => <LoadingSpinner />,
  ssr: false, // если компонент требует браузерных API
});

const MapComponent = dynamic(() => import('@/components/MapComponentWithCoords'), {
  ssr: false, // Leaflet требует window
});
```

### 8. **Оптимизация React Query**

**Проблема:** Некоторые запросы выполняются слишком часто.

**Решение в `query-client.ts`:**

```typescript
export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000,
			gcTime: 10 * 60 * 1000,
			retry: (failureCount, error: unknown) => {
				// ✅ Уже хорошо реализовано
				if (error && typeof error === 'object' && 'status' in error) {
					const status = (error as { status: number }).status;
					if (status >= 400 && status < 500) {
						return false;
					}
				}
				return failureCount < 3;
			},
			refetchOnWindowFocus: false, // ✅ Хорошо
			// Добавить:
			refetchOnMount: 'always', // или настроить индивидуально
			refetchOnReconnect: true,
		},
	},
});
```

**Улучшения для конкретных хуков:**

```typescript
// hooks/useSalon.ts
export const useSalon = () => {
	// ✅ Хорошо: уже настроен staleTime, gcTime
	// Добавить:
	return useQuery({
		// ...
		placeholderData: (previousData) => previousData, // Keep previous data while refetching
		notifyOnChangeProps: ['data', 'error'], // Только обновлять при изменении data/error
	});
};
```

### 9. **Типизация API Responses**

**Проблема:** Использование `any` и неопределенных типов.

**Решение:**

```typescript
// types/api.ts
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T[]> {
  total: number;
  page: number;
  limit: number;
}

// lib/api-client.ts - улучшить типизацию
async get<T>(
  endpoint: string,
  options?: { responseType?: 'blob' }
): Promise<T> {
  // Типизировать ответ
  const response = await this.request<ApiResponse<T>>(endpoint, {
    method: 'GET',
    ...options,
  });

  if (response.success && response.data) {
    return response.data;
  }

  throw new Error(response.message || 'Request failed');
}
```

### 10. **Debounce для поиска и автокомплита**

**Проблема:** Запросы при каждом вводе символа.

**Решение:**

```typescript
// hooks/useDebounce.ts - уже есть ✅
// Но проверить использование везде:

// components/AddressAutocomplete.tsx
const debouncedQuery = useDebounce(query, 300); // Добавить если нет

useEffect(() => {
	if (debouncedQuery.length >= 3) {
		fetchSuggestions(debouncedQuery);
	}
}, [debouncedQuery]);
```

### 11. **Оптимизация Zustand Store**

**Проблема:** Возможные ненужные ре-рендеры при изменении состояния.

**Решение:**

```typescript
// stores/authStore.ts
// Использовать селекторы для предотвращения ре-рендеров

// ✅ Плохо: весь компонент подписывается на весь store
const { user, isClient, isOwner } = useAuthStore();

// ✅ Хорошо: использовать селекторы
const user = useAuthStore((state) => state.user);
const isClient = useAuthStore((state) => state.isClient);
const isOwner = useAuthStore((state) => state.isOwner);

// Или создать хук:
export const useAuth = () => {
	return useAuthStore(
		(state) => ({
			user: state.user,
			isClient: state.isClient,
			isOwner: state.isOwner,
			isLoading: state.isLoading,
		}),
		shallow
	); // shallow comparison
};
```

### 12. **Обработка ошибок**

**Проблема:** Не все ошибки обрабатываются корректно.

**Решение:**

```typescript
// lib/error-handler.ts
export class AppError extends Error {
	constructor(
		message: string,
		public code: string,
		public statusCode: number = 500
	) {
		super(message);
		this.name = 'AppError';
	}
}

export const handleApiError = (error: unknown): string => {
	if (error instanceof AppError) {
		return error.message;
	}

	if (error instanceof Error) {
		// Отправить в Sentry
		// Sentry.captureException(error);
		return error.message;
	}

	return 'An unexpected error occurred';
};

// Использовать в компонентах:
try {
	await apiClient.post('/bookings', data);
} catch (error) {
	const message = handleApiError(error);
	toast.error(message);
}
```

### 13. **Удаление неиспользуемых зависимостей**

**Проблема:** В package.json есть неиспользуемые зависимости.

**Проверить:**

```bash
# Установить depcheck
npm install -g depcheck

# Проверить неиспользуемые зависимости
depcheck
```

**Возможные кандидаты:**

- `class-transformer` - используется только в api-client.ts
- `reflect-metadata` - возможно не используется
- `rsuite` - проверить использование
- `swiper` - проверить, действительно ли используется

### 14. **Оптимизация Bundle Size**

**Проблема:** Большой размер бандла.

**Решение:**

```typescript
// next.config.ts
const nextConfig: NextConfig = {
	// ...
	experimental: {
		optimizePackageImports: [
			'lucide-react',
			'@radix-ui/react-popover',
			'@radix-ui/react-select',
		],
	},
	compiler: {
		removeConsole:
			process.env.NODE_ENV === 'production'
				? {
						exclude: ['error', 'warn'],
					}
				: false,
	},
};
```

**Анализ бандла:**

```bash
# Установить @next/bundle-analyzer
npm install --save-dev @next/bundle-analyzer

# next.config.ts
const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
});

module.exports = withBundleAnalyzer(nextConfig);

# Запустить
ANALYZE=true npm run build
```

## 🟢 Дополнительные улучшения

### 15. **Оптимизация форм**

**Проблема:** Нет валидации на клиенте, много повторяющегося кода.

**Решение:**

```typescript
// Использовать react-hook-form + zod
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const salonSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	address: z.string().min(1, 'Address is required'),
	description: z.string().max(250, 'Max 250 characters'),
});

type SalonFormData = z.infer<typeof salonSchema>;

const {
	register,
	handleSubmit,
	formState: { errors },
} = useForm<SalonFormData>({
	resolver: zodResolver(salonSchema),
});
```

### 16. **Accessibility (a11y)**

**Проблема:** Не все компоненты доступны.

**Улучшения:**

- Добавить ARIA labels везде
- Проверить навигацию с клавиатуры
- Улучшить контраст цветов
- Использовать semantic HTML

### 17. **Performance Monitoring**

**Решение:**

```typescript
// lib/performance.ts
export const measurePerformance = (name: string) => {
	if (typeof window !== 'undefined' && window.performance) {
		const markStart = `${name}-start`;
		const markEnd = `${name}-end`;

		performance.mark(markStart);

		return () => {
			performance.mark(markEnd);
			performance.measure(name, markStart, markEnd);
			const measure = performance.getEntriesByName(name)[0];
			console.log(`${name}: ${measure.duration}ms`);
		};
	}
	return () => {};
};

// Использование:
const stopMeasure = measurePerformance('SalonCardRender');
// ... component render
stopMeasure();
```

### 18. **Тестирование**

**Рекомендации:**

- Unit тесты для утилит (Jest)
- Component тесты (React Testing Library)
- E2E тесты (Playwright/Cypress)
- Visual regression тесты (Chromatic)

### 19. **Оптимизация карт (Leaflet)**

**Решение:**

```typescript
// MapComponentWithCoords.tsx
// Уже хорошо: динамический импорт
// Добавить:
- Lazy loading тайлов
- Clustering для маркеров
- Оптимизация количества маркеров на карте
```

### 20. **Мониторинг и аналитика**

**Решение:**

```typescript
// lib/analytics.ts
export const trackEvent = (
	eventName: string,
	properties?: Record<string, unknown>
) => {
	if (typeof window !== 'undefined' && window.gtag) {
		window.gtag('event', eventName, properties);
	}
};

// Использовать для важных действий:
trackEvent('booking_created', { salonId, serviceId });
trackEvent('search_performed', { query, resultCount });
```

## 📋 Приоритетный план действий

### Неделя 1 (Критично)

1. ✅ Удалить все console.log из продакшена
2. ✅ Включить ESLint при билде
3. ✅ Разбить BookingModal на компоненты
4. ✅ Настроить обработку ошибок

### Неделя 2 (Важно)

5. ✅ Заменить img на next/image
6. ✅ Добавить мемоизацию компонентов
7. ✅ Оптимизировать React Query запросы
8. ✅ Улучшить типизацию API

### Неделя 3 (Желательно)

9. ✅ Виртуализация списков
10. ✅ Code splitting
11. ✅ Оптимизация Zustand
12. ✅ Bundle size анализ

### Неделя 4 (Улучшения)

13. ✅ React Hook Form + Zod
14. ✅ Accessibility улучшения
15. ✅ Performance monitoring
16. ✅ Тестирование

## 🛠️ Инструменты для мониторинга

1. **Lighthouse CI** - автоматическая проверка производительности
2. **Sentry** - мониторинг ошибок
3. **Vercel Analytics** - аналитика производительности
4. **React DevTools Profiler** - профилирование компонентов

## 📚 Полезные ресурсы

- [Next.js Performance](https://nextjs.org/docs/app/building-your-application/optimizing)
- [React Performance](https://react.dev/learn/render-and-commit)
- [Web Vitals](https://web.dev/vitals/)
- [Bundle Size Optimization](https://nextjs.org/docs/app/building-your-application/optimizing/bundle-analyzer)

