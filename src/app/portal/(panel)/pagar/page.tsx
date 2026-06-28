"use client";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CreditCard, Zap, Building2 } from "lucide-react";
import { Suspense } from "react";

function PagarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const errorParam = params.get("error");

  const [loading, setLoading] = useState("");
  const [mensaje, setMensaje] = useState("");

  const mensajesError: Record<string, string> = {
    cancelado: "Cancelaste el pago en Webpay. Puedes intentarlo de nuevo.",
    rechazado: "El pago fue rechazado por Transbank. Verifica tu tarjeta.",
    fallo: "Ocurrió un error al confirmar el pago. Contáctanos si el cargo se realizó.",
    invalido: "Hubo un problema con la sesión de pago. Intenta de nuevo.",
  };

  async function pagarMP(tipo: "automatico" | "manual") {
    setLoading(tipo);
    setMensaje("");
    const res = await fetch("/api/portal/pagar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tipo }),
    });
    const data = await res.json();
    if (data.redirect) { window.location.href = data.redirect; return; }
    if (data.simulado) {
      setMensaje("✓ Pago simulado con éxito. Tu servicio quedó al día.");
      setTimeout(() => router.push("/portal"), 1500);
      return;
    }
    setMensaje(data.error ?? "Ocurrió un error. Intenta de nuevo.");
    setLoading("");
  }

  async function pagarTransbank() {
    setLoading("transbank");
    setMensaje("");
    const res = await fetch("/api/webhooks/transbank/iniciar", { method: "POST" });
    const data = await res.json();
    if (data.url && data.token) {
      // Webpay requiere un POST con el token
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.url;
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = "token_ws";
      input.value = data.token;
      form.appendChild(input);
      document.body.appendChild(form);
      form.submit();
    } else {
      setMensaje(data.error ?? "Error al iniciar pago con Webpay.");
      setLoading("");
    }
  }

  return (
    <div className="space-y-5 max-w-xl">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Pagar mi suscripción</h1>
        <button onClick={() => router.push("/portal")} className="text-sm text-gray-400 hover:text-gray-600">
          ← Volver
        </button>
      </div>

      {(mensaje || errorParam) && (
        <p className={`text-sm rounded-xl px-4 py-3 border ${
          mensaje.startsWith("✓")
            ? "bg-green-50 border-green-200 text-green-700"
            : "bg-red-50 border-red-200 text-red-700"
        }`}>
          {mensaje || mensajesError[errorParam!] || "Error desconocido."}
        </p>
      )}

      {/* Cobro automático — recomendado */}
      <div className="bg-white rounded-2xl p-6 border-2 border-blue-500 relative">
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
          Registras tu tarjeta una sola vez y se cobra automáticamente cada mes. Nunca más te preocupas por vencimientos.
        </p>
        <button
          onClick={() => pagarMP("automatico")}
          disabled={!!loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {loading === "automatico" ? "Procesando..." : "Activar cobro automático (MercadoPago)"}
        </button>
      </div>

      {/* Transbank Webpay */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
            <Building2 size={20} className="text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Pagar con Webpay (Transbank)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Pago único con tarjeta débito o crédito chilena a través de Webpay Plus. Redirige al banco para confirmar.
        </p>
        <button
          onClick={pagarTransbank}
          disabled={!!loading}
          className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {loading === "transbank" ? "Redirigiendo a Webpay..." : "Pagar con Webpay Plus"}
        </button>
      </div>

      {/* Pago manual MP */}
      <div className="bg-white rounded-2xl p-6 border border-gray-200">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center">
            <CreditCard size={20} className="text-gray-500" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Pagar solo este mes (MercadoPago)</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Pago único. Tendrás que repetirlo manualmente el próximo mes.
        </p>
        <button
          onClick={() => pagarMP("manual")}
          disabled={!!loading}
          className="w-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 text-gray-700 rounded-xl py-3 text-sm font-medium transition-colors"
        >
          {loading === "manual" ? "Procesando..." : "Pagar una vez con MercadoPago"}
        </button>
      </div>
    </div>
  );
}

export default function PagarPage() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-400">Cargando...</div>}>
      <div className="p-6">
        <PagarForm />
      </div>
    </Suspense>
  );
}
