import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrContador } from "@/lib/auth";
import { calcularTotales } from "@/lib/documentos";
import { getNextNumero } from "@/lib/documentos-server";
import type { ItemDoc } from "@/lib/documentos";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrContador();
    const { searchParams } = req.nextUrl;
    const estado = searchParams.get("estado");
    const clienteId = searchParams.get("clienteId");

    const cotizaciones = await prisma.cotizacion.findMany({
      where: {
        deletedAt: null,
        ...(estado ? { estado: estado as never } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cliente: { select: { nombre: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(cotizaciones);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await requireAdminOrContador();
    const body = await req.json();
    const { clienteId, clienteNombre, clienteRut, fecha, vigencia, formaPago, atte, comentarios, items, estado } = body;

    const itemsConTotal = (items as ItemDoc[]).map((it) => ({
      ...it,
      total: Math.round(it.cantidad * it.precioUnitario * (1 - (it.descuento ?? 0) / 100)),
    }));
    const { subtotal, iva, total } = calcularTotales(itemsConTotal);
    const numero = await getNextNumero("cotizacion");

    const cotizacion = await prisma.cotizacion.create({
      data: {
        numero,
        clienteId: clienteId || null,
        clienteNombre: clienteNombre || "",
        clienteRut: clienteRut || "",
        fecha: fecha ? new Date(fecha) : new Date(),
        vigencia: vigencia || "30 días",
        formaPago: formaPago || "",
        atte: atte || "",
        comentarios: comentarios || "",
        estado: estado === "ENVIADA" ? "ENVIADA" : "BORRADOR",
        items: itemsConTotal,
        subtotal,
        iva,
        total,
      },
    });

    void session; // usado solo para verificar auth
    return NextResponse.json(cotizacion, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
