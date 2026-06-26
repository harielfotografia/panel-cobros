import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anunciosParaCliente } from "@/lib/anuncios";
import { AnuncioCard } from "@/components/AnuncioCard";

export const dynamic = "force-dynamic";

const SOPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP || "";
const SOPORTE_EMAIL = process.env.NEXT_PUBLIC_SOPORTE_EMAIL || "soporte@tudominio.cl";

export default async function PortalDashboard() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.id },
    include: {
      suscripciones: {
        where: { activa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });
  if (!cliente) redirect("/portal/login");

  const sub = cliente.suscripciones[0];
  const suspendido = cliente.estado === "SUSPENDIDO";
  const vence = sub ? new Date(sub.fechaVencimiento) : null;
  const dominioUrl = cliente.dominio.startsWith("http") ? cliente.dominio : `https://${cliente.dominio}`;
  const anuncios = await anunciosParaCliente(cliente.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Hola, {cliente.nombre}</h1>
        <p className="text-sm text-gray-400">{cliente.dominio}</p>
      </div>

      {/* Anuncios */}
      {anuncios.length > 0 && (
        <div className="space-y-2">
          {anuncios.map((a) => (
            <AnuncioCard key={a.id} titulo={a.titulo} mensaje={a.mensaje} tipo={a.tipo} fecha={a.createdAt} />
          ))}
        </div>
      )}

      {/* Estado del servicio */}
      <div
        className={`rounded-xl p-6 border ${
          suspendido ? "bg-red-950/40 border-red-800/50" : "bg-green-950/30 border-green-800/40"
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-gray-400 mb-1">Estado de tu servicio</p>
            <p className={`text-2xl font-bold ${suspendido ? "text-red-400" : "text-green-400"}`}>
              {suspendido ? "Pausado" : "Activo"}
            </p>
          </div>
          {!suspendido && (
            <a
              href={dominioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-indigo-600 hover:bg-indigo-500 text-sm px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              Abrir mi sistema →
            </a>
          )}
        </div>

        {suspendido && (
          <div className="mt-4 pt-4 border-t border-red-800/40">
            <p className="text-sm text-gray-300 mb-3">
              Tu servicio está pausado por un pago pendiente. Reactívalo en segundos:
            </p>
            <Link
              href="/portal/pagar"
              className="inline-block bg-red-600 hover:bg-red-500 text-sm px-5 py-2.5 rounded-lg font-medium transition-colors"
            >
              Reactivar ahora
            </Link>
          </div>
        )}
      </div>

      {/* Suscripción / próximo cobro */}
      {sub && (
        <div className="bg-gray-900 rounded-xl p-5 border border-gray-800 space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500 text-xs">Plan mensual</p>
              <p className="font-medium text-base">
                ${sub.monto.toLocaleString("es-CL")} {sub.moneda}
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs">
                {sub.tipoCobro === "AUTOMATICO" ? "Próximo cobro automático" : "Próximo vencimiento"}
              </p>
              <p className="font-medium text-base">{vence?.toLocaleDateString("es-CL") ?? "—"}</p>
            </div>
          </div>

          {/* Método de pago */}
          <div className="border-t border-gray-800 pt-4 flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-xs">Método de pago</p>
              {sub.tipoCobro === "AUTOMATICO" ? (
                <p className="text-sm">
                  Cobro automático {sub.tarjetaUlt4 ? `· tarjeta •••• ${sub.tarjetaUlt4}` : ""}
                </p>
              ) : (
                <p className="text-sm">Pago manual cada mes</p>
              )}
            </div>
            <Link
              href="/portal/pagar"
              className="text-indigo-400 hover:text-indigo-300 text-sm transition-colors"
            >
              {sub.tipoCobro === "AUTOMATICO" ? "Cambiar tarjeta" : "Pagar / activar automático"} →
            </Link>
          </div>
        </div>
      )}

      {/* Accesos */}
      <div className="grid grid-cols-2 gap-4">
        <Link
          href="/portal/facturas"
          className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <p className="font-medium text-sm">Facturas</p>
          <p className="text-xs text-gray-500 mt-1">Ver y descargar tus comprobantes</p>
        </Link>
        <a
          href={SOPORTE_WHATSAPP ? `https://wa.me/${SOPORTE_WHATSAPP}` : `mailto:${SOPORTE_EMAIL}`}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-gray-900 rounded-xl p-5 border border-gray-800 hover:border-gray-700 transition-colors"
        >
          <p className="font-medium text-sm">Soporte</p>
          <p className="text-xs text-gray-500 mt-1">
            {SOPORTE_WHATSAPP ? "Escríbenos por WhatsApp" : "Contáctanos por correo"}
          </p>
        </a>
      </div>
    </div>
  );
}
