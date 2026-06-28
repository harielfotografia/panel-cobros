"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ExternalLink, ChevronDown, Pencil, Copy, Check,
  Zap, Mail, FileText, PauseCircle, PlayCircle,
  LayoutDashboard, CreditCard, FileText as FTIcon, Users, Wifi, Settings,
  CheckCircle2, AlertCircle,
} from "lucide-react";

type Cliente = {
  id: string; nombre: string; email: string; telefono?: string; rut?: string;
  dominio: string; coolifyAppId?: string; serviceKey: string; apiUrl?: string;
  planId?: string; estado: string; notas?: string;
  plan?: { id: string; nombre: string; clave: string; precio: number; maxProfesionales: number; modulos: string[] };
  vendedora?: { id: string; nombre: string; email?: string };
  suscripciones: Suscripcion[];
};
type Suscripcion = {
  id: string; monto: number; moneda: string; metodoPago: string; tipoCobro: string;
  tarjetaUlt4?: string; fechaInicio: string; fechaVencimiento: string; diasGracia: number;
  activa: boolean; createdAt: string;
  pagos: Pago[];
};
type Pago = {
  id: string; monto: number; moneda: string; estado: string; metodoPago: string;
  referencia?: string; fechaPago?: string; createdAt: string;
};

const TABS = [
  { id: "resumen",      label: "Resumen",         icon: LayoutDashboard },
  { id: "suscripcion",  label: "Suscripción",      icon: CreditCard },
  { id: "pagos",        label: "Pagos",            icon: CreditCard },
  { id: "facturacion",  label: "Facturación",      icon: FTIcon },
  { id: "usuarios",     label: "Usuarios",         icon: Users },
  { id: "api",          label: "API y Conexión",   icon: Wifi },
  { id: "configuracion",label: "Configuración",    icon: Settings },
];

const inp = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [tab, setTab] = useState("resumen");
  const [accionLoading, setAccionLoading] = useState("");
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoRef, setPagoRef] = useState("");
  const [pagoOk, setPagoOk] = useState(false);
  const [copiadoKey, setCopiadoKey] = useState<string | null>(null);

  async function cargar() {
    const r = await fetch(`/api/clientes/${id}`);
    if (r.ok) setCliente(await r.json());
  }
  useEffect(() => { cargar(); }, [id]);

  async function accion(tipo: "suspender" | "activar") {
    setAccionLoading(tipo);
    await fetch(`/api/clientes/${id}/${tipo}`, { method: "POST" });
    await cargar();
    setAccionLoading("");
  }

  async function confirmarPago() {
    if (!pagoMonto || !sub) return;
    setAccionLoading("pago");
    await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suscripcionId: sub.id, monto: Number(pagoMonto), referencia: pagoRef }),
    });
    setPagoMonto(""); setPagoRef(""); setPagoOk(true);
    await cargar();
    setAccionLoading("");
    setTimeout(() => setPagoOk(false), 3000);
  }

  async function impersonar() {
    setAccionLoading("portal");
    const r = await fetch(`/api/clientes/${id}/impersonar`, { method: "POST" });
    if (r.ok) { const d = await r.json(); if (d.url) window.open(d.url, "_blank"); }
    setAccionLoading("");
  }

  function copiar(texto: string, key: string) {
    navigator.clipboard.writeText(texto);
    setCopiadoKey(key);
    setTimeout(() => setCopiadoKey(null), 1800);
  }

  if (!cliente) return <div className="p-6 text-gray-400 animate-pulse">Cargando...</div>;

  const sub = cliente.suscripciones.find(s => s.activa);
  const vence = sub ? new Date(sub.fechaVencimiento) : null;
  const diasRestantes = vence ? Math.ceil((vence.getTime() - Date.now()) / 86400000) : null;
  const vencida = diasRestantes !== null && diasRestantes < 0;
  const suspendido = cliente.estado === "SUSPENDIDO";

  const ESTADO_STYLE: Record<string, string> = {
    ACTIVO: "text-green-600", SUSPENDIDO: "text-red-600", CANCELADO: "text-gray-400",
  };

  return (
    <div className="p-4 lg:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{cliente.nombre}</h1>
            <span className={`flex items-center gap-1.5 text-sm font-medium ${ESTADO_STYLE[cliente.estado]}`}>
              <span className={`w-2 h-2 rounded-full ${suspendido ? "bg-red-500" : "bg-green-500"}`} />
              {cliente.estado === "ACTIVO" ? "Activo" : cliente.estado === "SUSPENDIDO" ? "Suspendido" : "Cancelado"}
            </span>
          </div>
          <p className="text-sm text-gray-400">{cliente.email} · {cliente.dominio}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={impersonar} disabled={!!accionLoading}
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm px-4 py-2 rounded-lg transition-colors">
            <ExternalLink size={14} /> Ver portal del cliente
          </button>
          <div className="relative group">
            <button className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 text-white text-sm px-4 py-2 rounded-lg transition-colors">
              Acciones <ChevronDown size={14} />
            </button>
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 min-w-44 py-1 hidden group-hover:block">
              {!suspendido ? (
                <button onClick={() => accion("suspender")} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2">
                  <PauseCircle size={14} /> Suspender servicio
                </button>
              ) : (
                <button onClick={() => accion("activar")} className="w-full text-left px-4 py-2 text-sm text-green-700 hover:bg-green-50 flex items-center gap-2">
                  <PlayCircle size={14} /> Reactivar servicio
                </button>
              )}
              <button onClick={impersonar} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2">
                <ExternalLink size={14} /> Ver portal
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  tab === t.id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <Icon size={14} />{t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab Resumen ── */}
      {tab === "resumen" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Plan y conexión */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Zap size={16} className="text-blue-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Plan y conexión</h2>
                </div>
                <button onClick={() => setTab("configuracion")} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1">
                  <Pencil size={12} /> Editar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Plan actual</p>
                  <p className="text-sm font-semibold text-gray-900">{cliente.plan ? `${cliente.plan.nombre} (${cliente.plan.clave})` : "Sin plan"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-0.5">Máx. profesionales</p>
                  <p className="text-sm font-semibold text-gray-900">{cliente.plan?.maxProfesionales === 0 ? "Ilimitado" : cliente.plan?.maxProfesionales ?? "—"}</p>
                </div>
              </div>
              {cliente.apiUrl && (
                <div>
                  <p className="text-xs text-gray-400 mb-1">API URL</p>
                  <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                    <p className="text-xs text-gray-600 truncate flex-1 font-mono">{cliente.apiUrl}</p>
                    <button onClick={() => copiar(cliente.apiUrl!, "apiUrl")} className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                      {copiadoKey === "apiUrl" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                </div>
              )}
              <div>
                <p className="text-xs text-gray-400 mb-1">Service Key</p>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                  <p className="text-xs text-gray-600 truncate flex-1 font-mono">{cliente.serviceKey}</p>
                  <button onClick={() => copiar(cliente.serviceKey, "sk")} className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                    {copiadoKey === "sk" ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Estado del servicio */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${suspendido ? "bg-red-50" : "bg-green-50"}`}>
                  {suspendido ? <AlertCircle size={16} className="text-red-500" /> : <CheckCircle2 size={16} className="text-green-600" />}
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Estado del servicio</h2>
              </div>
              <div>
                <p className={`text-base font-bold ${suspendido ? "text-red-600" : "text-green-700"}`}>
                  {suspendido ? "Servicio suspendido" : "Todo funcionando correctamente"}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {suspendido ? "El cliente no tiene acceso al sistema." : "Tu sistema y servicios están operativos."}
                </p>
              </div>
              <div className="space-y-2.5">
                {[
                  { label: "Sistema",              ok: !suspendido, estado: suspendido ? "Suspendido" : "Operativo" },
                  { label: "Base de datos",        ok: !suspendido, estado: suspendido ? "Suspendido" : "Conectado" },
                  { label: "Suscripción",          ok: !vencida,    estado: vencida ? "Vencida" : diasRestantes !== null ? `${diasRestantes}d restantes` : "Sin datos" },
                  { label: "Cron de suspensión",   ok: true,        estado: "Activo" },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {item.ok
                        ? <CheckCircle2 size={14} className="text-green-500" />
                        : <AlertCircle size={14} className="text-red-400" />}
                      <span className="text-sm text-gray-700">{item.label}</span>
                    </div>
                    <span className={`text-xs ${item.ok ? "text-gray-400" : "text-red-500"}`}>{item.estado}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Acciones rápidas */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <Zap size={16} className="text-yellow-600" />
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Acciones rápidas</h2>
              </div>
              {[
                { label: "Impersonar en el portal del cliente", desc: "Accede al portal como el cliente", icon: ExternalLink, fn: impersonar, color: "text-gray-700" },
                { label: "Enviar email al cliente", desc: "Comunicación directa", icon: Mail, fn: () => window.open(`mailto:${cliente.email}`), color: "text-gray-700" },
                { label: "Generar factura manual", desc: "Crear factura fuera del ciclo", icon: FileText, fn: () => router.push(`/facturas-admin/facturas/nueva`), color: "text-gray-700" },
                { label: "Editar datos del cliente", desc: "Modificar plan, contacto, etc.", icon: Pencil, fn: () => setTab("configuracion"), color: "text-gray-700" },
                {
                  label: suspendido ? "Reactivar servicio" : "Suspender servicio",
                  desc: suspendido ? "Restablecer acceso al sistema" : "Bloquear acceso del sistema",
                  icon: suspendido ? PlayCircle : PauseCircle,
                  fn: () => accion(suspendido ? "activar" : "suspender"),
                  color: suspendido ? "text-green-700" : "text-red-600",
                },
              ].map((a) => {
                const Icon = a.icon;
                return (
                  <button key={a.label} onClick={a.fn} disabled={!!accionLoading}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-gray-50 transition-colors text-left group disabled:opacity-50">
                    <div className={`w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0 ${a.color}`}>
                      <Icon size={15} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${a.color}`}>{a.label}</p>
                      <p className="text-xs text-gray-400">{a.desc}</p>
                    </div>
                    <ChevronDown size={14} className="text-gray-300 -rotate-90 group-hover:text-gray-500 flex-shrink-0" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Suscripción + Pagos */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Suscripción activa */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-yellow-50 rounded-lg flex items-center justify-center">
                  <span className="text-base">👑</span>
                </div>
                <h2 className="text-sm font-semibold text-gray-900">Suscripción activa</h2>
              </div>
              {sub ? (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Monto</p>
                      <p className="text-lg font-bold text-gray-900">{sub.monto.toLocaleString("es-CL")} {sub.moneda}</p>
                      <p className="text-xs text-gray-400">mensual</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Vencimiento</p>
                      <p className={`text-base font-bold ${vencida ? "text-red-600" : "text-gray-900"}`}>
                        {new Date(sub.fechaVencimiento).toLocaleDateString("es-CL")}
                      </p>
                      <p className={`text-xs ${vencida ? "text-red-500" : "text-gray-400"}`}>
                        {vencida ? `Venció hace ${Math.abs(diasRestantes!)}d` : `Quedan ${diasRestantes} días`}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">Método de pago</p>
                      <p className="text-sm font-semibold text-gray-900">{sub.metodoPago}</p>
                      {sub.tarjetaUlt4 && <p className="text-xs text-gray-400">•••• {sub.tarjetaUlt4}</p>}
                    </div>
                  </div>

                  {sub.metodoPago === "TRANSFERENCIA" && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-xs text-gray-500 font-medium mb-2">Confirmar pago por transferencia</p>
                      <div className="flex gap-2">
                        <input type="number" placeholder="Monto recibido" value={pagoMonto} onChange={e => setPagoMonto(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <span className="flex items-center text-gray-400 text-sm">$</span>
                        <input placeholder="Referencia (opcional)" value={pagoRef} onChange={e => setPagoRef(e.target.value)}
                          className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                        <button onClick={confirmarPago} disabled={!pagoMonto || !!accionLoading}
                          className="bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-4 py-2 rounded-lg transition-colors whitespace-nowrap">
                          {pagoOk ? "✓ Confirmado" : accionLoading === "pago" ? "..." : "Confirmar pago"}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">Sin suscripción activa</p>
              )}
            </div>

            {/* Historial de pagos */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center">
                    <FTIcon size={15} className="text-green-600" />
                  </div>
                  <h2 className="text-sm font-semibold text-gray-900">Historial de pagos</h2>
                </div>
                <button onClick={() => setTab("pagos")} className="text-xs text-blue-600 hover:text-blue-500">Ver todos</button>
              </div>
              {sub?.pagos.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2">Fecha</th>
                      <th className="text-left pb-2">Monto</th>
                      <th className="text-left pb-2 hidden sm:table-cell">Método</th>
                      <th className="text-left pb-2">Estado</th>
                      <th className="text-left pb-2 hidden md:table-cell">Ref.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sub.pagos.slice(0, 5).map(p => (
                      <tr key={p.id} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 text-gray-500 text-xs">{new Date(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}</td>
                        <td className="py-2 font-medium text-gray-900">{p.monto.toLocaleString("es-CL")} {p.moneda}</td>
                        <td className="py-2 text-gray-500 text-xs hidden sm:table-cell">{p.metodoPago}</td>
                        <td className="py-2">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                            p.estado === "CONFIRMADO" ? "bg-green-100 text-green-700" :
                            p.estado === "PENDIENTE"  ? "bg-yellow-100 text-yellow-700" :
                            "bg-red-100 text-red-700"
                          }`}>{p.estado}</span>
                        </td>
                        <td className="py-2 text-gray-400 text-xs hidden md:table-cell">{p.referencia ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-gray-400 text-center py-6">Sin pagos registrados</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Tab Suscripción ── */}
      {tab === "suscripcion" && (
        <div className="max-w-xl bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">Detalles de suscripción</h2>
          {sub ? (
            <div className="space-y-3 text-sm">
              {[
                ["Monto mensual", `${sub.monto.toLocaleString("es-CL")} ${sub.moneda}`],
                ["Método de pago", sub.metodoPago],
                ["Tipo de cobro", sub.tipoCobro],
                ["Fecha inicio", new Date(sub.fechaInicio).toLocaleDateString("es-CL")],
                ["Fecha vencimiento", new Date(sub.fechaVencimiento).toLocaleDateString("es-CL")],
                ["Días de gracia", String(sub.diasGracia)],
                ["Estado", sub.activa ? "Activa" : "Inactiva"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                  <span className="text-gray-500">{k}</span>
                  <span className="font-medium text-gray-900">{v}</span>
                </div>
              ))}
            </div>
          ) : <p className="text-sm text-gray-400">Sin suscripción activa</p>}
        </div>
      )}

      {/* ── Tab Pagos ── */}
      {tab === "pagos" && (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-400 text-xs">
                  <th className="text-left px-5 py-3">Fecha</th>
                  <th className="text-left px-5 py-3">Monto</th>
                  <th className="text-left px-5 py-3">Método</th>
                  <th className="text-left px-5 py-3">Estado</th>
                  <th className="text-left px-5 py-3">Referencia</th>
                </tr>
              </thead>
              <tbody>
                {sub?.pagos.map(p => (
                  <tr key={p.id} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 text-gray-500">{new Date(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{p.monto.toLocaleString("es-CL")} {p.moneda}</td>
                    <td className="px-5 py-3 text-gray-500">{p.metodoPago}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        p.estado === "CONFIRMADO" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                      }`}>{p.estado}</span>
                    </td>
                    <td className="px-5 py-3 text-gray-400">{p.referencia ?? "—"}</td>
                  </tr>
                ))}
                {!sub?.pagos.length && (
                  <tr><td colSpan={5} className="text-center text-gray-400 py-10">Sin pagos registrados</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Tab API y Conexión ── */}
      {tab === "api" && (
        <div className="max-w-xl bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-sm font-semibold text-gray-900">API y Conexión</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1">API URL de la clínica</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-sm font-mono text-gray-700 flex-1 truncate">{cliente.apiUrl || "No configurada"}</span>
                {cliente.apiUrl && (
                  <button onClick={() => copiar(cliente.apiUrl!, "apiUrl")} className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                    {copiadoKey === "apiUrl" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Service Key</label>
              <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                <span className="text-xs font-mono text-gray-700 flex-1 truncate">{cliente.serviceKey}</span>
                <button onClick={() => copiar(cliente.serviceKey, "sk")} className="text-gray-400 hover:text-blue-600 flex-shrink-0">
                  {copiadoKey === "sk" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
              </div>
            </div>
            {cliente.coolifyAppId && (
              <div>
                <label className="block text-xs text-gray-500 mb-1">Coolify App ID</label>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm font-mono text-gray-700 flex-1">{cliente.coolifyAppId}</span>
                  <button onClick={() => copiar(cliente.coolifyAppId!, "coolify")} className="text-gray-400 hover:text-blue-600">
                    {copiadoKey === "coolify" ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab Configuración (editar datos) ── */}
      {tab === "configuracion" && (
        <EditarClienteForm cliente={cliente} onSaved={cargar} />
      )}

      {/* ── Tabs placeholder ── */}
      {["facturacion", "usuarios"].includes(tab) && (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <p className="text-sm font-medium text-gray-700">
            {tab === "facturacion" ? "Documentos del cliente" : "Usuarios de la clínica"}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {tab === "facturacion"
              ? "Ve a Facturación → Cotizaciones / Facturas y filtra por este cliente."
              : "Próximamente: gestión de usuarios por clínica."}
          </p>
        </div>
      )}

      <button onClick={() => router.push("/clientes")} className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-600 transition-colors pt-2">
        <ArrowLeft size={14} /> Volver al listado de clientes
      </button>
    </div>
  );
}

function EditarClienteForm({ cliente, onSaved }: { cliente: Cliente; onSaved: () => void }) {
  const [form, setForm] = useState({
    nombre: cliente.nombre, email: cliente.email, telefono: cliente.telefono ?? "",
    rut: cliente.rut ?? "", notas: cliente.notas ?? "", apiUrl: cliente.apiUrl ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [ok, setOk] = useState(false);

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    await fetch(`/api/clientes/${cliente.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false); setOk(true); onSaved();
    setTimeout(() => setOk(false), 2500);
  }

  const inp2 = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <form onSubmit={guardar} className="max-w-xl bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">Editar datos del cliente</h2>
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Nombre</label><input value={form.nombre} onChange={e => setForm(f => ({...f, nombre: e.target.value}))} className={inp2} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Email</label><input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} className={inp2} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">Teléfono</label><input value={form.telefono} onChange={e => setForm(f => ({...f, telefono: e.target.value}))} className={inp2} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">RUT</label><input value={form.rut} onChange={e => setForm(f => ({...f, rut: e.target.value}))} placeholder="12.345.678-9" className={inp2} /></div>
        <div><label className="block text-xs text-gray-500 mb-1">API URL clínica</label><input value={form.apiUrl} onChange={e => setForm(f => ({...f, apiUrl: e.target.value}))} className={inp2} /></div>
        <div className="col-span-2"><label className="block text-xs text-gray-500 mb-1">Notas internas</label><textarea value={form.notas} onChange={e => setForm(f => ({...f, notas: e.target.value}))} rows={2} className={inp2 + " w-full"} /></div>
      </div>
      <button type="submit" disabled={saving} className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
        {ok ? <><Check size={14} /> Guardado</> : saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </form>
  );
}
