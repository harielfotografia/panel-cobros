import Link from "next/link";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  LayoutDashboard, CreditCard, FileText, Bell,
  Headphones, User, LogOut, MessageCircle, Home,
  ArrowLeft, Shield,
} from "lucide-react";
import type { ComponentType } from "react";
import { PortalLogoutButton } from "./PortalLogoutButton";

const SOPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP || "";
const SOPORTE_EMAIL = process.env.NEXT_PUBLIC_SOPORTE_EMAIL || "soporte@tudominio.cl";
const EMPRESA = process.env.NEXT_PUBLIC_EMPRESA_NOMBRE || "DentalCloud";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/portal/login");
  // Mismo criterio que (dashboard)/layout.tsx: cada rol a SU propia home, nunca a un
  // destino fijo que lo rebote de vuelta — evita el loop infinito ya documentado ahí
  // (antes, una sesión "vendedora" llegando aquí se mandaba a "/", que a su vez la
  // mandaba de vuelta a "/portal").
  if (session.rol === "vendedora") redirect("/vendedora");
  if (session.rol === "admin" || session.rol === "contador") redirect("/");
  if (session.rol !== "cliente") redirect("/portal/login");

  const cookieStore = await cookies();
  const adminToken = cookieStore.get("admin_token");
  const isImpersonating = Boolean(adminToken?.value);

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.id },
    select: { nombre: true, dominio: true },
  });

  const anuncioCount = await prisma.anuncio.count({
    where: {
      activo: true,
      OR: [{ clienteId: session.id }, { clienteId: null }],
      AND: [{ OR: [{ fechaFin: null }, { fechaFin: { gte: new Date() } }] }],
    },
  });

  const initials = (cliente?.nombre ?? "CL")
    .split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();

  const soporteUrl = SOPORTE_WHATSAPP
    ? `https://wa.me/${SOPORTE_WHATSAPP}`
    : `mailto:${SOPORTE_EMAIL}`;

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Banner impersonación */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500 text-white text-sm py-2 px-4 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-2">
            <Shield size={15} />
            <span className="font-medium">Modo administrador — estás viendo el portal de <strong>{cliente?.nombre}</strong></span>
          </div>
          <a
            href="/api/portal/salir-impersonacion"
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
          >
            <ArrowLeft size={13} /> Volver al panel
          </a>
        </div>
      )}

      {/* Sidebar — desktop */}
      <aside className={`hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col ${isImpersonating ? "mt-10" : ""}`}>
        <div className="px-5 py-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
              <Home size={18} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-900">{EMPRESA}</p>
              <p className="text-[11px] text-gray-400">Portal del Cliente</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          <SideLink href="/portal" icon={LayoutDashboard} label="Dashboard" />
          <SideLink href="/portal/pagar" icon={CreditCard} label="Pagar servicio" />
          <SideLink href="/portal/facturas" icon={FileText} label="Facturas" />
          <SideLink href="/portal/notificaciones" icon={Bell} label="Notificaciones" badge={anuncioCount || undefined} />
          <SideLink href={soporteUrl} icon={Headphones} label="Soporte" external />
          <SideLink href="/portal/cuenta" icon={User} label="Mi cuenta" />
        </nav>

        <div className="p-3">
          <div className="bg-blue-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Headphones size={18} className="text-blue-600" />
              <p className="text-sm font-semibold text-gray-900">¿Necesitas ayuda?</p>
            </div>
            <p className="text-xs text-gray-500">Estamos para ayudarte por WhatsApp o email</p>
            <a href={soporteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white text-sm font-medium rounded-lg py-2 transition-colors">
              <MessageCircle size={16} /> Contactar soporte
            </a>
          </div>
        </div>

        <div className="p-3 border-t border-gray-100">
          <PortalLogoutButton />
        </div>
      </aside>

      {/* Main */}
      <div className={`flex-1 flex flex-col overflow-hidden ${isImpersonating ? "mt-10" : ""}`}>
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-lg font-bold text-gray-900 md:hidden">{EMPRESA}</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/portal/notificaciones" className="relative text-gray-400 hover:text-gray-600 transition-colors">
              <Bell size={20} />
              {anuncioCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {anuncioCount}
                </span>
              )}
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="hidden md:block text-sm font-medium text-gray-700">{cliente?.nombre}</span>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8 pb-20 md:pb-8">{children}</main>
      </div>

      {/* Bottom nav — mobile */}
      <nav className={`md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around py-2 z-50`}>
        <BottomLink href="/portal" icon={Home} label="Inicio" />
        <BottomLink href="/portal/pagar" icon={CreditCard} label="Pagar" />
        <BottomLink href="/portal/facturas" icon={FileText} label="Facturas" />
        <BottomLink href={soporteUrl} icon={Headphones} label="Soporte" external />
        <BottomLink href="/portal/cuenta" icon={User} label="Cuenta" />
      </nav>
    </div>
  );
}

function SideLink({ href, icon: Icon, label, badge, external }: {
  href: string; icon: ComponentType<{ size?: number }>; label: string; badge?: number; external?: boolean;
}) {
  const cls = "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-blue-50 hover:text-blue-600 transition-colors";
  const content = (
    <>
      <Icon size={18} />
      <span className="flex-1">{label}</span>
      {badge && (
        <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">{badge}</span>
      )}
    </>
  );
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
  return <Link href={href} className={cls}>{content}</Link>;
}

function BottomLink({ href, icon: Icon, label, external }: {
  href: string; icon: ComponentType<{ size?: number }>; label: string; external?: boolean;
}) {
  const cls = "flex flex-col items-center gap-0.5 text-gray-400 text-[10px]";
  const content = <><Icon size={20} />{label}</>;
  if (external) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>{content}</a>;
  return <Link href={href} className={cls}>{content}</Link>;
}
