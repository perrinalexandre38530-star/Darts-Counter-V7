// ============================================
// src/lib/sync/SyncVerifier.ts
// VERIFY — current cloud contract consistency.
// ============================================

import { supabase } from "../supabaseClient";
import { isSupabaseEventSyncEnabled } from "./cloudEventSyncPolicy";

export type VerifyReport = {
  ok: boolean;
  issues: string[];
};

export async function verifySyncConsistency(): Promise<VerifyReport> {
  const issues: string[] = [];

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (authErr || !uid) {
    return { ok: false, issues: ["Utilisateur non connecté"] };
  }

  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (profErr || !profile) issues.push("Profil cloud manquant (profiles)");

  // `events` is not part of the current Supabase schema. Only verify it for
  // installations that explicitly opted back into the legacy event pipeline.
  if (isSupabaseEventSyncEnabled()) {
    const { count, error: evtErr } = await supabase
      .from("events")
      .select("event_id", { count: "exact", head: true })
      .eq("user_id", uid);

    if (evtErr) issues.push("Erreur accès table events");
    else if ((count ?? 0) === 0) issues.push("Aucun event trouvé pour cet utilisateur");
  }

  return { ok: issues.length === 0, issues };
}
