"use client";
import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, Server, CreditCard,
  FileText, Megaphone, BarChart2, UserCog,
  Settings, Bell, ChevronDown, LogOut, Menu, X,
} from "lucide-react";

const NAV = [
  { group: "Principal", items: [
    { href: "/", label: "Resumen", icon: LayoutDashboard },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/planes", label: "Sistemas y Planes", icon: Server },
  ]},
  { group: "Finanzas", items: [
    { href: "/pagos", label: "Pagos y Cobros", icon: CreditCard },
    { href: "/reportes", label: "Reportes", icon: BarChart2 },
    { href: "/facturas-admin", label: "Facturación", icon: FileText },
  ]},
  { group: "Comunicación", items: [
    { href: "/anuncios", label: "Anuncios", icon: Megaphone },
  ]},
  { group: "Sistema", items: [
    { href: "/usuarios", label: "Usuarios", icon: UserCog },
    { href: "/configuracion", label: "Configuración", icon: Settings },
  ]},
];

export function DashboardShell({ email, nombre, children }: { email: string; nombre?: string; children: React.ReactNode }) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const displayName = nombre || email.split("@")[0];
  const initials = displayName.slice(0, 2).toUpperCase();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function isActive(href: string) {
    return href === "/" ? pathname === "/" : pathname.startsWith(href);
  }

  function NavContent({ onClose }: { onClose?: () => void }) {
    return (
      <>
        <div className="px-5 pt-6 pb-5 border-b border-gray-800">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Server size={14} className="text-white" />
            </div>
            <span className="text-sm font-bold text-white">Panel de Gestión</span>
          </div>
          <p className="text-xs text-gray-500 pl-9">{displayName}</p>
        </div>

        <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
          {NAV.map((g) => (
            <div key={g.group}>
              <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-3 pt-3 pb-1">
                {g.group}
              </p>
              {g.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                    isActive(href)
                      ? "bg-blue-600 text-white"
                      : "text-gray-400 hover:bg-gray-900 hover:text-white"
                  }`}
                >
                  <Icon size={16} className="flex-shrink-0" />
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>

        <div className="p-3 border-t border-gray-800">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white truncate">{displayName}</p>
              <p className="text-[10px] text-gray-500 truncate">{email}</p>
            </div>
            <button onClick={handleLogout} title="Cerrar sesión" className="p-1">
              <LogOut size={14} className="text-gray-500 hover:text-red-400 transition-colors" />
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* ── Sidebar desktop ── */}
      <aside className="hidden lg:flex w-56 flex-shrink-0 bg-black flex-col">
        <NavContent />
      </aside>

      {/* ── Drawer móvil ── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/60" onClick={() => setDrawerOpen(false)} />
          {/* Drawer */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-black flex flex-col shadow-2xl">
            <button
              onClick={() => setDrawerOpen(false)}
              className="absolute top-4 right-4 text-gray-500 hover:text-white"
            >
              <X size={18} />
            </button>
            <NavContent onClose={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      {/* ── Main area ── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center gap-3 px-4 flex-shrink-0">
          {/* Hamburger — solo móvil */}
          <button
            onClick={() => setDrawerOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={20} />
          </button>

          {/* Search */}
          <div className="flex-1 max-w-sm hidden sm:block">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" placeholder="Buscar cliente, dominio..."
                className="w-full pl-9 pr-4 py-1.5 text-sm bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <Link href="/anuncios" className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg">
              <Bell size={18} />
            </Link>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 pl-2 border-l border-gray-200 hover:bg-gray-50 rounded-lg px-2 py-1 transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-xs font-bold text-white">
                  {initials}
                </div>
                <span className="text-sm font-medium text-gray-700 hidden sm:block">{displayName}</span>
                <ChevronDown size={14} className="text-gray-400 hidden sm:block" />
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 top-12 z-50 bg-white border border-gray-200 rounded-xl shadow-lg py-1 w-44">
                  <div className="px-3 py-2 border-b border-gray-100">
                    <p className="text-xs font-medium text-gray-900">{displayName}</p>
                    <p className="text-xs text-gray-400 truncate">{email}</p>
                  </div>
                  <button
                    onClick={() => { setUserMenuOpen(false); handleLogout(); }}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <LogOut size={14} /> Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
