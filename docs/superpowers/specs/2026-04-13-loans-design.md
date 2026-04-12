# Спецификация: Кредиты с аннуитетным графиком платежей

**Дата:** 2026-04-13  
**Статус:** Утверждено

---

## Scope

Создание кредита с расчётом полного аннуитетного графика платежей. Каждый платёж генерируется как `planned` транзакция в kalendаре.

---

## Новая сущность `Loan`

```typescript
export interface Loan {
  id: string
  name: string              // например "Ипотека", "Автокредит"
  principal: number         // сумма долга
  annualRate: number        // % годовых (например 12.5)
  startDate: Date           // дата первого платежа
  termMonths: number        // срок в месяцах
  accountId: string         // счёт для списания
  categoryId: string        // категория (дефолт: 'cat6' = Loans)
}
```

---

## Расчёт аннуитетного платежа

```typescript
function calculateAnnuityPayment(principal: number, annualRate: number, termMonths: number): number {
  const r = annualRate / 100 / 12  // месячная ставка
  if (r === 0) return principal / termMonths
  return principal * (r * Math.pow(1 + r, termMonths)) / (Math.pow(1 + r, termMonths) - 1)
}
```

Ежемесячный платёж фиксированный. Последний платёж может отличаться на несколько копеек (округление) — округляем через `Math.round`.

---

## Генерация транзакций

При создании кредита (`addLoan`) в store:
1. Рассчитывается `monthlyPayment`
2. Создаются `termMonths` транзакций с датами: `startDate + n месяцев` для n = 0..termMonths-1
3. Транзакции имеют id = `loan-{loan.id}-{n}`, amount = `-monthlyPayment`, type = `planned`
4. Транзакции добавляются в `transactions` store

При удалении кредита — транзакции с prefix `loan-{id}-` удаляются.

---

## Дополнительная информация в модалке просмотра

Отображается:
- Ежемесячный платёж
- Сумма переплаты = `monthlyPayment × termMonths - principal`
- Итоговая сумма выплат = `monthlyPayment × termMonths`
- Дата последнего платежа

---

## UI

### Кнопка создания

В `LeftSidebar.vue` — новая карточка "Loans" с кнопкой "Add Loan".

### Модалка `LoanModal.vue` (создание/просмотр)

**Режим создания:**
```
┌─────────────────────────────────┐
│  New Loan                       │
│                                 │
│  Name:        [_____________]   │
│  Principal:   [_____________]   │
│  Annual Rate: [____] %          │
│  Term:        [____] months     │
│  First Payment: [date picker]   │
│  Account:     [select]          │
│                                 │
│  ── Preview ──────────────────  │
│  Monthly payment: $1,234        │
│  Total payments:  $44,424       │
│  Overpayment:     $4,424        │
│  Last payment:    Apr 2028      │
│                                 │
│  [Cancel]  [Create Loan]        │
└─────────────────────────────────┘
```

Preview обновляется в реальном времени при изменении полей.

**Режим просмотра:** та же информация + список всех платежей (дата, сумма, статус actual/planned).

### Список кредитов в LeftSidebar

Каждый кредит: название, ежемесячный платёж, прогресс бар (оплачено / всего).

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/types/index.ts` | Добавить `Loan` |
| `src/utils/loans.ts` | Создать — `calculateAnnuityPayment`, `generateLoanTransactions` |
| `src/stores/finance.ts` | Добавить loans ref, addLoan, removeLoan |
| `src/components/LoanModal.vue` | Создать |
| `src/components/LeftSidebar.vue` | Изменить (карточка Loans) |

---

## Критерии готовности

- [ ] Создание кредита через модалку
- [ ] Preview в модалке обновляется в реальном времени
- [ ] При создании генерируются все транзакции в calendаре
- [ ] Транзакции правильно распределены по датам
- [ ] Сумма аннуитета рассчитана верно
- [ ] Кредит можно удалить — все транзакции исчезают
- [ ] Список кредитов в левой панели
