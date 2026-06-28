import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const bol = await prisma.boleta.findUnique({
      where: { id, deletedAt: null },
      include: { cotizacion: { select: { numero: true } } },
    });
    if (!bol) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(bol);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { numeroSii, clienteNombre, fechaEmision, estado, montoTotal, notas, adjuntos } = body;

    const ESTADOS_VALIDOS = ["PENDIENTE", "PAGADA", "ANULADA"];
    const updated = await prisma.boleta.update({
      where: { id },
      data: {
        numeroSii: numeroSii ?? "",
        clienteNombre,
        fechaEmision: new Date(fechaEmision),
        estado: ESTADOS_VALIDOS.includes(estado) ? estado : "PENDIENTE",
        montoTotal, notas,
        ...(adjuntos !== undefined ? { adjuntos } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.boleta.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
