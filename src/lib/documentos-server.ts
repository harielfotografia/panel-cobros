// Funciones de documentos que requieren Prisma — solo para server components y API routes
import { prisma } from "@/lib/prisma";
import type { TipoDoc } from "@/lib/documentos";

// Numeración correlativa atómica usando transacción de Prisma
export async function getNextNumero(tipo: TipoDoc): Promise<string> {
  const prefijos: Record<TipoDoc, string> = {
    cotizacion: "COT",
    factura: "FAC",
    boleta: "BOL",
  };

  let numeroActual = 1;
  await prisma.$transaction(async (tx) => {
    const contador = await tx.documentoContador.upsert({
      where: { id: tipo },
      update: { contador: { increment: 1 } },
      create: { id: tipo, contador: 2 },
    });
    // upsert update: el valor retornado es el nuevo (post-increment)
    // si fue create: arrancó en 2, el primer número es 1
    numeroActual = contador.contador - 1 === 0 ? 1 : contador.contador - 1;
  });

  return `${prefijos[tipo]}-${String(numeroActual).padStart(6, "0")}`;
}
