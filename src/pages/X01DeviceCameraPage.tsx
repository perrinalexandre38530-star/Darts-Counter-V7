// @ts-nocheck
// ============================================
// src/pages/X01DeviceCameraPage.tsx
// Téléphone compagnon X01 — caméra + tap-to-score
// - Ouvert depuis QR code : /#/x01-device/:sessionId
// - Calibration stockée SUR LE TÉLÉPHONE
// - Calibration photo automatique avancée : ellipse + anneaux + secteurs
// - Envoie les impacts au match via session API
// ============================================

import React from "react";
import {
  DEFAULT_CAMERA_BOARD_RINGS,
  getCameraCalibrationRings,
  loadCameraCalibration,
  saveCameraCalibration,
  clearCameraCalibration,
} from "../lib/cameraCalibrationStore";
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
const RED = "#ff5d6c";
const GREEN = "#35ff9a";
const BLUE = "#8db4ff";

const BOARD_NUMBERS = [
  20, 1, 18, 4, 13,
  6, 10, 15, 2, 17,
  3, 19, 7, 16, 8,
  11, 14, 9, 12, 5,
];

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

function pct(n: number) {
  return `${n * 100}%`;
}

function AdvancedBoardOverlay({ cal }: { cal: any }) {
  if (!cal) return null;
  const { rx, ry } = getCalRadii(cal);
  if (!rx || !ry) return null;
  const rings = cal?.v === 2 ? getCameraCalibrationRings(cal) : DEFAULT_CAMERA_BOARD_RINGS;
  const cx = Number(cal.cx || 0) * 1000;
  const cy = Number(cal.cy || 0) * 1000;
  const sx = rx * 1000;
  const sy = ry * 1000;
  const a20 = Number(cal.a20 ?? -Math.PI / 2);
  const sectorSize = (Math.PI * 2) / 20;
  const boundaryStart = a20 - sectorSize / 2;

  const lineForAngle = (angle: number, ratio = 1) => ({
    x2: cx + Math.cos(angle) * sx * ratio,
    y2: cy + Math.sin(angle) * sy * ratio,
  });

  const centerForRatio = (angle: number, ratio: number) => ({
    x: cx + Math.cos(angle) * sx * ratio,
    y: cy + Math.sin(angle) * sy * ratio,
  });

  const ringStroke = (color: string, width = 2) => ({ fill: "none", stroke: color, strokeWidth: width, vectorEffect: "non-scaling-stroke" as any });

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="none"
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", filter: "drop-shadow(0 0 10px rgba(32,231,255,.35))" }}
    >
      <ellipse cx={cx} cy={cy} rx={sx * rings.doubleOuter} ry={sy * rings.doubleOuter} {...ringStroke(CYAN, 2.5)} />
      <ellipse cx={cx} cy={cy} rx={sx * rings.doubleInner} ry={sy * rings.doubleInner} {...ringStroke(GREEN, 2)} />
      <ellipse cx={cx} cy={cy} rx={sx * rings.tripleOuter} ry={sy * rings.tripleOuter} {...ringStroke(RED, 2)} />
      <ellipse cx={cx} cy={cy} rx={sx * rings.tripleInner} ry={sy * rings.tripleInner} {...ringStroke(RED, 2)} />
      <ellipse cx={cx} cy={cy} rx={sx * rings.outerBullOuter} ry={sy * rings.outerBullOuter} {...ringStroke(GREEN, 2.2)} />
      <ellipse cx={cx} cy={cy} rx={sx * rings.innerBullOuter} ry={sy * rings.innerBullOuter} {...ringStroke(RED, 2.4)} />

      {Array.from({ length: 20 }).map((_, i) => {
        const a = boundaryStart + i * sectorSize;
        const p = lineForAngle(a, rings.doubleOuter);
        return <line key={`b-${i}`} x1={cx} y1={cy} x2={p.x2} y2={p.y2} stroke="rgba(255,255,255,.58)" strokeWidth="1.2" vectorEffect="non-scaling-stroke" />;
      })}

      {BOARD_NUMBERS.map((n, i) => {
        const p = centerForRatio(a20 + i * sectorSize, 1.08);
        return (
          <text
            key={`n-${n}-${i}`}
            x={p.x}
            y={p.y}
            textAnchor="middle"
            dominantBaseline="central"
            fill={i === 0 ? GOLD : "rgba(255,255,255,.86)"}
            fontSize="22"
            fontWeight="900"
            style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.85)", strokeWidth: 4 }}
          >
            {n}
          </text>
        );
      })}

      <text x={cx + sx * 0.70} y={cy - sy * rings.tripleOuter - 8} fill={RED} fontSize="18" fontWeight="900" textAnchor="middle" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.85)", strokeWidth: 4 }}>TRIPLE</text>
      <text x={cx + sx * 0.70} y={cy - sy * rings.doubleOuter - 8} fill={GREEN} fontSize="18" fontWeight="900" textAnchor="middle" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.85)", strokeWidth: 4 }}>DOUBLE</text>
      <text x={cx} y={cy - sy * rings.outerBullOuter - 12} fill={GOLD} fontSize="18" fontWeight="900" textAnchor="middle" style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,.85)", strokeWidth: 4 }}>BULL</text>
      <circle cx={cx} cy={cy} r="4" fill={GOLD} />
    </svg>
  );
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
  const [showHelp, setShowHelp] = React.useState(false);

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
        const currentCal = loadCameraCalibration();
        await updateX01DeviceStatus(sessionId, {
          linked: true,
          connected: true,
          calibrated: !!currentCal,
          deviceLabel: label,
          deviceKind: "phone_camera",
          calibrationMethod: currentCal?.method || null,
          calibrationConfidence: currentCal?.confidence ?? null,
          zoneConfidence: currentCal?.zoneConfidence ?? null,
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
    setPreviewCal(loadCameraCalibration() || cal);
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
        zoneConfidence: cal?.zoneConfidence ?? null,
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
      setMessage("Photo zones en cours… cible entière visible, téléphone fixe, évite les reflets.");
      const image = captureVisibleVideoFrame(video, wrap, 860);
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
        `${result.message} Calibration zones enregistrée (${confidenceLabel(result.calibration.confidence)}).`
      );
    } catch (e: any) {
      setMessage(e?.message || "Erreur pendant la calibration photo zones.");
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
    setMessage("Mode manuel secours : tape centre bull, bord extérieur cible, centre du 20. La photo zones reste recommandée.");
  }

  function adjustOrientation(deltaDeg: number) {
    const current = loadCameraCalibration() || previewCal;
    if (!current) {
      setMessage("Aucune calibration à ajuster.");
      return;
    }
    const next = rotateCalibration(current, (deltaDeg * Math.PI) / 180);
    saveCameraCalibration(next);
    setPreviewCal(loadCameraCalibration() || next);
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
        setMessage("Utilise d'abord Photo zones. Le mode manuel 3 points reste en secours avec le bouton Manuel.");
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
      setMessage("Calibration manquante. Lance Photo zones ou le mode manuel avant de scorer.");
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
      : "Calibration recommandée — Photo zones détecte anneaux, bull, doubles et triples"
    : "Tape l'impact de la fléchette pour l'envoyer au match X01";

  const rings = previewCal?.v === 2 ? getCameraCalibrationRings(previewCal) : DEFAULT_CAMERA_BOARD_RINGS;
  const methodLabel = previewCal?.method === "auto-photo-zones"
    ? "Photo zones"
    : previewCal?.method === "auto-photo"
    ? "Photo auto"
    : previewCal?.method === "manual"
    ? "Manuel"
    : "—";

  return (
    <div style={{ minHeight: "100vh", background: "#03050b", color: "#f4f7ff", display: "flex", flexDirection: "column", touchAction: "none" }}>
      <header style={{ padding: "10px 10px", borderBottom: "1px solid rgba(255,255,255,.10)", background: "linear-gradient(180deg, rgba(18,22,38,.98), rgba(6,8,16,.96))", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
        <div style={{ minWidth: 92 }}>
          <div style={{ color: CYAN, fontWeight: 1000, letterSpacing: .5 }}>Téléphone X01</div>
          <div style={{ fontSize: 11, color: "rgba(244,247,255,.68)", marginTop: 2 }}>Session {sessionId || "absente"}</div>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
          <button type="button" disabled={!ready || busy} onClick={runAutoPhotoCalibration} style={btn(true, !ready || busy)}>Photo zones</button>
          <button type="button" onClick={startManualCalibration} style={btn(false)}>Manuel</button>
          <button type="button" disabled={!calibrated} onClick={() => setMode("score")} style={btn(false, !calibrated)}>Scorer</button>
          <button type="button" onClick={() => setShowHelp((v) => !v)} style={btn(false)}>?</button>
        </div>
      </header>

      <main ref={wrapRef} onClick={handleTap} onTouchStart={handleTap} style={{ position: "relative", flex: 1, minHeight: 0, overflow: "hidden", cursor: mode === "score" ? "crosshair" : "default" }}>
        <video ref={videoRef} playsInline muted autoPlay style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />

        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "radial-gradient(circle at center, transparent 0 58%, rgba(0,0,0,.28) 100%)" }} />

        {previewCal && <AdvancedBoardOverlay cal={previewCal} />}

        {[center, outer, top20].filter(Boolean).map((p: any, i) => (
          <div key={i} style={{ position: "absolute", left: pct(p.x), top: pct(p.y), width: 20, height: 20, borderRadius: 999, transform: "translate(-50%,-50%)", border: `2px solid ${CYAN}`, background: "rgba(0,0,0,.22)", boxShadow: `0 0 18px ${CYAN}`, pointerEvents: "none" }} />
        ))}

        <div style={{ position: "absolute", left: 10, right: 10, top: 10, padding: 12, borderRadius: 16, background: "rgba(0,0,0,.70)", border: `1px solid ${CYAN}44`, boxShadow: `0 0 28px ${CYAN}22`, pointerEvents: "none" }}>
          <div style={{ color: CYAN, fontWeight: 1000, marginBottom: 4 }}>{mode === "calibrate" ? "Calibration téléphone" : "Comptage téléphone"}</div>
          <div style={{ fontWeight: 900 }}>{hint}</div>
          <div style={{ marginTop: 6, fontSize: 12, color: "rgba(244,247,255,.80)", lineHeight: 1.35 }}>{message}</div>
          {previewCal && (
            <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap", fontSize: 11, fontWeight: 1000 }}>
              <span style={pill(CYAN)}>Méthode : {methodLabel}</span>
              <span style={pill(GOLD)}>Global : {confidenceLabel(autoConfidence)}</span>
              {previewCal?.v === 2 && <span style={pill(GREEN)}>Zones : {confidenceLabel(previewCal.zoneConfidence)}</span>}
            </div>
          )}
          {!ready && !error && <div style={{ marginTop: 6, fontSize: 12, color: GOLD, fontWeight: 900 }}>Ouverture caméra…</div>}
          {error && <div style={{ marginTop: 6, fontSize: 12, color: "#ff9aa9", fontWeight: 900 }}>Erreur : {error}</div>}
        </div>

        {showHelp && (
          <div style={{ position: "absolute", left: 10, right: 10, top: 118, padding: 12, borderRadius: 16, background: "rgba(5,7,14,.88)", border: "1px solid rgba(255,255,255,.18)", boxShadow: "0 18px 40px rgba(0,0,0,.45)", pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <div style={{ color: CYAN, fontWeight: 1000, marginBottom: 5 }}>Comment vérifier la calibration</div>
            <div style={{ fontSize: 12, lineHeight: 1.45, color: "rgba(244,247,255,.84)" }}>
              L'overlay doit épouser la cible : cercle extérieur sur le double, anneaux rouges sur les triples, anneau vert sur le bull et les doubles. Si le 20 n'est pas en haut, ajuste avec les boutons 20 ±1° / ±5°. Ensuite seulement tu tapes l'impact de la fléchette.
            </div>
          </div>
        )}

        {calibrated && (
          <div style={{ position: "absolute", left: 10, right: 10, bottom: 116, display: "flex", justifyContent: "center", gap: 6, flexWrap: "wrap", pointerEvents: "auto" }} onClick={(e) => e.stopPropagation()} onTouchStart={(e) => e.stopPropagation()}>
            <button type="button" onClick={() => adjustOrientation(-5)} style={smallBtn()}>20 ↶ -5°</button>
            <button type="button" onClick={() => adjustOrientation(-1)} style={smallBtn()}>-1°</button>
            <button type="button" onClick={() => adjustOrientation(1)} style={smallBtn()}>+1°</button>
            <button type="button" onClick={() => adjustOrientation(5)} style={smallBtn()}>20 ↷ +5°</button>
          </div>
        )}

        <div style={{ position: "absolute", left: 10, right: 10, bottom: 12, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, pointerEvents: "none" }}>
          <div style={{ borderRadius: 16, padding: "10px 12px", background: "rgba(0,0,0,.62)", border: "1px solid rgba(255,255,255,.12)" }}>
            <div style={{ fontSize: 11, color: "rgba(244,247,255,.66)", fontWeight: 900 }}>Dernier impact</div>
            <div style={{ color: CYAN, fontWeight: 1000, fontSize: 22 }}>{lastDart ? dartLabel(lastDart) : "—"}</div>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4 }}>
            <div style={{ fontSize: 10, color: "rgba(255,255,255,.70)", fontWeight: 800, textAlign: "right" }}>
              D {Math.round(rings.doubleInner * 100)}% · T {Math.round(rings.tripleInner * 100)}-{Math.round(rings.tripleOuter * 100)}% · Bull {Math.round(rings.outerBullOuter * 100)}%
            </div>
            <button type="button" onClick={(e) => { e.stopPropagation(); clearCameraCalibration(); setPreviewCal(null); setAutoConfidence(undefined); setCalibrated(false); setMode("calibrate"); setManualActive(false); setCalStep(0); setCenter(null); setOuter(null); setTop20(null); setMessage("Calibration effacée. Reprends une Photo zones ou passe en Manuel."); updateX01DeviceStatus(sessionId, { calibrated: false, message: "Calibration effacée" }).catch(() => {}); }} style={{ ...btn(false), pointerEvents: "auto" }}>Effacer calibration</button>
          </div>
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
    padding: "8px 10px",
    boxShadow: `0 0 18px ${GOLD}22`,
    cursor: "pointer",
  };
}

function pill(color: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    borderRadius: 999,
    padding: "3px 7px",
    border: `1px solid ${color}77`,
    color,
    background: "rgba(0,0,0,.34)",
  };
}
