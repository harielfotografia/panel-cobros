"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ClienteSelectorDoc } from "@/components/documentos/ClienteSelectorDoc";
import { ItemsEditor } from "@/components/documentos/ItemsEditor";
import { EstadoBadgeDocs } from "@/components/documentos/EstadoBadgeDocs";
import { ConvertirDocumentoModal } from "@/components/documentos/ConvertirDocumentoModal";
import { cotizacionEditable, cotizacionConvertible, calcularTotales, itemVacio } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";
import { Save, Send, Printer, RefreshCw, CheckCircle2, XCircle } from "lucide-react";

const VIGENCIAS = ["15 días","30 días","45 días","60 días","90 días"];
const FORMAS_PAGO = ["Contado","Crédito 30 días","Crédito 60 días","Transferencia","Cheque"];
const inputCls = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500";

export default function EditarCotizacionPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [cot, setCot] = useState<Record<string, unknown> | null>(null);
  const [guardando, setGuardando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [convertirOpen, setConvertirOpen] = useState(false);

  const [cliente, setCliente] = useState<{ clienteId: string | null; clienteNombre: string; clienteRut: string }>({
    clienteId: null, clienteNombre: "", clienteRut: "",
  });
  const [fecha, setFecha] = useState("");
  const [vigencia, setVigencia] = useState("30 días");
  const [formaPago, setFormaPago] = useState("");
  const [atte, setAtte] = useState("");
  const [comentarios, setComentarios] = useState("");
  const [items, setItems] = useState<ItemDoc[]>([itemVacio()]);

  useEffect(() => {
    fetch(`/api/documentos/cotizaciones/${id}`)
      .then(r => r.json())
      .then(d => {
        setCot(d);
        setCliente({ clienteId: d.clienteId ?? null, clienteNombre: d.clienteNombre, clienteRut: d.clienteRut });
        setFecha(new Date(d.fecha).toISOString().slice(0, 10));
        setVigencia(d.vigencia);
        setFormaPago(d.formaPago);
        setAtte(d.atte);
        setComentarios(d.comentarios);
        setItems((d.items as ItemDoc[]) ?? [itemVacio()]);
      });
  }, [id]);

  async function guardar(nuevoEstado?: string) {
    if (!cliente.clienteNombre) { setError("Ingresa el nombre del cliente."); return; }
    setGuardando(nuevoEstado ?? "guardar");
    setError("");
    const { subtotal, iva, total } = calcularTotales(items);
    const res = await fetch(`/api/documentos/cotizaciones/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cliente, fecha, vigencia, formaPago, atte, comentarios, items,
        estado: nuevoEstado ?? cot?.estado, subtotal, iva, total }),
    });
    setGuardando(null);
    if (res.ok) {
      const d = await res.json();
      setCot(d);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al guardar.");
    }
  }

  if (!cot) return <div className="p-6 text-gray-400">Cargando...</div>;

  const estado = String(cot.estado ?? "BORRADOR");
  const editable = cotizacionEditable(estado);

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{String(cot.numero)}</h1>
            <EstadoBadgeDocs estado={estado} />
          </div>
          <p className="text-sm text-gray-500">{String(cot.clienteNombre)}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/api/documentos/pdf/cotizacion/${id}`} target="_blank"
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-3 py-2 rounded-lg transition-colors">
            <Printer size={14} /> PDF
          </a>
          {editable && estado === "BORRADOR" && (
            <button onClick={() => guardar("ENVIADA")} disabled={!!guardando}
              className="flex items-center gap-2 border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm px-3 py-2 rounded-lg transition-colors">
              <Send size={14} /> Marcar enviada
            </button>
          )}
          {editable && estado === "ENVIADA" && (
            <>
              <button onClick={() => guardar("APROBADA")} disabled={!!guardando}
                className="flex items-center gap-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg transition-colors">
                <CheckCircle2 size={14} /> Aprobar
              </button>
              <button onClick={() => guardar("RECHAZADA")} disabled={!!guardando}
                className="flex items-center gap-2 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg transition-colors">
                <XCircle size={14} /> Rechazar
              </button>
            </>
          )}
          {cotizacionConvertible(estado) && (
            <button onClick={() => setConvertirOpen(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-3 py-2 rounded-lg transition-colors">
              <RefreshCw size={14} /> Convertir
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl px-4 py-3">{error}</div>}
      {!editable && (
        <div className="bg-amber-50 border border-amber-200 text-amber-700 text-sm rounded-xl px-4 py-3">
          Esta cotización ya fue convertida y no puede editarse.
        </div>
      )}

      {/* Secciones (iguales al editor de nueva, pero con valores precargados) */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Datos del cliente</h2>
        <ClienteSelectorDoc value={cliente} onChange={editable ? setCliente : () => {}} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Información del documento</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input type="date" value={fecha} onChange={e => setFecha(e.target.value)} disabled={!editable} className={inputCls} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Vigencia</label>
            <select value={vigencia} onChange={e => setVigencia(e.target.value)} disabled={!editable} className={inputCls}>
              {VIGENCIAS.map(v => <option key={v}>{v}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Forma de pago</label>
            <select value={formaPago} onChange={e => setFormaPago(e.target.value)} disabled={!editable} className={inputCls}>
              <option value="">Seleccionar...</option>
              {FORMAS_PAGO.map(f => <option key={f}>{f}</option>)}
            </select></div>
          <div><label className="block text-xs text-gray-500 mb-1">Atención a</label>
            <input value={atte} onChange={e => setAtte(e.target.value)} disabled={!editable} className={inputCls} /></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Ítems / Servicios</h2>
        <ItemsEditor items={items} onChange={editable ? setItems : () => {}} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Comentarios</h2>
        <textarea value={comentarios} onChange={e => setComentarios(e.target.value)}
          disabled={!editable} rows={3} className={inputCls + " w-full"} />
      </div>

      {editable && (
        <div className="flex gap-3">
          <button onClick={() => guardar()} disabled={!!guardando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
            <Save size={15} />
            {guardando === "guardar" ? "Guardando..." : "Guardar cambios"}
          </button>
          <button onClick={() => router.back()} className="text-sm text-gray-500 hover:text-gray-700 px-4">
            Cancelar
          </button>
        </div>
      )}

      {convertirOpen && (
        <ConvertirDocumentoModal
          cotizacionId={id}
          cotizacionNumero={String(cot.numero)}
          onClose={() => setConvertirOpen(false)}
          onConverted={(tipo, docId) => {
            setConvertirOpen(false);
            router.push(`/facturas-admin/${tipo}s/${docId}`);
          }}
        />
      )}
    </div>
  );
}
