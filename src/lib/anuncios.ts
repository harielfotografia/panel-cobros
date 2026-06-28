import { prisma } from "@/lib/prisma";
import type { TipoAnuncio } from "@prisma/client";

// Anuncios activos visibles para un cliente: los suyos + los globales.
export async function anunciosParaCliente(clienteId: string) {
  return prisma.anuncio.findMany({
    where: {
      activo: true,
      OR: [{ clienteId }, { clienteId: null }],
      AND: [{ OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] }],
    },
    orderBy: { createdAt: "desc" },
  });
}

export const ESTILO_ANUNCIO: Record<
  TipoAnuncio,
  { borde: string; fondo: string; texto: string; etiqueta: string }
> = {
  INFO: {
    borde: "border-blue-200",
    fondo: "bg-blue-50",
    texto: "text-blue-600",
    etiqueta: "Información",
  },
  ADVERTENCIA: {
    borde: "border-yellow-200",
    fondo: "bg-yellow-50",
    texto: "text-yellow-600",
    etiqueta: "Atención",
  },
  EXITO: {
    borde: "border-green-200",
    fondo: "bg-green-50",
    texto: "text-green-600",
    etiqueta: "Novedad",
  },
  MANTENIMIENTO: {
    borde: "border-blue-200",
    fondo: "bg-blue-50",
    texto: "text-blue-600",
    etiqueta: "Mantenimiento",
  },
};
