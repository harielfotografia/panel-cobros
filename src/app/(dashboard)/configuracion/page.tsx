"use client";
import { useEffect, useState } from "react";
import {
  Settings, Link2, Clock, Percent, Bell, Shield, Code2,
  Save, CheckCircle2, AlertCircle, Building2, Headphones,
  ChevronRight, Copy, Check,
} from "lucide-react";

type Config = {
  empresaNombre: string; empresaRut: string; empresaDireccion: string;
  soporteEmail: string; soporteWhatsApp: string; logoUrl: string; comisionPct: number;
};
type EnvStatus = { label: string; key: string; ok: boolean; nota?: string };

const DEFAULT: Config = {
  empresaNombre: "", empresaRut: "", empresaDireccion: "",
  soporteEmail: "", soporteWhatsApp: "", logoUrl: "", comisionPct: 10,
};

const TABS = [
  { id: "general",          label: "General",          icon: Settings },
  { id: "integraciones",    label: "Integraciones",    icon: Link2 },
  { id: "automatizaciones", label: "Automatizaciones", icon: Clock },
  { id: "comisiones",       label: "Comisiones",       icon: Percent },
  { id: "notificaciones",   label: "Notificaciones",   icon: Bell },
  { id: "seguridad",        label: "Seguridad",        icon: Shield },
  { id: "avanzado",         label: "Avanzado",         icon: Code2 },
];

const CRON_CMD = `# Cada día a las 08:00\n0 8 * * * curl -X POST https://panel.tudominio.cl/api/cron \\\n  -H "x-cron-secret: TU_CRON_SECRET"`;

export default function ConfiguracionPage() {
  const [tab, setTab] = useState("general");
  const [config, setConfig] = useState<Config>(DEFAULT);
  const [env, setEnv] = useState<EnvStatus[]>([]);
  const [guardando, setGuardando] = useState(false);
  const [guardado, setGuardado] = useState(false);
  const [copiado, setCopiado] = useState(false);

  useEffect(() => {
    fetch("/api/configuracion").then(r => r.json()).then(d => {
      if (d.empresaNombre !== undefined) setConfig({ ...DEFAULT, ...d });
    });
    fetch("/api/configuracion/env-status").then(r => r.json()).then(setEnv).catch(() => {});
  }, []);

  function set(key: keyof Config, val: string | number) {
    setConfig(c => ({ ...c, [key]: val }));
  }

  async function guardar(e: React.FormEvent) {
    e.preventDefault();
    setGuardando(true);
    await fetch("/api/configuracion", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(config),
    });
    setGuardando(false);
    setGuardado(true);
    setTimeout(() => setGuardado(false), 2500);
  }

  function copiar() {
    navigator.clipboard.writeText(CRON_CMD).then(() => {
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    });
  }

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
          <Settings size={20} className="text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configuración</h1>
          <p className="text-sm text-gray-500">Gestiona los ajustes generales de tu plataforma.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {TABS.map(t => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  active
                    ? "border-gray-900 text-gray-900"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}>
                <Icon size={15} />
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Tab: General ── */}
      {tab === "general" && (
        <form onSubmit={guardar}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Columna izquierda */}
            <div className="space-y-4">
              <Card icon={<Building2 size={16} className="text-gray-500" />} title="Datos de la empresa">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Nombre de la empresa" span={2}>
                    <Inp value={config.empresaNombre} onChange={v => set("empresaNombre", v)} placeholder="Mi Empresa SpA" />
                  </Campo>
                  <Campo label="RUT">
                    <Inp value={config.empresaRut} onChange={v => set("empresaRut", v)} placeholder="12.345.678-9" />
                  </Campo>
                  <Campo label="URL del logo">
                    <Inp value={config.logoUrl} onChange={v => set("logoUrl", v)} placeholder="https://logo.png" />
                  </Campo>
                  <Campo label="Dirección" span={2}>
                    <Inp value={config.empresaDireccion} onChange={v => set("empresaDireccion", v)} placeholder="Av. Principal 123, Santiago" />
                  </Campo>
                </div>
              </Card>

              <Card icon={<Headphones size={16} className="text-gray-500" />} title="Contacto de soporte (visible en el portal del cliente)">
                <div className="grid grid-cols-2 gap-3">
                  <Campo label="Email de soporte">
                    <Inp type="email" value={config.soporteEmail} onChange={v => set("soporteEmail", v)} placeholder="soporte@tudominio.cl" />
                  </Campo>
                  <Campo label="WhatsApp (formato: 56912345678)">
                    <Inp value={config.soporteWhatsApp} onChange={v => set("soporteWhatsApp", v)} placeholder="56912345678" />
                  </Campo>
                </div>
              </Card>

              <Card icon={<Percent size={16} className="text-gray-500" />} title="Comisiones">
                <Campo label="% de comisión para vendedoras">
                  <div className="flex items-center gap-3">
                    <input type="number" min="0" max="100" step="0.5" value={config.comisionPct}
                      onChange={e => set("comisionPct", Number(e.target.value))}
                      className="w-24 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-sm text-gray-500">%</span>
                    <span className="text-xs text-gray-400">% sobre ingresos generados</span>
                  </div>
                  <p className="text-xs text-gray-400 mt-1">Se usa en Reportes → Comisiones por vendedora.</p>
                </Campo>
              </Card>

              <button type="submit" disabled={guardando}
                className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
                {guardado ? <Check size={15} /> : <Save size={15} />}
                {guardado ? "¡Guardado!" : guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>

            {/* Columna derecha */}
            <div className="space-y-4">
              <Card icon={<Link2 size={16} className="text-gray-500" />} title="Estado de integraciones">
                <p className="text-xs text-gray-400 mb-1">
                  Las credenciales se configuran en el archivo{" "}
                  <code className="bg-gray-100 px-1 rounded">.env</code> del servidor.
                </p>
                <div className="divide-y divide-gray-100">
                  {env.map(e => (
                    <div key={e.key} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                      {e.ok
                        ? <CheckCircle2 size={16} className="text-green-500 flex-shrink-0" />
                        : <AlertCircle size={16} className="text-amber-400 flex-shrink-0" />}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">{e.label}</p>
                        {e.nota && <p className="text-xs text-gray-400 truncate">{e.nota}</p>}
                      </div>
                      <button type="button"
                        className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 border border-gray-200 px-2.5 py-1 rounded-lg hover:bg-gray-50 transition-colors whitespace-nowrap">
                        Configurar <ChevronRight size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              </Card>

              <Card icon={<Clock size={16} className="text-gray-500" />} title="Cron de suspensión automática">
                <p className="text-sm text-gray-600">
                  El cron verifica vencimientos y suspende automáticamente.
                  Configúralo en tu servidor o Coolify:
                </p>
                <div className="relative mt-2">
                  <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto leading-relaxed pr-10">
{CRON_CMD}
                  </pre>
                  <button type="button" onClick={copiar}
                    className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded-lg transition-colors">
                    {copiado ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  El valor de <code className="bg-gray-100 px-1 rounded">CRON_SECRET</code> está en tu archivo{" "}
                  <code className="bg-gray-100 px-1 rounded">.env</code>.
                </p>
              </Card>
            </div>
          </div>
        </form>
      )}

      {/* ── Tab: Integraciones ── */}
      {tab === "integraciones" && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {env.map(e => (
              <div key={e.key} className="flex items-start gap-4 p-5">
                {e.ok
                  ? <CheckCircle2 size={18} className="text-green-500 flex-shrink-0 mt-0.5" />
                  : <AlertCircle size={18} className="text-amber-400 flex-shrink-0 mt-0.5" />}
                <div className="flex-1">
                  <p className="text-sm font-semibold text-gray-900">{e.label}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{e.nota}</p>
                  <p className="text-xs text-gray-400 mt-1 font-mono">{e.key}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                  e.ok ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                }`}>
                  {e.ok ? "Activo" : "Sin configurar"}
                </span>
              </div>
            ))}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-800">¿Cómo configurar integraciones?</p>
            <p className="text-sm text-blue-700 mt-1">
              Edita el archivo <code className="bg-blue-100 px-1 rounded">.env</code> en el servidor
              y reinicia la aplicación (en Coolify: Redeploy). Nunca escribas las credenciales directamente en el código.
            </p>
          </div>
        </div>
      )}

      {/* ── Tab: Automatizaciones ── */}
      {tab === "automatizaciones" && (
        <div className="space-y-4 max-w-2xl">
          <Card icon={<Clock size={16} className="text-gray-500" />} title="Cron de suspensión automática">
            <div className="space-y-3 text-sm text-gray-600">
              <p>El cron diario realiza estas acciones en orden:</p>
              <ol className="space-y-2 list-none">
                {[
                  "Busca todas las suscripciones activas",
                  "Si vence en 3 o 1 días → envía aviso por email al cliente",
                  "Si pasó el vencimiento + días de gracia → llama al plugin WordPress (setEstado 'suspendida')",
                  "Marca el cliente como SUSPENDIDO en la BD",
                  "Reintenta clientes con syncPending=true (fallos previos)",
                ].map((paso, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-900 text-white text-xs flex items-center justify-center mt-0.5">{i + 1}</span>
                    <span>{paso}</span>
                  </li>
                ))}
              </ol>
            </div>
            <div className="relative mt-3">
              <pre className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-700 overflow-x-auto pr-10">{CRON_CMD}</pre>
              <button onClick={copiar} className="absolute top-3 right-3 p-1.5 text-gray-400 hover:text-gray-600 rounded-lg">
                {copiado ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
              </button>
            </div>
          </Card>

          <Card icon={<Bell size={16} className="text-gray-500" />} title="Notificaciones automáticas de vencimiento">
            <div className="space-y-3">
              {[
                { dias: 3, label: "Aviso 3 días antes", desc: "Email al cliente: 'Tu servicio vence en 3 días'" },
                { dias: 1, label: "Aviso 1 día antes", desc: "Email al cliente: 'Tu servicio vence mañana'" },
                { dias: 0, label: "Suspensión (día 0 + gracia)", desc: "Email de servicio suspendido + bloqueo en la clínica" },
              ].map(n => (
                <div key={n.dias} className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {n.dias === 0 ? "!" : `${n.dias}d`}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{n.label}</p>
                    <p className="text-xs text-gray-400">{n.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* ── Tab: Comisiones ── */}
      {tab === "comisiones" && (
        <form onSubmit={guardar} className="max-w-md space-y-4">
          <Card icon={<Percent size={16} className="text-gray-500" />} title="Configuración de comisiones">
            <Campo label="Porcentaje de comisión para vendedoras">
              <div className="flex items-center gap-3">
                <input type="number" min="0" max="100" step="0.5" value={config.comisionPct}
                  onChange={e => set("comisionPct", Number(e.target.value))}
                  className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <span className="text-sm text-gray-700 font-medium">% sobre ingresos generados</span>
              </div>
            </Campo>
            <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600">
              <p className="font-medium text-gray-900 mb-1">¿Cómo se calcula?</p>
              <p>Comisión = Ingresos del cliente × {config.comisionPct}%</p>
              <p className="text-xs text-gray-400 mt-1">
                El reporte de comisiones está en la sección Reportes → Comisiones por vendedora.
              </p>
            </div>
          </Card>
          <button type="submit" disabled={guardando}
            className="flex items-center gap-2 bg-gray-900 hover:bg-gray-700 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
            {guardado ? <Check size={15} /> : <Save size={15} />}
            {guardado ? "¡Guardado!" : "Guardar"}
          </button>
        </form>
      )}

      {/* ── Tabs próximamente ── */}
      {["notificaciones", "seguridad", "avanzado"].includes(tab) && (
        <ProximamenteCard tab={TABS.find(t => t.id === tab)!} />
      )}
    </div>
  );
}

function ProximamenteCard({ tab }: { tab: { label: string; icon: React.ElementType } }) {
  const Icon = tab.icon;
  const descripciones: Record<string, string[]> = {
    notificaciones: [
      "Personalizar plantillas de email",
      "Configurar canal de WhatsApp Business",
      "Avisos de pago recibido al administrador",
    ],
    seguridad: [
      "Autenticación en dos pasos (2FA)",
      "Historial de sesiones activas",
      "Política de contraseñas",
    ],
    avanzado: [
      "Webhooks salientes personalizados",
      "Configuración de backups automáticos",
      "Variables de entorno por entorno",
    ],
  };
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-10 flex flex-col items-center text-center max-w-lg">
      <div className="w-12 h-12 bg-gray-100 rounded-2xl flex items-center justify-center mb-4">
        <Icon size={24} className="text-gray-400" />
      </div>
      <p className="text-base font-semibold text-gray-700">{tab.label} — Próximamente</p>
      <ul className="mt-3 space-y-1">
        {(descripciones[tab.label.toLowerCase()] ?? []).map(d => (
          <li key={d} className="text-sm text-gray-400">· {d}</li>
        ))}
      </ul>
    </div>
  );
}

// Componentes internos reutilizables
function Card({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      </div>
      {children}
    </div>
  );
}

function Campo({ label, children, span }: { label: string; children: React.ReactNode; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : ""}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

function Inp({ value, onChange, type = "text", placeholder }: {
  value: string; onChange: (v: string) => void; type?: string; placeholder?: string;
}) {
  return (
    <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
      className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
  );
}
