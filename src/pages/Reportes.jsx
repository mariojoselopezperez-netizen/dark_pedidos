import React, { useEffect, useState, useMemo } from "react";
import { collection, getDocs } from "firebase/firestore";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from "recharts";
import jsPDF from "jspdf";
import html2canvas from 'html2canvas';

import MetricCard from "../components/MetricCard";
import ReportFilters from "../components/ReportFilters";
import formatCordoba from '../utils/currency';

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
        const fecha = data.date?.toDate ? data.date.toDate() : new Date();
        const fechaStr = fecha.toLocaleDateString();

        ventasData.push({
          id: doc.id,
          fecha: fechaStr,
          total: data.originalOrderTotal || data.totalPaid || 0,
          cliente: data.customerName || "Cliente desconocido",
          tipoPago: data.type || "Desconocido",
          items: data.orderItems || []
        });

        // Flujo
        if (data.type === "cash") flujo.Efectivo += data.totalPaid || data.originalOrderTotal || 0;
        if (data.type === "card") flujo.Tarjeta += data.totalPaid || data.originalOrderTotal || 0;
        if (data.type === "credit") {
          flujo.Crédito += data.totalPaid || data.originalOrderTotal || 0;
          const cliente = data.customerName || "Cliente desconocido";
          cuentas[cliente] = (cuentas[cliente] || 0) + (data.amountPending || 0);
        }

        // Rotación
        (data.orderItems || []).forEach(item => {
          productos[item.name] = (productos[item.name] || 0) + (item.quantity || 0);
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

  // Aplicar filtros (filtroFecha ya convertida a localDateString por ReportFilters)
  useEffect(() => {
    let filtradas = ventasDia;
    if (filtroFecha) filtradas = filtradas.filter(v => v.fecha === filtroFecha);
    if (filtroCliente) filtradas = filtradas.filter(v => v.cliente.toLowerCase().includes(filtroCliente.toLowerCase()));
    if (filtroPago) filtradas = filtradas.filter(v => v.tipoPago === filtroPago);
    setVentasFiltradas(filtradas);
  }, [filtroFecha, filtroCliente, filtroPago, ventasDia]);

  // Totales y métricas derivadas
  const totalVentas = useMemo(() => ventasFiltradas.reduce((s, v) => s + (v.total || 0), 0), [ventasFiltradas]);
  const totalCuentas = useMemo(() => cuentasPorCobrar.reduce((s, c) => s + (c.saldo || 0), 0), [cuentasPorCobrar]);
  const topProducto = useMemo(() => {
    if (!rotacionProductos || rotacionProductos.length === 0) return { nombre: '-', qty: 0 };
    return rotacionProductos.reduce((a, b) => (b.qty > a.qty ? b : a), rotacionProductos[0]);
  }, [rotacionProductos]);

  const exportarPDF = async () => {
    const doc = new jsPDF();
    const nombreRestaurante = "DarkPedidos Restaurante";
    const fechaActual = new Date().toLocaleDateString();

    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text(nombreRestaurante, 105, 20, { align: "center" });

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");
    doc.text("Reporte - " + fechaActual, 105, 30, { align: "center" });

    let y = 40;
    doc.setFontSize(11);
    doc.text(`Total ventas: ${formatCordoba(totalVentas)}`, 15, y);
    doc.text(`Cuentas por cobrar: ${formatCordoba(totalCuentas)}`, 110, y);
    y += 10;

    // Intentar capturar gráficos por id y añadirlos al PDF
    try {
      const chartVentasEl = document.getElementById('chart-ventas');
      const chartFlujoEl = document.getElementById('chart-flujo');
      if (chartVentasEl) {
        const canvas = await html2canvas(chartVentasEl, { backgroundColor: null });
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', 15, y, 180, 60);
        y += 70;
      }
      if (chartFlujoEl) {
        const canvas2 = await html2canvas(chartFlujoEl, { backgroundColor: null });
        const imgData2 = canvas2.toDataURL('image/png');
        if (y + 70 > 280) { doc.addPage(); y = 20; }
        doc.addImage(imgData2, 'PNG', 15, y, 100, 60);
        y += 70;
      }
    } catch (err) {
      console.warn('No se pudieron capturar los charts:', err);
    }

    doc.text(`Top producto: ${topProducto.nombre} (x${topProducto.qty})`, 15, y);
    y += 12;

    doc.text('Detalle de ventas:', 15, y);
    y += 8;

    ventasFiltradas.forEach((v, i) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(`${i + 1}. ${v.fecha} - ${v.cliente} - ${v.tipoPago} - ${formatCordoba(v.total)}`, 15, y);
      y += 7;
    });

    doc.save(`reporte_ventas_${fechaActual}.pdf`);
  };

  const exportarCSV = () => {
    const rows = [];
    const headers = ['Fecha','Cliente','TipoPago','Total','Items'];
    rows.push(headers.join(','));
    ventasFiltradas.forEach(v => {
      const items = (v.items || []).map(it => `${it.name}(x${it.quantity})`).join(' | ');
      const line = [`"${v.fecha}"`,`"${v.cliente.replace(/"/g,'') }"`, v.tipoPago, (v.total||0).toFixed(2), `"${items.replace(/"/g,'') }"`];
      rows.push(line.join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_ventas_${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportarXLSX = async () => {
    try {
      const xlsxModule = await import('xlsx');
      const XLSX = xlsxModule.default || xlsxModule;

      const data = ventasFiltradas.map(v => ({
        Fecha: v.fecha,
        Cliente: v.cliente,
        TipoPago: v.tipoPago,
        Total: (v.total||0).toFixed(2),
        Items: (v.items || []).map(it => `${it.name}(x${it.quantity})`).join(' | ')
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ventas');
      XLSX.writeFile(wb, `reporte_ventas_${new Date().toISOString().slice(0,10)}.xlsx`);
    } catch (err) {
      console.error('Error exportando XLSX:', err);
      alert('Para exportar a XLSX instala la dependencia: npm install xlsx');
    }
  };

  const clearFilters = () => { setFiltroCliente(''); setFiltroFecha(''); setFiltroPago(''); };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Reportes</h2>
          <p className="text-sm text-gray-400">Visión general y análisis</p>
        </div>
        <div className="flex gap-3">
          <button onClick={exportarPDF} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md">Exportar PDF</button>
          <button onClick={exportarCSV} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md">Exportar CSV</button>
          <button onClick={exportarXLSX} className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md">Exportar XLSX</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <MetricCard title="Ventas filtradas" value={formatCordoba(totalVentas)} subtitle={`${ventasFiltradas.length} registros`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>} />
        <MetricCard title="Cuentas por Cobrar" value={formatCordoba(totalCuentas)} subtitle={`${cuentasPorCobrar.length} clientes`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2" /></svg>} />
        <MetricCard title="Top Producto" value={topProducto.nombre} subtitle={`Vendidos: ${topProducto.qty}`} icon={<svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7h18M3 12h18M3 17h18" /></svg>} />
      </div>

      <ReportFilters
        filtroCliente={filtroCliente}
        setFiltroCliente={setFiltroCliente}
        filtroFecha={filtroFecha}
        setFiltroFecha={setFiltroFecha}
        filtroPago={filtroPago}
        setFiltroPago={setFiltroPago}
        onClear={clearFilters}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Ventas del Día</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ventasDia}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
              <XAxis dataKey="fecha" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip />
              <Bar dataKey="total" fill="#06b6d4" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white/5 p-4 rounded-lg">
          <h3 className="text-lg font-semibold text-white mb-2">Flujo de Efectivo</h3>
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
        </div>
      </div>

      <div className="bg-white/5 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-white mb-3">Detalle de Ventas</h3>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left">
            <thead>
              <tr className="text-sm text-gray-400">
                <th className="py-2">Fecha</th>
                <th className="py-2">Cliente</th>
                <th className="py-2">Tipo Pago</th>
                <th className="py-2">Total</th>
                <th className="py-2">Items</th>
              </tr>
            </thead>
            <tbody className="text-sm text-gray-200">
              {ventasFiltradas.map(v => (
                <tr key={v.id} className="border-t border-white/5">
                  <td className="py-3">{v.fecha}</td>
                  <td className="py-3">{v.cliente}</td>
                  <td className="py-3">{v.tipoPago}</td>
                  <td className="py-3">{formatCordoba(v.total)}</td>
                  <td className="py-3">
                    {(v.items || []).map((i, idx) => (
                      <div key={idx} className="text-xs text-gray-400">{i.name} (x{i.quantity})</div>
                    ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
