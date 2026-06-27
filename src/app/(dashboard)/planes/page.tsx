"use client";
import { useEffect, useState } from "react";

interface Plan {
  id: string;
  clave: string;
  nombre: string;
  precio: number;
  intervalo: string;
  maxProfesionales: number;
  modulos: string[];
  activo: boolean;
  _count?: { clientes: number };
}

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ clave: "", nombre: "", precio: "", maxProfesionales: "0" });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/planes");
    if (res.ok) setPlanes(await res.json());
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ clave: "", nombre: "", precio: "", maxProfesionales: "0" });
    setShowForm(false);
    setEditingId(null);
    setError("");
  }

  function startEdit(p: Plan) {
    setForm({ clave: p.clave, nombre: p.nombre, precio: String(p.precio), maxProfesionales: String(p.maxProfesionales) });
    setEditingId(p.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const url = editingId ? `/api/planes/${editingId}` : "/api/planes";
    const method = editingId ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) { resetForm(); load(); }
    else { const d = await res.json(); setError(d.error ?? "Error"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Desactivar este plan?")) return;
    await fetch(`/api/planes/${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <p className="text-gray-400">Cargando planes...</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Planes</h2>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="bg-indigo-600 hover:bg-indigo-500 text-sm px-4 py-2 rounded-lg transition-colors">
          + Nuevo plan
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Clave (ej: BASICO)" value={form.clave} onChange={(v) => setForm(f => ({ ...f, clave: v }))} required />
            <Field label="Nombre" value={form.nombre} onChange={(v) => setForm(f => ({ ...f, nombre: v }))} required />
            <Field label="Precio (CLP)" type="number" value={form.precio} onChange={(v) => setForm(f => ({ ...f, precio: v }))} required />
            <Field label="Máx. profesionales (0=ilimitado)" type="number" value={form.maxProfesionales} onChange={(v) => setForm(f => ({ ...f, maxProfesionales: v }))} />
          </div>
          {error && <p className="text-red-600 text-sm">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={resetForm} className="bg-gray-100 hover:bg-gray-200 rounded-lg px-4 py-2 text-sm transition-colors">Cancelar</button>
            <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 rounded-lg px-4 py-2 text-sm font-medium transition-colors">
              {editingId ? "Guardar" : "Crear plan"}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-gray-400 text-xs">
              <th className="text-left px-4 py-3">Clave</th>
              <th className="text-left px-4 py-3">Nombre</th>
              <th className="text-right px-4 py-3">Precio</th>
              <th className="text-right px-4 py-3">Máx. Prof.</th>
              <th className="text-right px-4 py-3">Clientes</th>
              <th className="text-right px-4 py-3">Estado</th>
              <th className="text-right px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {planes.map((p) => (
              <tr key={p.id} className="border-b border-gray-200/50 hover:bg-gray-100/30">
                <td className="px-4 py-3 font-mono text-xs">{p.clave}</td>
                <td className="px-4 py-3">{p.nombre}</td>
                <td className="px-4 py-3 text-right">${p.precio.toLocaleString("es-CL")}</td>
                <td className="px-4 py-3 text-right">{p.maxProfesionales === 0 ? "∞" : p.maxProfesionales}</td>
                <td className="px-4 py-3 text-right text-gray-600">{p._count?.clientes ?? 0}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right space-x-2">
                  <button onClick={() => startEdit(p)} className="text-gray-600 hover:text-gray-900 text-xs">Editar</button>
                  {p.activo && <button onClick={() => handleDelete(p.id)} className="text-gray-600 hover:text-red-600 text-xs">Desactivar</button>}
                </td>
              </tr>
            ))}
            {planes.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No hay planes creados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, type = "text", required = false }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm text-gray-600 mb-1">{label}</label>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} required={required}
        className="w-full bg-gray-100 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 text-gray-900" />
    </div>
  );
}
