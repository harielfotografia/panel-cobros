import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const plan = await prisma.plan.update({
      where: { id },
      data: {
        clave: body.clave ? (body.clave as string).toUpperCase() : undefined,
        nombre: body.nombre,
        precio: body.precio != null ? Number(body.precio) : undefined,
        intervalo: body.intervalo,
        maxProfesionales: body.maxProfesionales != null ? Number(body.maxProfesionales) : undefined,
        modulos: body.modulos,
      },
    });
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const plan = await prisma.plan.update({
      where: { id },
      data: { activo: false },
    });
    return NextResponse.json(plan);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
