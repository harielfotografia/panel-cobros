import { NextRequest, NextResponse } from "next/server";
import { requireServiceKey } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const cliente = await requireServiceKey(req);
    const sub = cliente.suscripciones[0] ?? null;

    return NextResponse.json({
      plan: cliente.plan
        ? { nombre: cliente.plan.nombre, clave: cliente.plan.clave, maxProfesionales: cliente.plan.maxProfesionales, modulos: cliente.plan.modulos }
        : null,
      estado: cliente.estado,
      suscripcion: sub
        ? { activa: sub.activa, fechaVencimiento: sub.fechaVencimiento, monto: sub.monto, moneda: sub.moneda }
        : null,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error";
    const status = msg.includes("requerida") || msg.includes("inválida") ? 401 : 500;
    return NextResponse.json({ error: msg }, { status });
  }
}
