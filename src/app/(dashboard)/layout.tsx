import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { DashboardShell } from "@/components/DashboardShell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  // CONTADOR también usa este layout (proxy.ts restringe a qué rutas puede entrar).
  // IMPORTANTE: cada rol no-admin debe mandarse a SU propia home, nunca a un destino fijo
  // que a su vez lo rebote de vuelta aquí — antes de este fix, tanto CONTADOR como
  // "vendedora" caían siempre en /portal (la home del CLIENTE), y como ninguno de los dos
  // pertenece ahí, terminaban en un loop de redirects infinito (/portal → / → /portal → …).
  if (session.rol === "cliente") redirect("/portal");
  if (session.rol === "vendedora") redirect("/vendedora");
  if (session.rol !== "admin" && session.rol !== "contador") redirect("/login");
  return <DashboardShell email={session.email}>{children}</DashboardShell>;
}
