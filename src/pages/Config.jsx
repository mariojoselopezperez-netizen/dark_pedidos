import React, { useState } from "react";
import { FaBuilding, FaFileAlt, FaPercentage, FaUsers, FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import formatCordoba from '../utils/currency';

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
    nombre: "Mi Restaurante",
    registro: "",
    ruc: "0000000000000",
    celular: "",
    telefono: "",
    direccion: "",
    web: "",
    email: "",
    logo: "https://placehold.co/150x50/2c3e50/ffffff?text=Logo",
  });

  const [usuarios, setUsuarios] = useState([
    { id: 1, nombre: "Admin", email: "admin@restaurant.com", rol: "admin", estado: "Activo" },
    { id: 2, nombre: "Mesero", email: "mesero@restaurant.com", rol: "mesero", estado: "Activo" },
  ]);

  const [nuevoUsuario, setNuevoUsuario] = useState({ nombre: "", email: "", rol: "mesero", contraseña: "" });
  const [editandoUsuario, setEditandoUsuario] = useState(null);
  const [showModalUsuario, setShowModalUsuario] = useState(false);

  const tabs = [
    { id: "empresa", label: "Datos de Empresa", icon: <FaBuilding /> },
    { id: "usuarios", label: "Gestión de Usuarios", icon: <FaUsers /> },
    { id: "reportes", label: "Configuración de Reportes", icon: <FaFileAlt /> },
    { id: "impuestos", label: "Calculadora Laboral", icon: <FaPercentage /> },
  ];

  const rolesDisponibles = [
    { id: "admin", label: "Administrador", color: "#e74c3c", desc: "Acceso total al sistema" },
    { id: "gerente", label: "Gerente", color: "#3498db", desc: "Gestión de mesas y reportes" },
    { id: "mesero", label: "Mesero", color: "#27ae60", desc: "Toma de pedidos y facturación" },
    { id: "cocinero", label: "Cocinero", color: "#f39c12", desc: "Visualización de pedidos" },
  ];

  const agregarUsuario = () => {
    if (editandoUsuario) {
      setUsuarios(usuarios.map(u => u.id === editandoUsuario.id ? { ...editandoUsuario, ...nuevoUsuario } : u));
      setEditandoUsuario(null);
    } else {
      setUsuarios([...usuarios, { id: Math.max(...usuarios.map(u => u.id), 0) + 1, ...nuevoUsuario, estado: "Activo" }]);
    }
    setNuevoUsuario({ nombre: "", email: "", rol: "mesero", contraseña: "" });
    setShowModalUsuario(false);
  };

  const eliminarUsuario = (id) => {
    if (usuarios.length > 1) {
      setUsuarios(usuarios.filter(u => u.id !== id));
    } else {
      alert("No puedes eliminar el único usuario del sistema");
    }
  };

  const abrirEditarUsuario = (usuario) => {
    setEditandoUsuario(usuario);
    setNuevoUsuario({ nombre: usuario.nombre, email: usuario.email, rol: usuario.rol, contraseña: "" });
    setShowModalUsuario(true);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-2 text-gray-800">⚙️ Configuraciones del Sistema</h1>
        <p className="text-gray-600 mb-6">Administra los datos de tu empresa, usuarios y reportes</p>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 mb-6 border-b-2 border-gray-200">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all rounded-t-lg ${
                tab === t.id
                  ? "bg-white text-blue-600 border-b-4 border-blue-600"
                  : "text-gray-600 hover:text-blue-600 hover:bg-gray-100"
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="bg-white shadow-lg rounded-lg p-6">
          {tab === "empresa" && <EmpresaSection empresa={empresa} setEmpresa={setEmpresa} />}
          {tab === "usuarios" && (
            <UsuariosSection
              usuarios={usuarios}
              nuevoUsuario={nuevoUsuario}
              setNuevoUsuario={setNuevoUsuario}
              showModalUsuario={showModalUsuario}
              setShowModalUsuario={setShowModalUsuario}
              agregarUsuario={agregarUsuario}
              eliminarUsuario={eliminarUsuario}
              abrirEditarUsuario={abrirEditarUsuario}
              editandoUsuario={editandoUsuario}
              rolesDisponibles={rolesDisponibles}
            />
          )}
          {tab === "reportes" && <ReportesSection />}
          {tab === "impuestos" && <CalculadoraLaboral empresa={empresa} />}
        </div>
      </div>
    </div>
  );
}

function EmpresaSection({ empresa, setEmpresa }) {
  const [logoUrl, setLogoUrl] = useState(empresa.logo);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setEmpresa({ ...empresa, [name]: value });
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setLogoUrl(event.target.result);
        setEmpresa({ ...empresa, logo: event.target.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const guardarEmpresa = () => {
    alert("✓ Datos de empresa guardados correctamente");
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda - Logo */}
        <div className="lg:col-span-1">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-6 border-2 border-dashed border-blue-300 text-center">
            <h3 className="font-bold text-gray-800 mb-4">Logo de Empresa</h3>
            <div className="mb-4 h-32 flex items-center justify-center bg-white rounded-lg">
              {logoUrl && <img src={logoUrl} alt="Logo" className="max-h-32 max-w-full" />}
            </div>
            <label className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded cursor-pointer transition-colors">
              📤 Subir Logo
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
            </label>
            <p className="text-xs text-gray-500 mt-2">PNG, JPG (máx. 2MB)</p>
          </div>
        </div>

        {/* Columna Derecha - Formulario */}
        <div className="lg:col-span-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre de la Empresa *</label>
              <input
                type="text"
                name="nombre"
                value={empresa.nombre}
                onChange={handleChange}
                placeholder="Tu Restaurante"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">RUC *</label>
              <input
                type="text"
                name="ruc"
                value={empresa.ruc}
                onChange={handleChange}
                placeholder="0000000000000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Registro Patronal</label>
              <input
                type="text"
                name="registro"
                value={empresa.registro}
                onChange={handleChange}
                placeholder="Registro"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={empresa.email}
                onChange={handleChange}
                placeholder="info@restaurante.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Teléfono</label>
              <input
                type="tel"
                name="telefono"
                value={empresa.telefono}
                onChange={handleChange}
                placeholder="+505 0000 0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Celular</label>
              <input
                type="tel"
                name="celular"
                value={empresa.celular}
                onChange={handleChange}
                placeholder="+505 0000 0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Dirección</label>
              <textarea
                name="direccion"
                value={empresa.direccion}
                onChange={handleChange}
                placeholder="Calle 123, Barrio Norte, Ciudad"
                rows="3"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Página Web</label>
              <input
                type="url"
                name="web"
                value={empresa.web}
                onChange={handleChange}
                placeholder="https://turestaurante.com"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-200">
        <button className="px-6 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-lg font-medium transition-colors">
          Cancelar
        </button>
        <button
          onClick={guardarEmpresa}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
        >
          ✓ Guardar Cambios
        </button>
      </div>
    </div>
  );
}

function UsuariosSection({
  usuarios,
  nuevoUsuario,
  setNuevoUsuario,
  showModalUsuario,
  setShowModalUsuario,
  agregarUsuario,
  eliminarUsuario,
  abrirEditarUsuario,
  editandoUsuario,
  rolesDisponibles,
}) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-bold text-gray-800">👥 Gestión de Usuarios</h3>
          <p className="text-gray-600 text-sm">Crea y administra los usuarios del sistema</p>
        </div>
        <button
          onClick={() => {
            setEditandoUsuario(null);
            setNuevoUsuario({ nombre: "", email: "", rol: "mesero", contraseña: "" });
            setShowModalUsuario(true);
          }}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
        >
          <FaPlus /> Nuevo Usuario
        </button>
      </div>

      {/* Tabla de Usuarios */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-200 text-gray-800">
              <th className="px-4 py-3 text-left font-semibold">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Rol</th>
              <th className="px-4 py-3 text-left font-semibold">Estado</th>
              <th className="px-4 py-3 text-center font-semibold">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((usuario) => {
              const rolInfo = rolesDisponibles.find(r => r.id === usuario.rol);
              return (
                <tr key={usuario.id} className="border-b border-gray-200 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-800">{usuario.nombre}</td>
                  <td className="px-4 py-3 text-gray-600">{usuario.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className="px-3 py-1 rounded-full text-white text-sm font-medium"
                      style={{ backgroundColor: rolInfo?.color || "#999" }}
                    >
                      {rolInfo?.label || usuario.rol}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                      {usuario.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                    <button
                      onClick={() => abrirEditarUsuario(usuario)}
                      className="text-blue-600 hover:text-blue-800 hover:bg-blue-50 p-2 rounded transition-colors"
                      title="Editar"
                    >
                      <FaEdit size={18} />
                    </button>
                    <button
                      onClick={() => eliminarUsuario(usuario.id)}
                      className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition-colors"
                      title="Eliminar"
                    >
                      <FaTrash size={18} />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal Crear/Editar Usuario */}
      {showModalUsuario && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full p-6">
            <h3 className="text-xl font-bold mb-4 text-gray-800">
              {editandoUsuario ? "✏️ Editar Usuario" : "➕ Nuevo Usuario"}
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre Completo *</label>
                <input
                  type="text"
                  value={nuevoUsuario.nombre}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, nombre: e.target.value })}
                  placeholder="Juan Pérez"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email *</label>
                <input
                  type="email"
                  value={nuevoUsuario.email}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, email: e.target.value })}
                  placeholder="juan@restaurant.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Rol *</label>
                <select
                  value={nuevoUsuario.rol}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, rol: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {rolesDisponibles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.label} - {r.desc}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {editandoUsuario ? "Cambiar Contraseña (opcional)" : "Contraseña *"}
                </label>
                <input
                  type="password"
                  value={nuevoUsuario.contraseña}
                  onChange={(e) => setNuevoUsuario({ ...nuevoUsuario, contraseña: e.target.value })}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Información del Rol */}
            {nuevoUsuario.rol && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg border-l-4 border-blue-500">
                <p className="text-sm text-gray-700">
                  <strong>Permisos:</strong>{" "}
                  {rolesDisponibles.find((r) => r.id === nuevoUsuario.rol)?.desc}
                </p>
              </div>
            )}

            <div className="flex gap-3 mt-6 pt-4 border-t border-gray-200">
              <button
                onClick={() => setShowModalUsuario(false)}
                className="flex-1 px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-800 rounded-lg font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={agregarUsuario}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
              >
                {editandoUsuario ? "Actualizar" : "Crear"} Usuario
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportesSection() {
  const reportes = [
    { nombre: "Comprobante de Diario", serie: "0001" },
    { nombre: "Pagos", serie: "0002" },
    { nombre: "Ajuste Inventario", serie: "0003" },
    { nombre: "Cotizaciones", serie: "0004" },
    { nombre: "Recibos", serie: "0005" },
    { nombre: "Recibos Egreso", serie: "0006" },
    { nombre: "Facturas", serie: "0007" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-gray-800 mb-4">⚙️ Configuración de Series de Comprobantes</h3>
      {reportes.map((rep, idx) => (
        <div key={idx} className="flex items-center justify-between border-b pb-4 hover:bg-gray-50 p-3 rounded transition-colors">
          <div className="flex-1">
            <span className="font-medium text-gray-800">{rep.nombre}</span>
          </div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              defaultValue={rep.serie}
              className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="0001"
            />
            <label className="flex items-center gap-2 text-gray-600 hover:text-gray-800">
              <input type="checkbox" className="w-4 h-4 rounded" />
              <span className="text-sm">Editar</span>
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
    const tabla = resultados.map(r => [r.titulo, formatCordoba(r.valor)]);

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
