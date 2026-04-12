
import React from 'react';
import { ChevronLeftIcon } from './icons/ChevronLeftIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { UserIcon } from './icons/UserIcon';
import { SettingsIcon } from './icons/SettingsIcon';
import { getMonthName } from '../utils/helpers';

interface HeaderProps {
  currentDate: Date;
  onPrevMonth: () => void;
  onNextMonth: () => void;
}

export const Header: React.FC<HeaderProps> = ({ currentDate, onPrevMonth, onNextMonth }) => {
  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white/50 dark:bg-gray-800/50 backdrop-blur-xl border-b border-gray-200 dark:border-gray-700 z-10 flex items-center px-6">
      <div className="flex items-center space-x-3 w-1/4">
        <div className="w-8 h-8 bg-blue-500 rounded-lg"></div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white">FlowFinance</h1>
      </div>

      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center space-x-2 bg-gray-200/50 dark:bg-gray-700/50 p-1 rounded-lg">
          <button onClick={onPrevMonth} className="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors">
            <ChevronLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <span className="font-semibold text-gray-700 dark:text-gray-200 w-32 text-center">
            {getMonthName(currentDate.getMonth())} {currentDate.getFullYear()}
          </span>
          <button onClick={onNextMonth} className="p-1 rounded-md hover:bg-gray-300/50 dark:hover:bg-gray-600/50 transition-colors">
            <ChevronRightIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      </div>

      <div className="w-1/4 flex items-center justify-end space-x-4">
        <button className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors">
          <SettingsIcon className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <button className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                <UserIcon className="w-5 h-5 text-gray-600" />
            </div>
        </button>
      </div>
    </header>
  );
};
