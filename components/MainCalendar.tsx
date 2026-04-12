
import React, { useState } from 'react';
import { Transaction, Account, Category } from '../types';
import { isSameDay, classNames, calculateProjectedBalanceForDate } from '../utils/helpers';
import { PlusIcon } from './icons/PlusIcon';

interface MainCalendarProps {
  currentDate: Date;
  transactions: Transaction[];
  accounts: Account[];
  categories: Category[];
  onDateSelect: (date: Date) => void;
  onTransactionUpdate: (transaction: Transaction) => void;
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 });

const TransactionPill: React.FC<{ transaction: Transaction; category?: Category; onDragStart: (e: React.DragEvent<HTMLDivElement>, transactionId: string) => void; }> = ({ transaction, category, onDragStart }) => {
    const isPlanned = transaction.type === 'planned';
    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, transaction.id)}
            className={classNames(
                'text-xs text-white rounded px-1.5 py-0.5 mb-1 cursor-grab active:cursor-grabbing truncate',
                category?.color || 'bg-gray-400',
                isPlanned ? 'bg-opacity-60 border border-dashed border-white/50' : ''
            )}
        >
            {transaction.description}
        </div>
    );
};

export const MainCalendar: React.FC<MainCalendarProps> = ({ currentDate, transactions, accounts, categories, onDateSelect, onTransactionUpdate }) => {
  const [draggedTransactionId, setDraggedTransactionId] = useState<string | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, transactionId: string) => {
    e.dataTransfer.setData("transactionId", transactionId);
    setDraggedTransactionId(transactionId);
  };
  
  const handleDrop = (e: React.DragEvent<HTMLDivElement>, date: Date) => {
    e.preventDefault();
    const transactionId = e.dataTransfer.getData("transactionId");
    const transactionToMove = transactions.find(t => t.id === transactionId);
    if (transactionToMove) {
      onTransactionUpdate({ ...transactionToMove, date });
    }
    setDraggedTransactionId(null);
  };
  
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };


  const renderCalendarGrid = () => {
    const days = [];
    const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

    // Weekday headers
    for (let i = 0; i < 7; i++) {
        days.push(<div key={`wd-${i}`} className="text-center font-semibold text-xs text-gray-500 dark:text-gray-400 py-2">{weekdays[i]}</div>);
    }
    
    // Blank days for start of month
    for (let i = 0; i < firstDayOfMonth; i++) {
      days.push(<div key={`blank-${i}`} className="border-t border-r border-gray-200 dark:border-gray-700"></div>);
    }
    
    // Month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isToday = isSameDay(date, new Date());
      const transactionsForDay = transactions.filter(t => isSameDay(t.date, date));
      const endOfDayBalance = calculateProjectedBalanceForDate(date, accounts, transactions);

      let balanceClass = 'text-green-600 dark:text-green-400';
      if (endOfDayBalance < 0) {
        balanceClass = 'bg-red-500 text-white rounded px-1';
      } else if (endOfDayBalance < 5000) {
        balanceClass = 'text-yellow-600 dark:text-yellow-400';
      }

      days.push(
        <div 
          key={day}
          className="relative border-t border-r border-gray-200 dark:border-gray-700 p-2 min-h-[120px] flex flex-col transition-colors hover:bg-gray-50 dark:hover:bg-gray-800/50"
          onClick={() => onDateSelect(date)}
          onDrop={(e) => handleDrop(e, date)}
          onDragOver={handleDragOver}
        >
          <div className="flex justify-between items-center">
            <span className={classNames('text-sm font-medium', isToday ? 'bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center' : 'text-gray-700 dark:text-gray-200')}>
              {day}
            </span>
            <span className={`font-mono text-xs font-bold ${balanceClass}`}>{currencyFormatter.format(endOfDayBalance)}</span>
          </div>
          <div className="flex-1 mt-1 space-y-1 overflow-hidden">
            {transactionsForDay.slice(0, 2).map(t => (
                <TransactionPill key={t.id} transaction={t} category={categories.find(c=>c.id === t.categoryId)} onDragStart={handleDragStart}/>
            ))}
            {transactionsForDay.length > 2 && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">+{transactionsForDay.length - 2} more</p>}
          </div>
        </div>
      );
    }
    
    // Adjust last row border
    const gridStyle = { gridTemplateRows: `auto repeat(${Math.ceil((daysInMonth + firstDayOfMonth) / 7)}, minmax(120px, 1fr))` };

    return (
        <div className="grid grid-cols-7 bg-white dark:bg-gray-800 border-l border-b border-gray-200 dark:border-gray-700 rounded-lg shadow-sm" style={gridStyle}>
            {days}
        </div>
    );
  };

  return (
    <main className="flex-1 overflow-y-auto p-4">
      {/* Control Bar */}
      <div className="flex items-center justify-between mb-4">
          <div className="flex items-center bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg text-sm font-medium">
              <button className="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">Actual</button>
              <button className="px-3 py-1 rounded-md text-gray-500 dark:text-gray-400">Plan</button>
              <button className="px-3 py-1 rounded-md bg-white dark:bg-gray-600 text-gray-800 dark:text-white shadow-sm">Combined</button>
          </div>
          <button className="flex items-center bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-blue-600 transition-colors">
              <PlusIcon className="w-5 h-5 mr-1" />
              Add Transaction
          </button>
      </div>
      {renderCalendarGrid()}
    </main>
  );
};
