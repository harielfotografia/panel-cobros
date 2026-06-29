import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const cliente = await prisma.cliente.findUnique({
      where: { id },
      include: {
        plan: true,
        suscripciones: {
          include: { pagos: { orderBy: { createdAt: "desc" } } },
          orderBy: { createdAt: "desc" },
        },
      },
    });
    if (!cliente) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
    return NextResponse.json(cliente);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();

    // Validar planId si viene en el body
    if (body.planId) {
      const plan = await prisma.plan.findUnique({ where: { id: body.planId } });
      if (!plan) return NextResponse.json({ error: "Plan no encontrado" }, { status: 400 });
    }

    // Validar apiUrl si viene
    if (body.apiUrl) {
      try {
        const url = new URL(body.apiUrl);
        if (url.protocol !== "https:") {
          return NextResponse.json({ error: "apiUrl debe usar HTTPS" }, { status: 400 });
        }
      } catch {
        return NextResponse.json({ error: "apiUrl inválida" }, { status: 400 });
      }
    }

    const cliente = await prisma.cliente.update({
      where: { id },
      data: {
        nombre: body.nombre,
        email: body.email,
        telefono: body.telefono,
        notas: body.notas,
        apiUrl: body.apiUrl,
        planId: body.planId,
      },
    });
    return NextResponse.json(cliente);
  } catch {
    return NextResponse.json({ error: "Error al actualizar cliente" }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.cliente.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
