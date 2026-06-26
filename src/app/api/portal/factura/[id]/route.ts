import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireCliente } from "@/lib/auth";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const EMPRESA = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE || "Tu Empresa SpA";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let session;
  try {
    session = await requireCliente();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const pago = await prisma.pago.findUnique({
    where: { id },
    include: { suscripcion: { include: { cliente: true } } },
  });

  // Verifica que el pago pertenezca al cliente autenticado.
  if (!pago || pago.suscripcion.clienteId !== session.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const cliente = pago.suscripcion.cliente;
  const fecha = (pago.fechaPago ?? pago.createdAt).toLocaleDateString("es-CL");

  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const negro = rgb(0.1, 0.1, 0.12);
  const gris = rgb(0.45, 0.45, 0.5);

  const text = (t: string, x: number, y: number, size = 11, f = font, color = negro) =>
    page.drawText(t, { x, y, size, font: f, color });

  text(EMPRESA, 50, 780, 20, bold);
  text("COMPROBANTE DE PAGO", 50, 755, 12, bold, gris);

  text(`N° ${pago.id.slice(-8).toUpperCase()}`, 400, 780, 11, bold);
  text(`Fecha: ${fecha}`, 400, 762, 10, font, gris);

  page.drawLine({ start: { x: 50, y: 740 }, end: { x: 545, y: 740 }, thickness: 1, color: gris });

  text("Cliente", 50, 715, 10, bold, gris);
  text(cliente.nombre, 50, 698, 12);
  text(cliente.email, 50, 682, 10, font, gris);
  text(cliente.dominio, 50, 666, 10, font, gris);

  text("Detalle", 50, 620, 10, bold, gris);
  page.drawLine({ start: { x: 50, y: 610 }, end: { x: 545, y: 610 }, thickness: 0.5, color: gris });

  text("Suscripción mensual del servicio", 50, 590, 11);
  text(`$${pago.monto.toLocaleString("es-CL")} ${pago.moneda}`, 450, 590, 11, bold);

  text(`Método de pago: ${pago.metodoPago}`, 50, 565, 10, font, gris);
  if (pago.referencia) text(`Referencia: ${pago.referencia}`, 50, 550, 10, font, gris);

  page.drawLine({ start: { x: 50, y: 525 }, end: { x: 545, y: 525 }, thickness: 0.5, color: gris });
  text("Total pagado", 50, 500, 12, bold);
  text(`$${pago.monto.toLocaleString("es-CL")} ${pago.moneda}`, 430, 500, 14, bold);

  text("Este documento es un comprobante de pago, no es una boleta/factura tributaria.", 50, 80, 8, font, gris);

  const bytes = await doc.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="comprobante-${pago.id.slice(-8)}.pdf"`,
    },
  });
}
