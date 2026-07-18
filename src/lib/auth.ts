import jwt from "jsonwebtoken";
import { cookies } from "next/headers";

const SECRET = process.env.JWT_SECRET!;

export type Rol = "admin" | "cliente" | "vendedora" | "contador";
export type SesionPayload = { id: string; email: string; rol: Rol };

export function signToken(payload: SesionPayload) {
  return jwt.sign(payload, SECRET, { expiresIn: "24h" });
}

export function verifyToken(token: string) {
  return jwt.verify(token, SECRET) as SesionPayload;
}

export async function getSession(): Promise<SesionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("token")?.value;
  if (!token) return null;
  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

export async function requireAuth() {
  const session = await getSession();
  if (!session) throw new Error("No autorizado");
  return session;
}

export async function requireAdmin() {
  const session = await getSession();
  if (!session || session.rol !== "admin") throw new Error("No autorizado");
  return session;
}

// CONTADOR tiene acceso de solo-contabilidad (facturación, pagos, clientes de solo lectura,
// reportes) — ver CONTADOR_ALLOWED en proxy.ts. Usar en los mismos endpoints que esa lista
// permite navegar; las acciones administrativas (crear/editar/eliminar/suspender clientes,
// planes, usuarios) siguen exigiendo requireAdmin() estricto.
export async function requireAdminOrContador() {
  const session = await getSession();
  if (!session || (session.rol !== "admin" && session.rol !== "contador")) {
    throw new Error("No autorizado");
  }
  return session;
}

export async function requireCliente() {
  const session = await getSession();
  if (!session || session.rol !== "cliente") throw new Error("No autorizado");
  return session;
}

export async function requireServiceKey(req: Request) {
  const { prisma } = await import("@/lib/prisma");
  const key = req.headers.get("X-Dora-Service-Key");
  if (!key) throw new Error("Service key requerida");
  const cliente = await prisma.cliente.findUnique({
    where: { serviceKey: key },
    include: { plan: true, suscripciones: { where: { activa: true }, orderBy: { createdAt: "desc" as const }, take: 1 } },
  });
  if (!cliente) throw new Error("Service key inválida");
  return cliente;
}
