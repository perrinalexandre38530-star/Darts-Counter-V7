// ============================================
// src/pages/petanque/PetanquePlay.tsx
// ✅ Version "UI améliorée" SANS casser ton bloc actuel
// - AUCUNE feature supprimée (manuel/photo/live + assignations)
// - Même logique & même structure
// - Styling recâblé pour coller au design global (vars CSS: --glass, --stroke, --text, --gold...)
// - Ajout de className (container/card/btn/ghost/primary/danger/badge/subtitle) EN PLUS des styles inline
//   => si tes classes existent, ça match direct; sinon les inline assurent le rendu.
//
// ✅ FIX CRASH / FREEZE LIVE:
// - Anti-overlap (pas d'empilement async)
// - requestAnimationFrame + throttle (stable)
// - ROI canvas réutilisé (pas de createElement() à chaque frame)
// - Cleanup Mat garanti
//
// ✅ FIX MOBILE SHEET SCROLL:
// - overlay: overscrollBehavior + touchAction
// - sheet: maxHeight 100dvh + overflowY + WebkitOverflowScrolling
// - header sticky (bouton Fermer toujours visible)
// - tap dehors => ferme
// - NE JAMAIS auto-start la caméra (useEffect stop-only)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";

import {
  addEnd,
  loadPetanqueState,
  resetPetanque,
  undoLastEnd,
  type PetanqueState,
  type PetanqueTeamId,
  addMeasurement,
  undoLastMeasurement,
} from "../../lib/petanqueStore";

// ✅ NEW: Config store (Mesurage autorisé + fallback)
import { loadPetanqueConfig } from "../../lib/petanqueConfigStore";

// ✅ NEW: OpenCV loader (LIVE auto-detect)
import { loadOpenCv } from "../../lib/vision/opencv";

type Props = {
  go: (tab: any, params?: any) => void;
  params?: any;
};

const PTS = [0, 1, 2, 3, 4, 5, 6];

type PhotoPoint = { x: number; y: number }; // normalized 0..1
type MeasureMode = "manual" | "photo" | "live";

export default function PetanquePlay({ go, params }: Props) {
  // ✅ Route params (évite collisions avec "mode" du mesurage)
  const matchMode = (params?.mode ?? params?.cfg?.mode ?? "singles") as any;
  const matchCfg = params?.cfg ?? null;

  const { theme } = useTheme();
  const [st, setSt] = React.useState<PetanqueState>(() => loadPetanqueState());

  // ==========================
  // ✅ MESURAGE (sheet)
  // ==========================
  const [measureOpen, setMeasureOpen] = React.useState(false);

  // IMPORTANT: le reste du fichier utilise `mode` / `setMode`.
  // Le mismatch "measureMode"/"setMeasureMode" gelait l'écran au lancement (ReferenceError).
  const [mode, setMode] = React.useState<MeasureMode>("manual");

  // ✅ Mesurage autorisé : priorité params.cfg, sinon localStorage
  const cfgFromParams = params?.cfg ?? null;
  const cfgFromStorage = (typeof loadPetanqueConfig === "function" ? loadPetanqueConfig() : null) as any;
  const effectiveCfg = (cfgFromParams ?? cfgFromStorage) as any;

  const allowMeasurements: boolean = (effectiveCfg?.options?.allowMeasurements ?? true) === true;

  // si interdit : ferme le sheet
  React.useEffect(() => {
    if (!allowMeasurements && measureOpen) setMeasureOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allowMeasurements]);

  const onAdd = (team: PetanqueTeamId, pts: number) => setSt(addEnd(st, team, pts));
  const onUndo = () => setSt(undoLastEnd(st));
  const onNew = () => setSt(resetPetanque(st));

  // --- Manuel
  const [dA, setDA] = React.useState<string>("");
  const [dB, setDB] = React.useState<string>("");
  const [tol, setTol] = React.useState<string>("1"); // cm si manuel ; px si photo non calibrée ; screen si live
  const [note, setNote] = React.useState<string>("");

  const numOrNaN = (v: string) => {
    const n = Number(String(v).replace(",", "."));
    return Number.isFinite(n) ? n : NaN;
  };

  const dAN = numOrNaN(dA);
  const dBN = numOrNaN(dB);
  const tolN = Math.max(0, numOrNaN(tol));

  const canComputeManual =
    Number.isFinite(dAN) && Number.isFinite(dBN) && dAN >= 0 && dBN >= 0 && Number.isFinite(tolN);

  const deltaManual = canComputeManual ? Math.abs(dAN - dBN) : NaN;

  const manualWinner: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (!canComputeManual) return null;
    if (deltaManual <= tolN) return "TIE";
    return dAN < dBN ? "A" : "B";
  }, [canComputeManual, deltaManual, tolN, dAN, dBN]);

  const manualText = React.useMemo(() => {
    if (!canComputeManual) return "Renseigne les 2 distances (cm).";
    if (manualWinner === "TIE") return `Égalité (≤ ${tolN} cm) — à re-mesurer`;
    if (manualWinner === "A") return `${st.teamA} est devant (+${deltaManual.toFixed(1)} cm)`;
    if (manualWinner === "B") return `${st.teamB} est devant (+${deltaManual.toFixed(1)} cm)`;
    return "";
  }, [canComputeManual, manualWinner, tolN, st.teamA, st.teamB, deltaManual]);

  const onSaveManual = () => {
    if (!canComputeManual) return;
    setSt(
      addMeasurement(st, {
        dA: dAN,
        dB: dBN,
        tol: tolN,
        note,
      })
    );
    setDA("");
    setDB("");
    setNote("");
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ PHOTO (multi-boules)
  // ==========================
  const [imgUrl, setImgUrl] = React.useState<string | null>(null);
  const [imgNatural, setImgNatural] = React.useState<{ w: number; h: number } | null>(null);

  const [pCochonnet, setPCochonnet] = React.useState<PhotoPoint | null>(null);
  const [ballsA, setBallsA] = React.useState<PhotoPoint[]>([]);
  const [ballsB, setBallsB] = React.useState<PhotoPoint[]>([]);

  // Calibration optionnelle
  const [calA, setCalA] = React.useState<PhotoPoint | null>(null);
  const [calB, setCalB] = React.useState<PhotoPoint | null>(null);
  const [calLenCm, setCalLenCm] = React.useState<string>("");
  const [calArm, setCalArm] = React.useState<"A" | "B" | null>(null);

  const [addSide, setAddSide] = React.useState<PetanqueTeamId>("A");
  const [loupeOn, setLoupeOn] = React.useState(true);
  const [hoverPt, setHoverPt] = React.useState<PhotoPoint | null>(null);

  const imgRef = React.useRef<HTMLImageElement | null>(null);

  const clearPhoto = () => {
    if (imgUrl) URL.revokeObjectURL(imgUrl);
    setImgUrl(null);
    setImgNatural(null);
    setPCochonnet(null);
    setBallsA([]);
    setBallsB([]);
    setCalA(null);
    setCalB(null);
    setCalLenCm("");
    setCalArm(null);
    setHoverPt(null);
  };

  const onPickImage: React.ChangeEventHandler<HTMLInputElement> = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    clearPhoto();
    const url = URL.createObjectURL(f);
    setImgUrl(url);
  };

  const getPointFromEvent = (evt: React.MouseEvent, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    const x = (evt.clientX - r.left) / r.width;
    const y = (evt.clientY - r.top) / r.height;
    return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
  };

  const distPx = (a: PhotoPoint, b: PhotoPoint, nat: { w: number; h: number }) => {
    const ax = a.x * nat.w,
      ay = a.y * nat.h;
    const bx = b.x * nat.w,
      by = b.y * nat.h;
    const dx = ax - bx,
      dy = ay - by;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const calLenN = numOrNaN(calLenCm);
  const hasCalibration = !!(imgNatural && calA && calB && Number.isFinite(calLenN) && calLenN > 0);

  const pxPerCm = React.useMemo(() => {
    if (!hasCalibration || !imgNatural || !calA || !calB) return null;
    const d = distPx(calA, calB, imgNatural);
    if (d <= 0) return null;
    return d / calLenN; // px/cm
  }, [hasCalibration, imgNatural, calA, calB, calLenN]);

  const distValuePhoto = (p: PhotoPoint) => {
    if (!imgNatural || !pCochonnet) return null;
    const dpx = distPx(pCochonnet, p, imgNatural);
    return pxPerCm ? dpx / pxPerCm : dpx; // cm si calibré, sinon px
  };

  const minA_photo = React.useMemo(() => {
    if (!pCochonnet || !ballsA.length) return null;
    const vals = ballsA
      .map((b) => distValuePhoto(b))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [pCochonnet, ballsA, imgNatural, pxPerCm]);

  const minB_photo = React.useMemo(() => {
    if (!pCochonnet || !ballsB.length) return null;
    const vals = ballsB
      .map((b) => distValuePhoto(b))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [pCochonnet, ballsB, imgNatural, pxPerCm]);

  const winnerPhoto: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (minA_photo == null || minB_photo == null) return null;
    const d = Math.abs(minA_photo - minB_photo);
    if (d <= Math.max(0, tolN)) return "TIE";
    return minA_photo < minB_photo ? "A" : "B";
  }, [minA_photo, minB_photo, tolN]);

  const onPhotoClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    if (calArm) {
      if (calArm === "A") setCalA(pt);
      else setCalB(pt);
      setCalArm(null);
      return;
    }
    if (!pCochonnet) return setPCochonnet(pt);
    if (addSide === "A") setBallsA((cur) => [...cur, pt]);
    else setBallsB((cur) => [...cur, pt]);
  };

  const onPhotoMove: React.MouseEventHandler<HTMLDivElement> = (e) => {
    if (!loupeOn) return;
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    setHoverPt(pt);
  };

  const onClearPhotoPoints = () => {
    setPCochonnet(null);
    setBallsA([]);
    setBallsB([]);
    setHoverPt(null);
  };

  const onSavePhoto = () => {
    if (minA_photo == null || minB_photo == null) return;
    const isCm = !!pxPerCm;
    const extra =
      (note?.trim() ? note.trim() + " — " : "") +
      `photo ${isCm ? "calibrée" : "non calibrée"} — A:${ballsA.length} / B:${ballsB.length} — unité:${isCm ? "cm" : "px"}`;

    setSt(
      addMeasurement(st, {
        dA: Number(minA_photo),
        dB: Number(minB_photo),
        tol: Math.max(0, Number(tolN) || 0),
        note: extra,
      })
    );
    onClearPhotoPoints();
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ LIVE (caméra + radar + AUTO-DETECT OpenCV)
  // ==========================
  const videoRef = React.useRef<HTMLVideoElement | null>(null);
  const streamRef = React.useRef<MediaStream | null>(null);
  const liveWrapRef = React.useRef<HTMLDivElement | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null); // OpenCV processing

  // cochonnet = centre de la mire
  const liveC: PhotoPoint = { x: 0.5, y: 0.5 };

  const [liveOn, setLiveOn] = React.useState(false);
  const [liveErr, setLiveErr] = React.useState<string | null>(null);

  // Auto-detect state
  const [autoOn, setAutoOn] = React.useState(true);
  const [circles, setCircles] = React.useState<Array<{ x: number; y: number; r: number }>>([]);
  const [nearestIdx, setNearestIdx] = React.useState<number | null>(null);

  // ✅ NEW: assignation équipes sur cercles détectés (AUTO mode)
  const [assignSide, setAssignSide] = React.useState<PetanqueTeamId>("A");
  const [circleTeam, setCircleTeam] = React.useState<Record<number, PetanqueTeamId>>({});

  // Manual fallback (tap)
  const [liveA, setLiveA] = React.useState<PhotoPoint[]>([]);
  const [liveB, setLiveB] = React.useState<PhotoPoint[]>([]);
  const [liveAddSide, setLiveAddSide] = React.useState<PetanqueTeamId>("A");

  // ==========================
  // ✅ LIVE settings (PRO)
  // ==========================
  const [roiPct, setRoiPct] = React.useState<number>(0.7); // 0.4..1 (zone utile centrée)
  const [minRadius, setMinRadius] = React.useState<number>(10);
  const [maxRadius, setMaxRadius] = React.useState<number>(60);
  const [param2, setParam2] = React.useState<number>(26); // seuil Hough (plus haut = moins de faux positifs)

  const [livePaused, setLivePaused] = React.useState(false);

  // tracking anti-sauts
  const lastNearestRef = React.useRef<{ x: number; y: number; r: number } | null>(null);
  const stableNearestRef = React.useRef<{ x: number; y: number; r: number } | null>(null);

  const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

  // Pause si onglet inactif
  React.useEffect(() => {
    const onVis = () => setLivePaused(document.visibilityState !== "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ✅ BONUS MOBILE: startLive "user gesture safe" + reset iOS + v.play()
  const startLive = async () => {
    try {
      setLiveErr(null);

      // iOS: reset d’abord
      stopLive();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" as any, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });

      streamRef.current = stream;

      const v = videoRef.current;
      if (v) {
        v.srcObject = stream;
        // Sur iOS, play() peut échouer si pas appelé depuis un tap : ici on est dans onClick => OK
        await v.play().catch(() => {});
      }

      setLiveOn(true);
    } catch (e: any) {
      setLiveOn(false);
      setLiveErr(e?.message || "Caméra indisponible");
    }
  };

  const stopLive = () => {
    setLiveOn(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      try {
        videoRef.current.pause();
        (videoRef.current as any).srcObject = null;
      } catch {}
    }
  };

  const clearLive = () => {
    setLiveA([]);
    setLiveB([]);
    setCircles([]);
    setNearestIdx(null);
    lastNearestRef.current = null;
    stableNearestRef.current = null;
    setCircleTeam({});
  };

  const onLiveClick: React.MouseEventHandler<HTMLDivElement> = (e) => {
    const wrap = e.currentTarget;
    const pt = getPointFromEvent(e, wrap);
    if (liveAddSide === "A") setLiveA((cur) => [...cur, pt]);
    else setLiveB((cur) => [...cur, pt]);
  };

  const liveDist = (p: PhotoPoint) => {
    const dx = p.x - liveC.x;
    const dy = p.y - liveC.y;
    return Math.sqrt(dx * dx + dy * dy); // unités écran (normalized)
  };

  const minA_live = React.useMemo(() => {
    if (!liveA.length) return null;
    return Math.min(...liveA.map(liveDist));
  }, [liveA]);

  const minB_live = React.useMemo(() => {
    if (!liveB.length) return null;
    return Math.min(...liveB.map(liveDist));
  }, [liveB]);

  // ==========================
  // ✅ AUTO compare A vs B (sur cercles détectés + assignations)
  // ==========================
  const distToCenter = (p: { x: number; y: number }) => {
    const dx = p.x - 0.5;
    const dy = p.y - 0.5;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const autoMinA = React.useMemo(() => {
    const vals: number[] = [];
    circles.forEach((c, idx) => {
      if (circleTeam[idx] === "A") vals.push(distToCenter(c));
    });
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [circles, circleTeam]);

  const autoMinB = React.useMemo(() => {
    const vals: number[] = [];
    circles.forEach((c, idx) => {
      if (circleTeam[idx] === "B") vals.push(distToCenter(c));
    });
    if (!vals.length) return null;
    return Math.min(...vals);
  }, [circles, circleTeam]);

  const autoWinner: "A" | "B" | "TIE" | null = React.useMemo(() => {
    if (autoMinA == null || autoMinB == null) return null;
    const d = Math.abs(autoMinA - autoMinB);
    if (d <= Math.max(0, tolN)) return "TIE";
    return autoMinA < autoMinB ? "A" : "B";
  }, [autoMinA, autoMinB, tolN]);

  // ==========================
  // ✅ AUTO-DETECT LOOP (OpenCV) — PRO (ROI + anti-sauts + sliders + pause)
  // ✅ FIX FREEZE:
  // - Ne charge OpenCV QUE si caméra ON + onglet LIVE + sheet ouvert + autoOn
  // - Attend video ready (videoWidth/videoHeight)
  // - Charge WASM en idle (évite le pic qui freeze)
  // - RAF non-async + throttle + anti-overlap + cleanup
  // ==========================

  React.useEffect(() => {
    // On ne fait RIEN tant que:
    // - sheet pas ouvert
    // - pas sur l'onglet live
    // - autoOff
    // - caméra pas démarrée
    if (!measureOpen) return;
    if (mode !== "live") return;
    if (!autoOn) return;
    if (!liveOn) return; // ✅ IMPORTANT: évite de charger OpenCV dès l'ouverture du tab

    let alive = true;
    let cv: any = null;

    let raf = 0;
    let busy = false;

    const TICK_MS = 220;
    let lastTick = 0;

    // ROI canvas réutilisé
    const roiCanvas = document.createElement("canvas");
    const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });

    const ema = (prev: number, next: number, a: number) => prev * (1 - a) + next * a;

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    // ✅ Attendre que la vidéo soit réellement prête
    const waitVideoReady = async () => {
      const video = videoRef.current;
      if (!video) return false;

      if (video.videoWidth > 0 && video.videoHeight > 0) return true;

      await new Promise<void>((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          cleanup();
          resolve();
        };

        const cleanup = () => {
          try {
            video.removeEventListener("loadedmetadata", finish);
            video.removeEventListener("playing", finish);
          } catch {}
          try {
            window.clearTimeout(tid);
          } catch {}
        };

        const tid = window.setTimeout(finish, 1200);
        video.addEventListener("loadedmetadata", finish, { once: true });
        video.addEventListener("playing", finish, { once: true });
      });

      return !!(video.videoWidth > 0 && video.videoHeight > 0);
    };

    const step = () => {
      if (!alive) return;
      if (!autoOn) return;
      if (!liveOn) return;
      if (livePaused) return;
      if (busy) return;

      const now = performance.now();
      if (now - lastTick < TICK_MS) return;
      lastTick = now;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || !roiCtx || !cv) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

      busy = true;
      try {
        // downscale for perf
        const targetW = 520;
        const scale = targetW / w;
        const cw = Math.max(240, Math.floor(w * scale));
        const ch = Math.max(160, Math.floor(h * scale));

        // ROI centered
        const roi = Math.max(0.4, Math.min(1, roiPct));
        const rw = Math.floor(cw * roi);
        const rh = Math.floor(ch * roi);
        const rx = Math.floor((cw - rw) / 2);
        const ry = Math.floor((ch - rh) / 2);

        canvas.width = cw;
        canvas.height = ch;

        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;

        ctx.drawImage(video, 0, 0, cw, ch);

        // ROI canvas (reuse)
        roiCanvas.width = rw;
        roiCanvas.height = rh;
        roiCtx.clearRect(0, 0, rw, rh);
        roiCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);

        // OpenCV: gray + blur + HoughCircles on ROI
        const src = cv.imread(roiCanvas);
        const gray = new cv.Mat();
        const out = new cv.Mat();

        try {
          cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
          cv.GaussianBlur(gray, gray, new cv.Size(7, 7), 1.5, 1.5, cv.BORDER_DEFAULT);

          cv.HoughCircles(
            gray,
            out,
            cv.HOUGH_GRADIENT,
            1.2,
            22,
            120,
            Math.max(5, Math.floor(param2)),
            Math.max(1, Math.floor(minRadius)),
            Math.max(1, Math.floor(maxRadius))
          );

          const found: Array<{ x: number; y: number; r: number }> = [];
          for (let i = 0; i < out.cols; i++) {
            const xRoi = out.data32F[i * 3 + 0];
            const yRoi = out.data32F[i * 3 + 1];
            const rRoi = out.data32F[i * 3 + 2];

            const xFull = rx + xRoi;
            const yFull = ry + yRoi;

            const nx = xFull / cw;
            const ny = yFull / ch;

            const border = 0.06;
            if (nx < border || nx > 1 - border || ny < border || ny > 1 - border) continue;

            found.push({
              x: clamp01(nx),
              y: clamp01(ny),
              r: rRoi / Math.max(cw, ch),
            });
          }

          // Tracking anti-sauts
          const last = lastNearestRef.current;
          const matchThreshold = 0.08;
          let chosenIdx: number | null = null;

          if (last && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], last);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0 && bestD <= matchThreshold) chosenIdx = bestIdx;
          }

          if (chosenIdx == null && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], { x: 0.5, y: 0.5, r: 0 });
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0) chosenIdx = bestIdx;
          }

          // EMA smoothing
          const alpha = 0.35;
          if (chosenIdx != null) {
            const picked = found[chosenIdx];
            lastNearestRef.current = picked;

            const stable = stableNearestRef.current;
            if (!stable) stableNearestRef.current = { ...picked };
            else {
              stableNearestRef.current = {
                x: ema(stable.x, picked.x, alpha),
                y: ema(stable.y, picked.y, alpha),
                r: ema(stable.r, picked.r, alpha),
              };
            }
          } else {
            lastNearestRef.current = null;
            stableNearestRef.current = null;
          }

          // stableIdx = closest to smoothed
          let stableIdx: number | null = null;
          const stable = stableNearestRef.current;
          if (stable && found.length) {
            let bestIdx = -1;
            let bestD = Infinity;
            for (let i = 0; i < found.length; i++) {
              const d = dist(found[i], stable as any);
              if (d < bestD) {
                bestD = d;
                bestIdx = i;
              }
            }
            if (bestIdx >= 0) stableIdx = bestIdx;
          }

          if (alive) {
            setCircles(found);
            setNearestIdx(stableIdx);
          }
        } finally {
          // ✅ cleanup garanti
          src.delete();
          gray.delete();
          out.delete();
        }
      } catch (e: any) {
        if (!alive) return;
        setLiveErr(e?.message || "OpenCV indisponible");
        setAutoOn(false);
      } finally {
        busy = false;
      }
    };

    const frame = () => {
      if (!alive) return;
      step();
      raf = requestAnimationFrame(frame);
    };

    const scheduleLoad = (fn: () => void) => {
      const w = window as any;
      if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(fn, { timeout: 1500 });
      else window.setTimeout(fn, 50);
    };

    scheduleLoad(() => {
      (async () => {
        try {
          const ok = await waitVideoReady();
          if (!alive) return;
          if (!ok) return;

          cv = await loadOpenCv();
          if (!alive) return;

          raf = requestAnimationFrame(frame);
        } catch (e: any) {
          if (!alive) return;
          setLiveErr(e?.message || "OpenCV indisponible");
          setAutoOn(false);
        }
      })();
    });

    return () => {
      alive = false;
      try {
        if (raf) cancelAnimationFrame(raf);
      } catch {}
    };
  }, [measureOpen, mode, autoOn, liveOn, livePaused, roiPct, minRadius, maxRadius, param2]);

  // ✅ IMPORTANT MOBILE: stop-only (NE JAMAIS auto-start la caméra)
  React.useEffect(() => {
    // Quand on ferme le sheet : on coupe la caméra et on reset
    if (!measureOpen) {
      stopLive();
      setMode("manual");
      setCalArm(null);
      return;
    }

    // Quand on quitte l'onglet LIVE : on coupe la caméra (mais on ne la démarre jamais tout seul)
    if (measureOpen && mode !== "live") {
      stopLive();
    }

    // IMPORTANT: on NE start PAS la caméra automatiquement ici.
    // Sur mobile, getUserMedia doit être déclenché par un geste utilisateur (tap sur un bouton).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureOpen, mode]);

  const onSaveLive = () => {
    // ✅ AUTO mode: compare A vs B from assigned circles
    if (autoOn) {
      if (autoMinA == null || autoMinB == null) return;

      const extra =
        (note?.trim() ? note.trim() + " — " : "") +
        `live auto-detect PRO — assignations A/B — ROI:${Math.round(roiPct * 100)}% — r[${minRadius},${maxRadius}] — p2:${param2} — cercles:${circles.length} — unité:screen`;

      setSt(
        addMeasurement(st, {
          dA: Number(autoMinA),
          dB: Number(autoMinB),
          tol: Math.max(0, Number(tolN) || 0),
          note: extra,
        })
      );

      clearLive();
      setMeasureOpen(false);
      return;
    }

    // Manual (tap) live: requires at least one ball A and B
    if (minA_live == null || minB_live == null) return;

    const extra =
      (note?.trim() ? note.trim() + " — " : "") +
      `live manual — centre=cible — A:${liveA.length} / B:${liveB.length} — unité:screen`;

    setSt(
      addMeasurement(st, {
        dA: Number(minA_live),
        dB: Number(minB_live),
        tol: Math.max(0, Number(tolN) || 0),
        note: extra,
      })
    );

    clearLive();
    setMeasureOpen(false);
  };

  // ==========================
  // ✅ Store actions
  // ==========================
  const onUndoMeasurement = () => setSt(undoLastMeasurement(st));

  const measurements = (st as any).measurements as
    | Array<{
        id: string;
        at: number;
        dA: number;
        dB: number;
        winner: "A" | "B" | "TIE";
        delta: number;
        tol: number;
        note?: string;
      }>
    | undefined;

  return (
    <div className="container" style={wrap(theme)}>
      <div style={topBar}>
        <button className="btn ghost" style={ghost(theme)} onClick={() => go("games")}>
          ← Jeux
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={title(theme)}>PÉTANQUE</div>

          {/* ✅ Cache le bouton “Mesurer” si interdit */}
          {allowMeasurements && (
            <button className="btn primary" style={chipBtn(theme)} onClick={() => setMeasureOpen(true)}>
              Mesurer
            </button>
          )}
        </div>

        <button className="btn ghost" style={ghost(theme)} onClick={() => go("home")}>
          Home
        </button>
      </div>

      <div className="card" style={card(theme)}>
        <div style={heroGlow} aria-hidden />
        <div style={scoreLine(theme)}>
          <span className="badge" style={chip(theme)} title={st.teamA}>
            {st.teamA}
          </span>
          <span style={score(theme)}>{st.scoreA}</span>
          <span style={sep(theme)}>—</span>
          <span style={score(theme)}>{st.scoreB}</span>
          <span className="badge" style={chip(theme)} title={st.teamB}>
            {st.teamB}
          </span>
        </div>

        {st.finished && (
          <div className="badge" style={win(theme)}>
            Victoire : {st.winner === "A" ? st.teamA : st.teamB}
          </div>
        )}
      </div>

      <div style={grid2}>
        <div className="card" style={card(theme)}>
          <div className="subtitle" style={sub(theme)}>
            Mène — {st.teamA}
          </div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button
                key={`A-${p}`}
                className="btn"
                style={ptBtn(theme)}
                onClick={() => onAdd("A", p)}
                disabled={st.finished}
              >
                +{p}
              </button>
            ))}
          </div>
        </div>

        <div className="card" style={card(theme)}>
          <div className="subtitle" style={sub(theme)}>
            Mène — {st.teamB}
          </div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button
                key={`B-${p}`}
                className="btn"
                style={ptBtn(theme)}
                onClick={() => onAdd("B", p)}
                disabled={st.finished}
              >
                +{p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="card" style={card(theme)}>
        <div className="subtitle" style={sub(theme)}>
          Actions
        </div>
        <div style={row}>
          <button className="btn" style={primary(theme)} onClick={onUndo} disabled={!st.ends.length}>
            Annuler dernière mène
          </button>
          <button className="btn danger" style={danger(theme)} onClick={onNew}>
            Nouvelle partie
          </button>
        </div>
      </div>

      {/* ✅ MESURES (historique) */}
      <div className="card" style={card(theme)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div className="subtitle" style={sub(theme)}>
            Mesurages
          </div>
          <button
            className="btn ghost"
            style={ghost(theme)}
            onClick={onUndoMeasurement}
            disabled={!measurements?.length}
            title="Annuler la dernière mesure enregistrée"
          >
            Annuler mesure
          </button>
        </div>

        {!measurements?.length ? (
          <div className="subtitle" style={muted(theme)}>
            Aucun mesurage enregistré.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {measurements.slice(0, 8).map((m) => {
              const who = m.winner === "TIE" ? "Égalité" : m.winner === "A" ? st.teamA : st.teamB;
              return (
                <div key={m.id} style={endRow(theme)}>
                  <div className="badge" style={pill(theme)}>
                    {who}
                  </div>
                  <div style={endTxt(theme)}>
                    A {m.dA} — B {m.dB} — Δ {m.delta.toFixed(3)} (tol {m.tol})
                    {m.note ? ` — ${m.note}` : ""}
                  </div>
                </div>
              );
            })}
            {measurements.length > 8 && (
              <div className="subtitle" style={muted(theme)}>
                … {measurements.length - 8} autres mesures.
              </div>
            )}
          </div>
        )}
      </div>

      <div className="card" style={card(theme)}>
        <div className="subtitle" style={sub(theme)}>
          Historique des mènes
        </div>
        {!st.ends.length ? (
          <div className="subtitle" style={muted(theme)}>
            Aucune mène enregistrée.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {st.ends.map((e, idx) => (
              <div key={e.id} style={endRow(theme)}>
                <div className="badge" style={pill(theme)}>
                  {e.winner === "A" ? st.teamA : st.teamB}
                </div>
                <div style={endTxt(theme)}>
                  +{e.points} — mène #{st.ends.length - idx}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ Empêche le rendu du sheet si interdit */}
      {allowMeasurements && measureOpen && (
        <div
          style={overlay}
          onClick={() => setMeasureOpen(false)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="card"
            style={sheet(theme)}
            onClick={(e) => e.stopPropagation()}
          >
            {/* ✅ HEADER STICKY (Fermer toujours visible) */}
            <div
              style={{
                position: "sticky",
                top: 0,
                zIndex: 5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                paddingBottom: 10,
                marginBottom: 2,
                background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
                backdropFilter: "blur(14px)",
              }}
            >
              <div className="subtitle" style={sub(theme)}>
                Mesurage
              </div>
              <button className="btn ghost" style={ghost(theme)} onClick={() => setMeasureOpen(false)}>
                Fermer
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" style={modeBtn(theme, mode === "manual")} onClick={() => setMode("manual")}>
                Manuel
              </button>
              <button className="btn" style={modeBtn(theme, mode === "photo")} onClick={() => setMode("photo")}>
                Photo
              </button>
              <button className="btn" style={modeBtn(theme, mode === "live")} onClick={() => setMode("live")}>
                LIVE Radar
              </button>
            </div>

            {/* Shared */}
            <div style={row}>
              <div style={{ flex: 1 }}>
                <div className="subtitle" style={label(theme)}>
                  Tolérance
                </div>
                <input
                  className="input"
                  style={input(theme)}
                  value={tol}
                  onChange={(e) => setTol(e.target.value)}
                  placeholder="1"
                  inputMode="decimal"
                />
              </div>

              <div style={{ flex: 2 }}>
                <div className="subtitle" style={label(theme)}>
                  Note (optionnel)
                </div>
                <input
                  className="input"
                  style={input(theme)}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: mesure serrée / terrain incliné…"
                />
              </div>
            </div>

            {mode === "manual" ? (
              <>
                <div className="subtitle" style={hint(theme)}>
                  Saisis les distances en centimètres (cochonnet → boule A / boule B).
                </div>

                <div style={grid2}>
                  <div className="card" style={cardSoft(theme)}>
                    <div className="subtitle" style={sub(theme)}>
                      {st.teamA}
                    </div>
                    <input
                      className="input"
                      style={input(theme)}
                      value={dA}
                      onChange={(e) => setDA(e.target.value)}
                      placeholder="Distance (cm)"
                      inputMode="decimal"
                    />
                  </div>
                  <div className="card" style={cardSoft(theme)}>
                    <div className="subtitle" style={sub(theme)}>
                      {st.teamB}
                    </div>
                    <input
                      className="input"
                      style={input(theme)}
                      value={dB}
                      onChange={(e) => setDB(e.target.value)}
                      placeholder="Distance (cm)"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                <div style={resultBox(theme, manualWinner)}>{manualText}</div>

                <div style={row}>
                  <button className="btn primary" style={primary(theme)} onClick={onSaveManual} disabled={!canComputeManual}>
                    Enregistrer la mesure
                  </button>
                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={() => {
                      setDA("");
                      setDB("");
                      setNote("");
                    }}
                  >
                    Effacer
                  </button>
                </div>
              </>
            ) : mode === "photo" ? (
              <>
                <div className="subtitle" style={hint(theme)}>
                  Photo : clique d’abord le cochonnet (C), puis ajoute des boules (A/B). Calibration optionnelle.
                </div>

                <div style={row}>
                  <label className="btn" style={fileBtn(theme)}>
                    Ajouter une photo
                    <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
                  </label>

                  <button className="btn ghost" style={ghost(theme)} onClick={clearPhoto} disabled={!imgUrl}>
                    Réinitialiser
                  </button>
                  <button className="btn ghost" style={ghost(theme)} onClick={() => setLoupeOn((v) => !v)} disabled={!imgUrl}>
                    Loupe: {loupeOn ? "ON" : "OFF"}
                  </button>
                </div>

                <div className="card" style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div className="subtitle" style={sub(theme)}>
                      Ajout de boules
                    </div>
                    <div className="subtitle" style={muted(theme)}>
                      A:{ballsA.length} / B:{ballsB.length}
                    </div>
                  </div>

                  <div style={row}>
                    <button className="btn" style={modeBtn(theme, addSide === "A")} onClick={() => setAddSide("A")}>
                      Ajouter {st.teamA}
                    </button>
                    <button className="btn" style={modeBtn(theme, addSide === "B")} onClick={() => setAddSide("B")}>
                      Ajouter {st.teamB}
                    </button>
                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={onClearPhotoPoints}
                      disabled={!pCochonnet && !ballsA.length && !ballsB.length}
                    >
                      Effacer points
                    </button>
                  </div>

                  <div className="subtitle" style={muted(theme)}>
                    Clic image ={" "}
                    {calArm ? `Calibration ${calArm}` : !pCochonnet ? "Définir cochonnet (C)" : `Ajouter boule (${addSide})`}
                  </div>
                </div>

                <div className="card" style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div className="subtitle" style={sub(theme)}>
                      Calibration (optionnel)
                    </div>
                    <div className="subtitle" style={muted(theme)}>
                      {pxPerCm ? `OK: ~${pxPerCm.toFixed(1)} px/cm` : "Non calibrée"}
                    </div>
                  </div>

                  <div style={row}>
                    <button className="btn ghost" style={ghost(theme)} onClick={() => setCalArm("A")} disabled={!imgUrl}>
                      Point Cal A {calArm === "A" ? "(clic…)" : ""}
                    </button>
                    <button className="btn ghost" style={ghost(theme)} onClick={() => setCalArm("B")} disabled={!imgUrl}>
                      Point Cal B {calArm === "B" ? "(clic…)" : ""}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div className="subtitle" style={label(theme)}>
                        Longueur réelle (cm)
                      </div>
                      <input
                        className="input"
                        style={input(theme)}
                        value={calLenCm}
                        onChange={(e) => setCalLenCm(e.target.value)}
                        placeholder="ex: 10"
                        inputMode="decimal"
                      />
                    </div>

                    <button
                      className="btn ghost"
                      style={ghost(theme)}
                      onClick={() => {
                        setCalA(null);
                        setCalB(null);
                        setCalLenCm("");
                        setCalArm(null);
                      }}
                      disabled={!calA && !calB && !calLenCm}
                    >
                      Effacer calib
                    </button>
                  </div>
                </div>

                {imgUrl ? (
                  <div style={imgWrap(theme)}>
                    <div className="subtitle" style={imgHint(theme)}>
                      {calArm
                        ? `Calibration: clique le point ${calArm}`
                        : !pCochonnet
                        ? "Clique le cochonnet (C)."
                        : `Clique pour ajouter une boule (${addSide}).`}
                    </div>

                    <div style={imgClickArea} onClick={onPhotoClick} onMouseMove={onPhotoMove}>
                      <img
                        ref={imgRef}
                        src={imgUrl}
                        alt="Mesurage"
                        style={imgStyle}
                        onLoad={(e) => {
                          const el = e.currentTarget;
                          setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
                        }}
                        draggable={false}
                      />

                      {imgNatural && pCochonnet && (
                        <svg style={svgOverlay} viewBox="0 0 100 100" preserveAspectRatio="none">
                          {ballsA.map((b, i) => (
                            <line
                              key={`la-${i}`}
                              x1={pCochonnet.x * 100}
                              y1={pCochonnet.y * 100}
                              x2={b.x * 100}
                              y2={b.y * 100}
                              stroke="rgba(0,255,180,0.90)"
                              strokeWidth="0.6"
                            />
                          ))}
                          {ballsB.map((b, i) => (
                            <line
                              key={`lb-${i}`}
                              x1={pCochonnet.x * 100}
                              y1={pCochonnet.y * 100}
                              x2={b.x * 100}
                              y2={b.y * 100}
                              stroke="rgba(255,120,120,0.90)"
                              strokeWidth="0.6"
                            />
                          ))}
                        </svg>
                      )}

                      {imgNatural && (
                        <>
                          {pCochonnet && <div style={marker(theme, pCochonnet, "C")} />}
                          {ballsA.map((b, i) => (
                            <div key={`ma-${i}`} style={marker(theme, b, `A${i + 1}`)} />
                          ))}
                          {ballsB.map((b, i) => (
                            <div key={`mb-${i}`} style={marker(theme, b, `B${i + 1}`)} />
                          ))}
                          {calA && <div style={marker(theme, calA, "cA")} />}
                          {calB && <div style={marker(theme, calB, "cB")} />}
                        </>
                      )}

                      {loupeOn && imgUrl && hoverPt && <div style={loupeStyle(imgUrl, hoverPt)} aria-hidden />}
                    </div>

                    <div style={resultBox(theme, winnerPhoto)}>
                      {minA_photo == null || minB_photo == null
                        ? "Ajoute au moins 1 boule A et 1 boule B pour comparer."
                        : `Plus proche A: ${minA_photo.toFixed(pxPerCm ? 1 : 0)} ${pxPerCm ? "cm" : "px"} — B: ${minB_photo.toFixed(
                            pxPerCm ? 1 : 0
                          )} ${pxPerCm ? "cm" : "px"}`}
                    </div>

                    <div style={row}>
                      <button
                        className="btn primary"
                        style={primary(theme)}
                        onClick={onSavePhoto}
                        disabled={minA_photo == null || minB_photo == null}
                      >
                        Enregistrer (photo)
                      </button>
                      <button className="btn ghost" style={ghost(theme)} onClick={() => setPCochonnet(null)} disabled={!pCochonnet}>
                        Replacer C
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="subtitle" style={muted(theme)}>
                    Aucune image chargée.
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="subtitle" style={hint(theme)}>
                  LIVE Auto Radar : cadre le cochonnet au centre (mire). L’app détecte des cercles (boules) et entoure la plus
                  proche en direct. En mode auto, clique sur les cercles pour les assigner à A/B.
                </div>

                <div style={row}>
                  <button className="btn" style={modeBtn(theme, autoOn)} onClick={() => setAutoOn(true)} disabled={!liveOn}>
                    Auto ON
                  </button>
                  <button className="btn" style={modeBtn(theme, !autoOn)} onClick={() => setAutoOn(false)} disabled={!liveOn}>
                    Auto OFF (tap)
                  </button>

                  {autoOn && (
                    <>
                      <button
                        className="btn"
                        style={modeBtn(theme, assignSide === "A")}
                        onClick={() => setAssignSide("A")}
                        disabled={!liveOn}
                        title="Clique ensuite sur un cercle pour l'assigner à A"
                      >
                        Assigner {st.teamA}
                      </button>
                      <button
                        className="btn"
                        style={modeBtn(theme, assignSide === "B")}
                        onClick={() => setAssignSide("B")}
                        disabled={!liveOn}
                        title="Clique ensuite sur un cercle pour l'assigner à B"
                      >
                        Assigner {st.teamB}
                      </button>
                      <button
                        className="btn ghost"
                        style={ghost(theme)}
                        onClick={() => setCircleTeam({})}
                        disabled={!Object.keys(circleTeam).length}
                        title="Effacer toutes les assignations A/B"
                      >
                        Reset équipes
                      </button>
                    </>
                  )}

                  {!autoOn && (
                    <>
                      <button className="btn" style={modeBtn(theme, liveAddSide === "A")} onClick={() => setLiveAddSide("A")}>
                        Ajouter {st.teamA}
                      </button>
                      <button className="btn" style={modeBtn(theme, liveAddSide === "B")} onClick={() => setLiveAddSide("B")}>
                        Ajouter {st.teamB}
                      </button>
                    </>
                  )}

                  <button
                    className="btn ghost"
                    style={ghost(theme)}
                    onClick={clearLive}
                    disabled={!circles.length && !liveA.length && !liveB.length && !Object.keys(circleTeam).length}
                  >
                    Effacer
                  </button>

                  <button className="btn ghost" style={ghost(theme)} onClick={liveOn ? stopLive : startLive}>
                    {liveOn ? "Stop caméra" : "Démarrer caméra"}
                  </button>
                </div>

                {/* ✅ Panneau Réglages LIVE (PRO) */}
                <div className="card" style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div className="subtitle" style={sub(theme)}>
                      Réglages LIVE (PRO)
                    </div>
                    <div className="subtitle" style={muted(theme)}>
                      ROI {Math.round(roiPct * 100)}% — r[{minRadius},{maxRadius}] — p2 {param2}
                      {livePaused ? " — PAUSE" : ""}
                    </div>
                  </div>

                  <div style={liveSliderRow}>
                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div className="subtitle" style={label(theme)}>
                        ROI (zone utile)
                      </div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        step={5}
                        value={Math.round(roiPct * 100)}
                        onChange={(e) => setRoiPct(Math.max(0.4, Math.min(1, Number(e.target.value) / 100)))}
                        style={liveSlider(theme)}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div className="subtitle" style={label(theme)}>
                        Min radius
                      </div>
                      <input
                        type="range"
                        min={4}
                        max={40}
                        step={1}
                        value={minRadius}
                        onChange={(e) => setMinRadius(Number(e.target.value))}
                        style={liveSlider(theme)}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div className="subtitle" style={label(theme)}>
                        Max radius
                      </div>
                      <input
                        type="range"
                        min={20}
                        max={120}
                        step={1}
                        value={maxRadius}
                        onChange={(e) => setMaxRadius(Number(e.target.value))}
                        style={liveSlider(theme)}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div className="subtitle" style={label(theme)}>
                        Param2 (Hough)
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={1}
                        value={param2}
                        onChange={(e) => setParam2(Number(e.target.value))}
                        style={liveSlider(theme)}
                        disabled={!autoOn}
                      />
                    </div>
                  </div>

                  <div className="subtitle" style={muted(theme)}>
                    Astuce: trop de faux cercles → augmente Param2. Aucune boule détectée → baisse Param2 ou ajuste les rayons.
                    ROI réduit = plus stable/rapide.
                  </div>
                </div>

                {liveErr && <div style={resultBox(theme, "TIE")}>{liveErr}</div>}

                <div ref={liveWrapRef} style={liveWrap(theme)} onClick={!autoOn ? onLiveClick : undefined}>
                  <video ref={videoRef} style={liveVideo} playsInline muted />

                  {/* canvas invisible pour OpenCV */}
                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {/* Overlay radar + mire */}
                  <div style={radarOverlay}>
                    <div style={radarSweep(theme)} />
                    <div style={crosshairOuter(theme)} />
                    <div style={crosshairInner} />
                  </div>

                  {/* Auto circles (cliquables => assignation A/B) */}
                  {autoOn &&
                    circles.map((c, idx) => {
                      const isBest = nearestIdx === idx;
                      const team = circleTeam[idx] || null;

                      return (
                        <div
                          key={`c-${idx}`}
                          style={liveCircle(theme, { x: c.x, y: c.y }, c.r, isBest, team)}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCircleTeam((cur) => ({ ...cur, [idx]: assignSide }));
                          }}
                          title={team ? `Équipe ${team}` : `Assigner à ${assignSide}`}
                        />
                      );
                    })}

                  {/* Manual fallback markers */}
                  {!autoOn && (
                    <>
                      <div style={liveMarker(theme, { x: 0.5, y: 0.5 }, "C", false)} />
                      {liveA.map((p, i) => (
                        <div key={`la-${i}`} style={liveMarker(theme, p, `A${i + 1}`, false)} />
                      ))}
                      {liveB.map((p, i) => (
                        <div key={`lb-${i}`} style={liveMarker(theme, p, `B${i + 1}`, false)} />
                      ))}
                    </>
                  )}
                </div>

                <div className="card" style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div className="subtitle" style={sub(theme)}>
                      Lecture
                    </div>
                    <div className="subtitle" style={muted(theme)}>
                      {autoOn
                        ? `cercles: ${circles.length} — assignés A:${Object.values(circleTeam).filter((v) => v === "A").length} / B:${
                            Object.values(circleTeam).filter((v) => v === "B").length
                          }`
                        : `A:${liveA.length} / B:${liveB.length}`}
                    </div>
                  </div>

                  <div className="subtitle" style={muted(theme)}>
                    {autoOn ? (
                      <>
                        Auto: A={autoMinA == null ? "—" : autoMinA.toFixed(4)} / B={autoMinB == null ? "—" : autoMinB.toFixed(4)}
                        {" — "}
                        {autoWinner == null
                          ? "Assigne au moins 1 boule A et 1 boule B"
                          : autoWinner === "TIE"
                          ? "Égalité"
                          : autoWinner === "A"
                          ? st.teamA
                          : st.teamB}
                        {" — "}
                        Plus proche détectée: {nearestIdx == null ? "—" : `#${nearestIdx + 1}`}
                      </>
                    ) : (
                      <>Plus proche (manual): —</>
                    )}
                  </div>

                  <div style={row}>
                    <button
                      className="btn primary"
                      style={primary(theme)}
                      onClick={onSaveLive}
                      disabled={autoOn ? autoMinA == null || autoMinB == null : minA_live == null || minB_live == null}
                    >
                      Enregistrer ({autoOn ? "auto" : "tap"})
                    </button>
                  </div>

                  <div className="subtitle" style={muted(theme)}>
                    Note: auto-detect = détection de cercles (OpenCV) + anti-sauts (tracking + EMA) + ROI.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ==========================
   Styles (inchangés structurellement)
   ✅ Juste recâblés sur CSS vars quand présentes pour matcher le style global
========================== */

function cssVarOr(fallback: string, varName: string) {
  return `var(${varName}, ${fallback})`;
}

function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    padding: 14,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    background: dark
      ? cssVarOr("radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.06), rgba(0,0,0,0.92))", "--bg")
      : cssVarOr("radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.05), rgba(255,255,255,0.94))", "--bg"),
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };
}

const topBar: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: 10,
  paddingTop: 6,
};

function title(theme: any): React.CSSProperties {
  return {
    fontWeight: 1000 as any,
    letterSpacing: 2,
    opacity: 0.95,
    textShadow: "0 12px 30px rgba(0,0,0,0.35)",
  };
}

function card(theme: any): React.CSSProperties {
  return {
    position: "relative",
    borderRadius: 18,
    padding: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    overflow: "hidden",
    backdropFilter: "blur(10px)",
  };
}

function cardSoft(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.14)", "--glass2"),
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backdropFilter: "blur(10px)",
  };
}

function sub(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.85 };
}

const row: React.CSSProperties = { display: "flex", gap: 10, flexWrap: "wrap" };

function primary(theme: any): React.CSSProperties {
  return {
    flex: 1,
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.18)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.12), rgba(255,255,255,0.06))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
  };
}

function danger(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(255,60,60,0.22), rgba(255,60,60,0.12))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.05)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 900,
    cursor: "pointer",
    opacity: 0.95,
    backdropFilter: "blur(10px)",
  };
}

function chipBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(240,177,42,0.18), rgba(0,0,0,0.12))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
    letterSpacing: 0.5,
  };
}

function modeBtn(theme: any, active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: active ? "rgba(240,177,42,0.16)" : cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
  };
}

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const ptsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 };

function ptBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: "linear-gradient(180deg, rgba(0,0,0,0.18), rgba(0,0,0,0.10))",
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
  };
}

function scoreLine(theme: any): React.CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0", zIndex: 1 };
}

function chip(theme: any): React.CSSProperties {
  return {
    maxWidth: 160,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: 999,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.16)", "--glass2"),
    fontWeight: 1000 as any,
    opacity: 0.95,
  };
}

function score(theme: any): React.CSSProperties {
  return { fontWeight: 1100 as any, fontSize: 28, letterSpacing: 1, textShadow: "0 14px 34px rgba(0,0,0,0.40)" };
}

function sep(theme: any): React.CSSProperties {
  return { opacity: 0.5, fontWeight: 900 };
}

function win(theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 1000 as any,
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: "rgba(240,177,42,0.14)",
  };
}

function muted(theme: any): React.CSSProperties {
  return { opacity: 0.75, fontSize: 13, lineHeight: 1.35 };
}

function endRow(theme: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
    backdropFilter: "blur(10px)",
  };
}

function pill(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    fontWeight: 1000 as any,
    maxWidth: 190,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function endTxt(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.9, fontSize: 13 };
}

// Sheet
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.62)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 10,
  zIndex: 9999,

  // ✅ mobile: évite le bounce/scroll-chaos
  overscrollBehavior: "contain",

  // ✅ important: permettre au conteneur de capter les gestes
  touchAction: "manipulation",
};

function sheet(theme: any): React.CSSProperties {
  return {
    width: "min(980px, 100%)",
    borderRadius: 18,
    padding: 12,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: cssVarOr("rgba(15,15,18,0.94)", "--panel"),
    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",

    display: "flex",
    flexDirection: "column",
    gap: 10,

    // ✅ mobile: hauteur réelle + scroll interne fiable
    maxHeight: "calc(100dvh - 16px)",
    height: "auto",
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",

    // ✅ évite de “bloquer” sur iOS quand on scroll dans un overlay
    overscrollBehavior: "contain",

    // ✅ safe
    position: "relative",
    touchAction: "pan-y",
    backdropFilter: "blur(14px)",
  };
}

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.16)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 900,
    outline: "none",
  };
}

function label(theme: any): React.CSSProperties {
  return { fontWeight: 900, opacity: 0.75, fontSize: 12, paddingLeft: 2, marginBottom: 6 };
}

function hint(theme: any): React.CSSProperties {
  return { opacity: 0.78, fontSize: 12, lineHeight: 1.35 };
}

function resultBox(theme: any, w: "A" | "B" | "TIE" | null): React.CSSProperties {
  const base: React.CSSProperties = {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    fontWeight: 1000 as any,
    backdropFilter: "blur(10px)",
  };
  if (!w) return base;
  if (w === "TIE") return { ...base, background: "rgba(240,177,42,0.14)" };
  return { ...base, background: "rgba(240,177,42,0.12)" };
}

// Photo
function fileBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(255,255,255,0.06)", "--glass"),
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    fontWeight: 1000 as any,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function imgWrap(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.12)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.12)", "--glass2"),
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
    backdropFilter: "blur(10px)",
  };
}

function imgHint(theme: any): React.CSSProperties {
  return { opacity: 0.8, fontSize: 12 };
}

const imgClickArea: React.CSSProperties = {
  position: "relative",
  width: "100%",
  borderRadius: 14,
  overflow: "hidden",
  border: `1px solid var(--stroke, rgba(255,255,255,0.14))`,
  background: "rgba(0,0,0,0.20)",
};

const imgStyle: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  userSelect: "none",
};

const svgOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  pointerEvents: "none",
};

function marker(theme: any, p: PhotoPoint, labelTxt: string): React.CSSProperties {
  return {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%, -50%)",
    width: 28,
    height: 28,
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.95)", "--text")}`,
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 1000 as any,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    pointerEvents: "none",
  } as React.CSSProperties;
}

function loupeStyle(imgUrl: string, p: PhotoPoint): React.CSSProperties {
  const zoom = 2.8;
  const size = 130;
  const bgSize = `${zoom * 100}% ${zoom * 100}%`;
  const bgPos = `${p.x * 100}% ${p.y * 100}%`;
  return {
    position: "absolute",
    right: 10,
    top: 10,
    width: size,
    height: size,
    borderRadius: 18,
    border: `1px solid var(--stroke, rgba(255,255,255,0.18))`,
    backgroundImage: `url(${imgUrl})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: bgSize,
    backgroundPosition: bgPos,
    boxShadow: "0 14px 30px rgba(0,0,0,0.45)",
    pointerEvents: "none",
  };
}

/* ==========================
   LIVE Radar styles
========================== */
function liveWrap(theme: any): React.CSSProperties {
  return {
    position: "relative",
    width: "100%",
    aspectRatio: "16 / 9",
    borderRadius: 16,
    overflow: "hidden",
    border: `1px solid ${cssVarOr("rgba(255,255,255,0.14)", "--stroke")}`,
    background: cssVarOr("rgba(0,0,0,0.25)", "--glass2"),
    boxShadow: "0 18px 45px rgba(0,0,0,0.35)",
  };
}

const liveVideo: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
  filter: "contrast(1.05) saturate(1.05)",
};

const radarOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

function radarSweep(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: "140%",
    height: "140%",
    transform: "translate(-50%,-50%)",
    borderRadius: "999px",
    background:
      "conic-gradient(from 0deg, rgba(240,177,42,0.0), rgba(240,177,42,0.0), rgba(240,177,42,0.22), rgba(240,177,42,0.0))",
    animation: "dcRadarSpin 1.6s linear infinite",
    filter: "blur(0.2px)",
    mixBlendMode: "screen",
  };
}

function crosshairOuter(theme: any): React.CSSProperties {
  return {
    position: "absolute",
    left: "50%",
    top: "50%",
    width: 62,
    height: 62,
    transform: "translate(-50%,-50%)",
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.75)", "--text")}`,
    boxShadow: "0 0 0 6px rgba(240,177,42,0.12)",
  };
}

const crosshairInner: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 8,
  height: 8,
  transform: "translate(-50%,-50%)",
  borderRadius: 999,
  background: "rgba(255,255,255,0.95)",
};

function liveMarker(theme: any, p: PhotoPoint, labelTxt: string, highlight: boolean): React.CSSProperties {
  const base: React.CSSProperties = {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%, -50%)",
    width: 30,
    height: 30,
    borderRadius: 999,
    border: `2px solid ${cssVarOr("rgba(255,255,255,0.92)", "--text")}`,
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.40)",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 1000 as any,
    color: cssVarOr(theme?.colors?.text ?? "#fff", "--text"),
    pointerEvents: "none",
  };

  if (!highlight) return base;

  return {
    ...base,
    border: "3px solid rgba(240,177,42,0.95)",
    boxShadow: "0 0 0 8px rgba(240,177,42,0.16), 0 12px 28px rgba(0,0,0,0.45)",
  };
}

// ✅ Auto-detect circle overlay (cliquable + couleur équipe)
function liveCircle(
  theme: any,
  p: PhotoPoint,
  rNorm: number,
  highlight: boolean,
  team: PetanqueTeamId | null
): React.CSSProperties {
  const size = Math.max(22, Math.min(180, rNorm * 2 * 900));

  const teamStroke =
    team === "A" ? "rgba(0,255,180,0.90)" : team === "B" ? "rgba(255,120,120,0.90)" : "rgba(255,255,255,0.55)";

  const base: React.CSSProperties = {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%,-50%)",
    width: size,
    height: size,
    borderRadius: 999,
    border: `2px solid ${teamStroke}`,
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    pointerEvents: "auto",
    cursor: "pointer",
    backdropFilter: "blur(2px)",
  };

  if (!highlight) return base;

  return {
    ...base,
    border: `3px solid rgba(240,177,42,0.95)`,
    boxShadow: "0 0 0 10px rgba(240,177,42,0.16), 0 14px 32px rgba(0,0,0,0.45)",
  };
}

// ✅ Sliders LIVE
const liveSliderRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

function liveSlider(theme: any): React.CSSProperties {
  return {
    width: "100%",
    accentColor: "var(--gold, rgba(240,177,42,0.95))" as any,
  };
}

// Petit glow derrière le score (cosmétique uniquement)
const heroGlow: React.CSSProperties = {
  position: "absolute",
  inset: -140,
  background:
    "radial-gradient(520px 260px at 18% 0%, rgba(240,177,42,0.18), transparent 60%), radial-gradient(520px 260px at 82% 20%, rgba(70,110,255,0.14), transparent 60%)",
  pointerEvents: "none",
  zIndex: 0,
};

/*
IMPORTANT:
Ajoute l’animation radar une seule fois dans src/index.css :

@keyframes dcRadarSpin {
  from { transform: translate(-50%,-50%) rotate(0deg); }
  to   { transform: translate(-50%,-50%) rotate(360deg); }
}
*/
