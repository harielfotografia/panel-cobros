import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
    const anuncios = await prisma.anuncio.findMany({
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(anuncios);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const { titulo, mensaje, tipo, clienteId, fechaFin } = await req.json();

    const anuncio = await prisma.anuncio.create({
      data: {
        titulo,
        mensaje,
        tipo: tipo ?? "INFO",
        clienteId: clienteId || null,
        fechaFin: fechaFin ? new Date(fechaFin) : null,
      },
    });
    return NextResponse.json(anuncio, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
