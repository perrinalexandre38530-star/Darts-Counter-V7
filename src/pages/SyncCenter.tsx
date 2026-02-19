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

  // --- CLOUD SYNC ---
  const [cloudToken, setCloudToken] = React.useState<string>("");
  const [cloudStatus, setCloudStatus] = React.useState<string>("");
  const [cloudBusy, setCloudBusy] = React.useState<boolean>(false);

  // Diagnostics / auto-test (to avoid "patches à l'aveugle")
  const [diagBusy, setDiagBusy] = React.useState(false);
  const [diagLog, setDiagLog] = React.useState<string[]>([]);
  const pushDiag = React.useCallback((line: string) => {
    setDiagLog((p) => [...p, `[${new Date().toISOString()}] ${line}`]);
  }, []);

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
      const nextStore: Store = parsed.store;
      await saveStore(nextStore);
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
      return;
    }

    // Payload peer ancien (snapshot complet)
    if (parsed.kind === "dc_peer_sync_v1" && parsed.store) {
      const incomingStore: Store = parsed.store;
      await saveStore(incomingStore);
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
// 3) CLOUD SYNC (Supabase Storage, bucket "backups")
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

async function handleCloudUpload() {
  setCloudBusy(true);
  setCloudStatus(
    t("syncCenter.cloud.uploading", "Envoi du snapshot vers le cloud…")
  );

  try {
    const uid = await getUserIdOrThrow();
    const current = (await loadStore()) || store;

    const payload = {
      kind: "dc_cloud_snapshot_v1",
      createdAt: new Date().toISOString(),
      app: "darts-counter-v5",
      store: current,
    };

    const token = makeCloudToken();
    // Build snapshot payload
    const jsonStr = JSON.stringify(payload);
    const rawBytes = approxBytesOfString(jsonStr);

    // Prefer gzip to stay under Storage limits (your bucket is 10MB).
    const gzBlob = await gzipStringToBlob(jsonStr);

    const ext = gzBlob ? "json.gz" : "json";
    const contentType = gzBlob ? "application/gzip" : "application/json";
    const blob = gzBlob ?? new Blob([jsonStr], { type: "application/json" });

    log(`Snapshot bytes (raw): ${rawBytes}`);
    if (gzBlob) log(`Snapshot bytes (gzip): ${gzBlob.size}`);

    const path = `cloud/${uid}/${token}.${ext}`;
const { error: upErr } = await supabase.storage
      .from("backups")
      .upload(path, blob, {
        contentType: contentType,
        // Each snapshot uses a unique token -> no need to upsert.
        // Keeping upsert=false also avoids requiring UPDATE policies.
        upsert: false,
      });

    if (upErr) throw upErr;

    setCloudToken(token);
    setCloudStatus(
      t(
        "syncCenter.cloud.uploadOk",
        "Snapshot envoyé ! Utilise ce code sur un autre appareil (même compte) pour récupérer tes stats."
      )
    );
  } catch (e) {
    console.error(e);
    const rawMsg = String((e as any)?.message ?? e ?? "");
    const msg =
      (e as any)?.message === "Not authenticated"
        ? t(
            "syncCenter.cloud.authRequired",
            "Tu dois être connecté au compte Supabase pour utiliser le cloud."
          )
        : t(
            "syncCenter.cloud.uploadError",
            "Erreur pendant l'envoi vers le cloud. Réessaie plus tard."
          );
    setCloudStatus(msg);

    // Auto-launch diagnostics when we see a typical RLS failure.
    if (rawMsg.toLowerCase().includes("row-level security") || rawMsg.toLowerCase().includes("rls")) {
      runCloudDiagnostics().catch(() => {});
    }
  } finally {
    setCloudBusy(false);
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
    const path = `cloud/${uid}/${token}.json`;

    const { data, error: dlErr } = await supabase.storage
      .from("backups")
      .download(path);

    if (dlErr) throw dlErr;
    if (!data) throw new Error("No file");

    let text: string | null = null;

    if (path.endsWith(".gz")) {
      text = await ungzipBlobToString(data);
      if (!text) throw new Error("Gzip not supported on this browser (DecompressionStream missing).");
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
      return;
    }

    throw new Error("Invalid payload");
  } catch (e) {
    console.error(e);
    const msg =
      (e as any)?.message === "Not authenticated"
        ? t(
            "syncCenter.cloud.authRequired",
            "Tu dois être connecté au compte Supabase pour utiliser le cloud."
          )
        : t(
            "syncCenter.cloud.downloadError",
            "Erreur pendant la récupération du snapshot. Vérifie le code et réessaie."
          );
    setCloudStatus(msg);
  }
}

// =====================================================
// AUTO-TEST CLOUD (diagnostic)
// =====================================================
async function runCloudDiagnostics() {
  if (diagBusy) return;
  setDiagBusy(true);
  setDiagLog([]);
  try {
    pushDiag("=== Cloud diagnostic ===");
    pushDiag("Bucket: backups");

    const { data: sess } = await supabase.auth.getSession();
    pushDiag(`Session: ${sess?.session ? "OK" : "NULL"}`);
    if (sess?.session?.user?.id) pushDiag(`Session user.id: ${sess.session.user.id}`);

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr) pushDiag(`auth.getUser ERROR: ${userErr.message}`);
    const uid = userData?.user?.id;
    pushDiag(`User id: ${uid ?? "NULL"}`);
    pushDiag(`User email: ${userData?.user?.email ?? "(none)"}`);
    if (!uid) {
      pushDiag("STOP: No user id -> request is unauthenticated -> RLS will fail.");
      return;
    }

    // 1) LIST (requires SELECT policy)
    pushDiag(`LIST: cloud/${uid}`);
    const listRes = await supabase.storage
      .from("backups")
      .list(`cloud/${uid}`, { limit: 10, sortBy: { column: "created_at", order: "desc" } as any });
    if (listRes.error) pushDiag(`LIST ERROR: ${listRes.error.message}`);
    else pushDiag(`LIST OK: ${listRes.data?.length ?? 0} item(s)`);

    // 2) UPLOAD a tiny file (requires INSERT policy)
    const pingCode = `PING-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    const pingPath = `cloud/${uid}/_ping_${pingCode}.txt`;
    pushDiag(`UPLOAD test: ${pingPath}`);
    const pingBlob = new Blob([`ping ${new Date().toISOString()}`], { type: "application/json" });
    const up = await supabase.storage
      .from("backups")
      .upload(pingPath, pingBlob, { upsert: false, contentType: "text/plain" });
    if (up.error) {
      pushDiag(`UPLOAD ERROR: ${up.error.message}`);
      pushDiag(
        "If this is an RLS error: ensure INSERT policy on storage.objects uses WITH CHECK and matches: bucket_id='backups' AND (storage.foldername(name))[1]='cloud' AND (storage.foldername(name))[2]=auth.uid()::text."
      );
      pushDiag(
        "If you ever set upsert:true, you also need an UPDATE policy with the same checks."
      );
    } else {
      pushDiag("UPLOAD OK (test)");
    }

    // 3) Signed URL (requires SELECT policy)
    pushDiag("SIGNED URL (60s) for test file");
    const signed = await supabase.storage.from("backups").createSignedUrl(pingPath, 60);
    if (signed.error) pushDiag(`SIGNED URL ERROR: ${signed.error.message}`);
    else pushDiag("SIGNED URL OK");
  } catch (e: any) {
    pushDiag(`DIAG FATAL: ${e?.message ?? e}`);
  } finally {
    setDiagBusy(false);
  }
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
            busy={cloudBusy}
            diagBusy={diagBusy}
            diagLog={diagLog}
            onDiag={runCloudDiagnostics}
            onTokenChange={setCloudToken}
            onUpload={handleCloudUpload}
            onDownload={handleCloudDownload}
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
          }}
        >
          {message}
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
  busy,
  diagBusy,
  diagLog,
  onDiag,
  onTokenChange,
  onUpload,
  onDownload,
}: {
  theme: any;
  t: (k: string, f: string) => string;
  token: string;
  status: string;
  busy: boolean;
  diagBusy: boolean;
  diagLog: string[];
  onDiag: () => void;
  onTokenChange: (v: string) => void;
  onUpload: () => void;
  onDownload: () => void;
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
	        <button
	          onClick={onUpload}
	          disabled={busy || diagBusy}
	          style={{
	            ...buttonSmall(theme),
	            opacity: busy || diagBusy ? 0.6 : 1,
	            cursor: busy || diagBusy ? "not-allowed" : "pointer",
	          }}
	        >
          {t("syncCenter.cloud.btnUpload", "Envoyer snapshot")}
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
	        <button
	          onClick={onDownload}
	          disabled={busy || diagBusy}
	          style={{
	            ...buttonSmall(theme),
	            opacity: busy || diagBusy ? 0.6 : 1,
	            cursor: busy || diagBusy ? "not-allowed" : "pointer",
	          }}
	        >
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

	      {/* Auto-test / diagnostics */}
	      <div style={{ marginTop: 10 }}>
	        <div style={{ fontSize: 12, fontWeight: 800, marginBottom: 6 }}>
	          {t("syncCenter.cloud.diagTitle", "AUTO-TEST (diagnostic)")}
	        </div>
	        <button
	          onClick={onDiag}
	          disabled={diagBusy}
	          style={{
	            ...buttonSmall(theme),
	            width: "100%",
	            opacity: diagBusy ? 0.6 : 1,
	            cursor: diagBusy ? "not-allowed" : "pointer",
	          }}
	        >
	          {diagBusy
	            ? t("syncCenter.cloud.diagRunning", "Test en cours…")
	            : t("syncCenter.cloud.diagBtn", "Lancer auto-test cloud")}
	        </button>
	        {diagLog.length > 0 && (
	          <div
	            style={{
	              marginTop: 8,
	              background: "rgba(0,0,0,0.35)",
	              border: "1px solid rgba(255,255,255,0.12)",
	              borderRadius: 12,
	              padding: 10,
	              maxHeight: 180,
	              overflow: "auto",
	              fontFamily:
	                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
	              fontSize: 11,
	              lineHeight: 1.35,
	              whiteSpace: "pre-wrap",
	              color: theme.text,
	            }}
	          >
	            {diagLog.join("\n")}
	          </div>
	        )}
	      </div>

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
// ---- Cloud gzip helpers (native browser API) ----
async function gzipStringToBlob(str: string): Promise<Blob | null> {
  try {
    // @ts-ignore
    if (typeof CompressionStream === "undefined") return null;
    // @ts-ignore
    const cs = new CompressionStream("gzip");
    const bytes = new TextEncoder().encode(str);
    const stream = new Blob([bytes]).stream().pipeThrough(cs);
    return await new Response(stream).blob();
  } catch {
    return null;
  }
}

async function ungzipBlobToString(blob: Blob): Promise<string | null> {
  try {
    // @ts-ignore
    if (typeof DecompressionStream === "undefined") return null;
    // @ts-ignore
    const ds = new DecompressionStream("gzip");
    const stream = blob.stream().pipeThrough(ds);
    const ab = await new Response(stream).arrayBuffer();
    return new TextDecoder().decode(new Uint8Array(ab));
  } catch {
    return null;
  }
}

function approxBytesOfString(str: string): number {
  // UTF-8 bytes approximation (exact for ASCII, close enough for telemetry)
  return new TextEncoder().encode(str).byteLength;
}


