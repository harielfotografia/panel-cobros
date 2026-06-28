import { prisma } from "@/lib/prisma";
import { GraficoIngresos } from "@/components/GraficoIngresos";

export const dynamic = "force-dynamic";

async function getReporteData() {
  const ahora = new Date();
  const hace12Meses = new Date(ahora.getFullYear() - 1, ahora.getMonth(), 1);

  const [pagos, clientes, planes, vendedoras] = await Promise.all([
    prisma.pago.findMany({
      where: { estado: "CONFIRMADO", fechaPago: { gte: hace12Meses } },
      include: {
        suscripcion: {
          include: { cliente: { select: { nombre: true, vendedoraId: true, planId: true } }, plan: true },
        },
      },
      orderBy: { fechaPago: "asc" },
    }),
    prisma.cliente.findMany({
      select: { nombre: true, vendedoraId: true, estado: true, createdAt: true, plan: { select: { nombre: true } } },
    }),
    prisma.plan.findMany({ where: { activo: true } }),
    prisma.vendedora.findMany({ select: { id: true, nombre: true, email: true, telefono: true, comisionPct: true } }),
  ]);

  // Ingresos por mes
  const meses = ["Ene","Feb","Mar","Abr","May","Jun","Jul","Ago","Sep","Oct","Nov","Dic"];
  const porMes: Record<string, number> = {};
  for (const p of pagos) {
    const f = p.fechaPago ?? p.createdAt;
    const key = `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}`;
    porMes[key] = (porMes[key] ?? 0) + p.monto;
  }
  const datosGrafico = Object.entries(porMes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, total]) => ({ mes: `${meses[parseInt(key.split("-")[1]) - 1]} ${key.split("-")[0].slice(2)}`, total }));

  // Ingresos por método de pago
  const porMetodo: Record<string, number> = {};
  for (const p of pagos) {
    porMetodo[p.metodoPago] = (porMetodo[p.metodoPago] ?? 0) + p.monto;
  }

  // Ingresos por plan
  const porPlan: Record<string, { nombre: string; total: number; count: number }> = {};
  for (const p of pagos) {
    const planNombre = p.suscripcion.plan?.nombre ?? "Sin plan";
    if (!porPlan[planNombre]) porPlan[planNombre] = { nombre: planNombre, total: 0, count: 0 };
    porPlan[planNombre].total += p.monto;
    porPlan[planNombre].count++;
  }

  // Comisiones por vendedora (usando relación real)
  const config = await prisma.configuracion.findUnique({ where: { id: "config" } });
  const comisionGlobal = config?.comisionPct ?? 10;

  type ResumenV = { nombre: string; email: string | null; telefono: string | null; clientes: number; ingresos: number; comisionPct: number };
  const porVendedora: Record<string, ResumenV> = {};

  // Inicializar con todas las vendedoras (aunque no tengan clientes aún)
  for (const v of vendedoras) {
    porVendedora[v.id] = { nombre: v.nombre, email: v.email, telefono: v.telefono, clientes: 0, ingresos: 0, comisionPct: v.comisionPct ?? comisionGlobal };
  }
  for (const c of clientes) {
    if (!c.vendedoraId || !porVendedora[c.vendedoraId]) continue;
    porVendedora[c.vendedoraId].clientes++;
  }
  for (const p of pagos) {
    const vid = p.suscripcion.cliente.vendedoraId;
    if (!vid || !porVendedora[vid]) continue;
    porVendedora[vid].ingresos += p.monto;
  }

  const comisionPct = comisionGlobal;

  const totalIngresos = pagos.reduce((a, p) => a + p.monto, 0);
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const ingresosMes = pagos.filter(p => (p.fechaPago ?? p.createdAt) >= inicioMes).reduce((a, p) => a + p.monto, 0);

  // Clientes por plan
  const clientesPorPlan = planes.map(pl => ({
    nombre: pl.nombre,
    count: clientes.filter(c => c.plan?.nombre === pl.nombre).length,
    precio: pl.precio,
  }));

  return { datosGrafico, porMetodo, porPlan, porVendedora, comisionPct, totalIngresos, ingresosMes, clientesPorPlan };
}

const METODO_LABEL: Record<string, string> = {
  MERCADOPAGO: "MercadoPago",
  TRANSBANK: "Webpay Plus",
  TRANSFERENCIA: "Transferencia",
};

export default async function ReportesPage() {
  const d = await getReporteData();

  return (
    <div className="p-4 lg:p-6 space-y-4 lg:space-y-6">
      <div>
        <h1 className="text-lg lg:text-xl font-bold text-gray-900">Reportes</h1>
        <p className="text-sm text-gray-500 mt-0.5">Análisis de ingresos, planes y comisiones — últimos 12 meses.</p>
      </div>

      {/* Stats rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Ingresos este mes</p>
          <p className="text-2xl font-bold text-gray-900">${d.ingresosMes.toLocaleString("es-CL")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Ingresos 12 meses</p>
          <p className="text-2xl font-bold text-gray-900">${d.totalIngresos.toLocaleString("es-CL")}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs text-gray-500 mb-1">Promedio mensual</p>
          <p className="text-2xl font-bold text-gray-900">
            ${Math.round(d.totalIngresos / Math.max(d.datosGrafico.length, 1)).toLocaleString("es-CL")}
          </p>
        </div>
      </div>

      {/* Gráfico */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Ingresos mensuales</h2>
        <GraficoIngresos data={d.datosGrafico} />
      </div>

      {/* Por método + Por plan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Por método de pago</h2>
          <div className="space-y-3">
            {Object.entries(d.porMetodo).map(([metodo, total]) => {
              const pct = Math.round((total / d.totalIngresos) * 100);
              return (
                <div key={metodo}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{METODO_LABEL[metodo] ?? metodo}</span>
                    <span className="font-medium text-gray-900">${total.toLocaleString("es-CL")}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(d.porMetodo).length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-4">Por plan</h2>
          <div className="space-y-3">
            {Object.values(d.porPlan).map((p) => {
              const pct = Math.round((p.total / d.totalIngresos) * 100);
              return (
                <div key={p.nombre}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{p.nombre}</span>
                    <span className="font-medium text-gray-900">${p.total.toLocaleString("es-CL")}</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full">
                    <div className="h-1.5 bg-green-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {Object.keys(d.porPlan).length === 0 && (
              <p className="text-sm text-gray-400">Sin datos</p>
            )}
          </div>
        </div>
      </div>

      {/* Clientes por plan */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Distribución de clientes</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {d.clientesPorPlan.map((p) => (
            <div key={p.nombre} className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-3xl font-bold text-gray-900">{p.count}</p>
              <p className="text-sm text-gray-600 mt-1">{p.nombre}</p>
              <p className="text-xs text-gray-400">${p.precio.toLocaleString("es-CL")}/mes</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comisiones por vendedora */}
      {Object.keys(d.porVendedora).length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-semibold text-gray-900">Comisiones por vendedora</h2>
            <p className="text-xs text-gray-400 mt-0.5">% global: {d.comisionPct}% — cada vendedora puede tener su propio % configurado en Usuarios</p>
          </div>
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-400 text-xs">
                <th className="text-left px-5 py-3">Vendedora</th>
                <th className="text-left px-5 py-3 hidden md:table-cell">Contacto</th>
                <th className="text-right px-5 py-3">Clientes</th>
                <th className="text-right px-5 py-3">Ingresos generados</th>
                <th className="text-right px-5 py-3">% comisión</th>
                <th className="text-right px-5 py-3">Comisión a pagar</th>
              </tr>
            </thead>
            <tbody>
              {Object.values(d.porVendedora).map((v) => {
                const pct = v.comisionPct;
                return (
                  <tr key={v.nombre} className="border-b border-gray-50 last:border-0">
                    <td className="px-5 py-3 font-medium text-gray-900">{v.nombre}</td>
                    <td className="px-5 py-3 text-gray-400 text-xs hidden md:table-cell">
                      {v.email && <span className="block">{v.email}</span>}
                      {v.telefono && <span className="block">{v.telefono}</span>}
                    </td>
                    <td className="px-5 py-3 text-right text-gray-500">{v.clientes}</td>
                    <td className="px-5 py-3 text-right text-gray-700">${v.ingresos.toLocaleString("es-CL")}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{pct}%</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">
                      ${Math.round(v.ingresos * pct / 100).toLocaleString("es-CL")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <p className="text-sm font-medium text-gray-700">Sin vendedoras registradas</p>
          <p className="text-xs text-gray-400 mt-1">
            Ve a <strong>Usuarios</strong> para crear tu equipo de ventas, luego asigna una vendedora a cada cliente.
          </p>
        </div>
      )}
    </div>
  );
}
