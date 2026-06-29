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

  // Idempotencia: si ya existe un pago con la misma referencia externa, no duplicar.
  if (opts.referencia) {
    const existente = await prisma.pago.findFirst({
      where: { referencia: opts.referencia, estado: "CONFIRMADO" },
    });
    if (existente) return { pago: existente, nuevaFecha: suscripcion.fechaVencimiento, reactivado: false };
  }

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

  const cliente = suscripcion.cliente;
  let reactivado = false;

  if (cliente.estado === "SUSPENDIDO") {
    if (cliente.apiUrl) {
      await clinicApi.setEstado(cliente.id, cliente.apiUrl, cliente.serviceKey, "activa");
    }
    await prisma.cliente.update({ where: { id: cliente.id }, data: { estado: "ACTIVO" } });
    reactivado = true;

    await prisma.logSuspension.create({
      data: {
        clienteId: cliente.id,
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

  // Push del plan a la clínica tras cada pago
  if (cliente.apiUrl && cliente.plan) {
    await clinicApi.pushPlan(cliente.id, cliente.apiUrl, cliente.serviceKey, {
      nombre: cliente.plan.nombre,
      maxProfesionales: cliente.plan.maxProfesionales,
      modulos: cliente.plan.modulos,
    });
  }

  return { pago, nuevaFecha, reactivado };
}
