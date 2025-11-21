import React, { useState } from 'react';
import { FaBook, FaFileAlt, FaDownload, FaPlus, FaEdit, FaTrash, FaEye, FaFilePdf, FaFileExcel } from 'react-icons/fa';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import formatCordoba from '../utils/currency';

export default function Contabilidad({ initialTab }) {
  const [activeTab, setActiveTab] = useState(initialTab || 'registros');
  const [registros, setRegistros] = useState([
    {
      id: 1,
      fecha: '2025-01-15',
      concepto: 'Venta de productos',
      debe: 5000,
      haber: 0,
      cuenta: '1100 - Caja',
      niif: 'NIIF 15 - Ingresos de Actividades Ordinarias'
    },
    {
      id: 2,
      fecha: '2025-01-16',
      concepto: 'Compra de inventario',
      debe: 0,
      haber: 2500,
      cuenta: '1200 - Bancos',
      niif: 'NIIF 2 - Inventarios'
    }
  ]);

  const [editingId, setEditingId] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [newRegistro, setNewRegistro] = useState({
    fecha: new Date().toISOString().split('T')[0],
    concepto: '',
    debe: 0,
    haber: 0,
    cuenta: '',
    niif: ''
  });

  const [niifsData] = useState([
    {
      codigo: 'NIIF 1',
      titulo: 'Adopción por Primera Vez de las NIIF',
      descripcion: 'Aplicable a empresas que adopten las NIIF por primera vez'
    },
    {
      codigo: 'NIIF 2',
      titulo: 'Pago Basado en Acciones',
      descripcion: 'Reconocimiento de transacciones pagadas en acciones'
    },
    {
      codigo: 'NIIF 5',
      titulo: 'Activos No Corrientes Mantenidos para la Venta',
      descripcion: 'Medición y presentación de activos disponibles para venta'
    },
    {
      codigo: 'NIIF 15',
      titulo: 'Ingresos de Actividades Ordinarias',
      descripcion: 'Reconocimiento de ingresos de clientes'
    },
    {
      codigo: 'NIIF 16',
      titulo: 'Arrendamientos',
      descripcion: 'Reconocimiento y medición de arrendamientos'
    }
  ]);

  const handleAddRegistro = () => {
    if (editingId) {
      setRegistros(registros.map(r => r.id === editingId ? { ...newRegistro, id: editingId } : r));
      setEditingId(null);
    } else {
      setRegistros([...registros, { ...newRegistro, id: Math.max(...registros.map(r => r.id), 0) + 1 }]);
    }
    setNewRegistro({
      fecha: new Date().toISOString().split('T')[0],
      concepto: '',
      debe: 0,
      haber: 0,
      cuenta: '',
      niif: ''
    });
    setShowModal(false);
  };

  const handleEditRegistro = (registro) => {
    setNewRegistro(registro);
    setEditingId(registro.id);
    setShowModal(true);
  };

  const handleDeleteRegistro = (id) => {
    setRegistros(registros.filter(r => r.id !== id));
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    const margin = 10;
    
    // Header
    doc.setFontSize(20);
    doc.setTextColor(31, 41, 55);
    doc.text('LIBRO DIARIO', margin, margin + 5);
    
    doc.setFontSize(10);
    doc.setTextColor(107, 114, 128);
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, margin, margin + 12);
    
    // Table
    autoTable(doc, {
      startY: margin + 20,
      head: [['Fecha', 'Concepto', 'Cuenta', 'Debe', 'Haber', 'NIIF']],
      body: registros.map(r => [
        r.fecha,
        r.concepto,
        r.cuenta,
        formatCordoba(r.debe),
        formatCordoba(r.haber),
        r.niif
      ]),
      theme: 'grid',
      headerStyles: {
        backgroundColor: [31, 41, 55],
        textColor: [255, 255, 255],
        fontStyle: 'bold'
      },
      bodyStyles: {
        textColor: [31, 41, 55]
      },
      alternateRowStyles: {
        backgroundColor: [243, 244, 246]
      }
    });

    // Footer
    const totalDebes = registros.reduce((sum, r) => sum + r.debe, 0);
    const totalHaberes = registros.reduce((sum, r) => sum + r.haber, 0);
    
    doc.setFontSize(10);
    doc.setFont(undefined, 'bold');
    doc.text(`Total Débitos: ${formatCordoba(totalDebes)}`, margin, doc.internal.pageSize.getHeight() - 20);
    doc.text(`Total Créditos: ${formatCordoba(totalHaberes)}`, margin + 80, doc.internal.pageSize.getHeight() - 20);

    doc.save(`libro-diario-${new Date().toISOString().split('T')[0]}.pdf`);
  };

  const exportToExcel = () => {
    const dataExport = registros.map(r => ({
      Fecha: r.fecha,
      Concepto: r.concepto,
      Cuenta: r.cuenta,
      Debe: r.debe,
      Haber: r.haber,
      NIIF: r.niif
    }));

    const worksheet = XLSX.utils.json_to_sheet(dataExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Registros');
    XLSX.writeFile(workbook, `libro-diario-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const calcularBalance = () => {
    const totalDebes = registros.reduce((sum, r) => sum + r.debe, 0);
    const totalHaberes = registros.reduce((sum, r) => sum + r.haber, 0);
    return { totalDebes, totalHaberes, balance: totalDebes - totalHaberes };
  };

  const balance = calcularBalance();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Contabilidad</h1>
          <p className="text-slate-400">Gestión contable bajo normas NIIF</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-slate-700">
          {[
            { id: 'registros', label: 'Registros Contables', icon: FaBook },
            { id: 'niif', label: 'Normas NIIF', icon: FaFileAlt },
            { id: 'reportes', label: 'Reportes', icon: FaDownload },
            { id: 'nomina', label: 'Nómina', icon: FaFileAlt }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-3 font-medium transition-all ${
                  activeTab === tab.id
                    ? 'text-blue-400 border-b-2 border-blue-400'
                    : 'text-slate-400 hover:text-slate-300'
                }`}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Registros Contables */}
        {activeTab === 'registros' && (
          <div className="space-y-6">
            {/* Balance Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-green-900 to-green-800 rounded-lg p-6 text-white">
                <p className="text-sm font-medium text-green-300 mb-1">Total Débitos</p>
                <p className="text-3xl font-bold">{formatCordoba(balance.totalDebes)}</p>
              </div>
              <div className="bg-gradient-to-br from-red-900 to-red-800 rounded-lg p-6 text-white">
                <p className="text-sm font-medium text-red-300 mb-1">Total Créditos</p>
                <p className="text-3xl font-bold">{formatCordoba(balance.totalHaberes)}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-900 to-blue-800 rounded-lg p-6 text-white">
                <p className="text-sm font-medium text-blue-300 mb-1">Balance</p>
                <p className="text-3xl font-bold">{formatCordoba(balance.balance)}</p>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                <FaPlus /> Nuevo Registro
              </button>
              <button
                onClick={exportToPDF}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                <FaFilePdf /> Exportar PDF
              </button>
              <button
                onClick={exportToExcel}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium transition-all"
              >
                <FaFileExcel /> Exportar Excel
              </button>
            </div>

            {/* Tabla de Registros */}
            <div className="bg-slate-800 rounded-lg shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-700">
                    <tr>
                      <th className="px-6 py-4 text-left text-white font-medium">Fecha</th>
                      <th className="px-6 py-4 text-left text-white font-medium">Concepto</th>
                      <th className="px-6 py-4 text-left text-white font-medium">Cuenta</th>
                      <th className="px-6 py-4 text-right text-white font-medium">Debe</th>
                      <th className="px-6 py-4 text-right text-white font-medium">Haber</th>
                      <th className="px-6 py-4 text-left text-white font-medium">NIIF</th>
                      <th className="px-6 py-4 text-center text-white font-medium">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700">
                    {registros.map(registro => (
                      <tr key={registro.id} className="hover:bg-slate-700 transition-colors">
                        <td className="px-6 py-4 text-slate-300">{registro.fecha}</td>
                        <td className="px-6 py-4 text-slate-300">{registro.concepto}</td>
                        <td className="px-6 py-4 text-slate-300">{registro.cuenta}</td>
                        <td className="px-6 py-4 text-right text-green-400 font-medium">{formatCordoba(registro.debe)}</td>
                        <td className="px-6 py-4 text-right text-red-400 font-medium">{formatCordoba(registro.haber)}</td>
                        <td className="px-6 py-4 text-slate-300 text-sm">{registro.niif}</td>
                        <td className="px-6 py-4 text-center">
                          <div className="flex gap-2 justify-center">
                            <button
                              onClick={() => handleEditRegistro(registro)}
                              className="text-blue-400 hover:text-blue-300 transition-colors"
                            >
                              <FaEdit />
                            </button>
                            <button
                              onClick={() => handleDeleteRegistro(registro.id)}
                              className="text-red-400 hover:text-red-300 transition-colors"
                            >
                              <FaTrash />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Normas NIIF */}
        {activeTab === 'niif' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {niifsData.map((niif, idx) => (
              <div key={idx} className="bg-slate-800 rounded-lg p-6 border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
                <h3 className="text-lg font-bold text-blue-400 mb-2">{niif.codigo}</h3>
                <h4 className="text-white font-semibold mb-3">{niif.titulo}</h4>
                <p className="text-slate-400">{niif.descripcion}</p>
              </div>
            ))}
          </div>
        )}

        {/* Reportes */}
        {activeTab === 'reportes' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FaBook /> Balance General
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-300 pb-2 border-b border-slate-700">
                  <span>Total Activos</span>
                  <span className="font-bold text-green-400">{formatCordoba(balance.totalDebes)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pb-2 border-b border-slate-700">
                  <span>Total Pasivos</span>
                  <span className="font-bold text-red-400">{formatCordoba(balance.totalHaberes)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-2">
                  <span className="font-bold">Patrimonio</span>
                  <span className="font-bold text-blue-400">{formatCordoba(balance.balance)}</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800 rounded-lg p-6">
              <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <FaFileAlt /> Estado de Resultados
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between text-slate-300 pb-2 border-b border-slate-700">
                  <span>Ingresos Totales</span>
                  <span className="font-bold text-green-400">{formatCordoba(balance.totalDebes)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pb-2 border-b border-slate-700">
                  <span>Gastos Totales</span>
                  <span className="font-bold text-red-400">{formatCordoba(balance.totalHaberes)}</span>
                </div>
                <div className="flex justify-between text-slate-300 pt-2">
                  <span className="font-bold">Utilidad Neta</span>
                  <span className="font-bold text-blue-400">{formatCordoba(balance.totalDebes - balance.totalHaberes)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nomina */}
        {activeTab === 'nomina' && (
          <div className="bg-slate-800 rounded-lg p-6">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <FaFileAlt /> Nómina
            </h3>
            <div>
              {/* Import dinámico para evitar aumentar bundle si no se usa */}
              <React.Suspense fallback={<div className="text-white">Cargando nómina...</div>}>
                {/* Usamos require/import dinámico para cargar el componente de página */}
                {(() => {
                  // Import dinámico con import() para compatibilidad ESM
                  const NominaAsync = React.lazy(() => import('../pages/Nomina'));
                  const Nom = NominaAsync;
                  return <Nom />;
                })()}
              </React.Suspense>
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full">
            <h2 className="text-2xl font-bold text-white mb-6">
              {editingId ? 'Editar Registro' : 'Nuevo Registro Contable'}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-slate-300 font-medium mb-2">Fecha</label>
                <input
                  type="date"
                  value={newRegistro.fecha}
                  onChange={(e) => setNewRegistro({ ...newRegistro, fecha: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2">Cuenta</label>
                <input
                  type="text"
                  placeholder="Ej: 1100 - Caja"
                  value={newRegistro.cuenta}
                  onChange={(e) => setNewRegistro({ ...newRegistro, cuenta: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-300 font-medium mb-2">Concepto</label>
                <input
                  type="text"
                  placeholder="Descripción del movimiento"
                  value={newRegistro.concepto}
                  onChange={(e) => setNewRegistro({ ...newRegistro, concepto: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2">Débito (C$)</label>
                <input
                  type="number"
                  value={newRegistro.debe}
                  onChange={(e) => setNewRegistro({ ...newRegistro, debe: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-2">Crédito (C$)</label>
                <input
                  type="number"
                  value={newRegistro.haber}
                  onChange={(e) => setNewRegistro({ ...newRegistro, haber: parseFloat(e.target.value) })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-300 font-medium mb-2">Norma NIIF</label>
                <input
                  type="text"
                  placeholder="Ej: NIIF 15 - Ingresos"
                  value={newRegistro.niif}
                  onChange={(e) => setNewRegistro({ ...newRegistro, niif: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 text-white rounded px-4 py-2 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEditingId(null);
                  setNewRegistro({
                    fecha: new Date().toISOString().split('T')[0],
                    concepto: '',
                    debe: 0,
                    haber: 0,
                    cuenta: '',
                    niif: ''
                  });
                }}
                className="px-6 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddRegistro}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors"
              >
                {editingId ? 'Actualizar' : 'Guardar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
