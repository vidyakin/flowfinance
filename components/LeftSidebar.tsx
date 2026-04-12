
import React from 'react';
import { Card } from './ui/Card';
import { ProgressBar } from './ui/ProgressBar';
import { Account, Budget, Category, Transaction } from '../types';
import { TrendingUpIcon } from './icons/TrendingUpIcon';
import { PlusIcon } from './icons/PlusIcon';

interface LeftSidebarProps {
  accounts: Account[];
  categories: Category[];
  budgets: Budget[];
  transactions: Transaction[];
}

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export const LeftSidebar: React.FC<LeftSidebarProps> = ({ accounts, categories, budgets, transactions }) => {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  const thisMonthTransactions = transactions.filter(t => 
    t.date.getMonth() === new Date().getMonth() &&
    t.date.getFullYear() === new Date().getFullYear()
  );

  const monthlyIncome = thisMonthTransactions.filter(t => t.amount > 0).reduce((sum, t) => sum + t.amount, 0);
  const monthlyExpenses = thisMonthTransactions.filter(t => t.amount < 0).reduce((sum, t) => sum + t.amount, 0);
  
  const plannedCommitments = transactions
    .filter(t => t.type === 'planned' && t.date > new Date())
    .reduce((sum, t) => sum + t.amount, 0);
    
  const availableFunds = totalBalance + plannedCommitments;
    
  return (
    <aside className="w-[300px] fixed top-16 left-0 h-[calc(100vh-4rem)] p-4 space-y-4 overflow-y-auto">
      <Card>
        <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Summary</h2>
        <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
          <div className="flex justify-between">
            <span>Total Balance:</span>
            <span className="font-mono font-semibold text-gray-800 dark:text-gray-100">{currencyFormatter.format(totalBalance)}</span>
          </div>
          <div className="flex justify-between">
            <span>Monthly Income:</span>
            <span className="font-mono text-green-500">+{currencyFormatter.format(monthlyIncome)}</span>
          </div>
          <div className="flex justify-between">
            <span>Monthly Expenses:</span>
            <span className="font-mono text-red-500">{currencyFormatter.format(monthlyExpenses)}</span>
          </div>
          <div className="flex justify-between pt-2 border-t border-gray-200 dark:border-gray-700">
            <span className="font-semibold">Available Funds:</span>
            <span className="font-mono font-bold text-blue-500">{currencyFormatter.format(availableFunds)}</span>
          </div>
        </div>
        <div className="flex items-center text-xs text-green-600 mt-2">
            <TrendingUpIcon className="w-4 h-4 mr-1"/>
            <span>+5.2% vs last month</span>
        </div>
      </Card>
      
      <Card>
        <div className="flex justify-between items-center mb-2">
            <h2 className="font-bold text-lg text-gray-800 dark:text-gray-100">Accounts</h2>
            <button className="text-blue-500 hover:text-blue-600"><PlusIcon className="w-5 h-5"/></button>
        </div>
        <ul className="space-y-2 text-sm">
          {accounts.map(acc => (
            <li key={acc.id} className="flex justify-between text-gray-600 dark:text-gray-300">
              <span>{acc.name}</span>
              <span className="font-mono">{currencyFormatter.format(acc.balance)}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Budget Progress</h2>
        <div className="space-y-4">
          {budgets.map(budget => {
            const category = categories.find(c => c.id === budget.categoryId);
            if (!category) return null;
            const spent = Math.abs(thisMonthTransactions
                .filter(t => t.categoryId === budget.categoryId && t.type === 'actual')
                .reduce((sum, t) => sum + t.amount, 0));
            const isOverBudget = spent > budget.amount;
            return (
              <div key={budget.categoryId} className="text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-600 dark:text-gray-300">{category.name}</span>
                  <span className={`font-mono text-xs ${isOverBudget ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'}`}>
                    {isOverBudget && '⚠️ '}{currencyFormatter.format(spent)} / {currencyFormatter.format(budget.amount)}
                  </span>
                </div>
                <ProgressBar value={spent} max={budget.amount} />
              </div>
            );
          })}
        </div>
      </Card>
    </aside>
  );
};
