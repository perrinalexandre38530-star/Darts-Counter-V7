import { safeParse } from "./safeParse";
import { safeLocalStorageGetJson, safeLocalStorageSetJson } from "./imageStorageCodec";

export function safeGet(key: string) {
  try {
    const value = safeLocalStorageGetJson<any>(key, null);
    return value == null ? safeParse(localStorage.getItem(key)) : value;
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: any) {
  try {
    if (!safeLocalStorageSetJson(key, value, { sanitizeImages: true })) {
      localStorage.setItem(key, JSON.stringify(value));
    }
  } catch (e) {
    console.warn("Storage error", e);
  }
}
