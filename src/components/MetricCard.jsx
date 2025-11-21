import React from 'react';

export default function MetricCard({ title, value, subtitle, icon }) {
  return (
    <div className="bg-gradient-to-r from-gray-800 via-gray-900 to-black text-white rounded-xl shadow-lg p-4 flex items-center gap-4">
      <div className="w-14 h-14 flex items-center justify-center bg-white/10 rounded-lg">{icon}</div>
      <div className="flex-1">
        <div className="text-sm text-gray-300">{title}</div>
        <div className="text-2xl font-semibold">{value}</div>
        {subtitle && <div className="text-xs text-gray-400">{subtitle}</div>}
      </div>
    </div>
  );
}
