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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Facturas</h1>
        <Link href="/portal" className="text-sm text-gray-500 hover:text-gray-300 transition-colors">
          ← Volver
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Fecha</th>
              <th className="text-left px-4 py-3">Monto</th>
              <th className="text-left px-4 py-3">Método</th>
              <th className="text-right px-4 py-3">Comprobante</th>
            </tr>
          </thead>
          <tbody>
            {pagos.map((p) => (
              <tr key={p.id} className="border-b border-gray-800/50 last:border-0">
                <td className="px-4 py-3 text-gray-400">
                  {(p.fechaPago ?? p.createdAt).toLocaleDateString("es-CL")}
                </td>
                <td className="px-4 py-3 font-medium">
                  ${p.monto.toLocaleString("es-CL")} {p.moneda}
                </td>
                <td className="px-4 py-3 text-gray-400">{p.metodoPago}</td>
                <td className="px-4 py-3 text-right">
                  <a
                    href={`/api/portal/factura/${p.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 text-xs transition-colors"
                  >
                    Descargar PDF
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {pagos.length === 0 && (
          <p className="text-center text-gray-600 py-10">Aún no tienes facturas</p>
        )}
      </div>
    </div>
  );
}
