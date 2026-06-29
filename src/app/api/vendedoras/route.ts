import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    await requireAdmin();
    const vendedoras = await prisma.vendedora.findMany({
      include: { _count: { select: { clientes: true } } },
      orderBy: { nombre: "asc" },
    });
    return NextResponse.json(vendedoras);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { nombre, email, telefono, rut, password, comisionPct } = await req.json();
    const passwordHash = password ? await bcrypt.hash(password, 10) : null;
    const v = await prisma.vendedora.create({
      data: {
        nombre,
        email: email || null,
        telefono: telefono || null,
        rut: rut || null,
        password: passwordHash,
        comisionPct: comisionPct ?? null,
      },
    });
    return NextResponse.json(v, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
