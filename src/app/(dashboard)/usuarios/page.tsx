"use client";
import { useEffect, useState } from "react";
import { UserCog, Users, Plus, Trash2, Pencil, X, Check, Phone, Mail, Percent } from "lucide-react";

type Admin = { id: string; email: string; nombre: string; rol: string; createdAt: string };
type Vendedora = { id: string; nombre: string; email: string | null; telefono: string | null; comisionPct: number | null; activa: boolean; _count: { clientes: number } };

const ROL_BADGE: Record<string, string> = {
  ADMIN: "bg-blue-100 text-blue-700",
  CONTADOR: "bg-amber-100 text-amber-700",
};
const inp = "w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function UsuariosPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [vendedoras, setVendedoras] = useState<Vendedora[]>([]);
  const [loadingV, setLoadingV] = useState(true);

  // Formulario nuevo admin
  const [formAdmin, setFormAdmin] = useState({ nombre: "", email: "", password: "", rol: "ADMIN" });
  const [showAdmin, setShowAdmin] = useState(false);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [errorAdmin, setErrorAdmin] = useState("");

  // Formulario vendedora (crear / editar)
  const [formV, setFormV] = useState<{ id: string | null; nombre: string; email: string; telefono: string; comisionPct: string }>({
    id: null, nombre: "", email: "", telefono: "", comisionPct: "",
  });
  const [showV, setShowV] = useState(false);
  const [savingV, setSavingV] = useState(false);
  const [errorV, setErrorV] = useState("");

  async function cargar() {
    const [a, v] = await Promise.all([
      fetch("/api/usuarios").then(r => r.json()),
      fetch("/api/vendedoras").then(r => r.json()),
    ]);
    setAdmins(Array.isArray(a) ? a : []);
    setVendedoras(Array.isArray(v) ? v : []);
    setLoadingV(false);
  }
  useEffect(() => { cargar(); }, []);

  // ── Admins ──────────────────────────────────────────────────────────────
  async function crearAdmin(e: React.FormEvent) {
    e.preventDefault();
    setSavingAdmin(true); setErrorAdmin("");
    const res = await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formAdmin),
    });
    setSavingAdmin(false);
    if (res.ok) {
      setFormAdmin({ nombre: "", email: "", password: "", rol: "ADMIN" });
      setShowAdmin(false);
      await cargar();
    } else {
      const d = await res.json();
      setErrorAdmin(d.error?.includes("Unique") ? "Ese email ya está en uso." : d.error ?? "Error.");
    }
  }

  async function eliminarAdmin(id: string, nombre: string) {
    if (!confirm(`¿Eliminar a ${nombre}?`)) return;
    await fetch(`/api/usuarios/${id}`, { method: "DELETE" });
    await cargar();
  }

  // ── Vendedoras ───────────────────────────────────────────────────────────
  function abrirNuevaV() {
    setFormV({ id: null, nombre: "", email: "", telefono: "", comisionPct: "" });
    setErrorV(""); setShowV(true);
  }

  function abrirEditarV(v: Vendedora) {
    setFormV({ id: v.id, nombre: v.nombre, email: v.email ?? "", telefono: v.telefono ?? "", comisionPct: v.comisionPct != null ? String(v.comisionPct) : "" });
    setErrorV(""); setShowV(true);
  }

  async function guardarV(e: React.FormEvent) {
    e.preventDefault();
    if (!formV.nombre.trim()) { setErrorV("El nombre es obligatorio."); return; }
    setSavingV(true); setErrorV("");
    const payload = {
      nombre: formV.nombre.trim(),
      email: formV.email || null,
      telefono: formV.telefono || null,
      comisionPct: formV.comisionPct !== "" ? Number(formV.comisionPct) : null,
    };
    const url = formV.id ? `/api/vendedoras/${formV.id}` : "/api/vendedoras";
    const method = formV.id ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setSavingV(false);
    if (res.ok) {
      setShowV(false);
      await cargar();
    } else {
      const d = await res.json();
      setErrorV(d.error?.includes("Unique") ? "Ese email ya está registrado." : d.error ?? "Error al guardar.");
    }
  }

  async function eliminarV(v: Vendedora) {
    if (!confirm(`¿Eliminar a ${v.nombre}? Sus ${v._count.clientes} clientes quedarán sin vendedora asignada.`)) return;
    await fetch(`/api/vendedoras/${v.id}`, { method: "DELETE" });
    await cargar();
  }

  async function toggleActivaV(v: Vendedora) {
    await fetch(`/api/vendedoras/${v.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, activa: !v.activa }),
    });
    await cargar();
  }

  return (
    <div className="p-4 lg:p-6 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">Usuarios del sistema</h1>
        <p className="text-sm text-gray-500 mt-0.5">Administra quién accede al panel y gestiona el equipo de ventas.</p>
      </div>

      {/* ── Sección: Admins ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <UserCog size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Usuarios del panel ({admins.length})</h2>
          </div>
          <button onClick={() => setShowAdmin(!showAdmin)}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500 transition-colors">
            <Plus size={15} /> Nuevo usuario
          </button>
        </div>

        {showAdmin && (
          <form onSubmit={crearAdmin} className="px-5 py-4 border-b border-gray-100 bg-gray-50 space-y-3">
            <p className="text-xs font-medium text-gray-600">Nuevo usuario del panel</p>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="block text-xs text-gray-500 mb-1">Nombre</label>
                <input value={formAdmin.nombre} onChange={e => setFormAdmin(f => ({...f, nombre: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Email</label>
                <input type="email" value={formAdmin.email} onChange={e => setFormAdmin(f => ({...f, email: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Contraseña</label>
                <input type="password" minLength={8} value={formAdmin.password} onChange={e => setFormAdmin(f => ({...f, password: e.target.value}))} required className={inp} /></div>
              <div><label className="block text-xs text-gray-500 mb-1">Rol</label>
                <select value={formAdmin.rol} onChange={e => setFormAdmin(f => ({...f, rol: e.target.value}))} className={inp}>
                  <option value="ADMIN">Administrador — acceso total</option>
                  <option value="CONTADOR">Contador — solo lectura finanzas</option>
                </select></div>
            </div>
            {errorAdmin && <p className="text-xs text-red-500">{errorAdmin}</p>}
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowAdmin(false)} className="text-sm px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">Cancelar</button>
              <button type="submit" disabled={savingAdmin} className="text-sm px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 transition-colors">
                {savingAdmin ? "Creando..." : "Crear usuario"}
              </button>
            </div>
          </form>
        )}

        <div className="divide-y divide-gray-50">
          {admins.map(a => (
            <div key={a.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-700 flex-shrink-0">
                {a.nombre.slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{a.nombre}</p>
                <p className="text-xs text-gray-400">{a.email}</p>
              </div>
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${ROL_BADGE[a.rol] ?? "bg-gray-100 text-gray-600"}`}>
                {a.rol === "ADMIN" ? "Administrador" : "Contador"}
              </span>
              <button onClick={() => eliminarAdmin(a.id, a.nombre)} className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ── Sección: Vendedoras ── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Users size={16} className="text-gray-400" />
            <h2 className="text-sm font-semibold text-gray-900">Equipo de ventas ({vendedoras.length})</h2>
          </div>
          <button onClick={abrirNuevaV}
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-500 transition-colors">
            <Plus size={15} /> Nueva vendedora
          </button>
        </div>

        {loadingV ? (
          <p className="text-sm text-gray-400 text-center py-8">Cargando...</p>
        ) : vendedoras.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users size={28} className="text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No hay vendedoras registradas.</p>
            <p className="text-xs text-gray-400 mt-1">Crea tu equipo de ventas y asígnalas a cada cliente.</p>
            <button onClick={abrirNuevaV} className="mt-4 text-sm text-blue-600 hover:text-blue-500 border border-blue-200 px-4 py-2 rounded-lg transition-colors">
              + Agregar primera vendedora
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {vendedoras.map(v => (
              <div key={v.id} className={`px-5 py-4 transition-colors ${!v.activa ? "opacity-50" : ""}`}>
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center text-sm font-bold text-green-700 flex-shrink-0">
                    {v.nombre.slice(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900">{v.nombre}</p>
                      {!v.activa && <span className="text-xs bg-gray-100 text-gray-400 px-2 py-0.5 rounded-full">Inactiva</span>}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-1">
                      {v.email && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Mail size={11} /> {v.email}
                        </span>
                      )}
                      {v.telefono && (
                        <span className="flex items-center gap-1 text-xs text-gray-400">
                          <Phone size={11} /> {v.telefono}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Percent size={11} />
                        {v.comisionPct != null ? `${v.comisionPct}% comisión propia` : "% global de configuración"}
                      </span>
                      <span className="text-xs text-gray-400">
                        · {v._count.clientes} {v._count.clientes === 1 ? "cliente" : "clientes"} asignados
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => abrirEditarV(v)} title="Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Pencil size={13} />
                    </button>
                    <button onClick={() => toggleActivaV(v)} title={v.activa ? "Desactivar" : "Activar"}
                      className={`p-1.5 rounded-lg transition-colors ${v.activa ? "text-gray-300 hover:text-amber-500 hover:bg-amber-50" : "text-gray-300 hover:text-green-600 hover:bg-green-50"}`}>
                      {v.activa ? <X size={13} /> : <Check size={13} />}
                    </button>
                    <button onClick={() => eliminarV(v)} title="Eliminar"
                      className="p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm">
        <p className="font-medium text-blue-900 mb-1">Flujo de asignación</p>
        <p className="text-blue-700">
          1. Crea la vendedora aquí con su nombre, contacto y % de comisión propio.<br />
          2. Al crear o editar un cliente, elige su vendedora desde el listado.<br />
          3. En Reportes → Comisiones verás cuánto ha generado cada vendedora.
        </p>
      </div>

      {/* ── Modal vendedora ── */}
      {showV && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-gray-900">
                {formV.id ? "Editar vendedora" : "Nueva vendedora"}
              </h2>
              <button onClick={() => setShowV(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
            </div>
            <form onSubmit={guardarV} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Nombre *</label>
                <input value={formV.nombre} onChange={e => setFormV(f => ({...f, nombre: e.target.value}))} required placeholder="Nombre completo" className={inp} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Email</label>
                  <input type="email" value={formV.email} onChange={e => setFormV(f => ({...f, email: e.target.value}))} placeholder="vendedora@mail.com" className={inp} />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Teléfono</label>
                  <input value={formV.telefono} onChange={e => setFormV(f => ({...f, telefono: e.target.value}))} placeholder="+56 9 xxxx xxxx" className={inp} />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">% Comisión propia (vacío = usa el global)</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" max="100" step="0.5" value={formV.comisionPct}
                    onChange={e => setFormV(f => ({...f, comisionPct: e.target.value}))}
                    placeholder="Ej: 8"
                    className="w-28 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-sm text-gray-500">%</span>
                  <span className="text-xs text-gray-400">Si se deja vacío, usa el % global de Configuración.</span>
                </div>
              </div>
              {errorV && <p className="text-xs text-red-500">{errorV}</p>}
              <div className="flex gap-2 pt-1">
                <button type="button" onClick={() => setShowV(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2.5 rounded-lg transition-colors">
                  Cancelar
                </button>
                <button type="submit" disabled={savingV}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors">
                  {savingV ? "Guardando..." : formV.id ? "Guardar cambios" : "Crear vendedora"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
