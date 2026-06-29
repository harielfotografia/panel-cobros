import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { nombre, email, telefono, rut, password, comisionPct, activa } = await req.json();

    const data: Record<string, unknown> = {
      nombre,
      email: email || null,
      telefono: telefono || null,
      rut: rut || null,
      comisionPct: comisionPct ?? null,
      activa,
    };

    // Solo actualizar contraseña si se envió una nueva
    if (password) {
      data.password = await bcrypt.hash(password, 10);
    }

    const v = await prisma.vendedora.update({ where: { id }, data });
    return NextResponse.json(v);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.cliente.updateMany({ where: { vendedoraId: id }, data: { vendedoraId: null } });
    await prisma.vendedora.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
