const TIMEOUT_MS = 10_000;

interface PlanPayload {
  nombre: string;
  maxProfesionales: number;
}

interface UsoResponse {
  profesionales: number;
  pacientes: number;
  citas_mes: number;
}

async function callClinic(
  method: string,
  apiUrl: string,
  serviceKey: string,
  path: string,
  body?: unknown,
): Promise<Response> {
  const url = `${apiUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "X-Dora-Service-Key": serviceKey,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (!res.ok) {
    throw new Error(`Clinic API ${method} ${path} responded ${res.status}`);
  }
  return res;
}

export const clinicApi = {
  async pushPlan(apiUrl: string, serviceKey: string, plan: PlanPayload) {
    await callClinic("PUT", apiUrl, serviceKey, "servicio/plan", plan);
  },

  async setEstado(apiUrl: string, serviceKey: string, estado: "activa" | "suspendida") {
    await callClinic("PUT", apiUrl, serviceKey, "servicio/estado", { estado });
  },

  async getUso(apiUrl: string, serviceKey: string): Promise<UsoResponse> {
    const res = await callClinic("GET", apiUrl, serviceKey, "servicio/uso");
    return res.json();
  },
};
