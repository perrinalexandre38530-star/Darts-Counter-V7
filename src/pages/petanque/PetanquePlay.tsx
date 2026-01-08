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

// ✅ NEW: OpenCV loader (LIVE auto-detect)
import { loadOpenCv } from "../../lib/vision/opencv";

type Props = { go: (route: any, params?: any) => void };

const PTS = [0, 1, 2, 3, 4, 5, 6];

type PhotoPoint = { x: number; y: number }; // normalized 0..1
type MeasureMode = "manual" | "photo" | "live";

export default function PetanquePlay({ go }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState<PetanqueState>(() => loadPetanqueState());

  const onAdd = (team: PetanqueTeamId, pts: number) => setSt(addEnd(st, team, pts));
  const onUndo = () => setSt(undoLastEnd(st));
  const onNew = () => setSt(resetPetanque(st));

  // ==========================
  // ✅ MESURAGE (sheet)
  // ==========================
  const [measureOpen, setMeasureOpen] = React.useState(false);
  const [mode, setMode] = React.useState<MeasureMode>("manual");

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
      `photo ${isCm ? "calibrée" : "non calibrée"} — A:${ballsA.length} / B:${ballsB.length} — unité:${
        isCm ? "cm" : "px"
      }`;

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

  const startLive = async () => {
    try {
      setLiveErr(null);
      // stop old stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      // ✅ légère contrainte de résolution (perf)
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment" as any,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
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
  // ✅ AUTO-DETECT LOOP (OpenCV) — PRO (ROI + anti-sauts + sliders + pause)
  // ==========================
  React.useEffect(() => {
    let alive = true;
    let cv: any = null;
    let timer: any = null;

    const ema = (prev: number, next: number, a: number) => prev * (1 - a) + next * a;

    const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    };

    const loop = async () => {
      if (!alive) return;
      if (!autoOn) return;
      if (!liveOn) return;
      if (livePaused) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas) return;

      const w = video.videoWidth;
      const h = video.videoHeight;
      if (!w || !h) return;

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

      // ROI canvas
      const roiCanvas = document.createElement("canvas");
      roiCanvas.width = rw;
      roiCanvas.height = rh;
      const roiCtx = roiCanvas.getContext("2d", { willReadFrequently: true });
      if (!roiCtx) return;
      roiCtx.drawImage(canvas, rx, ry, rw, rh, 0, 0, rw, rh);

      // OpenCV: gray + blur + HoughCircles on ROI
      const src = cv.imread(roiCanvas);
      const gray = new cv.Mat();
      cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0);
      cv.GaussianBlur(gray, gray, new cv.Size(7, 7), 1.5, 1.5, cv.BORDER_DEFAULT);

      const out = new cv.Mat();
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

        // Reject borders
        const border = 0.06;
        if (nx < border || nx > 1 - border || ny < border || ny > 1 - border) continue;

        found.push({
          x: clamp01(nx),
          y: clamp01(ny),
          r: rRoi / Math.max(cw, ch),
        });
      }

      src.delete();
      gray.delete();
      out.delete();

      // Tracking anti-sauts:
      // 1) Try match with lastNearest (distance threshold)
      // 2) Else choose nearest-to-center
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
          const d = dist(found[i], { x: 0.5, y: 0.5 });
          if (d < bestD) {
            bestD = d;
            bestIdx = i;
          }
        }
        if (bestIdx >= 0) chosenIdx = bestIdx;
      }

      // EMA smoothing for stable highlight
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

      // Find stableIdx (closest to smoothed stable)
      let stableIdx: number | null = null;
      const stable = stableNearestRef.current;
      if (stable && found.length) {
        let bestIdx = -1;
        let bestD = Infinity;
        for (let i = 0; i < found.length; i++) {
          const d = dist(found[i], stable);
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
    };

    (async () => {
      try {
        cv = await loadOpenCv();
        if (!alive) return;
        timer = setInterval(loop, 160); // ~6fps
      } catch (e: any) {
        if (!alive) return;
        setLiveErr(e?.message || "OpenCV indisponible");
        setAutoOn(false);
      }
    })();

    return () => {
      alive = false;
      if (timer) clearInterval(timer);
    };
  }, [autoOn, liveOn, livePaused, roiPct, minRadius, maxRadius, param2]);

  // Auto start/stop live when switching mode + sheet open/close
  React.useEffect(() => {
    if (!measureOpen) {
      stopLive();
      setMode("manual");
      setCalArm(null);
      return;
    }
    if (measureOpen && mode === "live") {
      startLive();
    } else {
      stopLive();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [measureOpen, mode]);

  const onSaveLive = () => {
    // Auto mode: saves a "single closest circle" distance to crosshair (screen units)
    if (autoOn) {
      if (nearestIdx == null) return;
      const c = circles[nearestIdx];
      if (!c) return;

      const dx = c.x - 0.5;
      const dy = c.y - 0.5;
      const d = Math.sqrt(dx * dx + dy * dy);

      const extra =
        (note?.trim() ? note.trim() + " — " : "") +
        `live auto-detect PRO — ROI:${Math.round(roiPct * 100)}% — r[${minRadius},${maxRadius}] — p2:${param2} — unité:screen`;

      // ⚠️ Ce mode ne compare pas A vs B (une seule boule la plus proche).
      // On stocke dA=dB => TIE, et l’info est dans la note.
      setSt(
        addMeasurement(st, {
          dA: d,
          dB: d,
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
    <div style={wrap(theme)}>
      <div style={topBar}>
        <button style={ghost(theme)} onClick={() => go("games")}>
          ← Jeux
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={title(theme)}>PÉTANQUE</div>
          <button style={chipBtn(theme)} onClick={() => setMeasureOpen(true)}>
            Mesurer
          </button>
        </div>

        <button style={ghost(theme)} onClick={() => go("home")}>
          Home
        </button>
      </div>

      <div style={card(theme)}>
        <div style={scoreLine(theme)}>
          <span style={chip(theme)}>{st.teamA}</span>
          <span style={score(theme)}>{st.scoreA}</span>
          <span style={sep(theme)}>—</span>
          <span style={score(theme)}>{st.scoreB}</span>
          <span style={chip(theme)}>{st.teamB}</span>
        </div>

        {st.finished && <div style={win(theme)}>Victoire : {st.winner === "A" ? st.teamA : st.teamB}</div>}
      </div>

      <div style={grid2}>
        <div style={card(theme)}>
          <div style={sub(theme)}>Mène — {st.teamA}</div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button key={`A-${p}`} style={ptBtn(theme)} onClick={() => onAdd("A", p)} disabled={st.finished}>
                +{p}
              </button>
            ))}
          </div>
        </div>

        <div style={card(theme)}>
          <div style={sub(theme)}>Mène — {st.teamB}</div>
          <div style={ptsGrid}>
            {PTS.map((p) => (
              <button key={`B-${p}`} style={ptBtn(theme)} onClick={() => onAdd("B", p)} disabled={st.finished}>
                +{p}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sub(theme)}>Actions</div>
        <div style={row}>
          <button style={primary(theme)} onClick={onUndo} disabled={!st.ends.length}>
            Annuler dernière mène
          </button>
          <button style={danger(theme)} onClick={onNew}>
            Nouvelle partie
          </button>
        </div>
      </div>

      {/* ✅ MESURES (historique) */}
      <div style={card(theme)}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={sub(theme)}>Mesurages</div>
          <button
            style={ghost(theme)}
            onClick={onUndoMeasurement}
            disabled={!measurements?.length}
            title="Annuler la dernière mesure enregistrée"
          >
            Annuler mesure
          </button>
        </div>

        {!measurements?.length ? (
          <div style={muted(theme)}>Aucun mesurage enregistré.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {measurements.slice(0, 8).map((m) => {
              const who = m.winner === "TIE" ? "Égalité" : m.winner === "A" ? st.teamA : st.teamB;
              return (
                <div key={m.id} style={endRow(theme)}>
                  <div style={pill(theme)}>{who}</div>
                  <div style={endTxt(theme)}>
                    A {m.dA} — B {m.dB} — Δ {m.delta.toFixed(3)} (tol {m.tol})
                    {m.note ? ` — ${m.note}` : ""}
                  </div>
                </div>
              );
            })}
            {measurements.length > 8 && <div style={muted(theme)}>… {measurements.length - 8} autres mesures.</div>}
          </div>
        )}
      </div>

      <div style={card(theme)}>
        <div style={sub(theme)}>Historique des mènes</div>
        {!st.ends.length ? (
          <div style={muted(theme)}>Aucune mène enregistrée.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {st.ends.map((e, idx) => (
              <div key={e.id} style={endRow(theme)}>
                <div style={pill(theme)}>{e.winner === "A" ? st.teamA : st.teamB}</div>
                <div style={endTxt(theme)}>
                  +{e.points} — mène #{st.ends.length - idx}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ✅ SHEET MESURAGE */}
      {measureOpen && (
        <div style={overlay}>
          <div style={sheet(theme)}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={sub(theme)}>Mesurage</div>
              <button style={ghost(theme)} onClick={() => setMeasureOpen(false)}>
                Fermer
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button style={modeBtn(theme, mode === "manual")} onClick={() => setMode("manual")}>
                Manuel
              </button>
              <button style={modeBtn(theme, mode === "photo")} onClick={() => setMode("photo")}>
                Photo
              </button>
              <button style={modeBtn(theme, mode === "live")} onClick={() => setMode("live")}>
                LIVE Radar
              </button>
            </div>

            {/* Shared */}
            <div style={row}>
              <div style={{ flex: 1 }}>
                <div style={label(theme)}>Tolérance</div>
                <input style={input(theme)} value={tol} onChange={(e) => setTol(e.target.value)} placeholder="1" inputMode="decimal" />
              </div>

              <div style={{ flex: 2 }}>
                <div style={label(theme)}>Note (optionnel)</div>
                <input
                  style={input(theme)}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Ex: mesure serrée / terrain incliné…"
                />
              </div>
            </div>

            {mode === "manual" ? (
              <>
                <div style={hint(theme)}>Saisis les distances en centimètres (cochonnet → boule A / boule B).</div>

                <div style={grid2}>
                  <div style={cardSoft(theme)}>
                    <div style={sub(theme)}>{st.teamA}</div>
                    <input style={input(theme)} value={dA} onChange={(e) => setDA(e.target.value)} placeholder="Distance (cm)" inputMode="decimal" />
                  </div>
                  <div style={cardSoft(theme)}>
                    <div style={sub(theme)}>{st.teamB}</div>
                    <input style={input(theme)} value={dB} onChange={(e) => setDB(e.target.value)} placeholder="Distance (cm)" inputMode="decimal" />
                  </div>
                </div>

                <div style={resultBox(theme, manualWinner)}>{manualText}</div>

                <div style={row}>
                  <button style={primary(theme)} onClick={onSaveManual} disabled={!canComputeManual}>
                    Enregistrer la mesure
                  </button>
                  <button
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
                <div style={hint(theme)}>
                  Photo : clique d’abord le cochonnet (C), puis ajoute des boules (A/B). Calibration optionnelle.
                </div>

                <div style={row}>
                  <label style={fileBtn(theme)}>
                    Ajouter une photo
                    <input type="file" accept="image/*" onChange={onPickImage} style={{ display: "none" }} />
                  </label>

                  <button style={ghost(theme)} onClick={clearPhoto} disabled={!imgUrl}>
                    Réinitialiser
                  </button>
                  <button style={ghost(theme)} onClick={() => setLoupeOn((v) => !v)} disabled={!imgUrl}>
                    Loupe: {loupeOn ? "ON" : "OFF"}
                  </button>
                </div>

                <div style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={sub(theme)}>Ajout de boules</div>
                    <div style={muted(theme)}>
                      A:{ballsA.length} / B:{ballsB.length}
                    </div>
                  </div>

                  <div style={row}>
                    <button style={modeBtn(theme, addSide === "A")} onClick={() => setAddSide("A")}>
                      Ajouter {st.teamA}
                    </button>
                    <button style={modeBtn(theme, addSide === "B")} onClick={() => setAddSide("B")}>
                      Ajouter {st.teamB}
                    </button>
                    <button style={ghost(theme)} onClick={onClearPhotoPoints} disabled={!pCochonnet && !ballsA.length && !ballsB.length}>
                      Effacer points
                    </button>
                  </div>

                  <div style={muted(theme)}>
                    Clic image = {calArm ? `Calibration ${calArm}` : !pCochonnet ? "Définir cochonnet (C)" : `Ajouter boule (${addSide})`}
                  </div>
                </div>

                <div style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={sub(theme)}>Calibration (optionnel)</div>
                    <div style={muted(theme)}>{pxPerCm ? `OK: ~${pxPerCm.toFixed(1)} px/cm` : "Non calibrée"}</div>
                  </div>

                  <div style={row}>
                    <button style={ghost(theme)} onClick={() => setCalArm("A")} disabled={!imgUrl}>
                      Point Cal A {calArm === "A" ? "(clic…)" : ""}
                    </button>
                    <button style={ghost(theme)} onClick={() => setCalArm("B")} disabled={!imgUrl}>
                      Point Cal B {calArm === "B" ? "(clic…)" : ""}
                    </button>

                    <div style={{ flex: 1 }}>
                      <div style={label(theme)}>Longueur réelle (cm)</div>
                      <input style={input(theme)} value={calLenCm} onChange={(e) => setCalLenCm(e.target.value)} placeholder="ex: 10" inputMode="decimal" />
                    </div>

                    <button
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
                    <div style={imgHint(theme)}>
                      {calArm ? `Calibration: clique le point ${calArm}` : !pCochonnet ? "Clique le cochonnet (C)." : `Clique pour ajouter une boule (${addSide}).`}
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
                        : `Plus proche A: ${minA_photo.toFixed(pxPerCm ? 1 : 0)} ${pxPerCm ? "cm" : "px"} — B: ${minB_photo.toFixed(pxPerCm ? 1 : 0)} ${pxPerCm ? "cm" : "px"}`}
                    </div>

                    <div style={row}>
                      <button style={primary(theme)} onClick={onSavePhoto} disabled={minA_photo == null || minB_photo == null}>
                        Enregistrer (photo)
                      </button>
                      <button style={ghost(theme)} onClick={() => setPCochonnet(null)} disabled={!pCochonnet}>
                        Replacer C
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={muted(theme)}>Aucune image chargée.</div>
                )}
              </>
            ) : (
              <>
                <div style={hint(theme)}>
                  LIVE Auto Radar : cadre le cochonnet au centre (mire). L’app détecte des cercles (boules) et entoure en vert la plus proche en direct.
                </div>

                <div style={row}>
                  <button style={modeBtn(theme, autoOn)} onClick={() => setAutoOn(true)} disabled={!liveOn}>
                    Auto ON
                  </button>
                  <button style={modeBtn(theme, !autoOn)} onClick={() => setAutoOn(false)} disabled={!liveOn}>
                    Auto OFF (tap)
                  </button>

                  {!autoOn && (
                    <>
                      <button style={modeBtn(theme, liveAddSide === "A")} onClick={() => setLiveAddSide("A")}>
                        Ajouter {st.teamA}
                      </button>
                      <button style={modeBtn(theme, liveAddSide === "B")} onClick={() => setLiveAddSide("B")}>
                        Ajouter {st.teamB}
                      </button>
                    </>
                  )}

                  <button style={ghost(theme)} onClick={clearLive} disabled={!circles.length && !liveA.length && !liveB.length}>
                    Effacer
                  </button>

                  <button style={ghost(theme)} onClick={liveOn ? stopLive : startLive}>
                    {liveOn ? "Stop caméra" : "Démarrer caméra"}
                  </button>
                </div>

                {/* ✅ Panneau Réglages LIVE (PRO) */}
                <div style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={sub(theme)}>Réglages LIVE (PRO)</div>
                    <div style={muted(theme)}>
                      ROI {Math.round(roiPct * 100)}% — r[{minRadius},{maxRadius}] — p2 {param2}
                      {livePaused ? " — PAUSE" : ""}
                    </div>
                  </div>

                  <div style={liveSliderRow}>
                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={label(theme)}>ROI (zone utile)</div>
                      <input
                        type="range"
                        min={40}
                        max={100}
                        step={5}
                        value={Math.round(roiPct * 100)}
                        onChange={(e) => setRoiPct(Math.max(0.4, Math.min(1, Number(e.target.value) / 100)))}
                        style={liveSlider}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={label(theme)}>Min radius</div>
                      <input
                        type="range"
                        min={4}
                        max={40}
                        step={1}
                        value={minRadius}
                        onChange={(e) => setMinRadius(Number(e.target.value))}
                        style={liveSlider}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={label(theme)}>Max radius</div>
                      <input
                        type="range"
                        min={20}
                        max={120}
                        step={1}
                        value={maxRadius}
                        onChange={(e) => setMaxRadius(Number(e.target.value))}
                        style={liveSlider}
                        disabled={!autoOn}
                      />
                    </div>

                    <div style={{ flex: 1, minWidth: 190 }}>
                      <div style={label(theme)}>Param2 (Hough)</div>
                      <input
                        type="range"
                        min={10}
                        max={60}
                        step={1}
                        value={param2}
                        onChange={(e) => setParam2(Number(e.target.value))}
                        style={liveSlider}
                        disabled={!autoOn}
                      />
                    </div>
                  </div>

                  <div style={muted(theme)}>
                    Astuce: trop de faux cercles → augmente Param2. Aucune boule détectée → baisse Param2 ou ajuste les rayons. ROI réduit = plus stable/rapide.
                  </div>
                </div>

                {liveErr && <div style={resultBox(theme, "TIE")}>{liveErr}</div>}

                <div ref={liveWrapRef} style={liveWrap(theme)} onClick={!autoOn ? onLiveClick : undefined}>
                  <video ref={videoRef} style={liveVideo} playsInline muted />

                  {/* canvas invisible pour OpenCV */}
                  <canvas ref={canvasRef} style={{ display: "none" }} />

                  {/* Overlay radar + mire */}
                  <div style={radarOverlay}>
                    <div style={radarSweep} />
                    <div style={crosshairOuter} />
                    <div style={crosshairInner} />
                  </div>

                  {/* Auto circles */}
                  {autoOn &&
                    circles.map((c, idx) => {
                      const isBest = nearestIdx === idx;
                      return <div key={`c-${idx}`} style={liveCircle(theme, { x: c.x, y: c.y }, c.r, isBest)} />;
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

                <div style={cardSoft(theme)}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                    <div style={sub(theme)}>Lecture</div>
                    <div style={muted(theme)}>{autoOn ? `cercles: ${circles.length}` : `A:${liveA.length} / B:${liveB.length}`}</div>
                  </div>

                  <div style={muted(theme)}>
                    Plus proche (auto) : {nearestIdx == null ? "—" : `#${nearestIdx + 1}`}
                  </div>

                  <div style={row}>
                    <button
                      style={primary(theme)}
                      onClick={onSaveLive}
                      disabled={autoOn ? nearestIdx == null : minA_live == null || minB_live == null}
                    >
                      Enregistrer ({autoOn ? "auto" : "tap"})
                    </button>
                  </div>

                  <div style={muted(theme)}>
                    Note: auto-detect = détection de cercles (OpenCV) + anti-sauts (tracking + EMA) + ROI. Prochaine étape: LOCK cochonnet + assignation équipe A/B en auto.
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
   Styles
========================== */
function wrap(theme: any): React.CSSProperties {
  const dark = theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
  return {
    minHeight: "100vh",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: dark
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
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
  return { fontWeight: 900, letterSpacing: 2, opacity: 0.95 };
}

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.05)",
    boxShadow: "0 12px 30px rgba(0,0,0,0.22)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
}

function cardSoft(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 12,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.12)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
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
    border: "1px solid rgba(255,255,255,0.18)",
    background: "rgba(255,255,255,0.10)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function danger(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,60,60,0.18)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function ghost(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.04)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 800,
    cursor: "pointer",
    opacity: 0.92,
  };
}

function chipBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.20)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
    letterSpacing: 0.5,
  };
}

function modeBtn(theme: any, active: boolean): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "8px 12px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: active ? "rgba(0,255,180,0.12)" : "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 };
const ptsGrid: React.CSSProperties = { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 };

function ptBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "12px 10px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(0,0,0,0.18)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
  };
}

function scoreLine(theme: any): React.CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "10px 0" };
}

function chip(theme: any): React.CSSProperties {
  return {
    maxWidth: 140,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.16)",
    fontWeight: 900,
    opacity: 0.95,
  };
}

function score(theme: any): React.CSSProperties {
  return { fontWeight: 1000 as any, fontSize: 28, letterSpacing: 1 };
}

function sep(theme: any): React.CSSProperties {
  return { opacity: 0.5, fontWeight: 900 };
}

function win(theme: any): React.CSSProperties {
  return {
    textAlign: "center",
    fontWeight: 900,
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,255,180,0.10)",
  };
}

function muted(theme: any): React.CSSProperties {
  return { opacity: 0.75, fontSize: 13 };
}

function endRow(theme: any): React.CSSProperties {
  return {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.12)",
  };
}

function pill(theme: any): React.CSSProperties {
  return {
    borderRadius: 999,
    padding: "6px 10px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
    maxWidth: 170,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  };
}

function endTxt(theme: any): React.CSSProperties {
  return { fontWeight: 800, opacity: 0.9, fontSize: 13 };
}

// Sheet
const overlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(0,0,0,0.55)",
  display: "flex",
  alignItems: "flex-end",
  justifyContent: "center",
  padding: 12,
  zIndex: 9999,
};

function sheet(theme: any): React.CSSProperties {
  return {
    width: "min(980px, 100%)",
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(15,15,18,0.94)",
    boxShadow: "0 18px 50px rgba(0,0,0,0.45)",
    display: "flex",
    flexDirection: "column",
    gap: 10,
  };
}

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(255,255,255,0.16)",
    background: "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
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
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    fontWeight: 900,
  };
  if (!w) return base;
  if (w === "TIE") return { ...base, background: "rgba(255,200,0,0.10)" };
  return { ...base, background: "rgba(0,255,180,0.10)" };
}

// Photo
function fileBtn(theme: any): React.CSSProperties {
  return {
    borderRadius: 14,
    padding: "10px 12px",
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(255,255,255,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 900,
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
  };
}

function imgWrap(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    border: "1px solid rgba(255,255,255,0.12)",
    background: "rgba(0,0,0,0.12)",
    padding: 12,
    display: "flex",
    flexDirection: "column",
    gap: 10,
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
  border: "1px solid rgba(255,255,255,0.14)",
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
    border: "2px solid rgba(255,255,255,0.95)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 8px 18px rgba(0,0,0,0.35)",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 1000 as any,
    color: theme?.colors?.text ?? "#fff",
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
    border: "1px solid rgba(255,255,255,0.18)",
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
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.25)",
  };
}

const liveVideo: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "cover",
};

const radarOverlay: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  pointerEvents: "none",
};

const radarSweep: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: "140%",
  height: "140%",
  transform: "translate(-50%,-50%)",
  borderRadius: "999px",
  background: "conic-gradient(from 0deg, rgba(0,255,180,0.0), rgba(0,255,180,0.0), rgba(0,255,180,0.25), rgba(0,255,180,0.0))",
  animation: "dcRadarSpin 1.6s linear infinite",
  filter: "blur(0.2px)",
};

const crosshairOuter: React.CSSProperties = {
  position: "absolute",
  left: "50%",
  top: "50%",
  width: 62,
  height: 62,
  transform: "translate(-50%,-50%)",
  borderRadius: 999,
  border: "2px solid rgba(255,255,255,0.75)",
  boxShadow: "0 0 0 6px rgba(0,255,180,0.10)",
};

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
    border: "2px solid rgba(255,255,255,0.92)",
    background: "rgba(0,0,0,0.35)",
    boxShadow: "0 10px 22px rgba(0,0,0,0.40)",
    display: "grid",
    placeItems: "center",
    fontSize: 10,
    fontWeight: 1000 as any,
    color: theme?.colors?.text ?? "#fff",
    pointerEvents: "none",
  };

  if (!highlight) return base;

  return {
    ...base,
    border: "3px solid rgba(0,255,180,0.95)",
    boxShadow: "0 0 0 8px rgba(0,255,180,0.16), 0 12px 28px rgba(0,0,0,0.45)",
  };
}

// ✅ Auto-detect circle overlay
function liveCircle(theme: any, p: PhotoPoint, rNorm: number, highlight: boolean): React.CSSProperties {
  const size = Math.max(18, Math.min(160, rNorm * 2 * 900)); // scaling visuel
  const base: React.CSSProperties = {
    position: "absolute",
    left: `${p.x * 100}%`,
    top: `${p.y * 100}%`,
    transform: "translate(-50%,-50%)",
    width: size,
    height: size,
    borderRadius: 999,
    border: "2px solid rgba(255,255,255,0.65)",
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
    pointerEvents: "none",
  };

  if (!highlight) return base;

  return {
    ...base,
    border: "3px solid rgba(0,255,180,0.95)",
    boxShadow: "0 0 0 10px rgba(0,255,180,0.16), 0 14px 32px rgba(0,0,0,0.45)",
  };
}

// ✅ Sliders LIVE
const liveSliderRow: React.CSSProperties = {
  display: "flex",
  gap: 10,
  flexWrap: "wrap",
  alignItems: "flex-end",
};

const liveSlider: React.CSSProperties = {
  width: "100%",
  accentColor: "rgba(0,255,180,0.9)" as any,
};

/*
IMPORTANT:
Ajoute l’animation radar une seule fois dans src/index.css :

@keyframes dcRadarSpin {
  from { transform: translate(-50%,-50%) rotate(0deg); }
  to   { transform: translate(-50%,-50%) rotate(360deg); }
}
*/
