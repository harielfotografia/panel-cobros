import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCliente } from "@/lib/auth";
import { getWebpayTx } from "@/lib/transbank";

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export async function POST(_: NextRequest) {
  let session;
  try {
    session = await requireCliente();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const sub = await prisma.suscripcion.findFirst({
    where: { clienteId: session.id, activa: true },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return NextResponse.json({ error: "Sin suscripción" }, { status: 404 });

  // buyOrder: máx 26 chars según Transbank
  const buyOrder = `SUB${sub.id.slice(-8)}${Date.now().toString().slice(-10)}`.slice(0, 26);
  const sessionId = session.id.slice(0, 61);
  const returnUrl = `${BASE}/api/webhooks/transbank/confirmar`;

  const tx = getWebpayTx();
  const response = await tx.create(buyOrder, sessionId, sub.monto, returnUrl);

  return NextResponse.json({ url: response.url, token: response.token });
}
