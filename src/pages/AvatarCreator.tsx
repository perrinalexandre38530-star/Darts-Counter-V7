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
import {
  fileToSafeAvatarDataUrl,
  enforceSafeAvatarDataUrl,
} from "../lib/avatarSafe";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import InfoMini from "../components/InfoMini";
import { useDevMode } from "../contexts/DevModeContext";
import { loadStore, saveStore } from "../lib/storage";
import { apiGet, apiPost } from "../lib/apiClient";
import { loadBots, saveBots } from "../lib/bots";
import { upsertAvatarGalleryItem } from "../lib/avatarGallery";

type Props = {
  size?: number;
  overlaySrc?: string;
  defaultName?: string;
  onSave?: (payload: { pngDataUrl: string; name: string }) => void;
  onBack?: () => void;
  isBotMode?: boolean;
};

type StyleId =
  | "exaggerated_fun"
  | "exaggerated_realistic"
  | "simple_elegant"
  | "simple_fun"
  | "three_d_fun"
  | "three_d_elegant";
type TabId = "ia" | "gallery" | "debug";

type AiPayload = {
  dataUrl: string;
  provider?: string;
  avatarCredits?: Partial<AvatarCreditState> & {
    ok?: boolean;
    canGenerate?: boolean;
    label?: string;
  };
};

const GOLD = "#F6C256";
const GOLD_2 = "#FFE08A";
const BLACK = "#000000";
const BOT_RING = "#00b4ff";
const EXPORT_SIZE = 256;

const CREDIT_STORAGE_KEY = "msc_avatar_ai_credits_v1"; // legacy: lecture tolérée, décisions désormais côté NAS

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
  {
    id: "gold",
    label: "Or",
    main: "#F6C256",
    light: "#FFE08A",
    dark: "#B97913",
  },
  {
    id: "lime",
    label: "Lime",
    main: "#A3E635",
    light: "#ECFCCB",
    dark: "#4D7C0F",
  },
  {
    id: "cyan",
    label: "Cyan",
    main: "#38BDF8",
    light: "#BAE6FD",
    dark: "#075985",
  },
  {
    id: "violet",
    label: "Violet",
    main: "#A78BFA",
    light: "#DDD6FE",
    dark: "#5B21B6",
  },
  {
    id: "pink",
    label: "Rose",
    main: "#F472B6",
    light: "#FBCFE8",
    dark: "#9D174D",
  },
  {
    id: "red",
    label: "Rouge",
    main: "#FB7185",
    light: "#FFE4E6",
    dark: "#9F1239",
  },
  {
    id: "white",
    label: "Blanc",
    main: "#F8FAFC",
    light: "#FFFFFF",
    dark: "#94A3B8",
  },
];

type AvatarStyleOption = {
  id: StyleId;
  label: string;
  shortLabel: string;
  description: string;
  icon: string;
  accent: string;
  preview: string;
};

const AVATAR_STYLE_OPTIONS: AvatarStyleOption[] = [
  {
    id: "exaggerated_fun",
    label: "Très caricaturé — Comique & Fun",
    shortLabel: "Très fun",
    description:
      "Grosse expression, yeux amplifiés, sourire très drôle, rendu cartoon assumé.",
    icon: "🎭",
    accent: "#F97316",
    preview: "Yeux énormes • sourire XXL • contours épais",
  },
  {
    id: "exaggerated_realistic",
    label: "Très caricaturé — Cartoon réaliste",
    shortLabel: "Caricature réaliste",
    description:
      "Caricature forte mais plus proche du visage réel, illustration propre et premium.",
    icon: "🧑‍🎨",
    accent: "#38BDF8",
    preview: "Ressemblance forte • traits amplifiés • peau travaillée",
  },
  {
    id: "simple_elegant",
    label: "Caricature Simple — Élégant",
    shortLabel: "Simple élégant",
    description:
      "Portrait cartoon plus sobre, propre, classe, idéal profil sérieux ou équipe.",
    icon: "✨",
    accent: "#F8FAFC",
    preview: "Traits doux • rendu propre • expression naturelle",
  },
  {
    id: "simple_fun",
    label: "Caricature Simple — Cartoon & Fun",
    shortLabel: "Simple fun",
    description:
      "Cartoon léger, sympathique, coloré, sans exagération extrême.",
    icon: "😄",
    accent: "#A3E635",
    preview: "Sourire sympa • couleurs vives • style avatar",
  },
  {
    id: "three_d_fun",
    label: "Caricature 3D — Comique & Fun",
    shortLabel: "3D fun",
    description:
      "Avatar type jouet 3D, drôle, rond, expressif, très visible dans le médaillon.",
    icon: "🧸",
    accent: "#A78BFA",
    preview: "Volume 3D • grosse tête • look jouet Pixar-like",
  },
  {
    id: "three_d_elegant",
    label: "Caricature 3D — Élégant",
    shortLabel: "3D élégant",
    description: "Rendu 3D plus premium, lumineux et propre, moins clownesque.",
    icon: "💎",
    accent: "#F472B6",
    preview: "3D premium • éclairage studio • visage propre",
  },
];

function getAvatarStyleOption(style: StyleId): AvatarStyleOption {
  return (
    AVATAR_STYLE_OPTIONS.find((x) => x.id === style) || AVATAR_STYLE_OPTIONS[0]
  );
}

function getLocalFallbackSettings(style: StyleId) {
  switch (style) {
    case "simple_elegant":
      return {
        levels: 7,
        edgeThreshold: 28,
        contrast: 1.12,
        saturation: 1.12,
        rays: 8,
        quality: 0.78,
      };
    case "simple_fun":
      return {
        levels: 6,
        edgeThreshold: 23,
        contrast: 1.28,
        saturation: 1.42,
        rays: 12,
        quality: 0.76,
      };
    case "exaggerated_realistic":
      return {
        levels: 6,
        edgeThreshold: 18,
        contrast: 1.36,
        saturation: 1.38,
        rays: 14,
        quality: 0.77,
      };
    case "three_d_fun":
      return {
        levels: 5,
        edgeThreshold: 16,
        contrast: 1.52,
        saturation: 1.68,
        rays: 18,
        quality: 0.76,
      };
    case "three_d_elegant":
      return {
        levels: 6,
        edgeThreshold: 20,
        contrast: 1.24,
        saturation: 1.26,
        rays: 10,
        quality: 0.79,
      };
    case "exaggerated_fun":
    default:
      return {
        levels: 5,
        edgeThreshold: 14,
        contrast: 1.58,
        saturation: 1.72,
        rays: 18,
        quality: 0.74,
      };
  }
}

function AvatarStylePreview({
  option,
  selected,
}: {
  option: AvatarStyleOption;
  selected: boolean;
}) {
  const faceScale = option.id.includes("exaggerated")
    ? 1.13
    : option.id.includes("three_d")
      ? 1.08
      : 1;
  const eyeSize =
    option.id === "exaggerated_fun"
      ? 8
      : option.id.includes("exaggerated")
        ? 7
        : 5;
  const smile = option.id.includes("fun")
    ? "M31 43 Q42 58 53 43"
    : "M32 45 Q42 52 52 45";
  return (
    <div
      style={{
        width: 58,
        height: 58,
        borderRadius: 16,
        padding: 4,
        background: `radial-gradient(circle at 28% 20%, #fff, ${option.accent} 40%, #111827 78%)`,
        boxShadow: selected
          ? `0 0 18px ${option.accent}88`
          : "0 10px 20px rgba(0,0,0,.28)",
        flex: "0 0 auto",
      }}
    >
      <svg
        viewBox="0 0 84 84"
        width="100%"
        height="100%"
        style={{
          display: "block",
          filter: option.id.includes("three_d")
            ? "drop-shadow(0 7px 7px rgba(0,0,0,.38))"
            : "none",
        }}
      >
        <circle cx="42" cy="42" r="39" fill="#080812" opacity="0.88" />
        <circle
          cx="42"
          cy="42"
          r="34"
          fill={option.id.includes("three_d") ? "url(#skin3d)" : "#F7B36D"}
          transform={`scale(${faceScale}) translate(${(1 - faceScale) * 42} ${(1 - faceScale) * 42})`}
        />
        <defs>
          <radialGradient id="skin3d" cx="32%" cy="24%" r="70%">
            <stop offset="0" stopColor="#FFE0B2" />
            <stop offset="0.58" stopColor="#F59E62" />
            <stop offset="1" stopColor="#9A4A25" />
          </radialGradient>
        </defs>
        <path
          d="M20 30 Q42 9 64 30"
          fill="none"
          stroke="#2A1208"
          strokeWidth="7"
          strokeLinecap="round"
        />
        <circle
          cx="31"
          cy="37"
          r={eyeSize}
          fill="#fff"
          stroke="#111"
          strokeWidth="2"
        />
        <circle
          cx="53"
          cy="37"
          r={eyeSize}
          fill="#fff"
          stroke="#111"
          strokeWidth="2"
        />
        <circle cx="33" cy="38" r="2.6" fill="#111" />
        <circle cx="51" cy="38" r="2.6" fill="#111" />
        <path
          d="M42 39 Q37 47 45 48"
          fill="none"
          stroke="#5B240F"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <path
          d={smile}
          fill="none"
          stroke="#51180B"
          strokeWidth={option.id.includes("fun") ? 5 : 3.5}
          strokeLinecap="round"
        />
        {option.id.includes("elegant") ? (
          <path
            d="M24 63 Q42 72 60 63"
            fill="none"
            stroke="rgba(255,255,255,.5)"
            strokeWidth="2"
          />
        ) : null}
      </svg>
    </div>
  );
}

type MedallionColor = (typeof MEDALLION_COLORS)[number];

type GalleryAvatar = {
  id: string;
  name: string;
  dataUrl: string;
  createdAt: string;
  source: "ia" | "manual";
  style?: StyleId | string;
  medallionColor?: string;
  updatedAt?: string;
};

function readGallery(): GalleryAvatar[] {
  try {
    const raw = localStorage.getItem(GALLERY_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed)
      ? parsed.filter((x) => x && typeof x.dataUrl === "string").slice(0, 48)
      : [];
  } catch {
    return [];
  }
}

function writeGallery(items: GalleryAvatar[]): GalleryAvatar[] {
  const safe = items
    .filter((x) => x && typeof x.dataUrl === "string")
    .slice(0, 48);
  try {
    localStorage.setItem(GALLERY_STORAGE_KEY, JSON.stringify(safe));
  } catch {}
  return safe;
}

function normalizeGalleryItems(raw: any): GalleryAvatar[] {
  const source = Array.isArray(raw) ? raw : Array.isArray(raw?.items) ? raw.items : [];
  return source
    .map((x: any) => ({
      id: String(x?.id || x?.galleryId || `av_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
      name: String(x?.name || "PLAYER"),
      dataUrl: String(x?.dataUrl || x?.data_url || x?.src || ""),
      createdAt: String(x?.createdAt || x?.created_at || new Date().toISOString()),
      updatedAt: String(x?.updatedAt || x?.updated_at || x?.createdAt || x?.created_at || new Date().toISOString()),
      source: x?.source === "manual" ? "manual" : "ia",
      style: x?.style || undefined,
      medallionColor: x?.medallionColor || x?.medallion_color || undefined,
    }))
    .filter((x: GalleryAvatar) => x.dataUrl.startsWith("data:image/"))
    .slice(0, 48);
}

function mergeGalleryItems(a: GalleryAvatar[], b: GalleryAvatar[]): GalleryAvatar[] {
  const out: GalleryAvatar[] = [];
  const seen = new Set<string>();
  for (const item of [...a, ...b]) {
    const key = item.id || item.dataUrl;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out
    .sort((x, y) => Date.parse(y.createdAt || "") - Date.parse(x.createdAt || ""))
    .slice(0, 48);
}

type AssignableProfile = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  avatarUrl?: string | null;
};

function readLocalJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function readNasAccessToken(): string {
  try {
    const direct = String(
      localStorage.getItem("dc_nas_access_token_v1") || "",
    ).trim();
    if (direct) return direct;
    const session = readLocalJson<any>("dc_online_auth_supabase_v1", null);
    return String(
      session?.token ||
        session?.accessToken ||
        session?.access_token ||
        session?.session?.token ||
        session?.session?.accessToken ||
        session?.session?.access_token ||
        "",
    ).trim();
  } catch {
    return "";
  }
}

function normalizeCreditPayload(
  raw: any,
  fallback?: AvatarCreditState,
): AvatarCreditState {
  return {
    freeUsed: Boolean(raw?.freeUsed ?? fallback?.freeUsed ?? false),
    credits: Math.max(
      0,
      Math.floor(Number(raw?.credits ?? fallback?.credits ?? 0)),
    ),
    updatedAt:
      typeof raw?.updatedAt === "string"
        ? raw.updatedAt
        : new Date().toISOString(),
  };
}

function getAvatarAccountKey(): string {
  try {
    const session = readLocalJson<any>("dc_online_auth_supabase_v1", null);
    const userId = String(
      session?.userId || session?.user?.id || session?.session?.user?.id || "",
    ).trim();
    if (userId) return `user_${userId}`;
  } catch {}
  try {
    const raw =
      localStorage.getItem("dc_store_v1") ||
      localStorage.getItem("darts-counter-store") ||
      "";
    const store = raw ? JSON.parse(raw) : null;
    const active = String(
      store?.activeProfileId || store?.profileId || "",
    ).trim();
    if (active) return `profile_${active}`;
  } catch {}
  return "local_device";
}

function scopedCreditStorageKey(): string {
  return `${CREDIT_STORAGE_KEY}:${getAvatarAccountKey()}`;
}

function readProcessedCheckoutIds(): string[] {
  return readLocalJson<string[]>(
    `${CREDIT_STORAGE_KEY}:processed_sessions`,
    [],
  );
}

function markCheckoutProcessed(sessionId: string) {
  const ids = readProcessedCheckoutIds();
  if (!ids.includes(sessionId)) {
    localStorage.setItem(
      `${CREDIT_STORAGE_KEY}:processed_sessions`,
      JSON.stringify([sessionId, ...ids].slice(0, 80)),
    );
  }
}

function isCheckoutProcessed(sessionId: string): boolean {
  return readProcessedCheckoutIds().includes(sessionId);
}

function readCreditState(): AvatarCreditState {
  // Cache d'affichage uniquement : le NAS reste l'unique source de vérité.
  try {
    const raw = localStorage.getItem(scopedCreditStorageKey());
    if (!raw)
      return {
        freeUsed: true,
        credits: 0,
        updatedAt: new Date().toISOString(),
      };
    return normalizeCreditPayload(JSON.parse(raw), {
      freeUsed: true,
      credits: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch {
    return { freeUsed: true, credits: 0, updatedAt: new Date().toISOString() };
  }
}

function writeCreditState(next: AvatarCreditState): AvatarCreditState {
  const safe = normalizeCreditPayload(next, {
    freeUsed: true,
    credits: 0,
    updatedAt: new Date().toISOString(),
  });
  try {
    localStorage.setItem(scopedCreditStorageKey(), JSON.stringify(safe));
  } catch {}
  return safe;
}

function creditLabel(state: AvatarCreditState): string {
  const paid = Math.max(0, Math.floor(Number(state.credits || 0)));
  if (paid > 0)
    return `${paid} crédit${paid > 1 ? "s" : ""} avatar IA disponible${paid > 1 ? "s" : ""}`;
  if (!state.freeUsed) return "1 avatar IA gratuit disponible";
  return "Aucun crédit avatar IA disponible";
}

function creditBadgeLabel(state: AvatarCreditState): string {
  const paid = Math.max(0, Math.floor(Number(state.credits || 0)));
  if (paid > 0) return `${paid} CRÉDIT${paid > 1 ? "S" : ""}`;
  if (!state.freeUsed) return "1 GRATUIT";
  return "0 CRÉDIT";
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

function fileToRawDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("read_failed"));
    reader.readAsDataURL(file);
  });
}

async function fileToMedallionPreviewDataUrl(file: File): Promise<string> {
  try {
    return await fileToSafeAvatarDataUrl(file);
  } catch {}

  const raw = await fileToRawDataUrl(file);
  const img = await dataUrlToImage(raw);
  const sourceW = img.naturalWidth || img.width || 1;
  const sourceH = img.naturalHeight || img.height || 1;
  const attempts = [
    { maxSide: 480, quality: 0.74 },
    { maxSide: 420, quality: 0.7 },
    { maxSide: 360, quality: 0.66 },
    { maxSide: 320, quality: 0.62 },
    { maxSide: 256, quality: 0.58 },
  ];

  let fallbackDataUrl = "";
  for (const attempt of attempts) {
    const scale = Math.min(1, attempt.maxSide / Math.max(sourceW, sourceH));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(sourceW * scale));
    canvas.height = Math.max(1, Math.round(sourceH * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) continue;
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/webp", attempt.quality);
    if (dataUrl.startsWith("data:image/")) {
      fallbackDataUrl = dataUrl;
      if (dataUrl.length <= 380_000) return dataUrl;
    }
  }

  // Dernier filet de sécurité : même si la prévisualisation est un peu plus lourde,
  // on l'affiche quand même dans le médaillon. L'export final reste compressé en WebP 256.
  if (fallbackDataUrl) return fallbackDataUrl;
  throw new Error("avatar_import_too_large");
}

function dataUrlSizeKb(dataUrl: string | null): string {
  if (!dataUrl) return "—";
  const comma = dataUrl.indexOf(",");
  const payload = comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
  return `${Math.max(1, Math.round((payload.length * 3) / 4 / 1024))} Ko`;
}

async function fitDataUrlToWebp(
  dataUrl: string,
  side = 512,
  quality = 0.82,
): Promise<string> {
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

async function localPosterFallback(
  dataUrl: string,
  style: StyleId,
): Promise<string> {
  // Ce fallback ne prétend pas remplacer une vraie IA : il sert seulement à garder
  // une app utilisable dans StackBlitz quand aucun secret/API n'est configuré.
  const img = await dataUrlToImage(dataUrl);
  const side = 512;
  const canvas = document.createElement("canvas");
  canvas.width = side;
  canvas.height = side;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");

  const bg = ctx.createRadialGradient(
    side / 2,
    side / 2,
    20,
    side / 2,
    side / 2,
    side * 0.68,
  );
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
  const fallbackSettings = getLocalFallbackSettings(style);
  const levels = fallbackSettings.levels;
  const edgeThreshold = fallbackSettings.edgeThreshold;
  const contrast = fallbackSettings.contrast;
  const saturation = fallbackSettings.saturation;

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
        const lum =
          0.299 * original[i] +
          0.587 * original[i + 1] +
          0.114 * original[i + 2];
        const lumR =
          0.299 * original[ir] +
          0.587 * original[ir + 1] +
          0.114 * original[ir + 2];
        const lumD =
          0.299 * original[id] +
          0.587 * original[id + 1] +
          0.114 * original[id + 2];
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
  for (let i = 0; i < fallbackSettings.rays; i += 1) {
    const a = (Math.PI * 2 * i) / fallbackSettings.rays;
    ctx.beginPath();
    ctx.moveTo(side / 2 + Math.cos(a) * 70, side / 2 + Math.sin(a) * 70);
    ctx.lineTo(side / 2 + Math.cos(a) * 360, side / 2 + Math.sin(a) * 360);
    ctx.stroke();
  }
  ctx.globalCompositeOperation = "source-over";

  const shine = ctx.createRadialGradient(
    side * 0.36,
    side * 0.18,
    20,
    side / 2,
    side / 2,
    side * 0.8,
  );
  shine.addColorStop(0, "rgba(255,255,255,0.20)");
  shine.addColorStop(0.46, "rgba(255,255,255,0.02)");
  shine.addColorStop(1, "rgba(0,0,0,0.38)");
  ctx.fillStyle = shine;
  ctx.fillRect(0, 0, side, side);

  return canvasToWebp(canvas, fallbackSettings.quality);
}

async function callAvatarAi(
  file: File,
  style: StyleId,
): Promise<AiPayload | null> {
  const form = new FormData();
  form.append("image", file);
  form.append("style", style);
  const token = readNasAccessToken();
  const response = await fetch("/api/avatar/cartoon", {
    method: "POST",
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: form,
  });
  const json = (await response.json().catch(() => null)) as any;
  if (!response.ok) {
    const message =
      json?.message || json?.error || `avatar_api_${response.status}`;
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
  const raw =
    json?.cartoonWebp ||
    json?.cartoonPng ||
    json?.image ||
    json?.dataUrl ||
    null;
  if (typeof raw !== "string") return null;
  if (raw.startsWith("data:image/"))
    return {
      dataUrl: raw,
      provider: json?.provider,
      avatarCredits: json?.avatarCredits,
    };
  if (/^https?:\/\//i.test(raw))
    return {
      dataUrl: raw,
      provider: json?.provider,
      avatarCredits: json?.avatarCredits,
    };
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
  const [originalPreviewUrl, setOriginalPreviewUrl] = React.useState<
    string | null
  >(null);
  const [style, setStyle] = React.useState<StyleId>("exaggerated_fun");
  const [zoom, setZoom] = React.useState(1.18);
  const [offsetX, setOffsetX] = React.useState(0);
  const [offsetY, setOffsetY] = React.useState(0);
  const [status, setStatus] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [lastExport, setLastExport] = React.useState<string | null>(null);
  const [debugText, setDebugText] = React.useState<string | null>(null);
  const [creditState, setCreditState] = React.useState<AvatarCreditState>(() =>
    readCreditState(),
  );
  const [activeTab, setActiveTab] = React.useState<TabId>("ia");
  const [miniInfo, setMiniInfo] = React.useState<{
    title: string;
    content: string;
  } | null>(null);
  const [gallery, setGallery] = React.useState<GalleryAvatar[]>(() =>
    readGallery(),
  );
  const [assignTarget, setAssignTarget] = React.useState<GalleryAvatar | null>(
    null,
  );
  const [selectedGalleryItem, setSelectedGalleryItem] =
    React.useState<GalleryAvatar | null>(null);
  const [profiles, setProfiles] = React.useState<AssignableProfile[]>([]);
  const [medallionColorId, setMedallionColorId] =
    React.useState<string>("gold");

  const svgRef = React.useRef<SVGSVGElement | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cropPointersRef = React.useRef(
    new Map<number, { x: number; y: number }>(),
  );
  const cropGestureRef = React.useRef({
    moved: false,
    lastX: 0,
    lastY: 0,
    pinchDistance: 0,
    zoomStart: 1,
  });
  const avatarImage = photoUrl;

  const primary = theme.primary ?? GOLD;
  const selectedMedallion =
    MEDALLION_COLORS.find((c) => c.id === medallionColorId) ||
    MEDALLION_COLORS[0];
  const RING_COLOR = isBotMode ? BOT_RING : selectedMedallion.main;
  const RING_LIGHT = isBotMode ? "#DDF7FF" : selectedMedallion.light;
  const RING_DARK = isBotMode ? "#0369A1" : selectedMedallion.dark;
  const avatarImgSize = R_AVATAR * 2 * zoom;
  const displayName = (name || "PLAYER").trim().toUpperCase();
  const hasAiCredit = !creditState.freeUsed || creditState.credits > 0;
  const remainingPaidCredits = creditState.credits;
  const tabs: Array<{
    id: TabId;
    label: string;
    icon: string;
    hidden?: boolean;
  }> = [
    { id: "ia", label: "IA", icon: "✨" },
    { id: "gallery", label: "Galerie", icon: "🖼️" },
    { id: "debug", label: "Debug", icon: "🧪", hidden: !devMode.enabled },
  ];

  React.useEffect(() => {
    if (activeTab === "debug" && !devMode.enabled) setActiveTab("ia");
  }, [activeTab, devMode.enabled]);

  const refreshAvatarCredits = React.useCallback(async () => {
    try {
      if (!readNasAccessToken()) {
        setCreditState(
          writeCreditState({
            freeUsed: true,
            credits: 0,
            updatedAt: new Date().toISOString(),
          }),
        );
        return;
      }
      const json = (await apiGet("/avatar-ai/account")) as any;
      const next = normalizeCreditPayload(json, readCreditState());
      setCreditState(writeCreditState(next));
    } catch (err) {
      console.warn("[AvatarCreator] crédits IA NAS indisponibles", err);
      setCreditState(
        writeCreditState({
          freeUsed: true,
          credits: 0,
          updatedAt: new Date().toISOString(),
        }),
      );
    }
  }, []);

  React.useEffect(() => {
    refreshAvatarCredits();
    const handler = () => refreshAvatarCredits();
    window.addEventListener("dc-auth-changed", handler);
    window.addEventListener("storage", handler);
    window.addEventListener("focus", handler);
    return () => {
      window.removeEventListener("dc-auth-changed", handler);
      window.removeEventListener("storage", handler);
      window.removeEventListener("focus", handler);
    };
  }, [refreshAvatarCredits]);

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
        const json = (await apiGet(
          `/avatar-ai/checkout/verify?session_id=${encodeURIComponent(sessionId)}`,
        )) as any;
        if (!json?.paid)
          throw new Error(json?.message || json?.error || "verify_failed");
        if (cancelled) return;
        const nextCredits = writeCreditState(
          normalizeCreditPayload(json, creditState),
        );
        setCreditState(nextCredits);
        markCheckoutProcessed(sessionId);
        setStatus(
          json.credited
            ? `Paiement validé : +${json.addedCredits} crédits avatars IA ajoutés au compte. ${creditLabel(nextCredits)}.`
            : `Paiement déjà validé : crédits IA déjà ajoutés à ce compte. ${creditLabel(nextCredits)}.`,
        );
        refreshAvatarCredits();
        window.history.replaceState(
          null,
          "",
          window.location.href
            .replace(/[?&]avatarCheckout=success/, "")
            .replace(/[?&]session_id=[^&#]+/, ""),
        );
      } catch (err: any) {
        if (!cancelled)
          setError(
            `Impossible de valider le paiement Stripe : ${String(err?.message || err || "erreur")}`,
          );
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
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
      const botsRaw = loadBots();
      const botItems = Array.isArray(botsRaw)
        ? botsRaw
            .map((b: any) => ({
              id: `bot:${String(b?.id || "")}`,
              name: `Bot CPU — ${String(b?.name || "Bot")}`,
              avatarDataUrl: b?.avatarDataUrl,
              avatarUrl: b?.avatarUrl || b?.avatar,
            }))
            .filter((b: any) => b.id !== "bot:")
        : [];
      setProfiles([...profileItems, ...botItems]);
    })();
    return () => {
      alive = false;
    };
  }, [activeTab, assignTarget]);

  const refreshAvatarGallery = React.useCallback(async () => {
    const localItems = readGallery();
    if (!readNasAccessToken()) {
      setGallery(localItems);
      return;
    }
    try {
      const json = (await apiGet("/avatar-ai/gallery")) as any;
      const remoteItems = normalizeGalleryItems(json);
      const merged = mergeGalleryItems(remoteItems, localItems);
      setGallery(writeGallery(merged));

      // Migration douce : si l'appareil avait déjà des avatars locaux, on les remonte au NAS.
      const remoteKeys = new Set(remoteItems.map((x) => x.id || x.dataUrl));
      const missingLocal = localItems.filter((x) => !remoteKeys.has(x.id || x.dataUrl));
      for (const item of missingLocal.slice(0, 12)) {
        try {
          await apiPost("/avatar-ai/gallery", item);
        } catch {}
      }
    } catch (err) {
      console.warn("[AvatarCreator] galerie IA NAS indisponible", err);
      setGallery(localItems);
    }
  }, []);

  React.useEffect(() => {
    refreshAvatarGallery();
    const handler = () => refreshAvatarGallery();
    window.addEventListener("dc-auth-changed", handler);
    window.addEventListener("focus", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("dc-auth-changed", handler);
      window.removeEventListener("focus", handler);
      window.removeEventListener("storage", handler);
    };
  }, [refreshAvatarGallery]);

  function persistGallery(next: GalleryAvatar[]) {
    const saved = writeGallery(next);
    setGallery(saved);
    return saved;
  }

  function addToGallery(dataUrl: string, source: "ia" | "manual" = "ia") {
    if (!dataUrl) return;
    const now = new Date().toISOString();
    const item: GalleryAvatar = {
      id: `av_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: displayName || "PLAYER",
      dataUrl,
      createdAt: now,
      updatedAt: now,
      source,
      style,
      medallionColor: selectedMedallion.id,
    };
    persistGallery([item, ...gallery.filter((x) => x.dataUrl !== dataUrl)]);

    // Sauvegarde locale + sauvegarde NAS par compte utilisateur :
    // la galerie revient donc après reconnexion et sur un autre appareil.
    if (readNasAccessToken()) {
      apiPost("/avatar-ai/gallery", item)
        .then((json: any) => {
          const saved = normalizeGalleryItems([json?.item || json])[0];
          if (saved) {
            const next = mergeGalleryItems([saved], readGallery());
            setGallery(writeGallery(next));
          }
        })
        .catch((err) => {
          console.warn("[AvatarCreator] sauvegarde galerie NAS impossible", err);
          setStatus(
            "Avatar ajouté en galerie locale. La sauvegarde NAS sera retentée à la prochaine ouverture.",
          );
        });
    }

    try {
      const accountId = getAvatarAccountKey();
      window.setTimeout(() => {
        try {
          upsertAvatarGalleryItem(accountId, {
            category: "ia",
            ownerId: item.id,
            ownerName: item.name,
            name: item.name,
            src: dataUrl,
            createdAt: Date.parse(item.createdAt) || Date.now(),
            updatedAt: Date.now(),
            source: `avatar_ia_${source}`,
          });
        } catch {}
      }, 0);
    } catch {}
  }

  async function checkAvatarCreditBeforeGeneration() {
    if (!readNasAccessToken()) {
      throw new Error(
        "Connecte-toi au compte utilisateur avant de générer un avatar IA.",
      );
    }
    const json = (await apiPost("/avatar-ai/check", { style })) as any;
    const next = normalizeCreditPayload(json, creditState);
    setCreditState(writeCreditState(next));
    if (json?.ok === false || json?.canGenerate === false) {
      throw new Error(json?.message || "Crédit avatar IA requis.");
    }
    return next;
  }

  async function consumeAvatarCreditAfterSuccess() {
    if (!readNasAccessToken()) {
      throw new Error(
        "Compte utilisateur introuvable : impossible de débiter le crédit IA.",
      );
    }
    const json = (await apiPost("/avatar-ai/consume", {
      provider: "openai",
      model: "gpt-image-1",
      style,
    })) as any;
    const next = normalizeCreditPayload(json, creditState);
    setCreditState(writeCreditState(next));
    return next;
  }

  async function handleBuyPack(pack: CreditPack) {
    setError(null);
    setStatus(null);
    try {
      setBusy(true);
      if (!readNasAccessToken())
        throw new Error(
          "Connecte-toi au compte utilisateur avant d’acheter des crédits IA.",
        );
      const json = (await apiPost("/avatar-ai/checkout", {
        packId: pack.id,
        accountKey: getAvatarAccountKey(),
        successUrl: `${window.location.origin}${window.location.pathname}${window.location.hash || "#/avatar_creator"}?avatarCheckout=success&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: window.location.href,
      })) as any;
      if (!json?.url)
        throw new Error(json?.message || json?.error || "checkout_url_missing");
      window.location.href = json.url;
    } catch (err: any) {
      console.warn("[AvatarCreator] Stripe checkout failed", err);
      setError(
        `Paiement non disponible : ${String(err?.message || err || "erreur")}. Vérifie STRIPE_SECRET_KEY côté NAS.`,
      );
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
    const maxMb = 12;
    if (f.size > maxMb * 1024 * 1024) {
      setError(
        t("avatar.error.tooBig", `L’image est trop lourde (max ${maxMb} Mo).`),
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }
    setError(null);
    setBusy(true);
    setLastExport(null);
    setDebugText(null);
    setOriginalFile(f);
    (async () => {
      try {
        const safe = await fileToMedallionPreviewDataUrl(f);
        setOriginalPreviewUrl(safe);
        setPhotoUrl(safe);
        setZoom(1.12);
        setOffsetX(0);
        setOffsetY(0);
        setStatus(
          "Photo importée dans le médaillon. Recadre-la directement au doigt ou à la souris, puis lance la caricature IA.",
        );
      } catch (err) {
        console.warn("[AvatarCreator] import photo failed", err);
        setOriginalFile(null);
        setOriginalPreviewUrl(null);
        setPhotoUrl(null);
        setError(
          "Impossible d’importer cette photo. Essaie une image JPG/PNG/WebP moins lourde ou moins grande.",
        );
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
        setDebugText(
          `DEBUG API: endpoint inaccessible (${response.status}). Regarde la console.`,
        );
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
      setDebugText(
        "DEBUG API: impossible d'appeler /api/avatar/debug. Vérifie le déploiement des Functions.",
      );
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
      setError(
        "Tu as utilisé ton avatar IA gratuit. Achète un pack de crédits pour relancer une génération IA.",
      );
      return;
    }
    setBusy(true);
    setError(null);
    setLastExport(null);
    setStatus("Vérification des crédits avatar IA…");
    try {
      await checkAvatarCreditBeforeGeneration();
      setStatus("Génération de la vraie caricature IA en cours…");
      let generated: AiPayload | null = null;
      try {
        generated = await callAvatarAi(originalFile, style);
      } catch (apiErr: any) {
        console.warn(
          "[AvatarCreator] API IA indisponible",
          apiErr,
          apiErr?.details,
        );
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
        const nextCredits = generated.avatarCredits?.ok
          ? normalizeCreditPayload(generated.avatarCredits, creditState)
          : await consumeAvatarCreditAfterSuccess();
        setCreditState(writeCreditState(nextCredits));
        setStatus(
          `Vraie caricature IA générée. Crédit débité côté compte utilisateur. ${creditLabel(nextCredits)}.`,
        );
        refreshAvatarCredits();
      } else {
        const fallback = await localPosterFallback(originalPreviewUrl, style);
        setPhotoUrl(fallback);
        setZoom(1.18);
        setOffsetX(0);
        setOffsetY(0);
        setStatus(
          "Aucune vraie IA disponible : fallback local appliqué. Configure OPENAI_API_KEY pour le rendu caricature premium.",
        );
      }
    } catch (e) {
      console.warn(e);
      setError(
        t(
          "avatar.error.generateFailed",
          "Impossible de générer la caricature pour le moment.",
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  async function renderMedallionWebp(
    outputSize = EXPORT_SIZE,
  ): Promise<string> {
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
      const safeDataUrl =
        (await enforceSafeAvatarDataUrl(webpDataUrl)) || webpDataUrl;
      setLastExport(safeDataUrl);
      addToGallery(safeDataUrl, source);
      if (onSave) {
        onSave({ pngDataUrl: safeDataUrl, name: name || "PLAYER" });
        setStatus(
          "Avatar WebP enregistré sur le profil et ajouté à la galerie.",
        );
      } else {
        setStatus(
          readNasAccessToken()
            ? "Avatar WebP ajouté à la galerie du compte. Il sera récupéré aux prochaines connexions et sur les autres appareils."
            : "Avatar WebP ajouté à la galerie locale. Connecte-toi pour le synchroniser sur le NAS.",
        );
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
        const bots = loadBots();
        const nowTs = Date.now();
        const nextBots = Array.isArray(bots)
          ? bots.map((b: any) =>
              String(b?.id || "") === botId
                ? {
                    ...b,
                    avatarDataUrl: item.dataUrl,
                    avatarUrl: null,
                    avatar: null,
                    avatarUpdatedAt: nowTs,
                    updatedAt: new Date(nowTs).toISOString(),
                  }
                : b,
            )
          : [];
        saveBots(nextBots);
        const target = nextBots.find((b: any) => String(b?.id || "") === botId);
        try {
          upsertAvatarGalleryItem(getAvatarAccountKey(), {
            category: "bot",
            ownerId: botId,
            ownerName: String(target?.name || "Bot CPU"),
            name: String(target?.name || "Bot CPU"),
            src: item.dataUrl,
            createdAt: nowTs,
            updatedAt: nowTs,
            source: "avatar_ia_assign_bot",
          });
        } catch {}
        setStatus(`Avatar attribué au bot ${target?.name || "CPU"}.`);
        setAssignTarget(null);
        return;
      }

      const cleanProfileId = profileId.startsWith("profile:")
        ? profileId.slice(8)
        : profileId;
      const store: any = await loadStore<any>();
      if (!store || !Array.isArray(store.profiles))
        throw new Error("store_profiles_missing");
      const nowTs = Date.now();
      const nextProfiles = store.profiles.map((p: any) =>
        String(p?.id || "") === String(cleanProfileId)
          ? {
              ...p,
              avatarDataUrl: item.dataUrl,
              avatarUrl: undefined,
              avatarPath: undefined,
              avatarAssetId: null,
              avatarThumbAssetId: null,
              avatarFullAssetId: null,
              avatarCastAssetId: null,
              avatarUpdatedAt: nowTs,
            }
          : p,
      );
      await saveStore({ ...store, profiles: nextProfiles });
      try {
        window.dispatchEvent(new Event("dc:profiles-changed"));
      } catch {}
      const target = nextProfiles.find(
        (p: any) => String(p?.id || "") === String(cleanProfileId),
      );
      try {
        upsertAvatarGalleryItem(getAvatarAccountKey(), {
          category:
            String(cleanProfileId) === String(store?.activeProfileId || "")
              ? "account"
              : "local",
          ownerId: cleanProfileId,
          ownerName: String(target?.name || target?.displayName || "Profil"),
          name:
            String(cleanProfileId) === String(store?.activeProfileId || "")
              ? `Profil actif · ${String(target?.name || target?.displayName || "Profil")}`
              : String(target?.name || target?.displayName || "Profil"),
          src: item.dataUrl,
          createdAt: nowTs,
          updatedAt: nowTs,
          source: "avatar_ia_assign_profile",
        });
      } catch {}
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
      <p style={{ marginTop: 0 }}>
        <strong>AVATAR IA</strong> : importe une photo dans le médaillon,
        recadre-la, génère une caricature cartoon, puis enregistre le WebP
        final.
      </p>
      <p>
        Le premier avatar IA est offert. Ensuite, chaque génération réussie
        consomme 1 crédit.
      </p>
      <p style={{ marginBottom: 0 }}>
        Le diagnostic API est masqué et visible uniquement en mode développeur.
      </p>
    </div>
  );

  const creditCompact = (
    <div style={{ display: "grid", gap: 8 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div
            style={{
              fontWeight: 950,
              fontSize: 12,
              textTransform: "uppercase",
              color: "#d9f99d",
            }}
          >
            Crédits IA
          </div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>
            {creditLabel(creditState)}
          </div>
        </div>
        <div
          style={{
            minWidth: 56,
            textAlign: "center",
            borderRadius: 999,
            padding: "7px 10px",
            background: hasAiCredit
              ? "rgba(34,197,94,.22)"
              : "rgba(255,93,93,.18)",
            border: "1px solid rgba(255,255,255,.14)",
            fontWeight: 950,
          }}
        >
          {creditBadgeLabel(creditState)}
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 6,
        }}
      >
        {CREDIT_PACKS.map((pack) => (
          <button
            key={pack.id}
            type="button"
            onClick={() => handleBuyPack(pack)}
            style={{
              border: "1px solid rgba(246,194,86,.22)",
              background: "rgba(0,0,0,.25)",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 6px",
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            <strong style={{ display: "block", fontSize: 11 }}>
              {pack.credits}
            </strong>
            <span style={{ color: GOLD_2, fontWeight: 950, fontSize: 11 }}>
              {pack.price}
            </span>
          </button>
        ))}
      </div>
    </div>
  );

  const StatusCard = () => {
    if (!status && !error && !lastExport && !debugText) return null;
    return (
      <div
        style={{
          ...cardBase,
          padding: 12,
          display: "flex",
          gap: 10,
          alignItems: "center",
          background: error
            ? "linear-gradient(145deg, rgba(70,18,18,.96), rgba(14,10,10,.96))"
            : "linear-gradient(145deg, rgba(8,45,31,.95), rgba(5,12,10,.98))",
        }}
      >
        <div
          style={{
            width: 30,
            height: 30,
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
        <div style={{ fontSize: 12.5, lineHeight: 1.35 }}>
          <div style={{ fontWeight: 850 }}>
            {error ? error : debugText || status || "Avatar prêt !"}
          </div>
          {!error && (
            <div style={{ opacity: 0.78, marginTop: 2 }}>
              WebP • {EXPORT_SIZE}x{EXPORT_SIZE} •{" "}
              {dataUrlSizeKb(lastExport || photoUrl)}
            </div>
          )}
        </div>
      </div>
    );
  };

  const TabButton = ({
    id,
    label,
    icon,
  }: {
    id: TabId;
    label: string;
    icon: string;
  }) => {
    const selected = activeTab === id;
    return (
      <button
        type="button"
        onClick={() => setActiveTab(id)}
        style={{
          flex: 1,
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
        }}
      >
        <span style={{ marginRight: 5 }}>{icon}</span>
        {label}
      </button>
    );
  };

  function clampCropOffset(value: number): number {
    return Math.max(-150, Math.min(150, Math.round(value)));
  }

  function distanceBetween(
    a: { x: number; y: number },
    b: { x: number; y: number },
  ): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function handleCropPointerDown(e: React.PointerEvent<HTMLButtonElement>) {
    if (!avatarImage) return;
    e.currentTarget.setPointerCapture?.(e.pointerId);
    cropPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    cropGestureRef.current.moved = false;
    cropGestureRef.current.lastX = e.clientX;
    cropGestureRef.current.lastY = e.clientY;
    if (cropPointersRef.current.size === 2) {
      const pts = Array.from(cropPointersRef.current.values());
      cropGestureRef.current.pinchDistance = distanceBetween(pts[0], pts[1]);
      cropGestureRef.current.zoomStart = zoom;
    }
  }

  function handleCropPointerMove(e: React.PointerEvent<HTMLButtonElement>) {
    if (!avatarImage || !cropPointersRef.current.has(e.pointerId)) return;
    const prev = cropPointersRef.current.get(e.pointerId);
    cropPointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const points = Array.from(cropPointersRef.current.values());
    if (points.length >= 2) {
      const dist = distanceBetween(points[0], points[1]);
      const base = cropGestureRef.current.pinchDistance || dist;
      const nextZoom = Math.max(
        0.86,
        Math.min(
          2.55,
          cropGestureRef.current.zoomStart * (dist / Math.max(1, base)),
        ),
      );
      if (Math.abs(nextZoom - zoom) > 0.01) cropGestureRef.current.moved = true;
      setZoom(nextZoom);
      return;
    }
    if (!prev) return;
    const dx = e.clientX - prev.x;
    const dy = e.clientY - prev.y;
    if (Math.abs(dx) + Math.abs(dy) > 2) cropGestureRef.current.moved = true;
    setOffsetX((v) => clampCropOffset(v + dx));
    setOffsetY((v) => clampCropOffset(v + dy));
  }

  function handleCropPointerUp(e: React.PointerEvent<HTMLButtonElement>) {
    if (cropPointersRef.current.has(e.pointerId))
      cropPointersRef.current.delete(e.pointerId);
    try {
      e.currentTarget.releasePointerCapture?.(e.pointerId);
    } catch {}
    if (cropPointersRef.current.size < 2)
      cropGestureRef.current.pinchDistance = 0;
  }

  function handleMedallionClick(e: React.MouseEvent<HTMLButtonElement>) {
    if (cropGestureRef.current.moved) {
      e.preventDefault();
      cropGestureRef.current.moved = false;
      return;
    }
    if (!avatarImage) fileInputRef.current?.click();
  }

  function handleCropWheel(e: React.WheelEvent<HTMLButtonElement>) {
    if (!avatarImage) return;
    const delta = e.deltaY > 0 ? -0.08 : 0.08;
    setZoom((v) =>
      Math.max(0.86, Math.min(2.55, Number((v + delta).toFixed(2)))),
    );
  }

  const MedallionButton = ({ compact = false }: { compact?: boolean }) => (
    <button
      type="button"
      onClick={handleMedallionClick}
      onPointerDown={handleCropPointerDown}
      onPointerMove={handleCropPointerMove}
      onPointerUp={handleCropPointerUp}
      onPointerCancel={handleCropPointerUp}
      onWheel={handleCropWheel}
      title={
        avatarImage
          ? "Glisse pour recadrer, pince ou molette pour zoomer"
          : "Importer une photo"
      }
      style={{
        width: "100%",
        touchAction: avatarImage ? "none" : "manipulation",
        aspectRatio: "1 / 1",
        maxHeight: compact ? 330 : 455,
        maxWidth: compact ? 350 : 455,
        margin: "0 auto",
        background:
          "radial-gradient(circle at 50% 42%, rgba(246,194,86,.08), transparent 58%), #030305",
        borderRadius: 24,
        padding: compact ? 16 : 24,
        boxShadow: "0 22px 48px rgba(0,0,0,.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        border: "0",
        cursor: "pointer",
      }}
    >
      <svg ref={svgRef} viewBox="-286 -286 572 572" width="100%" height="100%" style={{ display: "block" }}>
        <defs>
          <clipPath id="avatarClip">
            <circle r={R_AVATAR} cx={0} cy={0} />
          </clipPath>
          <radialGradient id="goldOuter" cx="32%" cy="18%" r="76%">
            <stop offset="0%" stopColor={RING_LIGHT} />
            <stop offset="42%" stopColor={RING_COLOR} />
            <stop offset="100%" stopColor={RING_DARK} />
          </radialGradient>
          <filter id="softShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow
              dx="0"
              dy="10"
              stdDeviation="8"
              floodColor="#000"
              floodOpacity="0.55"
            />
          </filter>
        </defs>
        <circle
          r={R_OUTER + STROKE + 10}
          fill="#050505"
          filter="url(#softShadow)"
        />
        <circle r={R_OUTER + 8} fill="none" stroke="#1b1b1b" strokeWidth={10} />
        <circle
          r={R_OUTER}
          fill="none"
          stroke="url(#goldOuter)"
          strokeWidth={STROKE}
        />
        <circle r={R_OUTER - 19} fill={BLACK} />
        {/* Séparateur noir supprimé : il créait deux demi-traits visibles sur le médaillon. */}
        <circle
          r={R_INNER + 15}
          fill="none"
          stroke="transparent"
          strokeWidth={0}
        />
        <circle
          r={R_INNER}
          fill="none"
          stroke="url(#goldOuter)"
          strokeWidth={STROKE}
        />
        <circle r={R_AVATAR} fill="#22232b" />
        {avatarImage ? (
          <g clipPath="url(#avatarClip)">
            <image
              href={avatarImage}
              x={-avatarImgSize / 2 + offsetX}
              y={-avatarImgSize / 2 + offsetY}
              width={avatarImgSize}
              height={avatarImgSize}
              preserveAspectRatio="xMidYMid slice"
            />
            <circle
              r={R_AVATAR}
              fill="none"
              stroke="rgba(255,255,255,.16)"
              strokeWidth={4}
            />
          </g>
        ) : (
          <g clipPath="url(#avatarClip)">
            <rect
              x={-R_AVATAR}
              y={-R_AVATAR}
              width={R_AVATAR * 2}
              height={R_AVATAR * 2}
              fill="#22232b"
            />
            <text
              x={0}
              y={-12}
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontSize={20}
              fontWeight={900}
              fill="#e5e7eb"
            >
              Clique ici
            </text>
            <text
              x={0}
              y={20}
              textAnchor="middle"
              fontFamily="system-ui, sans-serif"
              fontSize={15}
              fill="#cbd5e1"
            >
              importer une photo
            </text>
          </g>
        )}
        <path
          id="arcTop"
          d={`M ${-R_TEXT} ${TEXT_DY_TOP} A ${R_TEXT} ${R_TEXT} 0 0 1 ${R_TEXT} ${TEXT_DY_TOP}`}
          fill="none"
        />
        <text
          fontFamily="Montserrat, Arial Black, system-ui, sans-serif"
          fontSize={38}
          fontWeight={950}
          letterSpacing={4.2}
          fill={RING_COLOR}
        >
          <textPath href="#arcTop" startOffset="50%" textAnchor="middle">
            MULTISPORTS SCORING
          </textPath>
        </text>
        <path
          id="arcBottom"
          d={`M ${-NAME_RADIUS} ${TEXT_DY_BOTTOM} A ${NAME_RADIUS} ${NAME_RADIUS} 0 0 0 ${NAME_RADIUS} ${TEXT_DY_BOTTOM}`}
          fill="none"
        />
        <text
          fontFamily="Montserrat, Arial Black, system-ui, sans-serif"
          fontSize={displayName.length > 10 ? 34 : 40}
          fontWeight={950}
          letterSpacing={displayName.length > 10 ? 2.4 : 4}
          fill={RING_COLOR}
        >
          <textPath href="#arcBottom" startOffset="50%" textAnchor="middle">
            {displayName}
          </textPath>
        </text>
      </svg>
    </button>
  );

  const ColorPicker = () => (
    <div style={{ display: "grid", gap: 7 }}>
      <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.88 }}>
        Couleur du médaillon
      </div>
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
        {MEDALLION_COLORS.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => setMedallionColorId(c.id)}
            title={c.label}
            style={{
              width: 30,
              height: 30,
              borderRadius: 999,
              border:
                medallionColorId === c.id
                  ? "3px solid #fff"
                  : "1px solid rgba(255,255,255,.25)",
              background: `radial-gradient(circle at 32% 24%, ${c.light}, ${c.main} 52%, ${c.dark})`,
              boxShadow:
                medallionColorId === c.id ? `0 0 18px ${c.main}aa` : "none",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );

  const renderCreditsCard = () => (
    <div
      style={{
        ...cardBase,
        padding: 12,
        background:
          "linear-gradient(145deg, rgba(12,38,32,.96), rgba(7,12,14,.98))",
      }}
    >
      {creditCompact}
    </div>
  );

  const renderControls = () => (
    <div
      style={{
        ...cardBase,
        padding: 12,
        background:
          "linear-gradient(145deg, rgba(18,18,27,.96), rgba(6,7,12,.98))",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <strong
          style={{
            fontSize: 12,
            textTransform: "uppercase",
            color: theme.textSoft,
          }}
        >
          Réglages médaillon
        </strong>
        <button
          type="button"
          onClick={() => {
            setZoom(1.18);
            setOffsetX(0);
            setOffsetY(0);
          }}
          style={{
            border: 0,
            borderRadius: 999,
            padding: "6px 9px",
            background: "rgba(255,255,255,.09)",
            color: "#fff",
            cursor: "pointer",
            fontSize: 11,
            fontWeight: 850,
          }}
        >
          Reset
        </button>
      </div>
      <div
        style={{
          fontSize: 12,
          opacity: 0.78,
          lineHeight: 1.35,
          marginBottom: 10,
        }}
      >
        Recadrage intégré au médaillon : glisse directement l’image. Pinch à 2 doigts ou molette pour zoomer.
      </div>
      <label
        style={{ display: "grid", gap: 6, fontSize: 12, marginBottom: 10 }}
      >
        Nom affiché
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 14))}
          placeholder="Ex : NINJA"
          style={{ minHeight: 42 }}
        />
      </label>
      <ColorPicker />
    </div>
  );

  const renderCaricatureBox = () => {
    if (!originalFile) return null;
    return (
      <div
        style={{
          ...cardBase,
          padding: 12,
          background:
            "linear-gradient(145deg, rgba(37,24,67,.96), rgba(9,9,16,.98))",
        }}
      >
        <div
          style={{
            fontWeight: 1000,
            textTransform: "uppercase",
            marginBottom: 4,
          }}
        >
          Caricature souhaitée
        </div>
        <div style={{ opacity: 0.78, fontSize: 12, marginBottom: 10 }}>
          Choisis le style puis lance la génération.
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
            gap: 8,
            marginBottom: 10,
          }}
        >
          {AVATAR_STYLE_OPTIONS.map((option) => {
            const selected = style === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setStyle(option.id)}
                style={{
                  minHeight: 116,
                  borderRadius: 16,
                  padding: 9,
                  border: selected
                    ? `2px solid ${option.accent}`
                    : "1px solid rgba(255,255,255,.13)",
                  background: selected
                    ? `linear-gradient(145deg, ${option.accent}30, rgba(10,10,16,.98))`
                    : "linear-gradient(145deg, rgba(255,255,255,.07), rgba(7,7,12,.95))",
                  color: "#fff",
                  textAlign: "left",
                  cursor: "pointer",
                  boxShadow: selected ? `0 0 22px ${option.accent}55` : "none",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 8,
                  }}
                >
                  <AvatarStylePreview option={option} selected={selected} />
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 1000,
                        fontSize: 11.5,
                        lineHeight: 1.12,
                      }}
                    >
                      {option.icon} {option.shortLabel}
                    </div>
                    <div
                      style={{
                        marginTop: 4,
                        color: option.accent,
                        fontSize: 10.5,
                        fontWeight: 900,
                        lineHeight: 1.15,
                      }}
                    >
                      Exemple : {option.preview}
                    </div>
                  </div>
                </div>
                <div
                  style={{ opacity: 0.78, fontSize: 10.5, lineHeight: 1.25 }}
                >
                  {option.description}
                </div>
              </button>
            );
          })}
        </div>
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
            cursor:
              busy || !originalFile || !hasAiCredit ? "not-allowed" : "pointer",
            background: "linear-gradient(135deg, #B06CFF, #7C3AED)",
            color: "#FFF",
            boxShadow: "0 16px 32px rgba(124,58,237,.42)",
            opacity: busy || !originalFile || !hasAiCredit ? 0.55 : 1,
          }}
        >
          {busy
            ? "⏳ Traitement…"
            : hasAiCredit
              ? "✨ Générer la caricature IA"
              : "🔒 Crédit avatar IA requis"}
        </button>
        <button
          type="button"
          onClick={() => handleSave("manual")}
          disabled={busy || !avatarImage}
          style={{
            width: "100%",
            marginTop: 8,
            borderRadius: 14,
            padding: "12px 14px",
            border: "1px solid rgba(246,194,86,.32)",
            background: "rgba(246,194,86,.11)",
            color: GOLD_2,
            fontWeight: 950,
            cursor: busy || !avatarImage ? "not-allowed" : "pointer",
            opacity: busy || !avatarImage ? 0.55 : 1,
          }}
        >
          💾 Enregistrer dans la galerie
        </button>
      </div>
    );
  };

  const renderIaTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      {renderCreditsCard()}
      <MedallionButton />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={busy}
        style={{
          borderRadius: 999,
          border: `1px solid ${primary}66`,
          background: "linear-gradient(135deg, rgba(0,0,0,.42), rgba(246,194,86,.13))",
          color: GOLD_2,
          padding: "11px 14px",
          fontWeight: 950,
          cursor: busy ? "not-allowed" : "pointer",
          boxShadow: `0 0 22px ${primary}33`,
        }}
      >
        📸 Importer une photo
      </button>
      {renderControls()}
      {renderCaricatureBox()}
      <StatusCard />
    </div>
  );

  const renderGalleryTab = () => (
    <div style={{ display: "grid", gap: 12 }}>
      <div style={{ ...cardBase, padding: 14 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 10,
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 1000,
                textTransform: "uppercase",
                fontSize: 15,
              }}
            >
              Galerie avatars IA
            </div>
            <div style={{ opacity: 0.78, fontSize: 12.5 }}>
              {gallery.length} avatar{gallery.length > 1 ? "s" : ""} sauvegardé
              {gallery.length > 1 ? "s" : ""}
            </div>
          </div>
          <InfoMini
            title="Galerie"
            content="Clique sur un avatar pour l’ouvrir en grand, l’exporter ou l’attribuer à un profil existant."
            onOpen={(title, content) => setMiniInfo({ title, content })}
          />
        </div>
        {gallery.length === 0 ? (
          <div
            style={{
              borderRadius: 16,
              border: "1px dashed rgba(255,255,255,.18)",
              padding: 20,
              textAlign: "center",
              opacity: 0.72,
            }}
          >
            Aucun avatar pour le moment. Génère puis enregistre un avatar depuis
            l’onglet IA.
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 8,
            }}
          >
            {gallery.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedGalleryItem(item)}
                style={{
                  border: 0,
                  borderRadius: 14,
                  background: "rgba(255,255,255,.055)",
                  padding: 6,
                  cursor: "pointer",
                }}
              >
                <img
                  src={item.dataUrl}
                  alt={item.name}
                  style={{
                    width: "100%",
                    aspectRatio: "1 / 1",
                    objectFit: "cover",
                    borderRadius: 12,
                    background: "#000",
                  }}
                />
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
      <div
        style={{
          ...cardBase,
          padding: 14,
          background:
            "linear-gradient(145deg, rgba(46,24,22,.96), rgba(10,8,8,.98))",
        }}
      >
        <div
          style={{
            fontWeight: 1000,
            textTransform: "uppercase",
            marginBottom: 8,
          }}
        >
          Diagnostic développeur
        </div>
        <p
          style={{
            margin: "0 0 12px",
            opacity: 0.82,
            fontSize: 13,
            lineHeight: 1.4,
          }}
        >
          Visible uniquement quand le mode développeur est activé.
        </p>
        <button
          type="button"
          onClick={runAvatarDebug}
          disabled={busy}
          style={{
            width: "100%",
            borderRadius: 14,
            padding: "13px 14px",
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.08)",
            color: "#fff",
            fontWeight: 950,
            cursor: busy ? "not-allowed" : "pointer",
          }}
        >
          🔎 Diagnostic API IA
        </button>
      </div>
      <StatusCard />
    </div>
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        margin: -8,
        padding: "0 14px 104px",
        color: theme.text,
        background:
          "radial-gradient(circle at 72% 8%, rgba(246,194,86,.16), transparent 34%), radial-gradient(circle at 20% 60%, rgba(124,58,237,.15), transparent 34%), linear-gradient(135deg, #050509 0%, #0b0d14 46%, #030305 100%)",
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleFileChange}
      />
      <div
        style={{ maxWidth: 460, margin: "0 auto", display: "grid", gap: 12 }}
      >
        <div
          style={{
            position: "sticky",
            top: 0,
            zIndex: 50,
            padding: "10px 0 8px",
            background:
              "linear-gradient(180deg, rgba(5,5,9,.98), rgba(5,5,9,.92) 70%, rgba(5,5,9,0))",
            backdropFilter: "blur(12px)",
          }}
        >
          <header
            style={{
              ...cardBase,
              padding: "12px 14px",
              display: "grid",
              gridTemplateColumns: "44px 1fr 44px",
              alignItems: "center",
              gap: 10,
              background:
                "linear-gradient(135deg, rgba(13,16,24,.92), rgba(43,28,73,.72))",
            }}
          >
            <BackDot onClick={handleBack} size={40} color={primary} />
            <div style={{ minWidth: 0, textAlign: "center" }}>
              <h1
                style={{
                  margin: 0,
                  fontSize: 24,
                  lineHeight: 1,
                  fontWeight: 1000,
                  letterSpacing: 1.4,
                  color: primary,
                  textTransform: "uppercase",
                }}
              >
                AVATAR IA
              </h1>
              <div
                style={{
                  marginTop: 5,
                  fontSize: 12,
                  opacity: 0.82,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Caricature cartoon + médaillon WebP
              </div>
            </div>
            <InfoDot
              title="Infos Avatar IA"
              content={infoContent}
              size={40}
              color={primary}
            />
          </header>

          <div
            style={{
              display: "flex",
              gap: 7,
              padding: 4,
              marginTop: 8,
              borderRadius: 18,
              background: "rgba(255,255,255,.045)",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            {tabs
              .filter((x) => !x.hidden)
              .map((tab) => (
                <TabButton
                  key={tab.id}
                  id={tab.id}
                  label={tab.label}
                  icon={tab.icon}
                />
              ))}
          </div>
        </div>

        <main style={{ display: "grid", gap: 12 }}>
          {activeTab === "ia" ? renderIaTab() : null}
          {activeTab === "gallery" ? renderGalleryTab() : null}
          {activeTab === "debug" && devMode.enabled ? renderDebugTab() : null}
        </main>
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
              background:
                "linear-gradient(145deg, rgba(24,24,34,.98), rgba(6,7,12,.98))",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
                alignItems: "center",
                marginBottom: 10,
              }}
            >
              <strong style={{ color: primary, textTransform: "uppercase" }}>
                {miniInfo.title}
              </strong>
              <button
                type="button"
                onClick={() => setMiniInfo(null)}
                style={{
                  border: 0,
                  background: "rgba(255,255,255,.09)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "6px 9px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ opacity: 0.88, lineHeight: 1.45, fontSize: 13.5 }}>
              {miniInfo.content}
            </div>
          </div>
        </div>
      ) : null}

      {selectedGalleryItem ? (
        <div
          onClick={() => setSelectedGalleryItem(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9997,
            background: "rgba(0,0,0,.74)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(94vw, 430px)",
              ...cardBase,
              padding: 16,
              background:
                "linear-gradient(145deg, rgba(18,18,27,.98), rgba(4,5,9,.99))",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <strong style={{ color: primary, textTransform: "uppercase" }}>
                Avatar IA
              </strong>
              <button
                type="button"
                onClick={() => setSelectedGalleryItem(null)}
                style={{
                  border: 0,
                  background: "rgba(255,255,255,.09)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "6px 9px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            <img
              src={selectedGalleryItem.dataUrl}
              alt={selectedGalleryItem.name}
              style={{
                width: "100%",
                aspectRatio: "1 / 1",
                objectFit: "cover",
                borderRadius: 18,
                background: "#000",
                boxShadow: "0 18px 42px rgba(0,0,0,.5)",
              }}
            />
            <div
              style={{
                marginTop: 12,
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: 8,
              }}
            >
              <button
                type="button"
                onClick={() => downloadGalleryItem(selectedGalleryItem)}
                style={{
                  border: 0,
                  borderRadius: 13,
                  padding: "12px 10px",
                  background: "rgba(255,255,255,.09)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                ⬇️ Exporter
              </button>
              <button
                type="button"
                onClick={() => {
                  setAssignTarget(selectedGalleryItem);
                  setSelectedGalleryItem(null);
                }}
                style={{
                  border: 0,
                  borderRadius: 13,
                  padding: "12px 10px",
                  background: "rgba(246,194,86,.18)",
                  color: GOLD_2,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                👤 Attribuer
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedGalleryItem(null)}
              style={{
                width: "100%",
                marginTop: 8,
                border: "1px solid rgba(255,255,255,.12)",
                borderRadius: 13,
                padding: "11px 10px",
                background: "transparent",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              Fermer
            </button>
          </div>
        </div>
      ) : null}

      {assignTarget ? (
        <div
          onClick={() => setAssignTarget(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9998,
            background: "rgba(0,0,0,.68)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(92vw, 420px)", ...cardBase, padding: 16 }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                marginBottom: 12,
              }}
            >
              <strong style={{ color: primary, textTransform: "uppercase" }}>
                Attribuer à un profil
              </strong>
              <button
                type="button"
                onClick={() => setAssignTarget(null)}
                style={{
                  border: 0,
                  background: "rgba(255,255,255,.09)",
                  color: "#fff",
                  borderRadius: 10,
                  padding: "6px 9px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            {profiles.length === 0 ? (
              <div style={{ opacity: 0.75, fontSize: 13 }}>
                Aucun profil local trouvé.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  maxHeight: 360,
                  overflow: "auto",
                }}
              >
                {profiles.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => assignAvatarToProfile(assignTarget, p.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(255,255,255,.06)",
                      color: "#fff",
                      borderRadius: 14,
                      padding: 10,
                      cursor: "pointer",
                      textAlign: "left",
                    }}
                  >
                    <img
                      src={
                        p.avatarDataUrl || p.avatarUrl || assignTarget.dataUrl
                      }
                      alt=""
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 999,
                        objectFit: "cover",
                        background: "#000",
                      }}
                    />
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
