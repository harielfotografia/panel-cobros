import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  CONFIRMADO: "bg-green-900/50 text-green-400",
  PENDIENTE: "bg-yellow-900/50 text-yellow-400",
  FALLIDO: "bg-red-900/50 text-red-400",
};

export default async function PagosPage() {
  const pagos = await prisma.pago.findMany({
    include: {
      suscripcion: { include: { cliente: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Pagos</h2>
      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Referencia</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-3 text-gray-400">
                  {(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3">
                  <p className="font-medium">{p.suscripcion.cliente.nombre}</p>
                  <p className="text-xs text-gray-500">{p.suscripcion.cliente.dominio}</p>
                </td>
                <td className="px-4 py-3 font-medium">
                  {p.monto.toLocaleString("es-CL")} {p.moneda}
                </td>
                <td className="px-4 py-3 text-gray-400">{p.metodoPago}</td>
                <td className="px-4 py-3">
                  <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_BADGE[p.estado]}`}>
                    {p.estado}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">{p.referencia ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && (
          <p className="text-center text-gray-600 py-10">No hay pagos aún</p>
        )}
      </div>
    </div>
  );
}
