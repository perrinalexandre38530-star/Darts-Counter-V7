// ============================================
// src/pages/SyncCenter.tsx
// HUB SYNC & PARTAGE (Option C avancée)
// - Export / Import JSON (profil / tout le store)
// - Sync device-à-device (profil ciblé → QR / message / scan QR)
// - Sync Cloud (token / lien, via backend CF)
// - UI full thème + textes via LangContext
// ============================================
import React from "react";
import QRCode from "qrcode"; // ✅ QR local (génération)
import jsQR from "jsqr"; // ✅ Scan QR (caméra)
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadStore, saveStore } from "../lib/storage";
import { supabase } from "../lib/supabaseClient";
import { EventBuffer } from "../lib/sync/EventBuffer";
import SyncStatusChip from "../components/sync/SyncStatusChip";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  // 🔹 optionnel : permet de cibler un profil précis (StatsHub → Sync profil)
  profileId?: string | null;
};

type PanelMode = "none" | "local" | "peer" | "cloud";

export default function SyncCenter({ store, go, profileId }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [mode, setMode] = React.useState<PanelMode>("local");

  async function handleForceSupabaseSync() {
    try {
      setLocalMessage(t("syncCenter.supabase.syncing", "Sync Supabase…"));
      await EventBuffer.syncNow({ limit: 500 });
      setLocalMessage(t("syncCenter.supabase.synced", "Sync Supabase OK."));
    } catch (e) {
      console.warn(e);
      setLocalMessage(t("syncCenter.supabase.syncError", "Sync Supabase impossible."));
    }
  }

  // --- LOCAL EXPORT / IMPORT ---
  const [exportJson, setExportJson] = React.useState<string>("");
  const [importJson, setImportJson] = React.useState<string>("");
  const [localMessage, setLocalMessage] = React.useState<string>("");

  // --- IMPORT REPORT (debug / vérification) ---
  const [importReport, setImportReport] = React.useState<string>("");
  const [importReportAt, setImportReportAt] = React.useState<string>("");

  function summarizeStore(s: any) {
    const profiles = Array.isArray(s?.profiles) ? s.profiles.length : 0;
    const savedKeys = s?.saved && typeof s.saved === "object" ? Object.keys(s.saved).length : 0;
    const settingsKeys = s?.settings && typeof s.settings === "object" ? Object.keys(s.settings).length : 0;
    const hasFriends = !!s?.friends;
    const activeProfileId = s?.activeProfileId ?? null;

    const names = (Array.isArray(s?.profiles) ? s.profiles : [])
      .map((p: any) => p?.name || p?.pseudo || p?.displayName || p?.email || p?.id)
      .filter(Boolean)
      .slice(0, 6);

    return { profiles, savedKeys, settingsKeys, hasFriends, activeProfileId, sampleProfiles: names };
  }

  function buildImportReport(meta: {
    kind: string;
    source: string;
    token?: string;
    note?: string;
  }, before: any, after: any) {
    try {
      const b = summarizeStore(before);
      const a = summarizeStore(after);
      const lines: string[] = [];
      const ts = new Date().toISOString().slice(0, 19).replace("T", " ");
      lines.push(`[${ts}] === Import report ===`);
      lines.push(`kind: ${meta.kind}`);
      lines.push(`source: ${meta.source}`);
      if (meta.token) lines.push(`token: ${meta.token}`);
      if (meta.note) lines.push(`note: ${meta.note}`);
      lines.push(`origin: ${window.location.origin}`);
      lines.push("--- before ---");
      lines.push(`profiles=${b.profiles} | savedKeys=${b.savedKeys} | settingsKeys=${b.settingsKeys} | friends=${b.hasFriends ? "yes" : "no"} | activeProfileId=${b.activeProfileId ?? "(null)"}`);
      if (b.sampleProfiles?.length) lines.push(`profiles(sample): ${b.sampleProfiles.join(", ")}`);
      lines.push("--- after ---");
      lines.push(`profiles=${a.profiles} | savedKeys=${a.savedKeys} | settingsKeys=${a.settingsKeys} | friends=${a.hasFriends ? "yes" : "no"} | activeProfileId=${a.activeProfileId ?? "(null)"}`);
      if (a.sampleProfiles?.length) lines.push(`profiles(sample): ${a.sampleProfiles.join(", ")}`);
      lines.push("--- delta ---");
      lines.push(`profiles: ${b.profiles} → ${a.profiles} (${a.profiles - b.profiles >= 0 ? "+" : ""}${a.profiles - b.profiles})`);
      lines.push(`savedKeys: ${b.savedKeys} → ${a.savedKeys} (${a.savedKeys - b.savedKeys >= 0 ? "+" : ""}${a.savedKeys - b.savedKeys})`);
      lines.push(`settingsKeys: ${b.settingsKeys} → ${a.settingsKeys} (${a.settingsKeys - b.settingsKeys >= 0 ? "+" : ""}${a.settingsKeys - b.settingsKeys})`);

      setImportReport(lines.join("\n"));
      setImportReportAt(ts);
    } catch (e) {
      console.warn("buildImportReport failed", e);
    }
  }

  // --- CLOUD SYNC ---
  const [cloudToken, setCloudToken] = React.useState<string>("");
  const [cloudStatus, setCloudStatus] = React.useState<string>("");

  // --- PEER / DEVICE-À-DEVICE (préparation) ---
  const [peerPayload, setPeerPayload] = React.useState<string>("");
  const [peerStatus, setPeerStatus] = React.useState<string>("");

  // --- Aide ---
  const [showHelp, setShowHelp] = React.useState(false);

  // Helpers
  const safeStringify = (data: any) => {
    try {
      return JSON.stringify(data, null, 2);
    } catch (e) {
      return "";
    }
  };

  // =====================================================
  // IMPORT GÉNÉRIQUE — store complet / profil / peer
  // =====================================================
  async function importParsedPayload(parsed: any) {
    // Store complet
    if (parsed.kind === "dc_store_snapshot_v1" && parsed.store) {
      const before = (await loadStore()) || store;
      const nextStore: Store = parsed.store;
      await saveStore(nextStore);
      buildImportReport({ kind: parsed.kind, source: "cloud/download", token }, before, nextStore);
      buildImportReport({ kind: parsed.kind, source: "local/importParsedPayload" }, before, nextStore);
      return;
    }

    // Profil unique (local ou peer)
    if (
      (parsed.kind === "dc_profile_snapshot_v1" ||
        parsed.kind === "dc_peer_profile_v1") &&
      parsed.profile
    ) {
      const incoming = parsed.profile;
      const current = (await loadStore());
      if (!current) throw new Error("No local store");

      // ✅ Cloud snapshot = données légères (profils/dartsets/settings)
      // ❌ PAS d'historique / stats (trop volumineux)
      const cloudStore: any = {
        profiles: current.profiles ?? [],
        activeProfileId: current.activeProfileId ?? null,
        saved: current.saved ?? {},
        settings: current.settings ?? {},
        // friends peut être utile pour ONLINE, garde-le si présent
        friends: current.friends ?? null,
      };
      const list = current.profiles ?? [];
      const idx = list.findIndex((p: any) => p.id === incoming.id);
      let newProfiles;
      if (idx === -1) {
        newProfiles = [...list, incoming];
      } else {
        newProfiles = [...list];
        newProfiles[idx] = incoming;
      }
      const nextStore: Store = {
        ...current,
        profiles: newProfiles,
      };
      await saveStore(nextStore);
      buildImportReport({ kind: parsed.kind, source: "local/profileImport", note: incoming?.id ? `profileId=${incoming.id}` : undefined }, current, nextStore);
      return;
    }

    // Payload peer ancien (snapshot complet)
    if (parsed.kind === "dc_peer_sync_v1" && parsed.store) {
      const before = (await loadStore()) || store;
      const incomingStore: Store = parsed.store;
      await saveStore(incomingStore);
      buildImportReport({ kind: parsed.kind, source: "peer/legacy", note: "dc_peer_sync_v1 full store" }, before, incomingStore);
      return;
    }

    throw new Error("Unknown payload format");
  }

  // =====================================================
  // 1) EXPORT LOCAL (tout le store / profil)
  // =====================================================
  async function handleExportFullStore() {
    try {
      const current = (await loadStore());
      if (!current) throw new Error("No local store");

      // ✅ Cloud snapshot = données légères (profils/dartsets/settings)
      // ❌ PAS d'historique / stats (trop volumineux)
      const cloudStore: any = {
        profiles: current.profiles ?? [],
        activeProfileId: current.activeProfileId ?? null,
        saved: current.saved ?? {},
        settings: current.settings ?? {},
        // friends peut être utile pour ONLINE, garde-le si présent
        friends: current.friends ?? null,
      };
      const payload = {
        kind: "dc_store_snapshot_v1",
        createdAt: new Date().toISOString(),
        app: "darts-counter-v5",
        store: cloudStore,
      };
      const json = safeStringify(payload);
      setExportJson(json);
      setLocalMessage(
        t(
          "syncCenter.local.exportSuccess",
          "Export complet du store généré ci-dessous."
        )
      );
    } catch (e) {
      console.error(e);
      setLocalMessage(
        t(
          "syncCenter.local.exportError",
          "Erreur pendant l'export du store local."
        )
      );
    }
  }

  // (Optionnel) export uniquement du profil ciblé
  async function handleExportActiveProfile() {
    const profiles = store?.profiles ?? [];
    // Priorité : profileId reçu en param → sinon profil actif → sinon premier profil
    const targetId = profileId ?? store?.activeProfileId ?? null;

    const active =
      (targetId && profiles.find((p) => p.id === targetId)) ??
      profiles[0] ??
      null;

    if (!active) {
      setLocalMessage(
        t(
          "syncCenter.local.noActiveProfile",
          "Aucun profil actif trouvé à exporter."
        )
      );
      return;
    }

    const payload = {
      kind: "dc_profile_snapshot_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      profile: active,
    };
    const json = safeStringify(payload);
    setExportJson(json);
    setLocalMessage(
      t(
        "syncCenter.local.exportProfileSuccess",
        "Export du profil sélectionné généré ci-dessous."
      )
    );
  }

  // Download fichier .dcstats.json
  function handleDownloadJson() {
    if (!exportJson) return;
    try {
      const blob = new Blob([exportJson], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "darts-counter-sync.dcstats.json";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  }

  // Import JSON collé (LOCAL)
  async function handleImportFromTextarea() {
    if (!importJson.trim()) {
      setLocalMessage(
        t(
          "syncCenter.local.importEmpty",
          "Colle d'abord un JSON d'export dans la zone prévue."
        )
      );
      return;
    }

    try {
      const parsed = JSON.parse(importJson);
      await importParsedPayload(parsed);
      setLocalMessage(
        t(
          "syncCenter.local.importStoreOk",
          "Import effectué. Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setLocalMessage(
        t(
          "syncCenter.local.importError",
          "Erreur pendant l'import. Vérifie le JSON ou réessaie."
        )
      );
    }
  }

  // Import JSON depuis un fichier (LOCAL)
  async function handleImportFromFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportJson(text);
      setLocalMessage(
        t(
          "syncCenter.local.fileLoaded",
          "Fichier chargé. Tu peux maintenant lancer l'import via le bouton prévu."
        )
      );
    } catch (err) {
      console.error(err);
      setLocalMessage(
        t(
          "syncCenter.local.fileError",
          "Impossible de lire ce fichier. Réessaie avec un export de l'application."
        )
      );
    } finally {
      e.target.value = "";
    }
  }

  // Copier le JSON (export ou payload peer) dans le presse-papiers
  async function handleCopyToClipboard(value: string) {
    if (!value) return;
    try {
      if (navigator && (navigator as any).clipboard) {
        await (navigator as any).clipboard.writeText(value);
        setPeerStatus(
          t(
            "syncCenter.peer.copied",
            "Contenu copié dans le presse-papiers."
          )
        );
      }
    } catch (e) {
      console.error(e);
    }
  }

  // =====================================================
  // 2) PEER SYNC — Device à device (profil ciblé via QR)
  // =====================================================
  function handlePreparePeerPayload() {
    const profiles = store?.profiles ?? [];
    const targetId = profileId ?? store?.activeProfileId ?? null;

    const active =
      (targetId && profiles.find((p) => p.id === targetId)) ??
      profiles[0] ??
      null;

    if (!active) {
      setPeerPayload("");
      setPeerStatus(
        t(
          "syncCenter.peer.noActiveProfile",
          "Aucun profil à synchroniser. Crée ou sélectionne un profil."
        )
      );
      return;
    }

    const payload = {
      kind: "dc_peer_profile_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      profile: active,
    };

    const json = safeStringify(payload);
    setPeerPayload(json);
    setPeerStatus(
      t(
        "syncCenter.peer.ready",
        "Payload de synchronisation généré. Tu peux le partager (copier, QR, etc.)."
      )
    );
  }

  // Importer directement le payload peer généré / reçu
  async function handlePeerImportFromPayload() {
    if (!peerPayload.trim()) {
      setPeerStatus(
        t(
          "syncCenter.peer.empty",
          "Génère ou colle d'abord un payload avant d'importer."
        )
      );
      return;
    }

    try {
      const parsed = JSON.parse(peerPayload);
      await importParsedPayload(parsed);
      setPeerStatus(
        t(
          "syncCenter.peer.importOk",
          "Payload importé. Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setPeerStatus(
        t(
          "syncCenter.peer.importError",
          "Erreur pendant l'import du payload. Vérifie le contenu ou réessaie."
        )
      );
    }
  }

  // ✅ Import automatique quand on scanne un QR
  async function handleScanPayload(scanned: string) {
    if (!scanned) return;
    setPeerPayload(scanned);

    try {
      const parsed = JSON.parse(scanned);
      await importParsedPayload(parsed);
      setPeerStatus(
        t(
          "syncCenter.peer.importOkFromQr",
          "Payload importé via QR. Relance l'app pour tout recharger proprement."
        )
      );
    } catch (e) {
      console.error(e);
      setPeerStatus(
        t(
          "syncCenter.peer.importErrorFromQr",
          "QR scanné, mais le contenu ne semble pas valide. Tu peux ajuster le JSON puis réessayer."
        )
      );
    }
  }

  // =====================================================
// 3) CLOUD SYNC (Supabase Storage, bucket: backups)
//
// Object path: cloud/<user_id>/<TOKEN>.json
// ✅ Le code (TOKEN) suffit pour retrouver le snapshot sur un autre appareil
//    tant que l'utilisateur est connecté au même compte Supabase.
// =====================================================
function makeCloudToken() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // sans 0/O/1/I
  const group = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `${group(4)}-${group(4)}-${group(4)}`;
}

async function getUserIdOrThrow() {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const uid = data?.user?.id;
  if (!uid) throw new Error("Not authenticated");
  return uid;
}

function formatCloudError(e: any) {
  if (!e) return "Unknown error";
  // Supabase Storage errors often expose: message, statusCode, error, details, hint
  const parts: string[] = [];
  if (e.name) parts.push(String(e.name));
  if (e.status || e.statusCode) parts.push(`status=${e.status ?? e.statusCode}`);
  if (e.error) parts.push(String(e.error));
  if (e.message) parts.push(String(e.message));
  if (e.details) parts.push(String(e.details));
  if (e.hint) parts.push(String(e.hint));
  return parts.filter(Boolean).join(" | ") || String(e);
}

async function maybeGzipJson(json: string): Promise<{ blob: Blob; pathSuffix: string; contentType: string }> {
  // Prefer native CompressionStream when available (Chrome/Edge/Safari recent).
  const cs: any = (window as any).CompressionStream;
  if (cs) {
    try {
      const stream = new Blob([json], { type: "application/json" })
        .stream()
        .pipeThrough(new cs("gzip"));
      const gzBlob = await new Response(stream).blob();
      return { blob: gzBlob, pathSuffix: ".json.gz", contentType: "application/gzip" };
    } catch (err) {
      console.warn("gzip failed, falling back to JSON", err);
    }
  }
  return { blob: new Blob([json], { type: "application/json" }), pathSuffix: ".json", contentType: "application/json" };
}

async function maybeGunzipToText(blob: Blob): Promise<string> {
  const ds: any = (window as any).DecompressionStream;
  if (ds) {
    const stream = blob.stream().pipeThrough(new ds("gzip"));
    return await new Response(stream).text();
  }
  // If no DecompressionStream, try reading as plain text (may fail if gz)
  return await blob.text();
}

async function looksLikeGzip(blob: Blob): Promise<boolean> {
  try {
    const ab = await blob.slice(0, 2).arrayBuffer();
    const u = new Uint8Array(ab);
    return u.length >= 2 && u[0] === 0x1f && u[1] === 0x8b;
  } catch {
    return false;
  }
}



async function handleCloudUpload() {
  setCloudStatus(
    t("syncCenter.cloud.uploading", "Envoi du snapshot vers le cloud…")
  );

  try {
    const uid = await getUserIdOrThrow();
    const current = (await loadStore()) || store;

    // ✅ IMPORTANT: cloud snapshot = données LÉGÈRES.
    // On évite d'envoyer l'historique / stats agrégées (trop gros + inutile).
    // On rebuild au restore.
    const cloudStore: any = {
      profiles: current?.profiles ?? [],
      activeProfileId: current?.activeProfileId ?? null,
      saved: (current as any)?.saved ?? {},
      settings: (current as any)?.settings ?? {},
      friends: (current as any)?.friends ?? null,
    };

    const payload = {
      // on réutilise le même format que l'export local (plus simple / robuste)
      kind: "dc_store_snapshot_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      store: cloudStore,
    };

    const token = makeCloudToken();

    const json = JSON.stringify(payload);

    // ✅ Compat maximale: on écrit TOUJOURS une version .json (non compressée)
    // (évite les soucis de décompression sur certains navigateurs / webviews)
    const pathJson = `cloud/${uid}/${token}.json`;
    const { error: upJsonErr } = await supabase.storage
      .from("backups")
      .upload(pathJson, new Blob([json], { type: "application/json" }), {
        contentType: "application/json",
        upsert: true,
      });
    if (upJsonErr) throw upJsonErr;

    // Optionnel: on ajoute une version .json.gz si possible (gain de taille)
    let extraInfo = "json";
    try {
      const { blob: gzBlob, pathSuffix, contentType } = await maybeGzipJson(json);
      if (pathSuffix === ".json.gz") {
        const pathGz = `cloud/${uid}/${token}.json.gz`;
        const { error: upGzErr } = await supabase.storage
          .from("backups")
          .upload(pathGz, gzBlob, { contentType, upsert: true });
        if (!upGzErr) {
          extraInfo = `json + gzip (${Math.round(gzBlob.size / 1024)} KB)`;
        }
      }
    } catch {
      // ignore gzip failure, .json est déjà uploadé
    }

setCloudToken(token);
    setCloudStatus(
      t(
        "syncCenter.cloud.uploadOk",
        "Snapshot envoyé ! Utilise ce code sur un autre appareil (même compte) pour récupérer tes stats."
      ) + `\n(${extraInfo})`
    );
  } catch (e) {
    console.error(e);
    const msg =
      (e as any)?.message === "Not authenticated"
        ? t(
            "syncCenter.cloud.authRequired",
            "Tu dois être connecté au compte Supabase pour utiliser le cloud."
          )
        : t(
            "syncCenter.cloud.uploadError",
            "Erreur pendant l'envoi vers le cloud."
          ) + `\n${formatCloudError(e)}`;
    setCloudStatus(msg);
  }
}

async function handleCloudDownload() {
  if (!cloudToken.trim()) {
    setCloudStatus(
      t(
        "syncCenter.cloud.tokenMissing",
        "Rentre d'abord un code de synchronisation."
      )
    );
    return;
  }

  setCloudStatus(
    t("syncCenter.cloud.downloading", "Récupération du snapshot…")
  );

  try {
    const uid = await getUserIdOrThrow();
    const token = cloudToken.trim().toUpperCase();
    const pathGz = `cloud/${uid}/${token}.json.gz`;
    const pathJson = `cloud/${uid}/${token}.json`;

    
// ✅ On préfère .json (compat) puis .json.gz
let data: Blob | null = null;
let dlErr: any = null;

{
  const r1 = await supabase.storage.from("backups").download(pathJson);
  if (!r1.error && r1.data) {
    data = r1.data as any;
  } else {
    dlErr = r1.error;
    const r2 = await supabase.storage.from("backups").download(pathGz);
    if (!r2.error && r2.data) {
      data = r2.data as any;
      dlErr = null;
    } else {
      dlErr = r2.error || dlErr;
    }
  }
}

if (dlErr) throw dlErr;
if (!data) throw new Error("No file");

// If gz, decompress; otherwise read as text.
// ⚠️ Supabase retourne souvent Blob.type="" ou "application/octet-stream" → on détecte aussi via magic bytes.
const typeIsGz = (data as any)?.type === "application/gzip" || String((data as any)?.type || "").includes("gzip");
const magicIsGz = await looksLikeGzip(data);
const isGz = typeIsGz || magicIsGz;

let text = "";
if (isGz) {
  const ds: any = (window as any).DecompressionStream;
  if (!ds) throw new Error("GZIP_SNAPSHOT_NO_DECOMPRESS");
  text = await maybeGunzipToText(data);
} else {
  text = await data.text();
}

const parsed = JSON.parse(text);

    // On accepte le payload cloud officiel OU un store snapshot standard.
    if (
      (parsed?.kind === "dc_cloud_snapshot_v1" || parsed?.kind === "dc_store_snapshot_v1") &&
      parsed?.store
    ) {
      const nextStore: Store = parsed.store;
      await saveStore(nextStore);

      setCloudStatus(
        t(
          "syncCenter.cloud.downloadOk",
          "Synchronisation effectuée ! Relance l'app pour tout recharger proprement."
        )
      );

      // Recharge auto (évite les états intermédiaires / caches de modules)
      try {
        setTimeout(() => window.location.reload(), 300);
      } catch {
        // noop
      }
      return;
    }

    throw new Error("Invalid payload");
  } catch (e) {
    console.error(e);
    if ((e as any)?.message === "GZIP_SNAPSHOT_NO_DECOMPRESS") {
      setCloudStatus(
        t(
          "syncCenter.cloud.gzipNoSupport",
          "Ce snapshot est compressé (gzip) mais ce navigateur ne sait pas le décompresser.\n\n➡️ Solution: sur l'appareil SOURCE, appuie sur « Envoyer snapshot » (version compat JSON), puis réessaie la récupération avec le même code."
        )
      );
      return;
    }
    const msg =
      (e as any)?.message === "Not authenticated"
        ? t(
            "syncCenter.cloud.authRequired",
            "Tu dois être connecté au compte Supabase pour utiliser le cloud."
          )
        : t(
            "syncCenter.cloud.downloadError",
            "Erreur pendant la récupération du snapshot. Vérifie le code et réessaie."
          ) + `\n${formatCloudError(e)}`;
    setCloudStatus(msg);
  }
}


async function handleCloudAutoTestA() {
  const logs: string[] = [];
  const ts = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const log = (s: string) => logs.push(`[${ts()}] ${s}`);

  setCloudStatus(t("syncCenter.cloud.testing", "Test cloud…"));

  try {
    log("=== Cloud diagnostic A (SDK download roundtrip) ===");
    log("Bucket: backups");
    const uid = await getUserIdOrThrow();
    log(`User id: ${uid}`);
    log(`Origin: ${window.location.origin}`);

    const prefix = `cloud/${uid}`;
    log(`LIST: ${prefix}`);
    const { data: list, error: listErr } = await supabase.storage
      .from("backups")
      .list(prefix, { limit: 50, offset: 0 });

    if (listErr) throw listErr;
    log(`LIST OK: ${(list || []).length} item(s)`);

    const pingId = makeCloudToken().replace(/-/g, "");
    const pingName = `_roundtrip_${pingId}.json`;
    const pingPath = `${prefix}/${pingName}`;
    log(`UPLOAD test: ${pingPath}`);

    const pingPayload = { ok: true, at: new Date().toISOString(), from: window.location.origin };
    const pingBlob = new Blob([JSON.stringify(pingPayload)], { type: "application/json" });

    const { error: upErr } = await supabase.storage
      .from("backups")
      .upload(pingPath, pingBlob, { upsert: true, contentType: "application/json" });

    if (upErr) throw upErr;
    log("UPLOAD OK (test)");

    log(`DOWNLOAD test (SDK): ${pingPath}`);
    const { data: dl, error: dlErr } = await supabase.storage
      .from("backups")
      .download(pingPath);

    if (dlErr) throw dlErr;
    if (!dl) throw new Error("No data from download()");

    const txt = await (dl as any).text();
    log(`DOWNLOAD OK (${txt.length} chars)`);

    try {
      const parsed = JSON.parse(txt);
      log(`PARSE OK: ok=${parsed?.ok} from=${parsed?.from ?? "?"}`);
    } catch {
      log("PARSE FAILED (downloaded content not valid JSON)");
    }

    setCloudStatus(logs.join("\n"));
  } catch (e) {
    console.error(e);
    log(`ERROR: ${formatCloudError(e)}`);
    setCloudStatus(logs.join("\n"));
  }
}

async function handleCloudAutoTestB() {
  const logs: string[] = [];
  const ts = () => new Date().toISOString().slice(0, 19).replace("T", " ");
  const log = (s: string) => logs.push(`[${ts()}] ${s}`);

  setCloudStatus(t("syncCenter.cloud.testing", "Test cloud…"));

  try {
    log("=== Cloud diagnostic B (Signed URL fetch) ===");
    log("Bucket: backups");
    const uid = await getUserIdOrThrow();
    log(`User id: ${uid}`);
    log(`Origin: ${window.location.origin}`);

    const prefix = `cloud/${uid}`;
    const pingId = makeCloudToken().replace(/-/g, "");
    const pingName = `_signed_${pingId}.json`;
    const pingPath = `${prefix}/${pingName}`;
    log(`UPLOAD test: ${pingPath}`);

    const pingPayload = { ok: true, at: new Date().toISOString(), from: window.location.origin };
    const pingBlob = new Blob([JSON.stringify(pingPayload)], { type: "application/json" });

    const { error: upErr } = await supabase.storage
      .from("backups")
      .upload(pingPath, pingBlob, { upsert: true, contentType: "application/json" });

    if (upErr) throw upErr;
    log("UPLOAD OK (test)");

    log("SIGNED URL (60s) for test file");
    const { data: signed, error: signErr } = await supabase.storage
      .from("backups")
      .createSignedUrl(pingPath, 60);

    if (signErr) throw signErr;
    const url = signed?.signedUrl;
    if (!url) throw new Error("No signedUrl returned");
    log("SIGNED URL OK");

    log("FETCH signed URL");
    const res = await fetch(url, { method: "GET" });
    log(`FETCH status=${res.status}`);
    const txt = await res.text();
    log(`FETCH OK (${txt.length} chars)`);

    try {
      const parsed = JSON.parse(txt);
      log(`PARSE OK: ok=${parsed?.ok} from=${parsed?.from ?? "?"}`);
    } catch {
      log("PARSE FAILED (fetched content not valid JSON)");
    }

    setCloudStatus(logs.join("\n"));
  } catch (e) {
    console.error(e);
    log(`ERROR: ${formatCloudError(e)}`);
    setCloudStatus(logs.join("\n"));
  }
}

// Legacy button: run A then B
async function handleCloudAutoTest() {
  await handleCloudAutoTestA();
  // Add a separator in the log without losing A output
  setCloudStatus((prev) => (prev ? `${prev}

---

` : ""));
  await handleCloudAutoTestB();
}



  return (
    <div
      className="sync-center-page container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        .sync-center-page {
          --title-min: 26px;
          --title-ideal: 8vw;
          --title-max: 40px;
          --card-pad: 14px;
          --menu-gap: 10px;
          --menu-title: 14px;
          --menu-sub: 12px;
          --panel-radius: 16px;
        }
        @media (max-height: 680px), (max-width: 360px) {
          .sync-center-page {
            --title-min: 24px;
            --title-ideal: 7vw;
            --title-max: 34px;
            --card-pad: 12px;
            --menu-gap: 8px;
            --menu-title: 13.5px;
            --menu-sub: 11px;
          }
        }

        /* Cartes avec halo très léger, comme StatsShell */
        .sync-center-card {
          position: relative;
        }
        .sync-center-card::before {
          content: "";
          position: absolute;
          inset: -2px;
          border-radius: 18px;
          background:
            radial-gradient(circle at 15% 0%, rgba(255,255,255,.10), transparent 60%);
          opacity: 0.0;
          pointer-events: none;
          animation: syncCardGlow 3.6s ease-in-out infinite;
          mix-blend-mode: screen;
        }
        @keyframes syncCardGlow {
          0%, 100% {
            opacity: 0.02;
          }
          50% {
            opacity: 0.12;
          }
        }

        .sync-pill-toggle {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          padding: 3px 10px;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.4px;
          text-transform: uppercase;
          border: 1px solid ${theme.borderSoft};
          background: rgba(0,0,0,0.6);
          color: ${theme.textSoft};
          cursor: pointer;
          transition: all .16s ease;
        }
        .sync-pill-toggle.active {
          border-color: ${theme.primary};
          color: #000;
          background: ${theme.primary};
          box-shadow: 0 0 14px ${theme.primary}55;
        }

        .sync-textarea {
          width: 100%;
          min-height: 120px;
          border-radius: 10px;
          border: 1px solid ${theme.borderSoft};
          background: rgba(0,0,0,0.88);
          color: ${theme.text};
          font-size: 11.5px;
          padding: 8px;
          resize: vertical;
        }
      `}</style>

      {/* ===== HEADER ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 18,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 6,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              onClick={() => go("stats")}
              style={{
                border: "none",
                background: "transparent",
                color: theme.textSoft,
                fontSize: 14,
                cursor: "pointer",
                padding: 0,
              }}
            >
              ←
            </button>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.9,
                textTransform: "uppercase",
                color: theme.primary,
              }}
            >
              <span
                style={{
                  fontSize:
                    "clamp(var(--title-min), var(--title-ideal), var(--title-max))",
                  textShadow: `0 0 14px ${theme.primary}66`,
                }}
              >
                {t("syncCenter.title", "SYNC & PARTAGE")}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowHelp((v) => !v)}
            style={{
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.7)",
              color: theme.textSoft,
              padding: "5px 12px",
              fontSize: 11.5,
              fontWeight: 700,
              letterSpacing: 0.4,
              textTransform: "uppercase",
              cursor: "pointer",
              boxShadow: `0 0 10px ${theme.primary}33`,
            }}
          >
            {t("syncCenter.help.button", "Aide")}
          </button>
        </div>

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.35,
            color: theme.textSoft,
            maxWidth: 340,
          }}
        >
          {t(
            "syncCenter.subtitle",
            "Export, import et synchronisation entre appareils ou via le cloud, sans perdre tes stats."
          )}
        </div>

        {showHelp && <HelpBlock theme={theme} t={t} />}
      </div>

      {/* ===== CARDS (choix du mode) ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          display: "flex",
          flexDirection: "column",
          gap: "var(--menu-gap)",
          paddingInline: 12,
          marginBottom: 10,
        }}
      >
        {/* LOCAL */}
        <SyncCard
          theme={theme}
          active={mode === "local"}
          onClick={() => setMode("local")}
          title={t("syncCenter.card.local.title", "Export / Import local")}
          subtitle={t(
            "syncCenter.card.local.subtitle",
            "Sauvegarde ou restaure tes stats via un fichier ou un JSON."
          )}
        />

        {/* PEER / DEVICE-À-DEVICE */}
        <SyncCard
          theme={theme}
          active={mode === "peer"}
          onClick={() => setMode("peer")}
          title={t(
            "syncCenter.card.peer.title",
            "Sync directe avec un ami (device à device)"
          )}
          subtitle={t(
            "syncCenter.card.peer.subtitle",
            "Partage ton profil actif via un QR ou un message."
          )}
        />

        {/* CLOUD */}
        <SyncCard
          theme={theme}
          active={mode === "cloud"}
          onClick={() => setMode("cloud")}
          title={t("syncCenter.card.cloud.title", "Sync Cloud (code)")}
          subtitle={t(
            "syncCenter.card.cloud.subtitle",
            "Envoie un snapshot vers le cloud et récupère-le sur un autre appareil avec un code."
          )}
        />
      </div>

      {/* ===== PANNEAU DÉTAILLÉ ===== */}
      <div
        style={{
          width: "100%",
          maxWidth: 520,
          paddingInline: 12,
          marginBottom: 12,
        }}
      >
        {mode === "local" && (
          <LocalPanel
            theme={theme}
            t={t}
            exportJson={exportJson}
            importJson={importJson}
            message={localMessage}
            importReport={importReport}
            importReportAt={importReportAt}
            onClearImportReport={() => { setImportReport(""); setImportReportAt(""); }}
            onChangeImport={setImportJson}
            onExportStore={handleExportFullStore}
            onExportActiveProfile={handleExportActiveProfile}
            onDownload={handleDownloadJson}
            onImport={handleImportFromTextarea}
            onImportFile={handleImportFromFile}
            onForceSupabaseSync={handleForceSupabaseSync}
          />
        )}

        {mode === "peer" && (
          <PeerPanel
            theme={theme}
            t={t}
            payload={peerPayload}
            status={peerStatus}
            onGenerate={handlePreparePeerPayload}
            onCopy={() => handleCopyToClipboard(peerPayload)}
            onImport={handlePeerImportFromPayload}
            onScan={handleScanPayload}
          />
        )}

        {mode === "cloud" && (
          <CloudPanel
            theme={theme}
            t={t}
            token={cloudToken}
            status={cloudStatus}
            importReport={importReport}
            importReportAt={importReportAt}
            onClearImportReport={() => { setImportReport(""); setImportReportAt(""); }}
            onTokenChange={setCloudToken}
            onUpload={handleCloudUpload}
            onDownload={handleCloudDownload}
            onAutoTestA={handleCloudAutoTestA}
            onAutoTestB={handleCloudAutoTestB}
          />
        )}
      </div>

      {/* Espace BottomNav */}
      <div style={{ height: 80 }} />
    </div>
  );
}

/* --------------------------------------------
 * BLOC D'AIDE — GUIDE ÉTAPE PAR ÉTAPE
 * -------------------------------------------*/
function HelpBlock({
  theme,
  t,
}: {
  theme: any;
  t: (k: string, f: string) => string;
}) {
  return (
    <div
      style={{
        marginTop: 10,
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background:
          "linear-gradient(145deg, rgba(0,0,0,0.85), rgba(40,40,40,0.85))",
        boxShadow: "0 14px 32px rgba(0,0,0,.75)",
        fontSize: 11.5,
        lineHeight: 1.45,
        color: theme.textSoft,
      }}
    >
      <div
        style={{
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          marginBottom: 6,
          color: theme.primary,
        }}
      >
        {t("syncCenter.help.title", "Comment utiliser la synchronisation ?")}
      </div>

      {/* 1) EXPORT / IMPORT LOCAL */}
      <div
        style={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontSize: 11.5,
          marginBottom: 2,
          color: theme.text,
        }}
      >
        1. {t("syncCenter.help.sectionLocal", "Export / Import local")}
      </div>
      <ol
        style={{
          paddingLeft: 18,
          marginTop: 0,
          marginBottom: 6,
        }}
      >
        <li>
          {t(
            "syncCenter.help.local.step1",
            "Choisis le bloc « Export / Import local » dans la liste."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.local.step2",
            "Appuie sur « Exporter TOUT le store » pour sauvegarder toutes tes stats, ou sur « Exporter profil actif » pour ne sauvegarder qu’un profil."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.local.step3",
            "Le JSON apparaît dans la zone du haut. Tu peux soit le copier / coller, soit appuyer sur « Télécharger (.dcstats.json) » pour récupérer un fichier."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.local.step4",
            "Sur un autre appareil : ouvre cette même page, va dans « Export / Import local », colle le JSON dans la zone prévue OU appuie sur « Choisir un fichier » pour importer le fichier .dcstats.json."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.local.step5",
            "Appuie sur « Importer JSON ». Lorsque c’est terminé, relance l’app pour recharger toutes les données proprement."
          )}
        </li>
      </ol>

      {/* 2) SYNC DIRECTE AVEC UN AMI */}
      <div
        style={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontSize: 11.5,
          marginBottom: 2,
          color: theme.text,
        }}
      >
        2.{" "}
        {t(
          "syncCenter.help.sectionPeer",
          "Sync directe avec un ami (device à device)"
        )}
      </div>
      <ol
        style={{
          paddingLeft: 18,
          marginTop: 0,
          marginBottom: 6,
        }}
      >
        <li>
          {t(
            "syncCenter.help.peer.step1",
            "Sur l’appareil QUI ENVOIE le profil : choisis le bloc « Sync directe avec un ami »."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.peer.step2",
            "Appuie sur « Générer payload de sync ». Le profil ciblé (profil actif ou profil passé en paramètre) est transformé en JSON."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.peer.step3",
            "Pour partager : soit tu appuies sur « Copier pour partage » pour envoyer le JSON par message, soit tu appuies sur « Afficher QR » pour générer un QR Code à montrer à ton ami."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.peer.step4",
            "Sur l’appareil QUI REÇOIT : ouvre cette page, va dans « Sync directe avec un ami », puis appuie sur « Scanner un QR » et vise le QR affiché sur le premier appareil."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.peer.step5",
            "Le profil est importé automatiquement. Tu peux aussi coller le JSON reçu dans la zone « Payload généré » et appuyer sur « Importer ce payload »."
          )}
        </li>
      </ol>

      {/* 3) SYNC CLOUD (CODE) */}
      <div
        style={{
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: 0.4,
          fontSize: 11.5,
          marginBottom: 2,
          color: theme.text,
        }}
      >
        3. {t("syncCenter.help.sectionCloud", "Sync Cloud (code)")}
      </div>
      <ol
        style={{
          paddingLeft: 18,
          marginTop: 0,
          marginBottom: 6,
        }}
      >
        <li>
          {t(
            "syncCenter.help.cloud.step1",
            "Sur l’appareil source : choisis le bloc « Sync Cloud (code) » puis appuie sur « Envoyer snapshot »."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.cloud.step2",
            "Un code de synchronisation est généré (ex : 7FQ9-L2KD-8ZP3). Note-le ou envoie-le à ton autre appareil."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.cloud.step3",
            "Sur l’appareil cible : ouvre aussi « Sync Cloud (code) », tape le code reçu dans le champ prévu puis appuie sur « Récupérer avec ce code »."
          )}
        </li>
        <li>
          {t(
            "syncCenter.help.cloud.step4",
            "Une fois la récupération terminée, relance l’app pour recharger toutes les stats synchronisées."
          )}
        </li>
      </ol>

      <div
        style={{
          marginTop: 4,
          opacity: 0.8,
        }}
      >
        {t(
          "syncCenter.help.tip",
          "Astuce : après n’importe quel import (local, QR ou cloud), un redémarrage de l’application garantit que toutes les stats et profils sont bien à jour."
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------
 * CARTES DE CHOIX DE MODE
 * -------------------------------------------*/
function SyncCard({
  theme,
  active,
  title,
  subtitle,
  onClick,
}: {
  theme: any;
  active: boolean;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <div
      className="sync-center-card"
      style={{
        position: "relative",
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${
          active ? theme.primary : theme.primary + "22"
        }`,
        overflow: "hidden",
      }}
    >
      <button
        onClick={onClick}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "var(--card-pad)",
          background: "transparent",
          border: "none",
          cursor: "pointer",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            textAlign: "left",
          }}
        >
          <div
            style={{
              fontSize: "var(--menu-title)",
              fontWeight: 900,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 10px ${theme.primary}55`,
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: "var(--menu-sub)",
              color: theme.textSoft,
              lineHeight: 1.3,
              maxWidth: 360,
            }}
          >
            {subtitle}
          </div>
        </div>
        <div className={`sync-pill-toggle ${active ? "active" : ""}`}>
          {active ? "ACTIF" : "VOIR"}
        </div>
      </button>
    </div>
  );
}

/* --------------------------------------------
 * PANEL LOCAL EXPORT / IMPORT
 * -------------------------------------------*/
function LocalPanel({
  theme,
  t,
  exportJson,
  importJson,
  message,
  importReport,
  importReportAt,
  onClearImportReport,
  onChangeImport,
  onExportStore,
  onExportActiveProfile,
  onDownload,
  onImport,
  onImportFile,
  onForceSupabaseSync,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  exportJson: string;
  importJson: string;
  message: string;
  importReport: string;
  importReportAt: string;
  onClearImportReport: () => void;
  onChangeImport: (v: string) => void;
  onExportStore: () => void;
  onExportActiveProfile: () => void;
  onDownload: () => void;
  onImport: () => void;
  onImportFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onForceSupabaseSync: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, marginBottom: 10 }}>
        <SyncStatusChip />
        <button
          onClick={onForceSupabaseSync}
          style={{
            padding: "8px 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,0.16)",
            background: "rgba(255,255,255,0.06)",
            color: "white",
            cursor: "pointer",
            fontWeight: 800,
            letterSpacing: 0.2,
          }}
        >
          {t("syncCenter.supabase.force", "Forcer sync")}
        </button>
      </div>

      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t("syncCenter.local.title", "Export / Import local")}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.local.desc",
          "Permet de sauvegarder l'intégralité de tes stats dans un fichier, ou de restaurer un export sur un autre appareil."
        )}
      </div>

      {/* Actions export */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onExportStore} style={buttonSmall(theme)}>
          {t("syncCenter.local.btnExportStore", "Exporter TOUT le store")}
        </button>
        <button onClick={onExportActiveProfile} style={buttonSmall(theme)}>
          {t("syncCenter.local.btnExportProfile", "Exporter profil actif")}
        </button>
        <button
          onClick={onDownload}
          style={buttonSmall(theme)}
          disabled={!exportJson}
        >
          {t(
            "syncCenter.local.btnDownload",
            "Télécharger (.dcstats.json)"
          )}
        </button>
      </div>

      {/* Zone JSON export (readonly) */}
      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.local.exportLabel",
            "JSON d'export (tu peux aussi le copier / coller vers un autre appareil) :"
          )}
        </div>
        <textarea className="sync-textarea" readOnly value={exportJson} />
      </div>

      {/* Import */}
      <div style={{ marginTop: 10 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.local.importLabel",
            "Colle ici un JSON d'export, ou importe un fichier :"
          )}
        </div>
        <textarea
          className="sync-textarea"
          value={importJson}
          onChange={(e) => onChangeImport(e.target.value)}
          placeholder={t("syncCenter.local.importPlaceholder", "{ ... }")}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 6,
            flexWrap: "wrap",
          }}
        >
          <button onClick={onImport} style={buttonSmall(theme)}>
            {t("syncCenter.local.btnImport", "Importer JSON")}
          </button>
          <label style={{ ...buttonSmall(theme), cursor: "pointer" }}>
            <span>
              {t("syncCenter.local.btnChooseFile", "Choisir un fichier")}
            </span>
            <input
              type="file"
              accept=".json,.dcstats.json,application/json"
              style={{ display: "none" }}
              onChange={onImportFile}
            />
          </label>
        </div>
      </div>

      {message && (
        <div
          style={{
            marginTop: 8,
            fontSize: 11,
            color: theme.textSoft,
            whiteSpace: "pre-wrap",
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
        >
          {message}
        </div>
      )}
      {importReport && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px dashed ${theme.borderSoft}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: theme.text,
              }}
            >
              {t("syncCenter.importReport.title", "Dernier import (rapport)")}
              {importReportAt ? ` — ${importReportAt}` : ""}
            </div>
            <button onClick={onClearImportReport} style={buttonSmall(theme)}>
              {t("syncCenter.importReport.clear", "Effacer")}
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: theme.textSoft,
              whiteSpace: "pre-wrap",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: 12,
              padding: 10,
            }}
          >
            {importReport}
          </div>
        </div>
      )}
    </div>
  );
}

/* --------------------------------------------
 * PANEL PEER / DEVICE-À-DEVICE
 * -------------------------------------------*/
function PeerPanel({
  theme,
  t,
  payload,
  status,
  onGenerate,
  onCopy,
  onImport,
  onScan,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  payload: string;
  status: string;
  onGenerate: () => void;
  onCopy: () => void;
  onImport: () => void;
  onScan: (scanned: string) => void;
}) {
  const [qrUrl, setQrUrl] = React.useState<string>("");
  const [showScanner, setShowScanner] = React.useState(false);

  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t(
          "syncCenter.peer.titlePanel",
          "Sync directe avec un ami (device à device)"
        )}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.peer.desc",
          "Génère un payload de ton profil actif que tu pourras partager via QR code, message ou e-mail. Sur l'autre appareil, scanne le QR ou importe le payload pour récupérer le profil."
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onGenerate} style={buttonSmall(theme)}>
          {t("syncCenter.peer.btnGenerate", "Générer payload de sync")}
        </button>
        <button
          onClick={onCopy}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t(
            "syncCenter.peer.btnCopy",
            "Copier pour partage (QR / message)"
          )}
        </button>
        <button
          onClick={async () => {
            if (!payload) return;
            try {
              // 🔻 Pour le QR : on enlève l'avatar en base64 si présent
              let toEncode = payload;
              try {
                const parsed = JSON.parse(payload);
                if (
                  (parsed.kind === "dc_peer_profile_v1" ||
                    parsed.kind === "dc_profile_snapshot_v1") &&
                  parsed.profile
                ) {
                  const slimProfile = { ...parsed.profile };
                  if (typeof slimProfile.avatarDataUrl === "string") {
                    delete slimProfile.avatarDataUrl;
                  }
                  const slimPayload = { ...parsed, profile: slimProfile };
                  toEncode = JSON.stringify(slimPayload);
                }
              } catch {
                // si parse foire, on encode le payload brut
              }

              const url = await QRCode.toDataURL(toEncode, {
                width: 260,
                margin: 1,
                color: {
                  dark: "#000000",
                  light: "#ffffff",
                },
              });
              setQrUrl(url);
            } catch (err) {
              console.error("QR generation failed", err);
              setQrUrl("");
            }
          }}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t("syncCenter.peer.btnShowQr", "Afficher QR")}
        </button>
        <button
          onClick={() => setShowScanner(true)}
          style={buttonSmall(theme)}
        >
          {t("syncCenter.peer.btnScanQr", "Scanner un QR")}
        </button>
        <button
          onClick={onImport}
          style={buttonSmall(theme)}
          disabled={!payload}
        >
          {t("syncCenter.peer.btnImport", "Importer ce payload")}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.peer.payloadLabel",
            "Payload généré (format JSON, à transformer en QR ou à envoyer) :"
          )}
        </div>
        <textarea className="sync-textarea" readOnly value={payload} />
      </div>

      {qrUrl && (
        <div style={{ marginTop: 10, marginBottom: 8, textAlign: "center" }}>
          <img
            src={qrUrl}
            alt="QR"
            style={{
              width: 220,
              height: 220,
              margin: "0 auto",
              borderRadius: 12,
              boxShadow: `0 0 18px ${theme.primary}55`,
              background: "#ffffff",
              padding: 6,
            }}
          />
        </div>
      )}

      {status && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: theme.textSoft,
            whiteSpace: "pre-wrap",
          }}
        >
          {status}
        </div>
      )}

      {importReport && (
        <div
          style={{
            marginTop: 10,
            paddingTop: 10,
            borderTop: `1px dashed ${theme.borderSoft}`,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 8,
              marginBottom: 6,
            }}
          >
            <div
              style={{
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: theme.text,
              }}
            >
              {t("syncCenter.importReport.title", "Dernier import (rapport)")}
              {importReportAt ? ` — ${importReportAt}` : ""}
            </div>
            <button onClick={onClearImportReport} style={buttonSmall(theme)}>
              {t("syncCenter.importReport.clear", "Effacer")}
            </button>
          </div>

          <div
            style={{
              fontSize: 11,
              color: theme.textSoft,
              whiteSpace: "pre-wrap",
              fontFamily:
                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
              background: "rgba(0,0,0,0.55)",
              border: `1px solid ${theme.borderSoft}`,
              borderRadius: 12,
              padding: 10,
            }}
          >
            {importReport}
          </div>
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 10.5,
          color: theme.textSoft,
          opacity: 0.8,
        }}
      >
        {t(
          "syncCenter.peer.todo",
          "Depuis un autre appareil : ouvre ce menu, appuie sur « Scanner un QR », vise le code généré, et le profil sera importé automatiquement."
        )}
      </div>

      {showScanner && (
        <QrScannerOverlay
          theme={theme}
          t={t}
          onClose={() => setShowScanner(false)}
          onResult={(text) => {
            onScan(text);
            setShowScanner(false);
          }}
        />
      )}
    </div>
  );
}

/* --------------------------------------------
 * OVERLAY SCANNEUR QR (caméra)
 * -------------------------------------------*/
function QrScannerOverlay({
  theme,
  t,
  onClose,
  onResult,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  onClose: () => void;
  onResult: (text: string) => void;
}) {
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = React.useState<string>("");

  React.useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number | null = null;
    let cancelled = false;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setError(
            t(
              "syncCenter.peer.cameraUnavailable",
              "Caméra non disponible sur cet appareil."
            )
          );
          return;
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play();

        const scan = () => {
          if (cancelled) return;
          const v = videoRef.current;
          const c = canvasRef.current;
          if (!v || !c) {
            rafId = requestAnimationFrame(scan);
            return;
          }

          const w = v.videoWidth;
          const h = v.videoHeight;
          if (!w || !h) {
            rafId = requestAnimationFrame(scan);
            return;
          }

          c.width = w;
          c.height = h;
          const ctx = c.getContext("2d");
          if (!ctx) {
            rafId = requestAnimationFrame(scan);
            return;
          }

          ctx.drawImage(v, 0, 0, w, h);
          const imageData = ctx.getImageData(0, 0, w, h);

          // @ts-ignore jsQR types
          const code = jsQR(imageData.data, w, h);
          if (code && code.data) {
            onResult(code.data);
            stopCamera();
            onClose();
            return;
          }

          rafId = requestAnimationFrame(scan);
        };

        scan();
      } catch (e) {
        console.error(e);
        setError(
          t(
            "syncCenter.peer.cameraError",
            "Impossible d'accéder à la caméra. Vérifie les autorisations."
          )
        );
      }
    }

    function stopCamera() {
      cancelled = true;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
      if (stream) {
        stream.getTracks().forEach((tr) => tr.stop());
        stream = null;
      }
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [onClose, onResult, t]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.85)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        style={{
          maxWidth: 420,
          width: "100%",
          borderRadius: 18,
          background: theme.card,
          border: `1px solid ${theme.borderSoft}`,
          boxShadow: "0 18px 40px rgba(0,0,0,.85)",
          padding: 14,
        }}
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 800,
            color: theme.primary,
            marginBottom: 6,
            textTransform: "uppercase",
            letterSpacing: 0.6,
          }}
        >
          {t("syncCenter.peer.scanTitle", "Scanner un QR")}
        </div>
        <div
          style={{
            fontSize: 12.5,
            lineHeight: 1.4,
            color: theme.textSoft,
            marginBottom: 10,
          }}
        >
          {t(
            "syncCenter.peer.scanDesc",
            "Vise le QR de synchronisation depuis l'autre appareil. Le profil sera importé automatiquement sur celui-ci."
          )}
        </div>

        <div
          style={{
            borderRadius: 16,
            overflow: "hidden",
            border: `1px solid ${theme.primary}55`,
            boxShadow: `0 0 18px ${theme.primary}55`,
            marginBottom: 10,
            background: "#000",
            aspectRatio: "3 / 4",
            position: "relative",
          }}
        >
          <video
            ref={videoRef}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
            muted
            playsInline
          />
          <div
            style={{
              position: "absolute",
              inset: "15%",
              borderRadius: 16,
              border: `2px solid ${theme.primary}`,
              boxShadow: `0 0 24px ${theme.primary}AA`,
              pointerEvents: "none",
            }}
          />
        </div>

        <canvas ref={canvasRef} style={{ display: "none" }} />

        {error && (
          <div
            style={{
              fontSize: 11.5,
              color: "#ff7c7c",
              marginBottom: 8,
            }}
          >
            {error}
          </div>
        )}

        <div style={{ textAlign: "right" }}>
          <button
            onClick={onClose}
            style={{
              borderRadius: 999,
              border: "none",
              padding: "6px 16px",
              fontSize: 12.5,
              fontWeight: 700,
              background: theme.primary,
              color: "#000",
              cursor: "pointer",
              boxShadow: `0 0 14px ${theme.primary}55`,
            }}
          >
            {t("syncCenter.peer.scanCancel", "Fermer")}
          </button>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------------------
 * PANEL CLOUD SYNC
 * -------------------------------------------*/
function CloudPanel({
  theme,
  t,
  token,
  status,
  importReport,
  importReportAt,
  onClearImportReport,
  onTokenChange,
  onUpload,
  onDownload,
  onAutoTestA,
  onAutoTestB,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  token: string;
  status: string;
  importReport: string;
  importReportAt: string;
  onClearImportReport: () => void;
  onTokenChange: (v: string) => void;
  onUpload: () => void;
  onDownload: () => void;
  onAutoTestA?: () => void;
  onAutoTestB?: () => void;
}) {
  return (
    <div
      style={{
        borderRadius: "var(--panel-radius)",
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        padding: 12,
        boxShadow: "0 18px 40px rgba(0,0,0,.85)",
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          letterSpacing: 0.6,
          textTransform: "uppercase",
          color: theme.primary,
          marginBottom: 8,
        }}
      >
        {t("syncCenter.cloud.titlePanel", "Sync Cloud (code)")}
      </div>

      <div
        style={{
          fontSize: 11.5,
          color: theme.textSoft,
          marginBottom: 8,
          lineHeight: 1.35,
        }}
      >
        {t(
          "syncCenter.cloud.desc",
          "Envoie un snapshot de tes stats vers le cloud. Tu reçois un code unique à saisir sur un autre appareil pour tout récupérer."
        )}
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onUpload} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnUpload", "Envoyer snapshot")}
        </button>
        <button onClick={onAutoTestA} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnAutoTestA", "Auto-test A (SDK download)")}
        </button>
        <button onClick={onAutoTestB} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnAutoTestB", "Auto-test B (Signed URL)")}
        </button>
      </div>

      <div style={{ marginBottom: 8 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            marginBottom: 4,
            color: theme.textSoft,
          }}
        >
          {t(
            "syncCenter.cloud.tokenLabel",
            "Code de synchronisation (cloud) :"
          )}
        </div>
        <input
          type="text"
          value={token}
          onChange={(e) => onTokenChange(e.target.value)}
          placeholder={t(
            "syncCenter.cloud.tokenPlaceholder",
            "Ex : 7FQ9-L2KD-8ZP3"
          )}
          style={{
            width: "100%",
            borderRadius: 999,
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.75)",
            color: theme.text,
            fontSize: 12,
            padding: "6px 10px",
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: 6,
          marginBottom: 8,
        }}
      >
        <button onClick={onDownload} style={buttonSmall(theme)}>
          {t("syncCenter.cloud.btnDownload", "Récupérer avec ce code")}
        </button>
      </div>

      {status && (
        <div
          style={{
            marginTop: 6,
            fontSize: 11,
            color: theme.textSoft,
          }}
        >
          {status}
        </div>
      )}

      <div
        style={{
          marginTop: 8,
          fontSize: 10.5,
          color: theme.textSoft,
          opacity: 0.8,
        }}
      >
        {t(
          "syncCenter.cloud.todo",
          "Stockage Cloud via Supabase Storage (bucket: backups). Le code fonctionne entre appareils connectés au même compte."
        )}
      </div>
    </div>
  );
}

/* --------------------------------------------
 * STYLE BOUTONS
 * -------------------------------------------*/
function buttonSmall(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    border: "none",
    padding: "5px 12px",
    fontSize: 11.5,
    fontWeight: 700,
    letterSpacing: 0.4,
    textTransform: "uppercase",
    background: theme.primary,
    color: "#000",
    cursor: "pointer",
    boxShadow: `0 0 14px ${theme.primary}55`,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    whiteSpace: "nowrap",
  };
}