import { prisma } from "@/lib/prisma";

const TIMEOUT_MS = 10_000;
const MAX_INTENTOS = 3;

interface PlanPayload {
  nombre: string;
  maxProfesionales: number;
  modulos?: string[];
}

interface UsoResponse {
  profesionales: number;
  pacientes: number;
  citasMes: number; // el plugin (class-servicio.php::get_uso()) devuelve camelCase, no snake_case
}

// Retry con backoff exponencial: 0ms → 1s → 4s
async function callClinic(
  method: string,
  apiUrl: string,
  serviceKey: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  if (new URL(apiUrl).protocol !== "https:") {
    throw new Error(`apiUrl debe usar HTTPS: ${apiUrl}`);
  }
  const url = `${apiUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  let ultimoError: Error = new Error("Sin intentos");

  for (let intento = 0; intento < MAX_INTENTOS; intento++) {
    if (intento > 0) await sleep(1000 * Math.pow(2, intento - 1));
    try {
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", "X-Dora-Service-Key": serviceKey },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status} en ${method} ${path}`);
      return res;
    } catch (e) {
      ultimoError = e as Error;
    }
  }
  throw ultimoError;
}

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

// Wrapper que marca syncPending si la clínica no responde tras los reintentos.
// Así el cron puede reintentarlo más tarde sin bloquear el flujo principal.
async function callClinicSafe(
  clienteId: string,
  method: string,
  apiUrl: string,
  serviceKey: string,
  path: string,
  body?: unknown,
) {
  try {
    await callClinic(method, apiUrl, serviceKey, path, body);
    // Si estaba marcado, lo limpiamos.
    await prisma.cliente.update({ where: { id: clienteId }, data: { syncPending: false } });
  } catch (e) {
    console.error(`[clinic-api] Fallo tras ${MAX_INTENTOS} intentos (${path}):`, (e as Error).message);
    await prisma.cliente.update({ where: { id: clienteId }, data: { syncPending: true } });
  }
}

export const clinicApi = {
  async pushPlan(clienteId: string, apiUrl: string, serviceKey: string, plan: PlanPayload) {
    await callClinicSafe(clienteId, "PUT", apiUrl, serviceKey, "servicio/plan", plan);
  },

  async setEstado(clienteId: string, apiUrl: string, serviceKey: string, estado: "activa" | "suspendida") {
    await callClinicSafe(clienteId, "PUT", apiUrl, serviceKey, "servicio/estado", { estado });
  },

  async getUso(apiUrl: string, serviceKey: string): Promise<UsoResponse | null> {
    try {
      const res = await callClinic("GET", apiUrl, serviceKey, "servicio/uso");
      return res.json();
    } catch {
      return null;
    }
  },

  // Reintenta todos los clientes con syncPending=true. Llamado por el cron diario.
  async retrySyncPending() {
    const pendientes = await prisma.cliente.findMany({
      where: { syncPending: true, apiUrl: { not: null } },
      include: { plan: true },
    });

    const resultados = { ok: 0, fallos: 0 };
    for (const c of pendientes) {
      if (!c.apiUrl) continue;
      try {
        const estadoClinica = c.estado === "ACTIVO" ? "activa" : "suspendida";
        await callClinic("PUT", c.apiUrl, c.serviceKey, "servicio/estado", { estado: estadoClinica });
        if (c.plan) {
          await callClinic("PUT", c.apiUrl, c.serviceKey, "servicio/plan", {
            nombre: c.plan.nombre,
            maxProfesionales: c.plan.maxProfesionales,
            modulos: c.plan.modulos,
          });
        }
        await prisma.cliente.update({ where: { id: c.id }, data: { syncPending: false } });
        resultados.ok++;
      } catch {
        resultados.fallos++;
      }
    }
    return resultados;
  },
};
