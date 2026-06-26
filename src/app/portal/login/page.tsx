"use client";
import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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
      <h1 className="text-2xl font-bold text-center mb-2">Portal del cliente</h1>
      <p className="text-sm text-gray-400 text-center mb-8">Te enviamos un enlace de acceso a tu correo</p>

      {errorParam && (
        <p className="text-yellow-400 text-sm text-center mb-4 bg-yellow-900/20 rounded-lg py-2">
          {errorParam === "expirado" ? "El enlace expiró. Solicita uno nuevo." : "Enlace inválido."}
        </p>
      )}

      {enviado ? (
        <div className="bg-gray-900 rounded-xl p-8 border border-gray-800 text-center">
          <div className="text-green-400 text-4xl mb-3">✓</div>
          <p className="text-sm text-gray-300">
            Si <strong>{email}</strong> está registrado, recibirás un enlace de acceso en unos segundos.
          </p>
          {devLink && (
            <div className="mt-4 pt-4 border-t border-gray-800">
              <p className="text-xs text-gray-500 mb-2">Modo desarrollo — tu enlace:</p>
              <a href={devLink} className="text-indigo-400 text-xs break-all hover:underline">
                {devLink}
              </a>
            </div>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-gray-900 rounded-xl p-8 space-y-4 border border-gray-800">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tu correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nombre@empresa.cl"
              className="w-full bg-gray-800 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 rounded-lg py-2 text-sm font-medium transition-colors"
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <Suspense fallback={<p className="text-gray-500">Cargando...</p>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
