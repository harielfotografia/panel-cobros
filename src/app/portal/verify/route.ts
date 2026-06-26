import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token");
  const base = process.env.NEXT_PUBLIC_APP_URL || req.nextUrl.origin;

  if (!token) {
    return NextResponse.redirect(new URL("/portal/login?error=invalido", base));
  }

  const magic = await prisma.magicLink.findUnique({
    where: { token },
    include: { cliente: true },
  });

  if (!magic || magic.usado || magic.expiresAt < new Date()) {
    return NextResponse.redirect(new URL("/portal/login?error=expirado", base));
  }

  await prisma.magicLink.update({ where: { id: magic.id }, data: { usado: true } });

  const jwt = signToken({
    id: magic.cliente.id,
    email: magic.cliente.email,
    rol: "cliente",
  });

  const res = NextResponse.redirect(new URL("/portal", base));
  res.cookies.set("token", jwt, {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}
