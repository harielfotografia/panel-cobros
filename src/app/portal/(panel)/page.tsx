import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { anunciosParaCliente } from "@/lib/anuncios";
import {
  CheckCircle2,
  XCircle,
  ExternalLink,
  CreditCard,
  FileText,
  Headphones,
  Calendar,
  ArrowRight,
  Globe,
  Shield,
  Database,
  HardDrive,
  Megaphone,
} from "lucide-react";

export const dynamic = "force-dynamic";

const SOPORTE_WHATSAPP = process.env.NEXT_PUBLIC_SOPORTE_WHATSAPP || "";
const SOPORTE_EMAIL = process.env.NEXT_PUBLIC_SOPORTE_EMAIL || "soporte@tudominio.cl";

export default async function PortalDashboard() {
  const session = await getSession();
  if (!session) redirect("/portal/login");

  const cliente = await prisma.cliente.findUnique({
    where: { id: session.id },
    include: {
      plan: true,
      suscripciones: {
        where: { activa: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          pagos: {
            where: { estado: "CONFIRMADO" },
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      },
    },
  });
  if (!cliente) redirect("/portal/login");

  const sub = cliente.suscripciones[0];
  const suspendido = cliente.estado === "SUSPENDIDO";
  const vence = sub ? new Date(sub.fechaVencimiento) : null;
  const dominioUrl = cliente.dominio.startsWith("http") ? cliente.dominio : `https://${cliente.dominio}`;
  const anuncios = await anunciosParaCliente(cliente.id);
  const ultimoPago = sub?.pagos[0];

  const totalAnio = await prisma.pago.aggregate({
    where: {
      estado: "CONFIRMADO",
      suscripcion: { clienteId: session.id },
      createdAt: { gte: new Date(new Date().getFullYear(), 0, 1) },
    },
    _sum: { monto: true },
  });

  const soporteUrl = SOPORTE_WHATSAPP
    ? `https://wa.me/${SOPORTE_WHATSAPP}`
    : `mailto:${SOPORTE_EMAIL}`;

  const TIPO_ICON: Record<string, { bg: string; text: string }> = {
    INFO: { bg: "bg-blue-100", text: "text-blue-600" },
    EXITO: { bg: "bg-green-100", text: "text-green-600" },
    ADVERTENCIA: { bg: "bg-orange-100", text: "text-orange-600" },
    MANTENIMIENTO: { bg: "bg-indigo-100", text: "text-indigo-600" },
  };
  const TIPO_BADGE: Record<string, string> = {
    INFO: "bg-blue-100 text-blue-700",
    EXITO: "bg-green-100 text-green-700",
    ADVERTENCIA: "bg-orange-100 text-orange-700",
    MANTENIMIENTO: "bg-indigo-100 text-indigo-700",
  };
  const TIPO_LABEL: Record<string, string> = {
    INFO: "Información",
    EXITO: "Novedad",
    ADVERTENCIA: "Atención",
    MANTENIMIENTO: "Mantenimiento",
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Greeting */}
      <div>
        <h1 className="text-xl md:text-2xl font-bold text-gray-900">
          Hola, {cliente.nombre} 👋
        </h1>
        <p className="text-sm text-gray-400">{cliente.dominio}</p>
      </div>

      {/* Top cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Estado del servicio */}
        <div
          className={`rounded-2xl p-6 border-2 ${
            suspendido
              ? "bg-red-50 border-red-200"
              : "bg-green-50 border-green-200"
          }`}
        >
          <p className="text-xs font-medium text-gray-500 mb-2">Estado de tu servicio</p>
          <div className="flex items-center gap-3 mb-3">
            {suspendido ? (
              <XCircle size={48} className="text-red-500" />
            ) : (
              <CheckCircle2 size={48} className="text-green-500" />
            )}
            <div>
              <p className={`text-2xl font-bold ${suspendido ? "text-red-600" : "text-green-600"}`}>
                {suspendido ? "Pausado" : "Activo"}
              </p>
              <p className="text-sm text-gray-500">
                {suspendido
                  ? "Tu servicio está pausado por un pago pendiente."
                  : "Tu sistema está funcionando correctamente."}
              </p>
            </div>
          </div>
          {suspendido ? (
            <Link
              href="/portal/pagar"
              className="flex items-center justify-center gap-2 w-full bg-red-600 hover:bg-red-500 text-white text-sm font-medium rounded-xl py-3 transition-colors"
            >
              Reactivar ahora
              <ArrowRight size={16} />
            </Link>
          ) : (
            <a
              href={dominioUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-xl py-3 transition-colors"
            >
              <ExternalLink size={16} />
              Abrir mi sistema
              <ArrowRight size={16} />
            </a>
          )}
        </div>

        {/* Tu plan */}
        <div className="bg-white rounded-2xl p-6 border border-gray-200 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-medium text-gray-400">Tu plan</p>
              <p className="text-lg font-bold text-gray-900">
                {cliente.plan ? `Plan ${cliente.plan.nombre}` : "Sin plan"}
              </p>
              {sub && (
                <p className="text-sm text-blue-600 font-semibold">
                  ${sub.monto.toLocaleString("es-CL")} + IVA / mes
                </p>
              )}
            </div>
            <div className="w-16 h-16 bg-blue-50 rounded-xl flex items-center justify-center">
              <CreditCard size={28} className="text-blue-600" />
            </div>
          </div>

          {sub && (
            <>
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-100">
                <div>
                  <p className="text-xs text-gray-400">Próximo cobro</p>
                  <div className="flex items-center gap-1.5 mt-1">
                    <Calendar size={14} className="text-gray-400" />
                    <p className="text-sm font-medium text-gray-900">
                      {vence?.toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" }) ?? "—"}
                    </p>
                  </div>
                </div>
                <div>
                  <p className="text-xs text-gray-400">Método de pago</p>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {sub.tipoCobro === "AUTOMATICO"
                      ? `Automático${sub.tarjetaUlt4 ? ` •••• ${sub.tarjetaUlt4}` : ""}`
                      : "Pago manual"}
                  </p>
                </div>
              </div>
              <Link
                href="/portal/pagar"
                className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl py-2.5 transition-colors"
              >
                <CreditCard size={14} />
                Ver suscripción
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <QuickAction
          href="/portal/pagar"
          icon={CreditCard}
          iconBg="bg-blue-100"
          iconColor="text-blue-600"
          borderColor="border-blue-200"
          title="Pagar servicio"
          desc="Paga tu servicio o activa cobro automático."
        />
        <QuickAction
          href="/portal/facturas"
          icon={FileText}
          iconBg="bg-green-100"
          iconColor="text-green-600"
          borderColor="border-green-200"
          title="Facturas"
          desc="Consulta y descarga tus comprobantes."
        />
        <QuickAction
          href={soporteUrl}
          icon={Headphones}
          iconBg="bg-indigo-100"
          iconColor="text-indigo-600"
          borderColor="border-indigo-200"
          title="Soporte"
          desc="¿Tienes dudas? Estamos para ayudarte."
          external
        />
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Anuncios */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Megaphone size={18} className="text-gray-400" />
              <h2 className="text-base font-semibold text-gray-900">Novedades y anuncios</h2>
            </div>
            {anuncios.length > 3 && (
              <Link href="/portal/notificaciones" className="text-xs text-blue-600 hover:text-blue-500">
                Ver todas
              </Link>
            )}
          </div>
          {anuncios.length > 0 ? (
            <div className="divide-y divide-gray-100">
              {anuncios.slice(0, 3).map((a) => {
                const style = TIPO_ICON[a.tipo] ?? TIPO_ICON.INFO;
                const badgeStyle = TIPO_BADGE[a.tipo] ?? TIPO_BADGE.INFO;
                const lbl = TIPO_LABEL[a.tipo] ?? "Info";
                return (
                  <div key={a.id} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${style.bg}`}>
                      <Megaphone size={16} className={style.text} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${badgeStyle}`}>
                          {lbl}
                        </span>
                      </div>
                      <p className="text-sm font-medium text-gray-900">{a.titulo}</p>
                      <p className="text-xs text-gray-500 line-clamp-1">{a.mensaje}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[11px] text-gray-400">
                        {a.createdAt.toLocaleDateString("es-CL")}
                      </span>
                      <ArrowRight size={14} className="text-gray-300" />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-6">No hay anuncios</p>
          )}
        </div>

        {/* Resumen de cuenta */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900 mb-4">Resumen de tu cuenta</h2>
          <div className="space-y-3">
            <SummaryRow
              label="Estado del servicio"
              value={suspendido ? "Pausado" : "Activo"}
              valueClass={suspendido ? "text-red-600 bg-red-100" : "text-green-600 bg-green-100"}
              badge
            />
            <SummaryRow
              label="Vencimiento próximo cobro"
              value={vence?.toLocaleDateString("es-CL", { day: "numeric", month: "short", year: "numeric" }) ?? "—"}
            />
            <SummaryRow
              label="Último pago"
              value={
                ultimoPago
                  ? (ultimoPago.fechaPago ?? ultimoPago.createdAt).toLocaleDateString("es-CL", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "—"
              }
            />
            <SummaryRow
              label="Total pagado este año"
              value={`$${(totalAnio._sum.monto ?? 0).toLocaleString("es-CL")}`}
              bold
            />
          </div>
          <Link
            href="/portal/facturas"
            className="flex items-center justify-center gap-2 w-full border border-gray-200 hover:bg-gray-50 text-sm font-medium text-gray-700 rounded-xl py-2.5 mt-4 transition-colors"
          >
            Ver historial de pagos
          </Link>
        </div>
      </div>

      {/* Status footer */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard icon={Globe} label="Tu web" value={cliente.dominio} sub="Activa y funcionando" color="blue" />
        <StatusCard icon={Shield} label="SSL / Seguridad" value="Certificado válido" sub="Protección activa" color="green" />
        <StatusCard icon={Database} label="Respaldos" value="Automáticos diarios" sub="Datos protegidos" color="indigo" />
        <StatusCard icon={HardDrive} label="Almacenamiento" value="Disponible" sub="Dentro del límite" color="blue" />
      </div>
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  iconBg,
  iconColor,
  borderColor,
  title,
  desc,
  external,
}: {
  href: string;
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  borderColor: string;
  title: string;
  desc: string;
  external?: boolean;
}) {
  const cls = `bg-white rounded-2xl p-5 border-2 ${borderColor} hover:shadow-md transition-shadow flex flex-col gap-3`;
  const content = (
    <>
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${iconBg}`}>
        <Icon size={20} className={iconColor} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      <ArrowRight size={16} className="text-gray-300 self-end" />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {content}
    </Link>
  );
}

function SummaryRow({
  label,
  value,
  valueClass,
  badge,
  bold,
}: {
  label: string;
  value: string;
  valueClass?: string;
  badge?: boolean;
  bold?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-xs text-gray-400">{label}</span>
      {badge ? (
        <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${valueClass}`}>
          {value}
        </span>
      ) : (
        <span className={`text-sm ${bold ? "font-bold text-gray-900" : "font-medium text-gray-700"}`}>
          {value}
        </span>
      )}
    </div>
  );
}

function StatusCard({
  icon: Icon,
  label,
  value,
  sub,
  color,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  sub: string;
  color: string;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 text-blue-600",
    green: "bg-green-50 text-green-600",
    indigo: "bg-indigo-50 text-indigo-600",
  };
  const c = colors[color] ?? colors.blue;
  return (
    <div className="bg-white rounded-xl p-4 border border-gray-200">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c} mb-2`}>
        <Icon size={16} />
      </div>
      <p className="text-xs font-semibold text-gray-900">{label}</p>
      <p className="text-xs text-gray-700">{value}</p>
      <p className="text-[11px] text-green-500 mt-1">✓ {sub}</p>
    </div>
  );
}
