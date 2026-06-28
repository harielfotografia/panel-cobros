"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Plan { id: string; clave: string; nombre: string; precio: number; }
interface Vendedora { id: string; nombre: string; email: string | null; }

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
    <div className="max-w-lg">
      <h2 className="text-xl font-semibold mb-6">Nuevo cliente</h2>
      <form onSubmit={handleSubmit} className="bg-white rounded-xl p-6 border border-gray-200 space-y-4">
        <Field label="Nombre" value={form.nombre} onChange={(v) => set("nombre", v)} required />
        <Field label="Email" type="email" value={form.email} onChange={(v) => set("email", v)} required />
        <Field label="RUT (ej: 12.345.678-9)" value={form.rut} onChange={(v) => set("rut", v)} />
        <Field label="Teléfono" value={form.telefono} onChange={(v) => set("telefono", v)} />
        <Field label="Dominio (ej: cliente.tuapp.com)" value={form.dominio} onChange={(v) => set("dominio", v)} required />
        <Field label="URL API clínica (ej: https://clinica.com/wp-json/dental-ora/v1)" value={form.apiUrl} onChange={(v) => set("apiUrl", v)} />
        <Field label="Coolify App ID (opcional)" value={form.coolifyAppId} onChange={(v) => set("coolifyAppId", v)} />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Plan</label>
          <select
            value={form.planId}
            onChange={(e) => set("planId", e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin plan asignado</option>
            {planes.map(p => (
              <option key={p.id} value={p.id}>{p.nombre} — ${p.precio.toLocaleString("es-CL")}/mes</option>
            ))}
          </select>
        </div>
        <Field label="Monto mensual (CLP)" type="number" value={form.monto} onChange={(v) => set("monto", v)} required />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Método de pago</label>
          <select
            value={form.metodoPago}
            onChange={(e) => set("metodoPago", e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="TRANSFERENCIA">Transferencia</option>
            <option value="MERCADOPAGO">MercadoPago</option>
            <option value="TRANSBANK">Transbank</option>
          </select>
        </div>
        <Field label="Días de gracia" type="number" value={form.diasGracia} onChange={(v) => set("diasGracia", v)} />
        <div>
          <label className="block text-sm text-gray-600 mb-1">Vendedora responsable</label>
          <select
            value={form.vendedoraId}
            onChange={(e) => set("vendedoraId", e.target.value)}
            className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Sin vendedora asignada</option>
            {vendedoras.map(v => (
              <option key={v.id} value={v.id}>{v.nombre}{v.email ? ` (${v.email})` : ""}</option>
            ))}
          </select>
        </div>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.back()} className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-lg py-2 text-sm transition-colors">
            Cancelar
          </button>
          <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors">
            {loading ? "Guardando..." : "Crear cliente"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
