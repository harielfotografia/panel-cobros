import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrContador } from "@/lib/auth";
import { calcularTotales, cotizacionEditable } from "@/lib/documentos";
import type { ItemDoc } from "@/lib/documentos";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrContador();
    const { id } = await params;
    const cot = await prisma.cotizacion.findUnique({
      where: { id, deletedAt: null },
      include: { cliente: { select: { nombre: true, rut: true } }, facturas: true, boletas: true },
    });
    if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    return NextResponse.json(cot);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrContador();
    const { id } = await params;

    const cot = await prisma.cotizacion.findUnique({ where: { id, deletedAt: null } });
    if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (!cotizacionEditable(cot.estado)) {
      return NextResponse.json({ error: "No se puede editar una cotización ya convertida" }, { status: 400 });
    }

    const body = await req.json();
    const { clienteId, clienteNombre, clienteRut, fecha, vigencia, formaPago, atte, comentarios, items, estado } = body;

    const itemsConTotal = (items as ItemDoc[]).map((it) => ({
      ...it,
      total: Math.round(it.cantidad * it.precioUnitario * (1 - (it.descuento ?? 0) / 100)),
    }));
    const { subtotal, iva, total } = calcularTotales(itemsConTotal);

    const ESTADOS_VALIDOS = ["BORRADOR", "ENVIADA", "APROBADA", "RECHAZADA"];
    const updated = await prisma.cotizacion.update({
      where: { id },
      data: {
        clienteId: clienteId || null,
        clienteNombre: clienteNombre || "",
        clienteRut: clienteRut || "",
        fecha: new Date(fecha),
        vigencia, formaPago, atte, comentarios,
        estado: ESTADOS_VALIDOS.includes(estado) ? estado : cot.estado,
        items: itemsConTotal,
        subtotal, iva, total,
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrContador();
    const { id } = await params;
    await prisma.cotizacion.update({ where: { id }, data: { deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 400 });
  }
}
