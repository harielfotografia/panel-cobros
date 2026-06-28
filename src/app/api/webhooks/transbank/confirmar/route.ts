import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarPagoConfirmado } from "@/lib/cobros";
import { getWebpayTx } from "@/lib/transbank";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function GET(req: NextRequest) {
  const tokenWs = req.nextUrl.searchParams.get("token_ws");
  const tbkToken = req.nextUrl.searchParams.get("TBK_TOKEN"); // cancelación por el usuario

  if (tbkToken && !tokenWs) {
    return NextResponse.redirect(`${BASE}/portal/pagar?error=cancelado`);
  }
  if (!tokenWs) {
    return NextResponse.redirect(`${BASE}/portal/pagar?error=invalido`);
  }

  try {
    const tx = getWebpayTx();
    const response = await tx.commit(tokenWs);

    if (response.response_code !== 0 || response.status !== "AUTHORIZED") {
      return NextResponse.redirect(`${BASE}/portal/pagar?error=rechazado`);
    }

    // buyOrder formato: SUB{id8}{ts10} → los primeros 3+8=11 chars dan el sufijo del id
    const buyOrder: string = response.buy_order;
    const idSuffix = buyOrder.slice(3, 11); // los 8 chars del id de suscripción

    const suscripcion = await prisma.suscripcion.findFirst({
      where: { id: { endsWith: idSuffix } },
    });
    if (!suscripcion) {
      return NextResponse.redirect(`${BASE}/portal/pagar?error=no-encontrado`);
    }

    await registrarPagoConfirmado({
      suscripcionId: suscripcion.id,
      monto: response.amount,
      moneda: "CLP",
      metodoPago: "TRANSBANK",
      referencia: response.authorization_code,
      realizadoPor: "webhook-transbank",
    });

    return NextResponse.redirect(`${BASE}/portal?pago=ok`);
  } catch (e) {
    console.error("[transbank] confirmar error:", e);
    return NextResponse.redirect(`${BASE}/portal/pagar?error=fallo`);
  }
}
