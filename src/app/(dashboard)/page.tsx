import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { AnuncioCard } from "@/components/AnuncioCard";

export const dynamic = "force-dynamic";

async function getResumen() {
  const [total, activos, suspendidos, vencenProximo, anuncios] = await Promise.all([
    prisma.cliente.count(),
    prisma.cliente.count({ where: { estado: "ACTIVO" } }),
    prisma.cliente.count({ where: { estado: "SUSPENDIDO" } }),
    prisma.suscripcion.findMany({
      where: {
        activa: true,
        fechaVencimiento: {
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
      include: { cliente: true },
      orderBy: { fechaVencimiento: "asc" },
    }),
    prisma.anuncio.findMany({
      where: { activo: true },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);
  return { total, activos, suspendidos, vencenProximo, anuncios };
}

export default async function ResumenPage() {
  const { total, activos, suspendidos, vencenProximo, anuncios } = await getResumen();

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold">Resumen</h2>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total clientes" value={total} color="indigo" />
        <StatCard label="Activos" value={activos} color="green" />
        <StatCard label="Suspendidos" value={suspendidos} color="red" />
      </div>

      {vencenProximo.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-400 mb-3">Vencen en los próximos 7 días</h3>
          <div className="space-y-2">
            {vencenProximo.map((s) => {
              const dias = Math.ceil(
                (new Date(s.fechaVencimiento).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
              );
              return (
                <Link
                  key={s.id}
                  href={`/clientes/${s.clienteId}`}
                  className="flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border border-yellow-800/40 hover:border-yellow-600/60 transition-colors"
                >
                  <div>
                    <p className="text-sm font-medium">{s.cliente.nombre}</p>
                    <p className="text-xs text-gray-500">{s.cliente.dominio}</p>
                  </div>
                  <span className="text-xs text-yellow-400 font-medium">
                    {dias === 0 ? "Hoy" : `${dias}d`}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {anuncios.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-400">Anuncios activos</h3>
            <Link href="/anuncios" className="text-xs text-indigo-400 hover:text-indigo-300">
              Gestionar →
            </Link>
          </div>
          <div className="space-y-2">
            {anuncios.map((a) => (
              <AnuncioCard
                key={a.id}
                titulo={a.titulo}
                mensaje={a.mensaje}
                tipo={a.tipo}
                fecha={a.createdAt}
                destino={a.cliente ? a.cliente.nombre : "Global"}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    indigo: "text-indigo-400",
    green: "text-green-400",
    red: "text-red-400",
  };
  return (
    <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${colors[color]}`}>{value}</p>
    </div>
  );
}
