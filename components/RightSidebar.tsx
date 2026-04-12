
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Transaction, Category } from '../types';
import { classNames, getMonthName } from '../utils/helpers';

interface RightSidebarProps {
  selectedDate: Date | null;
  transactionsForDay: Transaction[];
  categories: Category[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const RightSidebar: React.FC<RightSidebarProps> = ({ selectedDate, transactionsForDay, categories }) => {
  const [activeTab, setActiveTab] = useState<'transactions' | 'budget'>('transactions');

  if (!selectedDate) {
    return (
      <aside className="w-[350px] fixed top-16 right-0 h-[calc(100vh-4rem)] p-4 flex items-center justify-center">
          <Card className="text-center text-gray-500 dark:text-gray-400">
              Select a day to see details.
          </Card>
      </aside>
    );
  }
  
  const getCategory = (id: string) => categories.find(c => c.id === id);

  return (
    <aside className="w-[350px] fixed top-16 right-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
      <Card>
        <h2 className="font-bold text-xl mb-4 text-gray-800 dark:text-gray-100">
          {getMonthName(selectedDate.getMonth())} {selectedDate.getDate()}, {selectedDate.getFullYear()}
        </h2>
        
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
            <button onClick={() => setActiveTab('transactions')} className={classNames("py-2 px-4 text-sm font-medium", activeTab === 'transactions' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>Transactions</button>
            <button onClick={() => setActiveTab('budget')} className={classNames("py-2 px-4 text-sm font-medium", activeTab === 'budget' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300')}>Budget Impact</button>
        </div>

        {activeTab === 'transactions' && (
          <div>
            {transactionsForDay.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No transactions for this day.</p>
            ) : (
                <ul className="space-y-3">
                {transactionsForDay.map(t => {
                    const category = getCategory(t.categoryId);
                    const isIncome = t.amount > 0;
                    return (
                        <li key={t.id} className="flex items-center">
                            <div className={`w-2 h-2 rounded-full mr-3 ${category?.color}`}></div>
                            <div className="flex-1">
                                <p className="font-medium text-gray-800 dark:text-gray-100">{t.description}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">{category?.name} {t.type === 'planned' && '(Planned)'}</p>
                            </div>
                            <span className={`font-mono font-semibold ${isIncome ? 'text-green-500' : 'text-gray-700 dark:text-gray-200'}`}>
                                {isIncome && '+'}{currencyFormatter.format(t.amount)}
                            </span>
                        </li>
                    )
                })}
                </ul>
            )}
          </div>
        )}

        {activeTab === 'budget' && (
             <div className="text-sm text-gray-500 dark:text-gray-400">
                <p>Budget impact analysis for this day will be shown here.</p>
             </div>
        )}
      </Card>
    </aside>
  );
};
