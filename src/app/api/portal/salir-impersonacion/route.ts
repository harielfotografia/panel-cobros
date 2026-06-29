import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const adminToken = req.cookies.get("admin_token");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const res = NextResponse.redirect(new URL("/clientes", appUrl));

  // Restaurar token admin
  if (adminToken?.value) {
    res.cookies.set("token", adminToken.value, {
      httpOnly: true,
      secure: process.env.COOKIE_SECURE === "true",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });
  }

  // Limpiar token de impersonación
  res.cookies.set("admin_token", "", { maxAge: 0, path: "/" });

  return res;
}
