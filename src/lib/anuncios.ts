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
    borde: "border-blue-800/40",
    fondo: "bg-blue-950/30",
    texto: "text-blue-300",
    etiqueta: "Información",
  },
  ADVERTENCIA: {
    borde: "border-yellow-800/40",
    fondo: "bg-yellow-950/30",
    texto: "text-yellow-300",
    etiqueta: "Atención",
  },
  EXITO: {
    borde: "border-green-800/40",
    fondo: "bg-green-950/30",
    texto: "text-green-300",
    etiqueta: "Novedad",
  },
  MANTENIMIENTO: {
    borde: "border-indigo-800/40",
    fondo: "bg-indigo-950/30",
    texto: "text-indigo-300",
    etiqueta: "Mantenimiento",
  },
};
