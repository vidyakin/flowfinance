
import React from 'react';

interface ProgressBarProps {
  value: number;
  max: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, max }) => {
  const percentage = Math.min((value / max) * 100, 100);
  let colorClass = 'bg-green-500';
  if (percentage > 95) {
    colorClass = 'bg-red-500';
  } else if (percentage > 75) {
    colorClass = 'bg-yellow-500';
  }

  return (
    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${colorClass}`}
        style={{ width: `${percentage}%` }}
      ></div>
    </div>
  );
};
