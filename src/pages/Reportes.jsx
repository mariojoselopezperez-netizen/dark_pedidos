import React, { useEffect, useState } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import jsPDF from "jspdf";

export default function Reportes({ db }) {
  const [ventasDia, setVentasDia] = useState([]);
  const [ventasFiltradas, setVentasFiltradas] = useState([]);
  const [flujoEfectivo, setFlujoEfectivo] = useState([]);
  const [rotacionProductos, setRotacionProductos] = useState([]);
  const [cuentasPorCobrar, setCuentasPorCobrar] = useState([]);

  // Filtros
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroCliente, setFiltroCliente] = useState("");
  const [filtroPago, setFiltroPago] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      const ventasRef = collection(db, "salesRecords");
      const snapshot = await getDocs(ventasRef);

      let ventasData = [];
      let flujo = { Efectivo: 0, Tarjeta: 0, Crédito: 0 };
      let productos = {};
      let cuentas = {};

      snapshot.forEach(doc => {
        const data = doc.data();
        const fecha = data.date?.toDate() || new Date();
        const fechaStr = fecha.toLocaleDateString();

        ventasData.push({
          id: doc.id,
          fecha: fechaStr,
          total: data.originalOrderTotal || 0,
          cliente: data.customerName || "Cliente desconocido",
          tipoPago: data.type || "Desconocido",
          items: data.orderItems || []
        });

        // Flujo
        if (data.type === "cash") flujo.Efectivo += data.totalPaid || 0;
        if (data.type === "card") flujo.Tarjeta += data.totalPaid || 0;
        if (data.type === "credit") {
          flujo.Crédito += data.totalPaid || 0;
          const cliente = data.customerName || "Cliente desconocido";
          cuentas[cliente] = (cuentas[cliente] || 0) + (data.amountPending || 0);
        }

        // Rotación
        (data.orderItems || []).forEach(item => {
          productos[item.name] = (productos[item.name] || 0) + item.quantity;
        });
      });

      setVentasDia(ventasData);
      setVentasFiltradas(ventasData); // Inicial sin filtros
      setFlujoEfectivo(Object.entries(flujo).map(([tipo, total]) => ({ tipo, total })));
      setRotacionProductos(Object.entries(productos).map(([nombre, qty]) => ({ nombre, qty })));
      setCuentasPorCobrar(Object.entries(cuentas).map(([cliente, saldo]) => ({ cliente, saldo })));
    };

    fetchData();
  }, [db]);

  // Aplicar filtros
  useEffect(() => {
    let filtradas = ventasDia;
    if (filtroFecha) filtradas = filtradas.filter(v => v.fecha === filtroFecha);
    if (filtroCliente) filtradas = filtradas.filter(v => v.cliente.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroPago) filtradas = filtradas.filter(v => v.tipoPago === filtroPago);
    setVentasFiltradas(filtradas);
  }, [filtroFecha, filtroCliente, filtroPago, ventasDia]);

  const exportarPDF = () => {
  const doc = new jsPDF();

  // Encabezado
  const nombreRestaurante = "DarkPedidos Restaurante";
  const fechaActual = new Date().toLocaleDateString();

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(nombreRestaurante, 105, 20, { align: "center" });

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.text("Reporte de Ventas - " + fechaActual, 105, 30, { align: "center" });

  // Cuadro principal
  const margenX = 15;
  const margenY = 40;
  const ancho = 180;
  const alto = 120;

  doc.setDrawColor(0);
  doc.setLineWidth(0.5);
  doc.rect(margenX, margenY, ancho, alto); // Dibuja el cuadro

  // Contenido dentro del cuadro
  let startY = margenY + 10;
  doc.setFontSize(10);
  doc.text("Detalle de Ventas del Día:", margenX + 5, startY);

  startY += 10;
  let totalGeneral = 0;

  ventasFiltradas.forEach((venta, i) => {
    if (startY > margenY + alto - 10) {
      doc.addPage(); // Nueva página si nos pasamos
      startY = 20;
    }

    doc.text(
      `${i + 1}. ${venta.fecha} - ${venta.cliente} - ${venta.tipoPago} - $${venta.total.toFixed(2)}`,
      margenX + 5,
      startY
    );
    startY += 8;
    totalGeneral += venta.total;
  });

  // Total general
  startY += 10;
  doc.setFont("helvetica", "bold");
  doc.text(`Total General: $${totalGeneral.toFixed(2)}`, margenX + 5, startY);

  // Guardar PDF
  doc.save(`reporte_ventas_${fechaActual}.pdf`);
};


  return (
    <div style={{ padding: 20 }}>
      <h2>Reportes</h2>

      {/* --- Gráfico Ventas del Día --- */}
      <h3>Ventas del Día</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={ventasDia}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="fecha" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="total" fill="#82ca9d" />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Gráfico Flujo Efectivo --- */}
      <h3>Flujo de Efectivo</h3>
      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie data={flujoEfectivo} dataKey="total" nameKey="tipo" cx="50%" cy="50%" outerRadius={100} label>
            {flujoEfectivo.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={["#0088FE", "#00C49F", "#FFBB28"][index % 3]} />
            ))}
          </Pie>
          <Legend />
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>

      {/* --- Gráfico Rotación Productos --- */}
      <h3>Rotación de Productos</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={rotacionProductos}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="nombre" />
          <YAxis />
          <Tooltip />
          <Bar dataKey="qty" fill="#8884d8" />
        </BarChart>
      </ResponsiveContainer>

      {/* --- Cuentas por Cobrar --- */}
      <h3>Cuentas por Cobrar</h3>
      <ul>
        {cuentasPorCobrar.map((c, i) => (
          <li key={i}>{c.cliente}: ${c.saldo.toFixed(2)}</li>
        ))}
      </ul>

      {/* --- Filtros y Detalle Ventas --- */}
      <h3>Detalle de Ventas del Día</h3>
      <div style={{ marginBottom: 20 }}>
        <input type="text" placeholder="Filtrar por cliente" value={filtroCliente} onChange={e => setFiltroCliente(e.target.value)} style={{ marginRight: 10 }} />
        <input type="date" onChange={e => setFiltroFecha(new Date(e.target.value).toLocaleDateString())} style={{ marginRight: 10 }} />
        <select value={filtroPago} onChange={e => setFiltroPago(e.target.value)}>
          <option value="">Todos</option>
          <option value="cash">Efectivo</option>
          <option value="card">Tarjeta</option>
          <option value="credit">Crédito</option>
        </select>
      </div>

      <table border="1" cellPadding="8" cellSpacing="0" style={{ width: "100%", marginBottom: 20 }}>
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Cliente</th>
            <th>Tipo Pago</th>
            <th>Total</th>
            <th>Items</th>
          </tr>
        </thead>
        <tbody>
          {ventasFiltradas.map(v => (
            <tr key={v.id}>
              <td>{v.fecha}</td>
              <td>{v.cliente}</td>
              <td>{v.tipoPago}</td>
              <td>${v.total.toFixed(2)}</td>
              <td>
                {v.items.map((i, idx) => (
                  <div key={idx}>{i.name} (x{i.quantity})</div>
                ))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button onClick={exportarPDF} style={{ marginTop: 10, padding: 10, background: "green", color: "white" }}>
        Exportar PDF
      </button>
    </div>
  );
}
