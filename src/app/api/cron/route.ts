import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { clinicApi } from "@/lib/clinic-api";
import { enviarAvisoVencimiento, enviarAvisoSuspension } from "@/lib/email";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-cron-secret");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const hoy = new Date();
  const resultados = { avisos: 0, suspendidos: 0, errores: [] as string[] };

  const suscripciones = await prisma.suscripcion.findMany({
    where: { activa: true },
    include: { cliente: true },
  });

  for (const s of suscripciones) {
    const cliente = s.cliente;
    const vencimiento = new Date(s.fechaVencimiento);
    const limiteConGracia = new Date(vencimiento.getTime() + s.diasGracia * 24 * 60 * 60 * 1000);
    const diasParaVencer = Math.ceil((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));

    if (diasParaVencer === 3 || diasParaVencer === 1) {
      await enviarAvisoVencimiento({
        nombre: cliente.nombre,
        email: cliente.email,
        dominio: cliente.dominio,
        diasRestantes: diasParaVencer,
      }).catch(() => {});
      resultados.avisos++;
    }

    if (hoy > limiteConGracia && cliente.estado === "ACTIVO") {
      try {
        if (cliente.apiUrl && cliente.serviceKey) {
          await clinicApi.setEstado(cliente.apiUrl, cliente.serviceKey, "suspendida");
        }
        await prisma.cliente.update({
          where: { id: cliente.id },
          data: { estado: "SUSPENDIDO" },
        });
        await prisma.logSuspension.create({
          data: {
            clienteId: cliente.id,
            accion: "SUSPENDIDO",
            motivo: "Vencimiento automático por falta de pago",
            realizadoPor: "sistema-cron",
          },
        });
        await enviarAvisoSuspension({
          nombre: cliente.nombre,
          email: cliente.email,
          dominio: cliente.dominio,
        }).catch(() => {});
        resultados.suspendidos++;
      } catch (err) {
        resultados.errores.push(`${cliente.nombre}: ${String(err)}`);
      }
    }
  }

  return NextResponse.json(resultados);
}
