
// src/lib/safeExec.ts
// Helpers pour éviter que des exceptions cassent l'app

export function safeExec<T>(fn: () => T, fallback: T): T {
  try {
    return fn()
  } catch (e) {
    console.warn("[safeExec]", e)
    return fallback
  }
}

export async function safeExecAsync<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn()
  } catch (e) {
    console.warn("[safeExecAsync]", e)
    return fallback
  }
}
