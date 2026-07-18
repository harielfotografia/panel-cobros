"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ClienteSelectorDoc } from "@/components/documentos/ClienteSelectorDoc";
import { ItemsEditor } from "@/components/documentos/ItemsEditor";
import { itemVacio, formatCLP } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";
import { Save } from "lucide-react";

const PLAZOS = [
  { v: "contado", label: "Contado" },
  { v: "30", label: "30 días" },
  { v: "60", label: "60 días" },
  { v: "90", label: "90 días" },
];
const inp = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export default function NuevaFacturaPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [cliente, setCliente] = useState<{ clienteId: string | null; clienteNombre: string; clienteRut: string }>({
    clienteId: null, clienteNombre: "", clienteRut: "",
  });

  // "Generar factura manual" desde la ficha de un cliente pasa ?clienteId=... — antes esto se
  // ignoraba por completo (la URL de destino no llevaba ningún dato) y el formulario abría en
  // blanco, obligando a re-buscar al mismo cliente desde cero. Con el clienteId ya en la URL, se
  // trae su nombre/RUT reales para que el selector muestre la selección correcta Y la validación
  // de "guardar" (que exige clienteNombre) no falle con un cliente ya elegido.
  // Se lee `location.search` directo (no `useSearchParams()`): ese hook exige envolver la página
  // en <Suspense>, y se confirmó en vivo (misma sesión, ver portal/(panel)/pagar/page.tsx) que ese
  // patrón puede dejar el contenido real streameado sin nunca reemplazar el fallback — mismo bug,
  // evitado aquí por completo usando el mismo approach ya verificado como seguro.
  useEffect(() => {
    const clienteId = new URLSearchParams(window.location.search).get("clienteId");
    if (!clienteId) return;
    fetch(`/api/clientes/${clienteId}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (data) setCliente({ clienteId: data.id, clienteNombre: data.nombre, clienteRut: data.rut ?? "" });
      });
  }, []);
  const [numeroSii, setNumeroSii] = useState("");
  const [fechaEmision, setFechaEmision] = useState(new Date().toISOString().slice(0, 10));
  const [plazoPago, setPlazoPago] = useState("30");
  const [items, setItems] = useState<ItemDoc[]>([itemVacio()]);
  const [notas, setNotas] = useState("");

  const montoNeto = items.reduce((a, it) => a + it.total, 0);
  const iva = Math.round(montoNeto * 0.19);
  const total = montoNeto + iva;

  async function guardar() {
    if (!cliente.clienteNombre) { setError("Ingresa el nombre del cliente."); return; }
    setGuardando(true); setError("");
    const res = await fetch("/api/documentos/facturas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cliente, numeroSii, fechaEmision, plazoPago, montoNeto, items, notas }),
    });
    setGuardando(false);
    if (res.ok) { const d = await res.json(); router.push(`/facturas-admin/facturas/${d.id}`); }
    else { const d = await res.json(); setError(d.error ?? "Error al guardar."); }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">Nueva factura</h1>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Volver</button>
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Cliente</h2>
        <ClienteSelectorDoc value={cliente} onChange={setCliente} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Datos de la factura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">N° Factura SII (opcional)</label>
            <input value={numeroSii} onChange={e => setNumeroSii(e.target.value)} placeholder="001234" className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Fecha de emisión</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Plazo de pago</label>
            <select value={plazoPago} onChange={e => setPlazoPago(e.target.value)} className={inp}>
              {PLAZOS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select></div>
        </div>
        {/* Resumen de montos */}
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="text-xs text-gray-400 mb-1">Neto</p><p className="font-semibold">{formatCLP(montoNeto)}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">IVA 19%</p><p className="font-semibold">{formatCLP(iva)}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Total</p><p className="font-bold text-blue-600">{formatCLP(total)}</p></div>
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
        <Save size={15} />{guardando ? "Guardando..." : "Crear factura"}
      </button>
    </div>
  );
}
