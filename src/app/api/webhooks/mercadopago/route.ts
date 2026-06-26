import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarPagoConfirmado } from "@/lib/cobros";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  if (type === "payment") {
    const paymentId = data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
    });
    const payment = await mpRes.json();

    if (payment.status !== "approved") return NextResponse.json({ ok: true });

    const suscripcionId = payment.external_reference;
    if (!suscripcionId) return NextResponse.json({ ok: true });

    const suscripcion = await prisma.suscripcion.findUnique({ where: { id: suscripcionId } });
    if (!suscripcion) return NextResponse.json({ ok: true });

    await registrarPagoConfirmado({
      suscripcionId,
      monto: payment.transaction_amount,
      moneda: payment.currency_id,
      metodoPago: "MERCADOPAGO",
      referencia: String(paymentId),
      realizadoPor: "webhook-mercadopago",
    });
  }

  return NextResponse.json({ ok: true });
}
