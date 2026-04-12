
import React from 'react';
import { Card } from './ui/Card';
import { Transaction, Account } from '../types';
import { calculateProjectedBalanceForDate } from '../utils/helpers';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface AnalyticsPanelProps {
  transactions: Transaction[];
  accounts: Account[];
  currentDate: Date;
}

const currencyFormatter = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);

export const AnalyticsPanel: React.FC<AnalyticsPanelProps> = ({ transactions, accounts, currentDate }) => {
    
  const generateChartData = () => {
    const data = [];
    const startDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const endDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 0); // End of next month

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        data.push({
            date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric'}),
            balance: calculateProjectedBalanceForDate(new Date(d), accounts, transactions),
        });
    }
    return data;
  }

  const chartData = generateChartData();

  return (
    <div className="fixed bottom-0 left-[300px] right-[350px] h-64 p-4 z-10">
        <Card className="h-full w-full flex flex-col">
            <h2 className="font-bold text-lg mb-2 text-gray-800 dark:text-gray-100">Cash Flow Forecast</h2>
            <div className="flex-1 -mx-4 -mb-4">
                 <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
                        <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                        <YAxis tickFormatter={val => `$${(val / 1000)}k`} tick={{ fontSize: 12 }} />
                        <Tooltip
                          formatter={(value: number) => [currencyFormatter(value), 'Balance']}
                          contentStyle={{
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            backdropFilter: 'blur(5px)',
                            border: '1px solid rgba(0, 0, 0, 0.1)',
                            borderRadius: '0.5rem',
                          }}
                        />
                        <Legend />
                        <Line type="monotone" dataKey="balance" stroke="#3b82f6" strokeWidth={2} dot={false} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </Card>
    </div>
  );
};
