import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const check = (key: string) => Boolean(process.env[key] && process.env[key]!.length > 4);

  return NextResponse.json([
    {
      key: "MP_ACCESS_TOKEN",
      label: "MercadoPago",
      ok: check("MP_ACCESS_TOKEN"),
      nota: check("MP_ACCESS_TOKEN") ? "Configurado" : "No configurado — pagos MP simulados",
    },
    {
      key: "TRANSBANK_ENV",
      label: "Transbank Webpay Plus",
      ok: true,
      nota: process.env.TRANSBANK_ENV === "production" ? "Producción" : "Modo integración (pruebas)",
    },
    {
      key: "SMTP_HOST",
      label: "Email (SMTP)",
      ok: check("SMTP_HOST"),
      nota: check("SMTP_HOST") ? process.env.SMTP_HOST : "No configurado — emails a consola",
    },
    {
      key: "COOLIFY_API_TOKEN",
      label: "Coolify API",
      ok: check("COOLIFY_API_TOKEN"),
      nota: check("COOLIFY_API_TOKEN") ? process.env.COOLIFY_URL : "No configurado",
    },
    {
      key: "CRON_SECRET",
      label: "Cron de suspensión",
      ok: check("CRON_SECRET"),
      nota: check("CRON_SECRET") ? "Secreto configurado" : "Sin secreto — ruta desprotegida",
    },
  ]);
}
