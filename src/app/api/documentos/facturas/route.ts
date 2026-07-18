import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrContador } from "@/lib/auth";
import { calcFechaVencimiento } from "@/lib/documentos";
import { getNextNumero } from "@/lib/documentos-server";
import type { ItemDoc } from "@/lib/documentos";

export async function GET(req: NextRequest) {
  try {
    await requireAdminOrContador();
    const { searchParams } = req.nextUrl;
    const estado = searchParams.get("estado");
    const clienteId = searchParams.get("clienteId");

    const facturas = await prisma.factura.findMany({
      where: {
        deletedAt: null,
        ...(estado ? { estado: estado as never } : {}),
        ...(clienteId ? { clienteId } : {}),
      },
      include: { cotizacion: { select: { numero: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(facturas);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function POST(req: NextRequest) {
  try {
    await requireAdminOrContador();
    const body = await req.json();
    const { clienteId, clienteNombre, clienteRut, cotizacionId, numeroSii,
            fechaEmision, plazoPago, montoNeto, items, notas } = body;

    const plazo = plazoPago ?? "30";
    const emision = new Date(fechaEmision);
    const iva = Math.round(montoNeto * 0.19);
    const total = montoNeto + iva;
    const numero = await getNextNumero("factura");

    const factura = await prisma.factura.create({
      data: {
        numero,
        numeroSii: numeroSii ?? "",
        clienteId: clienteId || null,
        clienteNombre: clienteNombre || "",
        clienteRut: clienteRut || "",
        cotizacionId: cotizacionId || null,
        fechaEmision: emision,
        fechaVencimiento: calcFechaVencimiento(emision, plazo),
        plazoPago: plazo,
        montoNeto,
        iva,
        total,
        items: ((items as ItemDoc[]) ?? []) as never,
        notas: notas ?? "",
      },
    });
    return NextResponse.json(factura, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
