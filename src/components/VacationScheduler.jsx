import React, { useState } from 'react';

export default function VacationScheduler({ employees }) {
  const [schedules, setSchedules] = useState([]);
  const [form, setForm] = useState({ employeeId: employees[0]?.id || null, start: '', end: '' });

  const scheduleVacation = () => {
    if (!form.employeeId || !form.start || !form.end) return;
    setSchedules([...schedules, { ...form, id: Date.now() }]);
    setForm({ ...form, start: '', end: '' });
  };

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <select className="bg-slate-700 text-white rounded p-2" value={form.employeeId || ''} onChange={e => setForm({ ...form, employeeId: parseInt(e.target.value) })}>
          {employees.map(emp => <option key={emp.id} value={emp.id}>{emp.nombre}</option>)}
        </select>
        <input type="date" className="bg-slate-700 text-white rounded p-2" value={form.start} onChange={e => setForm({ ...form, start: e.target.value })} />
        <input type="date" className="bg-slate-700 text-white rounded p-2" value={form.end} onChange={e => setForm({ ...form, end: e.target.value })} />
      </div>
      <div className="mt-3">
        <button onClick={scheduleVacation} className="px-4 py-2 bg-blue-600 text-white rounded">Programar Vacaciones</button>
      </div>

      <div className="mt-4 space-y-2">
        {schedules.map(s => (
          <div key={s.id} className="bg-slate-700 p-3 rounded text-white">
            <div className="text-sm text-gray-300">Empleado: {employees.find(e => e.id === s.employeeId)?.nombre}</div>
            <div className="text-sm text-gray-300">Desde: {s.start} • Hasta: {s.end}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
