// @ts-nocheck
// ============================================
// src/pages/TournamentCreate.tsx
// Tournois (LOCAL) — Create (UI refacto v1) — BIG TOURNAMENTS (NO LIMITS)
//
// ✅ Adapté PÉTANQUE : options de création (Simple / Doublette / Triplette / Quadrette)
// - forceMode=petanque => mode verrouillé "petanque"
// - Ajout section "Pétanque — Composition" (taille d’équipe)
// - Règle de sélection : nb joueurs doit être multiple de teamSize et >= teamSize*2
// - ❌ PÉTANQUE = AUCUN BOT (UI + logique) + ❌ Auto-fill bots
// - Format tournoi PÉTANQUE : KO / Championnat / Poules+KO (pas de double élimination, pas de best-of)
// - Bracket KO en PÉTANQUE raisonné en "équipes" (Auto pow2 équipes ou Manuel nb équipes)
//
// ✅ FIX (ENGINE V2):
// - engine V2 attend `viewKind` (et repechage optionnel) -> PASSÉS à createTournamentDraft
//
// ✅ FIX IMPORTANT (DOUBLON BRACKET):
// - stages conformes à Tournaments.tsx V2 (ids: ko/rr/w/l/gf/rep + role)
// - évite KO “se” qui provoque souvent un affichage double dans TournamentView
// ============================================

import React from "react";
import type { Store } from "../lib/types";

// ✅ ENGINE + STORE (comme Tournaments.tsx)
import type { Tournament } from "../lib/tournaments/types";
import { createTournamentDraft, buildInitialMatches } from "../lib/tournaments/engine";
import { upsertTournamentLocal, upsertMatchesForTournamentLocal } from "../lib/tournaments/storeLocal";

// ✅ Avatar + StarRing (comme X01Config)
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

// ✅ AVATARS BOTS PRO (assets existants) — (utilisés hors Pétanque)
import avatarBullyBoy from "../assets/avatars/bots-pro/bully-boy.png";
import avatarCoolHand from "../assets/avatars/bots-pro/cool-hand.png";
import avatarFlyingScotsman from "../assets/avatars/bots-pro/flying-scotsman.png";
import avatarGreenMachine from "../assets/avatars/bots-pro/green-machine.png";
import avatarHollywood from "../assets/avatars/bots-pro/hollywood.png";
import avatarIceMan from "../assets/avatars/bots-pro/ice-man.png";
import avatarSnakeKing from "../assets/avatars/bots-pro/snake-king.png";
import avatarTheAsp from "../assets/avatars/bots-pro/the-asp.png";
import avatarTheFerret from "../assets/avatars/bots-pro/the-ferret.png";
import avatarThePower from "../assets/avatars/bots-pro/the-power.png";
import avatarWonderKid from "../assets/avatars/bots-pro/wonder-kid.png";

// ⚠️ Si tu as aussi "the-nuke.png" dans le dossier, décommente :
// import avatarTheNuke from "../assets/avatars/bots-pro/the-nuke.png";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any; // ✅ IMPORTANT: route params (ex: { forceMode: "petanque" })
};

type Mode = "x01" | "cricket" | "killer" | "shanghai" | "petanque";
type TourFormat = "single_ko" | "double_ko" | "round_robin" | "groups_ko";
type BestOf = 1 | 3 | 5 | 7;

type PetanqueTeamSize = 1 | 2 | 3 | 4;

const MODE_LABEL: Record<Mode, string> = {
  x01: "X01",
  cricket: "Cricket",
  killer: "Killer",
  shanghai: "Shanghai",
  petanque: "Pétanque",
};

// ✅ Thème unique (doré)
const THEME = "#f7c85c";

function clamp(n: number, a: number, b: number) {
  const x = Number.isFinite(n) ? n : a;
  return Math.max(a, Math.min(b, x));
}

function shuffle<T>(arr: T[]) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    const tmp = a[i];
    a[i] = a[j];
    a[j] = tmp;
  }
  return a;
}

function nextPow2(n: number) {
  const x = Math.max(1, (n | 0));
  let p = 1;
  while (p < x) p <<= 1;
  return p;
}

function numFromText(txt: any) {
  const s = String(txt ?? "").trim();
  if (!s) return NaN;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
}

/* -----------------------------
   Optional stats bridge (safe)
------------------------------ */

let getBasicProfileStatsAsync: any = null;
try {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  getBasicProfileStatsAsync = require("../lib/statsBridge")?.getBasicProfileStatsAsync;
} catch {}

/* -----------------------------
   Rating -> stars + stats resolver
------------------------------ */

function starsFromAvg3D(avg: number) {
  const a = Number.isFinite(avg) ? avg : 0;
  if (a >= 75) return 5;
  if (a >= 65) return 4;
  if (a >= 55) return 3;
  if (a >= 45) return 2;
  if (a >= 30) return 1;
  return 0;
}

// ✅ robust avg resolver (store + raw + statsBridge)
function resolveAvg3D(obj: any): number {
  const candidates = [
    obj?.avg3D,
    obj?.avg3,
    obj?.stats?.avg3D,
    obj?.stats?.avg3,
    obj?.statsLite?.avg3D,
    obj?.statsLite?.avg3,
    obj?.quickStats?.avg3D,
    obj?.quickStats?.avg3,
    obj?.globalStats?.avg3D,
    obj?.globalStats?.avg3,
    obj?.rating,
    obj?.level,
    obj?.botLevel,
    obj?.difficulty,
  ];
  for (const v of candidates) {
    const n = Number(v);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
}

async function safeAvg3DForProfile(profileRaw: any, store?: any): Promise<number> {
  // 1) store caches éventuels
  try {
    const pid = String(profileRaw?.id || "");
    const fromStore = [
      store?.statsByProfile?.[pid]?.avg3D,
      store?.quickStatsByProfile?.[pid]?.avg3D,
      store?.profilesStats?.[pid]?.avg3D,
      store?.statsByProfile?.[pid]?.avg3,
      store?.quickStatsByProfile?.[pid]?.avg3,
      store?.profilesStats?.[pid]?.avg3,
    ];
    for (const v of fromStore) {
      const n = Number(v);
      if (Number.isFinite(n) && n > 0) return n;
    }
  } catch {}

  // 2) raw profile
  const direct = resolveAvg3D(profileRaw);
  if (direct > 0) return direct;

  // 3) statsBridge fallback
  if (typeof getBasicProfileStatsAsync === "function") {
    try {
      const st = await getBasicProfileStatsAsync(profileRaw?.id);
      const v = resolveAvg3D(st);
      if (v > 0) return v;
    } catch {}
  }

  return 0;
}

/* -----------------------------
   ✅ BOTS CATALOG (assets + user-created)
   (Utilisé hors Pétanque)
------------------------------ */

// ✅ 1) Bots PRO (assets réels)
const BOTS_PRO_ASSETS = [
  { id: "bot_bully_boy", name: "Bully Boy", rating: 66, avatarDataUrl: avatarBullyBoy },
  { id: "bot_cool_hand", name: "Cool Hand", rating: 64, avatarDataUrl: avatarCoolHand },
  { id: "bot_flying_scotsman", name: "Flying Scotsman", rating: 62, avatarDataUrl: avatarFlyingScotsman },

  { id: "bot_green_machine", name: "Green Machine", rating: 78, avatarDataUrl: avatarGreenMachine },
  { id: "bot_hollywood", name: "Hollywood", rating: 70, avatarDataUrl: avatarHollywood },
  { id: "bot_ice_man", name: "Ice Man", rating: 69, avatarDataUrl: avatarIceMan },

  { id: "bot_snake_king", name: "Snake King", rating: 72, avatarDataUrl: avatarSnakeKing },
  { id: "bot_the_asp", name: "The Asp", rating: 67, avatarDataUrl: avatarTheAsp },
  { id: "bot_the_ferret", name: "The Ferret", rating: 65, avatarDataUrl: avatarTheFerret },
  { id: "bot_the_power", name: "The Power", rating: 74, avatarDataUrl: avatarThePower },

  { id: "bot_wonder_kid", name: "Wonder Kid", rating: 68, avatarDataUrl: avatarWonderKid },

  // ⚠️ si tu ajoutes the-nuke.png :
  // { id: "bot_the_nuke", name: "The Nuke", rating: 71, avatarDataUrl: avatarTheNuke },
];

const BOT_PRO_AVATAR_BY_NAME: Record<string, any> = Object.fromEntries(
  BOTS_PRO_ASSETS.map((b) => [String(b.name || "").trim().toLowerCase(), b.avatarDataUrl])
);

function botAvatarFor(obj: any) {
  const nameKey = String(obj?.name || "").trim().toLowerCase();
  return (
    obj?.avatarUrl ||
    obj?.avatarDataUrl ||
    obj?.avatarPath ||
    obj?.avatar ||
    obj?.photo ||
    obj?.thumb ||
    BOT_PRO_AVATAR_BY_NAME[nameKey] ||
    null
  );
}

// ✅ detect bot “créé user” (Profiles → création bot) — ROBUSTE
function isBotProfile(p: any) {
  if (!p) return false;
  if (p.isBot === true) return true;
  if (p.ai === true || p.isAI === true) return true;
  if (String(p.isBot).toLowerCase() === "true") return true;
  if (String(p.ai).toLowerCase() === "true") return true;
  if (String(p.isAI).toLowerCase() === "true") return true;

  const t = String(p.type || p.kind || p.profileType || p.source || p.role || "").toLowerCase().trim();
  if (t === "bot" || t === "ai" || t === "cpu") return true;
  if (t.includes("bot")) return true;

  if (p.botLevel != null) return true;
  if (p.difficulty != null) return true;
  if (p.skill != null) return true;

  return false;
}

// ✅ localStorage bots : clés connues + scan "bot" (fallback)
function readBotsFromLocalStorage(): any[] {
  const keys = ["dc_bots_v1", "dc-bots-v1", "dcBotsV1", "darts-counter-bots", "bots"];

  // 1) clés connues
  for (const k of keys) {
    try {
      const raw = localStorage.getItem(k);
      if (!raw) continue;
      const parsed = JSON.parse(raw);
      const arr = Array.isArray(parsed)
        ? parsed
        : Array.isArray(parsed?.bots)
          ? parsed.bots
          : Array.isArray(parsed?.items)
            ? parsed.items
            : Array.isArray(parsed?.list)
              ? parsed.list
              : [];
      if (Array.isArray(arr) && arr.length) return arr;
    } catch {}
  }

  // 2) scan localStorage: toute clé contenant "bot"
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (!k) continue;
      if (!/bot/i.test(k)) continue;
      const raw = localStorage.getItem(k);
      if (!raw) continue;

      try {
        const parsed = JSON.parse(raw);
        const arr = Array.isArray(parsed)
          ? parsed
          : Array.isArray(parsed?.bots)
            ? parsed.bots
            : Array.isArray(parsed?.items)
              ? parsed.items
              : Array.isArray(parsed?.list)
                ? parsed.list
                : [];
        if (Array.isArray(arr) && arr.length) return arr;
      } catch {}
    }
  } catch {}

  return [];
}

// ✅ fingerprint stable: détecte changement localStorage DANS LE MÊME ONGLET (poll)
function botsFingerprintLS(): string {
  try {
    const keys = ["dc_bots_v1", "dc-bots-v1", "dcBotsV1", "darts-counter-bots", "bots"];
    const chunks: string[] = [];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v) chunks.push(k + ":" + String(v.length));
    }

    try {
      let countBotKeys = 0;
      let sumLen = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (!k) continue;
        if (!/bot/i.test(k)) continue;
        countBotKeys++;
        const v = localStorage.getItem(k);
        if (v) sumLen += v.length;
      }
      chunks.push("scan:" + countBotKeys + ":" + sumLen);
    } catch {}

    return chunks.join("|");
  } catch {
    return "";
  }
}

function getBotsFromStore(store: any) {
  const out: any[] = [];
  const seen = new Set<string>();

  const pushBot = (p: any, forcedBot = false) => {
    if (!p) return;
    if (!forcedBot && !isBotProfile(p)) return;

    const id = String(p?.id || p?.uuid || p?.botId || "");
    const name = String(p?.name || p?.displayName || p?.pseudo || "Bot").trim();
    const key = id || `bot_${name.toLowerCase()}`;
    if (!key || seen.has(key)) return;
    seen.add(key);

    const avg = resolveAvg3D(p) || Number(p?.rating || p?.level || 0) || 0;

    out.push({
      id: id || key,
      name,
      avatar: botAvatarFor(p),
      avg3D: Number(avg) || 0,
      isBot: true,
      raw: p,
    });
  };

  try {
    if (Array.isArray(store?.bots)) store.bots.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.botProfiles)) store.botProfiles.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.aiBots)) store.aiBots.forEach((b: any) => pushBot(b, true));
    if (Array.isArray(store?.settings?.bots)) store.settings.bots.forEach((b: any) => pushBot(b, true));
  } catch {}

  try {
    if (Array.isArray(store?.profiles)) store.profiles.forEach((p: any) => pushBot(p, false));
  } catch {}

  try {
    const lsBots = readBotsFromLocalStorage();
    if (Array.isArray(lsBots)) lsBots.forEach((b: any) => pushBot(b, true));
  } catch {}

  return out;
}

function pickBotsToFill(fromCatalog: any[], need: number, avgTarget: number) {
  const pool = Array.isArray(fromCatalog) ? fromCatalog.filter(Boolean) : [];
  if (!pool.length || need <= 0) return [];
  const sorted = [...pool].sort(
    (a, b) => Math.abs((Number(a.avg3D) || 0) - avgTarget) - Math.abs((Number(b.avg3D) || 0) - avgTarget)
  );
  const out: any[] = [];
  for (let i = 0; i < need; i++) out.push(sorted[i % sorted.length]);
  return out;
}

/* -----------------------------
   UI atoms (THEME neon-ish)
------------------------------ */

function Section({ title, subtitle, children, accent = THEME }: any) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        background: `radial-gradient(120% 160% at 0% 0%, ${accent}22, transparent 55%), linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))`,
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
      }}
    >
      <div style={{ display: "grid", gap: 4, marginBottom: 10 }}>
        <div style={{ fontSize: 12.5, fontWeight: 950, letterSpacing: 0.3, color: accent, textShadow: `0 0 10px ${accent}40` }}>
          {title}
        </div>
        {subtitle ? <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35 }}>{subtitle}</div> : null}
      </div>
      {children}
    </div>
  );
}

function NeonPill({ active, label, onClick, small, disabled, primary = THEME }: any) {
  const isDisabled = !!disabled;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={isDisabled}
      style={{
        borderRadius: 999,
        padding: small ? "6px 10px" : "7px 12px",
        border: active ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.12)",
        background: active ? `linear-gradient(180deg, ${primary}22, rgba(0,0,0,0.20))` : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: "rgba(255,255,255,0.95)",
        fontWeight: active ? 950 : 850,
        fontSize: small ? 11.5 : 12.2,
        cursor: isDisabled ? "not-allowed" : "pointer",
        boxShadow: active ? `0 0 18px ${primary}44, 0 10px 22px rgba(0,0,0,0.35)` : "none",
        whiteSpace: "nowrap",
        opacity: isDisabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function NeonPrimary({ label, onClick, disabled, primary = THEME }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!!disabled}
      style={{
        width: "100%",
        borderRadius: 999,
        padding: "12px 14px",
        border: "none",
        fontWeight: 950,
        fontSize: 13,
        letterSpacing: 1,
        textTransform: "uppercase",
        cursor: disabled ? "default" : "pointer",
        color: "#1b1508",
        background: disabled ? "linear-gradient(180deg,#555,#333)" : `linear-gradient(90deg, ${primary}, #ffe9a3)`,
        boxShadow: disabled ? "none" : "0 14px 34px rgba(0,0,0,0.55)",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      {label}
    </button>
  );
}

function NeonGhost({ label, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        borderRadius: 999,
        padding: "7px 10px",
        border: "1px solid rgba(255,255,255,0.12)",
        background: "rgba(255,255,255,0.05)",
        color: "rgba(255,255,255,0.9)",
        fontWeight: 900,
        fontSize: 12,
        cursor: "pointer",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

/* -----------------------------
   Info (i) modal centered
------------------------------ */

function InfoIconButton({ onClick }: any) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      style={{
        width: 26,
        height: 26,
        borderRadius: 999,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(255,255,255,0.06)",
        color: "#fff",
        fontWeight: 950,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        flex: "0 0 auto",
        boxShadow: "0 0 12px rgba(0,0,0,0.55)",
      }}
      aria-label="Info"
      title="Info"
    >
      i
    </button>
  );
}

function CenterInfoModal({ open, title, children, onClose, primary }: any) {
  if (!open) return null;
  return (
    <div
      onMouseDown={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0,0,0,0.62)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 12,
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 100%)",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(12,14,28,0.96), rgba(6,7,14,0.98))",
          boxShadow: "0 18px 60px rgba(0,0,0,0.70)",
          padding: 14,
          color: "#f2f2ff",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 }}>
          <div style={{ fontWeight: 950, color: primary, fontSize: 14 }}>{title}</div>
          <button
            type="button"
            onClick={onClose}
            style={{
              borderRadius: 10,
              padding: "6px 10px",
              border: "1px solid rgba(255,255,255,0.12)",
              background: "rgba(255,255,255,0.06)",
              color: "#fff",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>
        <div style={{ fontSize: 12, color: "#d7d9f0", lineHeight: 1.45 }}>{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
   Players helpers + MEDALLION (no circles)
------------------------------ */

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function PlayerMedallion({ name, dataUrl, avg3D, active, isBot, primary = THEME }: any) {
  const SCALE = 0.82;
  const AVATAR = Math.round(78 * SCALE);
  const STAR = Math.round(18 * SCALE);
  const WRAP = AVATAR + STAR;

  return (
    <div style={{ position: "relative", width: WRAP, height: WRAP, display: "grid", placeItems: "center", overflow: "visible", background: "transparent" }}>
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 2, opacity: 0.95 }}>
        <ProfileStarRing anchorSize={AVATAR} starSize={STAR} gapPx={-2} stepDeg={10} avg3d={Number(avg3D) || 0} color={primary} />
      </div>

      {active ? (
        <div
          aria-hidden
          style={{
            position: "absolute",
            width: AVATAR + 7,
            height: AVATAR + 7,
            borderRadius: "50%",
            boxShadow: `0 0 14px ${primary}66, 0 0 26px ${primary}18`,
            zIndex: 0,
            background: "transparent",
            pointerEvents: "none",
          }}
        />
      ) : null}

      <div
        style={{
          width: AVATAR,
          height: AVATAR,
          borderRadius: "50%",
          overflow: "hidden",
          zIndex: 1,
          background: "transparent",
          boxShadow: "none",
          filter: active ? "none" : "brightness(0.88) saturate(0.92)",
          opacity: active ? 1 : 0.85,
          transition: "filter .15s ease, opacity .15s ease",
        }}
      >
        <ProfileAvatar size={AVATAR} dataUrl={dataUrl ?? undefined} label={getInitials(name)} showStars={false} noFrame />
      </div>

      {isBot ? (
        <div
          style={{
            position: "absolute",
            bottom: -4,
            left: "50%",
            transform: "translateX(-50%)",
            padding: "2px 8px",
            borderRadius: 999,
            fontSize: 9,
            fontWeight: 950,
            background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
            color: "#160f06",
            boxShadow: `0 0 10px ${primary}33`,
            zIndex: 3,
            whiteSpace: "nowrap",
          }}
        >
          BOT
        </div>
      ) : null}
    </div>
  );
}

function PlayerCarouselTile({ active, name, avatarUrl, avg3D, onClick, isBot, primary = THEME }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: 104,
        flex: "0 0 auto",
        border: "none",
        background: "transparent",
        color: "rgba(255,255,255,0.92)",
        cursor: "pointer",
        padding: 0,
        display: "grid",
        justifyItems: "center",
        gap: 8,
        scrollSnapAlign: "start",
        opacity: active ? 1 : 0.86,
      }}
      title={name}
    >
      <PlayerMedallion name={name} dataUrl={avatarUrl} avg3D={avg3D} active={active} isBot={!!isBot} primary={primary} />
      <div style={{ width: 104, fontSize: 11.5, fontWeight: 950, opacity: active ? 1 : 0.55, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", transition: "opacity .15s ease" }}>
        {name || "Joueur"}
      </div>
    </button>
  );
}

/* -----------------------------
   Sheet (mode picker)
------------------------------ */

function Sheet({ open, title, onClose, children, primary = THEME }: any) {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.62)", display: "grid", placeItems: "end center", padding: 12 }} onMouseDown={onClose}>
      <div
        style={{
          width: "min(520px, 96vw)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))",
          boxShadow: "0 22px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div style={{ padding: "12px 14px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ fontWeight: 950, fontSize: 14, color: primary }}>{title}</div>
          <button type="button" onClick={onClose} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 20, cursor: "pointer", lineHeight: 1 }} aria-label="Fermer" title="Fermer">
            ✕
          </button>
        </div>
        <div style={{ padding: 14 }}>{children}</div>
      </div>
    </div>
  );
}

/* -----------------------------
   UI rows (1 line option + i outside)
------------------------------ */

function LineOption({ label, active, onClick, onInfo, primary = THEME, disabled }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
      <button
        type="button"
        onClick={onClick}
        disabled={!!disabled}
        style={{
          height: 40,
          borderRadius: 14,
          border: active ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
          background: active ? `linear-gradient(180deg, ${primary}22, rgba(0,0,0,0.20))` : "rgba(9,11,20,0.92)",
          color: "rgba(255,255,255,0.95)",
          fontWeight: 950,
          textAlign: "left",
          padding: "0 12px",
          cursor: disabled ? "not-allowed" : "pointer",
          boxShadow: active ? `0 0 18px ${primary}33` : "none",
          opacity: disabled ? 0.55 : 1,
        }}
      >
        {label}
      </button>
      <InfoIconButton onClick={onInfo} />
    </div>
  );
}

function RowTitle({ label }: any) {
  return <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 8 }}>{label}</div>;
}

function TextInput({ value, onChange, placeholder, width = "100%" }: any) {
  return (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,0.14)",
        background: "rgba(8,8,12,0.75)",
        color: "#fff",
        padding: "10px 12px",
        fontSize: 13.5,
        outline: "none",
      }}
    />
  );
}

/* -----------------------------
   Page
------------------------------ */

export default function TournamentCreate({ store, go, params }: Props) {
  const primary = THEME;

  // ✅ FORCE MODE (PÉTANQUE)
  const forceMode = String(params?.forceMode ?? "").toLowerCase();
  const isPetanque = forceMode === "petanque";

  const [name, setName] = React.useState("Mon tournoi");

  // ✅ IMPORTANT: si forceMode=petanque => mode verrouillé
  const [mode, setMode] = React.useState<Mode | null>(isPetanque ? "petanque" : null);
  const [sheetMode, setSheetMode] = React.useState(false);

  React.useEffect(() => {
    if (!isPetanque) return;
    setMode("petanque");
    setSheetMode(false);
  }, [isPetanque]);

  // ✅ PÉTANQUE : composition (Simple/Doublette/Triplette/Quadrette)
  const [petanqueTeamSize, setPetanqueTeamSize] = React.useState<PetanqueTeamSize>(2);

  // ✅ PÉTANQUE — entrée participants
  // - "profiles": sélection de profils humains puis regroupement en équipes
  // - "teams": création directe d'équipes (sans profils) pour gros tournois
  const [petanqueEntry, setPetanqueEntry] = React.useState<"profiles" | "teams">("profiles");

  // ✅ PÉTANQUE — mode "teams" (sans profils)
  const [teamsSearch, setTeamsSearch] = React.useState<string>("");
  const [teamsExpandedIdx, setTeamsExpandedIdx] = React.useState<number | null>(null);
  const [teamsImportOpen, setTeamsImportOpen] = React.useState(false);
  const [teamsImportText, setTeamsImportText] = React.useState<string>("");
  const [teamsInput, setTeamsInput] = React.useState<{ id: string; name: string; players: string[] }[]>([]);


// ✅ PÉTANQUE — équipes (assignation manuelle)
const [assignMode, setAssignMode] = React.useState<boolean>(true); // true = clic sur joueur => assignation vers l’équipe active
const [activeTeamIdx, setActiveTeamIdx] = React.useState<number>(0);
const [teamNames, setTeamNames] = React.useState<Record<number, string>>({});
const [teamOfPlayer, setTeamOfPlayer] = React.useState<Record<string, number>>({});

  // ✅ NEW : max joueurs (optionnel) — vide = illimité
  const [maxPlayers, setMaxPlayers] = React.useState<string>("");

  // ✅ MODAL INFO global (centré)
  const [infoOpen, setInfoOpen] = React.useState(false);
  const [infoKey, setInfoKey] = React.useState<string | null>(null);
  const openInfo = (key: string) => {
    setInfoKey(key);
    setInfoOpen(true);
  };

  // ✅ IMPORTANT: refresh bots même si store ne change pas (utile hors pétanque)
  const [botsRefresh, setBotsRefresh] = React.useState(0);

  React.useEffect(() => {
    const bump = () => setBotsRefresh((x) => x + 1);
    window.addEventListener("focus", bump);
    document.addEventListener("visibilitychange", bump);
    window.addEventListener("storage", bump);
    return () => {
      window.removeEventListener("focus", bump);
      document.removeEventListener("visibilitychange", bump);
      window.removeEventListener("storage", bump);
    };
  }, []);

  React.useEffect(() => {
    let mounted = true;
    let last = botsFingerprintLS();
    const tick = () => {
      if (!mounted) return;
      const now = botsFingerprintLS();
      if (now !== last) {
        last = now;
        setBotsRefresh((x) => x + 1);
      }
    };
    const t = window.setInterval(tick, 700);
    return () => {
      mounted = false;
      window.clearInterval(t);
    };
  }, []);

  // ---- Players (LOCAL) : humains uniquement ici
  const profiles = React.useMemo(() => {
    const arr = (store as any)?.profiles || [];
    return arr
      .filter((p: any) => p?.id && !isBotProfile(p))
      .map((p: any) => ({
        id: String(p.id),
        name: p?.name || p?.displayName || p?.pseudo || "Joueur",
        avatar: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || p?.photo || null,
        raw: p,
      }))
      .filter((p: any) => !!p.id);
  }, [store, botsRefresh]);

  // ✅ BOTS CATALOG (hors pétanque)
  const botsCatalog = React.useMemo(() => {
    const pro = BOTS_PRO_ASSETS.map((b) => ({
      id: String(b.id),
      name: b.name,
      avatar: b.avatarDataUrl ?? null,
      avg3D: Number(b.rating) || 0,
      isBot: true,
      raw: b,
    }));

    const userBots = getBotsFromStore(store as any);

    const out: any[] = [];
    const seen = new Set<string>();
    for (const b of [...pro, ...userBots]) {
      const key = String(b?.id || b?.name || "");
      if (!key || seen.has(key)) continue;
      seen.add(key);

      out.push({
        ...b,
        avatar: botAvatarFor(b?.raw || b) || b.avatar || null,
        avg3D: Number(b.avg3D || 0) || 0,
        isBot: true,
      });
    }
    return out;
  }, [store, botsRefresh]);

  // avg3D cache (humains)
  const [avgMap, setAvgMap] = React.useState<Record<string, number>>({});
  const [loadingAvg, setLoadingAvg] = React.useState(false);

  React.useEffect(() => {
    let mounted = true;
    const run = async () => {
      setLoadingAvg(true);
      try {
        const out: Record<string, number> = {};
        for (const p of profiles) {
          const avg = await safeAvg3DForProfile(p.raw, store as any);
          out[p.id] = Number.isFinite(avg) ? avg : 0;
        }
        if (!mounted) return;
        setAvgMap(out);
      } finally {
        if (mounted) setLoadingAvg(false);
      }
    };

    if (profiles?.length) run();
    else setAvgMap({});

    return () => {
      mounted = false;
    };
  }, [profiles, store]);

  const [playerIds, setPlayerIds] = React.useState<string[]>(() => {
    const active = (store as any)?.activeProfiles || [];
    const fromActive = Array.isArray(active) ? active.map((x: any) => String(x)).filter(Boolean) : [];
    const base = fromActive.length ? fromActive : profiles.slice(0, 2).map((p: any) => String(p.id));
    return Array.from(new Set(base)).filter(Boolean);
  });

  React.useEffect(() => {
    setPlayerIds((prev) => {
      const stillValid = prev.filter((id) => profiles.some((p: any) => p.id === id));
      if (stillValid.length >= 2) return stillValid;
      if (profiles.length >= 2) return Array.from(new Set([...stillValid, profiles[0].id, profiles[1].id]));
      if (profiles.length === 1) return Array.from(new Set([...stillValid, profiles[0].id]));
      return stillValid;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles.length]);

  
const togglePlayer = (id: string) => {
  // ✅ PÉTANQUE : si assignMode ON => clic assigne à l’équipe active (avec swap si besoin)
  if (isPetanque && assignMode) {
    const pid = String(id);

    // si pas sélectionné : on le sélectionne
    if (!playerIds.includes(pid)) {
      setPlayerIds((prev) => [...prev, pid]);
    }

    // assignation
    setTeamOfPlayer((prev) => {
      const selected = Array.from(new Set([...(playerIds || []), pid])).filter(Boolean);
      const teamCount = petanqueTeamCountFromSelected(selected.length);
      const ts = Number(petanqueTeamSize) || 1;
      const next = normalizePetanqueAssignments(selected, prev || {});

      const target = Math.max(0, Math.min(teamCount - 1, Number(activeTeamIdx) || 0));

      // build members list for target team
      const members: string[] = [];
      for (const k of Object.keys(next)) if (next[k] === target) members.push(k);

      const currentTeam = next[pid];

      // déjà dans la bonne équipe
      if (currentTeam === target) return next;

      // si place dispo => move simple
      if (members.length < ts) {
        next[pid] = target;
        return normalizePetanqueAssignments(selected, next);
      }

      // équipe pleine => swap avec le premier membre (sauf si pid déjà dedans, traité au-dessus)
      const swapWith = members[0];
      if (swapWith && swapWith !== pid) {
        const fromTeam = currentTeam;
        next[pid] = target;
        if (fromTeam != null) next[swapWith] = fromTeam;
        return normalizePetanqueAssignments(selected, next);
      }

      return normalizePetanqueAssignments(selected, next);
    });

    return;
  }

  // ✅ mode normal : toggle sélection joueur
  setPlayerIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
};

  // ------------------------------------------------------------
  // ✅ PÉTANQUE — mode "Par équipes" (sans profils)
  // ------------------------------------------------------------

  const normalizeTeamPlayers = React.useCallback(
    (players: any[]) => {
      const list = (Array.isArray(players) ? players : []).map((x) => String(x ?? "").trim()).filter(Boolean);
      // pad à teamSize
      const out = list.slice(0, Number(petanqueTeamSize) || 1);
      while (out.length < (Number(petanqueTeamSize) || 1)) out.push("");
      return out;
    },
    [petanqueTeamSize]
  );

  const makeTeamId = React.useCallback((i: number) => {
    const n = Math.max(1, Number(i) + 1);
    return `team_${n}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  }, []);

  const generateTeams = React.useCallback(
    (count: number) => {
      const n = Math.max(0, Math.min(256, Math.floor(Number(count) || 0)));
      if (!n) {
        setTeamsInput([]);
        setTeamsExpandedIdx(null);
        return;
      }
      const next = Array.from({ length: n }).map((_, idx) => ({
        id: makeTeamId(idx),
        name: `Équipe ${idx + 1}`,
        players: normalizeTeamPlayers([]),
      }));
      setTeamsInput(next);
      setTeamsExpandedIdx(0);
    },
    [makeTeamId, normalizeTeamPlayers]
  );

  const parseTeamsImportText = React.useCallback(
    (text: string) => {
      const ts = Number(petanqueTeamSize) || 1;
      const lines = String(text || "")
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter(Boolean);

      const teams = lines.map((line, idx) => {
        let name = "";
        let players: string[] = [];

        if (line.includes(";")) {
          const [a, b] = line.split(";");
          name = String(a || "").trim();
          players = String(b || "")
            .split(",")
            .map((x) => x.trim())
            .filter(Boolean);
        } else if (line.includes("|")) {
          const parts = line
            .split("|")
            .map((x) => x.trim())
            .filter(Boolean);
          name = parts[0] || "";
          players = parts.slice(1);
        } else {
          name = line;
          players = [];
        }

        const p = (players || []).slice(0, ts);
        while (p.length < ts) p.push("");

        return {
          id: makeTeamId(idx),
          name: name || `Équipe ${idx + 1}`,
          players: p,
        };
      });

      setTeamsInput(teams);
      setTeamsExpandedIdx(teams.length ? 0 : null);
    },
    [makeTeamId, petanqueTeamSize]
  );

  // ---- bots sélectionnés (hors pétanque)
  const [botIds, setBotIds] = React.useState<string[]>([]);
  const toggleBot = (id: string) => setBotIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  // ❌ PÉTANQUE = AUCUN BOT (sécurité absolue)
  React.useEffect(() => {
    if (!isPetanque) return;
    setBotIds([]);
  }, [isPetanque]);

  const totalSelectedIds = React.useMemo(() => {
    if (isPetanque) return Array.from(new Set([...playerIds])).filter(Boolean);
    return Array.from(new Set([...playerIds, ...botIds])).filter(Boolean);
  }, [playerIds, botIds, isPetanque]);

  // ✅ PÉTANQUE contraintes de roster
  const isPetanqueProfiles = isPetanque && petanqueEntry === "profiles";
  const isPetanqueTeams = isPetanque && petanqueEntry === "teams";

  const petanqueMinPlayers = petanqueTeamSize * 2;
  const petanqueMultipleOk = isPetanqueProfiles ? totalSelectedIds.length % petanqueTeamSize === 0 : true;
  const petanqueMinOk = isPetanqueProfiles ? totalSelectedIds.length >= petanqueMinPlayers : isPetanqueTeams ? teamsInput.length >= 2 : true;

  const minPlayersOk = isPetanque ? petanqueMinOk : totalSelectedIds.length >= 2;


// ✅ PÉTANQUE — nombre d’équipes + normalisation assignations
const petanqueTeamsCount = React.useMemo(() => {
  return isPetanque ? petanqueTeamCountFromSelected(totalSelectedIds.length) : 0;
}, [isPetanque, totalSelectedIds.length, petanqueTeamSize]);

const petanqueTeamsCountEffective = React.useMemo(() => {
  if (!isPetanque) return 0;
  return isPetanqueTeams ? (teamsInput?.length || 0) : petanqueTeamsCount;
}, [isPetanque, isPetanqueTeams, teamsInput, petanqueTeamsCount]);

React.useEffect(() => {
  if (!isPetanqueProfiles) return;

  // clamp équipe active
  setActiveTeamIdx((prev) => {
    const max = Math.max(0, petanqueTeamsCount - 1);
    const v = Number.isFinite(prev as any) ? (prev as any) : 0;
    return Math.max(0, Math.min(max, v));
  });

  // noms par défaut
  setTeamNames((prev) => {
    const next = { ...(prev || {}) };
    for (let i = 0; i < petanqueTeamsCount; i++) {
      if (!next[i]) next[i] = `Équipe ${i + 1}`;
    }
    // nettoyage
    Object.keys(next).forEach((k) => {
      const idx = Number(k);
      if (!Number.isFinite(idx) || idx < 0 || idx >= petanqueTeamsCount) delete next[k];
    });
    return next;
  });

  // assignations
  setTeamOfPlayer((prev) => normalizePetanqueAssignments(totalSelectedIds, prev || {}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [isPetanqueProfiles, petanqueTeamsCount, petanqueTeamSize, totalSelectedIds.join("|")]);

const petanqueTeamsReady = React.useMemo(() => {
  if (!isPetanque) return true;

  // ✅ MODE "Par équipes" : on valide les équipes saisies
  if (isPetanqueTeams) {
    const ts = Number(petanqueTeamSize) || 1;
    if ((teamsInput?.length || 0) < 2) return false;
    for (const t of teamsInput || []) {
      const nm = String(t?.name || "").trim();
      if (!nm) return false;
      const players = Array.isArray(t?.players) ? t.players : [];
      const filled = players.map((x) => String(x ?? "").trim()).filter(Boolean);
      if (filled.length !== ts) return false;
    }
    return true;
  }

  // ✅ MODE "Par profils" : on valide la composition issue des assignations
  if (!isPetanqueProfiles) return false;
  const { teams, ts, teamCount } = buildPetanqueTeamsFromAssignments(totalSelectedIds);

  if (teamCount < 2) return false;
  if (teams.some((t: any) => (t.memberIds?.length || 0) !== ts)) return false;

  // chaque joueur sélectionné doit être dans exactement une équipe
  const flat = teams.flatMap((t: any) => t.memberIds || []);
  const uniq = new Set(flat);
  if (uniq.size !== flat.length) return false;
  if (uniq.size !== totalSelectedIds.length) return false;

  return true;
}, [isPetanque, isPetanqueTeams, isPetanqueProfiles, teamsInput, totalSelectedIds.join("|"), teamOfPlayer, petanqueTeamSize, teamNames]);

  // ---- Format tournoi
  const [format, setFormat] = React.useState<TourFormat>("single_ko");
  const [bestOf, setBestOf] = React.useState<BestOf>(3);

  // ✅ NEW : RR / Poules
  const [rrRounds, setRrRounds] = React.useState(1); // 1..5
  const [playersPerGroup, setPlayersPerGroup] = React.useState<string>("4"); // libre
  const [qualifiersPerGroup, setQualifiersPerGroup] = React.useState(2);

  // ✅ NEW : Bracket Auto / Manuel
  const [bracketAuto, setBracketAuto] = React.useState(true);
  const [bracketTarget, setBracketTarget] = React.useState<string>("");

  // ✅ auto-fill bots (désactivé en Pétanque)
  const [autoFillBots, setAutoFillBots] = React.useState(true);
  React.useEffect(() => {
    if (!isPetanque) return;
    setAutoFillBots(false);
  }, [isPetanque]);

  // ✅ seedMode + repechage
  const [seedMode, setSeedMode] = React.useState<"random" | "byLevel">("random");
  const [repechageEnabled, setRepechageEnabled] = React.useState(false);

  // ---- Params match X01
  const defaultStart =
    (store?.settings?.defaultX01 as any) === 301 ||
    (store?.settings?.defaultX01 as any) === 501 ||
    (store?.settings?.defaultX01 as any) === 701 ||
    (store?.settings?.defaultX01 as any) === 901
      ? (store.settings.defaultX01 as 301 | 501 | 701 | 901)
      : 501;

  const [x01Start, setX01Start] = React.useState<301 | 501 | 701 | 901>(defaultStart);
  const [x01In, setX01In] = React.useState<"simple" | "double" | "master">("simple");
  const [x01Out, setX01Out] = React.useState<"simple" | "double" | "master">(store?.settings?.doubleOut ? "double" : "simple");

  // ✅ create gate
  const canCreate = !!name.trim() && !!mode && minPlayersOk && (!isPetanque || (petanqueMultipleOk && petanqueTeamsReady));

  const TYPE_INFO: Record<TourFormat, string> = {
    single_ko: "Tableau KO : une défaite = élimination. Rapide et clair.",
    double_ko: "Double élimination : il faut 2 défaites pour sortir.",
    round_robin: "Championnat : tout le monde se rencontre, classement par victoires/points.",
    groups_ko: "Poules + KO : phase groupes (poules), puis tableau final KO (qualifiés).",
  };

  const OTHER_INFO = {
    players: isPetanque
      ? "Sélectionne des profils humains. Minimum = 2 équipes. Total joueurs = multiple de la taille d’équipe."
      : "Sélectionne des profils humains et/ou des BOTS IA. Minimum 2 joueurs pour créer.",
    botsSelect: "Sélection BOTS : bots PRO (assets) + bots créés via Profiles → bots.",
    bestOf: "Best-of = nombre de manches à gagner. BO3 = 2 manches gagnantes, BO5 = 3, etc.",
    seedMode: "Têtes de série : Aléatoire mélange au départ. Par niveau trie par avg3D (du meilleur au moins bon).",
    repechage: "Repêchage : ajoute une phase de consolation si possible (selon format / engine).",
    maxPlayers: "Optionnel : si tu as énormément de profils, tu peux fixer un max. Vide = illimité.",
    rrRounds: "Nombre de tours en Championnat / Poules : 1 = chacun rencontre chacun une fois (dans sa poule).",
    groups: "Joueurs par poule : l’app calcule automatiquement le nombre de poules (ceil(N / joueursParPoule)).",
    bracket: isPetanque
      ? "Bracket KO : Auto = prochaine puissance de 2 en nombre d’équipes (byes). Manuel = nombre d’équipes (8, 16, 24…)."
      : "Bracket KO : Auto = prochaine puissance de 2 (byes). Manuel = taille libre (ex: 24, 32, 48…).",
    autofill: "Auto-fill BOTS : complète automatiquement si tu n’as pas assez de joueurs (désactivé en Championnat).",
    petanqueTeam: "Composition Pétanque : Simple (1), Doublette (2), Triplette (3), Quadrette (4). Le total joueurs doit être un multiple.",
  };

  // ✅ engine V2: viewKind attendu
  function viewKindFromFormat(fmt: TourFormat) {
    if (fmt === "single_ko") return "single_ko";
    if (fmt === "double_ko") return "double_ko";
    if (fmt === "round_robin") return "round_robin";
    return "groups_ko";
  }

  function buildStagesForEngine(fmt: TourFormat, nPlayers: number) {
    const seeding = seedMode === "byLevel" ? "ordered" : "random";
    const rounds = Math.max(1, Number(rrRounds) || 1);

    if (fmt === "round_robin") {
      return [
        {
          id: "rr",
          type: "round_robin",
          role: "groups",
          name: "Championnat",
          groups: 1,
          rounds,
          qualifiersPerGroup: 0,
          seeding,
        },
      ];
    }

    if (fmt === "groups_ko") {
      const ppg = clamp(Number(playersPerGroup) || 4, 2, 9999);
      const groups = Math.max(1, Math.ceil(Math.max(2, nPlayers) / ppg));
      const q = clamp(Number(qualifiersPerGroup) || 2, 1, Math.max(1, ppg));

      const stages: any[] = [
        {
          id: "rr",
          type: "round_robin",
          role: "groups",
          name: "Poules",
          groups,
          rounds,
          qualifiersPerGroup: q,
          seeding,
        },
        { id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding },
      ];

      if (repechageEnabled) {
        stages.push({ id: "rep", type: "single_elim", role: "repechage", name: "Repêchage", seeding });
      }
      return stages;
    }

    if (fmt === "double_ko") {
      return [
        { id: "w", type: "single_elim", role: "ko", name: "Winners Bracket", seeding },
        { id: "l", type: "single_elim", role: "repechage", name: "Losers Bracket", seeding },
        { id: "gf", type: "single_elim", role: "ko", name: "Grande Finale", seeding },
      ];
    }

    const stages: any[] = [{ id: "ko", type: "single_elim", role: "ko", name: "Phase finale", seeding }];
    if (repechageEnabled) {
      stages.push({ id: "rep", type: "single_elim", role: "repechage", name: "Repêchage", seeding });
    }
    return stages;
  }

  function computeAvgTarget(selected: any[]) {
    if (!selected?.length) return 50;
    const s = selected.reduce((acc, p) => acc + (Number(p?.avg3D || 0) || 0), 0);
    return s / selected.length;
  }


// --------------------------------------------
// ✅ PÉTANQUE — équipes (helpers)
// --------------------------------------------

function petanqueTeamCountFromSelected(nPlayers: number) {
  const ts = Number(petanqueTeamSize) || 1;
  return Math.max(0, Math.floor(Math.max(0, nPlayers) / ts));
}

function buildPetanqueTeamsFromAssignments(selectedIds: string[]) {
  const ts = Number(petanqueTeamSize) || 1;
  const teamCount = petanqueTeamCountFromSelected(selectedIds.length);

  const membersByTeam: string[][] = Array.from({ length: teamCount }, () => []);
  for (const pid of selectedIds) {
    const t = teamOfPlayer?.[pid];
    if (Number.isFinite(t) && t >= 0 && t < teamCount) membersByTeam[t].push(pid);
  }

  // fallback: si certains joueurs ne sont pas assignés (ou hors range), on complète
  const already = new Set(membersByTeam.flat());
  const unassigned = selectedIds.filter((id) => !already.has(id));
  for (const pid of unassigned) {
    let placed = false;
    for (let t = 0; t < teamCount; t++) {
      if (membersByTeam[t].length < ts) {
        membersByTeam[t].push(pid);
        placed = true;
        break;
      }
    }
    if (!placed && teamCount > 0) {
      membersByTeam[Math.min(teamCount - 1, 0)].push(pid);
    }
  }

  const teams = membersByTeam.map((memberIds, idx) => ({
    idx,
    id: `team_${idx + 1}`,
    name: teamNames?.[idx] || `Équipe ${idx + 1}`,
    memberIds: memberIds.slice(0, ts),
  }));

  return { teams, ts, teamCount };
}

function normalizePetanqueAssignments(selectedIds: string[], prev: Record<string, number>) {
  const ts = Number(petanqueTeamSize) || 1;
  const teamCount = petanqueTeamCountFromSelected(selectedIds.length);

  // 1) garder uniquement selected + range ok
  const next: Record<string, number> = {};
  const counts = Array.from({ length: teamCount }, () => 0);

  for (const pid of selectedIds) {
    const t = prev?.[pid];
    if (Number.isFinite(t) && t >= 0 && t < teamCount) {
      next[pid] = t;
      counts[t]++;
    }
  }

  const teamHasSpace = (t: number) => t >= 0 && t < teamCount && counts[t] < ts;

  // 2) désengorger équipes trop pleines
  for (const pid of selectedIds) {
    const t = next[pid];
    if (!Number.isFinite(t)) continue;
    if (t < 0 || t >= teamCount) continue;
    if (counts[t] <= ts) continue;

    // déplacer vers une autre équipe
    for (let k = 0; k < teamCount; k++) {
      if (k === t) continue;
      if (teamHasSpace(k)) {
        next[pid] = k;
        counts[t]--;
        counts[k]++;
        break;
      }
    }
  }

  // 3) assigner le reste (non assigné)
  for (const pid of selectedIds) {
    if (next[pid] != null) continue;

    const preferred = Number(activeTeamIdx) || 0;
    if (teamHasSpace(preferred)) {
      next[pid] = preferred;
      counts[preferred]++;
      continue;
    }

    let placed = false;
    for (let t = 0; t < teamCount; t++) {
      if (teamHasSpace(t)) {
        next[pid] = t;
        counts[t]++;
        placed = true;
        break;
      }
    }
    if (!placed && teamCount > 0) {
      next[pid] = Math.min(teamCount - 1, 0);
    }
  }

  return next;
}

  // ✅ KO sizing:
  // - hors pétanque: joueurs
  // - pétanque: équipes => pow2 équipes * teamSize, ou manuel nb équipes * teamSize
  
// ✅ KO sizing:
// - hors pétanque: entrants = joueurs
// - pétanque: entrants = équipes
//   Auto = prochaine puissance de 2 en équipes (byes), Manuel = nb équipes
function computeDesiredSize(currentEntrantsCount: number) {
  if (format === "round_robin") return null;

  if (!isPetanque) {
    if (bracketAuto) return nextPow2(currentEntrantsCount);
    const manual = Math.floor(numFromText(bracketTarget));
    if (Number.isFinite(manual) && manual >= 2) return manual;
    return nextPow2(currentEntrantsCount);
  }

  const teams = Math.max(1, Math.floor(currentEntrantsCount));

  if (bracketAuto) return nextPow2(teams);

  const manualTeams = Math.floor(numFromText(bracketTarget));
  if (Number.isFinite(manualTeams) && manualTeams >= 2) return manualTeams;

  return nextPow2(teams);
}

  
async function createTournament() {
  if (!canCreate) return;

  // ✅ PÉTANQUE : sécurité (aucun bot, seed random)
  const effectiveSeedMode = isPetanque ? "random" : seedMode;

  const cap = Math.floor(numFromText(maxPlayers));
  const capEnabled = Number.isFinite(cap) && cap > 1;

  const selectedProfiles = profiles.filter((p: any) => playerIds.includes(String(p.id)));
  const profileById = Object.fromEntries(selectedProfiles.map((p: any) => [String(p.id), p]));

  // --------------------------------------------
  // ✅ MODE PÉTANQUE : on transforme les joueurs en ÉQUIPES (entrants = équipes)
  // --------------------------------------------
  if (isPetanque) {
    const ts = Number(petanqueTeamSize) || 1;

    // ✅ MODE "Par équipes" : on crée les entrants à partir de teamsInput (sans profils)
    const teamEntrants = isPetanqueTeams
      ? (teamsInput || []).map((t: any, idx: number) => {
          const teamId = String(t?.id || `team_${idx + 1}`);
          const teamName = (String(t?.name || "").trim() || `Équipe ${idx + 1}`).trim();
          const players = normalizeTeamPlayers(t?.players || []);
          const members = players.slice(0, ts).map((nm: string, k: number) => {
            const safeName = String(nm || "").trim() || `Joueur ${k + 1}`;
            return {
              id: `${teamId}_p${k + 1}`,
              name: safeName,
              avatarDataUrl: null,
              avg3D: 0,
              stars: 0,
            };
          });

          return {
            id: teamId,
            name: teamName,
            avatarDataUrl: null,
            source: "team",
            isBot: false,
            avg3D: 0,
            stars: 0,
            members,
          };
        })
      : (() => {
          // ✅ MODE "Par profils" : regroupement par assignation
          const selectedIds = Array.from(new Set([...playerIds])).filter(Boolean);

          // cap (optionnel) côté pétanque : cap sur JOUEURS -> on tronque puis on normalise
          let effectiveSelectedIds = selectedIds;
          if (capEnabled && effectiveSelectedIds.length > cap) {
            effectiveSelectedIds = shuffle(effectiveSelectedIds).slice(0, cap);
          }

          const teamCount = petanqueTeamCountFromSelected(effectiveSelectedIds.length);
          const normalizedAssignments = normalizePetanqueAssignments(effectiveSelectedIds, teamOfPlayer || {});
          const membersByTeam: string[][] = Array.from({ length: teamCount }, () => []);
          for (const pid of effectiveSelectedIds) {
            const t = normalizedAssignments[pid];
            if (Number.isFinite(t) && t >= 0 && t < teamCount) membersByTeam[t].push(pid);
          }

          return membersByTeam.map((memberIds, idx) => {
            const members = memberIds.slice(0, ts).map((pid) => {
              const pr = profileById[String(pid)];
              const avg = Number(avgMap?.[String(pid)] ?? 0) || 0;
              return {
                id: String(pid),
                name: pr?.name || "Joueur",
                avatarDataUrl: pr?.avatar || null,
                avg3D: avg,
                stars: starsFromAvg3D(avg),
              };
            });

            const avgTeam =
              members.length ? members.reduce((acc: number, m: any) => acc + (Number(m.avg3D) || 0), 0) / members.length : 0;

            return {
              id: `team_${idx + 1}`,
              name: (teamNames?.[idx] || `Équipe ${idx + 1}`).trim() || `Équipe ${idx + 1}`,
              avatarDataUrl: members?.[0]?.avatarDataUrl || null,
              source: "team",
              isBot: false,
              avg3D: avgTeam,
              stars: starsFromAvg3D(avgTeam),
              members,
            };
          });
        })();

    // ✅ seed : aléatoire (toujours en pétanque)
    const seededTeams =
      effectiveSeedMode === "byLevel"
        ? teamEntrants.slice().sort((a: any, b: any) => Number(b.avg3D || 0) - Number(a.avg3D || 0))
        : teamEntrants;

    const entrants = seededTeams;

    // ✅ desiredSize / bracket : exprimé en NOMBRE D'ÉQUIPES
    const desiredSize = computeDesiredSize(entrants.length);

    // ✅ formats autorisés uniquement
    let effectiveFormat: TourFormat = format;
    if (effectiveFormat === "double_ko") effectiveFormat = "single_ko";

    const stages = buildStagesForEngine(effectiveFormat, entrants.length);
    const viewKind = viewKindFromFormat(effectiveFormat);

    const rules = {
      targetScore: 13,
      teamSize: petanqueTeamSize, // 1/2/3/4
      teamLabel:
        petanqueTeamSize === 1 ? "simple" : petanqueTeamSize === 2 ? "doublette" : petanqueTeamSize === 3 ? "triplette" : "quadrette",
      repechageEnabled: !!repechageEnabled,
      seedMode: "random",
      rrRounds: Math.max(1, Number(rrRounds) || 1),
      playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0, // = équipes par poule
      qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0), // = équipes qualifiées/poule
      bracketAuto: !!bracketAuto,
      bracketTarget: Math.floor(numFromText(bracketTarget)) || 0, // nb équipes si manuel
      desiredSize: desiredSize || 0, // nb équipes visé
      maxPlayers: capEnabled ? cap : 0, // cap joueurs (optionnel)
      teams: entrants.map((t: any) => ({
        id: t.id,
        name: t.name,
        memberIds: (t.members || []).map((m: any) => String(m.id)),
      })),
    };

    const tour: Tournament = createTournamentDraft({
      name: name.trim(),
      source: "local",
      ownerProfileId: (store as any)?.activeProfileId ?? null,

      // ✅ ENGINE voit des "players" = équipes
      players: entrants.map((t: any) => ({
        id: String(t.id),
        name: t.name || "Équipe",
        avatarDataUrl: t.avatarDataUrl || null,
        source: "team",
        isBot: false,
      })),

      game: { mode: "petanque", rules },
      stages,

      viewKind,
      repechage: { enabled: !!repechageEnabled },

      meta: {
        format: effectiveFormat,
        seedMode: "random",
        repechageEnabled: !!repechageEnabled,
        rrRounds: Math.max(1, Number(rrRounds) || 1),
        playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
        qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
        bracketAuto: !!bracketAuto,
        bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
        desiredSize: desiredSize || 0, // nb équipes
        autoFillBots: false,
        maxPlayers: capEnabled ? cap : 0,
        forceMode,
        isPetanque: true,
        petanqueTeamSize: petanqueTeamSize,
        petanqueTeams: entrants.map((t: any) => ({
          id: t.id,
          name: t.name,
          members: (t.members || []).map((m: any) => ({ id: m.id, name: m.name, avatarDataUrl: m.avatarDataUrl || null })),
        })),
      },
    } as any);

    const matches = buildInitialMatches(tour);

    try {
      upsertTournamentLocal(tour as any);
      upsertMatchesForTournamentLocal(tour.id, matches as any);
    } catch (e) {
      console.error("[TournamentCreate] persist failed:", e);
    }

    go("tournament_view", { id: tour.id, forceMode });
    return;
  }

  // --------------------------------------------
  // ✅ AUTRES MODES : logique existante (joueurs + bots)
  // --------------------------------------------

  let merged = selectedProfiles.map((p: any) => {
    const avg = Number(avgMap?.[p.id] ?? 0) || 0;
    return {
      id: String(p.id),
      name: p.name || "Joueur",
      avatarDataUrl: p.avatar || null,
      source: "local",
      avg3D: avg,
      stars: starsFromAvg3D(avg),
    };
  });

  // ✅ hors pétanque: possibilité d’ajouter des bots sélectionnés
  const selectedBots = botsCatalog
    .filter((b: any) => botIds.includes(String(b.id)))
    .map((b: any, idx: number) => ({
      id: `bot_${String(b.id)}_${idx}_${Date.now()}`,
      name: b.name,
      avatarDataUrl: b.avatar ?? null,
      source: "bot",
      isBot: true,
      avg3D: Number(b.avg3D) || 0,
      stars: starsFromAvg3D(Number(b.avg3D) || 0),
    }));
  merged = merged.concat(selectedBots);

  if (capEnabled && merged.length > cap) {
    merged = shuffle(merged).slice(0, cap);
  }

  const seededPlayers =
    effectiveSeedMode === "byLevel"
      ? merged.slice().sort((a: any, b: any) => Number(b.avg3D || 0) - Number(a.avg3D || 0))
      : merged;

  let finalPlayers = seededPlayers.slice();

  // ✅ hors pétanque: auto-fill bots possible
  const shouldFill = autoFillBots && format !== "round_robin";
  const desiredSize = computeDesiredSize(finalPlayers.length);

  if (shouldFill && desiredSize && finalPlayers.length < desiredSize) {
    const avgTarget = computeAvgTarget(finalPlayers);
    const need = Math.max(0, desiredSize - finalPlayers.length);
    const bots = pickBotsToFill(botsCatalog, need, avgTarget).map((b: any, idx: number) => ({
      id: `autobot_${String(b.id)}_${idx}_${Date.now()}`,
      name: b.name,
      avatarDataUrl: b.avatar ?? null,
      source: "bot",
      isBot: true,
      avg3D: Number(b.avg3D) || 0,
      stars: starsFromAvg3D(Number(b.avg3D) || 0),
    }));
    finalPlayers = finalPlayers.concat(bots);
  }

  // ✅ règles : X01 spécifiques + autres modes
  const rules =
    mode === "x01"
      ? {
          start: x01Start,
          doubleOut: x01Out === "double",
          inMode: x01In,
          outMode: x01Out,
          bestOf,
          repechageEnabled: !!repechageEnabled,
          seedMode: effectiveSeedMode,
          rrRounds: Math.max(1, Number(rrRounds) || 1),
          playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
          qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
          bracketAuto: !!bracketAuto,
          bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
          desiredSize: desiredSize || 0,
          autoFillBots: !!autoFillBots,
          maxPlayers: capEnabled ? cap : 0,
        }
      : {
          bestOf,
          repechageEnabled: !!repechageEnabled,
          seedMode: effectiveSeedMode,
          rrRounds: Math.max(1, Number(rrRounds) || 1),
          playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
          qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
          bracketAuto: !!bracketAuto,
          bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
          desiredSize: desiredSize || 0,
          autoFillBots: !!autoFillBots,
          maxPlayers: capEnabled ? cap : 0,
        };

  const stages = buildStagesForEngine(format, finalPlayers.length);
  const viewKind = viewKindFromFormat(format);

  const tour: Tournament = createTournamentDraft({
    name: name.trim(),
    source: "local",
    ownerProfileId: (store as any)?.activeProfileId ?? null,

    players: finalPlayers.map((p: any) => ({
      id: String(p.id),
      name: p.name || "Joueur",
      avatarDataUrl: p.avatarDataUrl || null,
      source: p.source || "local",
      isBot: !!p.isBot,
    })),

    game: { mode, rules },
    stages,

    viewKind,
    repechage: { enabled: !!repechageEnabled },

    meta: {
      format,
      seedMode: effectiveSeedMode,
      repechageEnabled: !!repechageEnabled,
      rrRounds: Math.max(1, Number(rrRounds) || 1),
      playersPerGroup: Math.floor(numFromText(playersPerGroup)) || 0,
      qualifiersPerGroup: Math.floor(Number(qualifiersPerGroup) || 0),
      bracketAuto: !!bracketAuto,
      bracketTarget: Math.floor(numFromText(bracketTarget)) || 0,
      desiredSize: desiredSize || 0,
      autoFillBots: !!autoFillBots,
      maxPlayers: capEnabled ? cap : 0,
      forceMode,
      isPetanque,
      petanqueTeamSize: isPetanque ? petanqueTeamSize : undefined,
    },
  } as any);

  const matches = buildInitialMatches(tour);

  try {
    upsertTournamentLocal(tour as any);
    upsertMatchesForTournamentLocal(tour.id, matches as any);
  } catch (e) {
    console.error("[TournamentCreate] persist failed:", e);
  }

  go("tournament_view", { id: tour.id, forceMode });
}

  const computedGroups = React.useMemo(() => {
  if (format !== "groups_ko") return 1;
  const ppg = clamp(Math.floor(numFromText(playersPerGroup)) || 4, 2, 9999);
  const entrants = isPetanque ? Math.max(2, petanqueTeamsCountEffective) : Math.max(2, totalSelectedIds.length);
  return Math.max(1, Math.ceil(entrants / ppg));
}, [format, playersPerGroup, totalSelectedIds.length, isPetanque, petanqueTeamsCountEffective]);

  const desiredSizePreview = React.useMemo(() => {
  const entrants = isPetanque ? Math.max(2, petanqueTeamsCountEffective) : Math.max(2, totalSelectedIds.length);
  const d = computeDesiredSize(entrants);
  return d || 0;
}, [totalSelectedIds.length, bracketAuto, bracketTarget, format, isPetanque, petanqueTeamsCountEffective]);

const petanqueTeamsUI = React.useMemo(() => {
  if (!isPetanque) return [];
  return buildPetanqueTeamsFromAssignments(totalSelectedIds).teams;
}, [isPetanque, totalSelectedIds.join("|"), teamOfPlayer, petanqueTeamSize, teamNames]);


  const infoContent = (() => {
    const k = String(infoKey || "");
    if (k === "players") return { title: "Joueurs", body: <>{OTHER_INFO.players}</> };
    if (k === "botsSelect") return { title: "Bots IA", body: <>{OTHER_INFO.botsSelect}</> };

    if (k === "type_single") return { title: "Élimination (KO)", body: <>{TYPE_INFO.single_ko}</> };
    if (k === "type_double") return { title: "Élimination double", body: <>{TYPE_INFO.double_ko}</> };
    if (k === "type_rr") return { title: "Championnat", body: <>{TYPE_INFO.round_robin}</> };
    if (k === "type_groups") return { title: "Poules + KO", body: <>{TYPE_INFO.groups_ko}</> };

    if (k === "bestof") return { title: "Best-of", body: <>{OTHER_INFO.bestOf}</> };
    if (k === "seed") return { title: "Têtes de série", body: <>{OTHER_INFO.seedMode}</> };
    if (k === "repechage") return { title: "Repêchage", body: <>{OTHER_INFO.repechage}</> };
    if (k === "maxPlayers") return { title: "Max joueurs", body: <>{OTHER_INFO.maxPlayers}</> };
    if (k === "rrRounds") return { title: "Tours RR", body: <>{OTHER_INFO.rrRounds}</> };
    if (k === "groups") return { title: "Poules", body: <>{OTHER_INFO.groups}</> };
    if (k === "bracket") return { title: "Bracket KO", body: <>{OTHER_INFO.bracket}</> };
    if (k === "autofill") return { title: "Auto-fill BOTS IA", body: <>{OTHER_INFO.autofill}</> };
    if (k === "petanqueTeam") return { title: "Composition Pétanque", body: <>{OTHER_INFO.petanqueTeam}</> };

    return { title: "Info", body: <>—</> };
  })();

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
        background: `radial-gradient(circle at top, rgba(247,200,92,0.12) 0, rgba(10,10,14,0) 40%), radial-gradient(circle at 40% 0%, rgba(40,40,56,0.65), rgba(5,5,8,1) 55%, rgba(0,0,0,1) 100%)`,
        minHeight: "100vh",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button
          type="button"
          onClick={() => go("tournaments", { forceMode })}
          style={{
            borderRadius: 999,
            padding: "7px 12px",
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            color: "rgba(255,255,255,0.92)",
            fontWeight: 900,
            cursor: "pointer",
          }}
        >
          ← Retour
        </button>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0.2 }}>
            {isPetanque ? "Créer un tournoi Pétanque" : "Créer un tournoi"}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.75 }}>
            {loadingAvg ? "Calcul niveaux…" : "Configure le tournoi puis crée."}
          </div>
        </div>
      </div>

      {/* Infos */}
      <Section title="Infos du tournoi" subtitle="Nom + choix du mode." accent={primary}>
        <div style={{ display: "grid", gap: 10 }}>
          <div>
            <div style={{ fontSize: 11.5, opacity: 0.82, marginBottom: 6 }}>Nom</div>
            <TextInput value={name} onChange={(e: any) => setName(e.target.value)} placeholder="Nom du tournoi" />
          </div>

          {/* ✅ NEW : Max joueurs */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ fontSize: 11.5, opacity: 0.82 }}>Max joueurs (optionnel)</div>
              <TextInput value={maxPlayers} onChange={(e: any) => setMaxPlayers(e.target.value)} placeholder="Vide = illimité (ex: 128)" />
              <div style={{ fontSize: 11, opacity: 0.65, lineHeight: 1.3 }}>Si trop de profils, l’app prendra un échantillon aléatoire.</div>
            </div>
            <InfoIconButton onClick={() => openInfo("maxPlayers")} />
          </div>

          {/* ✅ MODE */}
          {isPetanque ? (
            <div
              style={{
                borderRadius: 14,
                padding: 12,
                border: `1px solid ${primary}55`,
                background: `linear-gradient(180deg, ${primary}10, rgba(0,0,0,0.25))`,
              }}
            >
              <div style={{ fontSize: 11.5, opacity: 0.82 }}>Mode</div>
              <div style={{ fontSize: 13, fontWeight: 950, color: primary, marginTop: 4 }}>PÉTANQUE (verrouillé)</div>
              <div style={{ fontSize: 11, opacity: 0.7, marginTop: 6 }}>Ce tournoi a été ouvert depuis l’entrée Pétanque (forceMode=petanque).</div>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                <div style={{ display: "grid", gap: 3 }}>
                  <div style={{ fontSize: 11.5, opacity: 0.82 }}>Mode</div>
                  <div style={{ fontSize: 13, fontWeight: 950, color: mode ? primary : "rgba(255,255,255,0.65)" }}>
                    {mode ? MODE_LABEL[mode] : "Aucun mode choisi"}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSheetMode(true)}
                  style={{
                    borderRadius: 999,
                    padding: "8px 12px",
                    border: "none",
                    fontWeight: 950,
                    cursor: "pointer",
                    background: `linear-gradient(90deg, ${primary}, #ffe9a3)`,
                    color: "#1b1508",
                    boxShadow: "0 10px 22px rgba(0,0,0,0.55)",
                    whiteSpace: "nowrap",
                  }}
                >
                  Choisir mode
                </button>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["x01", "cricket", "killer", "shanghai"] as Mode[]).map((m) => (
                  <NeonPill key={m} active={mode === m} label={MODE_LABEL[m]} onClick={() => setMode(m)} primary={primary} />
                ))}
              </div>
            </>
          )}
        </div>
      </Section>

      {/* ✅ PÉTANQUE — COMPOSITION */}
      {isPetanque ? (
        <Section title="Pétanque — Composition" subtitle="Choisis Simple / Doublette / Triplette / Quadrette." accent={primary}>
          <RowTitle label="Taille d’équipe" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <NeonPill active={petanqueTeamSize === 1} label="Simple (1)" onClick={() => setPetanqueTeamSize(1)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 2} label="Doublette (2)" onClick={() => setPetanqueTeamSize(2)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 3} label="Triplette (3)" onClick={() => setPetanqueTeamSize(3)} primary={primary} />
              <NeonPill active={petanqueTeamSize === 4} label="Quadrette (4)" onClick={() => setPetanqueTeamSize(4)} primary={primary} />
            </div>
            <InfoIconButton onClick={() => openInfo("petanqueTeam")} />
          </div>

          <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.8, lineHeight: 1.35 }}>
            {petanqueEntry === "teams" ? (
              <>
                Minimum : <b style={{ color: primary }}>2</b> équipes.<br />
                Chaque équipe doit contenir exactement <b style={{ color: primary }}>{petanqueTeamSize}</b> joueur(s) (noms non vides).
              </>
            ) : (
              <>
                Minimum : <b style={{ color: primary }}>{petanqueMinPlayers}</b> joueurs (2 équipes).<br />
                Total sélectionné doit être un multiple de <b style={{ color: primary }}>{petanqueTeamSize}</b>.
              </>
            )}
          </div>

          {petanqueEntry !== "teams" && !petanqueMinOk ? (
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
              ⚠️ Pas assez de joueurs pour{" "}
              {petanqueTeamSize === 1 ? "Simple" : petanqueTeamSize === 2 ? "Doublette" : petanqueTeamSize === 3 ? "Triplette" : "Quadrette"}.
            </div>
          ) : null}

          {petanqueEntry !== "teams" && petanqueMinOk && !petanqueMultipleOk ? (
            <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
              ⚠️ Total non multiple de {petanqueTeamSize}. Ajoute/enlève des joueurs.
            </div>
          ) : null}
        </Section>
      ) : null}

      {/* ✅ JOUEURS */}
      <Section
        title={isPetanque && petanqueEntry === "teams" ? "Équipes" : "Joueurs"}
        subtitle={
          isPetanque
            ? petanqueEntry === "teams"
              ? "Gros tournoi : saisis directement les équipes (sans profils)."
              : "Sélectionne tes profils (humains uniquement)."
            : "Sélectionne tes profils."
        }
        accent={primary}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 12, opacity: 0.82 }}>
            {isPetanque && petanqueEntry === "teams" ? (
              <>
                <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b> équipe(s)
              </>
            ) : (
              <>
                <b style={{ color: primary }}>{totalSelectedIds.length}</b> sélectionné(s)
                {isPetanque ? (
                  <>
                    {" "}
                    • <span style={{ opacity: 0.85 }}>équipes : </span>
                    <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b>
                  </>
                ) : null}
              </>
            )}
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
            {isPetanque ? (
              <>
                <NeonPill active={petanqueEntry === "profiles"} label="Par profils" onClick={() => setPetanqueEntry("profiles")} small primary={primary} />
                <NeonPill active={petanqueEntry === "teams"} label="Par équipes" onClick={() => setPetanqueEntry("teams")} small primary={primary} />
              </>
            ) : null}

            {(!isPetanque || petanqueEntry === "profiles") ? (
              <>
                <NeonGhost label="Tout sélectionner" onClick={() => setPlayerIds(profiles.map((p: any) => String(p.id)))} />
                <NeonGhost label="Vider" onClick={() => setPlayerIds([])} />
              </>
            ) : null}

            <InfoIconButton onClick={() => openInfo("players")} />
          </div>
        </div>

        {/* HUMAINS (profils) */}
        {(!isPetanque || petanqueEntry === "profiles") ? (
        <div
          style={{
            marginTop: 10,
            display: "flex",
            gap: 14,
            overflowX: "auto",
            overflowY: "visible",
            paddingBottom: 10,
            paddingTop: 10,
            WebkitOverflowScrolling: "touch",
            scrollSnapType: "x mandatory",
          }}
          className="dc-scroll-thin"
        >
          {profiles.map((p: any) => {
            const avg = Number(avgMap?.[p.id] ?? 0) || 0;
            const active = playerIds.includes(p.id);
            return <PlayerCarouselTile key={p.id} active={active} name={p.name} avatarUrl={p.avatar} avg3D={avg} onClick={() => togglePlayer(p.id)} primary={primary} />;
          })}
        </div>
        ) : null}



{/* ✅ PÉTANQUE — ÉQUIPES (composition) */}
{isPetanque && petanqueEntry === "profiles" ? (
  <div style={{ marginTop: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 8 }}>
      <div style={{ fontSize: 12, opacity: 0.82 }}>
        <b style={{ color: primary }}>{petanqueTeamsCountEffective}</b> équipe(s) •{" "}
        <span style={{ opacity: 0.75 }}>taille</span> <b style={{ color: primary }}>{petanqueTeamSize}</b>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
        <NeonPill active={!assignMode} label="Sélection" onClick={() => setAssignMode(false)} small primary={primary} />
        <NeonPill active={assignMode} label="Affectation" onClick={() => setAssignMode(true)} small primary={primary} />
      </div>
    </div>

    <div style={{ fontSize: 11.5, opacity: 0.72, lineHeight: 1.35, marginBottom: 10 }}>
      • <b style={{ color: primary }}>Sélection</b> : clic sur un joueur = ajoute / retire.<br />
      • <b style={{ color: primary }}>Affectation</b> : choisis une équipe ci-dessous, puis clic sur les joueurs pour les mettre dedans (swap automatique si l’équipe est pleine).
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {petanqueTeamsUI.map((t: any) => {
        const isActive = activeTeamIdx === t.idx;
        const members = (t.memberIds || []).map((pid: string) => {
          const pr = profiles.find((p: any) => String(p.id) === String(pid));
          const avg = Number(avgMap?.[String(pid)] ?? 0) || 0;
          return { id: String(pid), name: pr?.name || "Joueur", avatar: pr?.avatar || null, avg3D: avg };
        });

        return (
          <div
            key={t.id}
            style={{
              borderRadius: 16,
              border: isActive ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
              background: isActive ? `linear-gradient(180deg, ${primary}14, rgba(0,0,0,0.22))` : "rgba(9,11,20,0.72)",
              padding: 12,
              boxShadow: isActive ? `0 0 22px ${primary}22` : "none",
            }}
            onMouseDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setActiveTeamIdx(t.idx);
              setAssignMode(true);
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "grid", gap: 6, width: "100%" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, color: primary, fontSize: 12.5 }}>
                    {isActive ? "✓ " : ""}
                    Équipe {t.idx + 1}
                  </div>
                  <div style={{ fontSize: 11.5, opacity: 0.78 }}>
                    {members.length}/{petanqueTeamSize}
                  </div>
                </div>

                <TextInput
                  value={teamNames?.[t.idx] || ""}
                  onChange={(e: any) => setTeamNames((prev: any) => ({ ...(prev || {}), [t.idx]: e.target.value }))}
                  placeholder={`Nom équipe ${t.idx + 1}`}
                />
              </div>
            </div>

            <div style={{ marginTop: 10, display: "flex", gap: 12, overflowX: "auto", paddingBottom: 6, WebkitOverflowScrolling: "touch" }}>
              {members.map((m: any) => (
                <div key={m.id} style={{ display: "grid", justifyItems: "center", gap: 6, minWidth: 92 }}>
                  <PlayerMedallion name={m.name} dataUrl={m.avatar} avg3D={m.avg3D} active primary={primary} />
                  <div style={{ fontSize: 11, fontWeight: 950, opacity: 0.9, maxWidth: 92, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "center" }}>
                    {m.name}
                  </div>
                </div>
              ))}

              {/* emplacements vides */}
              {Array.from({ length: Math.max(0, petanqueTeamSize - members.length) }).map((_, k) => (
                <div
                  key={`empty_${t.id}_${k}`}
                  style={{
                    minWidth: 92,
                    height: 92,
                    borderRadius: 16,
                    border: "1px dashed rgba(255,255,255,0.16)",
                    opacity: 0.6,
                    display: "grid",
                    placeItems: "center",
                    fontSize: 11.5,
                  }}
                >
                  Vide
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>

    {!petanqueTeamsReady ? (
      <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.75 }}>
        ⚠️ Composition invalide : chaque équipe doit contenir exactement {petanqueTeamSize} joueur(s), sans doublon.
      </div>
    ) : null}
  </div>
) : null}

{/* ✅ PÉTANQUE — ENTRÉE "Par équipes" (sans profils) */}
{isPetanque && petanqueEntry === "teams" ? (
  <div style={{ marginTop: 12 }}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10, flexWrap: "wrap" }}>
      <div style={{ display: "grid", gap: 8, minWidth: 240, flex: "1 1 260px" }}>
        <RowTitle label="Recherche équipe" />
        <TextInput value={teamsSearch} onChange={(e: any) => setTeamsSearch(e.target.value)} placeholder="Tape un nom d'équipe…" />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", justifyContent: "flex-end" }}>
        <NeonGhost label="Générer 16" onClick={() => generateTeams(16)} />
        <NeonGhost label="Générer 32" onClick={() => generateTeams(32)} />
        <NeonGhost label="Générer 64" onClick={() => generateTeams(64)} />
        <NeonGhost
          label={teamsImportOpen ? "Fermer import" : "Importer texte"}
          onClick={() => setTeamsImportOpen((v) => !v)}
        />
        <NeonGhost
          label="Ajouter équipe"
          onClick={() => {
            const idx = (teamsInput?.length || 0);
            const next = [...(teamsInput || []), { id: makeTeamId(idx), name: `Équipe ${idx + 1}`, players: normalizeTeamPlayers([]) }];
            setTeamsInput(next);
            setTeamsExpandedIdx(idx);
          }}
        />
      </div>
    </div>

    {teamsImportOpen ? (
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "rgba(9,11,20,0.72)",
          padding: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35, marginBottom: 10 }}>
          1 équipe par ligne. Formats acceptés :<br />
          • <b style={{ color: primary }}>Équipe A</b><br />
          • <b style={{ color: primary }}>Équipe A; joueur1, joueur2</b><br />
          • <b style={{ color: primary }}>Équipe A | joueur1 | joueur2</b>
        </div>

        <textarea
          value={teamsImportText}
          onChange={(e) => setTeamsImportText(e.target.value)}
          placeholder={`Ex:\nÉquipe A; Alice, Bob\nÉquipe B | Charly | David`}
          style={{
            width: "100%",
            minHeight: 120,
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(8,8,12,0.75)",
            color: "#fff",
            padding: "10px 12px",
            fontSize: 13,
            outline: "none",
            resize: "vertical",
          }}
        />

        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 10, flexWrap: "wrap" }}>
          <NeonGhost
            label="Appliquer"
            onClick={() => {
              parseTeamsImportText(teamsImportText);
            }}
          />
          <NeonGhost label="Vider" onClick={() => setTeamsImportText("")} />
        </div>
      </div>
    ) : null}

    <div style={{ fontSize: 11.5, opacity: 0.75, lineHeight: 1.35, marginBottom: 10 }}>
      Rappel : en mode <b style={{ color: primary }}>Par équipes</b>, chaque équipe doit avoir exactement <b style={{ color: primary }}>{petanqueTeamSize}</b> joueur(s)
      (noms non vides) et il faut au minimum <b style={{ color: primary }}>2</b> équipes.
    </div>

    <div style={{ display: "grid", gap: 10 }}>
      {(teamsInput || [])
        .map((t: any, idx: number) => ({ ...t, _idx: idx }))
        .filter((t: any) => {
          const q = String(teamsSearch || "").trim().toLowerCase();
          if (!q) return true;
          const n = String(t?.name || "").toLowerCase();
          return n.includes(q);
        })
        .map((t: any) => {
          const idx = Number(t._idx) || 0;
          const expanded = teamsExpandedIdx === idx;
          const ts = Number(petanqueTeamSize) || 1;
          const players = Array.isArray(t?.players) ? t.players : [];
          const filled = players.map((x: any) => String(x ?? "").trim()).filter(Boolean).length;

          return (
            <div
              key={String(t.id || idx)}
              style={{
                borderRadius: 16,
                border: expanded ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
                background: expanded ? `linear-gradient(180deg, ${primary}14, rgba(0,0,0,0.22))` : "rgba(9,11,20,0.72)",
                padding: 12,
                boxShadow: expanded ? `0 0 22px ${primary}22` : "none",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, cursor: "pointer" }}
                onMouseDown={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setTeamsExpandedIdx((prev) => (prev === idx ? null : idx));
                }}
              >
                <div style={{ fontWeight: 950, color: primary, fontSize: 12.5 }}>
                  {expanded ? "▾ " : "▸ "}Équipe {idx + 1}
                </div>
                <div style={{ fontSize: 11.5, opacity: 0.78 }}>
                  {filled}/{ts}
                </div>
              </div>

              {expanded ? (
                <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
                  <div style={{ display: "grid", gap: 6 }}>
                    <RowTitle label="Nom de l'équipe" />
                    <TextInput
                      value={String(t?.name || "")}
                      onChange={(e: any) => {
                        const v = e.target.value;
                        setTeamsInput((prev) => {
                          const next = [...(prev || [])];
                          const cur = next[idx] || { id: makeTeamId(idx), name: "", players: normalizeTeamPlayers([]) };
                          next[idx] = { ...cur, name: v };
                          return next;
                        });
                      }}
                      placeholder={`Équipe ${idx + 1}`}
                    />
                  </div>

                  <div style={{ display: "grid", gap: 8 }}>
                    <RowTitle label={`Joueurs (exactement ${ts})`} />
                    <div style={{ display: "grid", gap: 8 }}>
                      {Array.from({ length: ts }).map((_, k) => (
                        <TextInput
                          key={`${String(t.id || idx)}_p_${k}`}
                          value={String(players[k] ?? "")}
                          onChange={(e: any) => {
                            const v = e.target.value;
                            setTeamsInput((prev) => {
                              const next = [...(prev || [])];
                              const cur = next[idx] || { id: makeTeamId(idx), name: `Équipe ${idx + 1}`, players: normalizeTeamPlayers([]) };
                              const p = Array.isArray(cur.players) ? [...cur.players] : [];
                              while (p.length < ts) p.push("");
                              p[k] = v;
                              next[idx] = { ...cur, players: p };
                              return next;
                            });
                          }}
                          placeholder={`Joueur ${k + 1}`}
                        />
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, justifyContent: "space-between", flexWrap: "wrap" }}>
                    <NeonGhost
                      label="Supprimer"
                      onClick={() => {
                        setTeamsInput((prev) => {
                          const arr = [...(prev || [])];
                          arr.splice(idx, 1);
                          return arr.map((x: any, i: number) => ({ ...x, name: String(x?.name || `Équipe ${i + 1}`) }));
                        });
                        setTeamsExpandedIdx((prev) => {
                          if (prev == null) return null;
                          if (prev === idx) return null;
                          return prev > idx ? prev - 1 : prev;
                        });
                      }}
                    />

                    <NeonGhost
                      label="Dupliquer"
                      onClick={() => {
                        setTeamsInput((prev) => {
                          const arr = [...(prev || [])];
                          const cur = arr[idx];
                          if (!cur) return arr;
                          const copy = { ...cur, id: makeTeamId(arr.length), name: `${String(cur.name || `Équipe ${idx + 1}`)} (copy)` };
                          arr.splice(idx + 1, 0, copy);
                          return arr;
                        });
                        setTeamsExpandedIdx(idx + 1);
                      }}
                    />
                  </div>
                </div>
              ) : null}
            </div>
          );
        })}
    </div>

    {!petanqueTeamsReady ? (
      <div style={{ marginTop: 10, fontSize: 11.5, opacity: 0.75 }}>
        ⚠️ Équipes invalides : minimum 2 équipes et chaque équipe doit contenir exactement {petanqueTeamSize} joueur(s) (noms non vides).
      </div>
    ) : null}
  </div>
) : null}
        {/* BOTS (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 12, opacity: 0.82 }}>
                <b style={{ color: primary }}>{botIds.length}</b> bot(s)
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end", alignItems: "center" }}>
                <NeonGhost label="Tous les bots" onClick={() => setBotIds(botsCatalog.map((b: any) => String(b.id)))} />
                <NeonGhost label="Aucun bot" onClick={() => setBotIds([])} />
                <InfoIconButton onClick={() => openInfo("botsSelect")} />
              </div>
            </div>

            <div
              style={{
                marginTop: 10,
                display: "flex",
                gap: 14,
                overflowX: "auto",
                overflowY: "visible",
                paddingBottom: 10,
                paddingTop: 10,
                WebkitOverflowScrolling: "touch",
                scrollSnapType: "x mandatory",
              }}
              className="dc-scroll-thin"
            >
              {botsCatalog.map((b: any) => (
                <PlayerCarouselTile
                  key={String(b.id)}
                  active={botIds.includes(String(b.id))}
                  name={b.name}
                  avatarUrl={b.avatar}
                  avg3D={Number(b.avg3D) || 0}
                  isBot
                  onClick={() => toggleBot(String(b.id))}
                  primary={primary}
                />
              ))}
            </div>
          </>
        ) : null}

        {!minPlayersOk ? (
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>
            ⚠️
            {isPetanque
              ? petanqueEntry === "teams"
                ? " Minimum 2 équipes."
                : ` Minimum ${petanqueMinPlayers} joueurs (2 équipes).`
              : " Minimum 2 joueurs."}
          </div>
        ) : null}
      </Section>

      {/* Params match X01 (hors pétanque) */}
      {!isPetanque && mode === "x01" ? (
        <Section title="Match — Paramètres X01" subtitle="Score de départ + IN/OUT." accent={primary}>
          <RowTitle label="Score de départ" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[301, 501, 701, 901].map((v) => (
              <NeonPill key={v} active={x01Start === v} label={String(v)} onClick={() => setX01Start(v as any)} primary={primary} />
            ))}
          </div>

          <div style={{ height: 10 }} />

          <RowTitle label="Mode d’entrée" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={x01In === "simple"} label="Simple IN" onClick={() => setX01In("simple")} primary={primary} />
            <NeonPill active={x01In === "double"} label="Double IN" onClick={() => setX01In("double")} primary={primary} />
            <NeonPill active={x01In === "master"} label="Master IN" onClick={() => setX01In("master")} primary={primary} />
          </div>

          <div style={{ height: 10 }} />

          <RowTitle label="Mode de sortie" />
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={x01Out === "simple"} label="Simple OUT" onClick={() => setX01Out("simple")} primary={primary} />
            <NeonPill active={x01Out === "double"} label="Double OUT" onClick={() => setX01Out("double")} primary={primary} />
            <NeonPill active={x01Out === "master"} label="Master OUT" onClick={() => setX01Out("master")} primary={primary} />
          </div>
        </Section>
      ) : null}

      {/* ✅ Format tournoi */}
      <Section title="Format du tournoi" subtitle={isPetanque ? "Formats Pétanque (réalistes)." : "Chaque option a son (i) comme TYPE."} accent={primary}>
        <RowTitle label="Type" />

        {isPetanque ? (
          <div style={{ display: "grid", gap: 10 }}>
            <LineOption label="Élimination directe (KO)" active={format === "single_ko"} onClick={() => setFormat("single_ko")} onInfo={() => openInfo("type_single")} primary={primary} />
            <LineOption label="Championnat" active={format === "round_robin"} onClick={() => setFormat("round_robin")} onInfo={() => openInfo("type_rr")} primary={primary} />
            <LineOption label="Poules + Phase finale (KO)" active={format === "groups_ko"} onClick={() => setFormat("groups_ko")} onInfo={() => openInfo("type_groups")} primary={primary} />
          </div>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            <LineOption label="Élimination simple" active={format === "single_ko"} onClick={() => setFormat("single_ko")} onInfo={() => openInfo("type_single")} primary={primary} />
            <LineOption label="Élimination double" active={format === "double_ko"} onClick={() => setFormat("double_ko")} onInfo={() => openInfo("type_double")} primary={primary} />
            <LineOption label="Championnat (RR)" active={format === "round_robin"} onClick={() => setFormat("round_robin")} onInfo={() => openInfo("type_rr")} primary={primary} />
            <LineOption label="Poules + KO" active={format === "groups_ko"} onClick={() => setFormat("groups_ko")} onInfo={() => openInfo("type_groups")} primary={primary} />
          </div>
        )}

        <div style={{ height: 14 }} />

        {/* Best-of (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <RowTitle label="Match — Best-of" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {([1, 3, 5, 7] as BestOf[]).map((v) => (
                  <NeonPill key={v} active={bestOf === v} label={`BO${v}`} onClick={() => setBestOf(v)} primary={primary} />
                ))}
              </div>
              <InfoIconButton onClick={() => openInfo("bestof")} />
            </div>

            <div style={{ height: 14 }} />
          </>
        ) : null}

        {/* Têtes de série */}
        {!isPetanque ? (
          <>
            <RowTitle label="Têtes de série" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <NeonPill active={seedMode === "random"} label="Aléatoire" onClick={() => setSeedMode("random")} primary={primary} />
                <NeonPill active={seedMode === "byLevel"} label="Par niveau (avg3D)" onClick={() => setSeedMode("byLevel")} primary={primary} />
              </div>
              <InfoIconButton onClick={() => openInfo("seed")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : (
          <div style={{ fontSize: 11.5, opacity: 0.78, marginBottom: 14 }}>
            Têtes de série : <b style={{ color: primary }}>Aléatoire</b> (Pétanque)
          </div>
        )}

        {(format === "round_robin" || format === "groups_ko") ? (
          <>
            <RowTitle label="Tours (Round Robin)" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <NeonPill key={n} active={rrRounds === n} label={`${n} tour${n > 1 ? "s" : ""}`} onClick={() => setRrRounds(n)} primary={primary} />
                ))}
              </div>
              <InfoIconButton onClick={() => openInfo("rrRounds")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        {format === "groups_ko" ? (
          <>
            <RowTitle label="Poules" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <TextInput value={playersPerGroup} onChange={(e: any) => setPlayersPerGroup(e.target.value)} placeholder={isPetanque ? "Joueurs par poule (ex: 6)" : "Joueurs par poule (ex: 5)"} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[1, 2, 3, 4, 5, 6, 8].map((n) => (
                    <NeonPill key={n} active={qualifiersPerGroup === n} label={`${n} qualif/poule`} onClick={() => setQualifiersPerGroup(n)} primary={primary} />
                  ))}
                </div>
                <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                  Poules auto ≈ <b style={{ color: primary }}>{computedGroups}</b> (sur {isPetanque ? Math.max(2, petanqueTeamsCountEffective) : Math.max(2, totalSelectedIds.length)} {isPetanque ? "équipes" : "joueurs"})
                </div>
              </div>
              <InfoIconButton onClick={() => openInfo("groups")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        {format !== "round_robin" ? (
          <>
            <RowTitle label="Bracket KO" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <NeonPill active={bracketAuto} label={isPetanque ? "Auto (pow2 équipes)" : "Auto (pow2)"} onClick={() => setBracketAuto(true)} primary={primary} />
                  <NeonPill active={!bracketAuto} label={isPetanque ? "Manuel (équipes)" : "Manuel"} onClick={() => setBracketAuto(false)} primary={primary} />
                </div>

                {!bracketAuto ? (
                  <TextInput
                    value={bracketTarget}
                    onChange={(e: any) => setBracketTarget(e.target.value)}
                    placeholder={isPetanque ? "Nb équipes (ex: 8, 16, 24…)" : "Taille bracket (ex: 24, 32, 48...)"}
                  />
                ) : null}

                <div style={{ fontSize: 11, opacity: 0.7, lineHeight: 1.35 }}>
                  Taille visée (aperçu) : <b style={{ color: primary }}>{desiredSizePreview || "—"}</b>
                  {isPetanque ? <span style={{ opacity: 0.75 }}> équipes</span> : null}
                </div>
              </div>
              <InfoIconButton onClick={() => openInfo("bracket")} />
            </div>
            <div style={{ height: 14 }} />
          </>
        ) : null}

        <RowTitle label="Repêchage" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <NeonPill active={repechageEnabled} label="ON" onClick={() => setRepechageEnabled(true)} primary={primary} />
            <NeonPill active={!repechageEnabled} label="OFF" onClick={() => setRepechageEnabled(false)} primary={primary} />
          </div>
          <InfoIconButton onClick={() => openInfo("repechage")} />
        </div>

        {/* Auto-fill (hors pétanque uniquement) */}
        {!isPetanque ? (
          <>
            <div style={{ height: 14 }} />
            <RowTitle label="Auto-fill BOTS IA" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <NeonPill active={autoFillBots} label="ON" onClick={() => setAutoFillBots(true)} disabled={format === "round_robin"} primary={primary} />
                <NeonPill active={!autoFillBots} label="OFF" onClick={() => setAutoFillBots(false)} disabled={format === "round_robin"} primary={primary} />
              </div>
              <InfoIconButton onClick={() => openInfo("autofill")} />
            </div>

            {format === "round_robin" ? <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.75 }}>ℹ️ Auto-fill désactivé en Championnat.</div> : null}
          </>
        ) : null}
      </Section>

      {/* CTA */}
      <div style={{ marginTop: 14 }}>
        <NeonPrimary label="Créer le tournoi" onClick={createTournament} disabled={!canCreate} primary={primary} />
        {!canCreate ? (
          <div style={{ marginTop: 8, fontSize: 11.5, opacity: 0.72 }}>
            ⚠️{" "}
            {isPetanque
              ? `Nom + au moins ${petanqueMinPlayers} joueurs + total multiple de ${petanqueTeamSize}.`
              : "Renseigne un nom, choisis un mode et sélectionne au moins 2 joueurs."}
          </div>
        ) : null}
      </div>

      {/* Sheet mode (DARTS ONLY) */}
      <Sheet open={sheetMode && !isPetanque} title="Choisir un mode" onClose={() => setSheetMode(false)} primary={primary}>
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "grid", gap: 8 }}>
            {(["x01", "cricket", "killer", "shanghai"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  setSheetMode(false);
                }}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: "12px 12px",
                  border: mode === m ? `1px solid ${primary}CC` : "1px solid rgba(255,255,255,0.10)",
                  background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
                  color: "rgba(255,255,255,0.92)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  cursor: "pointer",
                  boxShadow: mode === m ? `0 14px 34px ${primary}22` : "none",
                }}
              >
                <div style={{ display: "grid", gap: 2, textAlign: "left" }}>
                  <div style={{ fontWeight: 950, fontSize: 14, color: primary }}>{MODE_LABEL[m]}</div>
                </div>

                <div
                  style={{
                    width: 34,
                    height: 34,
                    borderRadius: 999,
                    background: `radial-gradient(circle at 30% 0%, ${primary}, ${primary}55)`,
                    boxShadow: `0 0 14px ${primary}33`,
                    display: "grid",
                    placeItems: "center",
                    color: "#120c06",
                    fontWeight: 950,
                  }}
                  aria-hidden
                >
                  ✓
                </div>
              </button>
            ))}
          </div>
        </div>
      </Sheet>

      {/* ✅ Modal info centré */}
      <CenterInfoModal open={infoOpen} title={infoContent.title} primary={primary} onClose={() => setInfoOpen(false)}>
        {infoContent.body}
      </CenterInfoModal>
    </div>
  );
}
