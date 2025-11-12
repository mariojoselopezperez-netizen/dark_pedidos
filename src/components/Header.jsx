import React from 'react';

export default function Header({ title, subtitle }) {
  return (
    <div className="bg-gradient-to-r from-purple-900/20 to-pink-900/20 border-b border-purple-500/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold text-white mb-2">{title}</h1>
        {subtitle && (
          <p className="text-gray-400">{subtitle}</p>
        )}
      </div>
    </div>
  );
}
