"use client";
import { useState } from "react";
import { Paperclip, Trash2, Download } from "lucide-react";

export type Adjunto = { nombre: string; tipo: string; base64: string; fechaSubida: string };

type Props = {
  adjuntos: Adjunto[];
  onChange: (adjuntos: Adjunto[]) => void;
};

const TIPOS_PERMITIDOS = ["application/pdf", "text/xml", "application/xml", "image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 2 * 1024 * 1024; // 2 MB

export function AdjuntosBase64({ adjuntos, onChange }: Props) {
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    if (!TIPOS_PERMITIDOS.includes(file.type)) {
      setError("Tipo no permitido. Usa PDF, XML o imagen.");
      return;
    }
    if (file.size > MAX_SIZE) {
      setError("El archivo supera 2 MB.");
      return;
    }

    setCargando(true);
    const base64 = await new Promise<string>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => resolve((reader.result as string).split(",")[1]);
      reader.readAsDataURL(file);
    });

    const tipo = file.type.includes("pdf") ? "pdf" : file.type.includes("xml") ? "xml" : "imagen";
    onChange([...adjuntos, { nombre: file.name, tipo, base64, fechaSubida: new Date().toISOString() }]);
    setCargando(false);
    e.target.value = "";
  }

  function eliminar(idx: number) {
    onChange(adjuntos.filter((_, i) => i !== idx));
  }

  function descargar(adj: Adjunto) {
    const mime = adj.tipo === "pdf" ? "application/pdf" : adj.tipo === "xml" ? "application/xml" : "image/jpeg";
    const url = `data:${mime};base64,${adj.base64}`;
    const a = document.createElement("a");
    a.href = url;
    a.download = adj.nombre;
    a.click();
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <label className="cursor-pointer flex items-center gap-2 text-sm text-blue-600 hover:text-blue-500 transition-colors">
          <Paperclip size={15} />
          {cargando ? "Subiendo..." : "Adjuntar archivo"}
          <input type="file" className="hidden" accept=".pdf,.xml,.jpg,.jpeg,.png,.webp" onChange={handleFile} disabled={cargando} />
        </label>
        <span className="text-xs text-gray-400">PDF, XML o imagen (máx. 2 MB)</span>
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}

      {adjuntos.length > 0 && (
        <div className="space-y-2">
          {adjuntos.map((adj, i) => (
            <div key={i} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                  adj.tipo === "pdf" ? "bg-red-100 text-red-700" :
                  adj.tipo === "xml" ? "bg-blue-100 text-blue-700" :
                  "bg-green-100 text-green-700"
                }`}>{adj.tipo.toUpperCase()}</span>
                <span className="truncate text-gray-700">{adj.nombre}</span>
              </div>
              <div className="flex gap-2 flex-shrink-0 ml-2">
                <button type="button" onClick={() => descargar(adj)} className="text-gray-400 hover:text-blue-600">
                  <Download size={14} />
                </button>
                <button type="button" onClick={() => eliminar(i)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
