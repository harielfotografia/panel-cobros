import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { GraficoIngresos } from "@/components/GraficoIngresos";
import { ArrowUpRight, Users, CheckCircle2, PauseCircle, DollarSign, ChevronRight, AlertCircle, Clock, TrendingUp } from "lucide-react";

export const dynamic = "force-dynamic";

async function getDashboardData() {
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
  const finMesAnterior = new Date(ahora.getFullYear(), ahora.getMonth(), 0);

  const [
    totalClientes,
    activos,
    suspendidos,
    ingresosMes,
    ingresosMesAnterior,
    vencenProximo,
    pagosRecientes,
    logsRecientes,
    anuncios,
    pagos6Meses,
  ] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { estado: "ACTIVO" } }),
    prisma.cliente.count({ where: { estado: "SUSPENDIDO" } }),
    prisma.pago.aggregate({
      where: { estado: "CONFIRMADO", fechaPago: { gte: inicioMes } },
      _sum: { monto: true },
    }),
    prisma.pago.aggregate({
      where: { estado: "CONFIRMADO", fechaPago: { gte: inicioMesAnterior, lte: finMesAnterior } },
      _sum: { monto: true },
    }),
    prisma.suscripcion.findMany({
      where: {
        activa: true,
        fechaVencimiento: { lte: new Date(Date.now() + 7 * 86400000), gte: ahora },
      },
      include: { cliente: { include: { plan: true } } },
      orderBy: { fechaVencimiento: "asc" },
      take: 5,
    }),
    prisma.pago.findMany({
      where: { estado: "CONFIRMADO" },
      include: { suscripcion: { include: { cliente: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.logSuspension.findMany({
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.anuncio.findMany({
      where: { activo: true },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 4,
    }),
    prisma.pago.findMany({
      where: { estado: "CONFIRMADO", fechaPago: { gte: new Date(Date.now() - 180 * 86400000) } },
      select: { monto: true, fechaPago: true },
    }),
  ]);

  // Agrupar pagos por mes para el gráfico
  const porMes: Record<string, number> = {};
  for (const p of pagos6Meses) {
    const fecha = p.fechaPago ?? new Date();
    const key = `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, "0")}`;
    porMes[key] = (porMes[key] ?? 0) + p.monto;
  }
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const datosGrafico = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .slice(-6)
    .map(([key, total]) => ({
      mes: meses[parseInt(key.split("-")[1]) - 1],
      total,
    }));

  // Actividad reciente combinada
  const actividad = [
    ...pagosRecientes.map((p) => ({
      tipo: "pago" as const,
      texto: "Pago recibido",
      sub: p.suscripcion.cliente.nombre,
      tiempo: p.createdAt,
      color: "text-green-600 bg-green-100",
    })),
    ...logsRecientes.map((l) => ({
      tipo: l.accion === "SUSPENDIDO" ? "suspension" as const : "reactivacion" as const,
      texto: l.accion === "SUSPENDIDO" ? "Servicio suspendido" : "Servicio reactivado",
      sub: l.cliente?.nombre ?? l.clienteId,
      tiempo: l.createdAt,
      color: l.accion === "SUSPENDIDO" ? "text-red-600 bg-red-100" : "text-blue-600 bg-blue-100",
    })),
  ]
    .sort((a, b) => b.tiempo.getTime() - a.tiempo.getTime())
    .slice(0, 5);

  const ingresosActual = ingresosMes._sum.monto ?? 0;
  const ingresosAnterior = ingresosMesAnterior._sum.monto ?? 1;
  const variacionPct = Math.round(((ingresosActual - ingresosAnterior) / ingresosAnterior) * 100);

  return {
    totalClientes, activos, suspendidos,
    ingresosActual, variacionPct,
    vencenProximo, actividad, anuncios, datosGrafico,
    pendientesPago: suspendidos,
  };
}

const TIPO_ANUNCIO: Record<string, { label: string; color: string; bg: string }> = {
  INFO: { label: "Info", color: "text-blue-700", bg: "bg-blue-100" },
  EXITO: { label: "Novedad", color: "text-green-700", bg: "bg-green-100" },
  ADVERTENCIA: { label: "Atención", color: "text-yellow-700", bg: "bg-yellow-100" },
  MANTENIMIENTO: { label: "Mantenimiento", color: "text-blue-700", bg: "bg-blue-100" },
};

function tiempoRelativo(fecha: Date) {
  const diff = Date.now() - fecha.getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "Hace menos de 1h";
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

export default async function ResumenPage() {
  const d = await getDashboardData();

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">
          ¡Bienvenido de vuelta, Administrador! 👋
        </h1>
        <p className="text-sm text-gray-500 mt-0.5">Aquí tienes un resumen general de todos tus sistemas.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        <StatCard
          label="Total Clientes"
          value={d.totalClientes}
          icon={<Users className="text-blue-600" size={22} />}
          bg="bg-blue-50"
        />
        <StatCard
          label="Activos"
          value={d.activos}
          icon={<CheckCircle2 className="text-green-600" size={22} />}
          bg="bg-green-50"
          sub={`${Math.round((d.activos / (d.totalClientes || 1)) * 100)}% del total`}
          subColor="text-green-600"
        />
        <StatCard
          label="Suspendidos"
          value={d.suspendidos}
          icon={<PauseCircle className="text-orange-500" size={22} />}
          bg="bg-orange-50"
          sub={`${Math.round((d.suspendidos / (d.totalClientes || 1)) * 100)}% del total`}
          subColor="text-orange-500"
        />
        <StatCard
          label="Ingresos este mes"
          value={`$${d.ingresosActual.toLocaleString("es-CL")}`}
          icon={<DollarSign className="text-purple-600" size={22} />}
          bg="bg-purple-50"
          sub={`${d.variacionPct >= 0 ? "+" : ""}${d.variacionPct}% vs mes anterior`}
          subColor={d.variacionPct >= 0 ? "text-green-600" : "text-red-500"}
        />
      </div>

      {/* Middle row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Vencen pronto */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Clock size={15} className="text-gray-400" />
              Vencen en los próximos 7 días
            </h2>
            <Link href="/clientes" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-2">
            {d.vencenProximo.length === 0 && (
              <p className="text-sm text-gray-400 text-center py-4">Sin vencimientos próximos</p>
            )}
            {d.vencenProximo.map((s) => {
              const dias = Math.ceil((new Date(s.fechaVencimiento).getTime() - Date.now()) / 86400000);
              const color = dias <= 2 ? "text-red-500 bg-red-50" : dias <= 4 ? "text-orange-500 bg-orange-50" : "text-yellow-600 bg-yellow-50";
              return (
                <Link
                  key={s.id}
                  href={`/clientes/${s.clienteId}`}
                  className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-gray-50 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 text-blue-600 text-xs font-bold">
                    {s.cliente.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{s.cliente.nombre}</p>
                    <p className="text-xs text-gray-400 truncate">{s.cliente.dominio}{s.cliente.plan ? ` · Plan ${s.cliente.plan.nombre}` : ""}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${color}`}>{dias}d</span>
                    <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Gráfico */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp size={15} className="text-gray-400" />
              Resumen de ingresos
            </h2>
            <span className="text-xs text-gray-400">Últimos 6 meses</span>
          </div>
          <p className="text-2xl font-bold text-gray-900 mb-4">
            ${d.ingresosActual.toLocaleString("es-CL")}
          </p>
          <GraficoIngresos data={d.datosGrafico} />
        </div>

        {/* Atención + Actividad */}
        <div className="space-y-4">
          {/* Atención */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertCircle size={15} className="text-red-400" />
              Atención requerida
              {d.suspendidos > 0 && (
                <span className="ml-auto text-xs font-bold text-white bg-red-500 rounded-full w-5 h-5 flex items-center justify-center">
                  {d.suspendidos}
                </span>
              )}
            </h2>
            <div className="space-y-2">
              {d.suspendidos > 0 && (
                <Link href="/clientes" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
                      <PauseCircle size={14} className="text-red-500" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{d.suspendidos} {d.suspendidos === 1 ? "servicio suspendido" : "servicios suspendidos"}</p>
                      <p className="text-[11px] text-gray-400">Acción necesaria</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                </Link>
              )}
              {d.vencenProximo.length > 0 && (
                <Link href="/clientes" className="flex items-center justify-between p-2.5 rounded-lg hover:bg-gray-50 group">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-yellow-100 flex items-center justify-center">
                      <Clock size={14} className="text-yellow-600" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-900">{d.vencenProximo.length} {d.vencenProximo.length === 1 ? "plan por vencer" : "planes por vencer"}</p>
                      <p className="text-[11px] text-gray-400">En los próximos 7 días</p>
                    </div>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 group-hover:text-gray-500" />
                </Link>
              )}
              {d.suspendidos === 0 && d.vencenProximo.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Todo al día ✓</p>
              )}
            </div>
          </div>

          {/* Actividad reciente */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900">Actividad reciente</h2>
              <Link href="/pagos" className="text-xs text-blue-600 hover:underline">Ver todas</Link>
            </div>
            <div className="space-y-2">
              {d.actividad.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-2">Sin actividad reciente</p>
              )}
              {d.actividad.map((a, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${a.color}`}>
                    <ArrowUpRight size={12} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-gray-900">{a.texto}</p>
                    <p className="text-[11px] text-gray-400 truncate">{a.sub}</p>
                  </div>
                  <span className="text-[11px] text-gray-400 flex-shrink-0">{tiempoRelativo(a.tiempo)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Anuncios */}
      {d.anuncios.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-gray-900">Anuncios y novedades</h2>
            <Link href="/anuncios" className="text-xs text-blue-600 hover:underline">Ver todos</Link>
          </div>
          <div className="space-y-3">
            {d.anuncios.map((a) => {
              const t = TIPO_ANUNCIO[a.tipo] ?? TIPO_ANUNCIO.INFO;
              return (
                <div key={a.id} className="flex items-start gap-4 py-3 border-b border-gray-100 last:border-0">
                  <div className={`w-8 h-8 rounded-lg ${t.bg} flex items-center justify-center flex-shrink-0`}>
                    <span className={`text-xs font-bold ${t.color}`}>{t.label[0]}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`text-xs font-medium ${t.color}`}>{t.label}</span>
                      <span className="text-[11px] text-gray-400">{a.cliente ? a.cliente.nombre : "Global"}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{a.mensaje}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">
                    {a.createdAt.toLocaleDateString("es-CL")}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({
  label, value, icon, bg, sub, subColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  bg: string;
  sub?: string;
  subColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 lg:p-5">
      <div className="flex items-start justify-between mb-2 lg:mb-3">
        <p className="text-xs lg:text-sm text-gray-500">{label}</p>
        <div className={`w-8 h-8 lg:w-10 lg:h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl lg:text-3xl font-bold text-gray-900">{value}</p>
      {sub && <p className={`text-xs mt-1 font-medium ${subColor ?? "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
