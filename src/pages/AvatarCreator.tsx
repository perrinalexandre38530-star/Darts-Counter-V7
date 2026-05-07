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
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import InfoMini from "../components/InfoMini";

type Props = {
  size?: number;
  overlaySrc?: string;
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void;
  isBotMode?: boolean;
};

type StyleId = "comic" | "flat" | "exaggerated" | "realistic";
type TabId = "ia" | "credits" | "photo" | "export";

type AiPayload = {
  dataUrl: string;
  provider?: string;
};

const GOLD = "#F6C256";
const GOLD_2 = "#FFE08A";
const BLACK = "#000000";
const BOT_RING = "#00b4ff";
const EXPORT_SIZE = 256;

const CREDIT_STORAGE_KEY = "msc_avatar_ai_credits_v1";

type AvatarCreditState = {
  freeUsed: boolean;
  credits: number;
  updatedAt: string;
};

type CreditPack = {
  id: "pack10" | "pack30" | "pack100";
  label: string;
  credits: number;
  price: string;
};

const CREDIT_PACKS: CreditPack[] = [
  { id: "pack10", label: "Pack 10 avatars IA", credits: 10, price: "1,99 €" },
  { id: "pack30", label: "Pack 30 avatars IA", credits: 30, price: "4,99 €" },
  { id: "pack100", label: "Pack 100 avatars IA", credits: 100, price: "9,99 €" },
];

function readCreditState(): AvatarCreditState {
  try {
    const raw = localStorage.getItem(CREDIT_STORAGE_KEY);
    if (!raw) return { freeUsed: false, credits: 0, updatedAt: new Date().toISOString() };
    const parsed = JSON.parse(raw) as Partial<AvatarCreditState>;
    return {
      freeUsed: Boolean(parsed.freeUsed),
      credits: Math.max(0, Math.floor(Number(parsed.credits || 0))),
      updatedAt: typeof parsed.updatedAt === "string" ? parsed.updatedAt : new Date().toISOString(),
    };
  } catch {
    return { freeUsed: false, credits: 0, updatedAt: new Date().toISOString() };
  }
}

function writeCreditState(next: AvatarCreditState): AvatarCreditState {
  const safe = {
    freeUsed: Boolean(next.freeUsed),
    credits: Math.max(0, Math.floor(Number(next.credits || 0))),
    updatedAt: new Date().toISOString(),
  };
  try {
    localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify(safe));
  } catch {}
  return safe;
}

function creditLabel(state: AvatarCreditState): string {
  if (!state.freeUsed) return "1 avatar IA gratuit disponible";
  if (state.credits > 0) return `${state.credits} crédit${state.credits > 1 ? "s" : ""} avatar IA disponible${state.credits > 1 ? "s" : ""}`;
  return "Aucun crédit avatar IA disponible";
}

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
    const details = {
      status: response.status,
      error: json?.error,
      provider: json?.provider,
      keySource: json?.keySource,
      keyPreview: json?.keyPreview,
      model: json?.model,
      fallbackMessage: json?.fallbackMessage,
      sensitiveKeysDetected: json?.sensitiveKeysDetected,
      envKeysVisible: json?.envKeysVisible,
      cloudflareAiBinding: json?.cloudflareAiBinding,
    };
    const err = new Error(String(message)) as Error & { details?: any };
    err.details = details;
    throw err;
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
  const [debugText, setDebugText] = React.useState<string | null>(null);
  const [creditState, setCreditState] = React.useState<AvatarCreditState>(() => readCreditState());
  const [activeTab, setActiveTab] = React.useState<TabId>("ia");
  const [miniInfo, setMiniInfo] = React.useState<{ title: string; content: string } | null>(null);

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarImage = photoUrl;

  const primary = theme.primary ?? GOLD;
  const RING_COLOR = isBotMode ? BOT_RING : GOLD;
  const avatarImgSize = R_AVATAR * 2 * zoom;
  const displayName = (name || "PLAYER").trim().toUpperCase();
  const hasAiCredit = !creditState.freeUsed || creditState.credits > 0;
  const remainingPaidCredits = creditState.credits;
  const panelWidth = 410;

  function consumeAvatarCreditAfterSuccess() {
    setCreditState((current) => {
      const next = current.freeUsed
        ? { ...current, credits: Math.max(0, current.credits - 1) }
        : { ...current, freeUsed: true };
      return writeCreditState(next);
    });
  }

  function handleBuyPack(pack: CreditPack) {
    // Paiement réel à brancher plus tard côté NAS/Stripe/Store.
    // On n'ajoute volontairement pas les crédits ici pour éviter une faille évidente.
    setError(null);
    setStatus(
      `${pack.label} — ${pack.price}. Paiement à brancher côté backend avant activation automatique des crédits.`
    );
  }

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
        setDebugText(null);
        setStatus(t("avatar.status.photoLoaded", "Photo importée. Lance la génération IA pour obtenir une vraie caricature cartoon."));
      } catch {
        setError(t("avatar.error.tooBig", `L’image est trop lourde (max ${maxMb} Mo).`));
      } finally {
        setBusy(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    })();
  }

  async function runAvatarDebug() {
    setBusy(true);
    setError(null);
    setDebugText(null);
    try {
      const response = await fetch("/api/avatar/debug", { method: "GET" });
      const json = await response.json().catch(() => null);
      console.info("[AvatarCreator] /api/avatar/debug", json);
      if (!response.ok || !json?.ok) {
        setDebugText(`DEBUG API: endpoint inaccessible (${response.status}). Regarde la console.`);
        return;
      }
      const openai = json.openai;
      const line = openai?.found
        ? `DEBUG API: clé visible côté Cloudflare ✅ source=${openai.source} preview=${openai.valuePreview} modèle=${json.openaiImageModel}`
        : `DEBUG API: clé ABSENTE côté Cloudflare ❌. Variables détectées: ${(json.sensitiveEnvKeysDetected || []).map((x: any) => x.name).join(", ") || "aucune"}`;
      setDebugText(line);
    } catch (err) {
      console.warn("[AvatarCreator] debug failed", err);
      setDebugText("DEBUG API: impossible d'appeler /api/avatar/debug. Vérifie le déploiement des Functions.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateCartoon() {
    if (!originalFile || !originalPreviewUrl) {
      setError(t("avatar.error.noAvatar", "Importe d’abord une photo avant de générer la caricature."));
      return;
    }
    if (!hasAiCredit) {
      setError("Tu as utilisé ton avatar IA gratuit. Achète un pack de crédits pour relancer une génération IA.");
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
        console.warn("[AvatarCreator] API IA indisponible", apiErr, apiErr?.details);
        const details = apiErr?.details || {};
        const suffix = details?.keySource
          ? `Clé détectée (${details.keySource}, ${details.keyPreview || "masquée"}) mais OpenAI/Cloudflare refuse: ${apiErr?.message || "erreur inconnue"}.`
          : `Clé non visible par la Function runtime. Lance le diagnostic API puis vérifie Production/Runtime + redéploiement.`;
        setDebugText(`ERREUR API: ${suffix}`);
        setError(null);
      }

      if (generated?.dataUrl) {
        const fitted = await fitDataUrlToWebp(generated.dataUrl, 512, 0.82);
        setPhotoUrl(fitted);
        setZoom(1.12);
        consumeAvatarCreditAfterSuccess();
        setStatus(
          generated.provider === "openai"
            ? t("avatar.status.generatedOpenAi", "Vraie caricature IA générée. 1 crédit avatar consommé.")
            : t("avatar.status.generatedAi", "Caricature IA générée. 1 crédit avatar consommé.")
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

  const tabs: Array<{ id: TabId; label: string; icon: string }> = [
    { id: "ia", label: "IA", icon: "✨" },
    { id: "credits", label: "Crédits", icon: "💳" },
    { id: "photo", label: "Photo", icon: "📸" },
    { id: "export", label: "Export", icon: "💾" },
  ];

  const infoContent = (
    <div style={{ lineHeight: 1.45 }}>
      <p style={{ marginTop: 0 }}>
        <strong>AVATAR IA</strong> transforme une photo en caricature cartoon, puis l'application ajoute le médaillon Multisports Scoring et compresse le résultat en WebP 256x256.
      </p>
      <p>
        La première génération est offerte. Ensuite, chaque génération réussie consomme 1 crédit avatar IA.
      </p>
      <p style={{ marginBottom: 0 }}>
        En production publique, les packs doivent passer par Stripe/NAS avant d'appeler OpenAI afin d'éviter tout abus.
      </p>
    </div>
  );

  const TabButton = ({ id, label, icon }: { id: TabId; label: string; icon: string }) => {
    const selected = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        style={{
          flex: 1,
          minWidth: 0,
          border: "1px solid rgba(255,255,255,.13)",
          borderRadius: 14,
          padding: "10px 8px",
          color: selected ? "#07070d" : "#fff",
          background: selected
            ? `linear-gradient(135deg, ${primary}, ${GOLD_2})`
            : "linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.035))",
          boxShadow: selected ? `0 0 24px ${primary}66` : "none",
          fontWeight: 950,
          fontSize: 12,
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ marginRight: 5 }}>{icon}</span>{label}
      </button>
    );
  };

  const StatusCard = () => {
    if (!status && !error && !lastExport && !debugText) return null;
    return (
      <div
        style={{
          ...cardBase,
          padding: 14,
          display: "flex",
          gap: 12,
          alignItems: "center",
          background: error
            ? "linear-gradient(145deg, rgba(70,18,18,.96), rgba(14,10,10,.96))"
            : "linear-gradient(145deg, rgba(8,45,31,.95), rgba(5,12,10,.98))",
        }}
      >
        <div
          style={{
            width: 34,
            height: 34,
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
        <div style={{ fontSize: 13, lineHeight: 1.35 }}>
          <div style={{ fontWeight: 850 }}>{error ? error : debugText || status || t("avatar.status.ok", "Avatar prêt !")}</div>
          {!error && <div style={{ opacity: 0.78, marginTop: 2 }}>Format WebP • {EXPORT_SIZE}x{EXPORT_SIZE} • {dataUrlSizeKb(lastExport || photoUrl)}</div>}
        </div>
      </div>
    );
  };

  const renderIaTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 16, background: "linear-gradient(145deg, rgba(37,24,67,.98), rgba(14,10,29,.98))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
          <div style={{ fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.5, fontSize: 15 }}>
            Photo → caricature IA
          </div>
          <InfoMini title="Caricature IA" content="L'IA génère l'image cartoon. Le médaillon est ajouté ensuite par l'application pour garder un cadre toujours net et identique." onOpen={(title, content) => setMiniInfo({ title, content })} />
        </div>
        <div style={{ opacity: 0.9, marginBottom: 14, fontSize: 13.5, lineHeight: 1.42 }}>
          Importe une photo, choisis un style très caricaturé, puis lance la génération.
        </div>

        <select
          value={style}
          onChange={(e) => setStyle(e.target.value as StyleId)}
          style={{
            width: "100%",
            minHeight: 42,
            borderRadius: 12,
            padding: "9px 12px",
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
          disabled={busy || !originalFile || !hasAiCredit}
          style={{
            width: "100%",
            borderRadius: 15,
            padding: "15px 16px",
            fontSize: 15,
            fontWeight: 950,
            border: "none",
            cursor: busy || !originalFile || !hasAiCredit ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #B06CFF, #7C3AED)",
            color: "#FFF",
            boxShadow: "0 16px 32px rgba(124,58,237,.42)",
            opacity: busy || !originalFile || !hasAiCredit ? 0.55 : 1,
          }}
        >
          {busy ? "⏳ Traitement…" : hasAiCredit ? "✨ Générer la caricature IA" : "🔒 Crédit avatar IA requis"}
        </button>

        <button
          type="button"
          onClick={runAvatarDebug}
          disabled={busy}
          style={{
            width: "100%",
            marginTop: 10,
            borderRadius: 13,
            padding: "11px 12px",
            fontSize: 13,
            fontWeight: 900,
            border: "1px solid rgba(255,255,255,.16)",
            cursor: busy ? "not-allowed" : "pointer",
            background: "rgba(255,255,255,.07)",
            color: "#fff",
            opacity: busy ? 0.6 : 1,
          }}
        >
          🔎 Diagnostic API IA
        </button>
      </div>
      <StatusCard />
    </div>
  );

  const renderCreditsTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 16, background: "linear-gradient(145deg, rgba(12,38,32,.96), rgba(7,12,14,.98))" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "flex-start", marginBottom: 12 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 7, fontWeight: 950, textTransform: "uppercase", fontSize: 14 }}>
              Crédits avatars IA
              <InfoMini title="Crédits IA" content="1 génération réussie consomme 1 crédit. Le premier avatar IA est offert. Les packs devront être validés côté serveur via Stripe avant production publique." onOpen={(title, content) => setMiniInfo({ title, content })} />
            </div>
            <div style={{ fontSize: 12.5, opacity: 0.82, marginTop: 4 }}>{creditLabel(creditState)}</div>
          </div>
          <div style={{ minWidth: 68, textAlign: "center", borderRadius: 13, padding: "9px 11px", background: hasAiCredit ? "rgba(34,197,94,.18)" : "rgba(255,93,93,.16)", border: "1px solid rgba(255,255,255,.12)", fontWeight: 950 }}>
            {!creditState.freeUsed ? "FREE" : remainingPaidCredits}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {CREDIT_PACKS.map((pack) => (
            <button
              key={pack.id}
              type="button"
              onClick={() => handleBuyPack(pack)}
              disabled={busy}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 12,
                width: "100%",
                borderRadius: 16,
                padding: "13px 14px",
                border: "1px solid rgba(246,194,86,.28)",
                background: "linear-gradient(145deg, rgba(255,255,255,.085), rgba(255,255,255,.035))",
                color: "#fff",
                cursor: busy ? "not-allowed" : "pointer",
                opacity: busy ? 0.6 : 1,
                textAlign: "left",
              }}
            >
              <span>
                <strong style={{ display: "block", fontSize: 14 }}>{pack.label}</strong>
                <span style={{ display: "block", opacity: 0.68, fontSize: 12, marginTop: 2 }}>{pack.credits} générations IA</span>
              </span>
              <span style={{ fontWeight: 950, color: GOLD_2, fontSize: 15 }}>{pack.price}</span>
            </button>
          ))}
        </div>

        <div style={{ marginTop: 12, padding: 12, borderRadius: 14, background: "rgba(0,0,0,.23)", fontSize: 12, lineHeight: 1.36, opacity: 0.78 }}>
          Paiement à brancher via Stripe/NAS : le frontend affiche les packs, mais les crédits réels devront être ajoutés uniquement après webhook Stripe validé.
        </div>
      </div>
      <StatusCard />
    </div>
  );

  const renderPhotoTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 16 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <div style={{ fontWeight: 950, textTransform: "uppercase", fontSize: 14 }}>Photo source</div>
          <InfoMini title="Photo source" content="Importe une photo nette, idéalement cadrée visage/buste. L'app réduit déjà l'image pour éviter les gros fichiers base64." onOpen={(title, content) => setMiniInfo({ title, content })} />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "128px 1fr", gap: 14, alignItems: "center" }}>
          <div
            style={{
              width: 128,
              height: 128,
              borderRadius: 16,
              overflow: "hidden",
              background: "linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.025))",
              border: "1px solid rgba(255,255,255,.14)",
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
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            <button type="button" className="btn sm" onClick={() => fileInputRef.current?.click()} style={{ borderRadius: 12, padding: "11px 12px" }}>
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
                setDebugText(null);
              }}
              style={{ borderRadius: 12, padding: "11px 12px", opacity: !photoUrl && !originalPreviewUrl ? 0.5 : 1 }}
            >
              🗑️ Effacer
            </button>
          </div>
        </div>
      </div>

      <div style={{ ...cardBase, padding: 16 }}>
        <div style={{ fontWeight: 950, marginBottom: 12, textTransform: "uppercase", fontSize: 14 }}>Réglages médaillon</div>
        <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13, marginBottom: 14 }}>
          <span style={{ color: theme.textSoft }}>Zoom visage</span>
          <input type="range" min={0.9} max={2.4} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 7, fontSize: 13 }}>
          <span style={{ color: theme.textSoft }}>Nom affiché</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} placeholder="Ex : NINZALEX" style={{ minHeight: 44 }} />
        </label>
      </div>
      <StatusCard />
    </div>
  );

  const renderExportTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 16, background: "linear-gradient(145deg, rgba(31,24,64,.96), rgba(8,8,14,.98))" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 950, textTransform: "uppercase", fontSize: 14 }}>Export WebP</div>
          <InfoMini title="Export WebP" content="L'avatar final est rendu en 256x256 WebP compressé pour rester léger dans le stockage local/NAS." onOpen={(title, content) => setMiniInfo({ title, content })} />
        </div>
        <p style={{ margin: "0 0 14px", opacity: 0.82, lineHeight: 1.4, fontSize: 13 }}>
          Enregistre le médaillon final compressé. C'est ce fichier qui doit être stocké sur le profil.
        </p>
        <button
          className="btn ok"
          type="button"
          onClick={handleSave}
          disabled={busy || !avatarImage}
          style={{
            width: "100%",
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
          ⬇️ {onSave ? "Enregistrer l’avatar (WebP)" : "Télécharger l’avatar (WebP)"}
          <div style={{ fontSize: 12, fontWeight: 600, opacity: 0.82, marginTop: 3 }}>{EXPORT_SIZE}x{EXPORT_SIZE} • WebP • compression optimisée</div>
        </button>
      </div>

      <div style={{ width: "100%", ...cardBase, padding: 14, textAlign: "center" }}>
        <div style={{ textAlign: "left", fontWeight: 850, marginBottom: 8, fontSize: 13, textTransform: "uppercase" }}>Aperçu miniature</div>
        <div style={{ width: 130, height: 130, margin: "0 auto", borderRadius: 16, display: "grid", placeItems: "center", background: "rgba(255,255,255,.03)" }}>
          <svg viewBox="-256 -256 512 512" width="112" height="112">
            <defs><clipPath id="avatarClipSmall"><circle r={R_AVATAR} cx={0} cy={0} /></clipPath></defs>
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
      <StatusCard />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: -8,
        padding: "14px 14px 104px",
        color: theme.text,
        background:
          "radial-gradient(circle at 72% 8%, rgba(246,194,86,.16), transparent 34%), radial-gradient(circle at 20% 60%, rgba(124,58,237,.15), transparent 34%), linear-gradient(135deg, #050509 0%, #0b0d14 46%, #030305 100%)",
      }}
    >
      <div style={{ maxWidth: 1180, margin: "0 auto", display: "grid", gap: 14 }}>
        <header
          style={{
            ...cardBase,
            padding: "14px 16px",
            display: "grid",
            gridTemplateColumns: "48px 1fr 48px",
            alignItems: "center",
            gap: 10,
            background: "linear-gradient(135deg, rgba(13,16,24,.92), rgba(43,28,73,.72))",
            position: "sticky",
            top: 6,
            zIndex: 20,
          }}
        >
          <BackDot onClick={handleBack} size={42} color={primary} />
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <h1 style={{ margin: 0, fontSize: 25, lineHeight: 1, fontWeight: 1000, letterSpacing: 1.5, color: primary, textTransform: "uppercase" }}>
              AVATAR IA
            </h1>
            <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.82, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
              Caricature cartoon + médaillon WebP optimisé
            </div>
          </div>
          <InfoDot title="Infos Avatar IA" content={infoContent} size={42} color={primary} />
        </header>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: `minmax(300px, ${panelWidth}px) minmax(320px, 1fr)`,
            gap: 18,
            alignItems: "start",
          }}
        >
          <section style={{ display: "grid", gap: 12 }}>
            <div style={{ display: "flex", gap: 7, padding: 4, borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}>
              {tabs.map((tab) => <TabButton key={tab.id} {...tab} />)}
            </div>

            {activeTab === "ia" ? renderIaTab() : null}
            {activeTab === "credits" ? renderCreditsTab() : null}
            {activeTab === "photo" ? renderPhotoTab() : null}
            {activeTab === "export" ? renderExportTab() : null}
          </section>

          <section style={{ minWidth: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, position: "sticky", top: 104 }}>
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
          </section>
        </div>
      </div>

      {miniInfo ? (
        <div
          onClick={() => setMiniInfo(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.62)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(92vw, 360px)",
              ...cardBase,
              padding: 18,
              background: "linear-gradient(145deg, rgba(24,24,34,.98), rgba(6,7,12,.98))",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <strong style={{ color: primary, textTransform: "uppercase" }}>{miniInfo.title}</strong>
              <button type="button" onClick={() => setMiniInfo(null)} style={{ border: 0, background: "rgba(255,255,255,.09)", color: "#fff", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ opacity: 0.88, lineHeight: 1.45, fontSize: 13.5 }}>{miniInfo.content}</div>
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 860px) {
          div[style*="grid-template-columns"] { grid-template-columns: 1fr !important; }
          section[style*="sticky"] { position: relative !important; top: auto !important; }
        }
        @media (max-width: 520px) {
          header h1 { font-size: 21px !important; }
        }
      `}</style>
    </div>
  );
}
