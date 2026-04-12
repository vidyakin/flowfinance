# Спецификация: Периодические транзакции

**Дата:** 2026-04-13  
**Статус:** Утверждено

---

## Scope

Создание шаблонов повторяющихся доходов (зарплата) и расходов (аренда) с заданной частотой и сроком. При отображении месяца генерирует виртуальные `planned` транзакции.

---

## Новая сущность `RecurringRule`

```typescript
export interface RecurringRule {
  id: string
  name: string
  amount: number           // положительное = доход, отрицательное = расход
  categoryId: string
  accountId: string
  frequency: 'weekly' | 'biweekly' | 'monthly' | 'yearly'
  startDate: Date
  endDate: Date | null     // null = бессрочно
  dayOfMonth?: number      // для monthly: день месяца (1-28), дефолт = день из startDate
}
```

---

## Логика генерации транзакций

Функция `generateOccurrences(rule, from, to): Transaction[]` — генерирует виртуальные транзакции в диапазоне `[from, to]`. Транзакции имеют тип `planned`, id = `recurring-{rule.id}-{YYYY-MM-DD}`.

```typescript
// Частоты:
// weekly    — каждые 7 дней от startDate
// biweekly  — каждые 14 дней от startDate
// monthly   — каждый месяц в dayOfMonth (или день из startDate)
// yearly    — раз в год в тот же месяц и день
```

Вызывается в Pinia store как `computed` при изменении `currentDate` или `recurringRules`.

---

## Pinia store

В `src/stores/finance.ts` добавить:

```typescript
const recurringRules = ref<RecurringRule[]>([])

function addRecurringRule(rule: Omit<RecurringRule, 'id'>) { ... }
function removeRecurringRule(id: string) { ... }
function updateRecurringRule(id: string, changes: Partial<RecurringRule>) { ... }

// Getter — объединяет обычные + виртуальные транзакции для текущего месяца
const allTransactions = computed(() => {
  const start = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth(), 1)
  const end = new Date(currentDate.value.getFullYear(), currentDate.value.getMonth() + 2, 0)
  const virtual = recurringRules.value.flatMap(r => generateOccurrences(r, start, end))
  return [...transactions.value, ...virtual]
})
```

Все компоненты переключаются с `store.transactions` на `store.allTransactions`.

---

## UI

### Кнопка создания

В `MainCalendar.vue` (control bar) рядом с "Add Transaction" — кнопка "Add Recurring" (иконка повтора).

### Модалка `RecurringRuleModal.vue`

Поля:
- Name (text input)
- Amount (number input, + для дохода / - для расхода)
- Category (select из store.categories)
- Account (select из store.accounts)
- Frequency (select: Weekly / Every 2 weeks / Monthly / Yearly)
- Start Date (date picker)
- End Date (date picker, опционально) ИЛИ "Number of occurrences" (number input)

### Список в левой панели

В `LeftSidebar.vue` новая карточка "Recurring" со списком правил и кнопками редактирования/удаления.

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/types/index.ts` | Добавить `RecurringRule` |
| `src/utils/recurring.ts` | Создать — функция `generateOccurrences` |
| `src/stores/finance.ts` | Добавить recurringRules, addRecurringRule, removeRecurringRule, allTransactions getter |
| `src/components/RecurringRuleModal.vue` | Создать |
| `src/components/icons/RepeatIcon.vue` | Создать |
| `src/components/MainCalendar.vue` | Изменить (кнопка, использовать allTransactions) |
| `src/components/LeftSidebar.vue` | Изменить (список правил) |

---

## Критерии готовности

- [ ] Создание правила через модалку
- [ ] Виртуальные транзакции отображаются в календаре с правильными датами
- [ ] Виртуальные транзакции влияют на прогноз баланса
- [ ] Правило можно удалить — транзакции исчезают
- [ ] `endDate` корректно ограничивает генерацию
- [ ] Транзакции `biweekly` появляются каждые 2 недели от startDate
