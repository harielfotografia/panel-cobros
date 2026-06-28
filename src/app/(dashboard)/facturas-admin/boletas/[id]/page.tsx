"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { EstadoBadgeDocs } from "@/components/documentos/EstadoBadgeDocs";
import { AdjuntosBase64, type Adjunto } from "@/components/documentos/AdjuntosBase64";
import { formatCLP } from "@/lib/documentos";
import { Save, Printer, CheckCircle2, XCircle } from "lucide-react";

const inp = "bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full";

export default function EditarBoletaPage() {
  const { id } = useParams<{ id: string }>();
  const [bol, setBol] = useState<Record<string, unknown> | null>(null);
  const [guardando, setGuardando] = useState(false);
  const [numeroSii, setNumeroSii] = useState("");
  const [fechaEmision, setFechaEmision] = useState("");
  const [estado, setEstado] = useState("PENDIENTE");
  const [notas, setNotas] = useState("");
  const [adjuntos, setAdjuntos] = useState<Adjunto[]>([]);

  useEffect(() => {
    fetch(`/api/documentos/boletas/${id}`).then(r => r.json()).then(d => {
      setBol(d);
      setNumeroSii(d.numeroSii ?? "");
      setFechaEmision(new Date(d.fechaEmision).toISOString().slice(0, 10));
      setEstado(d.estado ?? "PENDIENTE");
      setNotas(d.notas ?? "");
      setAdjuntos((d.adjuntos as Adjunto[]) ?? []);
    });
  }, [id]);

  async function guardar(nuevoEstado?: string) {
    if (!bol) return;
    setGuardando(true);
    await fetch(`/api/documentos/boletas/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        numeroSii, fechaEmision,
        clienteNombre: bol.clienteNombre,
        estado: nuevoEstado ?? estado,
        montoTotal: bol.montoTotal, notas, adjuntos,
      }),
    });
    setGuardando(false);
    if (nuevoEstado) setEstado(nuevoEstado);
  }

  if (!bol) return <div className="p-6 text-gray-400">Cargando...</div>;

  return (
    <div className="p-4 lg:p-6 max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-lg font-bold text-gray-900 font-mono">{String(bol.numero)}</h1>
            <EstadoBadgeDocs estado={estado} />
          </div>
          <p className="text-sm text-gray-500">{String(bol.clienteNombre)}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <a href={`/api/documentos/pdf/boleta/${id}`} target="_blank"
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div><label className="block text-xs text-gray-500 mb-1">N° Boleta SII</label>
            <input value={numeroSii} onChange={e => setNumeroSii(e.target.value)} className={inp} /></div>
          <div><label className="block text-xs text-gray-500 mb-1">Fecha</label>
            <input type="date" value={fechaEmision} onChange={e => setFechaEmision(e.target.value)} className={inp} /></div>
        </div>
        <div className="bg-gray-50 rounded-xl p-4 text-center">
          <p className="text-xs text-gray-400 mb-1">Total</p>
          <p className="text-2xl font-bold text-blue-600">{formatCLP(bol.montoTotal as number)}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <h2 className="text-sm font-semibold text-gray-900">Adjuntos</h2>
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
