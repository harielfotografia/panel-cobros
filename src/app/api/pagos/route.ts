import { NextRequest, NextResponse } from "next/server";
import { requireAdminOrContador } from "@/lib/auth";
import { registrarPagoConfirmado } from "@/lib/cobros";

export async function POST(req: NextRequest) {
  try {
    // Registrar un pago manual (ej. transferencia) es trabajo de contabilidad, no solo de admin.
    const session = await requireAdminOrContador();
    const { suscripcionId, monto, referencia, notas } = await req.json();

    if (!suscripcionId) return NextResponse.json({ error: "suscripcionId requerido" }, { status: 400 });
    if (!monto || typeof monto !== "number" || monto <= 0 || monto > 10_000_000) {
      return NextResponse.json({ error: "monto inválido (debe ser entre 1 y 10.000.000)" }, { status: 400 });
    }

    const result = await registrarPagoConfirmado({
      suscripcionId,
      monto,
      metodoPago: "TRANSFERENCIA",
      referencia: notas ? `${referencia ?? ""} — ${notas}` : referencia,
      realizadoPor: session.email,
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error("[pagos] error:", err);
    return NextResponse.json({ error: "Error al registrar pago" }, { status: 500 });
  }
}
