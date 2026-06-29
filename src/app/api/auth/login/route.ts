import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";
import bcrypt from "bcryptjs";

export async function POST(req: NextRequest) {
  const { identifier, password, email } = await req.json();

  // Acepta tanto el campo legacy "email" como el nuevo "identifier"
  const query = identifier ?? email ?? "";

  const admin = await prisma.admin.findFirst({
    where: {
      OR: [
        { email: query },
        { nombre: query },
      ],
    },
  });
  if (!admin) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const valid = await bcrypt.compare(password, admin.password);
  if (!valid) return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });

  const token = signToken({ id: admin.id, email: admin.email, rol: "admin" });

  const res = NextResponse.json({ ok: true, nombre: admin.nombre });
  res.cookies.set("token", token, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
