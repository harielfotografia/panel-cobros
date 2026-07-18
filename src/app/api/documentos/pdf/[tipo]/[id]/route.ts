import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdminOrContador } from "@/lib/auth";
import { formatCLP } from "@/lib/documentos";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const NEGRO = rgb(0.08, 0.08, 0.1);
const GRIS = rgb(0.45, 0.45, 0.5);
const GRIS_SUAVE = rgb(0.93, 0.93, 0.95);
const AZUL = rgb(0.15, 0.35, 0.85);

type ItemDoc = { descripcion: string; cantidad: number; precioUnitario: number; descuento: number; total: number };

async function generarPDF(tipo: string, data: Record<string, unknown>, empresa: { nombre: string; rut: string; direccion: string }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const t = (text: string, x: number, y: number, size = 10, f = font, color = NEGRO) =>
    page.drawText(String(text), { x, y, size, font: f, color });

  const line = (x1: number, y1: number, x2: number, y2: number, color = GRIS, w = 0.5) =>
    page.drawLine({ start: { x: x1, y: y1 }, end: { x: x2, y: y2 }, thickness: w, color });

  const rect = (x: number, y: number, w: number, h: number, color = GRIS_SUAVE) =>
    page.drawRectangle({ x, y, width: w, height: h, color });

  // ── Encabezado ──────────────────────────────────────────────────────────
  t(empresa.nombre || "Mi Empresa", 45, 800, 16, bold, AZUL);
  if (empresa.rut) t(`RUT: ${empresa.rut}`, 45, 783, 9, font, GRIS);
  if (empresa.direccion) t(empresa.direccion, 45, 771, 9, font, GRIS);

  const tipoLabel = tipo === "cotizacion" ? "COTIZACIÓN" : tipo === "factura" ? "FACTURA" : "BOLETA";
  t(tipoLabel, 400, 800, 14, bold, AZUL);
  t(String(data.numero ?? ""), 400, 783, 11, bold, NEGRO);
  const fecha = (data.fecha ?? data.fechaEmision) as Date | string | null;
  if (fecha) t(`Fecha: ${new Date(fecha).toLocaleDateString("es-CL")}`, 400, 770, 9, font, GRIS);

  line(45, 760, 550, 760, AZUL, 1.5);

  // ── Datos cliente ───────────────────────────────────────────────────────
  t("DATOS DEL CLIENTE", 45, 742, 8, bold, GRIS);
  t(String(data.clienteNombre ?? ""), 45, 727, 11, bold);
  if (data.clienteRut) t(`RUT: ${data.clienteRut}`, 45, 713, 9, font, GRIS);

  // Datos extra según tipo
  if (tipo === "cotizacion") {
    if (data.atte) t(`Atención: ${data.atte}`, 300, 727, 9, font, GRIS);
    if (data.vigencia) t(`Vigencia: ${data.vigencia}`, 300, 713, 9, font, GRIS);
    if (data.formaPago) t(`Forma de pago: ${data.formaPago}`, 300, 701, 9, font, GRIS);
  } else if (tipo === "factura") {
    const venc = data.fechaVencimiento as Date | string | null;
    if (venc) t(`Vencimiento: ${new Date(venc).toLocaleDateString("es-CL")}`, 300, 727, 9, font, GRIS);
    t(`Plazo: ${data.plazoPago === "contado" ? "Contado" : `${data.plazoPago} días`}`, 300, 713, 9, font, GRIS);
    if (data.numeroSii) t(`N° Factura SII: ${data.numeroSii}`, 300, 701, 9, font, GRIS);
  }

  line(45, 695, 550, 695, GRIS);

  // ── Tabla de ítems ──────────────────────────────────────────────────────
  rect(45, 676, 505, 16, AZUL);
  page.drawText("Descripción", { x: 50, y: 682, size: 9, font: bold, color: rgb(1,1,1) });
  page.drawText("Cant.", { x: 330, y: 682, size: 9, font: bold, color: rgb(1,1,1) });
  page.drawText("P.Unitario", { x: 370, y: 682, size: 9, font: bold, color: rgb(1,1,1) });
  page.drawText("Desc.%", { x: 440, y: 682, size: 9, font: bold, color: rgb(1,1,1) });
  page.drawText("Total", { x: 490, y: 682, size: 9, font: bold, color: rgb(1,1,1) });

  const items = (data.items as ItemDoc[]) ?? [];
  let y = 665;
  items.forEach((it, i) => {
    if (i % 2 === 0) rect(45, y - 4, 505, 14, rgb(0.97, 0.97, 0.98));
    const desc = it.descripcion.length > 45 ? it.descripcion.slice(0, 44) + "…" : it.descripcion;
    t(desc, 50, y + 2, 8.5);
    t(String(it.cantidad), 338, y + 2, 8.5);
    t(formatCLP(it.precioUnitario).replace("$ ", ""), 370, y + 2, 8.5);
    t(`${it.descuento}%`, 447, y + 2, 8.5);
    t(formatCLP(it.total).replace("$ ", ""), 488, y + 2, 8.5, font, NEGRO);
    y -= 14;
  });

  line(45, y, 550, y, GRIS);
  y -= 8;

  // ── Totales ─────────────────────────────────────────────────────────────
  if (tipo === "boleta") {
    rect(380, y - 6, 170, 20, AZUL);
    t("Total:", 385, y + 1, 10, bold, rgb(1,1,1));
    t(formatCLP(data.montoTotal as number), 460, y + 1, 10, bold, rgb(1,1,1));
    y -= 30;
  } else {
    const subtotal = data.subtotal as number ?? 0;
    const iva = data.iva as number ?? 0;
    const total = data.total as number ?? 0;
    t("Neto:", 420, y, 9, font, GRIS); t(formatCLP(subtotal), 470, y, 9); y -= 13;
    t("IVA (19%):", 420, y, 9, font, GRIS); t(formatCLP(iva), 470, y, 9); y -= 13;
    rect(380, y - 4, 170, 18, AZUL);
    t("Total:", 385, y + 1, 10, bold, rgb(1,1,1));
    t(formatCLP(total), 460, y + 1, 10, bold, rgb(1,1,1));
    y -= 30;
  }

  // ── Comentarios / Notas ─────────────────────────────────────────────────
  const comentarios = (data.comentarios ?? data.notas) as string | null;
  if (comentarios) {
    y -= 10;
    t("Observaciones:", 45, y, 8, bold, GRIS); y -= 12;
    t(comentarios.slice(0, 200), 45, y, 8, font, GRIS);
  }

  // ── Pie ─────────────────────────────────────────────────────────────────
  line(45, 60, 550, 60, GRIS);
  t("Documento generado electrónicamente — no requiere firma", 45, 48, 7.5, font, GRIS);

  return doc.save();
}

export async function GET(_: NextRequest, { params }: { params: Promise<{ tipo: string; id: string }> }) {
  try {
    await requireAdminOrContador();
    const { tipo, id } = await params;

    let data: Record<string, unknown> | null = null;
    if (tipo === "cotizacion") {
      data = await prisma.cotizacion.findUnique({ where: { id } }) as unknown as Record<string, unknown>;
    } else if (tipo === "factura") {
      data = await prisma.factura.findUnique({ where: { id } }) as unknown as Record<string, unknown>;
    } else if (tipo === "boleta") {
      data = await prisma.boleta.findUnique({ where: { id } }) as unknown as Record<string, unknown>;
    }

    if (!data) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

    const config = await prisma.configuracion.findUnique({ where: { id: "config" } });
    const empresa = {
      nombre: config?.empresaNombre ?? "",
      rut: config?.empresaRut ?? "",
      direccion: config?.empresaDireccion ?? "",
    };

    const bytes = await generarPDF(tipo, data, empresa);
    const numero = String(data.numero ?? "doc");

    return new NextResponse(Buffer.from(bytes), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${numero}.pdf"`,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
