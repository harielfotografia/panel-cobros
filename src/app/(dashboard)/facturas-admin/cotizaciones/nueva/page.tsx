"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClienteSelectorDoc } from "@/components/documentos/ClienteSelectorDoc";
import { ItemsEditor } from "@/components/documentos/ItemsEditor";
import { itemVacio, calcularTotales } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";
import { Save, Send } from "lucide-react";

const VIGENCIAS = ["15 días", "30 días", "45 días", "60 días", "90 días"];
const FORMAS_PAGO = ["Contado", "Crédito 30 días", "Crédito 60 días", "Transferencia", "Cheque"];

export default function NuevaCotizacionPage() {
  const router = useRouter();
  const [guardando, setGuardando] = useState<"borrador" | "enviada" | null>(null);
  const [error, setError] = useState("");

  const [cliente, setCliente] = useState<{ clienteId: string | null; clienteNombre: string; clienteRut: string }>({
    clienteId: null, clienteNombre: "", clienteRut: "",
  });
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [vigencia, setVigencia] = useState("30 días");
  const [formaPago, setFormaPago] = useState("");
  const [atte, setAtte] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [items, setItems] = useState<ItemDoc[]>([itemVacio()]);

  async function guardar(estado: "BORRADOR" | "ENVIADA") {
    if (!cliente.clienteNombre) { setError("Ingresa el nombre del cliente."); return; }
    if (items.every(it => !it.descripcion)) { setError("Agrega al menos un ítem con descripción."); return; }

    setGuardando(estado === "BORRADOR" ? "borrador" : "enviada");
    setError("");

    const { subtotal, iva, total } = calcularTotales(items);
    const res = await fetch("/api/documentos/cotizaciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cliente, fecha, vigencia, formaPago, atte, comentarios, items, estado, subtotal, iva, total }),
    });
    setGuardando(null);
    if (res.ok) {
      const data = await res.json();
      router.push(`/facturas-admin/cotizaciones/${data.id}`);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar.");
    }
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">Nueva cotización</h1>
          <p className="text-sm text-gray-500">Completa los datos y agrega los ítems del servicio.</p>
        </div>
        <button onClick={() => router.back()} className="text-sm text-gray-400 hover:text-gray-600">← Volver</button>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}

      {/* Sección 1 — Cliente y encabezado */}
      <Section title="Datos del cliente">
        <ClienteSelectorDoc value={cliente} onChange={setCliente} />
      </Section>

      <Section title="Información del documento">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Campo label="Fecha">
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} className={input} />
          </Campo>
          <Campo label="Vigencia">
            <select value={vigencia} onChange={e => setVigencia(e.target.value)} className={input}>
              {VIGENCIAS.map(v => <option key={v}>{v}</option>)}
            </select>
          </Campo>
          <Campo label="Forma de pago">
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} className={input}>
              <option value="">Seleccionar...</option>
              {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
            </select>
          </Campo>
          <Campo label="Atención a (contacto)">
            <input value={atte} onChange={e => setAtte(e.target.value)} placeholder="Nombre del contacto" className={input} />
          </Campo>
        </div>
      </Section>

      {/* Sección 2 — Ítems */}
      <Section title="Ítems / Servicios">
        <ItemsEditor items={items} onChange={setItems} />
      </Section>

      {/* Sección 3 — Comentarios */}
      <Section title="Comentarios y condiciones">
        <textarea
          value={comentarios}
          onChange={e => setComentarios(e.target.value)}
          rows={3}
          placeholder="Condiciones de servicio, observaciones, etc."
          className={input + " w-full"}
        />
      </Section>

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 pt-2">
        <button
          onClick={() => guardar("BORRADOR")}
          disabled={!!guardando}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          <Save size={15} />
          {guardando === "borrador" ? "Guardando..." : "Guardar borrador"}
        </button>
        <button
          onClick={() => guardar("ENVIADA")}
          disabled={!!guardando}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors"
        >
          <Send size={15} />
          {guardando === "enviada" ? "Enviando..." : "Guardar y marcar enviada"}
        </button>
      </div>
    </div>
  );
}

const input = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}
