# Спецификация: Настройки — тема, язык, валюта

**Дата:** 2026-04-13  
**Статус:** Утверждено

---

## Scope

Три связанных фичи, объединённых одним Pinia store и одной модальной панелью настроек:
1. Светлая/тёмная тема
2. Язык интерфейса (RU / EN)
3. Валюта отображения (RUB, USD, EUR, AED, GBP)

---

## Архитектура

### `src/stores/settings.ts` (Pinia)

```typescript
interface SettingsState {
  theme: 'light' | 'dark'
  locale: 'ru' | 'en'
  currency: 'RUB' | 'USD' | 'EUR' | 'AED' | 'GBP'
}
```

Персистентность через `localStorage` (ключ `flowfinance-settings`). При инициализации читает из localStorage, при изменении — сохраняет.

**Actions:**
- `setTheme(theme)` — меняет тему, применяет/убирает класс `dark` на `document.documentElement`
- `setLocale(locale)` — меняет язык в vue-i18n
- `setCurrency(currency)` — меняет валюту

**Инициализация:** при `app.mount()` вызвать `settings.init()` — восстанавливает настройки из localStorage и применяет тему.

---

### Тема

`tailwind.config` уже использует `darkMode: 'class'` (Tailwind CDN — конфигурировать через `tailwind.config` в index.html или inline script).

Кнопка-переключатель в `AppHeader` рядом с шестерёнкой: иконка солнца (светлая) / луны (тёмная).

---

### i18n — `vue-i18n` v9

**Файлы локалей:**
- `src/i18n/ru.ts` — все строки на русском (дефолт)
- `src/i18n/en.ts` — все строки на английском

**Строки для перевода:**
- Заголовки разделов (Summary, Accounts, Budget Progress, Cash Flow Forecast)
- Кнопки (Add Transaction, Add Recurring, Create Loan)
- Лейблы форм (Name, Amount, Category, Account, Date, Rate, Term...)
- Сообщения (No transactions for this day, Select a day to see details)
- Названия месяцев (через `Intl.DateTimeFormat` с locale — не хардкод)
- Таб-названия (Transactions, Budget Impact)
- Метки фильтра (Actual, Plan, Combined)

Подключение в `main.ts`: `app.use(i18n)`

---

### Валюта — `src/composables/useCurrency.ts`

```typescript
const CURRENCY_CONFIG = {
  RUB: { locale: 'ru-RU', currency: 'RUB' },
  USD: { locale: 'en-US', currency: 'USD' },
  EUR: { locale: 'de-DE', currency: 'EUR' },
  AED: { locale: 'ar-AE', currency: 'AED' },
  GBP: { locale: 'en-GB', currency: 'GBP' },
}

export function useCurrency() {
  const settings = useSettingsStore()
  
  function format(amount: number): string {
    const config = CURRENCY_CONFIG[settings.currency]
    return new Intl.NumberFormat(config.locale, {
      style: 'currency',
      currency: config.currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }
  
  return { format }
}
```

Все компоненты используют `useCurrency()` вместо хардкоженного `Intl.NumberFormat`.

---

### Модалка настроек `src/components/SettingsModal.vue`

Открывается по клику на шестерёнку в `AppHeader`. Содержит:
- Секция "Appearance": переключатель темы (Light / Dark)
- Секция "Language": кнопки RU / EN
- Секция "Currency": кнопки RUB / USD / EUR / AED / GBP

Реализация: `v-if="isOpen"` в `App.vue`, управление через emit или settings store.

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/stores/settings.ts` | Создать |
| `src/i18n/ru.ts` | Создать |
| `src/i18n/en.ts` | Создать |
| `src/i18n/index.ts` | Создать (настройка vue-i18n) |
| `src/composables/useCurrency.ts` | Создать |
| `src/components/SettingsModal.vue` | Создать |
| `src/components/icons/SunIcon.vue` | Создать |
| `src/components/icons/MoonIcon.vue` | Создать |
| `src/components/AppHeader.vue` | Изменить (добавить theme toggle + открытие настроек) |
| `src/components/LeftSidebar.vue` | Изменить (useCurrency, $t) |
| `src/components/RightSidebar.vue` | Изменить (useCurrency, $t) |
| `src/components/MainCalendar.vue` | Изменить (useCurrency, $t) |
| `src/components/AnalyticsPanel.vue` | Изменить (useCurrency) |
| `src/App.vue` | Изменить (добавить SettingsModal) |
| `src/main.ts` | Изменить (подключить i18n, settings.init()) |
| `package.json` | Изменить (добавить vue-i18n) |

---

## Критерии готовности

- [ ] Переключатель темы в хедере работает, сохраняется после перезагрузки
- [ ] Переключатель языка в настройках меняет все UI-строки
- [ ] Переключатель валюты меняет форматирование всех сумм
- [ ] Настройки сохраняются в localStorage
- [ ] Нет хардкоженных строк в компонентах (всё через `$t`)
- [ ] Нет хардкоженных `Intl.NumberFormat` в компонентах (всё через `useCurrency`)
