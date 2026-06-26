import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { registrarPagoConfirmado } from "@/lib/cobros";

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdmin();
    const { suscripcionId, monto, referencia, notas } = await req.json();

    const result = await registrarPagoConfirmado({
      suscripcionId,
      monto,
      metodoPago: "TRANSFERENCIA",
      referencia: notas ? `${referencia ?? ""} — ${notas}` : referencia,
      realizadoPor: session.email,
    });

    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
