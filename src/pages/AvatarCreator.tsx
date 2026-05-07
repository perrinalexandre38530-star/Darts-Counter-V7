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
import { useDevMode } from "../contexts/DevModeContext";
import { loadStore, saveStore } from "../lib/storage";
import { loadStoredBots, saveStoredBots } from "../lib/bots";

type Props = {
  size?: number;
  overlaySrc?: string;
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void;
  isBotMode?: boolean;
};

type StyleId = "comic" | "flat" | "exaggerated" | "realistic";
type TabId = "ia" | "gallery" | "debug";

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
  { id: "pack10", label: "10 avatars IA", credits: 10, price: "1,99 €" },
  { id: "pack30", label: "30 avatars IA", credits: 30, price: "4,99 €" },
  { id: "pack100", label: "100 avatars IA", credits: 100, price: "9,99 €" },
];
const GALLERY_STORAGE_KEY = "msc_avatar_ia_gallery_v1";

type GalleryAvatar = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
  source: "ia" | "manual";
};

function readGallery(): GalleryAvatar[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x && typeof x.dataUrl === "string").slice(0, 48) : [];
  } catch {
    return [];
  }
}

function writeGallery(items: GalleryAvatar[]): GalleryAvatar[] {
  const safe = items.filter((x) => x && typeof x.dataUrl === "string").slice(0, 48);
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(safe));
  } catch {}
  return safe;
}

type AssignableProfile = { id: string; name: string; avatarDataUrl?: string | null; avatarUrl?: string | null };


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
  const devMode = useDevMode();

  const [name, setName] = React.useState(defaultName || "");
  const [photoUrl, setPhotoUrl] = React.useState<string | null>(null);
  const [originalFile, setOriginalFile] = React.useState<File | null>(null);
  const [originalPreviewUrl, setOriginalPreviewUrl] = React.useState<string | null>(null);
  const [style, setStyle] = React.useState<StyleId>("exaggerated");
  const [zoom, setZoom] = React.useState(1.18);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<string | null>(null);
  const [debugText, setDebugText] = React.useState<string | null>(null);
  const [creditState, setCreditState] = React.useState<AvatarCreditState>(() => readCreditState());
  const [activeTab, setActiveTab] = React.useState<TabId>("ia");
  const [miniInfo, setMiniInfo] = React.useState<{ title: string; content: string } | null>(null);
  const [gallery, setGallery] = React.useState<GalleryAvatar[]>(() => readGallery());
  const [selectedGallery, setSelectedGallery] = React.useState<GalleryAvatar | null>(null);
  const [profiles, setProfiles] = React.useState<Array<AssignableProfile & { kind?: "active" | "local" | "bot" }>>([]);
  const [assignProfileId, setAssignProfileId] = React.useState("");
  const [medallionColor, setMedallionColor] = React.useState(isBotMode ? BOT_RING : GOLD);
  const [autoSaveAfterAi, setAutoSaveAfterAi] = React.useState(false);

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarImage = photoUrl;

  const primary = theme.primary ?? GOLD;
  const RING_COLOR = medallionColor || (isBotMode ? BOT_RING : GOLD);
  const avatarImgSize = R_AVATAR * 2 * zoom;
  const displayName = (name || "PLAYER").trim().toUpperCase();
  const hasAiCredit = !creditState.freeUsed || creditState.credits > 0;

  const colorChoices = [
    { id: "gold", label: "Or", value: GOLD },
    { id: "lime", label: "Lime", value: "#A3E635" },
    { id: "blue", label: "Bleu", value: "#38BDF8" },
    { id: "pink", label: "Rose", value: "#F472B6" },
    { id: "purple", label: "Violet", value: "#A78BFA" },
    { id: "red", label: "Rouge", value: "#FB7185" },
    { id: "white", label: "Blanc", value: "#F8FAFC" },
  ];

  const tabs: Array<{ id: TabId; label: string; icon: string; hidden?: boolean }> = [
    { id: "ia", label: "IA", icon: "✨" },
    { id: "gallery", label: "Galerie", icon: "🖼️" },
    { id: "debug", label: "Debug", icon: "🧪", hidden: !devMode.enabled },
  ];

  React.useEffect(() => {
    if (activeTab === "debug" && !devMode.enabled) setActiveTab("ia");
  }, [activeTab, devMode.enabled]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      const result: Array<AssignableProfile & { kind?: "active" | "local" | "bot" }> = [];
      try {
        const store: any = await loadStore<any>();
        const list = Array.isArray(store?.profiles) ? store.profiles : [];
        const activeId = String(store?.activeProfileId || "");
        for (const p of list) {
          const id = String(p?.id || "");
          if (!id) continue;
          result.push({
            id: `profile:${id}`,
            name: `${id === activeId ? "Profil actif" : "Profil local"} — ${String(p?.name || p?.displayName || "Profil")}`,
            avatarDataUrl: p?.avatarDataUrl,
            avatarUrl: p?.avatarUrl,
            kind: id === activeId ? "active" : "local",
          });
        }
      } catch {}
      try {
        const bots = loadStoredBots();
        if (Array.isArray(bots)) {
          for (const b of bots) {
            const id = String((b as any)?.id || "");
            if (!id) continue;
            result.push({
              id: `bot:${id}`,
              name: `Bot CPU — ${String((b as any)?.name || "Bot")}`,
              avatarDataUrl: (b as any)?.avatarDataUrl,
              avatarUrl: (b as any)?.avatarUrl || (b as any)?.avatar,
              kind: "bot",
            });
          }
        }
      } catch {}
      if (alive) setProfiles(result);
    })();
    return () => { alive = false; };
  }, [activeTab, selectedGallery]);

  function persistGallery(next: GalleryAvatar[]) {
    const saved = writeGallery(next);
    setGallery(saved);
    return saved;
  }

  function addToGallery(dataUrl: string, source: "ia" | "manual" = "ia") {
    if (!dataUrl) return;
    const item: GalleryAvatar = {
      id: `av_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: displayName || "PLAYER",
      dataUrl,
      createdAt: new Date().toISOString(),
      source,
    };
    const saved = persistGallery([item, ...gallery.filter((x) => x.dataUrl !== dataUrl)]);
    setSelectedGallery(saved[0] || item);
  }

  function consumeAvatarCreditAfterSuccess() {
    setCreditState((current) => {
      const next = current.freeUsed
        ? { ...current, credits: Math.max(0, current.credits - 1) }
        : { ...current, freeUsed: true };
      return writeCreditState(next);
    });
  }

  function handleBuyPack(pack: CreditPack) {
    setError(null);
    setStatus(`${pack.label} — ${pack.price}. Paiement Stripe/NAS à brancher : les crédits ne sont pas ajoutés côté frontend.`);
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
        setOffsetX(0);
        setOffsetY(0);
        setDebugText(null);
        setStatus("Photo importée. Recadre depuis les réglages, choisis le style, puis lance l'IA.");
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
      setStatus(line);
    } catch (err) {
      console.warn("[AvatarCreator] debug failed", err);
      setDebugText("DEBUG API: impossible d'appeler /api/avatar/debug. Vérifie le déploiement des Functions.");
    } finally {
      setBusy(false);
    }
  }

  async function handleGenerateCartoon() {
    if (!originalFile || !originalPreviewUrl) {
      setError("Clique au centre du médaillon pour importer une photo avant de générer.");
      return;
    }
    if (!hasAiCredit) {
      setError("Tu as utilisé ton avatar IA gratuit. Achète un pack de crédits pour relancer une génération IA.");
      return;
    }
    setBusy(true);
    setError(null);
    setLastExport(null);
    setStatus("Génération de la vraie caricature IA en cours…");
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
      }

      if (generated?.dataUrl) {
        const fitted = await fitDataUrlToWebp(generated.dataUrl, 512, 0.82);
        setPhotoUrl(fitted);
        setZoom(1.12);
        setOffsetX(0);
        setOffsetY(0);
        consumeAvatarCreditAfterSuccess();
        setAutoSaveAfterAi(true);
        setStatus("Caricature IA générée. Enregistrement automatique dans la galerie…");
      } else {
        const fallback = await localPosterFallback(originalPreviewUrl, style);
        setPhotoUrl(fallback);
        setZoom(1.18);
        setOffsetX(0);
        setOffsetY(0);
        setStatus("Aucune vraie IA disponible : fallback local appliqué. Configure OPENAI_API_KEY pour le rendu caricature premium.");
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

  async function handleSave(source: "ia" | "manual" = "manual", silent = false) {
    if (!avatarImage) {
      if (!silent) setError("Importe d’abord une image avant d’enregistrer.");
      return;
    }
    try {
      setBusy(true);
      const webpDataUrl = await renderMedallionWebp(EXPORT_SIZE);
      const safeDataUrl = (await enforceSafeAvatarDataUrl(webpDataUrl)) || webpDataUrl;
      setLastExport(safeDataUrl);
      addToGallery(safeDataUrl, source);
      if (onSave && !silent) {
        onSave({ pngDataUrl: safeDataUrl, name: name || "PLAYER" });
        setStatus("Avatar WebP enregistré sur le profil et ajouté à la galerie.");
      } else {
        setStatus("Avatar WebP ajouté à la galerie. Tu peux l’exporter ou l’attribuer à un profil.");
      }
    } catch (e) {
      console.warn(e);
      if (!silent) setError("Impossible d’enregistrer l’avatar pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  React.useEffect(() => {
    if (!autoSaveAfterAi || !photoUrl) return;
    const timer = window.setTimeout(() => {
      setAutoSaveAfterAi(false);
      handleSave("ia", true).catch(() => {});
    }, 140);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSaveAfterAi, photoUrl]);

  function downloadGalleryItem(item: GalleryAvatar) {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `avatar-multisports-${item.name || "player"}.webp`;
    a.click();
  }

  async function assignAvatarToSelection(item: GalleryAvatar, targetId: string) {
    if (!targetId) {
      setError("Choisis d’abord un profil ou un bot.");
      return;
    }
    try {
      setBusy(true);
      if (targetId.startsWith("bot:")) {
        const botId = targetId.slice(4);
        const bots = loadStoredBots();
        const next = Array.isArray(bots) ? bots.map((b: any) => String(b?.id || "") === botId ? { ...b, avatarDataUrl: item.dataUrl, avatarUrl: item.dataUrl, avatar: item.dataUrl, updatedAt: new Date().toISOString() } : b) : [];
        saveStoredBots(next);
        try { window.dispatchEvent(new Event("dc:bots-changed")); } catch {}
        setStatus("Avatar attribué au bot CPU.");
      } else {
        const profileId = targetId.replace(/^profile:/, "");
        const store: any = await loadStore<any>();
        if (!store || !Array.isArray(store.profiles)) throw new Error("store_profiles_missing");
        const nextProfiles = store.profiles.map((p: any) =>
          String(p?.id || "") === String(profileId)
            ? { ...p, avatarDataUrl: item.dataUrl, avatarUrl: undefined, avatarAssetId: null, avatarThumbAssetId: null, avatarFullAssetId: null, avatarCastAssetId: null }
            : p
        );
        await saveStore({ ...store, profiles: nextProfiles });
        const target = nextProfiles.find((p: any) => String(p?.id || "") === String(profileId));
        setStatus(`Avatar attribué à ${target?.name || "profil"}.`);
      }
      setSelectedGallery(null);
      setAssignProfileId("");
    } catch (e) {
      console.warn(e);
      setError("Impossible d’attribuer cet avatar au profil sélectionné.");
    } finally {
      setBusy(false);
    }
  }

  const infoContent = (
    <div style={{ lineHeight: 1.45 }}>
      <p style={{ marginTop: 0 }}><strong>AVATAR IA</strong> : clique au centre du médaillon pour importer une photo, recadre, choisis le style, puis génère.</p>
      <p>La première génération est offerte. Ensuite, chaque génération réussie consomme 1 crédit.</p>
      <p style={{ marginBottom: 0 }}>La galerie stocke automatiquement les avatars générés ici.</p>
    </div>
  );

  const StatusCard = () => {
    if (!status && !error && !lastExport && !debugText) return null;
    return (
      <div className={`avatar-status ${error ? "is-error" : "is-ok"}`}>
        <div className="avatar-status-dot">{error ? "!" : "✓"}</div>
        <div>
          <div className="avatar-status-title">{error ? error : debugText || status || "Avatar prêt !"}</div>
          {!error && <div className="avatar-status-sub">WebP • {EXPORT_SIZE}x{EXPORT_SIZE} • {dataUrlSizeKb(lastExport || photoUrl)}</div>}
        </div>
      </div>
    );
  };

  const CreditStrip = () => (
    <section className="avatar-credit-strip">
      <div className="credit-main">
        <strong>Crédits IA</strong>
        <span>{creditLabel(creditState)}</span>
      </div>
      <div className={`credit-pill ${hasAiCredit ? "ok" : "ko"}`}>{!creditState.freeUsed ? "FREE" : creditState.credits}</div>
      <div className="credit-packs">
        {CREDIT_PACKS.map((pack) => (
          <button key={pack.id} type="button" onClick={() => handleBuyPack(pack)}>
            <strong>{pack.credits}</strong><span>{pack.price}</span>
          </button>
        ))}
      </div>
    </section>
  );

  const MedallionSvg = () => (
    <svg ref={svgRef} viewBox="-256 -256 512 512" width="100%" height="100%">
      <defs>
        <clipPath id="avatarClip"><circle r={R_AVATAR} cx={0} cy={0} /></clipPath>
        <radialGradient id="goldOuter" cx="32%" cy="18%" r="76%"><stop offset="0%" stopColor="#ffffff" /><stop offset="17%" stopColor={GOLD_2} /><stop offset="52%" stopColor={RING_COLOR} /><stop offset="100%" stopColor="#7a5313" /></radialGradient>
        <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" /></filter>
      </defs>
      <circle r={R_OUTER + STROKE + 10} fill="#050505" filter="url(#softShadow)" />
      <circle r={R_OUTER + 8} fill="none" stroke="#1b1b1b" strokeWidth={10} />
      <circle r={R_OUTER} fill="none" stroke="url(#goldOuter)" strokeWidth={STROKE} />
      <circle r={R_OUTER - 19} fill={BLACK} />
      <circle r={R_INNER + 15} fill="none" stroke="#090909" strokeWidth={24} />
      <circle r={R_INNER} fill="none" stroke="url(#goldOuter)" strokeWidth={STROKE} />
      <circle r={R_AVATAR} fill="#22232b" />
      {avatarImage ? (
        <g clipPath="url(#avatarClip)">
          <image href={avatarImage} x={-avatarImgSize / 2 + offsetX} y={-avatarImgSize / 2 + offsetY} width={avatarImgSize} height={avatarImgSize} preserveAspectRatio="xMidYMid slice" />
          <circle r={R_AVATAR} fill="none" stroke="rgba(255,255,255,.16)" strokeWidth={4} />
        </g>
      ) : (
        <g clipPath="url(#avatarClip)">
          <rect x={-R_AVATAR} y={-R_AVATAR} width={R_AVATAR * 2} height={R_AVATAR * 2} fill="#22232b" />
          <text x={0} y={-10} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={17} fill="#bfc2cf">Clique ici</text>
          <text x={0} y={18} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={15} fill="#bfc2cf">pour importer une photo</text>
        </g>
      )}
      <path id="arcTop" d={`M ${-R_TEXT} ${TEXT_DY_TOP} A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}`} fill="none" />
      <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={38} fontWeight={950} letterSpacing={4.2} fill={RING_COLOR}><textPath href="#arcTop" startOffset="50%" textAnchor="middle">MULTISPORTS SCORING</textPath></text>
      <path id="arcBottom" d={`M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM} A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}`} fill="none" />
      <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={displayName.length > 10 ? 34 : 40} fontWeight={950} letterSpacing={displayName.length > 10 ? 2.4 : 4} fill={RING_COLOR}><textPath href="#arcBottom" startOffset="50%" textAnchor="middle">{displayName}</textPath></text>
    </svg>
  );

  const MedallionPreview = () => (
    <button type="button" className="medallion-button" onClick={() => fileInputRef.current?.click()} title="Importer une photo">
      <MedallionSvg />
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
    </button>
  );

  const renderIaTab = () => (
    <div className="tab-content">
      <CreditStrip />

      <div className="medallion-zone">
        <MedallionPreview />
      </div>

      {originalFile ? (
        <section className="floating-style-card">
          <div>
            <strong>Caricature souhaitée</strong>
            <span>Choisis le style avant de lancer l’IA.</span>
          </div>
          <select value={style} onChange={(e) => setStyle(e.target.value as StyleId)}>
            <option value="exaggerated">🎭 Très caricaturé — comique & fun</option>
            <option value="comic">💥 Comic / BD</option>
            <option value="flat">🏆 Logo esport</option>
            <option value="realistic">✏️ Cartoon plus réaliste</option>
          </select>
          <button type="button" onClick={handleGenerateCartoon} disabled={busy || !hasAiCredit}>{busy ? "⏳ Traitement…" : hasAiCredit ? "✨ Générer la caricature IA" : "🔒 Crédit IA requis"}</button>
        </section>
      ) : null}

      <section className="control-card">
        <div className="control-title"><strong>Recadrage médaillon</strong><button type="button" onClick={() => { setZoom(1.18); setOffsetX(0); setOffsetY(0); }}>Reset</button></div>
        <label>Zoom<input type="range" min={0.86} max={2.55} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
        <label>Gauche / Droite<input type="range" min={-120} max={120} step={1} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></label>
        <label>Haut / Bas<input type="range" min={-120} max={120} step={1} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></label>
        <label>Nom affiché<input className="input" value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} placeholder="Ex : NINJA" /></label>
        <div className="color-row" aria-label="Couleur du médaillon">
          {colorChoices.map((c) => <button key={c.id} type="button" title={c.label} className={medallionColor === c.value ? "selected" : ""} style={{ background: c.value }} onClick={() => setMedallionColor(c.value)} />)}
        </div>
        <button className="save-gallery-btn" type="button" onClick={() => handleSave("manual")} disabled={busy || !avatarImage}>💾 Enregistrer dans la galerie</button>
      </section>
      <StatusCard />
    </div>
  );

  const renderGalleryTab = () => (
    <div className="tab-content">
      <section className="gallery-card">
        <div className="gallery-head"><strong>Galerie avatars IA</strong><span>{gallery.length} avatar{gallery.length > 1 ? "s" : ""}</span></div>
        {gallery.length === 0 ? (
          <div className="empty-gallery">Aucun avatar pour le moment.<br />Les avatars générés ici seront stockés automatiquement.</div>
        ) : (
          <div className="gallery-grid">
            {gallery.map((item) => (
              <button key={item.id} type="button" className="gallery-thumb" onClick={() => { setSelectedGallery(item); setAssignProfileId(""); }}>
                <img src={item.dataUrl} alt={item.name} />
              </button>
            ))}
          </div>
        )}
      </section>
      <StatusCard />
    </div>
  );

  const renderDebugTab = () => (
    <div className="tab-content">
      <section className="control-card debug-card">
        <strong>Diagnostic développeur</strong>
        <p>Visible uniquement quand le mode développeur est activé.</p>
        <button type="button" onClick={runAvatarDebug} disabled={busy}>🔎 Diagnostic API IA</button>
      </section>
      <StatusCard />
    </div>
  );

  return (
    <div className="avatar-page-shell">
      <div className="avatar-fixed-top">
        <header className="avatar-header">
          <BackDot onClick={handleBack} size={40} color={primary} />
          <div className="avatar-title-block">
            <h1>AVATAR IA</h1>
            <span>Caricature cartoon + médaillon WebP</span>
          </div>
          <InfoDot title="Infos Avatar IA" content={infoContent} size={40} color={primary} />
        </header>
        <nav className="avatar-tabs">
          {tabs.filter((x) => !x.hidden).map((tab) => (
            <button key={tab.id} type="button" className={activeTab === tab.id ? "active" : ""} onClick={() => setActiveTab(tab.id)}><span>{tab.icon}</span>{tab.label}</button>
          ))}
        </nav>
      </div>

      <main className="avatar-scroll-area">
        {activeTab === "ia" ? renderIaTab() : null}
        {activeTab === "gallery" ? renderGalleryTab() : null}
        {activeTab === "debug" && devMode.enabled ? renderDebugTab() : null}
      </main>

      {miniInfo ? (
        <div onClick={() => setMiniInfo(null)} className="modal-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="modal-card">
            <div className="modal-head"><strong>{miniInfo.title}</strong><button type="button" onClick={() => setMiniInfo(null)}>✕</button></div>
            <div>{miniInfo.content}</div>
          </div>
        </div>
      ) : null}

      {selectedGallery ? (
        <div onClick={() => setSelectedGallery(null)} className="modal-backdrop gallery-modal-backdrop">
          <div onClick={(e) => e.stopPropagation()} className="gallery-modal">
            <div className="modal-head"><strong>{selectedGallery.name}</strong><button type="button" onClick={() => setSelectedGallery(null)}>✕</button></div>
            <img className="gallery-modal-img" src={selectedGallery.dataUrl} alt={selectedGallery.name} />
            <button className="primary-action" type="button" onClick={() => downloadGalleryItem(selectedGallery)}>⬇️ Exporter l’avatar WebP</button>
            <div className="assign-box">
              <label>Attribuer cet avatar</label>
              <select value={assignProfileId} onChange={(e) => setAssignProfileId(e.target.value)}>
                <option value="">Choisir un profil / bot…</option>
                {profiles.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <button type="button" onClick={() => assignAvatarToSelection(selectedGallery, assignProfileId)} disabled={!assignProfileId || busy}>Attribuer</button>
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .avatar-page-shell{min-height:100vh;margin:-8px;padding:0 12px 98px;color:${theme.text};background:radial-gradient(circle at 72% 8%, rgba(246,194,86,.16), transparent 34%),radial-gradient(circle at 20% 60%, rgba(124,58,237,.15), transparent 34%),linear-gradient(135deg,#050509 0%,#0b0d14 46%,#030305 100%);}
        .avatar-fixed-top{position:sticky;top:0;z-index:50;padding:10px 0 8px;background:linear-gradient(180deg,rgba(5,5,9,.98),rgba(5,5,9,.92) 78%,rgba(5,5,9,0));backdrop-filter:blur(12px);}
        .avatar-header{border-radius:18px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(135deg,rgba(13,16,24,.94),rgba(43,28,73,.76));box-shadow:0 18px 38px rgba(0,0,0,.42);padding:11px 12px;display:grid;grid-template-columns:42px 1fr 42px;align-items:center;gap:9px;}
        .avatar-title-block{text-align:center;min-width:0}.avatar-title-block h1{margin:0;color:${primary};font-size:23px;line-height:1;font-weight:1000;letter-spacing:1.3px}.avatar-title-block span{display:block;margin-top:5px;font-size:11px;opacity:.78;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
        .avatar-tabs{display:flex;gap:7px;margin-top:8px;padding:4px;border-radius:16px;background:rgba(255,255,255,.045);border:1px solid rgba(255,255,255,.08)}.avatar-tabs button{flex:1;border:1px solid rgba(255,255,255,.13);border-radius:13px;padding:9px 8px;color:#fff;background:linear-gradient(145deg,rgba(255,255,255,.08),rgba(255,255,255,.035));font-weight:950;font-size:12px}.avatar-tabs button.active{color:#07070d;background:linear-gradient(135deg,${primary},${GOLD_2});box-shadow:0 0 24px ${primary}66}.avatar-tabs span{margin-right:5px}
        .avatar-scroll-area{max-width:540px;margin:0 auto;padding-top:2px}.tab-content{display:grid;gap:12px}.avatar-credit-strip{border-radius:16px;border:1px solid rgba(34,197,94,.22);background:linear-gradient(145deg,rgba(12,38,32,.95),rgba(7,12,14,.98));padding:10px;display:grid;grid-template-columns:1fr auto;gap:8px;align-items:center}.credit-main strong{display:block;text-transform:uppercase;color:#d9f99d;font-size:12px}.credit-main span{display:block;font-size:11.5px;opacity:.85}.credit-pill{border-radius:999px;padding:7px 10px;font-weight:1000;border:1px solid rgba(255,255,255,.14)}.credit-pill.ok{background:rgba(34,197,94,.22)}.credit-pill.ko{background:rgba(255,93,93,.18)}.credit-packs{grid-column:1/-1;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.credit-packs button{border:1px solid rgba(246,194,86,.22);background:rgba(0,0,0,.25);color:#fff;border-radius:12px;padding:7px 6px}.credit-packs strong{display:block;font-size:11px}.credit-packs span{color:${GOLD_2};font-weight:950;font-size:11px}
        .medallion-zone{display:grid;place-items:center;padding:8px 0 0}.medallion-button{width:min(100%,420px);aspect-ratio:1/1;border:0;border-radius:26px;background:radial-gradient(circle at 50% 42%,rgba(246,194,86,.08),transparent 58%),#030305;box-shadow:0 24px 58px rgba(0,0,0,.68);padding:10px;cursor:pointer;display:grid;place-items:center;overflow:hidden}.floating-style-card,.control-card,.gallery-card,.debug-card{border-radius:18px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(19,22,32,.94),rgba(6,7,12,.96));box-shadow:0 18px 38px rgba(0,0,0,.42);padding:12px}.floating-style-card{background:linear-gradient(145deg,rgba(37,24,67,.96),rgba(9,9,16,.98));display:grid;gap:9px}.floating-style-card strong{display:block;text-transform:uppercase}.floating-style-card span{font-size:12px;opacity:.82}.floating-style-card select,.assign-box select{width:100%;min-height:42px;border-radius:12px;padding:9px 12px;background:#07070d;color:#fff;border:1px solid rgba(255,255,255,.18)}.floating-style-card button,.primary-action,.debug-card button{border:0;border-radius:15px;padding:14px 16px;font-weight:950;background:linear-gradient(135deg,#B06CFF,#7C3AED);color:#fff;box-shadow:0 16px 32px rgba(124,58,237,.42)}button:disabled{opacity:.55;cursor:not-allowed!important}
        .control-title{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}.control-title strong{text-transform:uppercase;font-size:12px}.control-title button{border:0;border-radius:999px;padding:6px 9px;background:rgba(255,255,255,.09);color:#fff}.control-card label{display:grid;gap:5px;font-size:12px;margin-bottom:8px}.input,.control-card input[type=text]{min-height:40px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:#090910;color:#fff;padding:0 12px}.color-row{display:flex;gap:8px;margin:8px 0 12px}.color-row button{width:28px;height:28px;border-radius:999px;border:2px solid rgba(255,255,255,.18);box-shadow:0 0 0 2px rgba(0,0,0,.35)}.color-row button.selected{border-color:#fff;transform:scale(1.08)}.save-gallery-btn{width:100%;border-radius:14px;padding:12px 14px;border:1px solid rgba(246,194,86,.32);background:rgba(246,194,86,.11);color:${GOLD_2};font-weight:950}
        .avatar-status{border-radius:16px;border:1px solid rgba(255,255,255,.13);padding:11px;display:flex;gap:10px;align-items:center}.avatar-status.is-ok{background:linear-gradient(145deg,rgba(8,45,31,.95),rgba(5,12,10,.98))}.avatar-status.is-error{background:linear-gradient(145deg,rgba(70,18,18,.96),rgba(14,10,10,.96))}.avatar-status-dot{width:30px;height:30px;border-radius:999px;display:grid;place-items:center;font-weight:950;background:#22c76f}.avatar-status.is-error .avatar-status-dot{background:#ff5d5d}.avatar-status-title{font-size:12.5px;font-weight:850}.avatar-status-sub{font-size:12px;opacity:.78;margin-top:2px}
        .gallery-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:12px}.gallery-head strong{text-transform:uppercase}.gallery-head span{font-size:12px;opacity:.75}.empty-gallery{border-radius:16px;border:1px dashed rgba(255,255,255,.18);padding:28px 16px;text-align:center;opacity:.72}.gallery-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.gallery-thumb{border:0;background:#050505;border-radius:13px;padding:0;overflow:hidden;aspect-ratio:1/1}.gallery-thumb img{width:100%;height:100%;object-fit:cover;display:block}
        .modal-backdrop{position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.68);display:grid;place-items:center;padding:18px}.modal-card,.gallery-modal{width:min(92vw,420px);border-radius:18px;border:1px solid rgba(255,255,255,.13);background:linear-gradient(145deg,rgba(24,24,34,.98),rgba(6,7,12,.98));box-shadow:0 26px 70px rgba(0,0,0,.72);padding:16px}.modal-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:12px}.modal-head strong{color:${primary};text-transform:uppercase}.modal-head button{border:0;background:rgba(255,255,255,.09);color:#fff;border-radius:10px;padding:6px 9px}.gallery-modal-img{width:100%;aspect-ratio:1/1;object-fit:cover;border-radius:18px;background:#000;margin-bottom:12px}.assign-box{display:grid;gap:8px;margin-top:12px}.assign-box label{font-weight:900;text-transform:uppercase;font-size:12px}.assign-box button{border:0;border-radius:14px;padding:12px;background:rgba(246,194,86,.18);color:${GOLD_2};font-weight:950}
      `}</style>
    </div>
  );
}
