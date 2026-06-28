import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { calcFechaVencimiento } from "@/lib/documentos";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const fac = await prisma.factura.findUnique({
      where: { id, deletedAt: null },
      include: { cotizacion: { select: { numero: true } }, cliente: { select: { nombre: true } } },
    });
    if (!fac) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(fac);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { numeroSii, clienteNombre, clienteRut, fechaEmision, plazoPago,
            estado, montoNeto, notas, adjuntos } = body;

    const plazo = plazoPago ?? "30";
    const emision = new Date(fechaEmision);
    const iva = Math.round(montoNeto * 0.19);
    const total = montoNeto + iva;

    const ESTADOS_VALIDOS = ["PENDIENTE", "PAGADA", "VENCIDA", "ANULADA"];
    const updated = await prisma.factura.update({
      where: { id },
      data: {
        numeroSii: numeroSii ?? "",
        clienteNombre, clienteRut,
        fechaEmision: emision,
        fechaVencimiento: calcFechaVencimiento(emision, plazo),
        plazoPago: plazo,
        estado: ESTADOS_VALIDOS.includes(estado) ? estado : "PENDIENTE",
        montoNeto, iva, total, notas,
        ...(adjuntos !== undefined ? { adjuntos } : {}),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.factura.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
