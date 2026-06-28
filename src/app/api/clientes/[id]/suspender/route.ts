import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clinicApi } from "@/lib/clinic-api";
import { enviarAvisoSuspension } from "@/lib/email";
import { requireAdmin } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { motivo } = await req.json().catch(() => ({ motivo: "Suspensión manual" }));

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (cliente.apiUrl) {
      await clinicApi.setEstado(cliente.id, cliente.apiUrl, cliente.serviceKey, "suspendida");
    }

    await prisma.cliente.update({
      where: { id },
      data: { estado: "SUSPENDIDO" },
    });

    await prisma.logSuspension.create({
      data: {
        clienteId: id,
        accion: "SUSPENDIDO",
        motivo: motivo ?? "Suspensión manual",
        realizadoPor: session.email,
      },
    });

    await enviarAvisoSuspension({
      nombre: cliente.nombre,
      email: cliente.email,
      dominio: cliente.dominio,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
