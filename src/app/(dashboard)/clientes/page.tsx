import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { Users, CheckCircle2, PauseCircle, Calendar, Download, Plus, Eye, PauseCircle as PauseIcon, PlayCircle, LogIn } from "lucide-react";
import { ClienteAcciones } from "@/components/ClienteAcciones";

export const dynamic = "force-dynamic";

const ESTADO_MAP: Record<string, { label: string; clase: string; dot: string }> = {
  ACTIVO:     { label: "Activo",      clase: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  SUSPENDIDO: { label: "Suspendido",  clase: "bg-red-100 text-red-600",     dot: "bg-red-500" },
  CANCELADO:  { label: "Cancelado",   clase: "bg-gray-100 text-gray-500",   dot: "bg-gray-400" },
};

function progreso(fechaInicio: Date, fechaVencimiento: Date): { pct: number; diasRestantes: number; vencida: boolean } {
  const ahora = new Date();
  const total = fechaVencimiento.getTime() - fechaInicio.getTime();
  const transcurrido = ahora.getTime() - fechaInicio.getTime();
  const pct = total > 0 ? Math.max(0, Math.min(100, Math.round((transcurrido / total) * 100))) : 0;
  const msRestantes = fechaVencimiento.getTime() - ahora.getTime();
  const diasRestantes = Math.ceil(msRestantes / 86400000);
  return { pct, diasRestantes, vencida: diasRestantes < 0 };
}

function colorBarra(pct: number, vencida: boolean) {
  if (vencida) return "bg-red-400";
  if (pct >= 85) return "bg-orange-400";
  if (pct >= 60) return "bg-yellow-400";
  return "bg-green-500";
}

function Avatar({ nombre, idx }: { nombre: string; idx: number }) {
  const paletas = [
    "bg-blue-100 text-blue-700", "bg-purple-100 text-purple-700",
    "bg-orange-100 text-orange-700", "bg-pink-100 text-pink-700",
    "bg-teal-100 text-teal-700",
  ];
  return (
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${paletas[idx % paletas.length]}`}>
      {nombre.slice(0, 2).toUpperCase()}
    </div>
  );
}

export default async function ClientesPage({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; planId?: string; q?: string }>;
}) {
  const sp = await searchParams;
  const filtroEstado = sp.estado ?? "";
  const filtroPlan   = sp.planId ?? "";
  const q            = sp.q ?? "";

  const [clientes, planes, stats] = await Promise.all([
    prisma.cliente.findMany({
      where: {
        ...(filtroEstado ? { estado: filtroEstado as never } : {}),
        ...(filtroPlan   ? { planId: filtroPlan } : {}),
        ...(q ? {
          OR: [
            { nombre: { contains: q, mode: "insensitive" } },
            { email:  { contains: q, mode: "insensitive" } },
            { dominio:{ contains: q, mode: "insensitive" } },
          ],
        } : {}),
      },
      include: {
        plan: true,
        vendedora: { select: { nombre: true } },
        suscripciones: { where: { activa: true }, orderBy: { createdAt: "desc" }, take: 1 },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.plan.findMany({ where: { activo: true }, orderBy: { nombre: "asc" } }),
    Promise.all([
      prisma.cliente.count(),
      prisma.cliente.count({ where: { estado: "ACTIVO" } }),
      prisma.cliente.count({ where: { estado: "SUSPENDIDO" } }),
      prisma.suscripcion.count({
        where: {
          activa: true,
          fechaVencimiento: { lte: new Date(Date.now() + 30 * 86400000), gte: new Date() },
        },
      }),
    ]),
  ]);

  const [total, activos, suspendidos, porVencer] = stats;

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Users size={20} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Clientes</h1>
            <p className="text-sm text-gray-500">Administra todos los clientes y sus servicios.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-4 py-2 rounded-lg transition-colors">
            <Download size={15} /> Exportar
          </button>
          <Link href="/clientes/nuevo"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} /> Nuevo cliente
          </Link>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total clientes" value={total} icon={<Users size={20} className="text-blue-600" />} bg="bg-blue-50"
          sub={`↑ ${Math.max(0, clientes.filter(c => {
            const d = new Date(); d.setDate(1);
            return new Date(c.createdAt) >= d;
          }).length)} este mes`} subColor="text-green-600" />
        <StatCard label="Activos" value={activos} icon={<CheckCircle2 size={20} className="text-green-600" />} bg="bg-green-50"
          bar={total > 0 ? Math.round(activos/total*100) : 0} barColor="bg-green-500"
          sub={`${total > 0 ? Math.round(activos/total*100) : 0}% del total`} subColor="text-green-600" />
        <StatCard label="Suspendidos" value={suspendidos} icon={<PauseCircle size={20} className="text-orange-500" />} bg="bg-orange-50"
          bar={total > 0 ? Math.round(suspendidos/total*100) : 0} barColor="bg-orange-400"
          sub={`${total > 0 ? Math.round(suspendidos/total*100) : 0}% del total`} subColor="text-orange-500" />
        <StatCard label="Por vencer (30 días)" value={porVencer} icon={<Calendar size={20} className="text-purple-600" />} bg="bg-purple-50"
          bar={total > 0 ? Math.round(porVencer/total*100) : 0} barColor="bg-purple-400"
          sub={`${total > 0 ? Math.round(porVencer/total*100) : 0}% del total`} subColor="text-purple-600" />
      </div>

      {/* Filtros */}
      <form className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-52">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input name="q" defaultValue={q} placeholder="Buscar cliente, dominio o email..."
            className="w-full pl-9 pr-4 py-2 text-sm bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <select name="estado" defaultValue={filtroEstado}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los estados</option>
          <option value="ACTIVO">Activo</option>
          <option value="SUSPENDIDO">Suspendido</option>
          <option value="CANCELADO">Cancelado</option>
        </select>
        <select name="planId" defaultValue={filtroPlan}
          className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
          <option value="">Todos los planes</option>
          {planes.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
          Filtrar
        </button>
        {(q || filtroEstado || filtroPlan) && (
          <Link href="/clientes" className="text-sm text-gray-400 hover:text-gray-600 px-2">Limpiar</Link>
        )}
      </form>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-5 py-3 hidden lg:table-cell">Plan</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Próximo vencimiento</th>
                <th className="text-left px-5 py-3 hidden xl:table-cell w-48">Progreso</th>
                <th className="text-right px-5 py-3">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c, idx) => {
                const sub = c.suscripciones[0];
                const { pct, diasRestantes, vencida } = sub
                  ? progreso(new Date(sub.fechaInicio), new Date(sub.fechaVencimiento))
                  : { pct: 0, diasRestantes: 0, vencida: false };
                const estado = ESTADO_MAP[c.estado] ?? ESTADO_MAP.CANCELADO;
                const suspendido = c.estado === "SUSPENDIDO";

                return (
                  <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 transition-colors">
                    {/* Cliente */}
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <Avatar nombre={c.nombre} idx={idx} />
                        <div>
                          <p className="font-semibold text-gray-900">{c.nombre}</p>
                          <p className="text-xs text-gray-400">{c.dominio}</p>
                          <p className="text-xs text-gray-400">{c.email}</p>
                        </div>
                      </div>
                    </td>
                    {/* Plan */}
                    <td className="px-5 py-4 hidden lg:table-cell">
                      {c.plan ? (
                        <div>
                          <p className="font-medium text-gray-900">{c.plan.nombre}</p>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                            {c.plan.maxProfesionales === 0 ? "Ilimitado" : `${c.plan.maxProfesionales} profesionales`}
                          </span>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Estado */}
                    <td className="px-5 py-4">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${estado.clase}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${estado.dot}`} />
                        {estado.label}
                      </span>
                    </td>
                    {/* Vencimiento */}
                    <td className="px-5 py-4 hidden md:table-cell">
                      {sub ? (
                        <div>
                          <p className={`font-medium text-sm ${vencida ? "text-red-600" : "text-gray-900"}`}>
                            {new Date(sub.fechaVencimiento).toLocaleDateString("es-CL", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                          <p className={`text-xs ${vencida ? "text-red-500" : "text-green-600"}`}>
                            {vencida ? `Venció hace ${Math.abs(diasRestantes)} días` : `${diasRestantes} días restantes`}
                          </p>
                        </div>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    {/* Progreso */}
                    <td className="px-5 py-4 hidden xl:table-cell">
                      {sub && !suspendido ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-700">{pct}%</span>
                          </div>
                          <div className="h-1.5 bg-gray-100 rounded-full w-32">
                            <div className={`h-1.5 rounded-full transition-all ${colorBarra(pct, vencida)}`} style={{ width: `${Math.min(100, pct)}%` }} />
                          </div>
                          <p className={`text-xs mt-1 ${vencida ? "text-red-500" : "text-green-600"}`}>
                            {vencida ? "Venció" : `${diasRestantes} días restantes`}
                          </p>
                        </div>
                      ) : suspendido ? (
                        <div>
                          <div className="h-1.5 bg-gray-100 rounded-full w-32" />
                          <p className="text-xs text-red-500 mt-1">Servicio suspendido</p>
                        </div>
                      ) : <span className="text-gray-300 text-xs">Sin suscripción</span>}
                    </td>
                    {/* Acciones */}
                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-1">
                        <ClienteAcciones id={c.id} estado={c.estado} />
                      </div>
                    </td>
                  </tr>
                );
              })}
              {clientes.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center text-gray-400 py-16">
                    <Users size={32} className="mx-auto mb-3 text-gray-200" />
                    No se encontraron clientes con esos filtros
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {clientes.length > 0 && (
          <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
            <span>Mostrando {clientes.length} cliente{clientes.length !== 1 ? "s" : ""}</span>
            <Link href="/clientes/nuevo" className="text-blue-600 hover:text-blue-500 font-medium">+ Nuevo cliente</Link>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, bg, sub, subColor, bar, barColor }: {
  label: string; value: number; icon: React.ReactNode; bg: string;
  sub?: string; subColor?: string; bar?: number; barColor?: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-500">{label}</p>
        <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
      {bar !== undefined && barColor && (
        <div className="h-1 bg-gray-100 rounded-full mb-1.5">
          <div className={`h-1 rounded-full ${barColor}`} style={{ width: `${bar}%` }} />
        </div>
      )}
      {sub && <p className={`text-xs font-medium ${subColor ?? "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
