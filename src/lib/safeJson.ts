
// ============================================
// safeJson.ts
// JSON helpers pour éviter les crashs
// ============================================

export function safeJsonParse<T = any>(value: any, fallback: T): T {
  try {
    if (value === null || value === undefined) return fallback
    if (typeof value !== "string") return value
    return JSON.parse(value)
  } catch (e) {
    console.warn("safeJsonParse failed:", e)
    return fallback
  }
}

export function safeJsonStringify(value: any, fallback = "{}"): string {
  try {
    return JSON.stringify(value)
  } catch (e) {
    console.warn("safeJsonStringify failed:", e)
    return fallback
  }
}
