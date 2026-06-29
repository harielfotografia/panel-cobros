import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function POST(req: NextRequest) {
  const { query } = await req.json();
  if (!query || String(query).trim().length < 3) {
    return NextResponse.json({ error: "Ingresa al menos 3 caracteres" }, { status: 400 });
  }

  const q = String(query).trim().toLowerCase();

  const cliente = await prisma.cliente.findFirst({
    where: {
      OR: [
        { email: { equals: q, mode: "insensitive" } },
        { rut: { equals: q, mode: "insensitive" } },
        { dominio: { contains: q, mode: "insensitive" } },
        { nombre: { contains: q, mode: "insensitive" } },
      ],
    },
    include: {
      plan: true,
      suscripciones: {
        where: { activa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  if (!cliente) {
    return NextResponse.json({ error: "No encontramos una cuenta con esos datos" }, { status: 404 });
  }

  // Generar token temporal de acceso (24h)
  const token = signToken({ id: cliente.id, email: cliente.email, rol: "cliente" });

  const sub = cliente.suscripciones[0];
  const vencida = sub ? new Date(sub.fechaVencimiento) < new Date() : true;
  const diasRestantes = sub
    ? Math.ceil((new Date(sub.fechaVencimiento).getTime() - Date.now()) / 86400000)
    : 0;

  const res = NextResponse.json({
    ok: true,
    cliente: {
      nombre: cliente.nombre,
      dominio: cliente.dominio,
      estado: cliente.estado,
      plan: cliente.plan?.nombre ?? null,
      monto: sub?.monto ?? null,
      vencida,
      diasRestantes,
      fechaVencimiento: sub?.fechaVencimiento ?? null,
    },
  });

  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24,
    path: "/",
  });

  return res;
}
