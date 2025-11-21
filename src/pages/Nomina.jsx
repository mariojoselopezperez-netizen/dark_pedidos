import React, { useState } from 'react';
import EmployeeCard from '../components/EmployeeCard';
import PayrollCalculator from '../components/PayrollCalculator';
import VacationScheduler from '../components/VacationScheduler';
import * as XLSX from 'xlsx';

export default function Nomina() {
  const [employees, setEmployees] = useState([
    { id: 1, nombre: 'Juan Perez', sueldoBase: 1200, diasTrabajados: 30, diasVacaciones: 10, estado: 'Activo' },
    { id: 2, nombre: 'María Gómez', sueldoBase: 1500, diasTrabajados: 28, diasVacaciones: 5, estado: 'Activo' }
  ]);

  const [newEmp, setNewEmp] = useState({ nombre: '', sueldoBase: 0, diasTrabajados: 0, diasVacaciones: 0 });

  const addEmployee = () => {
    const nextId = Math.max(0, ...employees.map(e => e.id)) + 1;
    setEmployees([...employees, { ...newEmp, id: nextId, estado: 'Activo' }]);
    setNewEmp({ nombre: '', sueldoBase: 0, diasTrabajados: 0, diasVacaciones: 0 });
  };

  const removeEmployee = (id) => setEmployees(employees.filter(e => e.id !== id));

  const exportEmployeesXLSX = () => {
    const data = employees.map(e => ({ Nombre: e.nombre, SueldoBase: e.sueldoBase, DiasTrabajados: e.diasTrabajados, DiasVacaciones: e.diasVacaciones, Estado: e.estado }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Empleados');
    XLSX.writeFile(wb, `empleados_${new Date().toISOString().slice(0,10)}.xlsx`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Nómina</h2>
          <p className="text-sm text-gray-400">Gestión de empleados, cálculo salarial y vacaciones</p>
        </div>
        <div className="flex gap-2">
          <button onClick={exportEmployeesXLSX} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md">Exportar Empleados</button>
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Añadir Empleado</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <input className="px-3 py-2 bg-slate-700 text-white rounded" placeholder="Nombre" value={newEmp.nombre} onChange={e => setNewEmp({ ...newEmp, nombre: e.target.value })} />
          <input className="px-3 py-2 bg-slate-700 text-white rounded" type="number" placeholder="Sueldo base" value={newEmp.sueldoBase} onChange={e => setNewEmp({ ...newEmp, sueldoBase: parseFloat(e.target.value) })} />
          <input className="px-3 py-2 bg-slate-700 text-white rounded" type="number" placeholder="Días trabajados" value={newEmp.diasTrabajados} onChange={e => setNewEmp({ ...newEmp, diasTrabajados: parseInt(e.target.value) })} />
          <input className="px-3 py-2 bg-slate-700 text-white rounded" type="number" placeholder="Días vacaciones" value={newEmp.diasVacaciones} onChange={e => setNewEmp({ ...newEmp, diasVacaciones: parseInt(e.target.value) })} />
        </div>
        <div className="mt-3">
          <button onClick={addEmployee} className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white rounded">Agregar</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-3">Empleados</h3>
          <div className="space-y-3">
            {employees.map(emp => (
              <EmployeeCard key={emp.id} emp={emp} onDelete={() => removeEmployee(emp.id)} />
            ))}
          </div>
        </div>

        <div className="bg-white/5 p-4 rounded-lg md:col-span-2">
          <h3 className="text-lg font-semibold text-white mb-3">Cálculo Salarial</h3>
          <PayrollCalculator employees={employees} />
          <div className="mt-6">
            <h4 className="text-white font-semibold mb-2">Programación de Vacaciones</h4>
            <VacationScheduler employees={employees} />
          </div>
        </div>
      </div>
    </div>
  );
}
