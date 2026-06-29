"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, User, Globe, CreditCard, Zap, Building2 } from "lucide-react";

interface Plan { id: string; clave: string; nombre: string; precio: number; }
interface Vendedora { id: string; nombre: string; email: string | null; }

const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors";
const sel = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2.5">
        <div className="w-7 h-7 bg-gray-100 rounded-lg flex items-center justify-center text-gray-500">
          {icon}
        </div>
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false, placeholder = "" }: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; required?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)}
        required={required} placeholder={placeholder}
        className={inp} />
    </div>
  );
}

export default function NuevoClientePage() {
  const router = useRouter();
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [form, setForm] = useState({
    nombre: "", email: "", telefono: "", rut: "", dominio: "",
    coolifyAppId: "", apiUrl: "", planId: "", vendedoraId: "",
    monto: "", metodoPago: "TRANSFERENCIA", diasGracia: "3",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/planes").then(r => r.json()).then((p: Plan[]) => setPlanes(p.filter((x: Plan) => x)));
    fetch("/api/vendedoras").then(r => r.json()).then((v: Vendedora[]) => setVendedoras(Array.isArray(v) ? v : []));
  }, []);

  function set(field: string, value: string) {
    setForm((f) => {
      const next = { ...f, [field]: value };
      if (field === "planId") {
        const plan = planes.find(p => p.id === value);
        if (plan) next.monto = String(plan.precio);
      }
      return next;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...form,
        monto: Number(form.monto),
        diasGracia: Number(form.diasGracia),
        coolifyAppId: form.coolifyAppId || undefined,
        apiUrl: form.apiUrl || undefined,
        planId: form.planId || undefined,
        vendedoraId: form.vendedoraId || undefined,
      }),
    });
    if (res.ok) {
      router.push("/clientes");
    } else {
      const data = await res.json();
      setError(data.error ?? "Error al crear cliente");
    }
    setLoading(false);
  }

  return (
    <div className="p-4 lg:p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()}
          className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors">
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Nuevo cliente</h1>
          <p className="text-sm text-gray-400 mt-0.5">Completa los datos para registrar un nuevo cliente</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Datos básicos */}
        <Section icon={<User size={15} />} title="Datos del cliente">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="Nombre o razón social" value={form.nombre} onChange={v => set("nombre", v)} required placeholder="Clínica Dental Ejemplo SpA" />
            </div>
            <Field label="Email de contacto" type="email" value={form.email} onChange={v => set("email", v)} required placeholder="contacto@clinica.cl" />
            <Field label="Teléfono" value={form.telefono} onChange={v => set("telefono", v)} placeholder="+56 9 xxxx xxxx" />
            <Field label="RUT empresa" value={form.rut} onChange={v => set("rut", v)} placeholder="12.345.678-9" />
            <Field label="Dominio web" value={form.dominio} onChange={v => set("dominio", v)} required placeholder="clinica.tuapp.com" />
          </div>
        </Section>

        {/* Integración */}
        <Section icon={<Zap size={15} />} title="Integración con el sistema clínico">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Field label="URL API clínica" value={form.apiUrl} onChange={v => set("apiUrl", v)}
                placeholder="https://clinica.cl/wp-json/dental-ora/v1" />
            </div>
            <div className="col-span-2">
              <Field label="Coolify App ID (opcional)" value={form.coolifyAppId} onChange={v => set("coolifyAppId", v)} placeholder="app-id-en-coolify" />
            </div>
          </div>
        </Section>

        {/* Plan y pago */}
        <Section icon={<CreditCard size={15} />} title="Plan y suscripción">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Plan asignado</label>
              <select value={form.planId} onChange={e => set("planId", e.target.value)} className={sel}>
                <option value="">Sin plan asignado</option>
                {planes.map(p => (
                  <option key={p.id} value={p.id}>{p.nombre} — ${p.precio.toLocaleString("es-CL")}/mes</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Monto mensual (CLP)<span className="text-red-400 ml-0.5">*</span></label>
              <input type="number" value={form.monto} onChange={e => set("monto", e.target.value)} required
                placeholder="29990" className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Método de pago</label>
              <select value={form.metodoPago} onChange={e => set("metodoPago", e.target.value)} className={sel}>
                <option value="TRANSFERENCIA">Transferencia</option>
                <option value="MERCADOPAGO">MercadoPago</option>
                <option value="TRANSBANK">Transbank Webpay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Días de gracia</label>
              <input type="number" value={form.diasGracia} onChange={e => set("diasGracia", e.target.value)}
                min="0" max="30" className={inp} />
            </div>
          </div>
        </Section>

        {/* Vendedora */}
        {vendedoras.length > 0 && (
          <Section icon={<Building2 size={15} />} title="Asignación comercial">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Vendedora responsable</label>
              <select value={form.vendedoraId} onChange={e => set("vendedoraId", e.target.value)} className={sel}>
                <option value="">Sin vendedora asignada</option>
                {vendedoras.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}{v.email ? ` — ${v.email}` : ""}</option>
                ))}
              </select>
            </div>
          </Section>
        )}

        {error && (
          <div className="bg-red-50 border border-red-100 rounded-xl px-4 py-3 text-sm text-red-600">{error}</div>
        )}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()}
            className="flex-1 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 rounded-xl py-2.5 text-sm font-medium transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors shadow-sm shadow-blue-200">
            {loading ? "Guardando..." : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}
