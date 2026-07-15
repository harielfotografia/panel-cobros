import { NextRequest, NextResponse } from "next/server";

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

const PORTAL_PREFIX = "/portal";

// Rutas permitidas para CONTADOR (todo lo demás redirige al dashboard)
const CONTADOR_ALLOWED = [
  "/",
  "/facturas-admin",
  "/reportes",
  "/pagos",
  "/clientes",
  "/api/documentos",
  "/api/pagos",
  "/api/clientes",
  "/api/configuracion",
  "/api/portal",
];

// Decodifica payload JWT sin verificar firma (la verificación real ocurre en Node runtime)
function jwtRole(token: string): string | null {
  try {
    const payload = token.split(".")[1];
    const decoded = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    return decoded?.rol ?? null;
  } catch {
    return null;
  }
}

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

  // Restricción CONTADOR: solo puede acceder a contabilidad y reportes
  if (jwtRole(token) === "contador") {
    const allowed = CONTADOR_ALLOWED.some((p) =>
      pathname === p || pathname.startsWith(p + "/")
    );
    if (!allowed) {
      return NextResponse.redirect(new URL("/", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
