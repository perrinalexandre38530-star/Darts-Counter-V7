
// src/utils/safeObject.ts
// protège contre accès à des objets null

export function safeObject<T extends object>(v: any): T {
  if (v && typeof v === "object") return v
  return {} as T
}
