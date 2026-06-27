"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { CreditCard, Zap } from "lucide-react";

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
      window.location.href = data.redirect;
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
      <h1 className="text-xl font-bold text-gray-900">Pagar mi suscripción</h1>

      {mensaje && (
        <p className="text-sm bg-green-50 border border-green-200 text-green-700 rounded-xl px-4 py-3">{mensaje}</p>
      )}

      {/* Cobro automático */}
      <div className="bg-white rounded-2xl p-6 border-2 border-blue-400 relative">
        <span className="absolute -top-3 left-6 bg-blue-600 text-white text-xs px-3 py-1 rounded-full font-medium">
          Recomendado
        </span>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
            <Zap size={20} className="text-blue-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Cobro automático mensual</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Registras tu tarjeta una sola vez y se cobra solo cada mes. Nunca más te preocupas por vencimientos
          ni suspensiones.
        </p>
        <button
          onClick={() => pagar("automatico")}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {loading === "automatico" ? "Procesando..." : "Activar cobro automático"}
        </button>
      </div>

      {/* Pago manual */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Pagar solo este mes</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Realizas un pago único ahora. Tendrás que repetirlo el próximo mes manualmente.
        </p>
        <button
          onClick={() => pagar("manual")}
          disabled={!!loading}
          className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {loading === "manual" ? "Procesando..." : "Pagar una vez"}
        </button>
      </div>
    </div>
  );
}
