import type { FitMocapBinding } from "./awenaMocapRegistry";

export const FIT_MOCAP_CACHE_NAME = "fitperf-mocap-v2";

export type LoadedFitMocapAsset = {
  text: string;
  assetUrl: string;
  origin: "local" | "cache" | "remote";
};

function isBvhText(text: string): boolean {
  const head = text.slice(0, 160).trimStart();
  return head.startsWith("HIERARCHY") && text.includes("\nMOTION") && /Frames:\s*\d+/i.test(text);
}

async function readCached(url: string): Promise<LoadedFitMocapAsset | null> {
  if (typeof window === "undefined" || !("caches" in window)) return null;
  try {
    const cache = await window.caches.open(FIT_MOCAP_CACHE_NAME);
    const response = await cache.match(url);
    if (!response?.ok) return null;
    const text = await response.text();
    if (!isBvhText(text)) return null;
    return { text, assetUrl: url, origin: "cache" };
  } catch {
    return null;
  }
}

async function cacheResponse(url: string, response: Response) {
  if (typeof window === "undefined" || !("caches" in window)) return;
  try {
    const cache = await window.caches.open(FIT_MOCAP_CACHE_NAME);
    await cache.put(url, response.clone());
  } catch {
    // CacheStorage is an optimization only. The live motion keeps working without it.
  }
}

async function fetchBvh(url: string, origin: "local" | "remote"): Promise<LoadedFitMocapAsset | null> {
  const cached = await readCached(url);
  if (cached) return cached;
  try {
    const response = await fetch(url, {
      mode: origin === "remote" ? "cors" : "same-origin",
      cache: "force-cache",
      credentials: origin === "remote" ? "omit" : "same-origin",
    });
    if (!response.ok) return null;
    const clone = response.clone();
    const text = await response.text();
    if (!isBvhText(text)) return null;
    void cacheResponse(url, clone);
    return { text, assetUrl: url, origin };
  } catch {
    return null;
  }
}

/**
 * Resolves a real FIT PERF mocap asset without ever making the exercise page depend on it.
 * Local/vendor assets win. A verified remote mirror is used only as a fallback and is cached.
 */
export async function loadFitMocapText(binding: FitMocapBinding): Promise<LoadedFitMocapAsset> {
  if (binding.format !== "bvh") throw new Error(`Unsupported FIT PERF mocap format: ${binding.format || "unknown"}`);

  if (binding.localAsset) {
    const local = await fetchBvh(binding.localAsset, "local");
    if (local) return local;
  }

  if (binding.remoteAsset) {
    const remote = await fetchBvh(binding.remoteAsset, "remote");
    if (remote) return remote;
  }

  throw new Error(`No readable BVH asset for ${binding.motionKey}`);
}
