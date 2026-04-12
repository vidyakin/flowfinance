
import React, { useState, useMemo } from 'react';
import { Header } from './components/Header';
import { LeftSidebar } from './components/LeftSidebar';
import { MainCalendar } from './components/MainCalendar';
import { RightSidebar } from './components/RightSidebar';
import { AnalyticsPanel } from './components/AnalyticsPanel';
import { Transaction } from './types';
import { ACCOUNTS, CATEGORIES, BUDGETS, TRANSACTIONS } from './data/mockData';
import { isSameDay } from './utils/helpers';

function App() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [transactions, setTransactions] = useState<Transaction[]>(TRANSACTIONS);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const handleDateSelect = (date: Date) => {
    setSelectedDate(date);
  };
  
  const handleTransactionUpdate = (updatedTransaction: Transaction) => {
      setTransactions(prev => prev.map(t => t.id === updatedTransaction.id ? updatedTransaction : t));
  };

  const transactionsForSelectedDay = useMemo(() => {
    if (!selectedDate) return [];
    return transactions.filter(t => isSameDay(t.date, selectedDate)).sort((a,b) => a.amount - b.amount);
  }, [selectedDate, transactions]);

  return (
    <div className="h-screen w-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      <Header 
        currentDate={currentDate}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
      />
      <div className="flex flex-1 pt-16">
        <LeftSidebar
          accounts={ACCOUNTS}
          categories={CATEGORIES}
          budgets={BUDGETS}
          transactions={transactions}
        />
        <div className="flex-1 ml-[300px] mr-[350px] overflow-hidden">
          <MainCalendar
            currentDate={currentDate}
            transactions={transactions}
            accounts={ACCOUNTS}
            categories={CATEGORIES}
            onDateSelect={handleDateSelect}
            onTransactionUpdate={handleTransactionUpdate}
          />
        </div>
        <RightSidebar 
          selectedDate={selectedDate}
          transactionsForDay={transactionsForSelectedDay}
          categories={CATEGORIES}
        />
        <AnalyticsPanel 
            transactions={transactions}
            accounts={ACCOUNTS}
            currentDate={currentDate}
        />
      </div>
    </div>
  );
}

export default App;
