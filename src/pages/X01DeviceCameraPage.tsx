// @ts-nocheck
// ============================================
// src/pages/X01DeviceCameraPage.tsx
// Téléphone compagnon X01 — caméra + tap-to-score
// - Ouvert depuis QR code : /#/x01-device/:sessionId
// - Calibration stockée SUR LE TÉLÉPHONE
// - Calibration photo automatique + fallback manuel précis
// - Envoie les impacts au match via session API
// ============================================

import React from "react";
import { loadCameraCalibration, saveCameraCalibration, clearCameraCalibration } from "../lib/cameraCalibrationStore";
import { scoreTap } from "../lib/cameraScoringEngine";
import { captureVisibleVideoFrame, detectDartboardCalibrationFromImageData } from "../lib/cameraAutoCalibration";
import { postX01DeviceEvent, updateX01DeviceStatus } from "../lib/x01ExternalDeviceClient";

type Props = {
  go?: (tab: any, params?: any) => void;
  params?: any;
};

type Mode = "score" | "calibrate";
type TapPoint = { x: number; y: number };

const CYAN = "#20e7ff";
const GOLD = "#ffe66d";

function normalizeCode(raw: any) {
  return String(raw || "").trim().toUpperCase().replace(/[^A-Z0-9-]/g, "");
}

function dartLabel(d: any) {
  const seg = Number(d?.segment || 0);
  const mult = Number(d?.multiplier || 0);
  if (seg === 0 || mult === 0) return "MISS";
  if (seg === 25 && mult === 2) return "DBULL";
  if (seg === 25) return "BULL";
  return `${mult === 3 ? "T" : mult === 2 ? "D" : "S"}${seg}`;
}

function scoreOf(d: any) {
  const seg = Number(d?.segment || 0);
  const mult = Number(d?.multiplier || 0);
  if (seg === 25 && mult === 2) return 50;
  return seg * mult;
}

function rotateCalibration(cal: any, deltaRad: number) {
  if (!cal) return null;
  return { ...cal, a20: Number(cal.a20 || 0) + deltaRad, updatedAt: Date.now() };
}

function getCalRadii(cal: any) {
  if (!cal) return { rx: 0, ry: 0 };
  if (cal.v === 2) return { rx: Number(cal.rx || cal.r || 0), ry: Number(cal.ry || cal.r || 0) };
  return { rx: Number(cal.r || 0), ry: Number(cal.r || 0) };
}

function confidenceLabel(confidence?: number) {
  if (confidence == null) return "—";
  const pct = Math.round(Number(confidence || 0) * 100);
  if (pct >= 70) return `${pct}% fiable`;
  if (pct >= 45) return `${pct}% à vérifier`;
  return `${pct}% fragile`;
}

export default function X01DeviceCameraPage({ params }: Props) {
  const sessionId = normalizeCode(params?.sessionId || "");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [mode, setMode] = React.useState<Mode>(() => (loadCameraCalibration() ? "score" : "calibrate"));
  const [manualActive, setManualActive] = React.useState(false);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string>("Connexion au match…");
  const [lastDart, setLastDart] = React.useState<any | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [calibrated, setCalibrated] = React.useState<boolean>(() => !!loadCameraCalibration());
  const [previewCal, setPreviewCal] = React.useState<any | null>(() => loadCameraCalibration());
  const [autoConfidence, setAutoConfidence] = React.useState<number | undefined>(() => loadCameraCalibration()?.confidence);

  const [calStep, setCalStep] = React.useState<0 | 1 | 2>(0);
  const [center, setCenter] = React.useState<TapPoint | null>(null);
  const [outer, setOuter] = React.useState<TapPoint | null>(null);
  const [top20, setTop20] = React.useState<TapPoint | null>(null);

  React.useEffect(() => {
    let stopped = false;
    async function startCamera() {
      try {
        setError(null);
        setReady(false);
        if (!navigator?.mediaDevices?.getUserMedia) {
          setError("Caméra indisponible sur ce navigateur.");
          return;
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          try { await videoRef.current.play(); } catch {}
        }
        setReady(true);
      } catch (e: any) {
        setError(e?.message || "Accès caméra refusé.");
      }
    }
    startCamera();
    return () => {
      stopped = true;
      try { streamRef.current?.getTracks?.().forEach((t) => t.stop()); } catch {}
      streamRef.current = null;
    };
  }, []);

  React.useEffect(() => {
    if (!sessionId) return;
    let stopped = false;
    const label = (() => {
      try {
        const ua = navigator.userAgent || "";
        if (/iphone|ipad|ios/i.test(ua)) return "iPhone / iPad";
        if (/android/i.test(ua)) return "Téléphone Android";
      } catch {}
      return "Téléphone compagnon";
    })();

    const ping = async () => {
      try {
        await updateX01DeviceStatus(sessionId, {
          linked: true,
          connected: true,
          calibrated: !!loadCameraCalibration(),
          deviceLabel: label,
          deviceKind: "phone_camera",
          message: "Téléphone relié",
          lastSeenAt: Date.now(),
        });
        if (!stopped && !busy) setMessage((m) => m || "Téléphone relié au match.");
      } catch (e: any) {
        if (!stopped) setMessage(e?.message || "Impossible de joindre la session.");
      }
    };
    ping();
    const id = window.setInterval(ping, 2500);
    return () => {
      stopped = true;
      window.clearInterval(id);
      updateX01DeviceStatus(sessionId, { connected: false, message: "Téléphone déconnecté", lastSeenAt: Date.now() }).catch(() => {});
    };
  }, [sessionId, busy]);

  function persistCalibration(cal: any, msg: string) {
    saveCameraCalibration(cal);
    setPreviewCal(cal);
    setAutoConfidence(cal?.confidence);
    setCalibrated(true);
    setMode("score");
    setManualActive(false);
    setCalStep(0);
    setCenter(null);
    setOuter(null);
    setTop20(null);
    setMessage(msg);
    if (sessionId) {
      updateX01DeviceStatus(sessionId, {
        calibrated: true,
        linked: true,
        connected: true,
        calibrationMethod: cal?.method || "manual",
        calibrationConfidence: cal?.confidence ?? null,
        message: "Téléphone calibré",
        lastSeenAt: Date.now(),
      }).catch(() => {});
    }
  }

  async function runAutoPhotoCalibration() {
    const video = videoRef.current;
    const wrap = wrapRef.current;
    if (!video || !wrap) {
      setMessage("Caméra pas encore prête.");
      return;
    }
    try {
      setBusy(true);
      setError(null);
      setMessage("Photo en cours… garde la cible entière dans le cadre, avec le 20 en haut.");
      const image = captureVisibleVideoFrame(video, wrap, 760);
      if (!image) {
        setMessage("Impossible de capturer la photo caméra. Réessaie dans une seconde.");
        return;
      }
      const result = detectDartboardCalibrationFromImageData(image);
      if (!result.ok || !result.calibration) {
        setMessage(result.message || "Détection impossible. Essaie avec plus de lumière et la cible complète dans le cadre.");
        return;
      }
      persistCalibration(
        result.calibration,
        `${result.message} Calibration photo enregistrée (${confidenceLabel(result.confidence)}).`
      );
    } catch (e: any) {
      setMessage(e?.message || "Erreur pendant la calibration photo.");
    } finally {
      setBusy(false);
    }
  }

  function startManualCalibration() {
    setMode("calibrate");
    setManualActive(true);
    setCalStep(0);
    setCenter(null);
    setOuter(null);
    setTop20(null);
    setMessage("Mode manuel : pose le téléphone bien fixe, puis tape les 3 repères demandés. Utilise le bout de l'ongle/stylet si possible.");
  }

  function adjustOrientation(deltaDeg: number) {
    const current = loadCameraCalibration() || previewCal;
    if (!current) {
      setMessage("Aucune calibration à ajuster.");
      return;
    }
    const next = rotateCalibration(current, (deltaDeg * Math.PI) / 180);
    saveCameraCalibration(next);
    setPreviewCal(next);
    setMessage(`Orientation du 20 ajustée de ${deltaDeg > 0 ? "+" : ""}${deltaDeg}°.`);
  }

  function getNormPoint(ev: any): TapPoint | null {
    const el = wrapRef.current;
    if (!el) return null;
    const point = ev?.touches?.[0] || ev?.changedTouches?.[0] || ev;
    const rect = el.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.max(0, Math.min(1, (point.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (point.clientY - rect.top) / rect.height)),
    };
  }

  async function sendDart(dart: any) {
    if (!sessionId || busy) return;
    try {
      setBusy(true);
      const clean = {
        kind: "dart",
        type: "dart",
        segment: Number(dart.segment || 0),
        multiplier: Number(dart.multiplier || 0),
        score: scoreOf(dart),
        label: dartLabel(dart),
        deviceTs: Date.now(),
        source: "phone_camera",
      };
      await postX01DeviceEvent(sessionId, clean);
      setLastDart(clean);
      setMessage(`Envoyé : ${clean.label} (${clean.score})`);
    } catch (e: any) {
      setMessage(e?.message || "Envoi impossible.");
    } finally {
      setBusy(false);
    }
  }

  async function handleTap(ev: any) {
    ev.preventDefault?.();
    ev.stopPropagation?.();
    const p = getNormPoint(ev);
    if (!p) return;

    if (mode === "calibrate") {
      if (!manualActive) {
        setMessage("Utilise d'abord Photo auto. Le mode manuel 3 points reste disponible avec le bouton Manuel.");
        return;
      }
      if (calStep === 0) {
        setCenter(p);
        setCalStep(1);
        setMessage("Centre enregistré. Tape maintenant le bord extérieur de l'anneau double.");
        return;
      }
      if (calStep === 1) {
        setOuter(p);
        setCalStep(2);
        setMessage("Rayon enregistré. Tape maintenant le centre du segment 20 en haut.");
        return;
      }
      if (!center || !outer) return;
      setTop20(p);
      const dx = outer.x - center.x;
      const dy = outer.y - center.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const a20 = Math.atan2(p.y - center.y, p.x - center.x);
      persistCalibration(
        { v: 1, cx: center.x, cy: center.y, r: Math.max(0.0001, r), a20, method: "manual", updatedAt: Date.now() },
        "Calibration manuelle enregistrée. Tu peux maintenant taper les impacts."
      );
      return;
    }

    const cal = loadCameraCalibration();
    if (!cal) {
      setMode("calibrate");
      setMessage("Calibration manquante. Lance Photo auto ou le mode manuel avant de scorer.");
      return;
    }
    const dart = scoreTap(cal, p.x, p.y);
    await sendDart(dart);
  }

  const hint = mode === "calibrate"
    ? manualActive
      ? calStep === 0
        ? "Manuel 1/3 — Tape le centre du BULL"
        : calStep === 1
        ? "Manuel 2/3 — Tape le bord extérieur de la cible"
        : "Manuel 3/3 — Tape le centre du 20 en haut"
      : "Calibration recommandée — prends une photo, l'app détecte la cible automatiquement"
    : "Tape l'impact de la fléchette pour l'envoyer au match X01";

  const { rx, ry } = getCalRadii(previewCal);
  const a20 = Number(previewCal?.a20 ?? -Math.PI / 2);
  const x20 = previewCal ? previewCal.cx + Math.cos(a20) * rx * 0.92 : 0;
  const y20 = previewCal ? previewCal.cy + Math.sin(a20) * ry * 0.92 : 0;

  return (
    <div style={{ minHeight: "100vh", background: "#03050b", color: "#f4f7ff", display: "flex", flexDirection: "column", touchAction: "none" }}>
      <header style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(6,8,16,.96))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 86 }}>
          <div style={{ color: CYAN, fontWeight: 1000, letterSpacing: .5 }}>Téléphone X01</div>
          <div style={{ fontSize: 11, color: "rgba(244,247,255,.68)", marginTop: 2 }}>Session {sessionId || "absente"}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" disabled={!ready || busy} onClick={runAutoPhotoCalibration} style={btn(true, !ready || busy)}>Photo auto</button>
          <button type="button" onClick={startManualCalibration} style={btn(false)}>Manuel</button>
          <button type="button" disabled={!calibrated} onClick={() => setMode("score")} style={btn(false, !calibrated)}>Scorer</button>
        </div>
      </header>

      <main ref={wrapRef} onClick={handleTap} onTouchStart={handleTap} style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", cursor: mode === "score" ? "crosshair" : "default" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at center, transparent 0 58%, rgba(0,0,0,.28) 100%)" }} />

        {previewCal && rx > 0 && ry > 0 && (
          <>
            <div style={{ position: "absolute", left: `${previewCal.cx * 100}%`, top: `${previewCal.cy * 100}%`, width: `${rx * 200}%`, height: `${ry * 200}%`, borderRadius: "50%", transform: "translate(-50%,-50%)", border: `2px solid ${CYAN}`, boxShadow: `0 0 24px ${CYAN}`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: `${previewCal.cx * 100}%`, top: `${previewCal.cy * 100}%`, width: 16, height: 16, borderRadius: 999, transform: "translate(-50%,-50%)", border: `2px solid ${GOLD}`, background: "rgba(0,0,0,.35)", boxShadow: `0 0 16px ${GOLD}`, pointerEvents: "none" }} />
            <div style={{ position: "absolute", left: `${x20 * 100}%`, top: `${y20 * 100}%`, width: 30, height: 30, borderRadius: 999, transform: "translate(-50%,-50%)", border: `2px solid ${GOLD}`, background: "rgba(0,0,0,.35)", color: GOLD, display: "grid", placeItems: "center", fontSize: 12, fontWeight: 1000, pointerEvents: "none" }}>20</div>
          </>
        )}

        {[center, outer, top20].filter(Boolean).map((p: any, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: 20, height: 20, borderRadius: 999, transform: "translate(-50%,-50%)", border: `2px solid ${CYAN}`, background: "rgba(0,0,0,.22)", boxShadow: `0 0 18px ${CYAN}`, pointerEvents: "none" }} />
        ))}

        <div style={{ position: "absolute", left: 10, right: 10, top: 10, padding: 12, borderRadius: 16, background: "rgba(0,0,0,.68)", border: `1px solid ${CYAN}44`, boxShadow: `0 0 28px ${CYAN}22`, pointerEvents: "none" }}>
          <div style={{ color: CYAN, fontWeight: 1000, marginBottom: 4 }}>{mode === "calibrate" ? "Calibration téléphone" : "Comptage téléphone"}</div>
          <div style={{ fontWeight: 900 }}>{hint}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(244,247,255,.80)", lineHeight: 1.35 }}>{message}</div>
          {previewCal?.method === "auto-photo" && (
            <div style={{ marginTop: 7, fontSize: 12, color: GOLD, fontWeight: 1000 }}>Photo auto : {confidenceLabel(autoConfidence)}</div>
          )}
          {!ready && !error && <div style={{ marginTop: 6, fontSize: 12, color: GOLD, fontWeight: 900 }}>Ouverture caméra…</div>}
          {error && <div style={{ marginTop: 6, fontSize: 12, color: "#ff9aa9", fontWeight: 900 }}>Erreur : {error}</div>}
        </div>

        {calibrated && (
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 106, display: "flex", justifyContent: "center", gap: 8, pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => adjustOrientation(-5)} style={smallBtn()}>20 ↶ -5°</button>
            <button type="button" onClick={() => adjustOrientation(5)} style={smallBtn()}>20 ↷ +5°</button>
          </div>
        )}

        <div style={{ position: "absolute", left: 10, right: 10, bottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, pointerEvents: "none" }}>
          <div style={{ borderRadius: 16, padding: "10px 12px", background: "rgba(0,0,0,.62)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div style={{ fontSize: 11, color: "rgba(244,247,255,.66)", fontWeight: 900 }}>Dernier impact</div>
            <div style={{ color: CYAN, fontWeight: 1000, fontSize: 22 }}>{lastDart ? dartLabel(lastDart) : "—"}</div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); clearCameraCalibration(); setPreviewCal(null); setAutoConfidence(undefined); setCalibrated(false); setMode("calibrate"); setManualActive(false); setCalStep(0); setCenter(null); setOuter(null); setTop20(null); setMessage("Calibration effacée. Reprends une Photo auto ou passe en Manuel."); updateX01DeviceStatus(sessionId, { calibrated: false, message: "Calibration effacée" }).catch(() => {}); }} style={{ ...btn(false), pointerEvents: "auto" }}>Effacer calibration</button>
        </div>
      </main>
    </div>
  );
}

function btn(active = false, disabled = false): React.CSSProperties {
  return {
    borderRadius: 999,
    border: active ? `1px solid ${CYAN}` : "1px solid rgba(255,255,255,.16)",
    background: active ? "rgba(32,231,255,.18)" : "rgba(255,255,255,.07)",
    color: disabled ? "rgba(255,255,255,.38)" : "#fff",
    fontWeight: 1000,
    padding: "8px 10px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .55 : 1,
  };
}

function smallBtn(): React.CSSProperties {
  return {
    borderRadius: 999,
    border: `1px solid ${GOLD}88`,
    background: "rgba(0,0,0,.62)",
    color: GOLD,
    fontWeight: 1000,
    padding: "8px 12px",
    boxShadow: `0 0 18px ${GOLD}22`,
    cursor: "pointer",
  };
}
