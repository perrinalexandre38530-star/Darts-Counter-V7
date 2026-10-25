import { supabase } from "./supabaseClient";
import { loadStore } from "./storage";
import { loadBots } from "./bots";
import { isOfficialBotId } from "./officialBots";
import { loadTeams } from "./petanqueTeamsStore";
import { getAllDartSets } from "./dartSetsStore";
import { readAvatarGallery } from "./avatarGallery";
import { History } from "./history";
import { loadStatsIndex } from "./stats/rebuildStatsFromHistory";
import { listLocalMemorySlots } from "./storageVault";
import { loadStoragePrefs } from "./storagePlans";
import { getAccountOwnedLocalProfiles } from "./accountOwnedSync";
import { accountOwnedTeams, organizationManagedTeams } from "../data/organizationDataBoundary";
import {
  deleteAccountR2Media,
  downloadAccountR2Media,
  getAccountR2MediaDiagnosticSnapshot,
  getDirectR2AuthHealth,
  normalizeAccountR2MediaKey,
  uploadAccountR2Media,
} from "./directR2BackupApi";
import {
  botAvatarMediaKey,
  dartSetMainMediaKey,
  dartSetThumbMediaKey,
  galleryItemMediaKey,
  getUserMediaVaultDiagnostics,
  mirrorAllLocalUserMediaToAccountR2,
  profileAvatarMediaKey,
  teamCoverMediaKey,
  teamLogoMediaKey,
} from "./userMediaFallback";

export type AccountSyncDiagnosticStatus = "ok" | "warn" | "fail" | "skip";

export type AccountSyncDiagnosticCheck = {
  id: string;
  label: string;
  status: AccountSyncDiagnosticStatus;
  detail: string;
  data?: any;
};

export type AccountSyncDiagnosticReport = {
  version: "v121";
  generatedAt: string;
  activeProbe: boolean;
  userId: string | null;
  summary: { ok: number; warn: number; fail: number; skip: number; total: number };
  checks: AccountSyncDiagnosticCheck[];
  local?: any;
  remote?: any;
};

const LAST_REPORT_KEY = "dc_account_sync_diagnostic_v121";
const LEGACY_REPORT_KEY = "dc_account_sync_diagnostic_v119";
const TABLE = "account_sync_documents";
const SINGLETON_TYPES = [
  "local_profiles",
  "bots",
  "teams",
  "avatar_gallery",
  "dart_sets",
  "stats_index",
  "stats_sources",
  "organization_workspace",
];

function bytesLabel(bytesInput: any): string {
  const bytes = Math.max(0, Number(bytesInput || 0) || 0);
  if (bytes < 1024) return `${Math.round(bytes)} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`;
}

function add(checks: AccountSyncDiagnosticCheck[], check: AccountSyncDiagnosticCheck) {
  checks.push(check);
}

function isCanonicalAccountProfile(profile: any, userId: string): boolean {
  const uid = String(userId || "").trim();
  if (!uid || !profile) return false;
  const pi = profile?.privateInfo || {};
  const ids = [
    profile?.id, profile?.onlineUserId, profile?.online_user_id, profile?.accountUserId, profile?.account_user_id,
    profile?.supabaseUserId, profile?.userId, profile?.user_id,
    pi?.onlineUserId, pi?.online_user_id, pi?.accountUserId, pi?.account_user_id, pi?.supabaseUserId, pi?.userId, pi?.user_id,
  ].map((value) => String(value || "").trim()).filter(Boolean);
  return ids.includes(uid);
}

function isFinishedMatch(row: any): boolean {
  const status = String(row?.status || "").toLowerCase();
  if (["finished", "done", "ended", "match_end"].includes(status)) return true;
  if (row?.winnerId || row?.summary?.winnerId || row?.summary?.finished === true) return true;
  return status !== "in_progress";
}

function jsonBytes(value: any): number {
  try { return new TextEncoder().encode(JSON.stringify(value ?? null)).byteLength; }
  catch { return 0; }
}

function hasInlineImage(value: any, depth = 0, seen?: WeakSet<object>): boolean {
  if (depth > 24 || value == null) return false;
  if (typeof value === "string") return /^data:image\//i.test(value.trim());
  if (typeof value !== "object") return false;
  const refs = seen || new WeakSet<object>();
  if (refs.has(value)) return false;
  refs.add(value);
  if (Array.isArray(value)) return value.some((entry) => hasInlineImage(entry, depth + 1, refs));
  return Object.values(value).some((entry) => hasInlineImage(entry, depth + 1, refs));
}

function payloadArrayLength(payload: any): number | null {
  return Array.isArray(payload) ? payload.length : null;
}

function tinyPngDataUrl(): string {
  // PNG 1x1 transparent : quelques dizaines d'octets seulement.
  return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";
}

async function testRealtimeAndSupabaseWrite(userId: string): Promise<{ subscribed: boolean; eventReceived: boolean; writeOk: boolean; deleteOk: boolean; error?: string }> {
  const documentId = `probe_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const channel = supabase.channel(`mss-diag-${documentId}`);
  let subscribed = false;
  let eventReceived = false;
  let writeOk = false;
  let deleteOk = false;
  let resolveEvent: (() => void) | null = null;
  const eventPromise = new Promise<void>((resolve) => { resolveEvent = resolve; });

  try {
    channel.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: TABLE,
        filter: `owner_user_id=eq.${userId}`,
      },
      (payload: any) => {
        const next = payload?.new || payload?.old || {};
        if (String(next?.document_id || "") === documentId) {
          eventReceived = true;
          resolveEvent?.();
        }
      },
    );

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const timer = window.setTimeout(() => {
        if (!settled) {
          settled = true;
          reject(new Error("Realtime: délai de connexion dépassé"));
        }
      }, 6000);
      channel.subscribe((status: string) => {
        if (status === "SUBSCRIBED" && !settled) {
          settled = true;
          subscribed = true;
          window.clearTimeout(timer);
          resolve();
        } else if (["CHANNEL_ERROR", "TIMED_OUT", "CLOSED"].includes(status) && !settled) {
          settled = true;
          window.clearTimeout(timer);
          reject(new Error(`Realtime: ${status}`));
        }
      });
    });

    const now = Date.now();
    const { error: upsertError } = await supabase.from(TABLE).upsert({
      owner_user_id: userId,
      document_type: "diagnostic_probe",
      document_id: documentId,
      payload: { probe: true, at: now },
      client_updated_at: now,
      deleted_at: null,
    }, { onConflict: "owner_user_id,document_type,document_id" });
    if (upsertError) throw upsertError;
    writeOk = true;

    await Promise.race([
      eventPromise,
      new Promise<void>((resolve) => window.setTimeout(resolve, 4500)),
    ]);

    const { error: deleteError } = await supabase
      .from(TABLE)
      .delete()
      .eq("owner_user_id", userId)
      .eq("document_type", "diagnostic_probe")
      .eq("document_id", documentId);
    if (!deleteError) deleteOk = true;
    else throw deleteError;

    return { subscribed, eventReceived, writeOk, deleteOk };
  } catch (error: any) {
    try {
      await supabase
        .from(TABLE)
        .delete()
        .eq("owner_user_id", userId)
        .eq("document_type", "diagnostic_probe")
        .eq("document_id", documentId);
    } catch {}
    return { subscribed, eventReceived, writeOk, deleteOk, error: String(error?.message || error || "Erreur inconnue") };
  } finally {
    try { await supabase.removeChannel(channel); } catch {}
  }
}

async function testR2BinaryRoundTrip(userId: string): Promise<{ uploaded: boolean; downloaded: boolean; deleted: boolean; bytes: number; error?: string }> {
  const key = `diagnostic_probe_${String(userId).slice(0, 8)}_${Date.now()}`;
  let uploaded = false;
  let downloaded = false;
  let deleted = false;
  let bytes = 0;
  try {
    const meta = await uploadAccountR2Media({
      key,
      kind: "diagnostic_probe",
      dataUrl: tinyPngDataUrl(),
      updatedAt: Date.now(),
    });
    uploaded = true;
    bytes = Number(meta?.sizeBytes || 0) || 0;
    const downloadedRow = await downloadAccountR2Media(key);
    downloaded = !!downloadedRow?.dataUrl && /^data:image\//i.test(downloadedRow.dataUrl);
    deleted = await deleteAccountR2Media(key);
    return { uploaded, downloaded, deleted, bytes };
  } catch (error: any) {
    try { deleted = await deleteAccountR2Media(key); } catch {}
    return { uploaded, downloaded, deleted, bytes, error: String(error?.message || error || "Erreur inconnue") };
  }
}

export function readLastAccountSyncDiagnosticReport(): AccountSyncDiagnosticReport | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(LAST_REPORT_KEY) || localStorage.getItem(LEGACY_REPORT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function clearLastAccountSyncDiagnosticReport(): void {
  try { localStorage.removeItem(LAST_REPORT_KEY); } catch {}
}

export async function runAccountSyncDiagnostic(options: { activeProbe?: boolean } = {}): Promise<AccountSyncDiagnosticReport> {
  const activeProbe = options.activeProbe === true;
  const checks: AccountSyncDiagnosticCheck[] = [];
  const generatedAt = new Date().toISOString();

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const userId = String(sessionData?.session?.user?.id || "").trim() || null;
  if (!userId) {
    add(checks, { id: "auth", label: "Compte connecté", status: "fail", detail: sessionError?.message || "Aucune session Supabase active." });
    const report: AccountSyncDiagnosticReport = {
      version: "v121", generatedAt, activeProbe, userId: null,
      summary: { ok: 0, warn: 0, fail: 1, skip: 0, total: 1 }, checks,
    };
    try { localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(report)); } catch {}
    return report;
  }
  add(checks, { id: "auth", label: "Compte connecté", status: "ok", detail: `UID ${userId.slice(0, 8)}… — session Supabase valide.` });

  const forceBridge = typeof window !== "undefined" ? (window as any).__forceAccountOwnedSyncNow : null;
  add(checks, {
    id: "runtime_bridge",
    label: "Bridge compte runtime",
    status: typeof forceBridge === "function" ? "ok" : "warn",
    detail: typeof forceBridge === "function" ? "Le bridge de resynchronisation forcée est disponible." : "Bridge runtime absent : la synchro peut être différée jusqu'au prochain cycle.",
  });

  if (activeProbe) {
    try {
      if (typeof forceBridge === "function") await forceBridge({ reason: "internal-diagnostic-v121" });
      else window.dispatchEvent(new CustomEvent("dc:account-owned-force-sync", { detail: { reason: "internal-diagnostic-v121" } }));
      add(checks, { id: "force_sync", label: "Resynchronisation compte", status: "ok", detail: "Profils/Bots/Teams privées/Galerie/DartSets/Stats/History ont été repoussés vers le compte. Les données Organisation restent hors canal privé." });
    } catch (error: any) {
      add(checks, { id: "force_sync", label: "Resynchronisation compte", status: "fail", detail: String(error?.message || error || "Échec") });
    }
  } else {
    add(checks, { id: "force_sync", label: "Resynchronisation compte", status: "skip", detail: "Non exécutée en analyse lecture seule." });
  }

  let store: any = {};
  let bots: any[] = [];
  let teams: any[] = [];
  let dartSets: any[] = [];
  let gallery: any[] = [];
  let history: any[] = [];
  let statsIndex: any = null;
  let mediaLocal: Awaited<ReturnType<typeof getUserMediaVaultDiagnostics>> | null = null;
  let slots: any[] = [];

  try {
    [store, bots, teams, dartSets, gallery, history, statsIndex, mediaLocal, slots] = await Promise.all([
      loadStore<any>().catch(() => ({})),
      Promise.resolve(loadBots()).catch(() => []),
      Promise.resolve(loadTeams()).catch(() => []),
      Promise.resolve(getAllDartSets()).catch(() => []),
      Promise.resolve(readAvatarGallery(userId)).catch(() => []),
      History.list().catch(() => []),
      loadStatsIndex().catch(() => null),
      getUserMediaVaultDiagnostics().catch(() => null),
      listLocalMemorySlots().catch(() => []),
    ]);
  } catch {}

  const localProfiles = getAccountOwnedLocalProfiles(Array.isArray(store?.profiles) ? store.profiles : [], userId);
  const userBots = Array.isArray(bots) ? bots.filter((b: any) => b && !isOfficialBotId(b.id) && !b?.systemBot) : [];
  const finishedHistory = Array.isArray(history) ? history.filter(isFinishedMatch) : [];
  const privateTeams = accountOwnedTeams(Array.isArray(teams) ? teams : []);
  const organizationTeams = organizationManagedTeams(Array.isArray(teams) ? teams : []);
  const localCounts = {
    profiles: localProfiles.length,
    bots: userBots.length,
    teams: privateTeams.length,
    organizationTeamProjections: organizationTeams.length,
    gallery: Array.isArray(gallery) ? gallery.length : 0,
    dartSets: Array.isArray(dartSets) ? dartSets.length : 0,
    history: Array.isArray(history) ? history.length : 0,
    finishedHistory: finishedHistory.length,
    statsIndex: statsIndex ? 1 : 0,
  };
  try {
    const authHealth = await getDirectR2AuthHealth();
    const expiresSeconds = Math.max(0, Math.floor(Number(authHealth.expiresInMs || 0) / 1000));
    const authOk = authHealth.hasToken && authHealth.accountMatch && !authHealth.rejected;
    add(checks, {
      id: "jwt_bridge",
      label: "JWT Supabase / bridge R2",
      status: authOk ? "ok" : "fail",
      detail: authOk
        ? `Auth ${authHealth.kind} valide pour le compte${expiresSeconds ? ` · expire dans ${expiresSeconds}s` : ""}.`
        : `Auth R2 invalide : kind=${authHealth.kind} · token=${authHealth.hasToken ? "oui" : "non"} · compte=${authHealth.accountMatch ? "ok" : "mismatch"} · rejet=${authHealth.rejected ? "oui" : "non"}.`,
      data: authHealth,
    });
  } catch (error: any) {
    add(checks, { id: "jwt_bridge", label: "JWT Supabase / bridge R2", status: "fail", detail: String(error?.message || error || "Auth R2 indisponible") });
  }

  add(checks, {
    id: "local_data",
    label: "Données locales rattachées au compte",
    status: "ok",
    detail: `Profils ${localCounts.profiles} · Bots ${localCounts.bots} · Teams privées ${localCounts.teams} · Projections orga ${localCounts.organizationTeamProjections} · Galerie ${localCounts.gallery} · DartSets ${localCounts.dartSets} · History ${localCounts.history}.`,
    data: localCounts,
  });

  // Ne jamais comparer R2 avec TOUT IndexedDB : ce coffre contient aussi des
  // miniatures obsolètes, avatars online, bots officiels et anciens essais. Le
  // diagnostic doit exiger uniquement les médias encore référencés par le compte.
  const referencedMediaKeys = new Set<string>();
  for (const profile of localProfiles) {
    const id = String(profile?.id || "").trim();
    if (id) referencedMediaKeys.add(profileAvatarMediaKey(id));
  }
  for (const bot of userBots) {
    const id = String(bot?.id || "").trim();
    if (id) referencedMediaKeys.add(botAvatarMediaKey(id));
  }
  for (const team of privateTeams) {
    const id = String(team?.id || team?.teamId || "").trim();
    if (!id) continue;
    referencedMediaKeys.add(String(team?.logoMediaKey || teamLogoMediaKey(id)));
    referencedMediaKeys.add(String(team?.coverMediaKey || teamCoverMediaKey(id)));
  }
  for (const item of (Array.isArray(gallery) ? gallery : [])) {
    const id = String(item?.id || item?.hash || "").trim();
    if (id) referencedMediaKeys.add(galleryItemMediaKey(id));
  }
  for (const set of (Array.isArray(dartSets) ? dartSets : [])) {
    const id = String(set?.id || "").trim();
    if (!id) continue;
    referencedMediaKeys.add(String(set?.r2MainMediaKey || dartSetMainMediaKey(id)));
    referencedMediaKeys.add(String(set?.r2ThumbMediaKey || dartSetThumbMediaKey(id)));
  }
  try {
    const aiRows = JSON.parse(localStorage.getItem("msc_avatar_ia_gallery_v1") || "[]");
    if (Array.isArray(aiRows)) {
      for (const item of aiRows) {
        const id = String(item?.id || item?.galleryId || "").trim();
        if (id) referencedMediaKeys.add(`avatar_ai_gallery:${id}`);
      }
    }
  } catch {}
  // WAVE 8 : les médias Organisation sont gérés par leur propre autorité
  // (Supabase/stockage organisation) et ne font jamais partie du miroir R2 privé.

  let remoteMeta: any[] = [];
  let remoteSingletons: any[] = [];
  try {
    const metaRes = await supabase
      .from(TABLE)
      .select("document_type,document_id,client_updated_at,deleted_at")
      .eq("owner_user_id", userId)
      .limit(10000);
    if (metaRes.error) throw metaRes.error;
    remoteMeta = Array.isArray(metaRes.data) ? metaRes.data : [];

    const singletonRes = await supabase
      .from(TABLE)
      .select("document_type,document_id,client_updated_at,deleted_at,payload")
      .eq("owner_user_id", userId)
      .in("document_type", SINGLETON_TYPES);
    if (singletonRes.error) throw singletonRes.error;
    remoteSingletons = Array.isArray(singletonRes.data) ? singletonRes.data : [];

    add(checks, { id: "supabase_read", label: "Supabase account_sync_documents", status: "ok", detail: `${remoteMeta.length} document(s) privés lisibles avec RLS.` });
  } catch (error: any) {
    add(checks, { id: "supabase_read", label: "Supabase account_sync_documents", status: "fail", detail: String(error?.message || error || "Lecture impossible") });
  }

  const remoteCounts: Record<string, number> = {};
  for (const row of remoteMeta) {
    if (row?.deleted_at) continue;
    const type = String(row?.document_type || "unknown");
    remoteCounts[type] = (remoteCounts[type] || 0) + 1;
  }
  const singletonByType = new Map(remoteSingletons.filter((row: any) => !row?.deleted_at).map((row: any) => [String(row.document_type), row]));
  const remoteTeamPayload = singletonByType.get("teams")?.payload;
  const remoteOrganizationTeams = organizationManagedTeams(Array.isArray(remoteTeamPayload) ? remoteTeamPayload : []);
  add(checks, {
    id: "organization_boundary",
    label: "Frontière compte / organisation",
    status: remoteOrganizationTeams.length ? "warn" : "ok",
    detail: remoteOrganizationTeams.length
      ? `${remoteOrganizationTeams.length} ancienne(s) projection(s) Organisation sont encore présentes dans le document privé Teams. WAVE 8 les ignore et les retirera au prochain push compte.`
      : `Canal privé propre : ${privateTeams.length} Team(s) personnelle(s), ${organizationTeams.length} projection(s) Organisation conservée(s) uniquement localement/UI.`,
    data: { accountTeams: privateTeams.length, organizationProjections: organizationTeams.length, leakedRemoteOrganizationTeams: remoteOrganizationTeams.length },
  });

  const comparisons = [
    ["local_profiles", localCounts.profiles],
    ["bots", localCounts.bots],
    ["teams", localCounts.teams],
    ["avatar_gallery", localCounts.gallery],
    ["dart_sets", localCounts.dartSets],
  ] as const;
  const mismatch: string[] = [];
  for (const [type, localCount] of comparisons) {
    const payload = singletonByType.get(type)?.payload;
    const remoteCount = payloadArrayLength(payload);
    if (remoteCount != null && remoteCount !== localCount) mismatch.push(`${type}: local ${localCount} / cloud ${remoteCount}`);
  }
  add(checks, {
    id: "collection_parity",
    label: "Parité collections locales / compte",
    status: mismatch.length ? (activeProbe ? "fail" : "warn") : "ok",
    detail: mismatch.length ? `Écart détecté : ${mismatch.join(" · ")}.${activeProbe ? " Le resync vient d'être exécuté : cet écart est réel." : " Un test complet force la réconciliation."}` : "Profils/Bots/Teams privées/Galerie/DartSets sont alignés en nombre.",
    data: { mismatch },
  });

  const payloadRows = remoteSingletons.filter((row: any) => !row?.deleted_at);
  const inlineRows = payloadRows.filter((row: any) => hasInlineImage(row?.payload));
  const largestPayload = payloadRows.reduce((max: any, row: any) => {
    const bytes = jsonBytes(row?.payload);
    return bytes > Number(max?.bytes || 0) ? { type: row?.document_type, bytes } : max;
  }, { type: "", bytes: 0 });
  add(checks, {
    id: "supabase_lightweight",
    label: "Supabase reste léger",
    status: inlineRows.length ? "fail" : (largestPayload.bytes > 4 * 1024 * 1024 ? "warn" : "ok"),
    detail: inlineRows.length
      ? `${inlineRows.length} document(s) contiennent encore une image Base64 : à corriger.`
      : `Aucun data:image dans les documents inspectés. Plus gros bloc JSON : ${bytesLabel(largestPayload.bytes)} (${largestPayload.type || "—"}).`,
    data: { inlineTypes: inlineRows.map((row: any) => row?.document_type), largestPayload },
  });

  const remoteHistoryCount = Number(remoteCounts.history_match || 0);
  const historyGap = Math.abs(remoteHistoryCount - finishedHistory.length);
  add(checks, {
    id: "history_stats",
    label: "History / Stats du compte",
    status: historyGap > 0 ? (activeProbe ? "fail" : "warn") : "ok",
    detail: `History terminée locale ${finishedHistory.length} · History serveur ${remoteHistoryCount} · stats_index ${singletonByType.has("stats_index") ? "présent" : "absent"}.`,
    data: { localFinished: finishedHistory.length, remoteHistory: remoteHistoryCount, statsIndexRemote: singletonByType.has("stats_index") },
  });

  // Realtime : l'abonnement seul est non destructif. En mode actif, on vérifie aussi écriture/événement/suppression.
  if (activeProbe) {
    const probe = await testRealtimeAndSupabaseWrite(userId);
    const ok = probe.subscribed && probe.writeOk && probe.eventReceived && probe.deleteOk;
    add(checks, {
      id: "realtime_probe",
      label: "Supabase Realtime + RLS écriture",
      status: ok ? "ok" : "fail",
      detail: ok ? "SUBSCRIBED + INSERT reçu en Realtime + DELETE de nettoyage : OK." : `Probe incomplet : ${probe.error || JSON.stringify(probe)}.`,
      data: probe,
    });
  } else {
    add(checks, { id: "realtime_probe", label: "Supabase Realtime + RLS écriture", status: "skip", detail: "Lance TEST COMPLET pour créer puis supprimer un document diagnostic temporaire." });
  }

  let mediaRemote: Awaited<ReturnType<typeof getAccountR2MediaDiagnosticSnapshot>> | null = null;
  try {
    mediaRemote = await getAccountR2MediaDiagnosticSnapshot(true);
    const used = Number(mediaRemote.audit.usedBytes || 0);
    const quota = Number(mediaRemote.audit.quotaBytes || 0);
    const percent = quota > 0 ? (used / quota) * 100 : 0;
    add(checks, {
      id: "r2_manifest",
      label: "R2 Account Media",
      status: quota > 0 && percent >= 90 ? "warn" : "ok",
      detail: `${mediaRemote.audit.total} média(s) · ${bytesLabel(used)} / ${bytesLabel(quota)} (${percent.toFixed(1)} %) · auth ${mediaRemote.authMode || "?"}.`,
      data: mediaRemote.audit,
    });
  } catch (error: any) {
    add(checks, { id: "r2_manifest", label: "R2 Account Media", status: "fail", detail: String(error?.message || error || "Manifest inaccessible") });
  }

  if (activeProbe) {
    try {
      const mirrored = await mirrorAllLocalUserMediaToAccountR2({
        keys: referencedMediaKeys,
        kinds: ["avatar_ai_gallery", "team_logo", "team_cover"],
        maxEntries: 1200,
        concurrency: 1,
      });
      add(checks, {
        id: "r2_mirror",
        label: "Miroir médias du compte → R2",
        status: mirrored.failed ? "fail" : "ok",
        detail: mirrored.failed
          ? `${mirrored.failed} échec(s) sur ${mirrored.attempted} média(s) inspecté(s). ${mirrored.uploaded} upload(s), ${mirrored.fresh} déjà à jour.`
          : `${mirrored.attempted} média(s) référencé(s) inspecté(s) · ${mirrored.uploaded} upload(s) · ${mirrored.fresh} déjà à jour.`,
        data: mirrored,
      });
      mediaRemote = await getAccountR2MediaDiagnosticSnapshot(true).catch(() => mediaRemote);
    } catch (error: any) {
      add(checks, { id: "r2_mirror", label: "Miroir médias locaux → R2", status: "fail", detail: String(error?.message || error || "Échec du miroir") });
    }
  } else {
    add(checks, { id: "r2_mirror", label: "Miroir médias locaux → R2", status: "skip", detail: "Non exécuté en lecture seule." });
  }

  if (mediaLocal) {
    add(checks, {
      id: "local_media",
      label: "Cache média IndexedDB",
      status: "ok",
      detail: `${mediaLocal.entries} média(s) · ~${bytesLabel(mediaLocal.approxBytes)} · ${Object.entries(mediaLocal.byKind).map(([k, v]) => `${k}:${v}`).slice(0, 8).join(" · ") || "aucun"}.`,
      data: { ...mediaLocal, keys: undefined },
    });
  } else {
    add(checks, { id: "local_media", label: "Cache média IndexedDB", status: "warn", detail: "Diagnostic du coffre média local indisponible." });
  }

  if (mediaLocal && mediaRemote) {
    const remoteKeys = new Set(Object.keys(mediaRemote.manifest?.media || {}).map(normalizeAccountR2MediaKey));
    const localKeySet = new Set((mediaLocal.keys || []).map(normalizeAccountR2MediaKey).filter(Boolean));
    const expected = Array.from(referencedMediaKeys)
      .map(normalizeAccountR2MediaKey)
      .filter((key) => !!key && localKeySet.has(key));
    const uniqueExpected = Array.from(new Set(expected));
    const missing = uniqueExpected.filter((key) => !remoteKeys.has(key));
    add(checks, {
      id: "media_coverage",
      label: "Couverture médias multi-appareils",
      status: missing.length ? (activeProbe ? "fail" : "warn") : "ok",
      detail: missing.length
        ? `${missing.length}/${uniqueExpected.length} média(s) actuellement référencé(s) par le compte sont absents de R2.${activeProbe ? " Le resync vient d'être exécuté : il reste une anomalie réelle." : " Lance TEST COMPLET pour les pousser."}`
        : `${uniqueExpected.length} média(s) actuellement référencé(s) sont présents dans R2. Les médias orphelins/anciens du cache sont volontairement ignorés.`,
      data: { expected: uniqueExpected.length, missing: missing.length, sampleMissing: missing.slice(0, 12), localVaultTotal: mediaLocal.entries },
    });

    const rows = Object.values(mediaRemote.manifest?.media || {});
    const tooLarge = rows.filter((row: any) => Number(row?.sizeBytes || 0) > 900 * 1024);
    const max = rows.reduce((m: any, row: any) => Number(row?.sizeBytes || 0) > Number(m?.sizeBytes || 0) ? row : m, null as any);
    add(checks, {
      id: "media_sizes",
      label: "Compression / taille médias",
      status: tooLarge.length ? "fail" : "ok",
      detail: `${tooLarge.length ? `${tooLarge.length} objet(s) > 900 Ko` : "Aucun objet > 900 Ko"}. Plus gros : ${max ? `${max.kind || "media"} ${bytesLabel(max.sizeBytes)}` : "—"}.`,
      data: { tooLarge: tooLarge.map((row: any) => ({ key: row?.key, sizeBytes: row?.sizeBytes })), max },
    });
  }

  if (activeProbe) {
    const r2Probe = await testR2BinaryRoundTrip(userId);
    const ok = r2Probe.uploaded && r2Probe.downloaded && r2Probe.deleted;
    add(checks, {
      id: "r2_roundtrip",
      label: "R2 upload → download → delete",
      status: ok ? "ok" : "fail",
      detail: ok ? `Image temporaire ${bytesLabel(r2Probe.bytes)} envoyée, relue puis supprimée.` : `Round-trip R2 incomplet : ${r2Probe.error || JSON.stringify(r2Probe)}.`,
      data: r2Probe,
    });
  } else {
    add(checks, { id: "r2_roundtrip", label: "R2 upload → download → delete", status: "skip", detail: "Lance TEST COMPLET pour le probe binaire temporaire." });
  }

  const beforeRestoreSlots = Array.isArray(slots) ? slots.filter((slot: any) => String(slot?.source || "") === "before-restore") : [];
  const prefs: any = (() => { try { return loadStoragePrefs(); } catch { return null; } })();
  add(checks, {
    id: "restore_safety",
    label: "Sauvegardes / restauration / rollback",
    status: typeof forceBridge === "function" ? "ok" : "warn",
    detail: `Destination actuelle ${String(prefs?.selectedDestination || "?")} · ${slots.length} slot(s) local(aux), dont ${beforeRestoreSlots.length} sécurité(s) avant restauration · resync post-restore ${typeof forceBridge === "function" ? "disponible" : "différée"}.`,
    data: { selectedDestination: prefs?.selectedDestination || null, slots: slots.length, beforeRestoreSlots: beforeRestoreSlots.length, latestBeforeRestore: beforeRestoreSlots[0]?.createdAt || null },
  });

  const summary = { ok: 0, warn: 0, fail: 0, skip: 0, total: checks.length };
  for (const check of checks) summary[check.status] += 1;
  const report: AccountSyncDiagnosticReport = {
    version: "v121",
    generatedAt,
    activeProbe,
    userId,
    summary,
    checks,
    local: { counts: localCounts, media: mediaLocal ? { ...mediaLocal, keys: undefined } : null },
    remote: { counts: remoteCounts, media: mediaRemote ? { audit: mediaRemote.audit, authMode: mediaRemote.authMode } : null },
  };
  try { localStorage.setItem(LAST_REPORT_KEY, JSON.stringify(report)); } catch {}
  return report;
}
