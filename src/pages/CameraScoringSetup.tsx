// @ts-nocheck
// ============================================
// src/pages/CameraScoringSetup.tsx
// X01 — Paramétrage comptage externe / téléphone compagnon
// - Étape 1 : relier un appareil
// - Étape 2 : paramétrer la source de comptage
// - Étape 3 : calibrer sur l'appareil qui filme
// ============================================

import React from "react";
import QRCode from "qrcode";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { loadCameraCalibration, clearCameraCalibration } from "../lib/cameraCalibrationStore";
import {
  createX01DeviceSession,
  fetchX01DeviceStatus,
  persistX01PhoneCompanionPrefs,
  readX01PhoneCompanionPrefs,
  buildX01DeviceJoinUrl,
  buildX01DevicePollingUrl,
  buildX01DeviceStatusUrl,
  type X01DeviceSession,
  type X01DeviceStatus,
} from "../lib/x01ExternalDeviceClient";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

const PREF_KEY = "dc:x01v3:external-device:v1";

function readPrefs() {
  try {
    return JSON.parse(window.localStorage.getItem(PREF_KEY) || "{}");
  } catch {
    return {};
  }
}

function writePrefs(patch: any) {
  try {
    const current = readPrefs();
    window.localStorage.setItem(PREF_KEY, JSON.stringify({ ...current, ...patch, updatedAt: Date.now() }));
  } catch {}
}

function statusText(status: X01DeviceStatus | null, session: X01DeviceSession | null) {
  if (!session?.code) return "Aucun téléphone relié";
  if (!status) return "Session créée — en attente du téléphone";
  if (status.connected || status.linked) {
    if (status.calibrated) return `${status.deviceLabel || "Téléphone"} relié et calibré`;
    return `${status.deviceLabel || "Téléphone"} relié — calibration à faire`;
  }
  return "Session prête — scanne le QR code avec le téléphone";
}

export default function CameraScoringSetup({ go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const primary = theme?.primary ?? "#20e7ff";
  const primarySoft = theme?.primarySoft ?? "rgba(32,231,255,0.16)";
  const textMain = theme?.text ?? "#f5f5ff";

  const returnTab = params?.returnTab ?? "games";
  const localCal = loadCameraCalibration();

  const initialPhone = readX01PhoneCompanionPrefs();
  const initialSession = initialPhone?.phoneSessionId || initialPhone?.code ? {
    sessionId: initialPhone.phoneSessionId || initialPhone.code,
    code: initialPhone.phoneSessionId || initialPhone.code,
    joinUrl: initialPhone.phoneJoinUrl || initialPhone.joinUrl || buildX01DeviceJoinUrl(initialPhone.phoneSessionId || initialPhone.code),
    pollingUrl: initialPhone.pollingUrl || buildX01DevicePollingUrl(initialPhone.phoneSessionId || initialPhone.code),
    statusUrl: initialPhone.phoneStatusUrl || buildX01DeviceStatusUrl(initialPhone.phoneSessionId || initialPhone.code),
    createdAt: Number(initialPhone.createdAt || Date.now()),
    expiresAt: initialPhone.expiresAt || null,
  } : null;

  const [session, setSession] = React.useState<X01DeviceSession | null>(initialSession as any);
  const [deviceStatus, setDeviceStatus] = React.useState<X01DeviceStatus | null>(null);
  const [qr, setQr] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState("Relie d'abord le téléphone qui va filmer la cible.");
  const [sourceMode, setSourceMode] = React.useState<string>(() => readPrefs()?.mode || "phone_companion");
  const [cal, setCal] = React.useState(() => localCal);

  React.useEffect(() => {
    let alive = true;
    if (!session?.joinUrl) {
      setQr("");
      return;
    }
    QRCode.toDataURL(session.joinUrl, { margin: 1, width: 260, errorCorrectionLevel: "M" })
      .then((dataUrl: string) => { if (alive) setQr(dataUrl); })
      .catch(() => { if (alive) setQr(""); });
    return () => { alive = false; };
  }, [session?.joinUrl]);

  React.useEffect(() => {
    if (!session?.code) return;
    let stopped = false;
    const tick = async () => {
      try {
        const next = await fetchX01DeviceStatus(session.code);
        if (!stopped) setDeviceStatus(next || null);
      } catch {
        if (!stopped) setDeviceStatus(null);
      }
    };
    tick();
    const id = window.setInterval(tick, 1800);
    return () => {
      stopped = true;
      window.clearInterval(id);
    };
  }, [session?.code]);

  function activateMode(mode: string) {
    setSourceMode(mode);
    writePrefs({ mode, externalDeviceMode: mode });
  }

  async function createPhoneSession() {
    try {
      setBusy(true);
      setMessage("Création de la session téléphone…");
      const s = await createX01DeviceSession();
      persistX01PhoneCompanionPrefs(s);
      setSession(s);
      setDeviceStatus(null);
      setSourceMode("phone_companion");
      setMessage("Session créée. Scanne le QR code avec le téléphone, puis calibre depuis ce téléphone.");
    } catch (e: any) {
      setMessage(e?.message || "Impossible de créer la session téléphone.");
    } finally {
      setBusy(false);
    }
  }

  function copyJoinUrl() {
    if (!session?.joinUrl) return;
    try {
      navigator.clipboard?.writeText(session.joinUrl);
      setMessage("Lien téléphone copié.");
    } catch {
      setMessage(session.joinUrl);
    }
  }

  const phoneLinked = !!(deviceStatus?.connected || deviceStatus?.linked);
  const phoneCalibrated = !!deviceStatus?.calibrated;

  return (
    <div
      className="screen"
      style={{
        minHeight: "100vh",
        padding: "12px 12px 24px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: textMain,
      }}
    >
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
        <BackDot onClick={() => go(returnTab)} title={t("common.back", "Retour")} size={36} color={primary} glow={`${primary}88`} />

        <div style={{ fontWeight: 1000, letterSpacing: 0.5, color: primary, textAlign: "center" }}>
          {t("cameraScoring.title", "Comptage externe X01")}
        </div>

        <InfoDot
          onClick={() => {
            alert([
              "Ordre correct :",
              "1) Relier l'appareil qui va compter/filmer.",
              "2) Choisir la source : téléphone, caméra locale, bridge, Scolia, Grandarts ou Bluetooth.",
              "3) Calibrer SUR l'appareil qui filme la cible.",
              "4) Lancer la partie X01 : les impacts sont envoyés au moteur de score.",
            ].join("\n"));
          }}
          title={t("common.rules", "Info")}
          size={36}
          color={primary}
          glow={`${primary}88`}
        />
      </header>

      <div style={cardStyle()}>
        <div style={{ fontSize: 13, color: "rgba(245,245,255,0.82)", lineHeight: 1.45 }}>
          <b style={{ color: primary }}>Oui : il faut d'abord relier le téléphone ou l'appareil.</b><br />
          La calibration dépend de la position de la caméra. Donc si c'est un téléphone posé face à la cible, c'est le téléphone qui doit ouvrir la caméra et enregistrer la calibration.
        </div>
      </div>

      <div style={cardStyle()}>
        <StepTitle n={1} title="Source de comptage" primary={primary} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <Choice label="TÉLÉPHONE" active={sourceMode === "phone_companion"} onClick={() => activateMode("phone_companion")} primary={primary} primarySoft={primarySoft} />
          <Choice label="CAMÉRA LOCALE" active={sourceMode === "camera_assisted"} onClick={() => activateMode("camera_assisted")} primary={primary} primarySoft={primarySoft} />
          <Choice label="BRIDGE" active={sourceMode === "websocket_bridge"} onClick={() => activateMode("websocket_bridge")} primary={primary} primarySoft={primarySoft} />
          <Choice label="SCOLIA" active={sourceMode === "scolia"} onClick={() => activateMode("scolia")} primary={primary} primarySoft={primarySoft} />
          <Choice label="GRANDARTS" active={sourceMode === "grandarts"} onClick={() => activateMode("grandarts")} primary={primary} primarySoft={primarySoft} />
          <Choice label="BLUETOOTH" active={sourceMode === "bluetooth"} onClick={() => activateMode("bluetooth")} primary={primary} primarySoft={primarySoft} />
        </div>
      </div>

      {sourceMode === "phone_companion" && (
        <div style={cardStyle()}>
          <StepTitle n={2} title="Relier le téléphone" primary={primary} />
          <div style={{ marginTop: 8, color: "rgba(245,245,255,.76)", fontSize: 12, lineHeight: 1.45 }}>
            Appuie sur <b>Créer une liaison</b>, scanne le QR code avec le téléphone, autorise la caméra, puis fais la calibration depuis le téléphone.
          </div>

          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" disabled={busy} onClick={createPhoneSession} style={buttonStyle(primary, primarySoft, true, busy)}>
              {session?.code ? "Nouvelle liaison" : "Créer une liaison"}
            </button>
            <button type="button" disabled={!session?.joinUrl} onClick={copyJoinUrl} style={buttonStyle(primary, primarySoft, false, !session?.joinUrl)}>
              Copier le lien
            </button>
          </div>

          {session?.code && (
            <div style={{ marginTop: 14, display: "grid", gap: 12, gridTemplateColumns: "minmax(0, 1fr)", justifyItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
                <StatusPill ok={phoneLinked} label={phoneLinked ? "Téléphone relié" : "En attente téléphone"} />
                <StatusPill ok={phoneCalibrated} label={phoneCalibrated ? "Calibré" : "Calibration manquante"} />
              </div>

              <div style={{ width: 260, minHeight: 260, borderRadius: 18, padding: 10, background: "#fff", display: "grid", placeItems: "center", boxShadow: "0 18px 50px rgba(0,0,0,.45)" }}>
                {qr ? <img src={qr} alt="QR téléphone X01" style={{ width: 240, height: 240, display: "block" }} /> : <div style={{ color: "#111", fontWeight: 1000 }}>QR en attente…</div>}
              </div>

              <div style={{ textAlign: "center" }}>
                <div style={{ fontSize: 11, color: "rgba(245,245,255,.62)", fontWeight: 900 }}>CODE SESSION</div>
                <div style={{ color: primary, fontSize: 24, fontWeight: 1000, letterSpacing: 2 }}>{session.code}</div>
              </div>
            </div>
          )}

          <div style={{ marginTop: 12, fontSize: 12, color: phoneCalibrated ? "#9ff0c2" : phoneLinked ? "#ffd56b" : "rgba(245,245,255,.72)", fontWeight: 900 }}>
            {statusText(deviceStatus, session)}
          </div>
          <div style={{ marginTop: 6, fontSize: 11, color: "rgba(245,245,255,.58)", overflowWrap: "anywhere" }}>{message}</div>
        </div>
      )}

      {sourceMode === "camera_assisted" && (
        <div style={cardStyle()}>
          <StepTitle n={2} title="Caméra de cet appareil" primary={primary} />
          <div style={{ marginTop: 8, color: "rgba(245,245,255,.76)", fontSize: 12, lineHeight: 1.45 }}>
            À utiliser seulement si l'appareil qui affiche l'application est aussi celui qui filme la cible. Dans ce cas, la calibration locale est correcte.
          </div>
          <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900, color: cal ? "#9ff0c2" : "#ffd0d0" }}>{cal ? "Calibration locale OK" : "Calibration locale manquante"}</div>
          </div>
          <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
            <button type="button" onClick={() => go("camera_scoring_calibration", { returnTab })} style={buttonStyle(primary, primarySoft, true)}>{cal ? "Recalibrer cet appareil" : "Calibrer cet appareil"}</button>
            <button type="button" onClick={() => { clearCameraCalibration(); setCal(null); }} style={buttonStyle(primary, primarySoft, false)}>Effacer</button>
          </div>
        </div>
      )}

      {sourceMode !== "phone_companion" && sourceMode !== "camera_assisted" && (
        <div style={cardStyle()}>
          <StepTitle n={2} title="Paramétrage appareil / bridge" primary={primary} />
          <div style={{ marginTop: 8, color: "rgba(245,245,255,.76)", fontSize: 12, lineHeight: 1.45 }}>
            Pour Scolia, Grandarts, un autre système ou une caméra Bluetooth non standard, il faut passer par un bridge/API compatible qui envoie les tirs à l'application. La configuration précise se fait dans la configuration X01 complète : URL WebSocket, polling HTTP ou UUID Bluetooth.
          </div>
        </div>
      )}

      <div style={cardStyle()}>
        <StepTitle n={3} title="Terminer" primary={primary} />
        <div style={{ marginTop: 8, color: "rgba(245,245,255,.76)", fontSize: 12, lineHeight: 1.45 }}>
          Quand le téléphone est relié et calibré, retourne à la configuration X01 puis lance la partie. Le play X01 écoutera automatiquement l'URL de polling de cette session.
        </div>
        <div style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10 }}>
          <button type="button" onClick={() => go(returnTab)} style={buttonStyle(primary, primarySoft, true)}>Terminé</button>
        </div>
      </div>
    </div>
  );
}

function StepTitle({ n, title, primary }: { n: number; title: string; primary: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
      <div style={{ width: 26, height: 26, borderRadius: 999, display: "grid", placeItems: "center", border: `1px solid ${primary}66`, background: `${primary}18`, color: primary, fontWeight: 1000 }}>{n}</div>
      <div style={{ fontWeight: 1000, color: primary }}>{title}</div>
    </div>
  );
}

function Choice({ label, active, onClick, primary, primarySoft }: any) {
  return (
    <button type="button" onClick={onClick} style={{ borderRadius: 999, padding: "9px 11px", border: active ? `1px solid ${primary}` : "1px solid rgba(255,255,255,.14)", background: active ? `linear-gradient(180deg, ${primary}33, ${primarySoft})` : "rgba(255,255,255,.06)", color: "#fff", fontWeight: 1000, cursor: "pointer", fontSize: 12 }}>
      {label}
    </button>
  );
}

function StatusPill({ ok, label }: { ok: boolean; label: string }) {
  return <span style={{ borderRadius: 999, padding: "7px 10px", background: ok ? "rgba(112,255,174,.14)" : "rgba(255,213,107,.13)", border: ok ? "1px solid rgba(112,255,174,.35)" : "1px solid rgba(255,213,107,.30)", color: ok ? "#9ff0c2" : "#ffd56b", fontWeight: 1000, fontSize: 12 }}>{label}</span>;
}

function cardStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    border: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(10,12,24,0.92)",
    boxShadow: "0 18px 60px rgba(0,0,0,0.50)",
    padding: 14,
    marginBottom: 12,
  };
}

function buttonStyle(primary: string, primarySoft: string, main = false, disabled = false): React.CSSProperties {
  return {
    padding: "12px 14px",
    borderRadius: 14,
    border: main ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.14)",
    background: main ? `linear-gradient(180deg, ${primary}33, ${primarySoft})` : "rgba(255,255,255,0.06)",
    color: disabled ? "rgba(255,255,255,.45)" : "#fff",
    fontWeight: 1000,
    cursor: disabled ? "not-allowed" : "pointer",
    boxShadow: main ? `0 0 22px ${primary}22` : undefined,
    opacity: disabled ? .6 : 1,
  };
}
