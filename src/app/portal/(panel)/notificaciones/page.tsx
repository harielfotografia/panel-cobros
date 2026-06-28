import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { anunciosParaCliente } from "@/lib/anuncios";
import { Megaphone } from "lucide-react";

export const dynamic = "force-dynamic";

const TIPO_BADGE: Record<string, string> = {
  INFO: "bg-blue-100 text-blue-700",
  EXITO: "bg-green-100 text-green-700",
  ADVERTENCIA: "bg-orange-100 text-orange-700",
  MANTENIMIENTO: "bg-blue-100 text-blue-700",
};
const TIPO_LABEL: Record<string, string> = {
  INFO: "Información",
  EXITO: "Novedad",
  ADVERTENCIA: "Atención",
  MANTENIMIENTO: "Mantenimiento",
};

export default async function NotificacionesPage() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const anuncios = await anunciosParaCliente(session.id);

  return (
    <div className="space-y-4 max-w-3xl">
      <h1 className="text-xl font-bold text-gray-900">Notificaciones</h1>

      {anuncios.length > 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
          {anuncios.map((a) => {
            const badgeStyle = TIPO_BADGE[a.tipo] ?? TIPO_BADGE.INFO;
            const lbl = TIPO_LABEL[a.tipo] ?? "Info";
            return (
              <div key={a.id} className="flex items-start gap-3 p-4">
                <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                  <Megaphone size={16} className="text-gray-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                      {lbl}
                    </span>
                    <span className="text-[11px] text-gray-400">
                      {a.createdAt.toLocaleDateString("es-CL")}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{a.mensaje}</p>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
          <p className="text-sm text-gray-400">No hay notificaciones</p>
        </div>
      )}
    </div>
  );
}
