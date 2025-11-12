import React from 'react';

export default function ChartContainer({ title, children, fullWidth = false }) {
  return (
    <div className={`bg-slate-900/50 border border-slate-700 rounded-lg p-6 backdrop-blur-sm hover:border-purple-500/50 transition-all duration-300 ${fullWidth ? 'w-full' : ''}`}>
      <h3 className="text-lg font-semibold text-white mb-4">{title}</h3>
      <div className="w-full">
        {children}
      </div>
    </div>
  );
}
