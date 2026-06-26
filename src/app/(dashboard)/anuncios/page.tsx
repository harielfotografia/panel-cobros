"use client";
import { useEffect, useState } from "react";

type Cliente = { id: string; nombre: string };
type Anuncio = {
  id: string;
  titulo: string;
  mensaje: string;
  tipo: string;
  clienteId: string | null;
  activo: boolean;
  createdAt: string;
  cliente: { nombre: string } | null;
};

const TIPOS = [
  { v: "INFO", t: "Información" },
  { v: "EXITO", t: "Novedad" },
  { v: "ADVERTENCIA", t: "Atención" },
  { v: "MANTENIMIENTO", t: "Mantenimiento" },
];

const COLOR: Record<string, string> = {
  INFO: "text-blue-300",
  EXITO: "text-green-300",
  ADVERTENCIA: "text-yellow-300",
  MANTENIMIENTO: "text-indigo-300",
};

export default function AnunciosPage() {
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [form, setForm] = useState({ titulo: "", mensaje: "", tipo: "INFO", clienteId: "" });
  const [loading, setLoading] = useState(false);

  async function cargar() {
    const [a, c] = await Promise.all([
      fetch("/api/anuncios").then((r) => r.json()),
      fetch("/api/clientes").then((r) => r.json()),
    ]);
    setAnuncios(Array.isArray(a) ? a : []);
    setClientes(Array.isArray(c) ? c.map((x: Cliente) => ({ id: x.id, nombre: x.nombre })) : []);
  }
  useEffect(() => {
    cargar();
  }, []);

  async function crear(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    await fetch("/api/anuncios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setForm({ titulo: "", mensaje: "", tipo: "INFO", clienteId: "" });
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
    await fetch(`/api/anuncios/${id}`, { method: "DELETE" });
    await cargar();
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <h2 className="text-xl font-semibold">Anuncios</h2>

      {/* Crear */}
      <form onSubmit={crear} className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
        <p className="text-sm font-medium text-gray-300">Nuevo anuncio</p>
        <input
          placeholder="Título"
          value={form.titulo}
          onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          required
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <textarea
          placeholder="Mensaje"
          value={form.mensaje}
          onChange={(e) => setForm({ ...form, mensaje: e.target.value })}
          required
          rows={2}
          className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="grid grid-cols-2 gap-3">
          <select
            value={form.tipo}
            onChange={(e) => setForm({ ...form, tipo: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {TIPOS.map((t) => (
              <option key={t.v} value={t.v}>
                {t.t}
              </option>
            ))}
          </select>
          <select
            value={form.clienteId}
            onChange={(e) => setForm({ ...form, clienteId: e.target.value })}
            className="bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Todos los clientes (global)</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          {loading ? "Publicando..." : "Publicar anuncio"}
        </button>
      </form>

      {/* Lista */}
      <div className="space-y-2">
        {anuncios.map((a) => (
          <div
            key={a.id}
            className={`bg-gray-900 rounded-xl p-4 border border-gray-800 ${a.activo ? "" : "opacity-50"}`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs font-medium ${COLOR[a.tipo]}`}>
                    {TIPOS.find((t) => t.v === a.tipo)?.t}
                  </span>
                  <span className="text-xs text-gray-500">
                    {a.cliente ? a.cliente.nombre : "Global"}
                  </span>
                </div>
                <p className="text-sm font-medium">{a.titulo}</p>
                <p className="text-sm text-gray-400">{a.mensaje}</p>
              </div>
              <div className="flex gap-3 text-xs ml-4">
                <button onClick={() => toggle(a)} className="text-gray-400 hover:text-gray-200">
                  {a.activo ? "Ocultar" : "Mostrar"}
                </button>
                <button onClick={() => eliminar(a.id)} className="text-red-400 hover:text-red-300">
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        ))}
        {anuncios.length === 0 && (
          <p className="text-center text-gray-600 py-8">No hay anuncios aún</p>
        )}
      </div>
    </div>
  );
}
