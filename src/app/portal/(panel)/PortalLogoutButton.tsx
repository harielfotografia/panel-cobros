"use client";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function PortalLogoutButton() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/login");
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 text-left px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
    >
      <LogOut size={18} />
      Cerrar sesión
    </button>
  );
}
