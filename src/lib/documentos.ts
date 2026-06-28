// Utilidades puras para documentos — seguras para usar en client components
// NO importar Prisma aquí. Las funciones que usan BD están en documentos-server.ts

export type TipoDoc = "cotizacion" | "factura" | "boleta";

export interface ItemDoc {
  descripcion: string;
  cantidad: number;
  precioUnitario: number;
  descuento: number; // porcentaje 0-100
  total: number;
}

// Calcula total de un ítem (sin IVA — el IVA va sobre el subtotal)
export function calcularTotalItem(item: Omit<ItemDoc, "total">): number {
  return Math.round(item.cantidad * item.precioUnitario * (1 - item.descuento / 100));
}

// Calcula subtotal, IVA y total de una lista de ítems
export function calcularTotales(items: ItemDoc[]): { subtotal: number; iva: number; total: number } {
  const subtotal = items.reduce((acc, item) => acc + item.total, 0);
  const iva = Math.round(subtotal * 0.19);
  return { subtotal, iva, total: subtotal + iva };
}

// Calcula la fecha de vencimiento de una factura según el plazo
export function calcFechaVencimiento(fechaEmision: Date, plazo: string): Date {
  if (plazo === "contado") return new Date(fechaEmision);
  const dias = parseInt(plazo, 10);
  const fecha = new Date(fechaEmision);
  fecha.setDate(fecha.getDate() + dias);
  return fecha;
}

// Formatea un número como pesos chilenos: 1250000 → "$ 1.250.000"
export function formatCLP(n: number): string {
  return `$ ${Math.round(n).toLocaleString("es-CL")}`;
}

// Formatea RUT chileno
export function formatRut(rut: string): string {
  if (!rut) return "";
  const limpio = rut.replace(/[^0-9kK]/g, "");
  if (limpio.length < 2) return rut;
  const cuerpo = limpio.slice(0, -1);
  const dv = limpio.slice(-1).toUpperCase();
  return `${parseInt(cuerpo, 10).toLocaleString("es-CL")}-${dv}`;
}

// Verifica si un estado de cotización permite edición
export function cotizacionEditable(estado: string): boolean {
  return !["FACTURADA", "CONVERTIDA_BOLETA"].includes(estado);
}

// Verifica si una cotización se puede convertir
export function cotizacionConvertible(estado: string): boolean {
  return estado === "APROBADA";
}

// Item vacío para inicializar el editor
export function itemVacio(): ItemDoc {
  return { descripcion: "", cantidad: 1, precioUnitario: 0, descuento: 0, total: 0 };
}
