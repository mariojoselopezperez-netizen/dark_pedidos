import React, { useState } from 'react';
import formatCordoba from '../utils/currency';

export default function PayrollCalculator({ employees }) {
  const [selectedId, setSelectedId] = useState(employees[0]?.id || null);

  const empleado = employees.find(e => e.id === selectedId) || employees[0] || null;

  const calculate = (e) => {
    if (!e) return { salarioDevengado: 0, deducciones: 0, neto: 0 };
    const salarioDiario = e.sueldoBase / 30;
    const salarioDevengado = salarioDiario * (e.diasTrabajados || 0);
    const deducciones = Math.round(salarioDevengado * 0.09 * 100) / 100; // ejemplo: seguridad social 9%
    const neto = Math.round((salarioDevengado - deducciones) * 100) / 100;
    return { salarioDevengado, deducciones, neto };
  };

  const resultado = calculate(empleado);

  return (
    <div>
      <div className="mb-3">
        <label className="text-sm text-gray-300">Seleccionar empleado</label>
        <select className="w-full mt-1 bg-slate-700 text-white rounded p-2" value={selectedId || ''} onChange={e => setSelectedId(parseInt(e.target.value))}>
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-slate-800 p-3 rounded text-white">
          <div className="text-sm text-gray-400">Salario devengado</div>
          <div className="text-2xl font-bold">{formatCordoba(resultado.salarioDevengado)}</div>
        </div>
        <div className="bg-slate-800 p-3 rounded text-white">
          <div className="text-sm text-gray-400">Deducciones</div>
          <div className="text-2xl font-bold text-red-400">-{formatCordoba(resultado.deducciones)}</div>
        </div>
        <div className="bg-slate-800 p-3 rounded text-white">
          <div className="text-sm text-gray-400">Neto a pagar</div>
          <div className="text-2xl font-bold text-green-400">{formatCordoba(resultado.neto)}</div>
        </div>
      </div>
    </div>
  );
}
