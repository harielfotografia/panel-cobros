"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  TrendingUp, Users, CheckCircle2, PauseCircle, DollarSign,
  Phone, Mail, Globe, LogOut, Download, Info, Receipt
} from "lucide-react";

interface VendedoraData {
  vendedora: { id: string; nombre: string; email: string | null; telefono: string | null; rut: string | null; comisionPct: number };
  stats: {
    totalClientes: number; clientesActivos: number; clientesSuspendidos: number;
    ingresosTotales: number; comisionPct: number;
    comisionNeta: number; ivaComision: number; comisionBruta: number;
  };
  clientes: {
    id: string; nombre: string; email: string; telefono: string | null; dominio: string; estado: string;
    plan: string | null; montoPlan: number | null;
    suscripcionActiva: { monto: number; fechaVencimiento: string; pagosConfirmados: number; ingresoTotal: number } | null;
  }[];
}

const ESTADO = {
  ACTIVO:     { cls: "bg-green-100 text-green-700", label: "Activo" },
  SUSPENDIDO: { cls: "bg-red-100 text-red-600", label: "Suspendido" },
  CANCELADO:  { cls: "bg-gray-100 text-gray-500", label: "Cancelado" },
};

export default function VendedoraPortal() {
  const router = useRouter();
  const [data, setData] = useState<VendedoraData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/vendedoras/mis-datos")
      .then(r => { if (r.status === 401) { router.push("/vendedora/login"); return null; } return r.json(); })
      .then(d => { if (d) setData(d); setLoading(false); });
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/vendedora/login");
  }

  function exportarExcel() {
    if (!data) return;
    const rows = [
      ["Nombre", "Dominio", "Email", "Teléfono", "Plan", "Estado", "Monto Plan", "Vencimiento", "Ingresos Generados"],
      ...data.clientes.map(c => [
        c.nombre, c.dominio, c.email, c.telefono ?? "",
        c.plan ?? "", c.estado, c.montoPlan ? `$${c.montoPlan.toLocaleString("es-CL")}` : "",
        c.suscripcionActiva ? new Date(c.suscripcionActiva.fechaVencimiento).toLocaleDateString("es-CL") : "",
        c.suscripcionActiva ? `$${c.suscripcionActiva.ingresoTotal.toLocaleString("es-CL")}` : "$0",
      ]),
    ];
    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url;
    a.download = `mis-clientes-${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="w-10 h-10 border-2 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-400 text-sm">Cargando...</p>
      </div>
    </div>
  );
  if (!data) return null;

  const { vendedora, stats, clientes } = data;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center">
            <TrendingUp size={18} className="text-white" />
          </div>
          <div>
            <p className="font-bold text-gray-900">{vendedora.nombre}</p>
            <p className="text-xs text-gray-400">{vendedora.rut ?? vendedora.email ?? "Vendedora"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={exportarExcel}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-3 py-2 rounded-xl transition-colors">
            <Download size={15} /> Exportar Excel
          </button>
          <button onClick={handleLogout}
            className="flex items-center gap-2 text-gray-400 hover:text-red-500 text-sm px-3 py-2 rounded-xl transition-colors">
            <LogOut size={15} /> Salir
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 space-y-6">

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard icon={<Users size={18} className="text-blue-600" />} bg="bg-blue-50"
            label="Total clientes" value={stats.totalClientes} sub={`${stats.clientesActivos} activos`} subColor="text-green-600" />
          <StatCard icon={<CheckCircle2 size={18} className="text-green-600" />} bg="bg-green-50"
            label="Activos" value={stats.clientesActivos} sub={`${stats.clientesSuspendidos} suspendidos`} subColor="text-red-500" />
          <StatCard icon={<DollarSign size={18} className="text-purple-600" />} bg="bg-purple-50"
            label="Ingresos generados" value={`$${stats.ingresosTotales.toLocaleString("es-CL")}`}
            sub={`${stats.comisionPct}% comisión`} subColor="text-purple-600" />
          <StatCard icon={<Receipt size={18} className="text-orange-500" />} bg="bg-orange-50"
            label="Tu comisión bruta" value={`$${stats.comisionBruta.toLocaleString("es-CL")}`}
            sub="incluye IVA boleta" subColor="text-orange-500" />
        </div>

        {/* Desglose comisión */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Receipt size={18} className="text-gray-500" />
            <h2 className="font-semibold text-gray-900">Desglose de comisión</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-xs text-gray-400 mb-1">Comisión neta ({stats.comisionPct}%)</p>
              <p className="text-2xl font-bold text-gray-900">${stats.comisionNeta.toLocaleString("es-CL")}</p>
              <p className="text-xs text-gray-400 mt-1">Sobre ${stats.ingresosTotales.toLocaleString("es-CL")} en ventas</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center border border-orange-100">
              <p className="text-xs text-orange-500 mb-1">IVA boleta (19%)</p>
              <p className="text-2xl font-bold text-orange-600">${stats.ivaComision.toLocaleString("es-CL")}</p>
              <p className="text-xs text-orange-400 mt-1">Debes incluirlo en tu boleta</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 text-center border border-green-100">
              <p className="text-xs text-green-600 mb-1">Total a cobrar (bruto)</p>
              <p className="text-2xl font-bold text-green-700">${stats.comisionBruta.toLocaleString("es-CL")}</p>
              <p className="text-xs text-green-500 mt-1">Neto + IVA 19%</p>
            </div>
          </div>
          <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 flex items-start gap-2">
            <Info size={15} className="text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700">
              Como trabajador independiente debes emitir una <strong>boleta de honorarios</strong> por el monto bruto
              (${stats.comisionBruta.toLocaleString("es-CL")}). El IVA de ${stats.ivaComision.toLocaleString("es-CL")} es retenido
              por la empresa y pagado al SII. Tu pago neto es ${stats.comisionNeta.toLocaleString("es-CL")}.
            </p>
          </div>
        </div>

        {/* Lista clientes */}
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-semibold text-gray-900">Mis clientes ({clientes.length})</h2>
            <span className="text-xs text-gray-400">Solo lectura</span>
          </div>
          <div className="divide-y divide-gray-50">
            {clientes.map((c, i) => {
              const est = ESTADO[c.estado as keyof typeof ESTADO] ?? ESTADO.CANCELADO;
              const diasRestantes = c.suscripcionActiva
                ? Math.ceil((new Date(c.suscripcionActiva.fechaVencimiento).getTime() - Date.now()) / 86400000)
                : 0;
              const vencida = diasRestantes < 0;
              return (
                <div key={c.id}
                  className="px-5 py-4 hover:bg-gray-50/50 transition-colors animate-fade-in-up"
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-bold flex-shrink-0">
                        {c.nombre.slice(0,2).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{c.nombre}</p>
                        <p className="text-xs text-gray-400 truncate">{c.dominio}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0 ${est.cls}`}>
                      {est.label}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-3">
                    {c.plan && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Plan</span>
                        <span className="text-sm font-medium text-gray-700">{c.plan}</span>
                        {c.montoPlan && <span className="text-xs text-gray-400">${c.montoPlan.toLocaleString("es-CL")}/mes</span>}
                      </div>
                    )}
                    {c.suscripcionActiva && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Vencimiento</span>
                        <span className={`text-sm font-medium ${vencida ? "text-red-600" : "text-gray-700"}`}>
                          {new Date(c.suscripcionActiva.fechaVencimiento).toLocaleDateString("es-CL", { day:"2-digit", month:"short" })}
                        </span>
                        <span className={`text-xs ${vencida ? "text-red-500" : "text-green-600"}`}>
                          {vencida ? `Venció hace ${Math.abs(diasRestantes)}d` : `${diasRestantes} días`}
                        </span>
                      </div>
                    )}
                    {c.suscripcionActiva && (
                      <div className="flex flex-col">
                        <span className="text-xs text-gray-400">Ingresos generados</span>
                        <span className="text-sm font-medium text-green-700">
                          ${c.suscripcionActiva.ingresoTotal.toLocaleString("es-CL")}
                        </span>
                        <span className="text-xs text-gray-400">{c.suscripcionActiva.pagosConfirmados} pagos</span>
                      </div>
                    )}
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-400">Contacto</span>
                      <div className="flex gap-2">
                        {c.email && (
                          <a href={`mailto:${c.email}`} className="p-1.5 bg-gray-100 hover:bg-blue-100 hover:text-blue-600 rounded-lg transition-colors" title={c.email}>
                            <Mail size={13} />
                          </a>
                        )}
                        {c.telefono && (
                          <a href={`tel:${c.telefono}`} className="p-1.5 bg-gray-100 hover:bg-green-100 hover:text-green-600 rounded-lg transition-colors" title={c.telefono}>
                            <Phone size={13} />
                          </a>
                        )}
                        <a href={`https://${c.dominio}`} target="_blank" rel="noopener noreferrer"
                          className="p-1.5 bg-gray-100 hover:bg-purple-100 hover:text-purple-600 rounded-lg transition-colors" title={c.dominio}>
                          <Globe size={13} />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {clientes.length === 0 && (
              <div className="py-16 text-center text-gray-400">
                <Users size={32} className="mx-auto mb-3 text-gray-200" />
                <p>Aún no tienes clientes asignados</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, bg, label, value, sub, subColor }: {
  icon: React.ReactNode; bg: string; label: string; value: string | number; sub?: string; subColor?: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-gray-400 font-medium">{label}</p>
        <div className={`w-8 h-8 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
      </div>
      <p className="text-2xl font-bold text-gray-900 mb-1">{value}</p>
      {sub && <p className={`text-xs font-medium ${subColor ?? "text-gray-400"}`}>{sub}</p>}
    </div>
  );
}
