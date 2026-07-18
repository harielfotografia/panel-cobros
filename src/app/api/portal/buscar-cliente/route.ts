import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarMagicLink } from "@/lib/email";
import crypto from "crypto";

// Enmascara un email para mostrarlo en pantalla sin revelarlo completo
// (ej. "co***@dominio.cl"), suficiente para que el dueño real lo reconozca.
function enmascararEmail(email: string): string {
  const [user, domain] = email.split("@");
  if (!domain) return email;
  const visibles = user.slice(0, Math.min(2, user.length));
  return `${visibles}${"*".repeat(Math.max(user.length - visibles.length, 3))}@${domain}`;
}

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

  // Búsqueda por dominio/nombre/RUT NUNCA otorga sesión por sí sola — esos campos no son
  // secretos (dominio y nombre son públicos; el RUT de una empresa también suele serlo en Chile).
  // Solo confirma que existe una cuenta y envía un enlace de acceso al correo YA registrado,
  // mismo mecanismo (y misma tabla MagicLink) que /api/portal/magic-link.
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);
  await prisma.magicLink.create({ data: { clienteId: cliente.id, token, expiresAt } });

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${base}/portal/verify?token=${token}`;
  await enviarMagicLink(cliente.email, cliente.nombre, url).catch((e) =>
    console.error("Fallo al enviar magic link (buscar-cliente):", e)
  );

  const sub = cliente.suscripciones[0];
  const vencida = sub ? new Date(sub.fechaVencimiento) < new Date() : true;
  const diasRestantes = sub
    ? Math.ceil((new Date(sub.fechaVencimiento).getTime() - Date.now()) / 86400000)
    : 0;

  // En desarrollo (sin SMTP) devolvemos el link para poder probar el flujo, igual que magic-link.
  const devLink = !process.env.SMTP_HOST ? url : undefined;

  return NextResponse.json({
    ok: true,
    emailEnmascarado: enmascararEmail(cliente.email),
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
    devLink,
  });
}
