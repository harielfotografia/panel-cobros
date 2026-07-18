"use client";
import { useEffect, useState } from "react";
import { Plus, Pencil, MoreHorizontal, Layers, Package, Star, Zap, Check, X, HelpCircle, ChevronRight } from "lucide-react";

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

const PLAN_ICONS = [
  { bg: "bg-orange-100", color: "text-orange-500", Icon: Package },
  { bg: "bg-teal-100", color: "text-teal-500", Icon: Layers },
  { bg: "bg-purple-100", color: "text-purple-500", Icon: Zap },
  { bg: "bg-red-100", color: "text-red-500", Icon: Star },
];

const PLAN_DESCS: Record<string, string> = {
  BASICO: "Plan para emprendedores",
  PRO: "Para clínicas en crecimiento",
  PROFESIONAL: "Para clínicas en crecimiento",
  PREMIUM: "Todo incluido, sin límites",
  "DENTAL-BASICO": "Pensado para clínicas",
};

// Claves canónicas reales del plugin (Fase SaaS-2) — deben coincidir EXACTAMENTE con las claves
// que `class-config.php::$claves_gateables` valida del lado de la clínica (`gerty`,
// `pos_mercadopago`). Solo estos 2 son add-ons opcionales que un plan puede incluir o no — el
// resto de los módulos del plugin (odontograma, presupuestos, reportes, etc.) son funciones
// core siempre disponibles, nunca gateadas por plan, así que no se listan acá para no sugerir
// una capacidad de restricción que no existe.
const MODULOS_GATEABLES: { clave: string; nombre: string }[] = [
  { clave: "gerty", nombre: "Gerty (seguros de salud)" },
  { clave: "pos_mercadopago", nombre: "POS MercadoPago Point" },
];

export default function PlanesPage() {
  const [planes, setPlanes] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<{ clave: string; nombre: string; precio: string; maxProfesionales: string; modulos: string[] }>(
    { clave: "", nombre: "", precio: "", maxProfesionales: "0", modulos: [] }
  );
  const [error, setError] = useState("");
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [animIn, setAnimIn] = useState(false);

  async function load() {
    const res = await fetch("/api/planes");
    if (res.ok) setPlanes(await res.json());
    setLoading(false);
    setTimeout(() => setAnimIn(true), 50);
  }

  useEffect(() => { load(); }, []);

  function resetForm() {
    setForm({ clave: "", nombre: "", precio: "", maxProfesionales: "0", modulos: [] });
    setEditingId(null);
    setShowForm(false);
    setError("");
  }

  function startEdit(p: Plan) {
    setForm({
      clave: p.clave,
      nombre: p.nombre,
      precio: String(p.precio),
      maxProfesionales: String(p.maxProfesionales),
      modulos: p.modulos ?? [],
    });
    setEditingId(p.id);
    setShowForm(true);
    setOpenMenu(null);
  }

  function toggleModulo(clave: string) {
    setForm((f) => ({
      ...f,
      modulos: f.modulos.includes(clave) ? f.modulos.filter((m) => m !== clave) : [...f.modulos, clave],
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const body = { ...form, precio: Number(form.precio), maxProfesionales: Number(form.maxProfesionales) };
    const res = editingId
      ? await fetch(`/api/planes/${editingId}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      : await fetch("/api/planes", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (res.ok) { resetForm(); load(); }
    else { const d = await res.json(); setError(d.error ?? "Error"); }
  }

  async function handleDelete(id: string) {
    if (!confirm("¿Desactivar este plan?")) return;
    await fetch(`/api/planes/${id}`, { method: "DELETE" });
    setOpenMenu(null);
    load();
  }

  if (loading) return (
    <div className="p-6 space-y-4">
      {[1,2,3].map(i => (
        <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-gray-100 rounded-xl" />
            <div className="space-y-2 flex-1">
              <div className="h-4 bg-gray-100 rounded w-32" />
              <div className="h-3 bg-gray-100 rounded w-48" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className="p-4 lg:p-6 space-y-5" onClick={() => setOpenMenu(null)}>
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Planes</h1>
          <p className="text-sm text-gray-400 mt-0.5">Gestiona los planes y precios de tus servicios</p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 active:scale-95 text-white text-sm px-4 py-2.5 rounded-xl transition-all duration-150 shadow-sm shadow-blue-200"
        >
          <Plus size={16} /> Nuevo plan
        </button>
      </div>

      {/* Formulario */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden animate-in slide-in-from-top-2 duration-200">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">{editingId ? "Editar plan" : "Nuevo plan"}</h3>
            <button onClick={resetForm} className="text-gray-400 hover:text-gray-600 transition-colors">
              <X size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Clave (ej: BASICO)</label>
                <input
                  value={form.clave}
                  onChange={(e) => setForm(f => ({ ...f, clave: e.target.value.toUpperCase() }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required placeholder="BASICO"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Nombre visible</label>
                <input
                  value={form.nombre}
                  onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required placeholder="Plan Básico"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Precio mensual (CLP)</label>
                <input
                  type="number" value={form.precio}
                  onChange={(e) => setForm(f => ({ ...f, precio: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required placeholder="29990"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Máx. profesionales (0 = ilimitado)</label>
                <input
                  type="number" value={form.maxProfesionales}
                  onChange={(e) => setForm(f => ({ ...f, maxProfesionales: e.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Módulos adicionales incluidos en este plan
              </label>
              <p className="text-xs text-gray-400 mb-2">
                Solo estos son add-ons opcionales que un plan puede incluir o no — el resto de las
                funciones del sistema (agenda, fichas, presupuestos, reportes, etc.) son core y
                siempre están disponibles, sin importar el plan.
              </p>
              <div className="flex flex-wrap gap-2">
                {MODULOS_GATEABLES.map((m) => {
                  const activo = form.modulos.includes(m.clave);
                  return (
                    <button
                      key={m.clave}
                      type="button"
                      onClick={() => toggleModulo(m.clave)}
                      className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                        activo
                          ? "bg-blue-600 border-blue-600 text-white"
                          : "bg-gray-50 border-gray-200 text-gray-600 hover:border-blue-300"
                      }`}
                    >
                      {m.nombre}
                    </button>
                  );
                })}
              </div>
            </div>

            {error && <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                Cancelar
              </button>
              <button type="submit" className="px-4 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl transition-colors active:scale-95">
                {editingId ? "Guardar cambios" : "Crear plan"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de planes */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-50">
          {planes.map((p, idx) => {
            const { bg, color, Icon } = PLAN_ICONS[idx % PLAN_ICONS.length];
            const desc = PLAN_DESCS[p.clave] ?? (p.modulos.length > 0 ? `${p.modulos.length} módulos incluidos` : "Plan personalizado");
            return (
              <div
                key={p.id}
                className={`flex items-center gap-4 px-5 py-4 hover:bg-gray-50/50 transition-all duration-150 ${animIn ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                style={{ transitionDelay: `${idx * 60}ms` }}
              >
                <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <Icon size={18} className={color} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-900">{p.nombre}</p>
                    {!p.activo && (
                      <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactivo</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
                </div>

                <div className="hidden md:block text-right">
                  <p className="font-bold text-gray-900">${p.precio.toLocaleString("es-CL")}</p>
                  <p className="text-xs text-gray-400">CLP / mes</p>
                </div>

                <div className="hidden lg:block text-center w-28">
                  <p className="text-sm font-medium text-gray-700">
                    {p.maxProfesionales === 0 ? "Ilimitado" : p.maxProfesionales}
                  </p>
                  <p className="text-xs text-gray-400">profesionales</p>
                </div>

                <div className="hidden lg:block text-center w-20">
                  <p className="text-sm font-semibold text-gray-700">{p._count?.clientes ?? 0}</p>
                  <p className="text-xs text-gray-400">clientes</p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${p.activo ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-400"}`}>
                    {p.activo ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Editar"
                  >
                    <Pencil size={14} />
                  </button>
                  <div className="relative">
                    <button
                      onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === p.id ? null : p.id); }}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreHorizontal size={14} />
                    </button>
                    {openMenu === p.id && (
                      <div className="absolute right-0 top-8 z-20 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-36 animate-in zoom-in-95 slide-in-from-top-1 duration-150">
                        <button
                          onClick={(e) => { e.stopPropagation(); startEdit(p); }}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                        >
                          <Pencil size={13} /> Editar
                        </button>
                        {p.activo && (
                          <button
                            onClick={(e) => { e.stopPropagation(); handleDelete(p.id); }}
                            className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <X size={13} /> Desactivar
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
          {planes.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Package size={32} className="mx-auto mb-3 text-gray-200" />
              <p className="font-medium text-gray-500">No hay planes creados</p>
              <p className="text-sm mt-1">Crea el primer plan para comenzar</p>
            </div>
          )}
        </div>
      </div>

      {/* CTA footer */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
            <HelpCircle size={17} className="text-gray-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-900">¿Necesitas otro plan?</p>
            <p className="text-xs text-gray-400">Crea planes personalizados con las características que tu negocio necesita.</p>
          </div>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 text-sm text-gray-600 border border-gray-200 hover:border-blue-300 hover:text-blue-600 px-4 py-2 rounded-xl transition-colors"
        >
          <Plus size={14} /> Crear nuevo plan
        </button>
      </div>
    </div>
  );
}
