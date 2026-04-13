# Спецификация: Расширенные функции кредитов

**Дата:** 2026-04-13  
**Статус:** Утверждено

---

## Scope

Два расширения модуля кредитов:
1. Ввод текущего остатка — для кредитов, которые уже частично выплачены
2. Досрочные платежи с пересчётом графика (уменьшение срока или платежа — выбор пользователя)

---

## Изменения в типах (`src/types/index.ts`)

```typescript
export interface EarlyPayment {
  id: string
  date: Date
  amount: number
  mode: 'reduce_term' | 'reduce_payment'
}

export interface Loan {
  id: string
  name: string
  principal: number
  annualRate: number
  startDate: Date
  termMonths: number
  accountId: string
  categoryId: string
  // Новые поля:
  currentBalance?: {
    date: Date
    balance: number
  }
  earlyPayments: EarlyPayment[]
}
```

---

## Логика пересчёта (`src/utils/loans.ts`)

### Функция `generateLoanTransactions(loan: Loan): Transaction[]`

Алгоритм с учётом текущего остатка и досрочных платежей:

1. **Определить стартовую точку:**
   - Если `loan.currentBalance` задан → `startDate = currentBalance.date`, `principal = currentBalance.balance`
   - Иначе → `startDate = loan.startDate`, `principal = loan.principal`

2. **Рассчитать базовый аннуитетный платёж** от стартовой точки

3. **Применить досрочные платежи** (отсортированные по дате):
   - Для каждого досрочного платежа:
     - Найти оставшийся долг на дату платежа (по текущему графику)
     - Вычесть сумму досрочного платежа из остатка
     - Если `mode === 'reduce_term'`: пересчитать количество оставшихся платежей при том же ежемесячном платеже
     - Если `mode === 'reduce_payment'`: пересчитать ежемесячный платёж при том же оставшемся сроке
     - Продолжить генерацию транзакций с новыми параметрами

4. **Создать транзакции:**
   - Обычные платежи: id = `loan-{loan.id}-{n}`, type = `planned`, amount = `-monthlyPayment`
   - Досрочные платежи: id = `loan-{loan.id}-early-{earlyPayment.id}`, type = `actual`, amount = `-earlyPayment.amount`

### Вспомогательная функция `getRemainingBalance(loan, upToDate): number`

Вычисляет остаток долга на заданную дату с учётом выплаченных платежей (по стандартной формуле амортизации).

---

## Изменения в store (`src/stores/finance.ts`)

```typescript
// Обновить addLoan — инициализировать earlyPayments: []
function addLoan(loanData: Omit<Loan, 'id' | 'earlyPayments'>): void

// Новый action
function addEarlyPayment(loanId: string, payment: Omit<EarlyPayment, 'id'>): void {
  // 1. Найти кредит
  // 2. Добавить платёж в loan.earlyPayments
  // 3. Удалить все транзакции loan-{loanId}-*
  // 4. Пересчитать и добавить новые транзакции
}

// Новый action
function setLoanCurrentBalance(loanId: string, date: Date, balance: number): void {
  // 1. Обновить loan.currentBalance
  // 2. Удалить все транзакции loan-{loanId}-*
  // 3. Пересчитать и добавить новые транзакции
}
```

---

## UI

### LoanModal.vue — изменения

**Режим создания** — добавить секцию "Уже выплачиваю":

```
┌─────────────────────────────────────┐
│  New Loan                           │
│                                     │
│  ○ Новый кредит                     │
│  ● Уже выплачиваю                   │
│                                     │
│  [при выборе "Уже выплачиваю":]     │
│  Текущий остаток: [___________]     │
│  По состоянию на: [date picker]     │
│                                     │
│  (остальные поля те же)             │
└─────────────────────────────────────┘
```

При выборе "Уже выплачиваю" поле `principal` скрывается (не нужно), вместо него — `currentBalance.balance` и `currentBalance.date`. Ставка и срок остаются — нужны для расчёта оставшихся платежей.

**Режим просмотра кредита** — добавить кнопку "Досрочный платёж".

### EarlyPaymentModal.vue — новый компонент

```
┌─────────────────────────────────────┐
│  Досрочный платёж                   │
│  Кредит: Ипотека                    │
│                                     │
│  Сумма:  [___________]              │
│  Дата:   [date picker]              │
│                                     │
│  Что пересчитать?                   │
│  ○ Сократить срок                   │
│    (платёж останется $1,234/мес)    │
│  ○ Уменьшить платёж                 │
│    (срок останется 24 мес)         │
│                                     │
│  ── После платежа ───────────────   │
│  Остаток долга:  $45,000            │
│  Новый платёж:   $1,234 / $1,100   │
│  Новый срок:     18 мес / 24 мес   │
│                                     │
│  [Отмена]  [Добавить платёж]        │
└─────────────────────────────────────┘
```

Preview обновляется в реальном времени.

### LeftSidebar.vue — изменения

В списке кредитов добавить кнопку "Досрочный платёж" рядом с каждым кредитом.

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/types/index.ts` | Добавить `EarlyPayment`, обновить `Loan` |
| `src/utils/loans.ts` | Переписать `generateLoanTransactions`, добавить `getRemainingBalance` |
| `src/stores/finance.ts` | Обновить `addLoan`, добавить `addEarlyPayment`, `setLoanCurrentBalance` |
| `src/components/LoanModal.vue` | Добавить режим "Уже выплачиваю" + кнопку досрочного платежа |
| `src/components/EarlyPaymentModal.vue` | Создать |
| `src/components/LeftSidebar.vue` | Добавить кнопку досрочного платежа у каждого кредита |

---

## Критерии готовности

- [ ] При создании кредита с остатком — график стартует с указанной даты и суммы
- [ ] Досрочный платёж с reduce_term: ежемесячный платёж не меняется, срок сокращается
- [ ] Досрочный платёж с reduce_payment: срок не меняется, платёж уменьшается
- [ ] Preview в EarlyPaymentModal обновляется в реальном времени
- [ ] После добавления досрочного платежа транзакции пересчитываются немедленно
- [ ] Несколько досрочных платежей работают корректно (каждый пересчёт учитывает предыдущие)
- [ ] npx vue-tsc --noEmit без ошибок
