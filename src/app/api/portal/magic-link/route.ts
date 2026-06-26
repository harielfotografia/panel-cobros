import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { enviarMagicLink } from "@/lib/email";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  const { email } = await req.json();

  const cliente = await prisma.cliente.findUnique({ where: { email } });

  // Respuesta uniforme para no revelar si el email existe.
  const mensaje = "Si el correo está registrado, te enviamos un enlace de acceso.";

  if (!cliente) return NextResponse.json({ ok: true, mensaje });

  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

  await prisma.magicLink.create({
    data: { clienteId: cliente.id, token, expiresAt },
  });

  const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const url = `${base}/portal/verify?token=${token}`;

  // El fallo de envío no debe bloquear el acceso (se registra y, en dev, se muestra el link).
  await enviarMagicLink(cliente.email, cliente.nombre, url).catch((e) =>
    console.error("Fallo al enviar magic link:", e)
  );

  // En desarrollo (sin SMTP) devolvemos el link para poder probar el flujo.
  const devLink = !process.env.SMTP_HOST ? url : undefined;
  return NextResponse.json({ ok: true, mensaje, devLink });
}
