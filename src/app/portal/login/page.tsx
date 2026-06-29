"use client";
import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Search, Globe, FileText, User, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

const EMPRESA = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE || "Highpass";

interface ClienteInfo {
  nombre: string;
  dominio: string;
  estado: string;
  plan: string | null;
  monto: number | null;
  vencida: boolean;
  diasRestantes: number;
  fechaVencimiento: string | null;
}

function LoginForm() {
  const params = useSearchParams();
  const router = useRouter();
  const errorParam = params.get("error");

  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cliente, setCliente] = useState<ClienteInfo | null>(null);

  async function handleBuscar(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setCliente(null);

    const res = await fetch("/api/portal/buscar-cliente", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });

    const data = await res.json();
    if (res.ok) {
      setCliente(data.cliente);
    } else {
      setError(data.error ?? "No encontrado");
    }
    setLoading(false);
  }

  function handleEntrar() {
    router.push("/portal");
  }

  return (
    <div className="w-full max-w-md">
      <div className="text-center mb-8">
        <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <span className="text-white font-bold text-lg">H</span>
        </div>
        <h1 className="text-2xl font-bold text-gray-900">Portal del Cliente</h1>
        <p className="text-sm text-gray-400 mt-1">{EMPRESA} — Consulta y paga tu suscripción</p>
      </div>

      {errorParam && (
        <div className="mb-4 bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-sm text-orange-700 text-center">
          {errorParam === "expirado" ? "El enlace expiró. Busca tu cuenta nuevamente." : "Enlace inválido."}
        </div>
      )}

      {!cliente ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 shadow-sm space-y-5">
          <div className="grid grid-cols-3 gap-3 text-center text-xs text-gray-400">
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <Globe size={15} className="text-blue-500" />
              </div>
              Dominio web
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <FileText size={15} className="text-blue-500" />
              </div>
              RUT empresa
            </div>
            <div className="flex flex-col items-center gap-1.5">
              <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center">
                <User size={15} className="text-blue-500" />
              </div>
              Nombre / Email
            </div>
          </div>

          <form onSubmit={handleBuscar} className="space-y-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="ej: miempresa.cl, 12.345.678-9, Clínica Dental..."
                className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
                minLength={3}
              />
            </div>
            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-center gap-2">
                <AlertTriangle size={14} /> {error}
              </p>
            )}
            <button
              type="submit"
              disabled={loading || query.length < 3}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              {loading ? "Buscando..." : <><Search size={15} /> Buscar mi cuenta</>}
            </button>
          </form>

          <p className="text-xs text-gray-400 text-center">
            ¿Tienes enlace de acceso?{" "}
            <button onClick={() => router.push("/portal/login?modo=email")} className="text-blue-600 hover:underline">
              Ingresar con email
            </button>
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Header estado */}
          <div className={`px-6 py-4 ${cliente.estado === "SUSPENDIDO" ? "bg-red-50 border-b border-red-100" : cliente.vencida ? "bg-orange-50 border-b border-orange-100" : "bg-green-50 border-b border-green-100"}`}>
            <div className="flex items-center gap-3">
              {cliente.estado === "SUSPENDIDO" || cliente.vencida ? (
                <AlertTriangle size={20} className="text-orange-500 flex-shrink-0" />
              ) : (
                <CheckCircle2 size={20} className="text-green-600 flex-shrink-0" />
              )}
              <div>
                <p className="font-semibold text-gray-900">{cliente.nombre}</p>
                <p className="text-xs text-gray-500">{cliente.dominio}</p>
              </div>
            </div>
          </div>

          {/* Info suscripción */}
          <div className="px-6 py-5 space-y-3">
            {cliente.plan && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Plan activo</span>
                <span className="font-medium text-gray-900">{cliente.plan}</span>
              </div>
            )}
            {cliente.monto && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Monto mensual</span>
                <span className="font-semibold text-gray-900">${cliente.monto.toLocaleString("es-CL")}</span>
              </div>
            )}
            {cliente.fechaVencimiento && (
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Vencimiento</span>
                <span className={`font-medium ${cliente.vencida ? "text-red-600" : "text-gray-900"}`}>
                  {new Date(cliente.fechaVencimiento).toLocaleDateString("es-CL", { day: "2-digit", month: "long", year: "numeric" })}
                </span>
              </div>
            )}
            {cliente.vencida && (
              <div className="bg-red-50 border border-red-100 rounded-xl px-3 py-2 text-xs text-red-600 text-center">
                Tu suscripción está vencida. Realiza el pago para reactivar el servicio.
              </div>
            )}
            {!cliente.vencida && cliente.diasRestantes <= 7 && (
              <div className="bg-orange-50 border border-orange-100 rounded-xl px-3 py-2 text-xs text-orange-600 text-center">
                Tu suscripción vence en {cliente.diasRestantes} día{cliente.diasRestantes !== 1 ? "s" : ""}.
              </div>
            )}
          </div>

          {/* Acciones */}
          <div className="px-6 pb-6 space-y-2">
            <button
              onClick={handleEntrar}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-3 text-sm font-semibold transition-colors flex items-center justify-center gap-2"
            >
              Entrar a mi portal <ArrowRight size={15} />
            </button>
            <button
              onClick={() => { setCliente(null); setQuery(""); }}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-xl py-2.5 text-sm transition-colors"
            >
              Buscar otra cuenta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PortalLoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gray-50">
      <Suspense fallback={<p className="text-gray-400">Cargando...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
