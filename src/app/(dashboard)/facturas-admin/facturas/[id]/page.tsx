"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { EstadoBadgeDocs } from "@/components/documentos/EstadoBadgeDocs";
import { AdjuntosBase64, type Adjunto } from "@/components/documentos/AdjuntosBase64";
import { formatCLP } from "@/lib/documentos";
import { Save, Printer, CheckCircle2, XCircle } from "lucide-react";

const inp = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";
const PLAZOS = [{ v: "contado", label: "Contado" },{ v: "30", label: "30 días" },{ v: "60", label: "60 días" },{ v: "90", label: "90 días" }];

export default function EditarFacturaPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [fac, setFac] = useState<Record<string, unknown> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [numeroSii, setNumeroSii] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [plazoPago, setPlazoPago] = useState("30");
  const [estado, setEstado] = useState("PENDIENTE");
  const [notas, setNotas] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);

  useEffect(() => {
    fetch(`/api/documentos/facturas/${id}`).then(r => r.json()).then(d => {
      setFac(d);
      setNumeroSii(d.numeroSii ?? "");
      setFechaEmision(new Date(d.fechaEmision).toISOString().slice(0, 10));
      setPlazoPago(d.plazoPago ?? "30");
      setEstado(d.estado ?? "PENDIENTE");
      setNotas(d.notas ?? "");
      setAdjuntos((d.adjuntos as Adjunto[]) ?? []);
    });
  }, [id]);

  async function guardar(nuevoEstado?: string) {
    if (!fac) return;
    setGuardando(true);
    const montoNeto = fac.montoNeto as number;
    await fetch(`/api/documentos/facturas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroSii, fechaEmision, plazoPago,
        clienteNombre: fac.clienteNombre, clienteRut: fac.clienteRut,
        estado: nuevoEstado ?? estado,
        montoNeto, notas, adjuntos,
      }),
    });
    setGuardando(false);
    if (nuevoEstado) setEstado(nuevoEstado);
  }

  if (!fac) return <div className="p-6 text-gray-400">Cargando...</div>;
  const montoNeto = fac.montoNeto as number;

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{String(fac.numero)}</h1>
            <EstadoBadgeDocs estado={estado} />
          </div>
          <p className="text-sm text-gray-500">{String(fac.clienteNombre)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/documentos/pdf/factura/${id}`} target="_blank"
            className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-600 text-sm px-3 py-2 rounded-lg transition-colors">
            <Printer size={14} /> PDF
          </a>
          {estado === "PENDIENTE" && (
            <button onClick={() => guardar("PAGADA")}
              className="flex items-center gap-2 bg-green-50 border border-green-200 hover:bg-green-100 text-green-700 text-sm px-3 py-2 rounded-lg transition-colors">
              <CheckCircle2 size={14} /> Marcar pagada
            </button>
          )}
          {estado !== "ANULADA" && (
            <button onClick={() => guardar("ANULADA")}
              className="flex items-center gap-2 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-sm px-3 py-2 rounded-lg transition-colors">
              <XCircle size={14} /> Anular
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h2 className="text-sm font-semibold text-gray-900">Datos de la factura</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">N° Factura SII</label>
            <input value={numeroSii} onChange={e => setNumeroSii(e.target.value)} placeholder="001234" className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Fecha de emisión</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Plazo de pago</label>
            <select value={plazoPago} onChange={e => setPlazoPago(e.target.value)} className={inp}>
              {PLAZOS.map(p => <option key={p.v} value={p.v}>{p.label}</option>)}
            </select></div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 grid grid-cols-3 gap-4 text-center text-sm">
          <div><p className="text-xs text-gray-400 mb-1">Neto</p><p className="font-semibold">{formatCLP(montoNeto)}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">IVA 19%</p><p className="font-semibold">{formatCLP(Math.round(montoNeto*0.19))}</p></div>
          <div><p className="text-xs text-gray-400 mb-1">Total</p><p className="font-bold text-blue-600">{formatCLP(fac.total as number)}</p></div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Adjuntos (PDF SII, XML, imágenes)</h2>
        <AdjuntosBase64 adjuntos={adjuntos} onChange={setAdjuntos} />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-2">
        <label className="block text-sm font-semibold text-gray-900">Notas</label>
        <textarea value={notas} onChange={e => setNotas(e.target.value)} rows={2} className={inp} />
      </div>

      <button onClick={() => guardar()} disabled={guardando}
        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm px-5 py-2.5 rounded-lg transition-colors">
        <Save size={15} />{guardando ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
