"use client";
import { useState } from "react";
import { X, FileText, Receipt } from "lucide-react";

type Props = {
  cotizacionId: string;
  cotizacionNumero: string;
  onClose: () => void;
  onConverted: (tipo: "factura" | "boleta", docId: string) => void;
};

const PLAZOS = [
  { v: "contado", label: "Contado" },
  { v: "30", label: "30 días" },
  { v: "60", label: "60 días" },
  { v: "90", label: "90 días" },
];

export function ConvertirDocumentoModal({ cotizacionId, cotizacionNumero, onClose, onConverted }: Props) {
  const [tipo, setTipo] = useState<"factura" | "boleta">("factura");
  const [plazoPago, setPlazoPago] = useState("30");
  const [convirtiendo, setConvirtiendo] = useState(false);
  const [error, setError] = useState("");

  async function convertir() {
    setConvirtiendo(true);
    setError("");
    const res = await fetch(`/api/documentos/cotizaciones/${cotizacionId}/convertir`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo, plazoPago: tipo === "factura" ? plazoPago : undefined }),
    });
    setConvirtiendo(false);
    if (res.ok) {
      const d = await res.json();
      onConverted(tipo, d.documento.id);
    } else {
      const d = await res.json();
      setError(d.error ?? "Error al convertir.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-gray-900">Convertir cotización</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        <p className="text-sm text-gray-500">
          Convirtiendo <span className="font-mono font-medium text-blue-600">{cotizacionNumero}</span> en:
        </p>

        {/* Selector tipo */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setTipo("factura")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
              tipo === "factura" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <FileText size={24} className={tipo === "factura" ? "text-blue-600" : "text-gray-400"} />
            <span className="text-sm font-medium text-gray-900">Factura</span>
            <span className="text-xs text-gray-400">Con desglose IVA</span>
          </button>
          <button
            type="button"
            onClick={() => setTipo("boleta")}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-colors ${
              tipo === "boleta" ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Receipt size={24} className={tipo === "boleta" ? "text-blue-600" : "text-gray-400"} />
            <span className="text-sm font-medium text-gray-900">Boleta</span>
            <span className="text-xs text-gray-400">Total con IVA incluido</span>
          </button>
        </div>

        {/* Plazo pago solo para factura */}
        {tipo === "factura" && (
          <div>
            <label className="block text-xs text-gray-500 mb-2">Plazo de pago</label>
            <div className="grid grid-cols-4 gap-2">
              {PLAZOS.map(p => (
                <button
                  key={p.v}
                  type="button"
                  onClick={() => setPlazoPago(p.v)}
                  className={`text-sm py-2 rounded-lg border transition-colors ${
                    plazoPago === p.v ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm py-2.5 rounded-lg transition-colors">
            Cancelar
          </button>
          <button onClick={convertir} disabled={convirtiendo}
            className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm py-2.5 rounded-lg transition-colors">
            {convirtiendo ? "Convirtiendo..." : `Crear ${tipo}`}
          </button>
        </div>
      </div>
    </div>
  );
}
