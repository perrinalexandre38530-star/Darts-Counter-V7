const API_URL =
  localStorage.getItem("dc_api_url") ||
  import.meta.env.VITE_API_URL ||
  "http://192.168.1.36:3000";

async function parseJsonSafe(res: Response) {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(`Réponse JSON invalide: ${text}`);
  }
}

export async function apiGet(path: string) {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`GET ${path} failed (${res.status})`);
  }
  return parseJsonSafe(res);
}

export async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`POST ${path} failed (${res.status})`);
  }
  return parseJsonSafe(res);
}

export async function apiPut(path: string, body: unknown) {
  const res = await fetch(`${API_URL}${path}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    throw new Error(`PUT ${path} failed (${res.status})`);
  }
  return parseJsonSafe(res);
}

export function getApiUrl() {
  return API_URL;
}
