// ============================================
// src/lib/sync/SyncVerifier.ts
// VERIFY — Cohérence profils / events / user_id
// ============================================

import { supabase } from "../supabaseClient";

export type VerifyReport = {
  ok: boolean;
  issues: string[];
};

export async function verifySyncConsistency(): Promise<VerifyReport> {
  const issues: string[] = [];

  // 1. user connecté
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  const uid = auth?.user?.id;
  if (authErr || !uid) {
    return { ok: false, issues: ["Utilisateur non connecté"] };
  }

  // 2. profil existe
  const { data: profile, error: profErr } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", uid)
    .maybeSingle();

  if (profErr || !profile) {
    issues.push("Profil cloud manquant (profiles)");
  }

  // 3. events liés au user
  const { count, error: evtErr } = await supabase
    .from("events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", uid);

  if (evtErr) {
    issues.push("Erreur accès table events");
  } else if ((count ?? 0) === 0) {
    issues.push("Aucun event trouvé pour cet utilisateur");
  }

  // 4. vérification clé canonique
  const { data: badEvents } = await supabase
    .from("events")
    .select("id,user_id")
    .neq("user_id", uid)
    .limit(1);

  if (badEvents && badEvents.length > 0) {
    issues.push("Events détectés avec user_id non canonique");
  }

  return {
    ok: issues.length === 0,
    issues,
  };
}