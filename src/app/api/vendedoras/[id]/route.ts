import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { nombre, email, telefono, comisionPct, activa } = await req.json();
    const v = await prisma.vendedora.update({
      where: { id },
      data: { nombre, email: email || null, telefono: telefono || null, comisionPct: comisionPct ?? null, activa },
    });
    return NextResponse.json(v);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    // Desvincula clientes antes de borrar
    await prisma.cliente.updateMany({ where: { vendedoraId: id }, data: { vendedoraId: null } });
    await prisma.vendedora.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
