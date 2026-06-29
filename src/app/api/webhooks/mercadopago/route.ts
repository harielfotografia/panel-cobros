import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { registrarPagoConfirmado } from "@/lib/cobros";
import crypto from "crypto";

const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

// Verifica firma HMAC-SHA256 que MercadoPago incluye en X-Signature.
// Formato: "ts=<timestamp>,v1=<hex-signature>"
// Manifest firmado: "id:<dataId>;request-id:<requestId>;ts:<ts>;"
// Ref: https://www.mercadopago.com.ar/developers/es/docs/your-integrations/notifications/webhooks
function verificarFirmaMP(req: NextRequest, rawBody: string): boolean {
  // En dev (sin secret configurado) se omite la validación
  if (!MP_WEBHOOK_SECRET) return true;

  const xSignature = req.headers.get("x-signature") ?? "";
  const xRequestId = req.headers.get("x-request-id") ?? "";
  const dataId = new URL(req.url).searchParams.get("data.id") ?? "";

  const ts = xSignature.match(/ts=(\d+)/)?.[1];
  const v1 = xSignature.match(/v1=([a-f0-9]+)/)?.[1];
  if (!ts || !v1) return false;

  // Rechazar webhooks con más de 5 minutos de antigüedad
  const ahora = Math.floor(Date.now() / 1000);
  if (Math.abs(ahora - parseInt(ts)) > 300) return false;

  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const expected = crypto
    .createHmac("sha256", MP_WEBHOOK_SECRET)
    .update(manifest)
    .digest("hex");

  // Comparación en tiempo constante para evitar timing attacks
  try {
    return crypto.timingSafeEqual(Buffer.from(v1, "hex"), Buffer.from(expected, "hex"));
  } catch {
    return false;
  }
}

async function mpGet(path: string) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    headers: { Authorization: `Bearer ${MP_TOKEN}` },
  });
  if (!res.ok) throw new Error(`MP API ${path} → ${res.status}`);
  return res.json();
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  if (!verificarFirmaMP(req, rawBody)) {
    console.warn("[webhook-mp] Firma inválida — request rechazado");
    return NextResponse.json({ error: "Firma inválida" }, { status: 401 });
  }

  let body: { type?: string; data?: { id?: string } };
  try {
    body = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

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
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
    }
  }

  // Cobro automático de suscripción recurrente (preapproval)
  if (type === "subscription_authorized_payment") {
    const invoiceId = data?.id;
    if (!invoiceId) return NextResponse.json({ ok: true });

    try {
      const invoice = await mpGet(`/v1/subscription_authorized_payments/${invoiceId}`);
      if (invoice.status !== "processed") return NextResponse.json({ ok: true });

      const preapprovalId = invoice.preapproval_id;
      if (!preapprovalId) return NextResponse.json({ ok: true });

      const suscripcion = await prisma.suscripcion.findFirst({
        where: { mpPreapprovalId: String(preapprovalId) },
      });

      if (!suscripcion) {
        console.error("[webhook-mp] preapproval no encontrado en BD");
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
      return NextResponse.json({ error: "Error interno" }, { status: 500 });
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
