import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

async function getOrCreate() {
  return prisma.configuracion.upsert({
    where: { id: "config" },
    update: {},
    create: { id: "config" },
  });
}

export async function GET() {
  try {
    await requireAdmin();
    const config = await getOrCreate();
    return NextResponse.json(config);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const config = await prisma.configuracion.upsert({
      where: { id: "config" },
      update: {
        empresaNombre: body.empresaNombre ?? undefined,
        empresaRut: body.empresaRut ?? undefined,
        empresaDireccion: body.empresaDireccion ?? undefined,
        soporteEmail: body.soporteEmail ?? undefined,
        soporteWhatsApp: body.soporteWhatsApp ?? undefined,
        logoUrl: body.logoUrl ?? undefined,
        comisionPct: body.comisionPct !== undefined ? Number(body.comisionPct) : undefined,
      },
      create: { id: "config", ...body, comisionPct: Number(body.comisionPct ?? 10) },
    });
    return NextResponse.json(config);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
