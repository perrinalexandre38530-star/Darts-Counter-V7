export function safeParse<T>(v: string | null): T | null {
  try {
    if (!v) return null;
    return JSON.parse(v);
  } catch (e) {
    console.warn("JSON parse error", e);
    return null;
  }
}