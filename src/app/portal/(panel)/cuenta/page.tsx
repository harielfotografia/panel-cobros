import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { User, Mail, Globe, Key } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CuentaPage() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.id },
    include: { plan: true },
  });
  if (!cliente) redirect("/portal/login");

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-xl font-bold text-gray-900">Mi cuenta</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
            {cliente.nombre.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-lg font-bold text-gray-900">{cliente.nombre}</p>
            <p className="text-sm text-gray-400">{cliente.plan ? `Plan ${cliente.plan.nombre}` : "Sin plan"}</p>
          </div>
        </div>

        <div className="border-t border-gray-100 pt-4 space-y-3">
          <InfoRow icon={Mail} label="Email" value={cliente.email} />
          <InfoRow icon={Globe} label="Dominio" value={cliente.dominio} />
          {cliente.telefono && <InfoRow icon={User} label="Teléfono" value={cliente.telefono} />}
          <InfoRow icon={Key} label="Service Key" value={`${cliente.serviceKey.slice(0, 12)}...`} mono />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6">
        <p className="text-sm text-gray-500">
          Para modificar los datos de tu cuenta, contacta a soporte.
        </p>
      </div>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value, mono }: { icon: typeof User; label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2 text-gray-400">
        <Icon size={16} />
        <span className="text-xs">{label}</span>
      </div>
      <span className={`text-sm font-medium text-gray-900 ${mono ? "font-mono text-xs" : ""}`}>{value}</span>
    </div>
  );
}
