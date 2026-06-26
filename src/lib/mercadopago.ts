const MP_TOKEN = process.env.MP_ACCESS_TOKEN;
const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export const mpConfigurado = () => Boolean(MP_TOKEN);

async function mpFetch(path: string, body: object) {
  const res = await fetch(`https://api.mercadopago.com${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`MercadoPago ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

// Suscripción recurrente automática (el cliente registra su tarjeta una vez).
export async function crearPreapproval(opts: {
  suscripcionId: string;
  email: string;
  monto: number;
  razon: string;
}) {
  const data = await mpFetch("/preapproval", {
    reason: opts.razon,
    external_reference: opts.suscripcionId,
    payer_email: opts.email,
    auto_recurring: {
      frequency: 1,
      frequency_type: "months",
      transaction_amount: opts.monto,
      currency_id: "CLP",
    },
    back_url: `${BASE}/portal?pago=ok`,
    status: "pending",
  });
  return { id: data.id as string, initPoint: data.init_point as string };
}

// Pago único (una vez).
export async function crearPreferencia(opts: {
  suscripcionId: string;
  email: string;
  monto: number;
  titulo: string;
}) {
  const data = await mpFetch("/checkout/preferences", {
    items: [
      {
        title: opts.titulo,
        quantity: 1,
        unit_price: opts.monto,
        currency_id: "CLP",
      },
    ],
    payer: { email: opts.email },
    external_reference: opts.suscripcionId,
    back_urls: {
      success: `${BASE}/portal?pago=ok`,
      failure: `${BASE}/portal/pagar?pago=error`,
      pending: `${BASE}/portal?pago=pendiente`,
    },
    auto_return: "approved",
    notification_url: `${BASE}/api/webhooks/mercadopago`,
  });
  return { id: data.id as string, initPoint: data.init_point as string };
}
