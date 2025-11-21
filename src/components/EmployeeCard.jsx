import React from 'react';

export default function EmployeeCard({ emp, onDelete }) {
  return (
    <div className="flex items-center justify-between bg-slate-700 rounded p-3">
      <div>
        <div className="text-white font-semibold">{emp.nombre}</div>
        <div className="text-sm text-gray-300">Sueldo base: ${emp.sueldoBase}</div>
        <div className="text-sm text-gray-300">Días trabajados: {emp.diasTrabajados} • Vacaciones: {emp.diasVacaciones}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={onDelete} className="text-red-400 hover:text-red-300">Eliminar</button>
      </div>
    </div>
  );
}
