"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, PlayCircle, PauseCircle, LogIn } from "lucide-react";

type Props = {
  id: string;
  estado: "ACTIVO" | "SUSPENDIDO" | "CANCELADO";
};

export function ClienteAcciones({ id, estado }: Props) {
  const router = useRouter();
  const [cargando, setCargando] = useState<string | null>(null);

  async function accion(tipo: "suspender" | "activar") {
    setCargando(tipo);
    await fetch(`/api/clientes/${id}/${tipo}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo: tipo === "suspender" ? "Suspensión manual desde panel" : undefined }),
    });
    setCargando(null);
    router.refresh();
  }

  async function impersonar() {
    setCargando("portal");
    const res = await fetch(`/api/clientes/${id}/impersonar`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      if (data.url) window.open(data.url, "_blank");
    }
    setCargando(null);
  }

  return (
    <div className="flex items-center gap-1">
      {/* Ver detalle */}
      <button
        onClick={() => router.push(`/clientes/${id}`)}
        title="Ver detalle"
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
      >
        <Eye size={15} />
      </button>

      {/* Suspender / Activar */}
      {estado === "ACTIVO" ? (
        <button
          onClick={() => accion("suspender")}
          disabled={cargando !== null}
          title="Suspender servicio"
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-40"
        >
          <PauseCircle size={15} />
        </button>
      ) : estado === "SUSPENDIDO" ? (
        <button
          onClick={() => accion("activar")}
          disabled={cargando !== null}
          title="Reactivar servicio"
          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-40"
        >
          <PlayCircle size={15} />
        </button>
      ) : null}

      {/* Entrar al portal del cliente */}
      <button
        onClick={impersonar}
        disabled={cargando !== null}
        title="Ver portal del cliente"
        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-40"
      >
        <LogIn size={15} />
      </button>
    </div>
  );
}
