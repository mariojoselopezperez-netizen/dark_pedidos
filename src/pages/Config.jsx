import React, { useState } from "react";
import { FaBuilding, FaFileAlt, FaPercentage } from "react-icons/fa";

export default function Configuraciones() {
  const [tab, setTab] = useState("empresa");

  const tabs = [
    { id: "empresa", label: "Datos de Empresa", icon: <FaBuilding /> },
    { id: "reportes", label: "Configuración de Reportes", icon: <FaFileAlt /> },
    { id: "impuestos", label: "Impuestos", icon: <FaPercentage /> },
  ];

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-6">Configuraciones</h2>

      {/* Tabs */}
      <div className="flex border-b border-gray-300 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2 border-b-2 ${
              tab === t.id
                ? "border-blue-500 text-blue-500 font-semibold"
                : "border-transparent text-gray-600 hover:text-blue-500"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white shadow rounded-lg p-4">
        {tab === "empresa" && <EmpresaSection />}
        {tab === "reportes" && <ReportesSection />}
        {tab === "impuestos" && <ImpuestosSection />}
      </div>
    </div>
  );
}

function EmpresaSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="input" type="text" placeholder="Nombre de la empresa" />
      <input className="input" type="text" placeholder="Registro patronal" />
      <input className="input" type="text" placeholder="RUC" />
      <input className="input" type="file" accept="image/*" />
      <label className="flex items-center gap-2">
        <input type="checkbox" /> Encabezado condicional en reportes
      </label>
      <input className="input" type="text" placeholder="Celular" />
      <input className="input" type="text" placeholder="Teléfono" />
      <input className="input" type="text" placeholder="Dirección" />
      <input className="input" type="text" placeholder="Página web" />
    </div>
  );
}

function ReportesSection() {
  const reportes = [
    "Comprobante de Diario",
    "Pagos",
    "Ajuste Inventario",
    "Cotizaciones",
    "Recibos",
    "Recibos Egreso",
    "Facturas",
  ];

  return (
    <div className="space-y-4">
      {reportes.map((rep, idx) => (
        <div key={idx} className="flex items-center justify-between border-b pb-2">
          <span>{rep}</span>
          <div className="flex items-center gap-2">
            <input className="input w-24" type="text" defaultValue="0001" />
            <label className="flex items-center gap-1">
              <input type="checkbox" /> Editar número
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

function ImpuestosSection() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="input" type="number" defaultValue="15" placeholder="IVA (%)" />
      <input className="input" type="number" defaultValue="2" placeholder="IR en la fuente (%)" />
      <textarea className="input h-24" defaultValue={`IR Empleados:\nHasta 75,000: 0%\n75,001–100,000: 10%\n100,001–200,000: 15%`} />
      <textarea className="input h-24" placeholder="INSS Laboral y Patronal" />
      <textarea className="input h-24" placeholder="Impuesto Selectivo al Consumo (ISC)" />
      <textarea className="input h-24" placeholder="Tabla de depreciación" />
    </div>
  );
}
