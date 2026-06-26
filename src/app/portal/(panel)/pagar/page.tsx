"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PagarPage() {
  const router = useRouter();
  const [loading, setLoading] = useState("");
  const [mensaje, setMensaje] = useState("");

  async function pagar(tipo: "automatico" | "manual") {
    setLoading(tipo);
    setMensaje("");
    const res = await fetch("/api/portal/pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    const data = await res.json();

    if (data.redirect) {
      window.location.href = data.redirect; // MercadoPago
      return;
    }
    if (data.simulado) {
      setMensaje("✓ Pago simulado con éxito. Tu servicio quedó al día.");
      setTimeout(() => router.push("/portal"), 1500);
      return;
    }
    setMensaje(data.error ?? "Ocurrió un error. Intenta de nuevo.");
    setLoading("");
  }

  return (
    <div className="space-y-6 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Pagar mi suscripción</h1>
        <button onClick={() => router.push("/portal")} className="text-sm text-gray-500 hover:text-gray-300">
          ← Volver
        </button>
      </div>

      {mensaje && (
        <p className="text-sm bg-gray-900 border border-gray-800 rounded-lg px-4 py-3">{mensaje}</p>
      )}

      {/* Suscripción automática - recomendada */}
      <div className="bg-gray-900 rounded-xl p-6 border-2 border-indigo-500/60 relative">
        <span className="absolute -top-3 left-6 bg-indigo-600 text-xs px-3 py-1 rounded-full font-medium">
          Recomendado
        </span>
        <h2 className="text-base font-semibold mb-1">Cobro automático mensual</h2>
        <p className="text-sm text-gray-400 mb-4">
          Registras tu tarjeta una sola vez y se cobra solo cada mes. Nunca más te preocupas por vencimientos
          ni suspensiones.
        </p>
        <button
          onClick={() => pagar("automatico")}
          disabled={!!loading}
          className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          {loading === "automatico" ? "Procesando..." : "Activar cobro automático"}
        </button>
      </div>

      {/* Pago manual */}
      <div className="bg-gray-900 rounded-xl p-6 border border-gray-800">
        <h2 className="text-base font-semibold mb-1">Pagar solo este mes</h2>
        <p className="text-sm text-gray-400 mb-4">
          Realizas un pago único ahora. Tendrás que repetirlo el próximo mes manualmente.
        </p>
        <button
          onClick={() => pagar("manual")}
          disabled={!!loading}
          className="w-full bg-gray-800 hover:bg-gray-700 disabled:opacity-50 rounded-lg py-2.5 text-sm font-medium transition-colors"
        >
          {loading === "manual" ? "Procesando..." : "Pagar una vez"}
        </button>
      </div>
    </div>
  );
}
