import React from "react";
import ScoreInputHub from "../../components/ScoreInputHub";
import CameraAssistedOverlay from "../../components/CameraAssistedOverlay";
import { useVoiceScoreInput } from "../../hooks/useVoiceScoreInput";
import { useLang } from "../../contexts/LangContext";
import { loadCameraCalibration } from "../../lib/cameraCalibrationStore";
import type { ScoreInputMethod } from "../../lib/scoreInput/types";
import type { Dart as UIDart } from "../../lib/types";
import { normalizeTrainingVisit, type TrainingDart } from "../lib/trainingDarts";
import "./trainingResponsive.css";

type TrainingMethod = ScoreInputMethod | "camera" | "external";

const PREFERENCE_PREFIX = "dc_training_input_v269_";
const EXTERNAL_PREF_KEY = "dc:x01v3:external-device:v1";

function readExternalPrefs(): { mode: string; bridgeUrl: string } {
  try {
    const raw = JSON.parse(localStorage.getItem(EXTERNAL_PREF_KEY) || "{}");
    return { mode: String(raw?.mode || raw?.externalDeviceMode || ""), bridgeUrl: String(raw?.bridgeUrl || raw?.externalBridgeUrl || "") };
  } catch { return { mode: "", bridgeUrl: "" }; }
}

function normalizeExternalDart(raw: any): UIDart | null {
  const segment = Number(raw?.segment ?? raw?.v);
  const multiplier = Number(raw?.multiplier ?? raw?.mult ?? 1);
  if (!Number.isInteger(segment) || (segment !== 0 && segment !== 25 && (segment < 1 || segment > 20))) return null;
  if (![0, 1, 2, 3].includes(multiplier) || (segment !== 0 && multiplier === 0) || (segment === 25 && multiplier === 3)) return null;
  return { v: segment, mult: (segment === 0 ? 1 : multiplier) as 1 | 2 | 3 };
}

function parseExternalMessage(raw: any): UIDart[] {
  let payload = raw;
  try { if (typeof raw === "string") payload = JSON.parse(raw); } catch { return []; }
  const source = payload?.payload || payload?.data || payload;
  const list = source?.darts || source?.visit?.darts || source?.visit;
  if (Array.isArray(list)) return list.slice(0, 3).map(normalizeExternalDart).filter(Boolean) as UIDart[];
  const single = normalizeExternalDart(source?.dart || source?.hit || source);
  return single ? [single] : [];
}

export default function TrainingDartPad({
  onVisit, onQuickVisit, allowQuickScore = false, enableMethods = false,
  maxQuickDarts = 3, storageKey, disabled = false, notice,
  centerSlot, requireFullVisit = false,
}: {
  onVisit: (darts: TrainingDart[]) => void;
  /** Total aggregated without inventing any locations or accuracy. */
  onQuickVisit?: (score: number, darts: number) => void;
  allowQuickScore?: boolean;
  enableMethods?: boolean;
  maxQuickDarts?: number;
  storageKey?: string;
  disabled?: boolean;
  notice?: React.ReactNode;
  centerSlot?: React.ReactNode;
  requireFullVisit?: boolean;
}) {
  const { lang } = useLang();
  const preferenceKey = `${PREFERENCE_PREFIX}${String(storageKey || "default")}`;
  const [method, setMethod] = React.useState<TrainingMethod>(() => {
    try {
      const saved = localStorage.getItem(preferenceKey);
      if (saved === "target") return "dartboard"; // V269 migration, no loss of preference.
      if (saved === "quick") return allowQuickScore ? "visit_score" : "keypad";
      if (["keypad", "visit_score", "dartboard", "presets", "voice"].includes(String(saved))) return saved as TrainingMethod;
    } catch {}
    return "keypad";
  });
  const [drawerOpen, setDrawerOpen] = React.useState(false);
  const [cameraOpen, setCameraOpen] = React.useState(false);
  const [currentThrow, setCurrentThrow] = React.useState<UIDart[]>([]);
  const [quickDarts, setQuickDarts] = React.useState<1 | 2 | 3>(3);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [externalPrefs] = React.useState(readExternalPrefs);
  const [externalConnected, setExternalConnected] = React.useState(false);
  const methodRef = React.useRef(method);
  methodRef.current = method;
  const [cameraAvailable] = React.useState(() => {
    try { return Boolean(loadCameraCalibration()) && !!navigator.mediaDevices?.getUserMedia; } catch { return false; }
  });
  const safeQuickDarts = Math.min(quickDarts, Math.max(1, maxQuickDarts));
  const canQuick = allowQuickScore && !!onQuickVisit && maxQuickDarts >= 1;
  React.useEffect(() => {
    setQuickDarts(Math.min(3, Math.max(1, maxQuickDarts)) as 1 | 2 | 3);
  }, [maxQuickDarts]);
  const wsMode = ["websocket_bridge", "scolia", "grandarts", "autodarts", "bridge"].includes(externalPrefs.mode);
  const externalConfigured = wsMode && /^wss?:\/\//i.test(externalPrefs.bridgeUrl);

  // Listen only to the already configured shared device bridge. No fabricated
  // results: the external player must explicitly validate the received darts.
  React.useEffect(() => {
    if (!enableMethods || !externalConfigured || disabled) { setExternalConnected(false); return; }
    let socket: WebSocket | null = null;
    try {
      socket = new WebSocket(externalPrefs.bridgeUrl);
      socket.onopen = () => setExternalConnected(true);
      socket.onclose = () => setExternalConnected(false);
      socket.onerror = () => setExternalConnected(false);
      socket.onmessage = (event) => {
        if (methodRef.current !== "external") return;
        const darts = parseExternalMessage(event.data);
        if (!darts.length) return;
        setCurrentThrow((previous) => {
          if (previous.length >= 3) return previous;
          if (darts.length === 3) return previous.length === 0 ? darts : previous;
          // Bridges may publish one hit at a time, or an accumulated visit.
          if (darts.length > 1 && darts.slice(0, previous.length).every((d, i) =>
            previous[i]?.v === d.v && previous[i]?.mult === d.mult)) return darts;
          return [...previous, ...darts].slice(0, 3);
        });
      };
    } catch { setExternalConnected(false); }
    return () => { setExternalConnected(false); try { socket?.close(); } catch {} };
  }, [enableMethods, disabled, externalConfigured, externalPrefs.bridgeUrl]);

  const voice = useVoiceScoreInput({
    enabled: enableMethods && method === "voice" && !disabled,
    lang: String(lang || "fr"),
    onVisitDarts: (darts) => {
      setCurrentThrow(darts.slice(0, 3).map((dart) => {
        if (dart.kind === "BULL" || dart.kind === "DBULL") return { v: 25, mult: dart.kind === "DBULL" ? 2 : 1 };
        if (dart.kind === "MISS") return { v: 0, mult: 1 };
        return { v: dart.base, mult: dart.kind === "T" ? 3 : dart.kind === "D" ? 2 : 1 };
      }) as UIDart[]);
    },
  });

  React.useEffect(() => {
    if (!disabled) return;
    setCurrentThrow([]);
    setMultiplier(1);
    voice.resetTurn();
    // Reset only on session completion; voice methods are stable per hook render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [disabled]);

  React.useEffect(() => {
    if ((method === "visit_score" && !canQuick) || (method === "camera" && !cameraAvailable) || (method === "external" && !externalConnected)) {
      setMethod("keypad");
    }
  }, [method, canQuick, cameraAvailable, externalConnected]);

  const changeMethod = (next: TrainingMethod) => {
    if (disabled || currentThrow.length > 0) return;
    if (next === "visit_score" && !canQuick) return;
    if (next === "camera" && !cameraAvailable) return;
    if (next === "external" && !externalConnected) return;
    voice.stop();
    voice.resetTurn();
    setMultiplier(1);
    setMethod(next);
    setDrawerOpen(false);
    if (next === "camera") setCameraOpen(true);
    try { localStorage.setItem(preferenceKey, next); } catch {}
  };

  const validate = React.useCallback(() => {
    if (disabled || !currentThrow.length || requireFullVisit && currentThrow.length !== 3) return;
    const visit = normalizeTrainingVisit(currentThrow);
    setCurrentThrow([]);
    setMultiplier(1);
    voice.resetTurn();
    onVisit(visit);
  }, [disabled, currentThrow, requireFullVisit, onVisit, voice.resetTurn]);

  const addDart = (dart: UIDart) => {
    if (disabled) return;
    setCurrentThrow((prev) => prev.length < 3 ? [...prev, dart] : prev);
    setMultiplier(1);
  };

  const methods: Array<{ id: TrainingMethod; label: string; icon: string; enabled: boolean; hint: string }> = [
    { id: "keypad", label: "CLAVIER / FLÉCHETTES", icon: "⌗", enabled: true, hint: "Saisie précise S/D/T avec le clavier X01 de l'application" },
    { id: "visit_score", label: "SCORE VOLÉE", icon: "∑", enabled: canQuick, hint: canQuick ? "Total de 1 à 3 fléchettes, sans précision inventée" : "Uniquement pour les exercices acceptant un score total" },
    { id: "dartboard", label: "CIBLE INTERACTIVE", icon: "◎", enabled: true, hint: "Cible du moteur de saisie utilisé par les autres jeux" },
    { id: "voice", label: "SAISIE VOCALE", icon: "♫", enabled: voice.supported, hint: voice.supported ? "Dictée fléchette par fléchette, avec validation manuelle" : "Reconnaissance vocale non disponible sur cet appareil" },
    { id: "presets", label: "PRESETS", icon: "ϟ", enabled: true, hint: "Combinaisons de fléchettes existantes, avec validation avant enregistrement" },
    { id: "camera", label: "CAMÉRA ASSISTÉE", icon: "▣", enabled: cameraAvailable, hint: cameraAvailable ? "Caméra calibrée : saisie assistée par l'outil existant" : "Configure la caméra et sa calibration dans les réglages avant de jouer" },
    { id: "external", label: "AUTODARTS / SCOLIA / GRANDARTS", icon: "◉", enabled: externalConnected, hint: externalConnected ? `${externalPrefs.mode.toUpperCase()} • connecté au bridge` : "Nécessite un appareil et une connexion bridge configurés et actifs en amont" },
  ];
  const currentMethod = methods.find((entry) => entry.id === method) || methods[0];

  return <div className="mssTrainingPad" aria-label="Saisie de l'entraînement">
    {enableMethods && <div className="mssTrainingInputToolbar">
      <button className="mssTrainingMethodButton" type="button" title="Choisir le mode de saisie" aria-label="Choisir le mode de saisie" aria-haspopup="dialog" onClick={() => setDrawerOpen(true)} disabled={disabled}>
        <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="2" y="4" width="20" height="16" rx="2"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01M7 16h10"/></svg>
      </button>
      <div className="mssTrainingMethodLabel"><small>MODE DE SAISIE</small><strong>{currentMethod.label}</strong></div>
      {method === "visit_score" && canQuick && <div className="mssTrainingQuickDarts" aria-label="Nombre de fléchettes du score de volée">
        {([1, 2, 3] as const).map((count) => <button key={count} type="button" disabled={count > maxQuickDarts || disabled}
          className={safeQuickDarts === count ? "isActive" : ""} onClick={() => setQuickDarts(count)}
          title={`${count} fléchette${count > 1 ? "s" : ""}`}>{count}</button>)}
      </div>}
      {currentThrow.length > 0 && <span className="mssTrainingPending">{currentThrow.length}/3</span>}
      {method === "camera" && <button className="mssTrainingOpenCamera" type="button" onClick={() => setCameraOpen(true)}>CAMÉRA</button>}
      {method === "external" && <span className="mssTrainingConnected">CONNECTÉ</span>}
    </div>}
    <div className="mssTrainingHubFit">
      <ScoreInputHub
        currentThrow={currentThrow} multiplier={multiplier} disabled={disabled}
        onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)}
        onBackspace={() => setCurrentThrow((prev) => prev.slice(0,-1))}
        onCancel={() => { setCurrentThrow([]); setMultiplier(1); voice.resetTurn(); }}
        onNumber={(v) => addDart({ v, mult: v === 0 ? 1 : multiplier })}
        onBull={() => addDart({ v: 25, mult: multiplier === 2 ? 2 : 1 })}
        onDirectDart={(d) => addDart(d)}
        onSetVisitDarts={(darts) => setCurrentThrow(darts.slice(0,3))}
        onValidate={validate}
        validateDisabled={requireFullVisit && currentThrow.length < 3}
        onSubmitVisitScore={canQuick ? (score) => {
          const scoreNumber = Number(score);
          if (!disabled && currentThrow.length === 0 && Number.isInteger(scoreNumber)
            && scoreNumber >= 0 && scoreNumber <= safeQuickDarts * 60) {
            onQuickVisit?.(scoreNumber, safeQuickDarts);
          }
        } : undefined}
        preferredMethod={!enableMethods || method === "camera" || method === "external" ? "keypad" : method}
        enablePresets={enableMethods}
        allowVisitScore={canQuick}
        hideSwitcher switcherMode="hidden"
        fitToParent fitMinScale={0.30}
        hideQuickVisitHint
        hideTotal={!!centerSlot} centerSlot={centerSlot}
        voiceControl={{ enabled: method === "voice" && !disabled, supported: voice.supported, phase: voice.phase,
          activity: voice.activity, lastHeard: voice.lastHeard, dartsLabel: voice.dartsLabel,
          dartsTotal: voice.dartsTotal, permissionHint: voice.permissionHint,
          expectedIndex: voice.expectedIndex, awaitingConfirm: voice.awaitingConfirm,
          onStart: voice.beginTurn, onStop: voice.stop, onReset: voice.resetTurn }}
      />
    </div>
    {drawerOpen && <div className="mssTrainingMethodsBackdrop" onMouseDown={(event) => { if (event.currentTarget === event.target) setDrawerOpen(false); }}>
      <section className="mssTrainingMethodsSheet" role="dialog" aria-modal="true" aria-label="Sélection du mode de saisie">
        <div className="mssTrainingMethodsHead"><div><small>SAISIE UNIFIÉE</small><h2>Choisir un mode de saisie</h2></div><button type="button" onClick={() => setDrawerOpen(false)} aria-label="Fermer">×</button></div>
        <div className="mssTrainingMethodsGrid">
          {methods.map((entry) => <button key={entry.id} type="button" disabled={!entry.enabled || disabled || !!currentThrow.length} onClick={() => changeMethod(entry.id)} className={entry.id === method ? "isSelected" : ""} title={entry.hint}>
            <span className="mssTrainingMethodGlyph">{entry.icon}</span><span><strong>{entry.label}</strong><small>{entry.hint}</small></span><span className="mssTrainingMethodStatus">{entry.id === method ? "✓" : entry.enabled ? "›" : "🔒"}</span>
          </button>)}
        </div>
        {currentThrow.length > 0 && <p>Valide ou annule la volée avant de changer de saisie.</p>}
      </section>
    </div>}
    <CameraAssistedOverlay open={cameraOpen} onClose={() => setCameraOpen(false)} onDart={(dart) => addDart({ v: dart.segment, mult: dart.segment === 0 || dart.multiplier === 0 ? 1 : dart.multiplier as 1 | 2 | 3 })} />
  </div>;
}
