# Email Troubleshooting Guide

## Проблема: Email для активации аккаунта не приходит

### ✅ Что мы проверили:

- Supabase API работает правильно
- Регистрация проходит успешно
- Confirmation email отправляется (confirmation_sent_at установлен)

### 🔍 Возможные причины:

1. **Email в спаме**
   - Проверьте папку "Спам" или "Junk"
   - Ищите письма от Supabase с темой "Confirm your signup"

2. **Неправильный email адрес**
   - Убедитесь, что email адрес написан правильно
   - Попробуйте другой email адрес (например, Gmail, Yahoo)

3. **Почтовый провайдер блокирует**
   - Некоторые корпоративные email могут блокировать автоматические письма
   - Попробуйте личный email (Gmail, Yahoo, Outlook)

4. **Задержка доставки**
   - Email может приходить с задержкой до 5-10 минут
   - Подождите несколько минут

### 🛠️ Как проверить:

1. **Откройте консоль браузера** (F12 → Console)
2. **Зарегистрируйтесь** с новым email
3. **Проверьте логи** в консоли:
   ```
   Starting registration for: your-email@example.com
   Supabase signup successful: { userId: "...", emailConfirmed: null, confirmationSent: "..." }
   ```

### 📧 Что искать в email:

- **Отправитель**: noreply@mail.app.supabase.io
- **Тема**: "Confirm your signup"
- **Ссылка**: должна вести на `http://localhost:3000/verify?token_hash=...`

### 🔧 Альтернативные решения:

1. **Проверьте настройки Supabase Dashboard:**
   - Перейдите в https://supabase.com/dashboard
   - Выберите ваш проект
   - Authentication → Settings
   - Убедитесь, что "Enable email confirmations" включено

2. **Попробуйте другой email провайдер:**
   - Gmail
   - Yahoo
   - Outlook

3. **Проверьте логи Supabase:**
   - Dashboard → Logs → Auth
   - Ищите ошибки отправки email

### 📞 Если ничего не помогает:

- Попробуйте зарегистрироваться с другим email адресом
- Проверьте настройки Supabase проекта
- Убедитесь, что проект не заблокирован за спам
