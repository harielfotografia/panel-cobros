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

  if (loading) return <p className="text-gray-400">Cargando...</p>;
  if (!cliente) return <p className="text-red-600">Cliente no encontrado</p>;

  const sub = cliente.suscripciones[0];
  const vence = sub ? new Date(sub.fechaVencimiento) : null;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-semibold">{cliente.nombre}</h2>
          <p className="text-sm text-gray-600">{cliente.email} · {cliente.dominio}</p>
        </div>
        <div className="flex gap-2">
          <form action={`/api/clientes/${id}/impersonar`} method="POST" target="_blank">
            <button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-2 rounded-lg transition-colors"
            >
              Ver portal
            </button>
          </form>
          {cliente.estado === "ACTIVO" ? (
            <button
              onClick={() => accion("suspender")}
              disabled={!!actionLoading}
              className="bg-red-100 hover:bg-red-200 text-red-600 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === "suspender" ? "..." : "Suspender"}
            </button>
          ) : (
            <button
              onClick={() => accion("activar")}
              disabled={!!actionLoading}
              className="bg-green-100 hover:bg-green-200 text-green-700 text-sm px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {actionLoading === "activar" ? "..." : "Activar"}
            </button>
          )}
        </div>
      </div>

      {/* Plan y conexión */}
      <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
        <h3 className="text-sm font-medium text-gray-600">Plan y conexión</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-gray-400 text-xs">Plan</p>
            <p className="font-medium">{cliente.plan ? `${cliente.plan.nombre} (${cliente.plan.clave})` : "Sin plan"}</p>
          </div>
          <div>
            <p className="text-gray-400 text-xs">Máx. profesionales</p>
            <p className="font-medium">{cliente.plan ? (cliente.plan.maxProfesionales === 0 ? "Ilimitado" : cliente.plan.maxProfesionales) : "—"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 text-xs">API URL</p>
            <p className="font-mono text-xs text-gray-700">{cliente.apiUrl || "No configurada"}</p>
          </div>
          <div className="col-span-2">
            <p className="text-gray-400 text-xs">Service Key</p>
            <p className="font-mono text-xs text-gray-700 break-all select-all">{cliente.serviceKey}</p>
          </div>
        </div>
      </div>

      {/* Suscripción */}
      {sub && (
        <div className="bg-white rounded-xl p-5 border border-gray-200 space-y-3">
          <h3 className="text-sm font-medium text-gray-600">Suscripción activa</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-400 text-xs">Monto</p>
              <p className="font-medium">{sub.monto.toLocaleString("es-CL")} {sub.moneda}</p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Vencimiento</p>
              <p className={`font-medium ${vence && vence < new Date() ? "text-red-600" : ""}`}>
                {vence?.toLocaleDateString("es-CL") ?? "—"}
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-xs">Método</p>
              <p className="font-medium">{sub.metodoPago}</p>
            </div>
          </div>

          {/* Confirmar pago manual */}
          {sub.metodoPago === "TRANSFERENCIA" && (
            <div className="border-t border-gray-200 pt-3 space-y-2">
              <p className="text-xs text-gray-400">Confirmar pago por transferencia</p>
              <div className="flex gap-2">
                <input
                  placeholder="Monto"
                  type="number"
                  value={pagoMonto}
                  onChange={(e) => { setPagoMonto(e.target.value); setSubIdPago(sub.id); }}
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <input
                  placeholder="Referencia (opcional)"
                  value={pagoRef}
                  onChange={(e) => setPagoRef(e.target.value)}
                  className="flex-1 bg-gray-100 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <p className="text-sm font-medium text-gray-600 px-4 py-3 border-b border-gray-200">
            Historial de pagos
          </p>
          <table className="w-full text-sm">
            <tbody>
              {sub.pagos.map((p) => (
                <tr key={p.id} className="border-b border-gray-200/50 last:border-0">
                  <td className="px-4 py-2 text-gray-600">
                    {p.fechaPago ? new Date(p.fechaPago).toLocaleDateString("es-CL") : new Date(p.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-4 py-2 font-medium">{p.monto.toLocaleString("es-CL")}</td>
                  <td className="px-4 py-2 text-gray-400">{p.metodoPago}</td>
                  <td className="px-4 py-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${p.estado === "CONFIRMADO" ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"}`}>
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

      <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-700 text-sm transition-colors">
        ← Volver
      </button>
    </div>
  );
}
