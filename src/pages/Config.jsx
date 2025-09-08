import React, { useState } from "react";
import { FaBuilding, FaFileAlt, FaPercentage } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Función para convertir números a letras en español
function numeroALetras(num) {
  const unidades = ["", "uno", "dos", "tres", "cuatro", "cinco", "seis", "siete", "ocho", "nueve"];
  const decenas = ["", "diez", "veinte", "treinta", "cuarenta", "cincuenta", "sesenta", "setenta", "ochenta", "noventa"];
  const centenas = ["", "cien", "doscientos", "trescientos", "cuatrocientos", "quinientos", "seiscientos", "setecientos", "ochocientos", "novecientos"];

  if (num === 0) return "cero";
  if (num > 999999) return "Número demasiado grande";

  const miles = Math.floor(num / 1000);
  const resto = num % 1000;

  let texto = "";

  if (miles > 0) {
    texto += miles === 1 ? "mil " : `${numeroALetras(miles)} mil `;
  }

  if (resto > 0) {
    const centenasNum = Math.floor(resto / 100);
    const decenasNum = Math.floor((resto % 100) / 10);
    const unidadesNum = resto % 10;

    if (centenasNum > 0) texto += `${centenas[centenasNum]} `;
    if (decenasNum > 0) texto += `${decenas[decenasNum]} `;
    if (unidadesNum > 0) texto += `${unidades[unidadesNum]} `;
  }

  return texto.trim();
}

export default function Configuraciones() {
  const [tab, setTab] = useState("empresa");
  const [empresa, setEmpresa] = useState({
    nombre: "",
    registro: "",
    ruc: "",
    celular: "",
    telefono: "",
    direccion: "",
    web: "",
  });

  const tabs = [
    { id: "empresa", label: "Datos de Empresa", icon: <FaBuilding /> },
    { id: "reportes", label: "Configuración de Reportes", icon: <FaFileAlt /> },
    { id: "impuestos", label: "Calculadora Laboral", icon: <FaPercentage /> },
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
        {tab === "empresa" && <EmpresaSection empresa={empresa} setEmpresa={setEmpresa} />}
        {tab === "reportes" && <ReportesSection />}
        {tab === "impuestos" && <CalculadoraLaboral empresa={empresa} />}
      </div>
    </div>
  );
}

function EmpresaSection({ empresa, setEmpresa }) {
  const handleChange = (e) => {
    setEmpresa({ ...empresa, [e.target.name]: e.target.value });
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <input className="input" type="text" name="nombre" placeholder="Nombre de la empresa" value={empresa.nombre} onChange={handleChange} />
      <input className="input" type="text" name="registro" placeholder="Registro patronal" value={empresa.registro} onChange={handleChange} />
      <input className="input" type="text" name="ruc" placeholder="RUC" value={empresa.ruc} onChange={handleChange} />
      <input className="input" type="file" accept="image/*" />
      <label className="flex items-center gap-2">
        <input type="checkbox" /> Encabezado condicional en reportes
      </label>
      <input className="input" type="text" name="celular" placeholder="Celular" value={empresa.celular} onChange={handleChange} />
      <input className="input" type="text" name="telefono" placeholder="Teléfono" value={empresa.telefono} onChange={handleChange} />
      <input className="input" type="text" name="direccion" placeholder="Dirección" value={empresa.direccion} onChange={handleChange} />
      <input className="input" type="text" name="web" placeholder="Página web" value={empresa.web} onChange={handleChange} />
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

function CalculadoraLaboral({ empresa }) {
  const [salario, setSalario] = useState("");
  const [años, setAños] = useState("");
  const [meses, setMeses] = useState("");
  const [dias, setDias] = useState("");
  const [vacacionesPend, setVacacionesPend] = useState("");
  const [resultados, setResultados] = useState(null);

  const calcular = () => {
    const s = parseFloat(salario) || 0;
    const a = parseInt(años) || 0;
    const m = parseInt(meses) || 0;
    const d = parseInt(dias) || 0;
    const vacPend = parseInt(vacacionesPend) || 0;

    const totalAnios = a + m / 12 + d / 365;
    const inss = s * 0.07;
    const salarioAnual = (s - inss) * 12;

    let irAnual = 0;
    if (salarioAnual <= 100000) irAnual = 0;
    else if (salarioAnual <= 200000) irAnual = (salarioAnual - 100000) * 0.15;
    else if (salarioAnual <= 350000) irAnual = (salarioAnual - 200000) * 0.20 + 15000;
    else if (salarioAnual <= 500000) irAnual = (salarioAnual - 350000) * 0.25 + 45000;
    else irAnual = (salarioAnual - 500000) * 0.30 + 82500;

    const irMensual = irAnual / 12;
    const aguinaldo = s * totalAnios;
    const vacaciones = (s / 30) * 15 * totalAnios + (s / 30) * vacPend;
    const indemnizacion = s * (totalAnios > 5 ? 5 : totalAnios);
    const salarioProporcional = (s / 30) * (m * 30 + d);

    setResultados([
      { titulo: "INSS Laboral", valor: inss },
      { titulo: "IR Laboral Mensual", valor: irMensual },
      { titulo: "Aguinaldo Proporcional", valor: aguinaldo },
      { titulo: "Vacaciones", valor: vacaciones },
      { titulo: "Indemnización", valor: indemnizacion },
      { titulo: "Salario Proporcional", valor: salarioProporcional },
    ]);
  };

  const exportarPDF = () => {
    if (!resultados) return;
    const doc = new jsPDF("p", "mm", "a4");

    // Nombre de la empresa (encabezado)
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text(empresa.nombre || "Nombre de la Empresa", 105, 15, { align: "center" });

    // Datos de la empresa
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`RUC: ${empresa.ruc || "No especificado"}`, 15, 25);
    if (empresa.direccion) {
      doc.text(`Dirección: ${empresa.direccion}`, 15, 30);
    }

    // Fecha y No. comprobante
    doc.text(`Fecha: ${new Date().toLocaleDateString()}`, 160, 25);
    doc.text("No.: ______", 160, 30);

    // Título del comprobante
    doc.setFontSize(13);
    doc.setFont("helvetica", "bold");
    doc.text("Comprobante de Liquidación", 105, 40, { align: "center" });

    let y = 50;
    const tabla = resultados.map(r => [r.titulo, `C$ ${r.valor.toFixed(2)}`]);

    autoTable(doc, {
      startY: y,
      head: [["Concepto", "Valor"]],
      body: tabla,
      theme: "grid",
      headStyles: { fillColor: [255, 204, 0], textColor: 0 },
      styles: { fontSize: 10, halign: "center" },
    });

    const finalY = doc.lastAutoTable.finalY || y;

    const total = resultados.reduce((acc, r) => acc + r.valor, 0);
    const totalLetras = numeroALetras(Math.floor(total));

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL: C$ ${total.toFixed(2)}`, 160, finalY + 10);
    doc.setFont("helvetica", "normal");
    doc.text(`SON: ${totalLetras.toUpperCase()} CÓRDOBAS`, 15, finalY + 20);

    // Firmas
    doc.text("_________________________", 30, finalY + 50);
    doc.text("Representante Legal", 40, finalY + 55);
    doc.text("_________________________", 130, finalY + 50);
    doc.text("Trabajador", 145, finalY + 55);

    doc.save(`liquidacion_${new Date().toISOString().slice(0,10)}.pdf`);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Calculadora Laboral - Nicaragua</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input className="input" type="number" placeholder="Salario mensual" value={salario} onChange={e => setSalario(e.target.value)} />
        <input className="input" type="number" placeholder="Años trabajados" value={años} onChange={e => setAños(e.target.value)} />
        <input className="input" type="number" placeholder="Meses trabajados" value={meses} onChange={e => setMeses(e.target.value)} />
        <input className="input" type="number" placeholder="Días trabajados" value={dias} onChange={e => setDias(e.target.value)} />
        <input className="input" type="number" placeholder="Vacaciones pendientes (días)" value={vacacionesPend} onChange={e => setVacacionesPend(e.target.value)} />
      </div>
      <button className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600" onClick={calcular}>
        Calcular
      </button>

      {resultados && (
        <>
          <button className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600" onClick={exportarPDF}>
            Exportar como PDF
          </button>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {resultados.map((r, i) => (
              <div key={i} className="bg-white shadow p-4 rounded-lg border">
                <h4 className="font-bold text-lg">{r.titulo}</h4>
                <p className="text-2xl font-semibold text-green-600">C$ {r.valor.toFixed(2)}</p>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
