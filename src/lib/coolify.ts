const COOLIFY_URL = process.env.COOLIFY_URL!;
const COOLIFY_TOKEN = process.env.COOLIFY_API_TOKEN!;

async function coolifyFetch(path: string, method = "GET", body?: object) {
  const res = await fetch(`${COOLIFY_URL}/api/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${COOLIFY_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Coolify API error ${res.status}: ${text}`);
  }

  return res.json();
}

export const coolify = {
  async getApp(appId: string) {
    return coolifyFetch(`/applications/${appId}`);
  },

  async startApp(appId: string) {
    return coolifyFetch(`/applications/${appId}/start`, "POST");
  },

  async stopApp(appId: string) {
    return coolifyFetch(`/applications/${appId}/stop`, "POST");
  },

  async restartApp(appId: string) {
    return coolifyFetch(`/applications/${appId}/restart`, "POST");
  },

  async listApps() {
    return coolifyFetch("/applications");
  },
};
