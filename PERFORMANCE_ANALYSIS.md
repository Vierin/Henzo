# Анализ производительности веб-приложения Henzo

## 🔴 Критические проблемы

### 1. **Отсутствие React.memo для часто ре-рендерящихся компонентов**

**Проблема:** Компоненты `SalonCard`, `BookingModal` и другие не мемоизированы, что приводит к лишним ре-рендерам.

**Решение:**

```typescript
// apps/frontend/src/components/SalonCard.tsx
import React from 'react';
export default React.memo(function SalonCard({ ... }) { ... });
```

**Приоритет:** Высокий
**Влияние:** Уменьшение ре-рендеров на 30-50%

---

### 2. **BookingModal слишком большой (2840+ строк)**

**Проблема:** Огромный компонент загружается целиком, даже когда модалка закрыта.

**Решение:**

- Разбить на подкомпоненты: `BookingDateSelector`, `BookingTimeSelector`, `BookingServiceSelector`, `BookingStaffSelector`
- Использовать `lazy()` для подкомпонентов внутри модалки
- Динамически импортировать модалку только при открытии

**Приоритет:** Высокий
**Влияние:** Уменьшение initial bundle на 50-100KB

---

### 3. **Отсутствие SSR для публичных страниц**

**Проблема:** Все страницы клиентские (`'use client'`), нет предрендеринга.

**Решение:**

- Использовать `generateStaticParams` для страниц салонов
- SSR для страницы поиска салонов с начальными данными
- ISR (Incremental Static Regeneration) для каталога

**Приоритет:** Высокий
**Влияние:** Улучшение FCP на 40-60%, улучшение SEO

---

### 4. **Неоптимальное кеширование React Query**

**Проблема:** `staleTime: 5 минут` слишком короткий для статических данных.

**Решение:**

```typescript
// apps/frontend/src/hooks/useSalons.ts
staleTime: 10 * 60 * 1000, // 10 минут для списков
gcTime: 30 * 60 * 1000, // 30 минут в кеше

// Для деталей салона
staleTime: 15 * 60 * 1000, // 15 минут
```

**Приоритет:** Средний
**Влияние:** Уменьшение запросов на 30-40%

---

## 🟡 Важные оптимизации

### 5. **Отсутствие виртуализации для длинных списков**

**Проблема:** На странице `/salons` рендерятся все карточки сразу.

**Решение:**

```typescript
import { useVirtualizer } from '@tanstack/react-virtual';

// Виртуализация для списка салонов
const virtualizer = useVirtualizer({
	count: salons.length,
	getScrollElement: () => parentRef.current,
	estimateSize: () => 300, // примерная высота карточки
});
```

**Приоритет:** Средний
**Влияние:** Улучшение производительности при 50+ элементах

---

### 6. **Изображения без priority для above-the-fold**

**Проблема:** Первые изображения на странице загружаются с `loading="lazy"`.

**Решение:**

```typescript
// apps/frontend/src/components/SalonCard.tsx
<SalonImage
  priority={index < 3} // Первые 3 карточки
  ...
/>
```

**Приоритет:** Средний
**Влияние:** Улучшение LCP на 20-30%

---

### 7. **Отсутствие debounce для поиска**

**Проблема:** В `SalonsClient` нет debounce для поискового запроса.

**Решение:**

```typescript
// Уже есть в ServicesClient, нужно добавить в SalonsClient
const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
useEffect(() => {
	const timer = setTimeout(() => {
		setDebouncedSearchQuery(searchQuery);
	}, 300);
	return () => clearTimeout(timer);
}, [searchQuery]);
```

**Приоритет:** Средний
**Влияние:** Уменьшение запросов на 50-70%

---

### 8. **Большие библиотеки без tree-shaking**

**Проблема:** `lucide-react`, `@radix-ui` импортируются целиком.

**Решение:** ✅ Уже настроено в `next.config.ts`:

```typescript
optimizePackageImports: ['lucide-react', '@radix-ui/react-popover', ...]
```

**Статус:** ✅ Реализовано

---

### 9. **Отсутствие code splitting для тяжелых компонентов**

**Проблема:** Некоторые тяжелые компоненты не lazy-loaded.

**Решение:**

```typescript
// apps/frontend/src/app/[locale]/(public)/salons/salonsClient.tsx
const BookingModal = lazy(() => import('@/components/BookingModal'));

// В рендере
{isBookingModalOpen && (
  <Suspense fallback={null}>
    <BookingModal ... />
  </Suspense>
)}
```

**Приоритет:** Средний
**Влияние:** Уменьшение initial bundle на 30-50KB

---

### 10. **Неоптимальная загрузка переводов**

**Проблема:** Все модули переводов загружаются сразу.

**Решение:** ✅ Уже реализовано динамическая загрузка в `LanguageContext.tsx`

**Статус:** ✅ Реализовано

---

## 🟢 Мелкие оптимизации

### 11. **Отсутствие prefetch для ссылок**

**Решение:**

```typescript
<Link href={salonUrl} prefetch={true}>
```

**Приоритет:** Низкий
**Влияние:** Улучшение навигации на 10-15%

---

### 12. **Отсутствие service worker для кеширования**

**Решение:** Использовать Next.js PWA или Workbox для кеширования статики.

**Приоритет:** Низкий
**Влияние:** Улучшение повторных визитов на 30-40%

---

### 13. **Отсутствие сжатия для API ответов**

**Проблема:** Backend может не отправлять gzip/brotli.

**Решение:** Настроить Nginx на backend для сжатия ответов.

**Приоритет:** Низкий (backend)
**Влияние:** Уменьшение размера ответов на 60-80%

---

## 📊 Метрики для мониторинга

### Core Web Vitals (целевые значения):

- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Bundle размеры:

- **Initial JS:** < 200KB (gzipped)
- **Total JS:** < 500KB (gzipped)
- **CSS:** < 50KB (gzipped)

---

## 🚀 План действий (приоритет)

### Неделя 1 (Критично):

1. ✅ Добавить `React.memo` для `SalonCard`
2. ✅ Разбить `BookingModal` на подкомпоненты
3. ✅ Добавить SSR для страницы салонов
4. ✅ Увеличить `staleTime` для React Query

### Неделя 2 (Важно):

5. ✅ Добавить debounce в `SalonsClient`
6. ✅ Добавить `priority` для первых изображений
7. ✅ Lazy load `BookingModal`

### Неделя 3 (Опционально):

8. ✅ Виртуализация для длинных списков
9. ✅ Prefetch для ссылок
10. ✅ Service Worker

---

## 🔧 Инструменты для проверки

1. **Lighthouse** (Chrome DevTools) - Core Web Vitals
2. **Bundle Analyzer** - `ANALYZE=true npm run build`
3. **React DevTools Profiler** - анализ ре-рендеров
4. **Next.js Analytics** - мониторинг в production

---

## 📝 Дополнительные рекомендации

1. **Использовать `useTransition`** для неблокирующих обновлений UI
2. **Оптимизировать изображения** - использовать WebP/AVIF везде
3. **CDN для статики** - Supabase Storage уже используется
4. **Database индексы** - проверить на backend
5. **API pagination** - уже реализовано ✅

---

## ✅ Что уже хорошо сделано

1. ✅ Lazy loading для тяжелых компонентов (`salon-info/page.tsx`)
2. ✅ Оптимизация импортов пакетов (`next.config.ts`)
3. ✅ Динамическая загрузка переводов
4. ✅ Использование `next/image` для изображений
5. ✅ Кеширование в React Query
6. ✅ Code splitting через `lazy()` и `Suspense`
7. ✅ Оптимизация изображений (AVIF, WebP)
8. ✅ SWC minification
9. ✅ Compression включена

---

**Дата анализа:** 2025-01-27
**Версия Next.js:** 15.5.7
**Версия React:** 19.1.0
