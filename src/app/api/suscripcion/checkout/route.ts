import { NextRequest, NextResponse } from "next/server";
import { requireServiceKey } from "@/lib/auth";
import { mpConfigurado, crearPreferencia } from "@/lib/mercadopago";

export async function POST(req: NextRequest) {
  try {
    const cliente = await requireServiceKey(req);
    const sub = cliente.suscripciones[0];
    if (!sub) return NextResponse.json({ error: "Sin suscripción activa" }, { status: 400 });

    if (!mpConfigurado()) {
      return NextResponse.json({
        preference_id: "dev-simulated",
        init_point: null,
        dev: true,
      });
    }

    const result = await crearPreferencia({
      suscripcionId: sub.id,
      email: cliente.email,
      monto: sub.monto,
      titulo: `Suscripción ${cliente.plan?.nombre ?? "SaaS"} — ${cliente.nombre}`,
    });

    return NextResponse.json({
      preference_id: result.id,
      init_point: result.initPoint,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg.includes("requerida") || msg.includes("inválida") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
