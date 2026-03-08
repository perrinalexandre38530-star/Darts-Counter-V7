import { safeParse } from "./safeParse";

export function safeGet(key: string) {
  try {
    return safeParse(localStorage.getItem(key));
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: any) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (e) {
    console.warn("Storage error", e);
  }
}