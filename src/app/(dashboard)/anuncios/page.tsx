"use client";
import { useEffect, useState } from "react";
import { Megaphone, Plus, Eye, EyeOff, Trash2, Globe, User, X } from "lucide-react";

type Cliente = { id: string; nombre: string };
type Anuncio = {
  id: string; titulo: string; mensaje: string; tipo: string;
  clienteId: string | null; activo: boolean; createdAt: string;
  cliente: { nombre: string } | null;
};

const TIPOS = [
  { v: "INFO",         t: "Información",  cls: "bg-blue-100 text-blue-700",    dot: "bg-blue-500" },
  { v: "EXITO",        t: "Novedad",       cls: "bg-green-100 text-green-700",  dot: "bg-green-500" },
  { v: "ADVERTENCIA",  t: "Atención",      cls: "bg-amber-100 text-amber-700",  dot: "bg-amber-500" },
  { v: "MANTENIMIENTO",t: "Mantenimiento", cls: "bg-purple-100 text-purple-700",dot: "bg-purple-500" },
];

const inp = "w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent";

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({ titulo: "", mensaje: "", tipo: "INFO", clienteId: "" });
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);

  async function cargar() {
    const [a, c] = await Promise.all([
      fetch("/api/anuncios").then(r => r.json()),
      fetch("/api/clientes").then(r => r.json()),
    ]);
    setAnuncios(Array.isArray(a) ? a : []);
    setClientes(Array.isArray(c) ? c.map((x: Cliente) => ({ id: x.id, nombre: x.nombre })) : []);
  }

  useEffect(() => { cargar(); }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/anuncios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", mensaje: "", tipo: "INFO", clienteId: "" });
    setShowForm(false);
    await cargar();
    setLoading(false);
  }

  async function toggle(a: Anuncio) {
    await fetch(`/api/anuncios/${a.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !a.activo }),
    });
    await cargar();
  }

  async function eliminar(id: string) {
    if (!confirm("¿Eliminar este anuncio?")) return;
    await fetch(`/api/anuncios/${id}`, { method: "DELETE" });
    await cargar();
  }

  const activos = anuncios.filter(a => a.activo).length;

  return (
    <div className="p-4 lg:p-6 space-y-5 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <Megaphone size={18} className="text-gray-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Anuncios</h1>
            <p className="text-sm text-gray-400 mt-0.5">{activos} activo{activos !== 1 ? "s" : ""} · {anuncios.length} total</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200"
        >
          <Plus size={15} /> Nuevo anuncio
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-fade-in-up">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900 text-sm">Nuevo anuncio</h3>
            <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
          </div>
          <form onSubmit={crear} className="p-5 space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Título <span className="text-red-400">*</span></label>
              <input value={form.titulo} onChange={e => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej: Nueva función disponible" required className={inp} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Mensaje <span className="text-red-400">*</span></label>
              <textarea value={form.mensaje} onChange={e => setForm({ ...form, mensaje: e.target.value })}
                placeholder="Describe el anuncio con detalle..." required rows={3}
                className={inp + " resize-none"} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Tipo</label>
                <select value={form.tipo} onChange={e => setForm({ ...form, tipo: e.target.value })}
                  className={inp}>
                  {TIPOS.map(t => <option key={t.v} value={t.v}>{t.t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Destinatario</label>
                <select value={form.clienteId} onChange={e => setForm({ ...form, clienteId: e.target.value })}
                  className={inp}>
                  <option value="">Todos los clientes</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" disabled={loading}
                className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl transition-colors">
                {loading ? "Publicando..." : "Publicar anuncio"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {anuncios.length === 0 ? (
          <div className="py-16 text-center text-gray-400">
            <Megaphone size={32} className="mx-auto mb-3 text-gray-200" />
            <p className="font-medium text-gray-500">No hay anuncios</p>
            <p className="text-sm mt-1">Crea un anuncio para informar a tus clientes</p>
            <button onClick={() => setShowForm(true)}
              className="mt-4 text-sm text-blue-600 hover:underline">+ Crear primer anuncio</button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {anuncios.map((a, i) => {
              const tipo = TIPOS.find(t => t.v === a.tipo) ?? TIPOS[0];
              return (
                <div key={a.id}
                  className={`px-5 py-4 hover:bg-gray-50/50 transition-colors ${!a.activo ? "opacity-50" : ""}`}
                  style={{ animationDelay: `${i * 40}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${tipo.dot}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${tipo.cls}`}>{tipo.t}</span>
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          {a.clienteId ? <><User size={11} /> {a.cliente?.nombre}</> : <><Globe size={11} /> Global</>}
                        </span>
                        {!a.activo && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Oculto</span>}
                      </div>
                      <p className="text-sm font-semibold text-gray-900">{a.titulo}</p>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{a.mensaje}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <button onClick={() => toggle(a)} title={a.activo ? "Ocultar" : "Mostrar"}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        {a.activo ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                      <button onClick={() => eliminar(a.id)} title="Eliminar"
                        className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
