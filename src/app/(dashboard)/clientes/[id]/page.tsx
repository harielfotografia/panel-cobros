"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

type PlanInfo = {
  id: string; clave: string; nombre: string; precio: number; maxProfesionales: number;
};
type Cliente = {
  id: string; nombre: string; email: string; telefono?: string;
  dominio: string; coolifyAppId?: string; serviceKey: string; apiUrl?: string;
  planId?: string; plan?: PlanInfo; estado: string; notas?: string;
  suscripciones: Suscripcion[];
};
type Suscripcion = {
  id: string; monto: number; moneda: string; metodoPago: string;
  fechaVencimiento: string; diasGracia: number; activa: boolean;
  pagos: Pago[];
};
type Pago = {
  id: string; monto: number; estado: string; metodoPago: string;
  referencia?: string; fechaPago?: string; createdAt: string;
};

export default function ClienteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [pagoMonto, setPagoMonto] = useState("");
  const [pagoRef, setPagoRef] = useState("");
  const [subIdPago, setSubIdPago] = useState("");

  async function cargar() {
    const res = await fetch(`/api/clientes/${id}`);
    if (res.ok) setCliente(await res.json());
    setLoading(false);
  }

  useEffect(() => { cargar(); }, [id]);

  async function accion(tipo: "suspender" | "activar") {
    setActionLoading(tipo);
    await fetch(`/api/clientes/${id}/${tipo}`, { method: "POST" });
    await cargar();
    setActionLoading("");
  }

  async function confirmarPago() {
    if (!subIdPago || !pagoMonto) return;
    setActionLoading("pago");
    await fetch("/api/pagos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ suscripcionId: subIdPago, monto: Number(pagoMonto), referencia: pagoRef }),
    });
    setPagoMonto(""); setPagoRef(""); setSubIdPago("");
    await cargar();
    setActionLoading("");
  }

  if (loading) return <p className="text-gray-500">Cargando...</p>;
  if (!cliente) return <p className="text-red-400">Cliente no encontrado</p>;

  const sub = cliente.suscripciones[0];
  const vence = sub ? new Date(sub.fechaVencimiento) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{cliente.nombre}</h2>
          <p className="text-sm text-gray-400">{cliente.email} · {cliente.dominio}</p>
        </div>
        <div className="flex gap-2">
          {cliente.estado === "ACTIVO" ? (
            <button
              onClick={() => accion("suspender")}
              disabled={!!actionLoading}
              className="bg-red-900/50 hover:bg-red-800/60 text-red-400 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === "suspender" ? "..." : "Suspender"}
            </button>
          ) : (
            <button
              onClick={() => accion("activar")}
              disabled={!!actionLoading}
              className="bg-green-900/50 hover:bg-green-800/60 text-green-400 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === "activar" ? "..." : "Activar"}
            </button>
          )}
        </div>
      </div>

      {/* Plan y conexión */}
      <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
        <h3 className="text-sm font-medium text-gray-400">Plan y conexión</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-500 text-xs">Plan</p>
            <p className="font-medium">{cliente.plan ? `${cliente.plan.nombre} (${cliente.plan.clave})` : "Sin plan"}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs">Máx. profesionales</p>
            <p className="font-medium">{cliente.plan ? (cliente.plan.maxProfesionales === 0 ? "Ilimitado" : cliente.plan.maxProfesionales) : "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-xs">API URL</p>
            <p className="font-mono text-xs text-gray-300">{cliente.apiUrl || "No configurada"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-500 text-xs">Service Key</p>
            <p className="font-mono text-xs text-gray-300 break-all select-all">{cliente.serviceKey}</p>
          </div>
        </div>
      </div>

      {/* Suscripción */}
      {sub && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-3">
          <h3 className="text-sm font-medium text-gray-400">Suscripción activa</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Monto</p>
              <p className="font-medium">{sub.monto.toLocaleString("es-CL")} {sub.moneda}</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Vencimiento</p>
              <p className={`font-medium ${vence && vence < new Date() ? "text-red-400" : ""}`}>
                {vence?.toLocaleDateString("es-CL") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">Método</p>
              <p className="font-medium">{sub.metodoPago}</p>
            </div>
          </div>

          {/* Confirmar pago manual */}
          {sub.metodoPago === "TRANSFERENCIA" && (
            <div className="border-t border-gray-800 pt-3 space-y-2">
              <p className="text-xs text-gray-500">Confirmar pago por transferencia</p>
              <div className="flex gap-2">
                <input
                  placeholder="Monto"
                  type="number"
                  value={pagoMonto}
                  onChange={(e) => { setPagoMonto(e.target.value); setSubIdPago(sub.id); }}
                  className="flex-1 bg-gray-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  placeholder="Referencia (opcional)"
                  value={pagoRef}
                  onChange={(e) => setPagoRef(e.target.value)}
                  className="flex-1 bg-gray-800 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  onClick={confirmarPago}
                  disabled={!!actionLoading || !pagoMonto}
                  className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-sm px-4 py-1.5 rounded-lg transition-colors"
                >
                  {actionLoading === "pago" ? "..." : "Confirmar"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Historial de pagos */}
      {sub?.pagos.length > 0 && (
        <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
          <p className="text-sm font-medium text-gray-400 px-4 py-3 border-b border-gray-800">
            Historial de pagos
          </p>
          <table className="w-full text-sm">
            <tbody>
              {sub.pagos.map((p) => (
                <tr key={p.id} className="border-b border-gray-800/50 last:border-0">
                  <td className="px-4 py-2 text-gray-400">
                    {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString("es-CL") : new Date(p.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-2 font-medium">{p.monto.toLocaleString("es-CL")}</td>
                  <td className="px-4 py-2 text-gray-500">{p.metodoPago}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.estado === "CONFIRMADO" ? "bg-green-900/50 text-green-400" : "bg-yellow-900/50 text-yellow-400"}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-gray-600 text-xs">{p.referencia}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-300 text-sm transition-colors">
        ← Volver
      </button>
    </div>
  );
}
