import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarPagoConfirmado } from "@/lib/cobros";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;

async function mpGet(path: string) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP API ${path} → ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { type, data } = body;

  // Pago único aprobado (preference checkout)
  if (type === "payment") {
    const paymentId = data?.id;
    if (!paymentId) return NextResponse.json({ ok: true });

    try {
      const payment = await mpGet(`/v1/payments/${paymentId}`);
      if (payment.status !== "approved") return NextResponse.json({ ok: true });

      const suscripcionId = payment.external_reference;
      if (!suscripcionId) return NextResponse.json({ ok: true });

      await registrarPagoConfirmado({
        suscripcionId,
        monto: payment.transaction_amount,
        moneda: payment.currency_id,
        metodoPago: "MERCADOPAGO",
        referencia: String(paymentId),
        realizadoPor: "webhook-mp-payment",
      });
    } catch (e) {
      console.error("[webhook-mp] payment error:", e);
    }
  }

  // Cobro automático de suscripción recurrente (preapproval)
  if (type === "subscription_authorized_payment") {
    const invoiceId = data?.id;
    if (!invoiceId) return NextResponse.json({ ok: true });

    try {
      // Obtener detalle del cobro recurrente
      const invoice = await mpGet(`/v1/subscription_authorized_payments/${invoiceId}`);
      if (invoice.status !== "processed") return NextResponse.json({ ok: true });

      const preapprovalId = invoice.preapproval_id;
      if (!preapprovalId) return NextResponse.json({ ok: true });

      // Buscar la suscripción por preapprovalId
      const suscripcion = await prisma.suscripcion.findFirst({
        where: { mpPreapprovalId: String(preapprovalId) },
      });

      if (!suscripcion) {
        console.error(`[webhook-mp] preapproval ${preapprovalId} no encontrado en BD`);
        return NextResponse.json({ ok: true });
      }

      await registrarPagoConfirmado({
        suscripcionId: suscripcion.id,
        monto: invoice.transaction_amount ?? suscripcion.monto,
        moneda: invoice.currency_id ?? "CLP",
        metodoPago: "MERCADOPAGO",
        referencia: `MP-INV-${invoiceId}`,
        tipoCobro: "AUTOMATICO",
        mpPreapprovalId: String(preapprovalId),
        realizadoPor: "webhook-mp-preapproval",
      });
    } catch (e) {
      console.error("[webhook-mp] preapproval error:", e);
    }
  }

  // Cambio de estado en suscripción (ej: cancelada, pausada)
  if (type === "subscription_preapproval") {
    const preapprovalId = data?.id;
    if (!preapprovalId) return NextResponse.json({ ok: true });

    try {
      const preapproval = await mpGet(`/preapproval/${preapprovalId}`);

      if (preapproval.status === "cancelled" || preapproval.status === "paused") {
        const suscripcion = await prisma.suscripcion.findFirst({
          where: { mpPreapprovalId: String(preapprovalId) },
        });
        if (suscripcion) {
          await prisma.suscripcion.update({
            where: { id: suscripcion.id },
            data: { activa: false },
          });
        }
      }
    } catch (e) {
      console.error("[webhook-mp] preapproval status error:", e);
    }
  }

  return NextResponse.json({ ok: true });
}
