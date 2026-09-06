export type DistributionStore = "play" | "galaxy" | "web";

function env(name: string): string {
  try { return String((import.meta as any)?.env?.[name] || "").trim().toLowerCase(); }
  catch { return ""; }
}

export function getDistributionStore(): DistributionStore {
  const raw = env("VITE_DISTRIBUTION_STORE");
  if (raw === "galaxy" || raw === "samsung" || raw === "galaxy_store") return "galaxy";
  if (raw === "play" || raw === "google_play" || raw === "google") return "play";
  return "play";
}

export function isGalaxyStoreBuild(): boolean {
  return getDistributionStore() === "galaxy";
}
