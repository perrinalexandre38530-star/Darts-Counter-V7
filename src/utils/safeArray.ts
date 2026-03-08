
// src/utils/safeArray.ts
// protège contre map/filter sur undefined

export function safeArray<T>(v: any): T[] {
  if (Array.isArray(v)) return v
  return []
}
