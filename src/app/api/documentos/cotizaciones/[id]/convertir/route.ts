import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrContador } from "@/lib/auth";
import { calcFechaVencimiento } from "@/lib/documentos";
import { getNextNumero } from "@/lib/documentos-server";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminOrContador();
    const { id } = await params;
    const { tipo, plazoPago } = await req.json(); // tipo: "factura" | "boleta"

    const cot = await prisma.cotizacion.findUnique({ where: { id, deletedAt: null } });
    if (!cot) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
    if (cot.estado !== "APROBADA") {
      return NextResponse.json({ error: "Solo cotizaciones aprobadas se pueden convertir" }, { status: 400 });
    }

    const hoy = new Date();

    if (tipo === "factura") {
      const numero = await getNextNumero("factura");
      const plazo = plazoPago ?? "30";
      const factura = await prisma.factura.create({
        data: {
          numero,
          clienteId: cot.clienteId,
          clienteNombre: cot.clienteNombre,
          clienteRut: cot.clienteRut,
          cotizacionId: cot.id,
          fechaEmision: hoy,
          fechaVencimiento: calcFechaVencimiento(hoy, plazo),
          plazoPago: plazo,
          montoNeto: cot.subtotal,
          iva: cot.iva,
          total: cot.total,
          items: cot.items as never,
        },
      });
      await prisma.cotizacion.update({
        where: { id },
        data: { estado: "FACTURADA" },
      });
      return NextResponse.json({ tipo: "factura", documento: factura }, { status: 201 });
    }

    if (tipo === "boleta") {
      const numero = await getNextNumero("boleta");
      const boleta = await prisma.boleta.create({
        data: {
          numero,
          clienteId: cot.clienteId,
          clienteNombre: cot.clienteNombre,
          cotizacionId: cot.id,
          fechaEmision: hoy,
          montoTotal: cot.total,
          items: cot.items as never,
        },
      });
      await prisma.cotizacion.update({
        where: { id },
        data: { estado: "CONVERTIDA_BOLETA" },
      });
      return NextResponse.json({ tipo: "boleta", documento: boleta }, { status: 201 });
    }

    return NextResponse.json({ error: "tipo inválido: usa 'factura' o 'boleta'" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
