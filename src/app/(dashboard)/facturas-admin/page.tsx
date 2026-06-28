import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { EstadoBadgeDocs } from "@/components/documentos/EstadoBadgeDocs";
import { formatCLP } from "@/lib/documentos";
import { FileText, Eye, FilePlus2, Printer } from "lucide-react";

export const dynamic = "force-dynamic";

type Tab = "cotizaciones" | "facturas" | "boletas";

async function getData(tab: Tab, estado?: string | null) {
  if (tab === "cotizaciones") {
    return prisma.cotizacion.findMany({
      where: { deletedAt: null, ...(estado ? { estado: estado as never } : {}) },
      orderBy: { createdAt: "desc" },
    });
  }
  if (tab === "facturas") {
    return prisma.factura.findMany({
      where: { deletedAt: null, ...(estado ? { estado: estado as never } : {}) },
      include: { cotizacion: { select: { numero: true } } },
      orderBy: { createdAt: "desc" },
    });
  }
  return prisma.boleta.findMany({
    where: { deletedAt: null, ...(estado ? { estado: estado as never } : {}) },
    include: { cotizacion: { select: { numero: true } } },
    orderBy: { createdAt: "desc" },
  });
}

const TABS: { key: Tab; label: string }[] = [
  { key: "cotizaciones", label: "Cotizaciones" },
  { key: "facturas", label: "Facturas" },
  { key: "boletas", label: "Boletas" },
];

const ESTADOS_COT = ["BORRADOR","ENVIADA","APROBADA","RECHAZADA","FACTURADA","CONVERTIDA_BOLETA"];
const ESTADOS_FAC = ["PENDIENTE","PAGADA","VENCIDA","ANULADA"];
const ESTADOS_BOL = ["PENDIENTE","PAGADA","ANULADA"];

export default async function FacturacionPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; estado?: string }>;
}) {
  const sp = await searchParams;
  const tab = (sp.tab ?? "cotizaciones") as Tab;
  const estado = sp.estado ?? "";
  const datos = await getData(tab, estado || null);

  const estadosFiltro = tab === "cotizaciones" ? ESTADOS_COT : tab === "facturas" ? ESTADOS_FAC : ESTADOS_BOL;

  return (
    <div className="p-4 lg:p-6 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-lg lg:text-xl font-bold text-gray-900">Facturación</h1>
          <p className="text-sm text-gray-500">Cotizaciones, facturas y boletas</p>
        </div>
        {tab === "cotizaciones" && (
          <Link href="/facturas-admin/cotizaciones/nueva"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <FilePlus2 size={15} />
            Nueva cotización
          </Link>
        )}
        {tab === "facturas" && (
          <Link href="/facturas-admin/facturas/nueva"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <FilePlus2 size={15} />
            Nueva factura
          </Link>
        )}
        {tab === "boletas" && (
          <Link href="/facturas-admin/boletas/nueva"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-sm px-4 py-2 rounded-lg transition-colors">
            <FilePlus2 size={15} />
            Nueva boleta
          </Link>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {TABS.map(t => (
          <Link
            key={t.key}
            href={`/facturas-admin?tab=${t.key}`}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === t.key ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {/* Filtro estado */}
      <div className="flex gap-2 flex-wrap">
        <Link href={`/facturas-admin?tab=${tab}`}
          className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
            !estado ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}>
          Todos
        </Link>
        {estadosFiltro.map(e => (
          <Link key={e} href={`/facturas-admin?tab=${tab}&estado=${e}`}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              estado === e ? "bg-blue-600 text-white border-blue-600" : "border-gray-200 text-gray-600 hover:bg-gray-50"
            }`}>
            {e.replace("_", " ")}
          </Link>
        ))}
      </div>

      {/* Tabla cotizaciones */}
      {tab === "cotizaciones" && (
        <TablaWrapper vacia={datos.length === 0}>
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="text-left px-5 py-3">N°</th>
              <th className="text-left px-5 py-3">Cliente</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Fecha</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(datos as Awaited<ReturnType<typeof prisma.cotizacion.findMany>>).map(c => (
              <tr key={c.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-sm font-medium text-blue-600">{c.numero}</td>
                <td className="px-5 py-3 text-sm text-gray-900">{c.clienteNombre}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                  {new Date(c.fecha).toLocaleDateString("es-CL")}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCLP(c.total)}</td>
                <td className="px-5 py-3"><EstadoBadgeDocs estado={c.estado} /></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/facturas-admin/cotizaciones/${c.id}`} title="Ver / Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={15} />
                    </Link>
                    <a href={`/api/documentos/pdf/cotizacion/${c.id}`} target="_blank" title="PDF"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Printer size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrapper>
      )}

      {/* Tabla facturas */}
      {tab === "facturas" && (
        <TablaWrapper vacia={datos.length === 0}>
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="text-left px-5 py-3">N°</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">N° SII</th>
              <th className="text-left px-5 py-3">Cliente</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Emisión</th>
              <th className="text-left px-5 py-3 hidden lg:table-cell">Vencimiento</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(datos as Awaited<ReturnType<typeof prisma.factura.findMany>>).map(f => (
              <tr key={f.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-sm font-medium text-blue-600">{f.numero}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden sm:table-cell">{f.numeroSii || "—"}</td>
                <td className="px-5 py-3 text-sm text-gray-900">{f.clienteNombre}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                  {new Date(f.fechaEmision).toLocaleDateString("es-CL")}
                </td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden lg:table-cell">
                  {new Date(f.fechaVencimiento).toLocaleDateString("es-CL")}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCLP(f.total)}</td>
                <td className="px-5 py-3"><EstadoBadgeDocs estado={f.estado} /></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/facturas-admin/facturas/${f.id}`} title="Ver / Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={15} />
                    </Link>
                    <a href={`/api/documentos/pdf/factura/${f.id}`} target="_blank" title="PDF"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Printer size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrapper>
      )}

      {/* Tabla boletas */}
      {tab === "boletas" && (
        <TablaWrapper vacia={datos.length === 0}>
          <thead>
            <tr className="border-b border-gray-100 text-gray-400 text-xs">
              <th className="text-left px-5 py-3">N°</th>
              <th className="text-left px-5 py-3 hidden sm:table-cell">N° SII</th>
              <th className="text-left px-5 py-3">Cliente</th>
              <th className="text-left px-5 py-3 hidden md:table-cell">Fecha</th>
              <th className="text-left px-5 py-3">Total</th>
              <th className="text-left px-5 py-3">Estado</th>
              <th className="px-5 py-3" />
            </tr>
          </thead>
          <tbody>
            {(datos as Awaited<ReturnType<typeof prisma.boleta.findMany>>).map(b => (
              <tr key={b.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="px-5 py-3 font-mono text-sm font-medium text-blue-600">{b.numero}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden sm:table-cell">{b.numeroSii || "—"}</td>
                <td className="px-5 py-3 text-sm text-gray-900">{b.clienteNombre}</td>
                <td className="px-5 py-3 text-sm text-gray-500 hidden md:table-cell">
                  {new Date(b.fechaEmision).toLocaleDateString("es-CL")}
                </td>
                <td className="px-5 py-3 text-sm font-medium text-gray-900">{formatCLP(b.montoTotal)}</td>
                <td className="px-5 py-3"><EstadoBadgeDocs estado={b.estado} /></td>
                <td className="px-5 py-3">
                  <div className="flex gap-2 justify-end">
                    <Link href={`/facturas-admin/boletas/${b.id}`} title="Ver / Editar"
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                      <Eye size={15} />
                    </Link>
                    <a href={`/api/documentos/pdf/boleta/${b.id}`} target="_blank" title="PDF"
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                      <Printer size={15} />
                    </a>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </TablaWrapper>
      )}
    </div>
  );
}

function TablaWrapper({ children, vacia }: { children: React.ReactNode; vacia: boolean }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          {children}
        </table>
      </div>
      {vacia && (
        <div className="flex flex-col items-center py-16 text-center">
          <FileText size={32} className="text-gray-200 mb-3" />
          <p className="text-sm text-gray-400">No hay documentos aún</p>
        </div>
      )}
    </div>
  );
}
