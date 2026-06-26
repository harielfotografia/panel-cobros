import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCliente } from "@/lib/auth";
import { mpConfigurado, crearPreapproval, crearPreferencia } from "@/lib/mercadopago";
import { registrarPagoConfirmado } from "@/lib/cobros";

export async function POST(req: NextRequest) {
  let session;
  try {
    session = await requireCliente();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { tipo } = await req.json(); // "automatico" | "manual"

  const sub = await prisma.suscripcion.findFirst({
    where: { clienteId: session.id, activa: true },
    include: { cliente: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return NextResponse.json({ error: "Sin suscripción activa" }, { status: 404 });

  // Producción: redirige a MercadoPago. El pago se confirma vía webhook.
  if (mpConfigurado()) {
    try {
      if (tipo === "automatico") {
        const { id, initPoint } = await crearPreapproval({
          suscripcionId: sub.id,
          email: sub.cliente.email,
          monto: sub.monto,
          razon: `Suscripción mensual ${sub.cliente.dominio}`,
        });
        await prisma.suscripcion.update({
          where: { id: sub.id },
          data: { tipoCobro: "AUTOMATICO", mpPreapprovalId: id },
        });
        return NextResponse.json({ redirect: initPoint });
      } else {
        const { initPoint } = await crearPreferencia({
          suscripcionId: sub.id,
          email: sub.cliente.email,
          monto: sub.monto,
          titulo: `Pago mensual ${sub.cliente.dominio}`,
        });
        return NextResponse.json({ redirect: initPoint });
      }
    } catch (err) {
      return NextResponse.json({ error: String(err) }, { status: 502 });
    }
  }

  // Desarrollo (sin credenciales de MP): simula el pago para probar el flujo.
  const resultado = await registrarPagoConfirmado({
    suscripcionId: sub.id,
    monto: sub.monto,
    metodoPago: "MERCADOPAGO",
    referencia: `SIMULADO-${Date.now()}`,
    tipoCobro: tipo === "automatico" ? "AUTOMATICO" : "MANUAL",
    tarjetaUlt4: tipo === "automatico" ? "4242" : undefined,
    realizadoPor: "portal-cliente (simulado)",
  });

  return NextResponse.json({ simulado: true, ...resultado });
}
