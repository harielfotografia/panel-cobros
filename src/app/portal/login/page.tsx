"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Home } from "lucide-react";

const EMPRESA = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE || "DentalCloud";

function LoginForm() {
  const params = useSearchParams();
  const errorParam = params.get("error");
  const [email, setEmail] = useState("");
  const [enviado, setEnviado] = useState(false);
  const [devLink, setDevLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch("/api/portal/magic-link", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    setDevLink(data.devLink ?? null);
    setEnviado(true);
    setLoading(false);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="flex items-center justify-center gap-3 mb-2">
        <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center">
          <Home size={20} className="text-white" />
        </div>
      </div>
      <h1 className="text-2xl font-bold text-center text-gray-900 mb-1">Portal del Cliente</h1>
      <p className="text-sm text-gray-400 text-center mb-8">Te enviamos un enlace de acceso a tu correo</p>

      {errorParam && (
        <p className="text-orange-700 text-sm text-center mb-4 bg-orange-50 border border-orange-200 rounded-xl py-2">
          {errorParam === "expirado" ? "El enlace expiró. Solicita uno nuevo." : "Enlace inválido."}
        </p>
      )}

      {enviado ? (
        <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center">
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <span className="text-green-600 text-2xl">✓</span>
          </div>
          <p className="text-sm text-gray-600">
            Si <strong className="text-gray-900">{email}</strong> está registrado, recibirás un enlace de acceso en unos segundos.
          </p>
          {devLink && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <p className="text-xs text-gray-400 mb-2">Modo desarrollo — tu enlace:</p>
              <a href={devLink} className="text-blue-600 text-xs break-all hover:underline">
                {devLink}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl p-8 space-y-4 border border-gray-200">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Tu correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.cl"
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
          >
            {loading ? "Enviando..." : "Enviar enlace de acceso"}
          </button>
        </form>
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
