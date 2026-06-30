// @ts-nocheck
// ============================================
// src/pages/X01DeviceCameraPage.tsx
// Téléphone compagnon X01 — caméra + tap-to-score
// - Ouvert depuis QR code : /#/x01-device/:sessionId
// - Calibration stockée SUR LE TÉLÉPHONE
// - Envoie les impacts au match via session API
// ============================================

import React from "react";
import { loadCameraCalibration, saveCameraCalibration, clearCameraCalibration } from "../lib/cameraCalibrationStore";
import { scoreTap } from "../lib/cameraScoringEngine";
import { postX01DeviceEvent, updateX01DeviceStatus } from "../lib/x01ExternalDeviceClient";

type Props = {
  go?: (tab: any, params?: any) => void;
  params?: any;
};

type Mode = "score" | "calibrate";

type TapPoint = { x: number; y: number };

const CYAN = "#20e7ff";

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

export default function X01DeviceCameraPage({ params }: Props) {
  const sessionId = normalizeCode(params?.sessionId || "");
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);

  const [mode, setMode] = React.useState<Mode>(() => (loadCameraCalibration() ? "score" : "calibrate"));
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string>("Connexion au match…");
  const [lastDart, setLastDart] = React.useState<any | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [calibrated, setCalibrated] = React.useState<boolean>(() => !!loadCameraCalibration());

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
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
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
        if (!stopped) setMessage("Téléphone relié au match.");
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
  }, [sessionId]);

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
      if (calStep === 0) {
        setCenter(p);
        setCalStep(1);
        setMessage("Centre enregistré. Tape maintenant le bord extérieur de l'anneau double.");
        return;
      }
      if (calStep === 1) {
        setOuter(p);
        setCalStep(2);
        setMessage("Rayon enregistré. Tape maintenant le centre du 20 en haut.");
        return;
      }
      if (!center || !outer) return;
      setTop20(p);
      const dx = outer.x - center.x;
      const dy = outer.y - center.y;
      const r = Math.sqrt(dx * dx + dy * dy);
      const a20 = Math.atan2(p.y - center.y, p.x - center.x);
      saveCameraCalibration({ v: 1, cx: center.x, cy: center.y, r: Math.max(0.0001, r), a20, updatedAt: Date.now() });
      setCalibrated(true);
      setMode("score");
      setCalStep(0);
      setMessage("Calibration enregistrée. Tu peux maintenant taper les impacts.");
      if (sessionId) {
        updateX01DeviceStatus(sessionId, { calibrated: true, linked: true, connected: true, message: "Téléphone calibré", lastSeenAt: Date.now() }).catch(() => {});
      }
      return;
    }

    const cal = loadCameraCalibration();
    if (!cal) {
      setMode("calibrate");
      setMessage("Calibration manquante. Fais les 3 points avant de scorer.");
      return;
    }
    const dart = scoreTap(cal, p.x, p.y);
    await sendDart(dart);
  }

  const hint = mode === "calibrate"
    ? calStep === 0
      ? "1/3 — Tape le centre du BULL"
      : calStep === 1
      ? "2/3 — Tape le bord extérieur de la cible, au niveau de l'anneau double"
      : "3/3 — Tape le centre du segment 20, en haut de la cible"
    : "Tape l'impact de la fléchette pour l'envoyer au match X01";

  return (
    <div style={{ minHeight: "100vh", background: "#03050b", color: "#f4f7ff", display: "flex", flexDirection: "column", touchAction: "none" }}>
      <header style={{ padding: "10px 12px", borderBottom: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(6,8,16,.96))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ color: CYAN, fontWeight: 1000, letterSpacing: .5 }}>Téléphone X01</div>
          <div style={{ fontSize: 11, color: "rgba(244,247,255,.68)", marginTop: 2 }}>Session {sessionId || "absente"}</div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => { setMode("calibrate"); setCalStep(0); setCenter(null); setOuter(null); setTop20(null); setMessage("Calibration relancée."); }} style={btn(false)}>Calibrer</button>
          <button type="button" disabled={!calibrated} onClick={() => setMode("score")} style={btn(true, !calibrated)}>Scorer</button>
        </div>
      </header>

      <main ref={wrapRef} onClick={handleTap} onTouchStart={handleTap} style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", cursor: "crosshair" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at center, transparent 0 58%, rgba(0,0,0,.28) 100%)" }} />

        {[center, outer, top20].filter(Boolean).map((p: any, i) => (
          <div key={i} style={{ position: "absolute", left: `${p.x * 100}%`, top: `${p.y * 100}%`, width: 18, height: 18, borderRadius: 999, transform: "translate(-50%,-50%)", border: `2px solid ${CYAN}`, background: "rgba(0,0,0,.22)", boxShadow: `0 0 18px ${CYAN}` }} />
        ))}

        <div style={{ position: "absolute", left: 10, right: 10, top: 10, padding: 12, borderRadius: 16, background: "rgba(0,0,0,.62)", border: `1px solid ${CYAN}44`, boxShadow: `0 0 28px ${CYAN}22`, pointerEvents: "none" }}>
          <div style={{ color: CYAN, fontWeight: 1000, marginBottom: 4 }}>{mode === "calibrate" ? "Calibration téléphone" : "Comptage téléphone"}</div>
          <div style={{ fontWeight: 900 }}>{hint}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(244,247,255,.76)", lineHeight: 1.35 }}>{message}</div>
          {!ready && !error && <div style={{ marginTop: 6, fontSize: 12, color: "#ffd56b", fontWeight: 900 }}>Ouverture caméra…</div>}
          {error && <div style={{ marginTop: 6, fontSize: 12, color: "#ff9aa9", fontWeight: 900 }}>Erreur : {error}</div>}
        </div>

        <div style={{ position: "absolute", left: 10, right: 10, bottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, pointerEvents: "none" }}>
          <div style={{ borderRadius: 16, padding: "10px 12px", background: "rgba(0,0,0,.62)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div style={{ fontSize: 11, color: "rgba(244,247,255,.66)", fontWeight: 900 }}>Dernier impact</div>
            <div style={{ color: CYAN, fontWeight: 1000, fontSize: 22 }}>{lastDart ? dartLabel(lastDart) : "—"}</div>
          </div>
          <button type="button" onClick={(e) => { e.stopPropagation(); clearCameraCalibration(); setCalibrated(false); setMode("calibrate"); setCalStep(0); setCenter(null); setOuter(null); setTop20(null); setMessage("Calibration effacée."); updateX01DeviceStatus(sessionId, { calibrated: false, message: "Calibration effacée" }).catch(() => {}); }} style={{ ...btn(false), pointerEvents: "auto" }}>Effacer calibration</button>
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
    padding: "8px 11px",
    cursor: disabled ? "not-allowed" : "pointer",
    opacity: disabled ? .55 : 1,
  };
}
