import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, signToken } from "@/lib/auth";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;

    const cliente = await prisma.cliente.findUnique({ where: { id } });
    if (!cliente) return NextResponse.json({ error: "Cliente no encontrado" }, { status: 404 });

    const clienteToken = signToken({ id: cliente.id, email: cliente.email, rol: "cliente" });
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const adminToken = req.cookies.get("token")?.value ?? "";

    const res = NextResponse.json({ ok: true, url: `${appUrl}/portal` });
    res.cookies.set("token", clienteToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    res.cookies.set("admin_token", adminToken, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    });
    return res;
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
}
