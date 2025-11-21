import React from 'react';

export default function ReportFilters({ filtroCliente, setFiltroCliente, filtroFecha, setFiltroFecha, filtroPago, setFiltroPago, onClear }) {
  const computeDateValue = () => {
    if (!filtroFecha) return '';
    try {
      const d = new Date(filtroFecha);
      if (!isNaN(d)) return d.toISOString().slice(0, 10);
    } catch {
      return '';
    }
    return filtroFecha;
  };

  const dateValue = computeDateValue();

  return (
    <div className="bg-white/5 p-4 rounded-lg shadow-sm flex flex-col md:flex-row gap-3 items-center">

      <input
        className="px-3 py-2 rounded-md bg-transparent border border-gray-700 text-white placeholder-gray-400 w-full md:w-1/3"
        type="text"
        placeholder="Filtrar por cliente"
        value={filtroCliente}
        onChange={e => setFiltroCliente(e.target.value)}
      />

      <input
        className="px-3 py-2 rounded-md bg-transparent border border-gray-700 text-white placeholder-gray-400 w-full md:w-1/5"
        type="date"
        value={dateValue}
        onChange={e => setFiltroFecha(e.target.value ? new Date(e.target.value).toLocaleDateString() : '')}
      />

      <select
        className="px-3 py-2 rounded-md bg-transparent border border-gray-700 text-white w-full md:w-1/5"
        value={filtroPago}
        onChange={e => setFiltroPago(e.target.value)}
      >
        <option value="">Todos</option>
        <option value="cash">Efectivo</option>
        <option value="card">Tarjeta</option>
        <option value="credit">Crédito</option>
      </select>

      <button
        className="ml-auto px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md"
        onClick={onClear}
      >
        Limpiar
      </button>
    </div>
  );
}
