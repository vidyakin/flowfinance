
import { Account, Category, Budget, Transaction } from '../types';

export const ACCOUNTS: Account[] = [
  { id: 'acc1', name: 'Checking', type: 'checking', balance: 15250 },
  { id: 'acc2', name: 'Savings', type: 'savings', balance: 30000 },
  { id: 'acc3', name: 'Credit Card', type: 'credit', balance: -2500 },
];

export const CATEGORIES: Category[] = [
  { id: 'cat1', name: 'Salary', type: 'income', color: 'bg-green-500' },
  { id: 'cat2', name: 'Freelance', type: 'income', color: 'bg-emerald-500' },
  { id: 'cat3', name: 'Food', type: 'expense', color: 'bg-yellow-500' },
  { id: 'cat4', name: 'Transport', type: 'expense', color: 'bg-blue-500' },
  { id: 'cat5', name: 'Entertainment', type: 'expense', color: 'bg-purple-500' },
  { id: 'cat6', name: 'Loans', type: 'expense', color: 'bg-red-500' },
  { id: 'cat7', name: 'Shopping', type: 'expense', color: 'bg-pink-500' },
];

export const BUDGETS: Budget[] = [
  { categoryId: 'cat3', amount: 1200 },
  { categoryId: 'cat4', amount: 400 },
  { categoryId: 'cat5', amount: 800 },
  { categoryId: 'cat7', amount: 1000 },
];

const today = new Date();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

export const TRANSACTIONS: Transaction[] = [
  // Past Actual Transactions
  { id: 't1', date: new Date(currentYear, currentMonth, 2), description: 'Groceries', amount: -150, type: 'actual', categoryId: 'cat3', accountId: 'acc1' },
  { id: 't2', date: new Date(currentYear, currentMonth, 3), description: 'Gas', amount: -50, type: 'actual', categoryId: 'cat4', accountId: 'acc1' },
  { id: 't3', date: new Date(currentYear, currentMonth, 5), description: 'Movie Night', amount: -75, type: 'actual', categoryId: 'cat5', accountId: 'acc3' },
  { id: 't4', date: new Date(currentYear, currentMonth, 1), description: 'Salary', amount: 4000, type: 'actual', categoryId: 'cat1', accountId: 'acc1' },
  
  // Future Planned Transactions
  { id: 't5', date: new Date(currentYear, currentMonth, 15), description: 'Paycheck', amount: 4000, type: 'planned', categoryId: 'cat1', accountId: 'acc1' },
  { id: 't6', date: new Date(currentYear, currentMonth, 20), description: 'Freelance Project', amount: 1500, type: 'planned', categoryId: 'cat2', accountId: 'acc1' },
  { id: 't7', date: new Date(currentYear, currentMonth, 25), description: 'Rent', amount: -2000, type: 'planned', categoryId: 'cat6', accountId: 'acc1' },
  { id: 't8', date: new Date(currentYear, currentMonth, 28), description: 'Car Payment', amount: -450, type: 'planned', categoryId: 'cat6', accountId: 'acc1' },
  { id: 't9', date: new Date(currentYear, currentMonth, 18), description: 'New Gadget', amount: -1200, type: 'planned', categoryId: 'cat7', accountId: 'acc3' },
  
  // Potential problem transaction
  { id: 't10', date: new Date(currentYear, currentMonth, 19), description: 'Vacation Deposit', amount: -3500, type: 'planned', categoryId: 'cat5', accountId: 'acc1' },

  // Next Month
  { id: 't11', date: new Date(currentYear, currentMonth + 1, 1), description: 'Salary', amount: 4000, type: 'planned', categoryId: 'cat1', accountId: 'acc1' },
];
