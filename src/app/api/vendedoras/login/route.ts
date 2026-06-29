import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { identifier, password } = await req.json();
  if (!identifier || !password) {
    return NextResponse.json({ error: "Credenciales requeridas" }, { status: 400 });
  }

  const q = String(identifier).trim();
  const vendedora = await prisma.vendedora.findFirst({
    where: {
      activa: true,
      OR: [
        { email: { equals: q, mode: "insensitive" } },
        { rut: { equals: q, mode: "insensitive" } },
        { nombre: { equals: q, mode: "insensitive" } },
      ],
    },
  });

  if (!vendedora || !vendedora.password) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, vendedora.password);
  if (!valid) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = signToken({ id: vendedora.id, email: vendedora.email ?? vendedora.id, rol: "vendedora" });

  const res = NextResponse.json({ ok: true, nombre: vendedora.nombre });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
