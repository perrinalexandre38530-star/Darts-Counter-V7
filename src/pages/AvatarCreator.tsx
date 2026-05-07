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

const MEDALLION_COLORS = [
  { id: "gold", label: "Or", main: "#F6C256", light: "#FFE08A", dark: "#B97913" },
  { id: "lime", label: "Lime", main: "#A3E635", light: "#ECFCCB", dark: "#4D7C0F" },
  { id: "cyan", label: "Cyan", main: "#38BDF8", light: "#BAE6FD", dark: "#075985" },
  { id: "violet", label: "Violet", main: "#A78BFA", light: "#DDD6FE", dark: "#5B21B6" },
  { id: "pink", label: "Rose", main: "#F472B6", light: "#FBCFE8", dark: "#9D174D" },
  { id: "red", label: "Rouge", main: "#FB7185", light: "#FFE4E6", dark: "#9F1239" },
  { id: "white", label: "Blanc", main: "#F8FAFC", light: "#FFFFFF", dark: "#94A3B8" },
];

type MedallionColor = (typeof MEDALLION_COLORS)[number];


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

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function getAvatarAccountKey(): string {
  try {
    const session = readLocalJson<any>("dc_online_auth_supabase_v1", null);
    const userId = String(session?.userId || session?.user?.id || session?.session?.user?.id || "").trim();
    if (userId) return `user_${userId}`;
  } catch {}
  try {
    const raw = localStorage.getItem("dc_store_v1") || localStorage.getItem("darts-counter-store") || "";
    const store = raw ? JSON.parse(raw) : null;
    const active = String(store?.activeProfileId || store?.profileId || "").trim();
    if (active) return `profile_${active}`;
  } catch {}
  return "local_device";
}

function scopedCreditStorageKey(): string {
  return `${CREDIT_STORAGE_KEY}:${getAvatarAccountKey()}`;
}

function readProcessedCheckoutIds(): string[] {
  return readLocalJson<string[]>(`${CREDIT_STORAGE_KEY}:processed_sessions`, []);
}

function markCheckoutProcessed(sessionId: string) {
  const ids = readProcessedCheckoutIds();
  if (!ids.includes(sessionId)) {
    localStorage.setItem(`${CREDIT_STORAGE_KEY}:processed_sessions`, JSON.stringify([sessionId, ...ids].slice(0, 80)));
  }
}

function isCheckoutProcessed(sessionId: string): boolean {
  return readProcessedCheckoutIds().includes(sessionId);
}


function readCreditState(): AvatarCreditState {
  try {
    const raw = localStorage.getItem(scopedCreditStorageKey());
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
    localStorage.setItem(scopedCreditStorageKey(), JSON.stringify(safe));
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

function AvatarCreator({
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
  const [assignTarget, setAssignTarget] = React.useState<GalleryAvatar | null>(null);
  const [selectedGalleryItem, setSelectedGalleryItem] = React.useState<GalleryAvatar | null>(null);
  const [profiles, setProfiles] = React.useState<AssignableProfile[]>([]);
  const [medallionColorId, setMedallionColorId] = React.useState<string>("gold");

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const avatarImage = photoUrl;

  const primary = theme.primary ?? GOLD;
  const selectedMedallion = MEDALLION_COLORS.find((c) => c.id === medallionColorId) || MEDALLION_COLORS[0];
  const RING_COLOR = isBotMode ? BOT_RING : selectedMedallion.main;
  const RING_LIGHT = isBotMode ? "#DDF7FF" : selectedMedallion.light;
  const RING_DARK = isBotMode ? "#0369A1" : selectedMedallion.dark;
  const avatarImgSize = R_AVATAR * 2 * zoom;
  const displayName = (name || "PLAYER").trim().toUpperCase();
  const hasAiCredit = !creditState.freeUsed || creditState.credits > 0;
  const remainingPaidCredits = creditState.credits;
  const tabs: Array<{ id: TabId; label: string; icon: string; hidden?: boolean }> = [
    { id: "ia", label: "IA", icon: "✨" },
    { id: "gallery", label: "Galerie", icon: "🖼️" },
    { id: "debug", label: "Debug", icon: "🧪", hidden: !devMode.enabled },
  ];

  React.useEffect(() => {
    if (activeTab === "debug" && !devMode.enabled) setActiveTab("ia");
  }, [activeTab, devMode.enabled]);

  React.useEffect(() => {
    const href = window.location.href;
    if (!href.includes("avatarCheckout=success")) return;
    const match = href.match(/[?&]session_id=([^&#]+)/);
    const sessionId = match ? decodeURIComponent(match[1]) : "";
    if (!sessionId || isCheckoutProcessed(sessionId)) return;
    let cancelled = false;
    (async () => {
      try {
        setBusy(true);
        const response = await fetch(`/api/avatar/checkout-verify?session_id=${encodeURIComponent(sessionId)}`);
        const json = await response.json().catch(() => null) as any;
        if (!response.ok || !json?.paid || !json?.credits) throw new Error(json?.message || json?.error || `verify_${response.status}`);
        if (cancelled) return;
        setCreditState((current) => writeCreditState({ ...current, credits: current.credits + Math.max(0, Number(json.credits || 0)) }));
        markCheckoutProcessed(sessionId);
        setStatus(`Paiement validé : +${json.credits} crédits avatars IA ajoutés au compte.`);
        window.history.replaceState(null, "", window.location.href.replace(/[?&]avatarCheckout=success/, "").replace(/[?&]session_id=[^&#]+/, ""));
      } catch (err: any) {
        if (!cancelled) setError(`Impossible de valider le paiement Stripe : ${String(err?.message || err || "erreur")}`);
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  React.useEffect(() => {
    if (activeTab !== "gallery" && !assignTarget) return;
    let alive = true;
    (async () => {
      const store: any = await loadStore<any>();
      if (!alive) return;
      const list = Array.isArray(store?.profiles) ? store.profiles : [];
      const profileItems = list
        .map((p: any) => ({
          id: `profile:${String(p?.id || "")}`,
          name: `${String(p?.id || "") === String(store?.activeProfileId || "") ? "⭐ Profil actif — " : "Profil local — "}${String(p?.name || p?.displayName || "Profil")}`,
          avatarDataUrl: p?.avatarDataUrl,
          avatarUrl: p?.avatarUrl,
        }))
        .filter((p: any) => p.id !== "profile:");
      const botsRaw = readLocalJson<any[]>("dc_bots_v1", []);
      const botItems = Array.isArray(botsRaw)
        ? botsRaw.map((b: any) => ({ id: `bot:${String(b?.id || "")}`, name: `Bot CPU — ${String(b?.name || "Bot")}`, avatarDataUrl: b?.avatarDataUrl, avatarUrl: b?.avatarUrl || b?.avatar })).filter((b: any) => b.id !== "bot:")
        : [];
      setProfiles([...profileItems, ...botItems]);
    })();
    return () => { alive = false; };
  }, [activeTab, assignTarget]);

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
    persistGallery([item, ...gallery.filter((x) => x.dataUrl !== dataUrl)]);
  }

  function consumeAvatarCreditAfterSuccess() {
    setCreditState((current) => {
      const next = current.freeUsed
        ? { ...current, credits: Math.max(0, current.credits - 1) }
        : { ...current, freeUsed: true };
      return writeCreditState(next);
    });
  }

  async function handleBuyPack(pack: CreditPack) {
    setError(null);
    setStatus(null);
    try {
      setBusy(true);
      const response = await fetch("/api/avatar/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packId: pack.id,
          accountKey: getAvatarAccountKey(),
          successUrl: `${window.location.origin}${window.location.pathname}${window.location.hash || "#/avatar_creator"}?avatarCheckout=success&session_id={CHECKOUT_SESSION_ID}`,
          cancelUrl: window.location.href,
        }),
      });
      const json = await response.json().catch(() => null) as any;
      if (!response.ok || !json?.url) {
        throw new Error(json?.message || json?.error || `checkout_${response.status}`);
      }
      window.location.href = json.url;
    } catch (err: any) {
      console.warn("[AvatarCreator] Stripe checkout failed", err);
      setError(`Paiement non disponible : ${String(err?.message || err || "erreur")}. Vérifie STRIPE_SECRET_KEY côté Cloudflare.`);
    } finally {
      setBusy(false);
    }
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
        setStatus("Photo importée dans le médaillon. Recadre-la puis lance la caricature IA.");
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
      setError("Importe d’abord une photo directement dans le médaillon.");
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
        setStatus("Vraie caricature IA générée. 1 crédit avatar consommé. Enregistre-la pour l’ajouter à la galerie.");
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

  async function handleSave(source: "ia" | "manual" = "manual") {
    if (!avatarImage) {
      setError("Importe d’abord une image avant d’enregistrer.");
      return;
    }
    try {
      setBusy(true);
      const webpDataUrl = await renderMedallionWebp(EXPORT_SIZE);
      const safeDataUrl = (await enforceSafeAvatarDataUrl(webpDataUrl)) || webpDataUrl;
      setLastExport(safeDataUrl);
      addToGallery(safeDataUrl, source);
      if (onSave) {
        onSave({ pngDataUrl: safeDataUrl, name: name || "PLAYER" });
        setStatus("Avatar WebP enregistré sur le profil et ajouté à la galerie.");
      } else {
        setStatus("Avatar WebP ajouté à la galerie. Tu peux l’exporter ou l’attribuer à un profil.");
      }
      setActiveTab("gallery");
    } catch (e) {
      console.warn(e);
      setError("Impossible d’enregistrer l’avatar pour le moment.");
    } finally {
      setBusy(false);
    }
  }

  function downloadGalleryItem(item: GalleryAvatar) {
    const a = document.createElement("a");
    a.href = item.dataUrl;
    a.download = `avatar-multisports-${item.name || "player"}.webp`;
    a.click();
  }

  async function assignAvatarToProfile(item: GalleryAvatar, profileId: string) {
    try {
      setBusy(true);
      if (profileId.startsWith("bot:")) {
        const botId = profileId.slice(4);
        const bots = readLocalJson<any[]>("dc_bots_v1", []);
        const nextBots = Array.isArray(bots)
          ? bots.map((b: any) => String(b?.id || "") === botId ? { ...b, avatarDataUrl: item.dataUrl, avatarUrl: undefined, avatar: undefined, updatedAt: new Date().toISOString() } : b)
          : [];
        localStorage.setItem("dc_bots_v1", JSON.stringify(nextBots));
        try { window.dispatchEvent(new Event("dc:bots-changed")); } catch {}
        const target = nextBots.find((b: any) => String(b?.id || "") === botId);
        setStatus(`Avatar attribué au bot ${target?.name || "CPU"}.`);
        setAssignTarget(null);
        return;
      }

      const cleanProfileId = profileId.startsWith("profile:") ? profileId.slice(8) : profileId;
      const store: any = await loadStore<any>();
      if (!store || !Array.isArray(store.profiles)) throw new Error("store_profiles_missing");
      const nextProfiles = store.profiles.map((p: any) =>
        String(p?.id || "") === String(cleanProfileId)
          ? { ...p, avatarDataUrl: item.dataUrl, avatarUrl: undefined, avatarAssetId: null, avatarThumbAssetId: null, avatarFullAssetId: null, avatarCastAssetId: null }
          : p
      );
      await saveStore({ ...store, profiles: nextProfiles });
      const target = nextProfiles.find((p: any) => String(p?.id || "") === String(cleanProfileId));
      setStatus(`Avatar attribué à ${target?.name || "profil"}.`);
      setAssignTarget(null);
    } catch (e) {
      console.warn(e);
      setError("Impossible d’attribuer cet avatar au profil sélectionné.");
    } finally {
      setBusy(false);
    }
  }

  const infoContent = (
    <div style={{ lineHeight: 1.45 }}>
      <p style={{ marginTop: 0 }}><strong>AVATAR IA</strong> : importe une photo dans le médaillon, recadre-la, génère une caricature cartoon, puis enregistre le WebP final.</p>
      <p>Le premier avatar IA est offert. Ensuite, chaque génération réussie consomme 1 crédit.</p>
      <p style={{ marginBottom: 0 }}>Le diagnostic API est masqué et visible uniquement en mode développeur.</p>
    </div>
  );

  const creditCompact = (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div>
          <div style={{ fontWeight: 950, fontSize: 12, textTransform: "uppercase", color: "#d9f99d" }}>Crédits IA</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{creditLabel(creditState)}</div>
        </div>
        <div style={{ minWidth: 56, textAlign: "center", borderRadius: 999, padding: "7px 10px", background: hasAiCredit ? "rgba(34,197,94,.22)" : "rgba(255,93,93,.18)", border: "1px solid rgba(255,255,255,.14)", fontWeight: 950 }}>
          {!creditState.freeUsed ? "FREE" : remainingPaidCredits}
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {CREDIT_PACKS.map((pack) => (
          <button key={pack.id} type="button" onClick={() => handleBuyPack(pack)} style={{ border: "1px solid rgba(246,194,86,.22)", background: "rgba(0,0,0,.25)", color: "#fff", borderRadius: 12, padding: "8px 6px", cursor: "pointer", textAlign: "center" }}>
            <strong style={{ display: "block", fontSize: 11 }}>{pack.credits}</strong>
            <span style={{ color: GOLD_2, fontWeight: 950, fontSize: 11 }}>{pack.price}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const StatusCard = () => {
    if (!status && !error && !lastExport && !debugText) return null;
    return (
      <div style={{ ...cardBase, padding: 12, display: "flex", gap: 10, alignItems: "center", background: error ? "linear-gradient(145deg, rgba(70,18,18,.96), rgba(14,10,10,.96))" : "linear-gradient(145deg, rgba(8,45,31,.95), rgba(5,12,10,.98))" }}>
        <div style={{ width: 30, height: 30, borderRadius: 999, background: error ? "#ff5d5d" : "#22c76f", display: "grid", placeItems: "center", fontWeight: 950, color: "#fff", flex: "0 0 auto" }}>{error ? "!" : "✓"}</div>
        <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
          <div style={{ fontWeight: 850 }}>{error ? error : debugText || status || "Avatar prêt !"}</div>
          {!error && <div style={{ opacity: 0.78, marginTop: 2 }}>WebP • {EXPORT_SIZE}x{EXPORT_SIZE} • {dataUrlSizeKb(lastExport || photoUrl)}</div>}
        </div>
      </div>
    );
  };

  const TabButton = ({ id, label, icon }: { id: TabId; label: string; icon: string }) => {
    const selected = activeTab === id;
    return (
      <button type="button" onClick={() => setActiveTab(id)} style={{ flex: 1, border: "1px solid rgba(255,255,255,.13)", borderRadius: 14, padding: "10px 8px", color: selected ? "#07070d" : "#fff", background: selected ? `linear-gradient(135deg, ${primary}, ${GOLD_2})` : "linear-gradient(145deg, rgba(255,255,255,.08), rgba(255,255,255,.035))", boxShadow: selected ? `0 0 24px ${primary}66` : "none", fontWeight: 950, fontSize: 12, cursor: "pointer" }}>
        <span style={{ marginRight: 5 }}>{icon}</span>{label}
      </button>
    );
  };

  const MedallionButton = ({ compact = false }: { compact?: boolean }) => (
    <button type="button" onClick={() => fileInputRef.current?.click()} title="Importer une photo" style={{ width: "100%", aspectRatio: "1 / 1", maxHeight: compact ? 360 : 520, background: "radial-gradient(circle at 50% 42%, rgba(246,194,86,.08), transparent 58%), #030305", borderRadius: 24, padding: 10, boxShadow: "0 22px 48px rgba(0,0,0,.62)", display: "flex", alignItems: "center", justifyContent: "center", position: "relative", overflow: "hidden", border: "0", cursor: "pointer" }}>
      <svg ref={svgRef} viewBox="-256 -256 512 512" width="100%" height="100%">
        <defs>
          <clipPath id="avatarClip"><circle r={R_AVATAR} cx={0} cy={0} /></clipPath>
          <radialGradient id="goldOuter" cx="32%" cy="18%" r="76%"><stop offset="0%" stopColor={RING_LIGHT} /><stop offset="42%" stopColor={RING_COLOR} /><stop offset="100%" stopColor={RING_DARK} /></radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#000" floodOpacity="0.55" /></filter>
        </defs>
        <circle r={R_OUTER + STROKE + 10} fill="#050505" filter="url(#softShadow)" />
        <circle r={R_OUTER + 8} fill="none" stroke="#1b1b1b" strokeWidth={10} />
        <circle r={R_OUTER} fill="none" stroke="url(#goldOuter)" strokeWidth={STROKE} />
        <circle r={R_OUTER - 19} fill={BLACK} />
        <circle r={R_OUTER - 28} fill="none" stroke={RING_DARK} strokeWidth={5} opacity={0.82} />
        <circle r={R_INNER + 15} fill="none" stroke="#090909" strokeWidth={24} />
        <circle r={R_INNER + 23} fill="none" stroke={RING_COLOR} strokeWidth={5} opacity={0.82} />
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
            <text x={0} y={-12} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={20} fontWeight={900} fill="#e5e7eb">Clique ici</text>
            <text x={0} y={20} textAnchor="middle" fontFamily="system-ui, sans-serif" fontSize={15} fill="#cbd5e1">importer une photo</text>
          </g>
        )}
        <path id="arcTop" d={`M ${-R_TEXT} ${TEXT_DY_TOP} A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}`} fill="none" />
        <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={38} fontWeight={950} letterSpacing={4.2} fill={RING_COLOR}><textPath href="#arcTop" startOffset="50%" textAnchor="middle">MULTISPORTS SCORING</textPath></text>
        <path id="arcBottom" d={`M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM} A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}`} fill="none" />
        <text fontFamily="Montserrat, Arial Black, system-ui, sans-serif" fontSize={displayName.length > 10 ? 34 : 40} fontWeight={950} letterSpacing={displayName.length > 10 ? 2.4 : 4} fill={RING_COLOR}><textPath href="#arcBottom" startOffset="50%" textAnchor="middle">{displayName}</textPath></text>
      </svg>
      <input ref={fileInputRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
    </button>
  );

  const ColorPicker = () => (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.88 }}>Couleur du médaillon</div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {MEDALLION_COLORS.map((c) => (
          <button key={c.id} type="button" onClick={() => setMedallionColorId(c.id)} title={c.label} style={{ width: 30, height: 30, borderRadius: 999, border: medallionColorId === c.id ? "3px solid #fff" : "1px solid rgba(255,255,255,.25)", background: `radial-gradient(circle at 32% 24%, ${c.light}, ${c.main} 52%, ${c.dark})`, boxShadow: medallionColorId === c.id ? `0 0 18px ${c.main}aa` : "none", cursor: "pointer" }} />
        ))}
      </div>
    </div>
  );

  const renderCreditsCard = () => (
    <div style={{ ...cardBase, padding: 12, background: "linear-gradient(145deg, rgba(12,38,32,.96), rgba(7,12,14,.98))" }}>
      {creditCompact}
    </div>
  );

  const renderControls = () => (
    <div style={{ ...cardBase, padding: 12, background: "linear-gradient(145deg, rgba(18,18,27,.96), rgba(6,7,12,.98))" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 8 }}>
        <strong style={{ fontSize: 12, textTransform: "uppercase", color: theme.textSoft }}>Recadrage médaillon</strong>
        <button type="button" onClick={() => { setZoom(1.18); setOffsetX(0); setOffsetY(0); }} style={{ border: 0, borderRadius: 999, padding: "6px 9px", background: "rgba(255,255,255,.09)", color: "#fff", cursor: "pointer", fontSize: 11, fontWeight: 850 }}>Reset</button>
      </div>
      <label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 8 }}>Zoom<input type="range" min={0.86} max={2.55} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
      <label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 8 }}>Gauche / Droite<input type="range" min={-120} max={120} step={1} value={offsetX} onChange={(e) => setOffsetX(Number(e.target.value))} /></label>
      <label style={{ display: "grid", gap: 5, fontSize: 12, marginBottom: 10 }}>Haut / Bas<input type="range" min={-120} max={120} step={1} value={offsetY} onChange={(e) => setOffsetY(Number(e.target.value))} /></label>
      <label style={{ display: "grid", gap: 6, fontSize: 12, marginBottom: 10 }}>Nom affiché<input className="input" value={name} onChange={(e) => setName(e.target.value.slice(0, 14))} placeholder="Ex : NINJA" style={{ minHeight: 42 }} /></label>
      <ColorPicker />
    </div>
  );

  const renderCaricatureBox = () => {
    if (!originalFile) return null;
    return (
      <div style={{ ...cardBase, padding: 12, background: "linear-gradient(145deg, rgba(37,24,67,.96), rgba(9,9,16,.98))" }}>
        <div style={{ fontWeight: 1000, textTransform: "uppercase", marginBottom: 4 }}>Caricature souhaitée</div>
        <div style={{ opacity: 0.78, fontSize: 12, marginBottom: 10 }}>Choisis le style puis lance la génération.</div>
        <select value={style} onChange={(e) => setStyle(e.target.value as StyleId)} style={{ width: "100%", minHeight: 42, borderRadius: 12, padding: "9px 12px", background: "#07070d", color: "#fff", border: "1px solid rgba(255,255,255,.18)", marginBottom: 10 }}>
          <option value="exaggerated">🎭 Très caricaturé — comique & fun</option>
          <option value="comic">💥 Comic / BD</option>
          <option value="flat">🏆 Logo esport</option>
          <option value="realistic">✏️ Dessin cartoon plus réaliste</option>
        </select>
        <button type="button" onClick={handleGenerateCartoon} disabled={busy || !originalFile || !hasAiCredit} style={{ width: "100%", borderRadius: 15, padding: "15px 16px", fontSize: 15, fontWeight: 950, border: "none", cursor: busy || !originalFile || !hasAiCredit ? "not-allowed" : "pointer", background: "linear-gradient(135deg, #B06CFF, #7C3AED)", color: "#FFF", boxShadow: "0 16px 32px rgba(124,58,237,.42)", opacity: busy || !originalFile || !hasAiCredit ? 0.55 : 1 }}>{busy ? "⏳ Traitement…" : hasAiCredit ? "✨ Générer la caricature IA" : "🔒 Crédit avatar IA requis"}</button>
        <button type="button" onClick={() => handleSave("manual")} disabled={busy || !avatarImage} style={{ width: "100%", marginTop: 8, borderRadius: 14, padding: "12px 14px", border: "1px solid rgba(246,194,86,.32)", background: "rgba(246,194,86,.11)", color: GOLD_2, fontWeight: 950, cursor: busy || !avatarImage ? "not-allowed" : "pointer", opacity: busy || !avatarImage ? 0.55 : 1 }}>💾 Enregistrer dans la galerie</button>
      </div>
    );
  };

  const renderIaTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {renderCreditsCard()}
      <MedallionButton />
      {renderControls()}
      {renderCaricatureBox()}
      <StatusCard />
    </div>
  );

  const renderGalleryTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", marginBottom: 12 }}>
          <div>
            <div style={{ fontWeight: 1000, textTransform: "uppercase", fontSize: 15 }}>Galerie avatars IA</div>
            <div style={{ opacity: 0.78, fontSize: 12.5 }}>{gallery.length} avatar{gallery.length > 1 ? "s" : ""} sauvegardé{gallery.length > 1 ? "s" : ""}</div>
          </div>
          <InfoMini title="Galerie" content="Clique sur un avatar pour l’ouvrir en grand, l’exporter ou l’attribuer à un profil existant." onOpen={(title, content) => setMiniInfo({ title, content })} />
        </div>
        {gallery.length === 0 ? (
          <div style={{ borderRadius: 16, border: "1px dashed rgba(255,255,255,.18)", padding: 20, textAlign: "center", opacity: 0.72 }}>Aucun avatar pour le moment. Génère puis enregistre un avatar depuis l’onglet IA.</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {gallery.map((item) => (
              <button key={item.id} type="button" onClick={() => setSelectedGalleryItem(item)} style={{ border: 0, borderRadius: 14, background: "rgba(255,255,255,.055)", padding: 6, cursor: "pointer" }}>
                <img src={item.dataUrl} alt={item.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 12, background: "#000" }} />
              </button>
            ))}
          </div>
        )}
      </div>
      <StatusCard />
    </div>
  );

  const renderDebugTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 14, background: "linear-gradient(145deg, rgba(46,24,22,.96), rgba(10,8,8,.98))" }}>
        <div style={{ fontWeight: 1000, textTransform: "uppercase", marginBottom: 8 }}>Diagnostic développeur</div>
        <p style={{ margin: "0 0 12px", opacity: 0.82, fontSize: 13, lineHeight: 1.4 }}>Visible uniquement quand le mode développeur est activé.</p>
        <button type="button" onClick={runAvatarDebug} disabled={busy} style={{ width: "100%", borderRadius: 14, padding: "13px 14px", border: "1px solid rgba(255,255,255,.16)", background: "rgba(255,255,255,.08)", color: "#fff", fontWeight: 950, cursor: busy ? "not-allowed" : "pointer" }}>🔎 Diagnostic API IA</button>
      </div>
      <StatusCard />
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", margin: -8, padding: "0 14px 104px", color: theme.text, background: "radial-gradient(circle at 72% 8%, rgba(246,194,86,.16), transparent 34%), radial-gradient(circle at 20% 60%, rgba(124,58,237,.15), transparent 34%), linear-gradient(135deg, #050509 0%, #0b0d14 46%, #030305 100%)" }}>
      <div style={{ maxWidth: 460, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ position: "sticky", top: 0, zIndex: 50, padding: "10px 0 8px", background: "linear-gradient(180deg, rgba(5,5,9,.98), rgba(5,5,9,.92) 70%, rgba(5,5,9,0))", backdropFilter: "blur(12px)" }}>
          <header style={{ ...cardBase, padding: "12px 14px", display: "grid", gridTemplateColumns: "44px 1fr 44px", alignItems: "center", gap: 10, background: "linear-gradient(135deg, rgba(13,16,24,.92), rgba(43,28,73,.72))" }}>
            <BackDot onClick={handleBack} size={40} color={primary} />
            <div style={{ minWidth: 0, textAlign: "center" }}>
              <h1 style={{ margin: 0, fontSize: 24, lineHeight: 1, fontWeight: 1000, letterSpacing: 1.4, color: primary, textTransform: "uppercase" }}>AVATAR IA</h1>
              <div style={{ marginTop: 5, fontSize: 12, opacity: 0.82, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>Caricature cartoon + médaillon WebP</div>
            </div>
            <InfoDot title="Infos Avatar IA" content={infoContent} size={40} color={primary} />
          </header>

          <div style={{ display: "flex", gap: 7, padding: 4, marginTop: 8, borderRadius: 18, background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }}>
            {tabs.filter((x) => !x.hidden).map((tab) => <TabButton key={tab.id} id={tab.id} label={tab.label} icon={tab.icon} />)}
          </div>
        </div>

        <main style={{ display: "grid", gap: 12 }}>
          {activeTab === "ia" ? renderIaTab() : null}
          {activeTab === "gallery" ? renderGalleryTab() : null}
          {activeTab === "debug" && devMode.enabled ? renderDebugTab() : null}
        </main>
      </div>

      {miniInfo ? (
        <div onClick={() => setMiniInfo(null)} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.62)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(92vw, 360px)", ...cardBase, padding: 18, background: "linear-gradient(145deg, rgba(24,24,34,.98), rgba(6,7,12,.98))" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", marginBottom: 10 }}>
              <strong style={{ color: primary, textTransform: "uppercase" }}>{miniInfo.title}</strong>
              <button type="button" onClick={() => setMiniInfo(null)} style={{ border: 0, background: "rgba(255,255,255,.09)", color: "#fff", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}>✕</button>
            </div>
            <div style={{ opacity: 0.88, lineHeight: 1.45, fontSize: 13.5 }}>{miniInfo.content}</div>
          </div>
        </div>
      ) : null}

      {selectedGalleryItem ? (
        <div onClick={() => setSelectedGalleryItem(null)} style={{ position: "fixed", inset: 0, zIndex: 9997, background: "rgba(0,0,0,.74)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(94vw, 430px)", ...cardBase, padding: 16, background: "linear-gradient(145deg, rgba(18,18,27,.98), rgba(4,5,9,.99))" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <strong style={{ color: primary, textTransform: "uppercase" }}>Avatar IA</strong>
              <button type="button" onClick={() => setSelectedGalleryItem(null)} style={{ border: 0, background: "rgba(255,255,255,.09)", color: "#fff", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}>✕</button>
            </div>
            <img src={selectedGalleryItem.dataUrl} alt={selectedGalleryItem.name} style={{ width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 18, background: "#000", boxShadow: "0 18px 42px rgba(0,0,0,.5)" }} />
            <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <button type="button" onClick={() => downloadGalleryItem(selectedGalleryItem)} style={{ border: 0, borderRadius: 13, padding: "12px 10px", background: "rgba(255,255,255,.09)", color: "#fff", fontWeight: 900, cursor: "pointer" }}>⬇️ Exporter</button>
              <button type="button" onClick={() => { setAssignTarget(selectedGalleryItem); setSelectedGalleryItem(null); }} style={{ border: 0, borderRadius: 13, padding: "12px 10px", background: "rgba(246,194,86,.18)", color: GOLD_2, fontWeight: 900, cursor: "pointer" }}>👤 Attribuer</button>
            </div>
            <button type="button" onClick={() => setSelectedGalleryItem(null)} style={{ width: "100%", marginTop: 8, border: "1px solid rgba(255,255,255,.12)", borderRadius: 13, padding: "11px 10px", background: "transparent", color: "#fff", cursor: "pointer" }}>Fermer</button>
          </div>
        </div>
      ) : null}

      {assignTarget ? (
        <div onClick={() => setAssignTarget(null)} style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.68)", display: "grid", placeItems: "center", padding: 18 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "min(92vw, 420px)", ...cardBase, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
              <strong style={{ color: primary, textTransform: "uppercase" }}>Attribuer à un profil</strong>
              <button type="button" onClick={() => setAssignTarget(null)} style={{ border: 0, background: "rgba(255,255,255,.09)", color: "#fff", borderRadius: 10, padding: "6px 9px", cursor: "pointer" }}>✕</button>
            </div>
            {profiles.length === 0 ? <div style={{ opacity: 0.75, fontSize: 13 }}>Aucun profil local trouvé.</div> : (
              <div style={{ display: "grid", gap: 8, maxHeight: 360, overflow: "auto" }}>
                {profiles.map((p) => (
                  <button key={p.id} type="button" onClick={() => assignAvatarToProfile(assignTarget, p.id)} style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", borderRadius: 14, padding: 10, cursor: "pointer", textAlign: "left" }}>
                    <img src={p.avatarDataUrl || p.avatarUrl || assignTarget.dataUrl} alt="" style={{ width: 38, height: 38, borderRadius: 999, objectFit: "cover", background: "#000" }} />
                    <strong>{p.name}</strong>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      <style>{`
        @media (max-width: 860px) {
          .avatar-ia-grid { grid-template-columns: 1fr !important; }
          .avatar-ia-preview { position: relative !important; top: auto !important; }
        }
      `}</style>
    </div>
  );
}

export default AvatarCreator;
