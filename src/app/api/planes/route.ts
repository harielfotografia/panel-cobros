import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const planes = await prisma.plan.findMany({
      orderBy: { precio: "asc" },
      include: { _count: { select: { clientes: true } } },
    });
    return NextResponse.json(planes);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { clave, nombre, precio, intervalo, maxProfesionales, modulos } = body;

    const plan = await prisma.plan.create({
      data: {
        clave: (clave as string).toUpperCase(),
        nombre,
        precio: Number(precio),
        intervalo: intervalo ?? "mensual",
        maxProfesionales: Number(maxProfesionales ?? 0),
        modulos: modulos ?? [],
      },
    });
    return NextResponse.json(plan, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
