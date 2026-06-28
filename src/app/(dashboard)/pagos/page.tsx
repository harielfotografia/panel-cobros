import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  CONFIRMADO: "bg-green-100 text-green-700",
  PENDIENTE: "bg-yellow-100 text-yellow-700",
  FALLIDO: "bg-red-100 text-red-700",
};

const METODO_LABEL: Record<string, string> = {
  MERCADOPAGO: "MercadoPago",
  TRANSBANK: "Webpay",
  TRANSFERENCIA: "Transferencia",
};

export default async function PagosPage() {
  const pagos = await prisma.pago.findMany({
    include: { suscripcion: { include: { cliente: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <h1 className="text-lg lg:text-xl font-bold text-gray-900">Pagos y Cobros</h1>

      {/* Cards móvil */}
      <div className="lg:hidden space-y-3">
        {pagos.map((p) => (
          <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-start justify-between mb-2">
              <div>
                <p className="font-semibold text-gray-900 text-sm">{p.suscripcion.cliente.nombre}</p>
                <p className="text-xs text-gray-400">{(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}</p>
              </div>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_BADGE[p.estado]}`}>
                {p.estado}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="font-bold text-gray-900">${p.monto.toLocaleString("es-CL")}</span>
              <span className="text-xs text-gray-400">{METODO_LABEL[p.metodoPago] ?? p.metodoPago}</span>
            </div>
          </div>
        ))}
        {pagos.length === 0 && <p className="text-center text-gray-400 py-10">No hay pagos aún</p>}
      </div>

      {/* Tabla desktop */}
      <div className="hidden lg:block bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left px-5 py-3">Fecha</th>
                <th className="text-left px-5 py-3">Cliente</th>
                <th className="text-left px-5 py-3">Monto</th>
                <th className="text-left px-5 py-3">Método</th>
                <th className="text-left px-5 py-3">Estado</th>
                <th className="text-left px-5 py-3">Referencia</th>
              </tr>
            </thead>
            <tbody>
              {pagos.map((p) => (
                <tr key={p.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  <td className="px-5 py-3 text-gray-500 whitespace-nowrap">
                    {(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}
                  </td>
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{p.suscripcion.cliente.nombre}</p>
                    <p className="text-xs text-gray-400">{p.suscripcion.cliente.dominio}</p>
                  </td>
                  <td className="px-5 py-3 font-semibold text-gray-900 whitespace-nowrap">
                    ${p.monto.toLocaleString("es-CL")}
                  </td>
                  <td className="px-5 py-3 text-gray-500">{METODO_LABEL[p.metodoPago] ?? p.metodoPago}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${ESTADO_BADGE[p.estado]}`}>
                      {p.estado}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-400 text-xs">{p.referencia ?? "—"}</td>
                </tr>
              ))}
              {pagos.length === 0 && (
                <tr><td colSpan={6} className="text-center text-gray-400 py-10">No hay pagos aún</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
