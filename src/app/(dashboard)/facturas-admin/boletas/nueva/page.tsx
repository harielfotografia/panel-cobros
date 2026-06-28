"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClienteSelectorDoc } from "@/components/documentos/ClienteSelectorDoc";
import { ItemsEditor } from "@/components/documentos/ItemsEditor";
import { itemVacio, formatCLP } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";
import { Save } from "lucide-react";

const inp = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export default function NuevaBoletaPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [cliente, setCliente] = useState<{ clienteId: string | null; clienteNombre: string; clienteRut: string }>({ clienteId: null, clienteNombre: "", clienteRut: "" });
  const [numeroSii, setNumeroSii] = useState("");
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<ItemDoc[]>([itemVacio()]);
  const [notas, setNotas] = useState("");

  // Boleta: el montoTotal es el total con IVA incluido (igual a la suma de los ítems que ya incluyen IVA)
  const montoTotal = items.reduce((a, it) => a + it.total, 0);

  async function guardar() {
    if (!cliente.clienteNombre) { setError("Ingresa el nombre del cliente."); return; }
    setGuardando(true); setError("");
    const res = await fetch("/api/documentos/boletas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cliente, numeroSii, fechaEmision, montoTotal, items, notas }),
    });
    setGuardando(false);
    if (res.ok) { const d = await res.json(); router.push(`/facturas-admin/boletas/${d.id}`); }
    else { const d = await res.json(); setError(d.error ?? "Error al guardar."); }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">Nueva boleta</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Volver</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Cliente</h2>
        <ClienteSelectorDoc value={cliente} onChange={setCliente} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Datos de la boleta</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">N° Boleta SII (opcional)</label>
            <input value={numeroSii} onChange={e => setNumeroSii(e.target.value)} placeholder="001234" className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className={inp} /></div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Total a cobrar (IVA incluido)</p>
          <p className="text-2xl font-bold text-blue-600">{formatCLP(montoTotal)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Ítems</h2>
        <ItemsEditor items={items} onChange={setItems} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={inp} />
      </div>

      <button onClick={guardar} disabled={guardando}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
        <Save size={15} />{guardando ? "Guardando..." : "Crear boleta"}
      </button>
    </div>
  );
}
