import React from 'react';

export default function Card({ title, value, icon, color = 'purple', trend }) {
  const colorClasses = {
    purple: 'bg-purple-900/20 border-purple-500',
    green: 'bg-green-900/20 border-green-500',
    blue: 'bg-blue-900/20 border-blue-500',
    pink: 'bg-pink-900/20 border-pink-500',
  };

  return (
    <div className={`${colorClasses[color]} border rounded-lg p-6 backdrop-blur-sm hover:shadow-lg transition-all duration-300`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-400 text-sm font-medium mb-1">{title}</p>
          <p className="text-2xl font-bold text-white">{value}</p>
          {trend && (
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% vs último período
            </p>
          )}
        </div>
        {icon && (
          <div className="text-3xl opacity-20">
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}
