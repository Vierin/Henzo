# Финальная оптимизированная структура переводов

## Структура папок

```
locales/
├── {locale}/                    # en, ru, vi
│   ├── core/                   # Базовые модули (всегда загружаются)
│   │   ├── common.json         # Общие строки (loading, error, save, cancel...)
│   │   ├── meta.json           # Метаданные для SEO
│   │   ├── navigation.json     # Навигационные элементы
│   │   ├── weekdays.json       # Дни недели
│   │   └── months.json         # Месяцы
│   │
│   ├── ui/                     # Глобальные UI компоненты (на всех страницах)
│   │   ├── header.json         # Хедер
│   │   ├── footer.json         # Футер
│   │   └── cookieBanner.json   # Баннер cookies
│   │
│   ├── shared/                 # Общие функциональные модули
│   │   ├── forms.json          # Валидация форм (используется везде)
│   │   ├── auth.json           # Аутентификация (public + owner)
│   │   └── emptyStates.json    # Пустые состояния (используется везде)
│   │
│   ├── public/                 # Публичные страницы
│   │   ├── homepage.json       # Главная страница
│   │   ├── salon.json          # Страница салона
│   │   ├── booking.json        # Бронирование
│   │   ├── categories.json    # Категории
│   │   ├── map.json            # Карта
│   │   ├── business.json       # Страница для бизнеса
│   │   ├── contact.json        # Контакты
│   │   └── about.json          # О нас
│   │
│   ├── owner/                  # Панель владельца
│   │   ├── dashboard.json      # Дашборд
│   │   ├── salonInfo.json      # Информация о салоне
│   │   ├── services.json       # Услуги
│   │   ├── staff.json          # Персонал
│   │   ├── calendar.json        # Календарь
│   │   ├── marketing.json      # Маркетинг
│   │   ├── staffNew.json       # Добавление сотрудника
│   │   ├── servicesNew.json    # Добавление услуги
│   │   └── feedback.json       # Обратная связь
│   │
│   └── client/                 # Клиентские модули
│       └── settings.json       # Настройки клиента
```

## Преимущества структуры

1. **Логическая группировка** - модули сгруппированы по типу использования
2. **Масштабируемость** - легко добавлять новые модули в нужную категорию
3. **Производительность** - ленивая загрузка только нужных модулей
4. **Поддерживаемость** - понятно, где что находится
5. **Зависимости** - четко определены зависимости между модулями

## Использование

### Базовые модули (загружаются всегда)

```typescript
// Автоматически загружаются в useTranslations()
const t = useTranslation();
t.core.common.loading; // "Loading..."
t.ui.header.profile; // "Profile"
```

### Загрузка специфичных модулей

```typescript
// Для публичных страниц
const { dictionary } = useModuleTranslations([
	'public/homepage',
	'public/salon',
]);

// Для owner панели
const { dictionary } = useModuleTranslations(['owner/dashboard']);
```

## Зависимости модулей

- `core/*` - независимые базовые модули
- `ui/*` → зависит от `core/common`, `core/navigation`
- `shared/*` → зависит от `core/common`
- `public/*` → зависит от `core/*`, `ui/*`, `shared/*`
- `owner/*` → зависит от `core/*`, `shared/*`
- `client/*` → зависит от `core/*`, `shared/*`
