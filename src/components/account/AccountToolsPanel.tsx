// ============================================
// src/components/account/AccountToolsPanel.tsx
// Outils Compte (Sync Express)
// - Diagnostics lisibles (session / profile / snapshot)
// - Actions: PUSH / PULL / COMPARE / Refresh session / Purge local
// - Journal UI (copier/coller)
// ============================================

import * as React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { onlineApi } from "../../lib/onlineApi";
import { hydrateFromOnline, pushLocalSnapshotToOnline } from "../../lib/hydrateFromOnline";
import { exportCloudSnapshot, exportAll } from "../../lib/storage";

import { loadStore } from "../../lib/storage";
import { exportHistoryDump } from "../../lib/historyCloud";
import { getCachedStatsSync, rebuildStatsForProfile } from "../../lib/stats/rebuildStats";
import { mergeNow } from "../../lib/cloudSync";

type Props = {
  go?: (tab: any, params?: any) => void;
};

type DiagState = {
  sessionStatus: "signed_in" | "signed_out" | "checking";
  email: string;
  userId: string;

  profileStatus: "ok" | "not_found" | "error";
  profileUpdatedAt?: string | null;
  profileDisplayName?: string | null;
  profileAvatarUrl?: string | null;

  cloudStatus: "ok" | "not_found" | "error";
  cloudUpdatedAt?: string | null;
  cloudVersion?: number | null;
  cloudSize?: number | null;

  localExportedAt?: number | null;
  localSize?: number | null;
  localHash?: string | null;

  cloudHash?: string | null;
};

type AutoTestReport = {
  ranAt: string;

  activeProfileId: string | null;
  profiles: Array<{ id: string; name: string }>;

  historyRows: number;
  historyByKind: Record<string, number>;

  cacheByProfile: Record<
    string,
    { hasCache: boolean; updatedAt?: number; keysFound?: string[]; note?: string }
  >;

  diagnosis: string[];
};

function safeKindFromSavedMatch(r: any): string {
  const k =
    r?.kind ??
    r?.gameKind ??
    r?.payload?.kind ??
    r?.payload?.gameKind ??
    r?.summary?.kind ??
    r?.summary?.gameKind;

  return String(k || "unknown");
}

function findStatsCacheKeys(profileId: string): string[] {
  const pid = String(profileId || "unknown");
  const prefixes = ["dc_stats_cache_v1:", "dc_stats_cache:", "dc-stats-cache:", "dc-stats-cache-v1:"];
  const keys: string[] = [];
  try {
    if (typeof window === "undefined") return keys;
    for (const p of prefixes) {
      const k = `${p}${pid}`;
      if (window.localStorage.getItem(k)) keys.push(k);
    }
  } catch {}
  return keys;
}

function fmtIsoNow() {
  try {
    return new Date().toISOString();
  } catch {
    return String(Date.now());
  }
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function fmtTime(ts: number) {
  const d = new Date(ts);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

function safeJsonStringify(obj: any): string {
  try {
    return JSON.stringify(obj);
  } catch {
    return "";
  }
}

function hashString(s: string): string {
  // FNV-1a 32-bit (simple, deterministic)
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = (h + ((h << 1) + (h << 4) + (h << 7) + (h << 8) + (h << 24))) >>> 0;
  }
  return ("00000000" + h.toString(16)).slice(-8);
}

async function purgeLocalOnlyKeepSession() {
  // Purge KV + IDB. Ne touche PAS supabase.auth.signOut.
  try {
    if (typeof window === "undefined") return;

    try {
      window.localStorage.clear();
      window.sessionStorage.clear();
    } catch {}

    try {
      const anyIndexedDB: any = (window as any).indexedDB;
      if (anyIndexedDB && typeof anyIndexedDB.databases === "function") {
        const dbs = await anyIndexedDB.databases();
        for (const db of dbs) {
          if (db?.name) {
            await new Promise<void>((resolve) => {
              const req = window.indexedDB.deleteDatabase(db.name as string);
              req.onsuccess = () => resolve();
              req.onerror = () => resolve();
              req.onblocked = () => resolve();
            });
          }
        }
      } else {
        // fallback best-effort
        const knownDbs = ["dc_stats_v1", "dc_history_v1", "dc_profiles_v1", "dc_training_v1"];
        for (const name of knownDbs) {
          await new Promise<void>((resolve) => {
            const req = window.indexedDB.deleteDatabase(name);
            req.onsuccess = () => resolve();
            req.onerror = () => resolve();
            req.onblocked = () => resolve();
          });
        }
      }
    } catch {}

    window.location.reload();
  } catch {
    // noop
  }
}

export function AccountToolsPanel({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const auth = useAuthOnline() as any;

  const [busy, setBusy] = React.useState(false);
  const [diag, setDiag] = React.useState<DiagState | null>(null);
  const [log, setLog] = React.useState<string[]>([]);
  const [compareResult, setCompareResult] = React.useState<string | null>(null);
const [autoBusy, setAutoBusy] = React.useState(false);
  const [autoReport, setAutoReport] = React.useState<AutoTestReport | null>(null);


  const addLog = React.useCallback((line: string) => {
    const ts = fmtTime(Date.now());
    setLog((prev) => [`${ts}  ${line}`, ...prev].slice(0, 30));
  }, []);

  const runAutoTest = React.useCallback(async () => {
    setAutoBusy(true);
    try {
      const diagnosis: string[] = [];

      // 1) Store (profils + activeProfileId)
      const store: any = await loadStore().catch(() => null);
      const profilesRaw: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
      const profiles = profilesRaw
        .map((p) => ({
          id: String(p?.id ?? ""),
          name: String(p?.name ?? p?.displayName ?? p?.nickname ?? "—"),
        }))
        .filter((p) => !!p.id);

      const activeProfileId = store?.activeProfileId ? String(store.activeProfileId) : null;

      if (!profiles.length) diagnosis.push("❌ Aucun profil dans le store (store.profiles vide).");
      if (!activeProfileId) diagnosis.push("⚠️ activeProfileId absent (profil actif non défini).");

      // 2) History DB
      const dump = await exportHistoryDump().catch(() => ({ _v: 1, rows: {} as any }));
      const rows = Object.values((dump as any)?.rows || {});
      const historyByKind: Record<string, number> = {};
      for (const r of rows) {
        const k = safeKindFromSavedMatch(r);
        historyByKind[k] = (historyByKind[k] ?? 0) + 1;
      }

      if (rows.length === 0) {
        diagnosis.push("❌ Historique local = 0 (dc-store-v1/history vide) → StatsHub ne peut rien calculer.");
      } else {
        diagnosis.push(`✅ Historique local présent: ${rows.length} entrées.`);
      }

      // 3) Caches StatsHub
      const cacheByProfile: AutoTestReport["cacheByProfile"] = {};
      for (const p of profiles) {
        const cache = getCachedStatsSync(p.id);
        const keysFound = findStatsCacheKeys(p.id);

        cacheByProfile[p.id] = {
          hasCache: !!cache,
          updatedAt: (cache as any)?.updatedAt,
          keysFound,
        };

        if (!cache) {
          diagnosis.push(`⚠️ Cache StatsHub ABSENT pour profil ${p.name} (${p.id}).`);
        }
      }

      const anyCache = Object.values(cacheByProfile).some((x) => x.hasCache);
      if (rows.length > 0 && !anyCache) {
        diagnosis.push(
          "💣 Cause probable: historique importé MAIS aucun rebuild déclenché (event dc-history-updated non émis) → caches stats jamais calculés."
        );
      }

      if (activeProfileId && profiles.length && !profiles.some((p) => p.id === activeProfileId)) {
        diagnosis.push("💣 activeProfileId pointe vers un profil qui n’existe pas dans store.profiles.");
      }

      setAutoReport({
        ranAt: fmtIsoNow(),
        activeProfileId,
        profiles,
        historyRows: rows.length,
        historyByKind,
        cacheByProfile,
        diagnosis,
      });

      addLog("AUTOTEST: ok");
    } catch (e: any) {
      addLog(`AUTOTEST: error (${e?.message ?? e})`);
      setAutoReport({
        ranAt: fmtIsoNow(),
        activeProfileId: null,
        profiles: [],
        historyRows: 0,
        historyByKind: {},
        cacheByProfile: {},
        diagnosis: [`❌ AUTOTEST a crash: ${String(e?.message ?? e)}`],
      });
    } finally {
      setAutoBusy(false);
    }
  }, [addLog]);

  const forceRebuildNow = React.useCallback(async () => {
    setAutoBusy(true);
    try {
      const store: any = await loadStore().catch(() => null);
      const profilesRaw: any[] = Array.isArray(store?.profiles) ? store.profiles : [];
      const ids = profilesRaw.map((p) => String(p?.id ?? "")).filter(Boolean);

      if (!ids.length) {
        addLog("FORCE REBUILD: no profiles");
        return;
      }

      await Promise.allSettled(ids.map((id) => rebuildStatsForProfile(id)));

      // ✅ Force refresh listeners
      try {
        window.dispatchEvent(new CustomEvent("dc-stats-cache-updated", { detail: { reason: "force_rebuild" } }));
      } catch {}
      try {
        window.dispatchEvent(new Event("dc-history-updated"));
      } catch {}

      addLog("FORCE REBUILD: done");
      await runAutoTest();
    } catch (e: any) {
      addLog(`FORCE REBUILD: error (${e?.message ?? e})`);
    } finally {
      setAutoBusy(false);
    }
  }, [addLog, runAutoTest]);



  const loadDiagnostics = React.useCallback(async () => {
    setBusy(true);
    setCompareResult(null);

    try {
      const session = auth?.session ?? null;
      const user = session?.user ?? null;

      const sessionStatus: DiagState["sessionStatus"] = auth?.status ?? (user ? "signed_in" : "signed_out");
      const email = (user as any)?.email || "—";
      const userId = (user as any)?.id || "—";

      // --- Profile (best-effort)
      let profileStatus: DiagState["profileStatus"] = "not_found";
      let profileUpdatedAt: string | null = null;
      let profileDisplayName: string | null = null;
      let profileAvatarUrl: string | null = null;

      try {
        const res: any = await (onlineApi as any).getProfile?.();
        const p = res?.profile ?? res ?? null;
        if (p) {
          profileStatus = "ok";
          profileUpdatedAt = (p as any)?.updated_at ?? (p as any)?.updatedAt ?? null;
          profileDisplayName = (p as any)?.displayName ?? (p as any)?.nickname ?? null;
          profileAvatarUrl = (p as any)?.avatarUrl ?? (p as any)?.avatar_url ?? null;
        }
      } catch (e: any) {
        profileStatus = "error";
        addLog(`PROFILE: error (${e?.message ?? e})`);
      }

      // --- Cloud snapshot metadata
      let cloudStatus: DiagState["cloudStatus"] = "not_found";
      let cloudUpdatedAt: string | null = null;
      let cloudVersion: number | null = null;
      let cloudSize: number | null = null;
      let cloudHash: string | null = null;

      try {
        const res = await onlineApi.pullStoreSnapshot();
        cloudStatus = res.status;
        if (res.status === "error") {
          const msg = (res as any)?.error?.message ?? String((res as any)?.error ?? "unknown_error");
          addLog(`CLOUD: pull error (${msg})`);
          cloudUpdatedAt = null;
          cloudVersion = null;
          cloudSize = null;
          cloudHash = null;
        }

        cloudUpdatedAt = res.updatedAt ?? null;
        cloudVersion = (res as any).version ?? null;

        if (cloudStatus === "ok") {
          const payload = (res as any).payload ?? null;
          const s = safeJsonStringify(payload);
          cloudSize = s ? s.length : 0;
          cloudHash = s ? hashString(s) : null;
        }
      } catch (e: any) {
        cloudStatus = "error";
        addLog(`CLOUD: pull error (${e?.message ?? e})`);
      }

      // --- Local snapshot metadata (exportCloudSnapshot)
      let localExportedAt: number | null = null;
      let localSize: number | null = null;
      let localHash: string | null = null;

      try {
        const snap: any = await exportCloudSnapshot();
        localExportedAt = (snap as any)?.exportedAt ?? Date.now();
        const s = safeJsonStringify(snap);
        localSize = s ? s.length : 0;
        localHash = s ? hashString(s) : null;
      } catch (e: any) {
        addLog(`LOCAL: export error (${e?.message ?? e})`);
      }

      setDiag({
        sessionStatus,
        email,
        userId,

        profileStatus,
        profileUpdatedAt,
        profileDisplayName,
        profileAvatarUrl,

        cloudStatus,
        cloudUpdatedAt,
        cloudVersion,
        cloudSize,
        cloudHash,

        localExportedAt,
        localSize,
        localHash,
      });

      addLog("Diagnostics: ok");
    } finally {
      setBusy(false);
    }
  }, [addLog, auth?.session, auth?.status]);

  React.useEffect(() => {
    loadDiagnostics().catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sectionBox: React.CSSProperties = {
    background: "rgba(0,0,0,0.28)",
    borderRadius: 14,
    border: `1px solid ${theme.borderSoft}`,
    padding: 12,
  };

  const btnBase: React.CSSProperties = {
    borderRadius: 999,
    border: `1px solid ${theme.borderSoft}`,
    padding: "10px 12px",
    background: "rgba(255,255,255,0.05)",
    color: "#fff",
    fontWeight: 900,
    cursor: "pointer",
    width: "100%",
  };

  async function doPush() {
    setBusy(true);
    setCompareResult(null);
    try {
      addLog("PUSH: start");
      const res: any = await pushLocalSnapshotToOnline();
      if (!res?.ok) {
        addLog(`PUSH: failed (${res?.error ?? "unknown"})`);
      } else {
        addLog("PUSH: ok");
      }
      await loadDiagnostics();
    } catch (e: any) {
      addLog(`PUSH: error (${e?.message ?? e})`);
    } finally {
      setBusy(false);
    }
  }

  async function doPullApply() {
    setBusy(true);
    setCompareResult(null);
    try {
      addLog("PULL: start");
      const res: any = await hydrateFromOnline({ reload: false });
      if (res?.applied) addLog(`PULL: applied (updated_at=${res?.updatedAt ?? "—"})`);
      else addLog(`PULL: no-apply (${res?.reason ?? res?.status ?? "—"})`);
      await loadDiagnostics();
    } catch (e: any) {
      addLog(`PULL: error (${e?.message ?? e})`);
    } finally {
      setBusy(false);
    }
  }

  async function doMergeAntiPerte(conflict: "newest" | "local" | "cloud" = "newest") {
    const uid = auth.session?.user?.id;
    if (!uid) {
      addLog("MERGE: ERR not logged");
      return;
    }
    setBusy(true);
    setCompareResult(null);
    try {
      addLog(`MERGE: start (conflict=${conflict})`);
      const res = await mergeNow(uid, { conflict });
      addLog(`MERGE: ok (applied_local=${res?.applied_local ? "yes" : "no"}, pushed_cloud=${res?.pushed_cloud ? "yes" : "no"})`);
      await loadDiagnostics();
    } catch (e: any) {
      addLog(`MERGE: error (${e?.message ?? e})`);
    } finally {
      setBusy(false);
    }
  }

  async function doExportBackupLocal() {
    setBusy(true);
    setCompareResult(null);
    try {
      addLog("BACKUP: exportAll start");
      const dump = await exportAll();
      const blob = new Blob([JSON.stringify(dump)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `dc_backup_local_${new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      addLog("BACKUP: ok (download)");
    } catch (e: any) {
      addLog(`BACKUP: error (${e?.message ?? e})`);
    } finally {
      setBusy(false);
    }
  }

  async function doCompare() {
    if (!diag) return;

    const local = diag.localHash;
    const cloud = diag.cloudHash;

    if (!cloud || diag.cloudStatus !== "ok") {
      setCompareResult("Cloud: snapshot introuvable (ou erreur). Fais un PUSH d’abord.");
      return;
    }

    if (!local) {
      setCompareResult("Local: snapshot non disponible.");
      return;
    }

    if (local === cloud) {
      setCompareResult("✅ Local == Cloud (snapshot identique)");
    } else {
      setCompareResult("⚠️ Différent: Local != Cloud (snapshot)");
    }
  }

  async function doRefreshSession() {
    setBusy(true);
    setCompareResult(null);
    try {
      addLog("SESSION: refresh");
      await auth?.refresh?.();
      await loadDiagnostics();
    } catch (e: any) {
      addLog(`SESSION: error (${e?.message ?? e})`);
    } finally {
      setBusy(false);
    }
  }

  async function doPurgeLocal() {
    const ok = window.confirm(
      "⚠️ Purger les données locales sur CET appareil ?\n\n" +
        "- Efface localStorage / sessionStorage / IndexedDB\n" +
        "- Ne déconnecte pas le compte Supabase\n\n" +
        "Continuer ?"
    );
    if (!ok) return;

    addLog("PURGE: local-only -> reload");
    await purgeLocalOnlyKeepSession();
  }

  const pill = (text: string, color: string) => (
    <span
      style={{
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${color}66`,
        background: "rgba(0,0,0,0.35)",
        color,
        fontWeight: 900,
        fontSize: 11,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      {text}
    </span>
  );

  const statusColor = (s: string) => {
    if (s === "ok" || s === "signed_in") return "#5ad57a";
    if (s === "checking") return theme.primary;
    if (s === "not_found" || s === "signed_out") return "rgba(255,255,255,0.7)";
    return "#ff6b6b";
  };

  return (
    <div style={{ marginTop: 14 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
        <div style={{ fontWeight: 900, fontSize: 14, color: theme.primary, letterSpacing: 0.6, textTransform: "uppercase" }}>
          {t("settings.account.tools.title", "Outils Compte (Sync Express)")}
        </div>

        <button
          type="button"
          onClick={() => loadDiagnostics()}
          disabled={busy}
          style={{
            borderRadius: 999,
            border: `1px solid ${theme.primary}55`,
            padding: "6px 10px",
            background: "rgba(0,0,0,0.35)",
            color: theme.primary,
            fontWeight: 900,
            cursor: "pointer",
            opacity: busy ? 0.6 : 1,
            flexShrink: 0,
          }}
          title="Rafraîchir les diagnostics"
        >
          {busy ? "…" : "↻"}
        </button>
      </div>

      <div style={{ display: "grid", gap: 10 }}>
        <div style={sectionBox}>
          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontWeight: 900 }}>{t("settings.account.tools.state", "État")}</div>
              {pill(diag?.sessionStatus ?? "—", statusColor(diag?.sessionStatus ?? ""))}
            </div>

            <div style={{ display: "grid", gap: 6, fontSize: 12, color: theme.textSoft }}>
              <div>
                <span style={{ color: "#fff", fontWeight: 800 }}>{t("settings.account.tools.user", "Utilisateur")}: </span>
                {diag?.email ?? "—"} {diag?.userId && diag.userId !== "—" ? `(#${String(diag.userId).slice(0, 8)})` : ""}
              </div>

              <div>
                <span style={{ color: "#fff", fontWeight: 800 }}>{t("settings.account.tools.profile", "Profil")}: </span>
                {pill(diag?.profileStatus ?? "—", statusColor(diag?.profileStatus ?? ""))}
                {diag?.profileDisplayName ? (
                  <span style={{ marginLeft: 8, opacity: 0.95 }}>{diag.profileDisplayName}</span>
                ) : null}
              </div>

              <div>
                <span style={{ color: "#fff", fontWeight: 800 }}>{t("settings.account.tools.cloud", "Snapshot cloud")}: </span>
                {pill(diag?.cloudStatus ?? "—", statusColor(diag?.cloudStatus ?? ""))}
                {diag?.cloudUpdatedAt ? <span style={{ marginLeft: 8 }}>{diag.cloudUpdatedAt}</span> : null}
                {typeof diag?.cloudSize === "number" ? <span style={{ marginLeft: 8 }}>({diag.cloudSize} chars)</span> : null}
              </div>

              <div>
                <span style={{ color: "#fff", fontWeight: 800 }}>{t("settings.account.tools.local", "Snapshot local")}: </span>
                {diag?.localExportedAt ? <span>{new Date(diag.localExportedAt).toLocaleString()}</span> : "—"}
                {typeof diag?.localSize === "number" ? <span style={{ marginLeft: 8 }}>({diag.localSize} chars)</span> : null}
              </div>
            </div>

            {compareResult && (
              <div style={{ marginTop: 8, padding: 10, borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: "rgba(255,255,255,0.02)", fontSize: 12 }}>
                {compareResult}
              </div>
            )}
          </div>
        </div>

        <div style={sectionBox}>
          <div style={{ fontWeight: 900, marginBottom: 10 }}>{t("settings.account.tools.actions", "Actions rapides")}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <button type="button" onClick={doPush} disabled={busy} style={{ ...btnBase, borderColor: `${theme.primary}66`, color: theme.primary }}>
              {t("settings.account.tools.push", "PUSH maintenant")}
            </button>

            <button type="button" onClick={doPullApply} disabled={busy} style={btnBase}>
              {t("settings.account.tools.pull", "PULL & appliquer")}
            </button>

            <button type="button" onClick={doCompare} disabled={busy || !diag} style={btnBase}>
              {t("settings.account.tools.compare", "Comparer Local/Cloud")}
            </button>

            <button type="button" onClick={doRefreshSession} disabled={busy} style={btnBase}>
              {t("settings.account.tools.refreshSession", "Refresh session")}
            </button>

            <button
              type="button"
              onClick={() => doMergeAntiPerte("newest")}
              disabled={busy || !auth.session}
              style={{ ...btnBase, borderColor: `${theme.gold}66`, color: theme.gold }}
              title="Fusionne cloud + local sans perte, applique local puis pousse le merge"
            >
              {t("settings.account.tools.merge", "MERGE anti-perte")}
            </button>

            <button
              type="button"
              onClick={() => doMergeAntiPerte("local")}
              disabled={busy || !auth.session}
              style={{ ...btnBase, borderColor: `${theme.primary}66`, color: theme.primary }}
              title="Force la priorité au LOCAL en cas de conflit (import local vers cloud)"
            >
              {t("settings.account.tools.importLocal", "Importer local -> cloud")}
            </button>

            <button
              type="button"
              onClick={doExportBackupLocal}
              disabled={busy}
              style={{ ...btnBase, borderColor: "rgba(255,255,255,0.25)", color: theme.text }}
              title="Télécharge un backup JSON complet (store+history+dc_*)"
            >
              {t("settings.account.tools.exportBackup", "Exporter backup local")}
            </button>

            <button
              type="button"
              onClick={() => window.location.reload()}
              disabled={busy}
              style={{ ...btnBase, background: "rgba(255,255,255,0.03)", color: theme.textSoft }}
              title="Recharge la page"
            >
              {t("settings.account.tools.reload", "Simuler Refresh")}
            </button>

            <button
              type="button"
              onClick={doPurgeLocal}
              disabled={busy}
              style={{ ...btnBase, borderColor: "rgba(255,120,120,0.55)", color: "rgba(255,180,180,0.95)" }}
              title="Purge localStorage + IndexedDB (sans logout)"
            >
              {t("settings.account.tools.purge", "Purger local")}
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, marginTop: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => go?.("auth_start" as any)}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                padding: "8px 10px",
                background: "transparent",
                color: theme.textSoft,
                fontWeight: 900,
                cursor: go ? "pointer" : "not-allowed",
              }}
              disabled={!go}
              title="Ouvre l’écran de connexion / création de compte"
            >
              {t("settings.account.tools.openAuth", "Ouvrir Connexion")}
            </button>

            <button
              type="button"
              onClick={() => auth?.logout?.()}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                padding: "8px 10px",
                background: "transparent",
                color: theme.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
              title="Déconnexion (debug)"
            >
              {t("settings.account.tools.logout", "Logout")}
            </button>
          </div>
        </div>

        
        <div style={sectionBox}>
          <div style={{ fontWeight: 900, marginBottom: 8 }}>🧪 AutoTest Stats (Téléphone / pages.dev)</div>

          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              disabled={busy || autoBusy}
              onClick={() => runAutoTest().catch(() => {})}
              style={{ ...btnBase, opacity: busy || autoBusy ? 0.6 : 1 }}
            >
              {busy || autoBusy ? "Test en cours…" : "Lancer l’autotest"}
            </button>

            <button
              type="button"
              disabled={busy || autoBusy}
              onClick={() => forceRebuildNow().catch(() => {})}
              style={{
                ...btnBase,
                borderColor: `${theme.primary}AA`,
                color: theme.primary,
                boxShadow: `0 0 14px ${theme.primary}55`,
                opacity: busy || autoBusy ? 0.6 : 1,
              }}
              title="Force rebuild des caches StatsHub à partir de l’historique local"
            >
              {busy || autoBusy ? "Rebuild…" : "FIX NOW — Forcer rebuild stats"}
            </button>
          </div>

          {autoReport ? (
            <div
              style={{
                marginTop: 10,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.25)",
                padding: 10,
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              <div style={{ opacity: 0.8, marginBottom: 6 }}>
                Dernier test : <b>{autoReport.ranAt}</b>
              </div>

              <div style={{ marginBottom: 6 }}>
                <b>Store</b> — activeProfileId:{" "}
                <span style={{ color: theme.primary }}>{autoReport.activeProfileId ?? "null"}</span>
                <br />
                profils: <b>{autoReport.profiles.length}</b>
              </div>

              <div style={{ marginBottom: 6 }}>
                <b>History DB</b> — rows:{" "}
                <span style={{ color: autoReport.historyRows ? "#7CFF7C" : "#FF6B6B" }}>
                  <b>{autoReport.historyRows}</b>
                </span>
                <div style={{ opacity: 0.85, marginTop: 4 }}>
                  {Object.keys(autoReport.historyByKind).length === 0
                    ? "—"
                    : Object.entries(autoReport.historyByKind)
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 12)
                        .map(([k, n]) => `${k}:${n}`)
                        .join(" • ")}
                </div>
              </div>

              <div style={{ marginBottom: 6 }}>
                <b>Caches StatsHub</b>
                <div style={{ marginTop: 6, display: "grid", gap: 6 }}>
                  {autoReport.profiles.map((p) => {
                    const c = autoReport.cacheByProfile[p.id];
                    const ok = !!c?.hasCache;
                    const keys = c?.keysFound?.length ? c.keysFound.join(", ") : "—";

                    return (
                      <div
                        key={p.id}
                        style={{
                          borderRadius: 10,
                          border: `1px solid ${theme.borderSoft}`,
                          padding: "8px 10px",
                          background: ok ? "rgba(124,255,124,0.06)" : "rgba(255,107,107,0.06)",
                        }}
                      >
                        <div style={{ fontWeight: 900 }}>
                          {p.name} <span style={{ opacity: 0.7 }}>({p.id})</span>
                        </div>
                        <div style={{ opacity: 0.9 }}>
                          cache:{" "}
                          <b style={{ color: ok ? "#7CFF7C" : "#FF6B6B" }}>{ok ? "OK" : "ABSENT"}</b>
                          {c?.updatedAt ? (
                            <>
                              {" "}
                              • updatedAt: <b>{new Date(c.updatedAt).toLocaleString()}</b>
                            </>
                          ) : null}
                        </div>
                        <div style={{ opacity: 0.75, marginTop: 2 }}>keys: {keys}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div style={{ marginTop: 8 }}>
                <b>Diagnostic</b>
                <ul style={{ margin: "6px 0 0 18px", padding: 0 }}>
                  {autoReport.diagnosis.map((d, i) => (
                    <li key={i} style={{ marginBottom: 4 }}>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ) : (
            <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft, opacity: 0.85 }}>
              Lance l’autotest sur ton téléphone pour comprendre pourquoi StatsHub affiche 0 (historique absent, cache non rebuild, profil mismatch…)
            </div>
          )}
        </div>

<div style={sectionBox}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
            <div style={{ fontWeight: 900 }}>{t("settings.account.tools.journal", "Journal")}</div>
            <button
              type="button"
              onClick={() => {
                try {
                  const text = (log || []).slice().reverse().join("\n");
                  navigator.clipboard.writeText(text);
                  addLog("LOG: copied to clipboard");
                } catch {
                  addLog("LOG: copy failed");
                }
              }}
              style={{
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                padding: "6px 10px",
                background: "rgba(255,255,255,0.04)",
                color: theme.textSoft,
                fontWeight: 900,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              {t("settings.account.tools.copyLog", "Copier")}
            </button>
          </div>

          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.35,
              color: "rgba(255,255,255,0.85)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 170,
              overflow: "auto",
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(255,255,255,0.02)",
            }}
          >
            {(log && log.length ? log.slice().reverse().join("\n") : t("settings.account.tools.noLog", "Aucun événement.")) as any}
          </pre>
        </div>
      </div>
    </div>
  );
}
