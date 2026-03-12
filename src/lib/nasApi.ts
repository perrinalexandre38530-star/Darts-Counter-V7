export type NasProfilePayload = {
  id: string;
  name: string;
  avatar?: string | null;
  avatarUrl?: string | null;
  avatarDataUrl?: string | null;
  favoriteDartSetId?: string | null;
  stats?: any;
  [key: string]: any;
};

export type NasMatchPayload = {
  id: string;
  sport: string;
  players: string[];
  result?: any;
  status?: string;
  createdAt?: string;
  updatedAt?: string;
  payload?: any;
  summary?: any;
  [key: string]: any;
};

function trimSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getNasApiUrl(): string {
  try {
    const fromLs = localStorage.getItem("dc_api_url") || localStorage.getItem("dc_nas_api_url");
    if (fromLs && /^https?:\/\//i.test(fromLs)) return trimSlash(fromLs);
  } catch {}

  const envUrl = (import.meta as any)?.env?.VITE_API_URL;
  if (envUrl && /^https?:\/\//i.test(envUrl)) return trimSlash(String(envUrl));

  return "http://192.168.1.36:3000";
}

export function isNasSyncEnabled(): boolean {
  try {
    const explicit = localStorage.getItem("dc_nas_sync_enabled");
    if (explicit != null) return explicit === "1";
  } catch {}
  return true;
}

async function request(path: string, init?: RequestInit) {
  const base = getNasApiUrl();
  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`NAS API ${res.status} ${res.statusText}${text ? ` — ${text}` : ""}`);
  }
  const ct = res.headers.get("content-type") || "";
  return ct.includes("application/json") ? res.json() : res.text();
}

export const nasApi = {
  get baseUrl() {
    return getNasApiUrl();
  },

  async getProfiles() {
    return request("/profiles", { method: "GET" });
  },

  async saveProfile(profile: NasProfilePayload) {
    try {
      return await request(`/profiles/${encodeURIComponent(profile.id)}`, {
        method: "PUT",
        body: JSON.stringify(profile),
      });
    } catch (err) {
      return request("/profiles", {
        method: "POST",
        body: JSON.stringify(profile),
      });
    }
  },

  async saveMatch(match: NasMatchPayload) {
    return request("/matches", {
      method: "POST",
      body: JSON.stringify(match),
    });
  },

  async getStats(profileId: string, sport: string) {
    return request(`/stats/${encodeURIComponent(profileId)}/${encodeURIComponent(sport)}`, {
      method: "GET",
    });
  },

  async saveStats(profileId: string, sport: string, stats: any) {
    return request(`/stats/${encodeURIComponent(profileId)}/${encodeURIComponent(sport)}`, {
      method: "PUT",
      body: JSON.stringify(stats),
    });
  },
};
