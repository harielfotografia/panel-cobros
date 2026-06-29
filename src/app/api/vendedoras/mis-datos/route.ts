import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function GET() {
  const session = await getSession();
  if (!session || session.rol !== "vendedora") {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const vendedora = await prisma.vendedora.findUnique({
    where: { id: session.id },
    include: {
      clientes: {
        include: {
          plan: true,
          suscripciones: {
            where: { activa: true },
            orderBy: { createdAt: "desc" },
            take: 1,
            include: {
              pagos: {
                where: { estado: "CONFIRMADO" },
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!vendedora) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const config = await prisma.configuracion.findUnique({ where: { id: "config" } });
  const comisionGlobal = config?.comisionPct ?? 10;
  const comisionPct = vendedora.comisionPct ?? comisionGlobal;

  // Calcular ingresos totales generados por esta vendedora
  let ingresosTotales = 0;
  for (const c of vendedora.clientes) {
    for (const sub of c.suscripciones) {
      for (const pago of sub.pagos) {
        ingresosTotales += pago.monto;
      }
    }
  }

  const comisionNeta = Math.round(ingresosTotales * comisionPct / 100);
  const ivaComision = Math.round(comisionNeta * 0.19);
  const comisionBruta = comisionNeta + ivaComision;

  const clientesActivos = vendedora.clientes.filter(c => c.estado === "ACTIVO").length;
  const clientesSuspendidos = vendedora.clientes.filter(c => c.estado === "SUSPENDIDO").length;

  return NextResponse.json({
    vendedora: {
      id: vendedora.id,
      nombre: vendedora.nombre,
      email: vendedora.email,
      telefono: vendedora.telefono,
      rut: vendedora.rut,
      comisionPct,
    },
    stats: {
      totalClientes: vendedora.clientes.length,
      clientesActivos,
      clientesSuspendidos,
      ingresosTotales,
      comisionPct,
      comisionNeta,
      ivaComision,
      comisionBruta,
    },
    clientes: vendedora.clientes.map(c => ({
      id: c.id,
      nombre: c.nombre,
      email: c.email,
      telefono: c.telefono,
      dominio: c.dominio,
      estado: c.estado,
      plan: c.plan?.nombre ?? null,
      montoPlan: c.plan?.precio ?? null,
      suscripcionActiva: c.suscripciones[0] ? {
        monto: c.suscripciones[0].monto,
        fechaVencimiento: c.suscripciones[0].fechaVencimiento,
        pagosConfirmados: c.suscripciones[0].pagos.length,
        ingresoTotal: c.suscripciones[0].pagos.reduce((a, p) => a + p.monto, 0),
      } : null,
    })),
  });
}
