# Модульная система переводов i18n

## Обзор

Система переводов разделена на модули для оптимизации производительности и удобства поддержки. Каждый модуль загружается динамически только когда он нужен.

## Структура модулей

```
locales/
├── en/
│   ├── common.json          # Общие слова (save, cancel, etc.)
│   ├── meta.json            # Метаданные
│   ├── navigation.json      # Навигация
│   ├── weekdays.json        # Дни недели
│   ├── months.json          # Месяцы
│   ├── homepage.json        # Главная страница
│   ├── salon.json           # Страница салона
│   ├── booking.json         # Бронирование
│   ├── auth.json            # Авторизация
│   ├── categories.json      # Категории
│   ├── header.json          # Хедер
│   ├── footer.json          # Футер
│   ├── forms.json           # Формы и валидация
│   ├── business.json        # Публичная страница бизнеса
│   ├── contact.json         # Контакты
│   ├── feedback.json        # Обратная связь
│   ├── about.json           # О нас
│   ├── owner/               # Модули панели владельца
│   │   ├── dashboard.json
│   │   ├── salonInfo.json
│   │   ├── services.json
│   │   ├── staff.json
│   │   ├── calendar.json
│   │   ├── marketing.json
│   │   ├── staffNew.json
│   │   └── servicesNew.json
│   └── clientSettings.json  # Настройки клиента
├── ru/ (та же структура)
└── vi/ (та же структура)
```

## Использование

### Базовое использование (загружает только базовые модули)

```typescript
import { useTranslation } from '@/contexts/LanguageContext';

function MyComponent() {
  const t = useTranslation();
  
  // Использование как функция
  return <div>{t('common.save')}</div>;
  
  // Использование как объект
  return <div>{t.common.save}</div>;
}
```

### Загрузка конкретных модулей

```typescript
import { useTranslations } from '@/i18n/useTranslations';
import type { TranslationModule } from '@/i18n/modules';

function OwnerDashboard() {
  // Загружаем только нужные модули
  const t = useTranslations(['owner/dashboard', 'owner/services']);
  
  return <div>{t.owner.dashboard.title}</div>;
}
```

### Для серверных компонентов

```typescript
import { getDictionary } from '@/i18n/dictionaries';
import type { TranslationModule } from '@/i18n/modules';

export default async function ServerComponent({ params }: { params: { locale: string } }) {
  const t = await getDictionary(params.locale as Locale, ['homepage', 'salon']);
  
  return <div>{t.homepage.heroTitle}</div>;
}
```

## Разделение существующих файлов

Для разделения больших JSON файлов на модули используйте скрипт:

```bash
node apps/frontend/scripts/split-translations.js en
node apps/frontend/scripts/split-translations.js ru
node apps/frontend/scripts/split-translations.js vi
```

Скрипт автоматически:
1. Читает исходный файл `locales/{locale}.json`
2. Разделяет его на модули согласно `MODULE_MAP`
3. Создает файлы в `locales/{locale}/`
4. Обрабатывает вложенные модули (например, `owner/dashboard`)

## Добавление нового модуля

1. Создайте файл модуля в `locales/{locale}/{moduleName}.json`
2. Добавьте модуль в тип `TranslationModule` в `modules.ts`
3. Добавьте зависимости в `moduleDependencies` если нужно
4. Обновите `MODULE_MAP` в `split-translations.js` для автоматического разделения

## Зависимости модулей

Модули могут зависеть от других модулей. Например, `owner/dashboard` зависит от `owner` и `common`. Зависимости загружаются автоматически.

## Кэширование

Модули кэшируются после первой загрузки для оптимизации производительности. Кэш можно очистить вызовом `clearModuleCache()`.

## Миграция существующего кода

Большинство существующего кода будет работать без изменений, так как `LanguageContext` загружает базовые модули по умолчанию. Для оптимизации производительности можно добавить явную загрузку модулей в компонентах, которые используют специфичные переводы.

