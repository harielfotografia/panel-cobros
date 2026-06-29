import { prisma } from "@/lib/prisma";
import { Download, TrendingUp, CheckCircle2, Clock, Users, CreditCard, ArrowUpRight } from "lucide-react";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, { cls: string; label: string }> = {
  CONFIRMADO: { cls: "bg-green-100 text-green-700", label: "Confirmado" },
  PENDIENTE:  { cls: "bg-yellow-100 text-yellow-700", label: "Pendiente" },
  FALLIDO:    { cls: "bg-red-100 text-red-700", label: "Fallido" },
};

const METODO_LABEL: Record<string, string> = {
  MERCADOPAGO:   "MercadoPago",
  TRANSBANK:     "Webpay",
  TRANSFERENCIA: "Transferencia",
};

const METODO_COLOR: Record<string, string> = {
  MERCADOPAGO:   "bg-sky-100 text-sky-700",
  TRANSBANK:     "bg-purple-100 text-purple-700",
  TRANSFERENCIA: "bg-teal-100 text-teal-700",
};

function formatFecha(d: Date) {
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export default async function PagosPage() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

  const [pagos, statsMes, statsMesAnt, pendientes, totalActivos] = await Promise.all([
    prisma.pago.findMany({
      include: { suscripcion: { include: { cliente: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    prisma.pago.aggregate({
      where: { estado: "CONFIRMADO", fechaPago: { gte: inicioMes } },
      _sum: { monto: true },
      _count: true,
    }),
    prisma.pago.aggregate({
      where: { estado: "CONFIRMADO", fechaPago: { gte: inicioMesAnterior, lte: finMesAnterior } },
      _sum: { monto: true },
    }),
    prisma.pago.findMany({
      where: { estado: "PENDIENTE" },
      include: { suscripcion: { include: { cliente: true } } },
    }),
    prisma.cliente.count({ where: { estado: "ACTIVO" } }),
  ]);

  const ingresosMes = statsMes._sum.monto ?? 0;
  const ingresosMesAnt = statsMesAnt._sum.monto ?? 0;
  const pctCambio = ingresosMesAnt > 0
    ? Math.round(((ingresosMes - ingresosMesAnt) / ingresosMesAnt) * 100)
    : 0;
  const montoPendiente = pendientes.reduce((a, p) => a + p.monto, 0);

  const statCards = [
    {
      label: "Ingresos este mes",
      value: `$${ingresosMes.toLocaleString("es-CL")}`,
      sub: pctCambio >= 0 ? `↑ ${pctCambio}% vs mes anterior` : `↓ ${Math.abs(pctCambio)}% vs mes anterior`,
      subColor: pctCambio >= 0 ? "text-green-600" : "text-red-500",
      icon: <TrendingUp size={18} className="text-blue-600" />,
      bg: "bg-blue-50",
    },
    {
      label: "Pagos confirmados",
      value: String(statsMes._count),
      sub: "este mes",
      subColor: "text-gray-400",
      icon: <CheckCircle2 size={18} className="text-green-600" />,
      bg: "bg-green-50",
    },
    {
      label: "Pendientes",
      value: String(pendientes.length),
      sub: montoPendiente > 0 ? `$${montoPendiente.toLocaleString("es-CL")}` : "Sin monto pendiente",
      subColor: "text-orange-500",
      icon: <Clock size={18} className="text-orange-500" />,
      bg: "bg-orange-50",
    },
    {
      label: "Total clientes activos",
      value: String(totalActivos),
      sub: `de ${await prisma.cliente.count()} totales`,
      subColor: "text-gray-400",
      icon: <Users size={18} className="text-purple-600" />,
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Pagos y Cobros</h1>
          <p className="text-sm text-gray-400 mt-0.5">Historial de pagos recibidos de tus clientes</p>
        </div>
        <button className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-4 py-2.5 rounded-xl transition-colors">
          <Download size={15} /> Exportar
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {statCards.map((s, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow duration-200">
            <div className="flex items-start justify-between mb-3">
              <p className="text-xs text-gray-400 font-medium">{s.label}</p>
              <div className={`w-8 h-8 ${s.bg} rounded-lg flex items-center justify-center`}>{s.icon}</div>
            </div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{s.value}</p>
            <p className={`text-xs font-medium ${s.subColor}`}>{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filtros */}
        <div className="px-5 py-3.5 border-b border-gray-100 flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-48">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input placeholder="Buscar cliente o referencia..." className="w-full pl-9 pr-4 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <select className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
            <option>Fecha: Últimos 30 días</option>
            <option>Este mes</option>
            <option>Últimos 3 meses</option>
            <option>Todo el año</option>
          </select>
          <select className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
            <option>Todos los métodos</option>
            <option>MercadoPago</option>
            <option>Webpay</option>
            <option>Transferencia</option>
          </select>
          <select className="text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-600">
            <option>Todos los estados</option>
            <option>Confirmado</option>
            <option>Pendiente</option>
            <option>Fallido</option>
          </select>
        </div>

        {/* Tabla desktop */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left px-5 py-3 font-medium">Fecha</th>
                <th className="text-left px-5 py-3 font-medium">Cliente</th>
                <th className="text-right px-5 py-3 font-medium">Monto</th>
                <th className="text-left px-5 py-3 font-medium">Método</th>
                <th className="text-left px-5 py-3 font-medium">Estado</th>
                <th className="text-left px-5 py-3 font-medium">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p, i) => {
                const estado = ESTADO_BADGE[p.estado] ?? { cls: "bg-gray-100 text-gray-500", label: p.estado };
                return (
                  <tr
                    key={p.id}
                    className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors duration-100"
                    style={{ animationDelay: `${i * 30}ms` }}
                  >
                    <td className="px-5 py-3.5 text-gray-500 text-xs whitespace-nowrap">
                      {formatFecha(p.fechaPago ?? p.createdAt)}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-gray-900">{p.suscripcion.cliente.nombre}</p>
                      <p className="text-xs text-gray-400">{p.suscripcion.cliente.dominio}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-semibold text-gray-900">${p.monto.toLocaleString("es-CL")}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${METODO_COLOR[p.metodoPago] ?? "bg-gray-100 text-gray-500"}`}>
                        {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${estado.cls}`}>
                        {estado.label}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-gray-400 text-xs font-mono">{p.referencia ?? "—"}</td>
                  </tr>
                );
              })}
              {pagos.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-16">
                    <CreditCard size={32} className="mx-auto mb-3 text-gray-200" />
                    No hay pagos registrados aún
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Cards móvil */}
        <div className="lg:hidden divide-y divide-gray-50">
          {pagos.map((p) => {
            const estado = ESTADO_BADGE[p.estado] ?? { cls: "bg-gray-100 text-gray-500", label: p.estado };
            return (
              <div key={p.id} className="px-4 py-4 hover:bg-gray-50/50 transition-colors">
                <div className="flex items-start justify-between mb-1.5">
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{p.suscripcion.cliente.nombre}</p>
                    <p className="text-xs text-gray-400">{formatFecha(p.fechaPago ?? p.createdAt)}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${estado.cls}`}>{estado.label}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-gray-900">${p.monto.toLocaleString("es-CL")}</span>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${METODO_COLOR[p.metodoPago] ?? "bg-gray-100 text-gray-500"}`}>
                    {METODO_LABEL[p.metodoPago] ?? p.metodoPago}
                  </span>
                </div>
              </div>
            );
          })}
          {pagos.length === 0 && <p className="text-center text-gray-400 py-10">No hay pagos aún</p>}
        </div>

        {/* Paginación */}
        {pagos.length > 0 && (
          <div className="px-5 py-3.5 border-t border-gray-100 flex items-center justify-between text-sm text-gray-500">
            <span>Mostrando 1 a {Math.min(pagos.length, 10)} de {pagos.length} pagos</span>
            <div className="flex items-center gap-1">
              <button className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs transition-colors">‹</button>
              <button className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-medium">1</button>
              {pagos.length > 10 && <button className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs transition-colors">2</button>}
              <button className="w-8 h-8 rounded-lg border border-gray-200 hover:bg-gray-50 flex items-center justify-center text-xs transition-colors">›</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
