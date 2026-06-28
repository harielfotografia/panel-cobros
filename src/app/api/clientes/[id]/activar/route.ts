import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clinicApi } from "@/lib/clinic-api";
import { enviarAvisoReactivacion } from "@/lib/email";
import { requireAdmin } from "@/lib/auth";

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    if (cliente.apiUrl) {
      await clinicApi.setEstado(cliente.id, cliente.apiUrl, cliente.serviceKey, "activa");
    }

    await prisma.cliente.update({
      where: { id },
      data: { estado: "ACTIVO" },
    });

    await prisma.logSuspension.create({
      data: {
        clienteId: id,
        accion: "REACTIVADO",
        motivo: "Reactivación manual",
        realizadoPor: session.email,
      },
    });

    await enviarAvisoReactivacion({
      nombre: cliente.nombre,
      email: cliente.email,
      dominio: cliente.dominio,
    }).catch(() => {});

    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
