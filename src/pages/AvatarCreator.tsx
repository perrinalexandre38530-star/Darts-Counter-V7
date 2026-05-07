// ============================================
// src/pages/AvatarCreator.tsx
// Créateur d'avatar IA + médaillon Multisports
// - Rendu visuel type mockup : panneau sombre + grand médaillon premium
// - Import photo
// - Vraie génération IA via /api/avatar/cartoon si API configurée
// - Fallback local uniquement visuel si aucune API IA n'est branchée
// - Médaillon exact appliqué côté app
// - Export final WebP compressé en 256x256 pour éviter de regonfler le stockage/NAS
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { fileToSafeAvatarDataUrl, enforceSafeAvatarDataUrl } from "../lib/avatarSafe";

type Props = {
  size?: number;
  overlaySrc?: string;
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void;
  isBotMode?: boolean;
};

type StyleId = "comic" | "flat" | "exaggerated" | "realistic";

type AiPayload = {
  dataUrl: string;
  provider?: string;
};

const GOLD = "#F6C256";
const GOLD_2 = "#FFE08A";
const BLACK = "#000000";
const BOT_RING = "#00b4ff";
const EXPORT_SIZE = 256;

const R_OUTER = 248;
const R_INNER = 188;
const STROKE = 18;
const R_AVATAR = R_INNER - STROKE / 2;
const R_TEXT = R_INNER + STROKE / 2 + 4;
const TEXT_DY_TOP = -6;
const NAME_RADIUS = R_INNER + 6;
const TEXT_DY_BOTTOM = 40;

function clampByte(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

function dataUrlToImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = dataUrl;
  });
}

function canvasToWebp(canvas: HTMLCanvasElement, quality = 0.78): string {
  try {
    return canvas.toDataURL("image/webp", quality);
  } catch {
    return canvas.toDataURL("image/png");
  }
}

function dataUrlSizeKb(dataUrl: string | null): string {
  if (!dataUrl) return "—";
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return `${Math.max(1, Math.round((payload.length * 3) / 4 / 1024))} Ko`;
}

async function fitDataUrlToWebp(dataUrl: string, side = 512, quality = 0.82): Promise<string> {
  const img = await dataUrlToImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.fillStyle = "#f6b93f";
  ctx.fillRect(0, 0, side, side);
  const iw = img.naturalWidth || img.width || side;
  const ih = img.naturalHeight || img.height || side;
  const scale = Math.max(side / iw, side / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (side - dw) / 2, (side - dh) / 2, dw, dh);
  return canvasToWebp(canvas, quality);
}

async function localPosterFallback(dataUrl: string, style: StyleId): Promise<string> {
  // Ce fallback ne prétend pas remplacer une vraie IA : il sert seulement à garder
  // une app utilisable dans StackBlitz quand aucun secret/API n'est configuré.
  const img = await dataUrlToImage(dataUrl);
  const side = 512;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const bg = ctx.createRadialGradient(side / 2, side / 2, 20, side / 2, side / 2, side * 0.68);
  bg.addColorStop(0, "#ffe27a");
  bg.addColorStop(0.62, "#f28d21");
  bg.addColorStop(1, "#2b1200");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, side, side);

  const iw = img.naturalWidth || img.width || side;
  const ih = img.naturalHeight || img.height || side;
  const scale = Math.max(side / iw, side / ih) * 1.06;
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(img, (side - dw) / 2, (side - dh) / 2, dw, dh);

  const imageData = ctx.getImageData(0, 0, side, side);
  const src = imageData.data;
  const original = new Uint8ClampedArray(src);
  const levels = style === "flat" ? 4 : style === "exaggerated" ? 6 : 5;
  const edgeThreshold = style === "exaggerated" ? 14 : style === "comic" ? 18 : 24;
  const contrast = style === "realistic" ? 1.18 : style === "flat" ? 1.34 : 1.56;
  const saturation = style === "realistic" ? 1.24 : style === "flat" ? 1.48 : 1.72;

  for (let y = 0; y < side; y++) {
    for (let x = 0; x < side; x++) {
      const i = (y * side + x) * 4;
      let r = original[i];
      let g = original[i + 1];
      let b = original[i + 2];

      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + (r - gray) * saturation;
      g = gray + (g - gray) * saturation;
      b = gray + (b - gray) * saturation;

      r = (r - 128) * contrast + 128;
      g = (g - 128) * contrast + 128;
      b = (b - 128) * contrast + 128;

      const step = 255 / (levels - 1);
      r = Math.round(r / step) * step;
      g = Math.round(g / step) * step;
      b = Math.round(b / step) * step;

      let edge = 0;
      if (x < side - 1 && y < side - 1) {
        const ir = (y * side + (x + 1)) * 4;
        const id = ((y + 1) * side + x) * 4;
        const lum = 0.299 * original[i] + 0.587 * original[i + 1] + 0.114 * original[i + 2];
        const lumR = 0.299 * original[ir] + 0.587 * original[ir + 1] + 0.114 * original[ir + 2];
        const lumD = 0.299 * original[id] + 0.587 * original[id + 1] + 0.114 * original[id + 2];
        edge = Math.max(Math.abs(lum - lumR), Math.abs(lum - lumD));
      }

      if (edge > edgeThreshold) {
        src[i] = clampByte(r * 0.12);
        src[i + 1] = clampByte(g * 0.12);
        src[i + 2] = clampByte(b * 0.12);
      } else {
        src[i] = clampByte(r);
        src[i + 1] = clampByte(g);
        src[i + 2] = clampByte(b);
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Traits BD ajoutés pour rendre le fallback plus visible.
  ctx.globalCompositeOperation = "multiply";
  ctx.lineWidth = 5;
  ctx.strokeStyle = "rgba(35,14,0,.42)";
  for (let i = 0; i < 18; i += 1) {
    const a = (Math.PI * 2 * i) / 18;
    ctx.beginPath();
    ctx.moveTo(side / 2 + Math.cos(a) * 70, side / 2 + Math.sin(a) * 70);
    ctx.lineTo(side / 2 + Math.cos(a) * 360, side / 2 + Math.sin(a) * 360);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const shine = ctx.createRadialGradient(side * 0.36, side * 0.18, 20, side / 2, side / 2, side * 0.8);
  shine.addColorStop(0, "rgba(255,255,255,0.20)");
  shine.addColorStop(0.46, "rgba(255,255,255,0.02)");
  shine.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, side, side);

  return canvasToWebp(canvas, 0.74);
}

async function callAvatarAi(file: File, style: StyleId): Promise<AiPayload | null> {
  const form = new FormData();
  form.append("image", file);
  form.append("style", style);
  const response = await fetch("/api/avatar/cartoon", {
    method: "POST",
    body: form,
  });
  const json = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    const message = json?.message || json?.error || `avatar_api_${response.status}`;
    throw new Error(String(message));
  }
  const raw = json?.cartoonWebp || json?.cartoonPng || json?.image || json?.dataUrl || null;
  if (typeof raw !== "string") return null;
  if (raw.startsWith("data:image/")) return { dataUrl: raw, provider: json?.provider };
  if (/^https?:\/\//i.test(raw)) return { dataUrl: raw, provider: json?.provider };
  return null;
}

const cardBase: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,.13)",
  background: "linear-gradient(145deg, rgba(19,22,32,.94), rgba(6,7,12,.96))",
  boxShadow: "0 18px 38px rgba(0,0,0,.42)",
};

export default function AvatarCreator({
  size = 512,
  overlaySrc, // eslint-disable-line @typescript-eslint/no-unused-vars
  defaultName = "",
  onSave,
  onBack,
  isBotMode = false,
}: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [name, setName] = React.useState(defaultName || "");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = React.useState<string | null>(null);
  const [style, setStyle] = React.useState<StyleId>("exaggerated");
  const [zoom, setZoom] = React.useState(1.18);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<string | null>(null);

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarImage = photoUrl;

  const primary = theme.primary ?? GOLD;
  const RING_COLOR = isBotMode ? BOT_RING : GOLD;
  const avatarImgSize = R_AVATAR * 2 * zoom;
  const displayName = (name || "PLAYER").trim().toUpperCase();
  const panelWidth = 410;

  const handleBack = React.useCallback(() => {
    if (onBack) onBack();
    else window.history.back();
  }, [onBack]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const maxMb = 8;
    if (f.size > maxMb * 1024 * 1024) {
      setError(t("avatar.error.tooBig", `L’image est trop lourde (max ${maxMb} Mo).`));
      return;
    }
    setError(null);
    setBusy(true);
    setLastExport(null);
    (async () => {
      try {
        const safe = await fileToSafeAvatarDataUrl(f);
        setOriginalFile(f);
        setOriginalPreviewUrl(safe);
        setPhotoUrl(safe);
        setZoom(1.18);
        setStatus(t("avatar.status.photoLoaded", "Photo importée. Lance la génération IA pour obtenir une vraie caricature cartoon."));
      } catch {
        setError(t("avatar.error.tooBig", `L’image est trop lourde (max ${maxMb} Mo).`));
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    })();
  }

  async function handleGenerateCartoon() {
    if (!originalFile || !originalPreviewUrl) {
      setError(t("avatar.error.noAvatar", "Importe d’abord une photo avant de générer la caricature."));
      return;
    }
    setBusy(true);
    setError(null);
    setLastExport(null);
    setStatus(t("avatar.status.generating", "Génération de la vraie caricature IA en cours…"));
    try {
      let generated: AiPayload | null = null;
      try {
        generated = await callAvatarAi(originalFile, style);
      } catch (apiErr: any) {
        console.warn("[AvatarCreator] API IA indisponible", apiErr);
        setError(null);
      }

      if (generated?.dataUrl) {
        const fitted = await fitDataUrlToWebp(generated.dataUrl, 512, 0.82);
        setPhotoUrl(fitted);
        setZoom(1.12);
        setStatus(
          generated.provider === "openai"
            ? t("avatar.status.generatedOpenAi", "Vraie caricature IA générée. Rendu cartoon compressé en WebP.")
            : t("avatar.status.generatedAi", "Caricature IA générée puis compressée en WebP.")
        );
      } else {
        const fallback = await localPosterFallback(originalPreviewUrl, style);
        setPhotoUrl(fallback);
        setZoom(1.18);
        setStatus(t("avatar.status.generatedFallback", "Aucune API IA n’est branchée ici : fallback local appliqué. Pour le rendu très caricaturé du mockup, configure OPENAI_API_KEY côté Cloudflare."));
      }
    } catch (e) {
      console.warn(e);
      setError(t("avatar.error.generateFailed", "Impossible de générer la caricature pour le moment."));
    } finally {
      setBusy(false);
    }
  }

  async function renderMedallionWebp(outputSize = EXPORT_SIZE): Promise<string> {
    const svg = svgRef.current;
    if (!svg) throw new Error("missing_svg");
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const svgBlob = new Blob([svgStr], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.crossOrigin = "anonymous";

    return await new Promise((resolve, reject) => {
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = outputSize;
        canvas.height = outputSize;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          URL.revokeObjectURL(url);
          reject(new Error("canvas_unavailable"));
          return;
        }
        ctx.fillStyle = "black";
        ctx.fillRect(0, 0, outputSize, outputSize);
        ctx.drawImage(img, 0, 0, outputSize, outputSize);
        URL.revokeObjectURL(url);
        resolve(canvasToWebp(canvas, 0.78));
      };
      img.onerror = (err) => {
        URL.revokeObjectURL(url);
        reject(err);
      };
      img.src = url;
    });
  }

  async function handleSave() {
    if (!avatarImage) {
      setError(t("avatar.error.noAvatar", "Importe d’abord une image avant d’enregistrer."));
      return;
    }

    try {
      setBusy(true);
      const webpDataUrl = await renderMedallionWebp(EXPORT_SIZE);
      const safeDataUrl = (await enforceSafeAvatarDataUrl(webpDataUrl)) || webpDataUrl;
      setLastExport(safeDataUrl);

      if (onSave) {
        onSave({ pngDataUrl: safeDataUrl, name: name || "PLAYER" });
        setStatus(t("avatar.status.savedToProfile", "Avatar WebP enregistré sur le profil."));
      } else {
        const a = document.createElement("a");
        a.href = safeDataUrl;
        a.download = `avatar-multisports-${name || "player"}.webp`;
        a.click();
        setStatus(t("avatar.status.downloaded", "Avatar généré et téléchargé en WebP."));
      }
    } catch (e) {
      console.warn(e);
      setError(t("avatar.error.saveFailed", "Impossible d’enregistrer l’avatar pour le moment."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: -8,
        padding: "18px 16px 104px",
        color: theme.text,
        background:
          "radial-gradient(circle at 72% 8%, rgba(246,194,86,.16), transparent 34%), radial-gradient(circle at 20% 60%, rgba(124,58,237,.15), transparent 34%), linear-gradient(135deg, #050509 0%, #0b0d14 46%, #030305 100%)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `minmax(300px, ${panelWidth}px) minmax(320px, 1fr)`,
          gap: 22,
          alignItems: "start",
          maxWidth: 1180,
          margin: "0 auto",
        }}
      >
        <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <button
            type="button"
            onClick={handleBack}
            style={{
              alignSelf: "flex-start",
              fontSize: 13,
              padding: "7px 12px",
              borderRadius: 10,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,.08)",
              color: "#fff",
              cursor: "pointer",
              boxShadow: "0 10px 24px rgba(0,0,0,.35)",
            }}
          >
            ← {t("avatar.back", "Retour")}
          </button>

          <header style={{ padding: "8px 2px 2px" }}>
            <h2 style={{ fontSize: 28, lineHeight: 1, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase", margin: "6px 0 10px", color: primary }}>
              {t("avatar.title", "Créateur d’avatar")}
            </h2>
            <p style={{ fontSize: 15, lineHeight: 1.42, opacity: 0.9, margin: 0 }}>
              {t("avatar.subtitle.ai", "Génère une caricature cartoon très caricaturée et amusante à partir de ta photo, puis insère-la dans le médaillon Multisports Scoring.")}
            </p>
          </header>

          <div style={{ ...cardBase, padding: 16, background: "linear-gradient(145deg, rgba(37,24,67,.98), rgba(14,10,29,.98))" }}>
            <div style={{ fontWeight: 900, marginBottom: 8, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 15 }}>
              {t("avatar.step1.title", "Étape 1 — Photo → caricature IA")}
            </div>
            <div style={{ opacity: 0.9, marginBottom: 14, fontSize: 13.5, lineHeight: 1.42 }}>
              {t("avatar.step1.text", "Importe une photo, choisis un style très caricaturé et laisse l’IA créer une caricature cartoon drôle et expressive.")}
            </div>

            <select
              value={style}
              onChange={(e) => setStyle(e.target.value as StyleId)}
              style={{
                width: "100%",
                minHeight: 40,
                borderRadius: 11,
                padding: "8px 11px",
                background: "#07070d",
                color: "#fff",
                border: "1px solid rgba(255,255,255,.18)",
                marginBottom: 12,
              }}
            >
              <option value="exaggerated">🎭 Très caricaturé — comique & fun</option>
              <option value="comic">💥 Comic / BD</option>
              <option value="flat">🏆 Logo esport</option>
              <option value="realistic">✏️ Dessin cartoon plus réaliste</option>
            </select>

            <button
              type="button"
              onClick={handleGenerateCartoon}
              disabled={busy || !originalFile}
              style={{
                width: "100%",
                borderRadius: 13,
                padding: "13px 16px",
                fontSize: 15,
                fontWeight: 900,
                border: "none",
                cursor: busy || !originalFile ? "not-allowed" : "pointer",
                background: "linear-gradient(135deg, #B06CFF, #7C3AED)",
                color: "#FFF",
                boxShadow: "0 14px 28px rgba(124,58,237,.34)",
                opacity: busy || !originalFile ? 0.55 : 1,
              }}
            >
              {busy ? "⏳ Traitement…" : "✨ Générer la caricature IA"}
            </button>

            <div style={{ marginTop: 12, opacity: 0.78, fontSize: 12.5, lineHeight: 1.4 }}>
              {t("avatar.step1.help", "Le médaillon est ajouté après la génération pour garder exactement le cadre Multisports Scoring.")}
            </div>
          </div>

          <div style={{ ...cardBase, padding: 16 }}>
            <div style={{ fontWeight: 850, marginBottom: 10, textTransform: "uppercase", fontSize: 13 }}>{t("avatar.label.photo", "Photo de départ")}</div>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 12,
                  overflow: "hidden",
                  background: "rgba(255,255,255,.06)",
                  border: "1px solid rgba(255,255,255,.12)",
                  flex: "0 0 auto",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "rgba(255,255,255,.55)",
                  fontSize: 12,
                  textAlign: "center",
                }}
              >
                {originalPreviewUrl ? <img src={originalPreviewUrl} alt="Photo de départ" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : "Aucune photo"}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <button type="button" className="btn sm" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 10, padding: "9px 12px" }}>
                  ⬆️ {originalFile ? t("avatar.btn.change", "Changer la photo") : t("avatar.btn.import", "Importer une photo")}
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                <button
                  className="btn sm"
                  type="button"
                  disabled={!photoUrl && !originalPreviewUrl}
                  onClick={() => {
                    setPhotoUrl(null);
                    setOriginalFile(null);
                    setOriginalPreviewUrl(null);
                    setStatus(null);
                    setError(null);
                    setLastExport(null);
                  }}
                  style={{ borderRadius: 10, padding: "9px 12px", opacity: !photoUrl && !originalPreviewUrl ? 0.5 : 1 }}
                >
                  🗑️ {t("avatar.btn.clear", "Effacer")}
                </button>
              </div>
            </div>
          </div>

          <div style={{ ...cardBase, padding: 16 }}>
            <div style={{ fontWeight: 850, marginBottom: 12, textTransform: "uppercase", fontSize: 13 }}>{t("avatar.settings", "Réglages")}</div>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, marginBottom: 14 }}>
              <span style={{ color: theme.textSoft }}>{t("avatar.label.zoom", "Zoom (pince les doigts ou utilise le slider)")}</span>
              <input type="range" min={0.9} max={2.4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
            </label>
            <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13 }}>
              <span style={{ color: theme.textSoft }}>{t("avatar.label.name", "Nom affiché en bas du médaillon")}</span>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 14))}
                placeholder={t("avatar.placeholder.name", "Ex : NINZALEX")}
                style={{ minHeight: 42 }}
              />
            </label>
          </div>

          {(status || error || lastExport) && (
            <div
              style={{
                ...cardBase,
                padding: 16,
                display: "flex",
                gap: 12,
                alignItems: "center",
                background: error ? "linear-gradient(145deg, rgba(70,18,18,.96), rgba(14,10,10,.96))" : "linear-gradient(145deg, rgba(8,45,31,.95), rgba(5,12,10,.98))",
              }}
            >
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  background: error ? "#ff5d5d" : "#22c76f",
                  display: "grid",
                  placeItems: "center",
                  fontWeight: 950,
                  color: "#fff",
                  flex: "0 0 auto",
                }}
              >
                {error ? "!" : "✓"}
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.35 }}>
                <div style={{ fontWeight: 850 }}>{error ? error : status || t("avatar.status.ok", "Avatar prêt !")}</div>
                {!error && <div style={{ opacity: 0.78, marginTop: 2 }}>Format WebP • {EXPORT_SIZE}x{EXPORT_SIZE} • {dataUrlSizeKb(lastExport || photoUrl)}</div>}
              </div>
            </div>
          )}
        </section>

        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 18, position: "sticky", top: 12 }}>
          <div
            style={{
              width: "min(100%, 680px)",
              aspectRatio: "1 / 1",
              maxHeight: "min(72vh, 680px)",
              background: "radial-gradient(circle at 50% 42%, rgba(246,194,86,.08), transparent 58%), #030305",
              borderRadius: 28,
              padding: 12,
              boxShadow: "0 26px 70px rgba(0,0,0,.72)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              position: "relative",
              overflow: "hidden",
            }}
          >
            <svg ref={svgRef} viewBox="-256 -256 512 512" width="100%" height="100%">
              <defs>
                <clipPath id="avatarClip"><circle r={R_AVATAR} cx={0} cy={0} /></clipPath>
                <radialGradient id="goldOuter" cx="32%" cy="18%" r="76%">
                  <stop offset="0%" stopColor={GOLD_2} />
                  <stop offset="42%" stopColor={RING_COLOR} />
                  <stop offset="100%" stopColor="#B97913" />
                </radialGradient>
                <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" />
                </filter>
              </defs>

              <circle r={R_OUTER + STROKE + 10} fill="#050505" filter="url(#softShadow)" />
              <circle r={R_OUTER + 8} fill="none" stroke="#1b1b1b" strokeWidth={10} />
              <circle r={R_OUTER} fill="none" stroke="url(#goldOuter)" strokeWidth={STROKE} />
              <circle r={R_OUTER - 19} fill={BLACK} />
              <circle r={R_INNER + 15} fill="none" stroke="#090909" strokeWidth={24} />
              <circle r={R_INNER} fill="none" stroke="url(#goldOuter)" strokeWidth={STROKE} />
              <circle r={R_AVATAR} fill="#21130a" />

              {avatarImage ? (
                <g clipPath="url(#avatarClip)">
                  <image href={avatarImage} x={-avatarImgSize / 2} y={-avatarImgSize / 2} width={avatarImgSize} height={avatarImgSize} preserveAspectRatio="xMidYMid slice" />
                  <circle r={R_AVATAR} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth={4} />
                </g>
              ) : (
                <g clipPath="url(#avatarClip)">
                  <rect x={-R_AVATAR} y={-R_AVATAR} width={R_AVATAR * 2} height={R_AVATAR * 2} fill="#22232b" />
                  <text x={0} y={-8} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={16} fill="#aaa">Photo</text>
                  <text x={0} y={18} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={16} fill="#aaa">à importer</text>
                </g>
              )}

              <path id="arcTop" d={`M ${-R_TEXT} ${TEXT_DY_TOP} A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}`} fill="none" />
              <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={38} fontWeight={950} letterSpacing={4.2} fill={RING_COLOR}>
                <textPath href="#arcTop" startOffset="50%" textAnchor="middle">MULTISPORTS SCORING</textPath>
              </text>

              <path id="arcBottom" d={`M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM} A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}`} fill="none" />
              <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={displayName.length > 10 ? 34 : 40} fontWeight={950} letterSpacing={displayName.length > 10 ? 2.4 : 4} fill={RING_COLOR}>
                <textPath href="#arcBottom" startOffset="50%" textAnchor="middle">{displayName}</textPath>
              </text>
            </svg>
          </div>

          <div style={{ width: "min(100%, 320px)", ...cardBase, padding: 14, textAlign: "center" }}>
            <div style={{ textAlign: "left", fontWeight: 850, marginBottom: 8, fontSize: 13, textTransform: "uppercase" }}>Aperçu</div>
            <div style={{ width: 130, height: 130, margin: "0 auto", borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(255,255,255,.03)" }}>
              <svg viewBox="-256 -256 512 512" width="112" height="112">
                <defs>
                  <clipPath id="avatarClipSmall"><circle r={R_AVATAR} cx={0} cy={0} /></clipPath>
                </defs>
                <circle r={R_OUTER + STROKE} fill={BLACK} />
                <circle r={R_OUTER} fill="none" stroke={RING_COLOR} strokeWidth={STROKE} />
                <circle r={R_INNER} fill="none" stroke={RING_COLOR} strokeWidth={STROKE} />
                <circle r={R_AVATAR} fill="#22232b" />
                {avatarImage && <g clipPath="url(#avatarClipSmall)"><image href={avatarImage} x={-avatarImgSize / 2} y={-avatarImgSize / 2} width={avatarImgSize} height={avatarImgSize} preserveAspectRatio="xMidYMid slice" /></g>}
                <path id="arcTopSmall" d={`M ${-R_TEXT} ${TEXT_DY_TOP} A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}`} fill="none" />
                <text fontFamily="Arial Black, system-ui, sans-serif" fontSize={38} fontWeight={950} letterSpacing={4} fill={RING_COLOR}><textPath href="#arcTopSmall" startOffset="50%" textAnchor="middle">MULTISPORTS SCORING</textPath></text>
                <path id="arcBottomSmall" d={`M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM} A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}`} fill="none" />
                <text fontFamily="Arial Black, system-ui, sans-serif" fontSize={displayName.length > 10 ? 34 : 40} fontWeight={950} letterSpacing={displayName.length > 10 ? 2.4 : 4} fill={RING_COLOR}><textPath href="#arcBottomSmall" startOffset="50%" textAnchor="middle">{displayName}</textPath></text>
              </svg>
            </div>
          </div>

          <button
            className="btn ok"
            type="button"
            onClick={handleSave}
            disabled={busy || !avatarImage}
            style={{
              width: "min(100%, 420px)",
              borderRadius: 16,
              padding: "16px 18px",
              fontSize: 16,
              fontWeight: 950,
              background: "linear-gradient(135deg, #9B5CFF, #6D28D9)",
              border: "none",
              boxShadow: "0 16px 34px rgba(124,58,237,.35)",
              opacity: busy || !avatarImage ? 0.6 : 1,
            }}
          >
            ⬇️ {onSave ? t("avatar.btn.save", "Enregistrer l’avatar (WebP)") : t("avatar.btn.download", "Télécharger l’avatar (WebP)")}
            <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.82, marginTop: 3 }}>{EXPORT_SIZE}x{EXPORT_SIZE} • WebP • compression optimisée</div>
          </button>
        </section>
      </div>

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          section[style*="sticky"] { position: relative !important; top: auto !important; }
        }
      `}</style>
    </div>
  );
}
