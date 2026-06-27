import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function FacturasPage() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const pagos = await prisma.pago.findMany({
    where: {
      estado: "CONFIRMADO",
      suscripcion: { clienteId: session.id },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Facturas</h1>

      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="text-left px-5 py-3">Fecha</th>
              <th className="text-left px-5 py-3">Monto</th>
              <th className="text-left px-5 py-3">Método</th>
              <th className="text-right px-5 py-3">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 last:border-0">
                <td className="px-5 py-3 text-gray-500">
                  {(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900">
                  ${p.monto.toLocaleString("es-CL")} {p.moneda}
                </td>
                <td className="px-5 py-3 text-gray-500">{p.metodoPago}</td>
                <td className="px-5 py-3 text-right">
                  <a
                    href={`/api/portal/factura/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-500 text-xs font-medium transition-colors"
                  >
                    Descargar PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && (
          <p className="text-center text-gray-400 py-10">Aún no tienes facturas</p>
        )}
      </div>
    </div>
  );
}
