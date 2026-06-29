import { NextRequest, NextResponse } from "next/server";

// Rutas públicas: login admin, login/verify del portal, sus APIs, webhooks y cron.
const PUBLIC_PATHS = [
  "/login",
  "/api/auth/login",
  "/portal/login",
  "/portal/verify",
  "/api/portal/magic-link",
  "/api/portal/buscar-cliente",
  "/api/webhooks",
  "/api/cron",
  "/vendedora/login",
  "/api/vendedoras/login",
];

// Rutas donde redirigir al login del portal (en vez del admin) si falta sesión.
const PORTAL_PREFIX = "/portal";

// Chequeo "optimista": solo verifica que exista la cookie de sesión.
// La verificación criptográfica real del JWT ocurre en getSession()/requireAuth()
// dentro de los route handlers y server components (runtime de Node), no aquí en Edge.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (PUBLIC_PATHS.some((p) => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const token = req.cookies.get("token")?.value;
  if (!token) {
    let destino = "/login";
    if (pathname.startsWith(PORTAL_PREFIX)) destino = "/portal/login";
    else if (pathname.startsWith("/vendedora")) destino = "/vendedora/login";
    return NextResponse.redirect(new URL(destino, req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
