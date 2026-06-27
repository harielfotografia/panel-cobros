import Link from "next/link";
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Megaphone,
  LogOut,
  Layers,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "admin") redirect("/portal");

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 flex-shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col">
        <div className="px-5 py-5 border-b border-gray-800">
          <h1 className="text-base font-bold text-white">Panel de Cobros</h1>
          <p className="text-xs text-gray-500 mt-0.5 truncate">{session.email}</p>
        </div>
        <nav className="flex-1 p-3 space-y-1">
          <NavLink href="/" label="Resumen" icon={LayoutDashboard} />
          <NavLink href="/clientes" label="Clientes" icon={Users} />
          <NavLink href="/planes" label="Planes" icon={Layers} />
          <NavLink href="/pagos" label="Pagos" icon={CreditCard} />
          <NavLink href="/anuncios" label="Anuncios" icon={Megaphone} />
        </nav>
        <div className="p-3 border-t border-gray-800">
          <LogoutButton />
        </div>
      </aside>
      {/* Content */}
      <main className="flex-1 overflow-auto p-6 bg-white text-gray-900">{children}</main>
    </div>
  );
}

function NavLink({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
    >
      <Icon size={18} />
      {label}
    </Link>
  );
}

function LogoutButton() {
  return (
    <form action="/api/auth/logout" method="POST">
      <button
        type="submit"
        className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm text-gray-500 hover:text-red-400 transition-colors"
      >
        <LogOut size={18} />
        Cerrar sesión
      </button>
    </form>
  );
}
