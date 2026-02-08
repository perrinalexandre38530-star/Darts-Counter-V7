// ============================================
// src/lib/supabaseAuthStorage.ts
// Supabase auth storage adapter backed by IndexedDB.
// Fixes: "Failed to execute 'setItem' on 'Storage'... exceeded the quota"
// when localStorage is full (this app can store large payloads locally).
// ============================================

import { idbGet, idbSet, idbDel } from "./idbKeyval";

// Prefix so we can identify & clear our keys if needed.
const PREFIX = "dc:supabase:auth:";

export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    return idbGet(PREFIX + key);
  },

  async setItem(key: string, value: string): Promise<void> {
    await idbSet(PREFIX + key, value);
  },

  async removeItem(key: string): Promise<void> {
    await idbDel(PREFIX + key);
  },
} as const;
