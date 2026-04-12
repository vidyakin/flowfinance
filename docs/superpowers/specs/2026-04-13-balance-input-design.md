# Спецификация: Ввод фактического остатка на дату

**Дата:** 2026-04-13  
**Статус:** Утверждено

---

## Scope

Пользователь может ввести фактический остаток на любую дату. Система вычисляет расхождение с прогнозируемым остатком и создаёт транзакцию-корректировку типа `actual`.

---

## Логика

```
adjustment = введённый_остаток - projected_balance_for_date
```

- Если `adjustment > 0` → приход (например нашли незаучтённый доход)
- Если `adjustment < 0` → расход (например незаучтённые траты)
- Если `adjustment == 0` → ничего не создаётся

Создаётся транзакция:
```typescript
{
  id: uuid(),
  date: selectedDate,
  description: 'Balance Adjustment',  // или локализованная строка
  amount: adjustment,
  type: 'actual',
  categoryId: 'cat-adjustment',  // специальная системная категория
  accountId: defaultAccountId,   // первый счёт в списке
}
```

---

## Специальная категория "Balance Adjustment"

Добавляется в `CATEGORIES` в `mockData.ts`:
```typescript
{ id: 'cat-adjustment', name: 'Balance Adjustment', type: adjustment > 0 ? 'income' : 'expense', color: 'bg-gray-400' }
```

Так как тип зависит от суммы, категория хранится с нейтральным типом `'income'` — при отображении сумма сама показывает знак.

---

## UI

### Кнопка в RightSidebar

В правой панели (когда выбрана дата) — кнопка "Set Actual Balance" под списком транзакций.

### Модалка `BalanceInputModal.vue`

```
┌─────────────────────────────────┐
│  Set Actual Balance             │
│  Date: April 13, 2026           │
│                                 │
│  Projected balance: $42,750     │
│  Actual balance: [__________]   │
│                                 │
│  Adjustment: +$1,250  ✓         │
│         (shown live as user types)
│                                 │
│  [Cancel]  [Save]               │
└─────────────────────────────────┘
```

- При вводе суммы показывается adjustment в реальном времени
- Adjustment зелёный если положительный, красный если отрицательный
- Если adjustment = 0, кнопка Save неактивна

---

## Файлы

| Файл | Действие |
|------|----------|
| `src/data/mockData.ts` | Добавить категорию `cat-adjustment` |
| `src/stores/finance.ts` | Добавить action `addBalanceAdjustment(date, actualBalance)` |
| `src/components/BalanceInputModal.vue` | Создать |
| `src/components/RightSidebar.vue` | Изменить (добавить кнопку + открытие модалки) |

---

## Критерии готовности

- [ ] Кнопка "Set Actual Balance" видна в RightSidebar для любого дня
- [ ] Модалка показывает прогнозируемый баланс и поле ввода
- [ ] Adjustment вычисляется и отображается в реальном времени
- [ ] При Save создаётся транзакция-корректировка
- [ ] Новая транзакция видна в списке транзакций дня
- [ ] Прогноз баланса пересчитывается
- [ ] Если adjustment = 0, кнопка Save заблокирована
