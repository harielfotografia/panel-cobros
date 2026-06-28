import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getNextNumero } from "@/lib/documentos-server";
import type { ItemDoc } from "@/lib/documentos";

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = req.nextUrl;
    const estado = searchParams.get("estado");
    const clienteId = searchParams.get("clienteId");

    const boletas = await prisma.boleta.findMany({
      where: {
        deletedAt: null,
        ...(estado ? { estado: estado as never } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cotizacion: { select: { numero: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(boletas);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { clienteId, clienteNombre, cotizacionId, numeroSii, fechaEmision, montoTotal, items, notas } = body;

    const numero = await getNextNumero("boleta");
    const boleta = await prisma.boleta.create({
      data: {
        numero,
        numeroSii: numeroSii ?? "",
        clienteId: clienteId || null,
        clienteNombre: clienteNombre || "",
        cotizacionId: cotizacionId || null,
        fechaEmision: new Date(fechaEmision),
        montoTotal,
        items: ((items as ItemDoc[]) ?? []) as never,
        notas: notas ?? "",
      },
    });
    return NextResponse.json(boleta, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
