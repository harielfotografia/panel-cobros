import { prisma } from "@/lib/prisma";
import { clinicApi } from "@/lib/clinic-api";
import { enviarAvisoReactivacion } from "@/lib/email";
import type { MetodoPago, TipoCobro } from "@prisma/client";

const DIA = 24 * 60 * 60 * 1000;

type RegistrarPagoOpts = {
  suscripcionId: string;
  monto: number;
  moneda?: string;
  metodoPago: MetodoPago;
  referencia?: string;
  tipoCobro?: TipoCobro;
  tarjetaUlt4?: string;
  mpPreapprovalId?: string;
  realizadoPor: string;
};

export async function registrarPagoConfirmado(opts: RegistrarPagoOpts) {
  const suscripcion = await prisma.suscripcion.findUnique({
    where: { id: opts.suscripcionId },
    include: { cliente: { include: { plan: true } } },
  });
  if (!suscripcion) throw new Error("Suscripción no encontrada");

  const pago = await prisma.pago.create({
    data: {
      suscripcionId: opts.suscripcionId,
      monto: opts.monto,
      moneda: opts.moneda ?? suscripcion.moneda,
      estado: "CONFIRMADO",
      metodoPago: opts.metodoPago,
      referencia: opts.referencia,
      fechaPago: new Date(),
    },
  });

  const base = suscripcion.fechaVencimiento > new Date() ? suscripcion.fechaVencimiento : new Date();
  const nuevaFecha = new Date(base.getTime() + 30 * DIA);

  await prisma.suscripcion.update({
    where: { id: opts.suscripcionId },
    data: {
      fechaVencimiento: nuevaFecha,
      ...(opts.tipoCobro ? { tipoCobro: opts.tipoCobro } : {}),
      ...(opts.tarjetaUlt4 ? { tarjetaUlt4: opts.tarjetaUlt4 } : {}),
      ...(opts.mpPreapprovalId ? { mpPreapprovalId: opts.mpPreapprovalId } : {}),
    },
  });

  let reactivado = false;
  const cliente = suscripcion.cliente;

  if (cliente.estado === "SUSPENDIDO") {
    if (cliente.apiUrl && cliente.serviceKey) {
      await clinicApi.setEstado(cliente.apiUrl, cliente.serviceKey, "activa").catch((err) => {
        console.error(`[cobros] clinicApi.setEstado falló para ${cliente.nombre}:`, err);
      });
    }

    await prisma.cliente.update({
      where: { id: suscripcion.clienteId },
      data: { estado: "ACTIVO" },
    });
    reactivado = true;

    await prisma.logSuspension.create({
      data: {
        clienteId: suscripcion.clienteId,
        accion: "REACTIVADO",
        motivo: "Pago confirmado",
        realizadoPor: opts.realizadoPor,
      },
    });

    await enviarAvisoReactivacion({
      nombre: cliente.nombre,
      email: cliente.email,
      dominio: cliente.dominio,
    }).catch(() => {});
  }

  // Push plan to clinic after payment
  if (cliente.apiUrl && cliente.serviceKey && cliente.plan) {
    await clinicApi.pushPlan(cliente.apiUrl, cliente.serviceKey, {
      nombre: cliente.plan.nombre,
      maxProfesionales: cliente.plan.maxProfesionales,
    }).catch((err) => {
      console.error(`[cobros] pushPlan falló para ${cliente.nombre}:`, err);
    });
  }

  return { pago, nuevaFecha, reactivado };
}
