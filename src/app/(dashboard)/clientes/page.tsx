import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const ESTADO_BADGE: Record<string, string> = {
  ACTIVO: "bg-green-900/50 text-green-400",
  SUSPENDIDO: "bg-red-900/50 text-red-400",
  CANCELADO: "bg-gray-800 text-gray-500",
};

export default async function ClientesPage() {
  const clientes = await prisma.cliente.findMany({
    include: {
      suscripciones: {
        where: { activa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Clientes</h2>
        <Link
          href="/clientes/nuevo"
          className="bg-indigo-600 hover:bg-indigo-500 text-sm px-4 py-2 rounded-lg transition-colors"
        >
          + Nuevo cliente
        </Link>
      </div>

      <div className="bg-gray-900 rounded-xl border border-gray-800 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-gray-500 text-xs">
              <th className="text-left px-4 py-3">Cliente</th>
              <th className="text-left px-4 py-3">Dominio</th>
              <th className="text-left px-4 py-3">Estado</th>
              <th className="text-left px-4 py-3">Vencimiento</th>
              <th className="text-left px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {clientes.map((c) => {
              const sub = c.suscripciones[0];
              const vence = sub ? new Date(sub.fechaVencimiento) : null;
              const vencida = vence && vence < new Date();
              return (
                <tr key={c.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30">
                  <td className="px-4 py-3">
                    <p className="font-medium">{c.nombre}</p>
                    <p className="text-xs text-gray-500">{c.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-400">{c.dominio}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-1 rounded-full ${ESTADO_BADGE[c.estado]}`}>
                      {c.estado}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {vence ? (
                      <span className={vencida ? "text-red-400" : "text-gray-400"}>
                        {vence.toLocaleDateString("es-CL")}
                      </span>
                    ) : (
                      <span className="text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Link href={`/clientes/${c.id}`} className="text-indigo-400 hover:text-indigo-300 text-xs">
                      Ver →
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {clientes.length === 0 && (
          <p className="text-center text-gray-600 py-10">No hay clientes aún</p>
        )}
      </div>
    </div>
  );
}
