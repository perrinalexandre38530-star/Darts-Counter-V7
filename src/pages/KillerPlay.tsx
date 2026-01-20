// @ts-nocheck
// ============================================
// src/pages/KillerPlay.tsx
// KILLER — PLAY (V1.3 + BOTS) — UI refacto X01-like
//
// ✅ UI PATCH FINAL (demandes user):
// - Carousel header: ENLEVER le "#" devant le numéro
// - Carousel header: ajouter un mini COEUR + vies restantes (dans le chip, à côté du numéro)
// - Halo joueur actif (carousel + liste) : neon thème autour du bloc (pas un gros cadre)
// - Header joueur actif: numéro GROS sans "#"
// - KPI Vies: supprimer l’intitulé (ne garder que le chiffre dans le cœur)
// - KPI Survivants: silhouette buste (sans "SURV"), valeur même taille que KPI vies
// - Liste joueurs: numéro en couleur thème + nom légèrement plus petit
// - Page NON scrollable: seul le bloc "liste joueurs" scrolle (entre header et keypad)
// - Bouton "L" -> "Log" (affiche un panneau flottant)
// - Keypad: remplacer le total volée (ex: 45) par logo Killer actif quand actif
//
// ✅ SFX (mp3 via /public/sfx + fallback beeps):
// - hit: /public/sfx/dart-hit.mp3 (à chaque fléchette)
// - kill S/D/T: /public/sfx/killer-kill-1.mp3 / killer-kill-2.mp3 / killer-kill-3.mp3
// - dead: /public/sfx/killer-dead.mp3
// - intro: /public/sfx/Killer-song.mp3 (joué au 1er geste utilisateur pour éviter blocage autoplay)
// - lastDead: /public/sfx/killer-last-dead.mp3
//
// IMPORTANT (évite erreur Vite import):
// ➜ mets les fichiers mp3 dans: /public/sfx/ (pas import ESModule)
//   ex: public/sfx/dart-hit.mp3
// ============================================

import React from "react";
import type { Store, MatchRecord, Dart as UIDart } from "../lib/types";
import type {
  KillerConfig,
  KillerDamageRule,
  KillerBecomeRule,
} from "./KillerConfig";
import ScoreInputHub from "../components/ScoreInputHub";
import InfoDot from "../components/InfoDot";

import killerActiveIcon from "../assets/icons/killer-active.png";
import killerListIcon from "../assets/icons/killer-list.png";
import deadActiveIcon from "../assets/icons/dead-active.png";
import deadListIcon from "../assets/icons/dead-list.png";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  config: KillerConfig;
  onFinish: (m: MatchRecord | any) => void;
};

type Mult = 1 | 2 | 3;

// ------------------------------------------------------------
// ✅ SFX/VOICE pending events
//
// IMPORTANT: ne jamais déduire un son à jouer via une variable
// locale mutée depuis un setState(updater). En React 18, l'updater
// peut être différé (mode concurrent), donc la variable locale peut
// rester à 0 => le mauvais son se joue.
//
// On stocke l'intention dans une ref, puis on joue le son après.
// ------------------------------------------------------------
type PendingSfx =
  | { kind: "hit" }
  | { kind: "kill"; mult: Mult }
  | { kind: "self_hit"; mult: Mult }
  | { kind: "auto_kill"; mult: Mult }
  | { kind: "death" }
  | { kind: "lastDead" }
  | null;

type ThrowInput = {
  target: number; // 0 = MISS, 1..20, 25 = BULL
  mult: Mult; // S=1 D=2 T=3
};

type KillerPhase = "SELECT" | "ARMING" | "ACTIVE";

type KillerPlayerState = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  isBot?: boolean;
  botLevel?: string;

  number: number; // 0..20
  lives: number; // >=0
  isKiller: boolean;
  eliminated: boolean;

  killerPhase: KillerPhase; // SELECT -> ARMING -> ACTIVE

  kills: number;
  autoKills?: number;
  // ✅ Variantes (stats)
  // Auto-hit = occurrences de touches sur SON numéro en phase ACTIVE quand l'option est activée.
  // (Version B demandée : occurrences, pas pondéré S/D/T)
  selfPenaltyHits?: number;
  // Vies gagnées via LifeSteal / BullHeal (si options activées)
  livesStolen?: number;
  livesHealed?: number;
  hitsOnSelf: number;
  totalThrows: number;
  killerThrows: number;
  offensiveThrows: number;
  killerHits: number;
  uselessHits: number;

  livesTaken: number;
  livesLost: number;

  throwsToBecomeKiller: number;
  becameAtThrow?: number | null;
  eliminatedAt?: number | null;

  hitsBySegment: Record<string, number>;
  hitsByNumber: Record<string, number>;

  lastVisit?: ThrowInput[] | null;
};

type Snapshot = {
  players: KillerPlayerState[];
  turnIndex: number;
  dartsLeft: number;
  visit: ThrowInput[];
  log: string[];
  finished: boolean;
  elimOrder: string[];
  multiplier: Mult;
  events: any[];
  assignIndex: number;
  assignDone: boolean;
};

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function isDouble(mult: Mult) {
  return mult === 2;
}

function canBecomeKiller(rule: KillerBecomeRule, t: ThrowInput) {
  if (rule === "single") return true;
  return isDouble(t.mult);
}

function dmgFrom(mult: Mult, rule: KillerDamageRule): number {
  return rule === "multiplier" ? mult : 1;
}

function nextAliveIndex(players: KillerPlayerState[], from: number) {
  if (!players.length) return 0;
  for (let i = 1; i <= players.length; i++) {
    const idx = (from + i) % players.length;
    if (!players[idx].eliminated) return idx;
  }
  return from;
}

function winner(players: KillerPlayerState[]) {
  const alive = players.filter((p) => !p.eliminated);
  return alive.length === 1 ? alive[0] : null;
}

function fmtThrow(t: ThrowInput) {
  const m = t.mult === 1 ? "S" : t.mult === 2 ? "D" : "T";
  if (t.target === 0) return "MISS";
  if (t.target === 25) return t.mult === 2 ? "DBULL" : "BULL";
  return `${m}${t.target}`;
}

function segmentKey(t: ThrowInput) {
  if (t.target === 0) return "MISS";
  if (t.target === 25) return t.mult === 2 ? "DBULL" : "BULL";
  return fmtThrow(t);
}

function incMap(map: any, key: any, by = 1) {
  const k = String(key);
  const next = { ...(map || {}) };
  next[k] = (Number(next[k]) || 0) + by;
  return next;
}

function normalizeNumberFromHit(target: number) {
  const n = clampInt(target, 0, 25, 0);
  if (n >= 1 && n <= 20) return n;
  return null;
}

// -----------------------------
// BOT helpers
// -----------------------------
function resolveBotSkill(botLevelRaw?: string | null): number {
  const v = String(botLevelRaw || "").toLowerCase().trim();
  if (!v) return 2;

  const digits = v.replace(/[^0-9]/g, "");
  if (digits) {
    const n = parseInt(digits, 10);
    if (Number.isFinite(n)) return Math.max(1, Math.min(5, n));
  }

  if (v.includes("legend") || v.includes("légende")) return 5;
  if (v.includes("prodige")) return 4;
  if (v.includes("pro")) return 4;
  if (v.includes("fort") || v.includes("hard") || v.includes("difficile"))
    return 3;
  if (v.includes("standard") || v.includes("normal") || v.includes("moyen"))
    return 2;
  if (v.includes("easy") || v.includes("facile") || v.includes("débutant"))
    return 1;

  return 2;
}

function rand01() {
  return Math.random();
}

function pickMultForBot(
  skill: number,
  becomeRule: KillerBecomeRule,
  wantsDouble: boolean
): Mult {
  const r = rand01();

  if (wantsDouble) {
    if (skill >= 4) return r < 0.78 ? 2 : r < 0.9 ? 3 : 1;
    if (skill === 3) return r < 0.65 ? 2 : r < 0.78 ? 1 : 3;
    if (skill === 2) return r < 0.55 ? 2 : r < 0.9 ? 1 : 3;
    return r < 0.45 ? 2 : 1;
  }

  if (skill >= 5) return r < 0.55 ? 2 : r < 0.8 ? 3 : 1;
  if (skill === 4) return r < 0.45 ? 2 : r < 0.65 ? 3 : 1;
  if (skill === 3) return r < 0.3 ? 2 : r < 0.4 ? 3 : 1;
  if (skill === 2) return r < 0.18 ? 2 : r < 0.22 ? 3 : 1;
  return r < 0.1 ? 2 : 1;
}

function decideBotThrow(
  me: KillerPlayerState,
  all: KillerPlayerState[],
  config: KillerConfig,
  assignActive: boolean
): ThrowInput {
  const skill = resolveBotSkill(me.botLevel);

  // helpers
  const randInt = (min: number, max: number) =>
    min + Math.floor(Math.random() * (max - min + 1));

  const pickRandomTargetAvoid = (avoid?: number) => {
    if (!avoid || avoid < 1 || avoid > 20) return randInt(1, 20);
    for (let i = 0; i < 10; i++) {
      const n = randInt(1, 20);
      if (n !== avoid) return n;
    }
    let n = randInt(1, 20);
    if (n === avoid) n = avoid === 20 ? 19 : avoid + 1;
    return n;
  };

  // mult choice when attacking (damage rule)
  const pickAttackMult = (): 1 | 2 | 3 => {
    if (config.damageRule !== "multiplier") return 1;

    const r = rand01();
    if (skill <= 1) return r < 0.92 ? 1 : r < 0.99 ? 2 : 3;
    if (skill === 2) return r < 0.82 ? 1 : r < 0.97 ? 2 : 3;
    if (skill === 3) return r < 0.68 ? 1 : r < 0.92 ? 2 : 3;
    if (skill === 4) return r < 0.52 ? 1 : r < 0.84 ? 2 : 3;
    return r < 0.42 ? 1 : r < 0.78 ? 2 : 3;
  };

  const aliveOthers = all.filter((p) => !p.eliminated && p.id !== me.id);

  const missRate =
    skill <= 1
      ? 0.22
      : skill === 2
      ? 0.16
      : skill === 3
      ? 0.1
      : skill === 4
      ? 0.06
      : 0.03;

  // ----------------------------
  // ✅ Variantes Bull
  // ----------------------------
  const bullSplashOn = !!(config as any)?.bullSplash; // BULL/DBULL dmg zone
  const bullHealOn = !!(config as any)?.bullHeal;     // BULL/DBULL heal
  const isKillerActive = me.killerPhase === "ACTIVE";

  const bullBase = skill >= 4 ? 0.03 : 0.015;

  const manyOpponents = aliveOthers.length >= 3;
  const lowLives = (me.lives ?? 0) <= 2;

  // boost bull UNIQUEMENT si variantes utiles en mode killer actif
  const bullBoost =
    isKillerActive && (bullSplashOn || bullHealOn)
      ? (bullSplashOn && manyOpponents ? 0.03 : 0) + (bullHealOn && lowLives ? 0.03 : 0)
      : 0;

  const bullRate = Math.min(0.12, bullBase + bullBoost);

  const r = rand01();
  if (r < missRate) return { target: 0, mult: 1 };
  if (r < missRate + bullRate)
    return { target: 25, mult: rand01() < 0.25 ? 2 : 1 };

  // ✅ phase SELECT (assignation) => bot choisit un numéro random 1..20
  if (assignActive && me.killerPhase === "SELECT") {
    const n = randInt(1, 20);
    return { target: n, mult: 1 };
  }

  // ----------------------------
  // PAS KILLER ACTIF (chercher à devenir killer)
  // ----------------------------
  if (me.killerPhase !== "ACTIVE") {
    if (!me.number) {
      const n = randInt(1, 20);
      return { target: n, mult: 1 };
    }

    const wantsDouble = config.becomeRule === "double";
    const hitOwnRate =
      skill <= 1
        ? 0.55
        : skill === 2
        ? 0.68
        : skill === 3
        ? 0.78
        : skill === 4
        ? 0.88
        : 0.94;

    if (rand01() < hitOwnRate) {
      return {
        target: me.number,
        mult: pickMultForBot(skill, config.becomeRule, wantsDouble),
      };
    }

    const n = randInt(1, 20);
    return { target: n, mult: pickMultForBot(skill, config.becomeRule, false) };
  }

  // ----------------------------
  // KILLER ACTIF : viser une victime
  // ----------------------------
  if (aliveOthers.length === 0) return { target: 0, mult: 1 };

  // ✅ FriendlyFire supprimé => on vise toujours un adversaire vivant
  const eligibleVictims = aliveOthers;

  // si self-penalty ON, on évite aussi son propre numéro en random
  const avoidSelf = !!config.selfHitWhileKiller ? me.number : undefined;

  const hitVictimRate =
    skill <= 1
      ? 0.52
      : skill === 2
      ? 0.66
      : skill === 3
      ? 0.76
      : skill === 4
      ? 0.86
      : 0.92;

  if (rand01() < hitVictimRate) {
    const sorted = [...eligibleVictims].sort(
      (a, b) => (a.lives ?? 0) - (b.lives ?? 0)
    );
    const pick = sorted[0];

    // sécurité anti "même numéro" si ça arrive
    if (avoidSelf && pick.number === avoidSelf) {
      const n = pickRandomTargetAvoid(avoidSelf);
      return { target: n, mult: pickAttackMult() };
    }

    return {
      target: pick.number,
      mult: pickAttackMult(),
    };
  }

  // raté / random : éviter son numéro si self-penalty ON
  const n = pickRandomTargetAvoid(avoidSelf);
  return { target: n, mult: pickAttackMult() };
}

// -----------------------------
// UI helpers
// -----------------------------
const pageBg =
  "radial-gradient(circle at 25% 0%, rgba(255,198,58,.18) 0, rgba(0,0,0,0) 35%), radial-gradient(circle at 80% 30%, rgba(255,198,58,.10) 0, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0a0a0c, #050507 60%, #020203)";

const card: React.CSSProperties = {
  background:
    "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
};

const gold = "#ffc63a";
const gold2 = "#ffaf00";

function toKeypadThrow(visit: ThrowInput[]): UIDart[] {
  const v = (visit || []).slice(0, 3);
  const out: UIDart[] = [];
  for (const t of v) {
    const target = clampInt(t?.target, 0, 25, 0);
    const mult = clampInt(t?.mult, 1, 3, 1) as any;
    out.push({ v: target, mult });
  }
  while (out.length < 3) out.push(undefined as any);
  return out;
}

function fmtChip(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  return `${d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S"}${d.v}`;
}

function chipStyleBig(d?: UIDart): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 56,
    height: 34,
    padding: "0 14px",
    borderRadius: 14,
    fontWeight: 900,
    fontSize: 12,
    letterSpacing: 0.5,
    border: "1px solid rgba(255,255,255,.08)",
    background: "rgba(0,0,0,.55)",
    boxShadow: "0 0 22px rgba(250,213,75,.18)",
  };

  if (!d) return base;
  if (d.v === 0) return { ...base, color: "rgba(255,255,255,.65)" };

  if (d.v === 25) {
    return d.mult === 2
      ? {
          ...base,
          background: "rgba(255,80,80,.14)",
          border: "1px solid rgba(255,80,80,.30)",
          color: "#ffd2d2",
        }
      : {
          ...base,
          background: "rgba(80,180,255,.14)",
          border: "1px solid rgba(80,180,255,.30)",
          color: "#d6efff",
        };
  }

  if (d.mult === 3)
    return {
      ...base,
      background: "rgba(164,80,255,.14)",
      border: "1px solid rgba(164,80,255,.30)",
      color: "#e8d6ff",
    };
  if (d.mult === 2)
    return {
      ...base,
      background: "rgba(80,200,255,.12)",
      border: "1px solid rgba(80,200,255,.30)",
      color: "#d6f3ff",
    };
  return {
    ...base,
    background: "rgba(255,198,58,.10)",
    border: "1px solid rgba(255,198,58,.22)",
    color: "#ffe7b0",
  };
}

function chipStyleMini(d?: UIDart): React.CSSProperties {
  const base: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 28,
    height: 18,
    padding: "0 6px",
    borderRadius: 999,
    fontWeight: 1000,
    fontSize: 10,
    border: "1px solid rgba(255,255,255,.10)",
    background: "rgba(0,0,0,.55)",
    lineHeight: "18px",
    transform: "translateY(-1px)",
  };

  if (!d) return base;
  if (d.v === 0) return { ...base, color: "rgba(255,255,255,.60)" };

  if (d.v === 25) {
    return d.mult === 2
      ? {
          ...base,
          background: "rgba(255,80,80,.14)",
          border: "1px solid rgba(255,80,80,.30)",
          color: "#ffd2d2",
        }
      : {
          ...base,
          background: "rgba(80,180,255,.14)",
          border: "1px solid rgba(80,180,255,.30)",
          color: "#d6efff",
        };
  }

  if (d.mult === 3)
    return {
      ...base,
      background: "rgba(164,80,255,.14)",
      border: "1px solid rgba(164,80,255,.30)",
      color: "#e8d6ff",
    };
  if (d.mult === 2)
    return {
      ...base,
      background: "rgba(80,200,255,.12)",
      border: "1px solid rgba(80,200,255,.30)",
      color: "#d6f3ff",
    };
  return {
    ...base,
    background: "rgba(255,198,58,.10)",
    border: "1px solid rgba(255,198,58,.22)",
    color: "#ffe7b0",
  };
}

function rulesText(config: KillerConfig) {
  const lives = clampInt((config as any)?.lives, 1, 9, 3);

  const numberAssignMode: "none" | "throw" | "random" =
    ((config as any)?.numberAssignMode as any) ||
    (((config as any)?.selectNumberByThrow ? "throw" : "none") as any);

  const selectMode =
    numberAssignMode === "throw" || numberAssignMode === "random";
  const autoKill = truthy(
      (config as any)?.autoKill ??
      (config as any)?.autokill ??
      (config as any)?.auto_kill ??
      (config as any)?.autoKillOn ??
      (config as any)?.autoKillEnabled ??
      (config as any)?.variants?.autoKill ??
      (config as any)?.variants?.autokill ??
      (config as any)?.options?.autoKill ??
      (config as any)?.rules?.autoKill ??
      (config as any)?.settings?.autoKill ??
      (config as any)?.config?.autoKill
    );

  const becomeRuleText =
    config.becomeRule === "double"
      ? "Tu deviens KILLER uniquement si tu touches TON numéro en DOUBLE (Dxx)."
      : "Tu deviens KILLER dès que tu touches TON numéro, même en SIMPLE (Sxx).";

  const damageText =
    config.damageRule === "multiplier"
      ? "Quand tu touches le numéro d’un adversaire, il perd 1/2/3 vies selon S/D/T."
      : "Quand tu touches le numéro d’un adversaire, il perd toujours 1 vie (S/D/T ne change rien).";

  const selectText = selectMode
    ? "Mode sélection: chaque joueur a 1 lancer (une seule fléchette) pour choisir un numéro (#1..#20). Ensuite il doit retoucher SON numéro pour devenir KILLER."
    : "Numéro déjà assigné: tu dois toucher TON numéro pour devenir KILLER.";

  const autoKillText = autoKill
    ? "AutoKill ON: si tu touches TON numéro, tu meurs instant (DEAD)."
    : "AutoKill OFF.";

  return [
    {
      title: "But",
      body: "Tu as un numéro (1…20). D’abord tu dois devenir KILLER, puis éliminer les autres en touchant leur numéro.",
    },
    {
      title: "Départ",
      body: `Chaque joueur commence avec ${lives} vie(s). Un joueur est éliminé quand ses vies tombent à 0.`,
    },
    { title: "Numéro", body: `${selectText}\n${autoKillText}` },
    {
      title: "Devenir KILLER",
      body: `${becomeRuleText}\nImportant : toucher un autre numéro que le tien ne te rend pas KILLER.`,
    },
    {
      title: "Attaquer (quand tu es KILLER)",
      body: `${damageText}\nSi tu réduis un joueur à 0 vie → il est DEAD immédiatement.`,
    },
    {
      title: "Ce qui ne fait rien",
      body: "MISS (0) : aucun effet.\nBULL / DBULL : aucun effet.\nToucher un joueur déjà DEAD : aucun effet.",
    },
    {
      title: "Tour de jeu",
      body: "À ton tour : 3 fléchettes.\nPuis VALIDER pour passer au joueur suivant.\n(En mode sélection: 1 seule fléchette par joueur au tout début.)",
    },
    {
      title: "Fin de partie",
      body: "La partie se termine quand il ne reste plus qu’un seul joueur vivant : il gagne 🏆",
    },
  ];
}

function AvatarMedallion({
  size,
  src,
  name,
}: {
  size: number;
  src?: string | null;
  name?: string;
}) {
  const initials = String(name || "J")
    .trim()
    .slice(0, 1)
    .toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {src ? (
        <img
          src={src}
          alt=""
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            fontWeight: 1000,
            color: "#fff",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function KillerIcon({
  size = 26,
  variant = "active",
}: {
  size?: number;
  variant?: "active" | "list";
}) {
  const src = variant === "list" ? killerListIcon : killerActiveIcon;
  return (
    <img
      src={src}
      alt="Killer"
      style={{
        width: size,
        height: size,
        marginLeft: 6,
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "contain",
        filter: "contrast(1.1) brightness(1.05)",
      }}
    />
  );
}

function DeadIcon({
  size = 18,
  variant = "list",
}: {
  size?: number;
  variant?: "active" | "list";
}) {
  const src = variant === "active" ? deadActiveIcon : deadListIcon;
  return (
    <img
      src={src}
      alt="Dead"
      style={{
        width: size,
        height: size,
        marginLeft: 6,
        display: "inline-block",
        verticalAlign: "middle",
        objectFit: "contain",
        filter: "contrast(1.15) brightness(1.05)",
      }}
    />
  );
}

function StatRow({ label, value }: { label: string; value: any }) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <div style={{ fontSize: 11, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 1000 }}>{value}</div>
    </div>
  );
}

// -----------------------------
// ✅ Heart KPI (VIES) — label supprimé
// ✅ coeur rose clair + chiffre BLANC (lisible)
// -----------------------------
function HeartKpi({ value }: { value: any }) {
  const pink = "#ff79d6"; // coeur rose clair

  return (
    <div
      style={{
        width: 56,
        height: 48,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 10px 18px rgba(255,121,214,.22))",
      }}
    >
      <svg
        width="56"
        height="48"
        viewBox="0 0 48 42"
        style={{ position: "absolute", inset: 0 }}
      >
        <defs>
          <linearGradient id="heartPinkG" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="rgba(255,121,214,.36)" />
            <stop offset="1" stopColor="rgba(0,0,0,.42)" />
          </linearGradient>
        </defs>
        <path
          d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z"
          fill="url(#heartPinkG)"
          stroke="rgba(255,121,214,.82)"
          strokeWidth="1.35"
        />
        {/* glow */}
        <path
          d="M24 39s-17-10.2-17-23C7 10.1 11 6 16 6c3 0 5.6 1.6 7.4 4.2C25.4 7.6 28 6 32 6c5 0 9 4.1 9 10 0 12.8-17 23-17 23z"
          fill="rgba(255,121,214,.10)"
        />
      </svg>

      <div
        style={{
          position: "relative",
          textAlign: "center",
          lineHeight: 1,
          fontSize: 18,
          fontWeight: 1000,
          color: "#fff", // ✅ BLANC
          transform: "translateY(2px)",
          textShadow:
            "0 2px 10px rgba(0,0,0,.55), 0 1px 0 rgba(0,0,0,.35)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// -----------------------------
// ✅ Mini coeur (carousel) — chiffre dedans
// ✅ halo blanc léger (toujours)
// ✅ halo rose léger si actif
// -----------------------------
function MiniHeart({ value, active }: { value: any; active?: boolean }) {
  const filter = active
    ? `drop-shadow(0 0 5px rgba(255,255,255,.30)) drop-shadow(0 0 10px rgba(255,121,214,.38))`
    : `drop-shadow(0 0 5px rgba(255,255,255,.22))`;

  return (
    <div
      style={{
        display: "inline-grid",
        placeItems: "center",
        width: 32,
        height: 28,
        position: "relative",
        filter,
      }}
      aria-label={`Vies: ${value}`}
      title={`Vies: ${value}`}
    >
      <svg width="32" height="28" viewBox="0 0 48 42">
        <path
          d="M24 40s-18-10.8-18-24C6 9.6 10.2 5 16 5c3.1 0 6 1.5 8 4.2C26 6.5 28.9 5 32 5c5.8 0 10 4.6 10 11 0 13.2-18 24-18 24z"
          fill="rgba(255,121,214,.36)"
          stroke="rgba(255,255,255,.55)"   // ✅ halo blanc léger via stroke + drop-shadow
          strokeWidth="1.2"
        />
        <path
          d="M24 39s-17-10.2-17-23C7 10.1 11 6 16 6c3 0 5.6 1.6 7.4 4.2C25.4 7.6 28 6 32 6c5 0 9 4.1 9 10 0 12.8-17 23-17 23z"
          fill="rgba(255,121,214,.12)"
        />
      </svg>

      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "grid",
          placeItems: "center",
          fontSize: 12,
          fontWeight: 1000,
          color: "#fff",
          transform: "translateY(1px)",
          textShadow: "0 0 6px rgba(255,255,255,.22), 0 2px 8px rgba(0,0,0,.55)",
        }}
      >
        {value}
      </div>
    </div>
  );
}

// -----------------------------
// ✅ Survivants KPI (buste)
// - Silhouette BLANCHE
// - Chiffre ROSE FONCÉ + contour blanc
// - Halo rose TRÈS léger autour de la silhouette
// -----------------------------
function SurvivorKpi({ value }: { value: any }) {
  const textPinkDark = "#7a0f44";

  return (
    <div
      style={{
        width: 56,
        height: 48,
        position: "relative",
        display: "grid",
        placeItems: "center",
        filter: "drop-shadow(0 0 4px rgba(255, 55, 170, .16))", // ✅ halo rose très léger
      }}
    >
      <svg
        width="56"
        height="48"
        viewBox="0 0 56 48"
        style={{ position: "absolute", inset: 0 }}
      >
        {/* tête */}
        <path
          d="M28 25c6 0 11-5 11-11S34 3 28 3 17 8 17 14s5 11 11 11z"
          fill="#ffffff"
          stroke="rgba(255,255,255,.9)"
          strokeWidth="1.1"
        />

        {/* buste */}
        <path
          d="M10 45c1-10 10-16 18-16s17 6 18 16"
          fill="#ffffff"
          stroke="rgba(255,255,255,.85)"
          strokeWidth="1.25"
          strokeLinejoin="round"
        />
      </svg>

      {/* chiffre avec CONTOUR BLANC */}
      <div
        style={{
          position: "relative",
          textAlign: "center",
          lineHeight: 1,
          fontSize: 18,
          fontWeight: 1000,
          color: textPinkDark,
          transform: "translateY(2px)",
          textShadow: `
            -1px -1px 0 #fff,
             1px -1px 0 #fff,
            -1px  1px 0 #fff,
             1px  1px 0 #fff,
             0  0  6px rgba(255,255,255,.22)
          `,
        }}
      >
        {value}
      </div>
    </div>
  );
}

function HeaderChip({
  num,
  lives,
  active,
  eliminated,
  name,
  avatar,
}: {
  num: string;
  lives: number;
  active: boolean;
  eliminated: boolean;
  name?: string;
  avatar?: string | null;
}) {
  const halo = active
    ? "0 0 0 1px rgba(255,198,58,.35), 0 0 14px rgba(255,198,58,.25)"
    : "none";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "4px 10px",
        borderRadius: 999,
        background: "rgba(0,0,0,.35)",
        border: "1px solid rgba(255,255,255,.12)",
        boxShadow: halo,
        opacity: eliminated ? 0.4 : 1,
      }}
      title={name}
    >
      <div
        style={{
          fontWeight: 1000,
          fontSize: 13,
          color: "#ffc63a",
        }}
      >
        {num}
      </div>

      <MiniHeart value={lives} active={active} />
    </div>
  );
}

// -----------------------------
// ✅ SFX (mp3 via /public) + fallback beeps
// + UNLOCK (autoplay) : on déclenche au 1er geste utilisateur
// -----------------------------
function useKillerSfx(enabled: boolean) {
  const ctxRef = React.useRef<AudioContext | null>(null);
  const audRef = React.useRef<Record<string, HTMLAudioElement | null>>({});
  const unlockedRef = React.useRef(false);

  // ⚠️ /public/sounds => URL runtime = /sounds/...
  // Robust: essaye plusieurs variantes de casse si ton repo mélange minuscules/majuscules.
  const paths = React.useMemo(() => {
    const cand = (base: string) => {
      // base doit être un chemin "/sounds/xxx.mp3"
      // On tente: tel quel, puis variante avec "Kill"/"Killer" selon les cas.
      const alts: string[] = [base];

      // killer-kill-X => killer-Kill-X
      if (base.includes("killer-kill-")) {
        alts.push(base.replace("killer-kill-", "killer-Kill-"));
      }
      // killer-song => Killer-song
      if (base.includes("killer-song")) {
        alts.push(base.replace("killer-song", "Killer-song"));
      }
      // killer-become => Killer-become
      if (base.includes("killer-become")) {
        alts.push(base.replace("killer-become", "killer-become")); // noop (placeholder)
        alts.push(base.replace("killer-become", "Killer-become"));
      }
      // dead / last-dead => Killer-Dead etc (au cas où)
      if (base.includes("killer-dead")) {
        alts.push(base.replace("killer-dead", "killer-Dead"));
        alts.push(base.replace("killer-dead", "Killer-dead"));
        alts.push(base.replace("killer-dead", "Killer-Dead"));
      }
      if (base.includes("killer-last-dead")) {
        alts.push(base.replace("killer-last-dead", "killer-last-Dead"));
        alts.push(base.replace("killer-last-dead", "Killer-last-dead"));
        alts.push(base.replace("killer-last-dead", "Killer-last-Dead"));
      }
      // dart-hit => Dart-hit
      if (base.includes("dart-hit")) {
        alts.push(base.replace("dart-hit", "dart-Hit"));
        alts.push(base.replace("dart-hit", "Dart-hit"));
        alts.push(base.replace("dart-hit", "Dart-Hit"));
      }

      // unique
      return Array.from(new Set(alts));
    };

    return {
      hit: cand("/sounds/dart-hit.mp3"),
      kill1: cand("/sounds/killer-kill-1.mp3"),
      kill2: cand("/sounds/killer-kill-2.mp3"),
      kill3: cand("/sounds/killer-kill-3.mp3"),
      self1: cand("/sounds/killer-selfhit-1.mp3"),
      self2: cand("/sounds/killer-selfhit-2.mp3"),
      self3: cand("/sounds/killer-selfhit-3.mp3"),
      auto1: cand("/sounds/killer-autokill-1.mp3"),
      auto2: cand("/sounds/killer-autokill-2.mp3"),
      auto3: cand("/sounds/killer-autokill-3.mp3"),
      dead: cand("/sounds/killer-dead.mp3"),
      intro: cand("/sounds/killer-song.mp3"),
      lastDead: cand("/sounds/killer-last-dead.mp3"),
      become: cand("/sounds/killer-become.mp3"),
    };
  }, []);

  const ensureAudio = React.useCallback((cacheKey: string, src: string) => {
    try {
      if (audRef.current[cacheKey]) return audRef.current[cacheKey]!;
      const a = new Audio(src);
      a.preload = "auto";
      a.volume = 0.85;
      audRef.current[cacheKey] = a;
      return a;
    } catch {
      audRef.current[cacheKey] = null;
      return null;
    }
  }, []);

  const playCandidates = React.useCallback(
    (key: string, sources: string[], vol = 0.85, restart = true) => {
      if (!enabled) return false;
      const list = (sources || []).filter(Boolean);
      if (!list.length) return false;

      // Tentative séquentielle (best effort). On log uniquement si tout échoue.
      const tryAt = (i: number) => {
        if (i >= list.length) {
          console.warn("[KillerSFX] all candidates failed:", key, sources);
          return;
        }
        const src = list[i];
        const cacheKey = `${key}::${src}`;
        const a = ensureAudio(cacheKey, src);
        if (!a) return tryAt(i + 1);

        try {
          if (restart) {
            a.pause();
            a.currentTime = 0;
          }
          a.volume = vol;

          // Si le fichier n'existe pas, on recevra souvent onerror / promise rejection
          const onError = () => {
            a.removeEventListener("error", onError as any);
            tryAt(i + 1);
          };
          a.addEventListener("error", onError as any, { once: true } as any);

          const p = a.play();
          if (p && typeof (p as any).catch === "function") {
            (p as any).catch((err: any) => {
              a.removeEventListener("error", onError as any);
              console.warn("[KillerSFX] play failed:", key, src, err);
              tryAt(i + 1);
            });
          }
        } catch (err) {
          console.warn("[KillerSFX] play threw:", key, src, err);
          tryAt(i + 1);
        }
      };

      tryAt(0);
      return true;
    },
    [enabled, ensureAudio]
  );

  const beep = React.useCallback(
    (freq: number, durMs: number, gain = 0.06) => {
      if (!enabled) return;
      try {
        const AC: any =
          (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!AC) return;

        const ctx = ctxRef.current || new AC();
        ctxRef.current = ctx;

        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        g.gain.value = gain;

        o.connect(g);
        g.connect(ctx.destination);

        const t0 = ctx.currentTime;
        o.start(t0);
        o.stop(t0 + durMs / 1000);

        g.gain.setValueAtTime(gain, t0);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
      } catch {}
    },
    [enabled]
  );

  const unlock = React.useCallback(() => {
    if (!enabled) return;
    if (unlockedRef.current) return;
    unlockedRef.current = true;

    try {
      const AC: any =
        (window as any).AudioContext || (window as any).webkitAudioContext;
      if (AC) {
        const ctx = ctxRef.current || new AC();
        ctxRef.current = ctx;
        if (ctx.state === "suspended") ctx.resume().catch(() => {});
      }
    } catch {}

    // précharge (best effort)
    try {
      Object.entries(paths).forEach(([k, srcs]) => {
        const first = (srcs as any)?.[0];
        if (first) ensureAudio(`${k}::${first}`, first);
      });
    } catch {}
  }, [enabled, ensureAudio, paths]);

  return React.useMemo(() => {
    return {
      unlock,

      intro: () => {
        const ok = playCandidates("intro", paths.intro, 0.55, true);
        if (!ok) {
          beep(520, 60, 0.03);
          setTimeout(() => beep(740, 60, 0.03), 80);
        }
      },

      hit: () => {
        const ok = playCandidates("hit", paths.hit, 0.85);
        if (!ok) beep(780, 40, 0.05);
      },

      become: () => {
        const ok = playCandidates("become", paths.become, 0.8, true);
        if (!ok) {
          beep(520, 60, 0.05);
          setTimeout(() => beep(740, 70, 0.05), 70);
          setTimeout(() => beep(980, 90, 0.05), 150);
        }
      },

      // ✅ S/D/T : mult => kill1/kill2/kill3
      kill: (mult: Mult) => {
        const ok =
          mult === 3
            ? playCandidates("kill3", paths.kill3, 0.9)
            : mult === 2
            ? playCandidates("kill2", paths.kill2, 0.9)
            : playCandidates("kill1", paths.kill1, 0.9);

        if (!ok) {
          beep(220, 90, 0.07);
          setTimeout(() => beep(160, 120, 0.07), 90);
        }
      },

      // ✅ SELF-HIT (auto-pénalité) : mult => killer-selfhit-1/2/3
      selfHit: (mult: Mult) => {
        const ok =
          mult === 3
            ? playCandidates("self3", paths.self3, 0.9)
            : mult === 2
            ? playCandidates("self2", paths.self2, 0.9)
            : playCandidates("self1", paths.self1, 0.9);

        if (!ok) {
          beep(320, 80, 0.06);
          setTimeout(() => beep(260, 110, 0.06), 80);
        }
      },

      // ✅ AUTO-KILL : mult => killer-autokill-1/2/3
      autoKill: (mult: Mult) => {
        const ok =
          mult === 3
            ? playCandidates("auto3", paths.auto3, 0.9)
            : mult === 2
            ? playCandidates("auto2", paths.auto2, 0.9)
            : playCandidates("auto1", paths.auto1, 0.9);

        if (!ok) {
          beep(180, 120, 0.07);
          setTimeout(() => beep(140, 160, 0.07), 110);
        }
      },

      death: () => {
        const ok = playCandidates("dead", paths.dead, 0.9);
        if (!ok) {
          beep(180, 140, 0.07);
          setTimeout(() => beep(120, 160, 0.07), 120);
        }
      },

      lastDead: () => {
        const ok = playCandidates("lastDead", paths.lastDead, 0.9, true);
        if (!ok) {
          beep(180, 160, 0.08);
          setTimeout(() => beep(120, 200, 0.08), 140);
          setTimeout(() => beep(90, 260, 0.08), 320);
        }
      },
    };
  }, [beep, paths, playCandidates, unlock]);
}

// -----------------------------
// ✅ VOICE PACK (FR) + anti-répétition + délai post-SFX
// -----------------------------
const KILL_VOICES = [
  "{killer} a touché {victim}.",
  "{killer} vient de shooter {victim}.",
  "{victim} prend un tir de {killer}.",
  "{killer} frappe {victim}.",
  "{victim} se fait punir par {killer}.",
  "{killer} ne rate pas {victim}.",
  "{killer} descend {victim}.",
  "{victim} vient de se faire cueillir par {killer}.",
  "{killer} envoie {victim} au tapis.",
  "{killer} règle son compte à {victim}.",
  "{killer} sanctionne {victim}.",
  "{victim} est touché. Tir signé {killer}.",
  "{killer} claque un hit sur {victim}.",
  "{killer} allume {victim}.",
  "{killer} met la pression sur {victim}.",
  "{killer} vient de marquer sur {victim}.",
];

const SELF_HIT_VOICES = [
  "{killer} s'est auto touché.",
  "Aïe. {killer} se tire dessus.",
  "{killer} fait une erreur et se touche.",
  "Oups. Auto-hit pour {killer}.",
  "{killer} se punit tout seul.",
  "{killer} se met en difficulté.",
  "{killer} se sanctionne.",
  "Mauvaise cible : {killer} se touche.",
  "Auto-touche. {killer} perd des vies.",
];

const AUTO_KILL_VOICES = [
  "{killer} vient de s'auto éliminer.",
  "Auto-kill pour {killer}.",
  "{killer} se sort tout seul de la partie.",
  "{killer} s'élimine sur une erreur.",
  "C'est terminé pour {killer}. Auto-kill.",
  "{killer} s'est mis K.O. tout seul.",
  "Fin de parcours : {killer} s'auto kill.",
];

type VoiceKind = "kill" | "self_hit" | "auto_kill";

function useKillerVoice(enabled: boolean) {
  const lastVoiceAtRef = React.useRef(0);
  const lastLineRef = React.useRef("");

  const pickNonRepeating = React.useCallback((arr: string[]) => {
    if (!arr?.length) return "";
    if (arr.length === 1) return arr[0];
    let tries = 6;
    let next = arr[Math.floor(Math.random() * arr.length)];
    while (tries-- > 0 && next === lastLineRef.current) {
      next = arr[Math.floor(Math.random() * arr.length)];
    }
    lastLineRef.current = next;
    return next;
  }, []);

  const renderTpl = React.useCallback((tpl: string, vars: Record<string, string>) => {
    return String(tpl || "").replace(/\{(\w+)\}/g, (_: any, k: string) => vars[k] ?? "");
  }, []);

  const speakLater = React.useCallback(
    (kind: VoiceKind, vars: { killer: string; victim?: string }, delayMs = 2300) => {
      if (!enabled) return;
      const synth = (globalThis as any).speechSynthesis as SpeechSynthesis | undefined;
      if (!synth) return;

      const now = Date.now();
      if (now - (lastVoiceAtRef.current || 0) < 1800) return;
      lastVoiceAtRef.current = now;

      let pool: string[] = [];
      if (kind === "kill") pool = KILL_VOICES;
      if (kind === "self_hit") pool = SELF_HIT_VOICES;
      if (kind === "auto_kill") pool = AUTO_KILL_VOICES;

      const tpl = pickNonRepeating(pool);
      const text = renderTpl(tpl, {
        killer: vars.killer || "Quelqu'un",
        victim: vars.victim || "",
      }).trim();

      if (!text) return;

      setTimeout(() => {
        try {
          const u = new SpeechSynthesisUtterance(text);
          u.lang = "fr-FR";
          u.rate = 1.0;
          u.pitch = 1.0;
          try {
            // évite superpositions (on préfère une phrase claire)
            synth.cancel();
          } catch {}
          synth.speak(u);
        } catch {}
      }, delayMs);
    },
    [enabled, pickNonRepeating, renderTpl]
  );

  return React.useMemo(() => ({ speakLater }), [speakLater]);
}

// -----------------------------
// ✅ Header carousel (avatar zoom + dégradé + numéro + mini cœur vies)
// ✅ CHANGE: plus de "K" sur la photo -> logo killer AVANT le numéro
// ✅ NEW: auto-center scroll sur joueur actif
// ✅ UX: marges réduites + petit padding-top pour voir le halo
// -----------------------------

function KillerBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <div
      style={{
        width: size + 10,
        height: size + 10,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,198,58,.18)",
        border: "1px solid rgba(255,198,58,.35)",
        boxShadow: "0 0 10px rgba(255,198,58,.12)",
      }}
      aria-label="Killer"
      title="Killer"
    >
      <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
        <path
          d="M12 2c3.9 0 7 3.1 7 7 0 2.9-1.7 5.4-4.2 6.5V19c0 1.1-.9 2-2 2h-1.6c-1.1 0-2-.9-2-2v-3.5C5.7 14.4 4 11.9 4 9c0-3.9 3.1-7 8-7z"
          fill="#fff"
          opacity={0.95}
        />
        <path d="M9 10.2c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1zm6 0c.6 0 1 .4 1 1s-.4 1-1 1-1-.4-1-1 .4-1 1-1z" fill="#111" />
      </svg>
    </div>
  );
}

function DeadBadgeIcon({ size = 14 }: { size?: number }) {
  return (
    <div
      style={{
        width: size + 10,
        height: size + 10,
        borderRadius: 999,
        display: "grid",
        placeItems: "center",
        background: "rgba(255,80,80,.18)",
        border: "1px solid rgba(255,80,80,.35)",
        boxShadow: "0 0 10px rgba(255,80,80,.12)",
      }}
      aria-label="Dead"
      title="Dead"
    >
      <span style={{ fontSize: size, lineHeight: 1, transform: "translateY(-0.5px)" }}>☠</span>
    </div>
  );
}

function ZoomAvatarChip({
  src,
  name,
  num,
  lives,
  isActive,
  eliminated,
  badge,
  theme,
}: {
  src?: string | null;
  name?: string;
  num: string;
  lives: number;
  isActive: boolean;
  eliminated: boolean;
  badge?: "K" | "D" | null;
  theme: string;
}) {
  const initials = String(name || "J")
    .trim()
    .slice(0, 1)
    .toUpperCase();

  const neon = isActive
    ? `0 0 0 1px rgba(255,198,58,.25), 0 0 18px rgba(255,198,58,.18), 0 0 42px rgba(255,198,58,.10)`
    : "none";

  return (
    <div
      style={{
        flex: "0 0 auto",
        height: 42,
        borderRadius: 999,
        overflow: "hidden",
        display: "grid",
        gridTemplateColumns: "52px 1fr",
        alignItems: "stretch",
        border: "1px solid rgba(255,255,255,0.18)",
        background: "rgba(0,0,0,0.22)",
        opacity: eliminated ? 0.45 : 1,
        boxShadow: neon,
      }}
      title={name}
    >
      <div style={{ position: "relative", width: 52, height: 42, overflow: "hidden" }}>
        {src ? (
          <img
            src={src}
            alt=""
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              transform: "scale(1.35) translateY(2px)",
              transformOrigin: "center",
              filter: "contrast(1.05) saturate(1.05)",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "grid",
              placeItems: "center",
              background: "rgba(255,255,255,.06)",
              borderRight: "1px solid rgba(255,255,255,.08)",
              fontWeight: 1000,
            }}
          >
            {initials}
          </div>
        )}
        {/* ❌ plus de badge "K" sur la photo */}
      </div>

      {/* ✅ NUM + ICON KILLER/DEAD + COEUR */}
      <div
        style={{
          position: "relative",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 8,
          padding: "0 10px",
        }}
      >
        {badge === "K" ? <KillerBadgeIcon size={14} /> : badge === "D" ? <DeadBadgeIcon size={14} /> : null}

        <div
          style={{
            fontSize: 20,
            fontWeight: 1000,
            color: theme,
            letterSpacing: 0.6,
            textShadow: isActive ? `0 0 12px rgba(255,198,58,.16)` : "none",
          }}
        >
          {num}
        </div>

        <MiniHeart value={lives} active={isActive} />
      </div>
    </div>
  );
}

function TargetsCarousel({
  players,
  activeId,
  theme,
  blindMask,
}: {
  players: KillerPlayerState[];
  activeId?: string | null;
  theme: string;
  blindMask?: boolean;
}) {
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const itemRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  React.useEffect(() => {
    if (!activeId) return;
    const wrap = wrapRef.current;
    const el = itemRefs.current[activeId];
    if (!wrap || !el) return;

    const wrapRect = wrap.getBoundingClientRect();
    const elRect = el.getBoundingClientRect();

    const wrapCenter = wrapRect.left + wrapRect.width / 2;
    const elCenter = elRect.left + elRect.width / 2;

    const delta = elCenter - wrapCenter;
    wrap.scrollBy({ left: delta, behavior: "smooth" });
  }, [activeId, players.length]);

  return (
    <div style={{ padding: "2px 2px 0px", marginTop: 2 }}>
      <div
        ref={wrapRef}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 4,
          paddingTop: 2, // ✅ laisse respirer pour voir halo
          WebkitOverflowScrolling: "touch",
        }}
      >
        {players.map((p) => {
          const isActive = p.id === activeId;
          const num = blindMask
            ? "?"
            : p.killerPhase === "SELECT"
            ? "?"
            : String(p.number || "?");
          const badge = p.eliminated
            ? ("D" as any)
            : p.killerPhase === "ACTIVE"
            ? ("K" as any)
            : null;

          return (
            <div key={p.id} ref={(node) => (itemRefs.current[p.id] = node)}>
              <ZoomAvatarChip
                src={p.avatarDataUrl}
                name={p.name}
                num={num}
                lives={p.lives ?? 0}
                isActive={isActive}
                eliminated={!!p.eliminated}
                badge={badge}
                theme={theme}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}


// -----------------------------
// ✅ Assign overlay + keypad 1..20 (CENTRÉ)
// -----------------------------
function AssignOverlay({
  open,
  player,
  index,
  total,
  takenNumbers,
  onPickNumber,
}: {
  open: boolean;
  player?: KillerPlayerState | null;
  index: number;
  total: number;
  takenNumbers: Set<number>;
  onPickNumber: (n: number) => void;
}) {
  if (!open || !player) return null;

  const btn: React.CSSProperties = {
    height: 40,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.42)",
    color: "#fff",
    fontWeight: 1000,
    cursor: "pointer",
    boxShadow: "0 10px 24px rgba(0,0,0,.25)",
    userSelect: "none",
    WebkitTapHighlightColor: "transparent",
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9000,
        display: "grid",
        placeItems: "center",
        padding: 14,
        pointerEvents: "none",
      }}
    >
      <div
        style={{
          ...card,
          pointerEvents: "auto",
          width: "min(520px, 100%)",
          padding: 14,
          border: "1px solid rgba(255,198,58,.22)",
          background:
            "linear-gradient(180deg, rgba(22,22,23,.92), rgba(8,8,10,.96))",
          boxShadow: "0 18px 55px rgba(0,0,0,.65)",
        }}
      >
        <div
          style={{
            fontWeight: 1000,
            letterSpacing: 1.6,
            textTransform: "uppercase",
            color: gold,
            textAlign: "center",
            fontSize: 12,
          }}
        >
          ASSIGNATION DU NUMÉRO
        </div>

        <div
          style={{
            marginTop: 10,
            display: "grid",
            gridTemplateColumns: "72px 1fr",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: 6 }}>
            <AvatarMedallion
              size={64}
              src={player.avatarDataUrl}
              name={player.name}
            />
            <div
              style={{
                fontSize: 12,
                fontWeight: 1000,
                textAlign: "center",
              }}
            >
              {player.name}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            <div style={{ fontSize: 12, opacity: 0.9, lineHeight: 1.25 }}>
              <b>Lance une fléchette pour définir ta zone</b>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(5, 1fr)",
                gap: 8,
              }}
            >
              {Array.from({ length: 20 }, (_, i) => i + 1).map((n) => {
                const isTaken = takenNumbers?.has(n);
                return (
                  <button
                    key={n}
                    type="button"
                    disabled={isTaken}
                    onClick={() => {
                      if (isTaken) return;
                      onPickNumber(n);
                    }}
                    style={{
                      ...btn,
                      opacity: isTaken ? 0.35 : 1,
                      cursor: isTaken ? "not-allowed" : "pointer",
                      filter: isTaken ? "grayscale(1)" : "none",
                      border: isTaken
                        ? "1px solid rgba(255,255,255,.08)"
                        : "1px solid rgba(255,255,255,.12)",
                      background: isTaken
                        ? "rgba(0,0,0,.25)"
                        : "rgba(0,0,0,.42)",
                      color: isTaken ? "rgba(255,255,255,.45)" : "#fff",
                      boxShadow: isTaken ? "none" : (btn.boxShadow as any),
                    }}
                    title={isTaken ? "Déjà pris" : `Choisir ${n}`}
                  >
                    {n}
                  </button>
                );
              })}
            </div>

            <div style={{ fontSize: 11, opacity: 0.75, textAlign: "center" }}>
              Joueur {index + 1}/{total} • ensuite on passe au suivant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ✅ Ajoute ce helper (au-dessus de KillerPlay, avec les autres helpers)
function truthy(v: any) {
  if (v === true || v === 1) return true;
  const s = String(v ?? "").toLowerCase().trim();
  return s === "true" || s === "1" || s === "on" || s === "yes" || s === "enabled";
}

export default function KillerPlay({ store, go, config, onFinish }: Props) {
  const startedAt = React.useMemo(() => Date.now(), []);
  const finishedRef = React.useRef(false);
  const elimOrderRef = React.useRef<string[]>([]);
  const introPlayedRef = React.useRef(false);
  const lastDeadPlayedRef = React.useRef(false);

  // ✅ Son/voix à jouer après la mise à jour d'état (robuste React 18)
  const pendingSfxRef = React.useRef<PendingSfx>(null);
  const pendingDeathAfterRef = React.useRef(false);
  const pendingVoiceRef = React.useRef<
    { kind: VoiceKind; killer: string; victim?: string } | null
  >(null);

  const numberAssignMode: "none" | "throw" | "random" =
    ((config as any)?.numberAssignMode as any) ||
    (((config as any)?.selectNumberByThrow ? "throw" : "none") as any);

  const inNumberAssignRound =
    numberAssignMode === "throw" || numberAssignMode === "random";

  // ✅ AutoKill ON/OFF (ROBUSTE : supporte plusieurs structures de config)
const autoKillOn = truthy(
  (config as any)?.autoKill ??
    (config as any)?.autokill ??
    (config as any)?.auto_kill ??
    (config as any)?.autoKillOn ??
    (config as any)?.autoKillEnabled ??
    (config as any)?.variants?.autoKill ??
    (config as any)?.variants?.autokill ??
    (config as any)?.options?.autoKill ??
    (config as any)?.rules?.autoKill ??
    (config as any)?.settings?.autoKill ??
    (config as any)?.config?.autoKill
);

React.useEffect(() => {
  console.log("[KILLER] autoKillOn =", autoKillOn, "config =", config);
}, [autoKillOn, config]);

  // ✅ SFX enabled by default (sauf config.sfx === false)
  const sfxEnabled = (config as any)?.sfx === false ? false : true;
  const sfx = useKillerSfx(sfxEnabled);

  // ✅ Voice IA (TTS navigateur) — ON par défaut (désactivable via config.voice === false)
  const voiceEnabled = (config as any)?.voice === false ? false : true;
  const voice = useKillerVoice(voiceEnabled);

// ✅ UNLOCK audio + intro :
// - si l'utilisateur a déjà interagi avant d'arriver ici => on tente DIRECT
// - sinon => on écoute le 1er geste en CAPTURE (les overlays peuvent stopPropagation)
React.useEffect(() => {
  if (!sfxEnabled) return;

  const tryStartIntroNow = () => {
    try {
      sfx.unlock?.();
    } catch {}
    if (!introPlayedRef.current) {
      introPlayedRef.current = true;
      try {
        sfx.intro?.();
      } catch {}
    }
  };

  // ✅ cas #1 : le user a déjà cliqué (ex: "Lancer la partie" juste avant)
  try {
    const ua: any = (navigator as any).userActivation;
    if (ua?.hasBeenActive) {
      tryStartIntroNow();
      return;
    }
  } catch {}

  // ✅ cas #2 : sinon on attend le 1er geste utilisateur (CAPTURE)
  const onFirstGesture = () => {
    tryStartIntroNow();
  };

  window.addEventListener("pointerdown", onFirstGesture, { once: true, capture: true } as any);
  window.addEventListener("touchstart", onFirstGesture, { once: true, capture: true } as any);
  window.addEventListener("mousedown", onFirstGesture, { once: true, capture: true } as any);
  window.addEventListener("keydown", onFirstGesture, { once: true, capture: true } as any);

  return () => {
    window.removeEventListener("pointerdown", onFirstGesture as any, true as any);
    window.removeEventListener("touchstart", onFirstGesture as any, true as any);
    window.removeEventListener("mousedown", onFirstGesture as any, true as any);
    window.removeEventListener("keydown", onFirstGesture as any, true as any);
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [sfxEnabled]);

  const [events, setEvents] = React.useState<any[]>([]);
  function pushEvent(e: any) {
    setEvents((prev) => [e, ...prev].slice(0, 800));
  }

  const [assignDone, setAssignDone] = React.useState<boolean>(() => !inNumberAssignRound);
  const [assignIndex, setAssignIndex] = React.useState<number>(0);

  const [log, setLog] = React.useState<string[]>([]);
  function pushLog(line: string) {
    setLog((prev) => [line, ...prev].slice(0, 200));
  }

  const [showLog, setShowLog] = React.useState(false);

  const initialPlayers: KillerPlayerState[] = React.useMemo(() => {
    const lives = clampInt(config?.lives, 1, 9, 3);

    const base = (config?.players || []).map((p) => {
      const phase: KillerPhase = inNumberAssignRound ? "SELECT" : "ARMING";
      return {
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
        number: inNumberAssignRound ? 0 : clampInt(p.number, 1, 20, 1),
        lives,
        isKiller: false,
        eliminated: false,
        killerPhase: phase,
        kills: 0,
        autoKills: 0,
        selfPenaltyHits: 0,
        livesStolen: 0,
        livesHealed: 0,
        hitsOnSelf: 0,
        totalThrows: 0,
        killerThrows: 0,
        offensiveThrows: 0,
        killerHits: 0,
        uselessHits: 0,
        livesTaken: 0,
        livesLost: 0,
        throwsToBecomeKiller: 0,
        becameAtThrow: null,
        eliminatedAt: null,
        hitsBySegment: {},
        hitsByNumber: {},
        lastVisit: null,
      };
    });

    if (numberAssignMode === "random") {
      // 🔀 shuffle des joueurs (ORDRE DE JEU RÉELLEMENT ALÉATOIRE)
      for (let i = base.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [base[i], base[j]] = [base[j], base[i]];
      }
    
      // 🎯 pool des numéros 1..20
      const pool = Array.from({ length: 20 }, (_, i) => i + 1);
    
      // 🔀 shuffle des numéros
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
    
      // ✅ assignation numéros + phase ARMING (et reset flags)
      base.forEach((p, idx) => {
        p.number = pool[idx % pool.length]; // si >20 joueurs, ça recycle (ok)
        p.killerPhase = "ARMING";
        p.isKiller = false;
        p.eliminated = false; // ✅ safety
      });
    }

    return base;
  }, [config, inNumberAssignRound, numberAssignMode]);

  const [players, setPlayers] = React.useState<KillerPlayerState[]>(initialPlayers);

  const [turnIndex, setTurnIndex] = React.useState<number>(() => {
    const i = initialPlayers.findIndex((p) => !p.eliminated);
    return i >= 0 ? i : 0;
  });

  const [dartsLeft, setDartsLeft] = React.useState<number>(() => {
    const me = initialPlayers[turnIndex] ?? initialPlayers[0];
    return me?.killerPhase === "SELECT" ? 1 : 3;
  });

  const [visit, setVisit] = React.useState<ThrowInput[]>([]);
  const [finished, setFinished] = React.useState<boolean>(false);
  const [multiplier, setMultiplier] = React.useState<Mult>(1);
  const [showRules, setShowRules] = React.useState(false);

  const [endRec, setEndRec] = React.useState<any>(null);
  const [showEnd, setShowEnd] = React.useState(false);

  const undoRef = React.useRef<Snapshot[]>([]);
  const botTimerRef = React.useRef<any>(null);
  const botBusyRef = React.useRef(false);

  const current = players[turnIndex] ?? players[0];
  const w = winner(players);
  const aliveCount = players.filter((p) => !p.eliminated).length;
  const isBotTurn = !!current?.isBot;

  const inputDisabledBase =
    finished || !!w || !current || current.eliminated || showEnd;

  const waitingValidate =
    !inputDisabledBase && !isBotTurn && dartsLeft === 0;

  const assignActive =
    inNumberAssignRound && !assignDone && numberAssignMode === "throw";
  const assignPlayer = assignActive ? (players[assignIndex] || players[0]) : null;

  const takenNumbers = React.useMemo(() => {
    const s = new Set<number>();
    for (const p of players) {
      if (!p) continue;
      if (p.eliminated) continue;
      if (p.killerPhase === "SELECT") continue;
      const n = clampInt(p.number, 0, 25, 0);
      if (n >= 1 && n <= 20) s.add(n);
    }
    return s;
  }, [players]);

  function snapshot() {
    const snap: Snapshot = {
      players: players.map((p) => ({
        ...p,
        hitsBySegment: { ...(p.hitsBySegment || {}) },
        hitsByNumber: { ...(p.hitsByNumber || {}) },
        lastVisit: (p.lastVisit || []).map((t) => ({ ...t })),
      })),
      turnIndex,
      dartsLeft,
      visit: visit.map((t) => ({ ...t })),
      log: log.slice(),
      finished,
      elimOrder: (elimOrderRef.current || []).slice(),
      multiplier,
      events: events.slice(),
      assignIndex,
      assignDone,
    };
    undoRef.current = [snap, ...undoRef.current].slice(0, 60);
  }

  function undo() {
    const s = undoRef.current[0];
    if (!s) return;

    undoRef.current = undoRef.current.slice(1);

    if (botTimerRef.current) {
      clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
    }
    botBusyRef.current = false;

    setPlayers(s.players);
    setTurnIndex(s.turnIndex);
    setDartsLeft(s.dartsLeft);
    setVisit(s.visit);
    setLog(s.log);
    setFinished(s.finished);
    setMultiplier((s.multiplier || 1) as Mult);
    setEvents(s.events || []);
    setAssignIndex(s.assignIndex || 0);
    setAssignDone(!!s.assignDone);
  }

  function endTurn(nextPlayers?: KillerPlayerState[]) {
    const base = nextPlayers || players;

    setPlayers((prev) => {
      const next = prev.map((p, i) => {
        if (i !== turnIndex) return p;
        return {
          ...p,
          lastVisit: (visit || []).slice(0, 3).map((t) => ({ ...t })),
        };
      });
      return next;
    });

    setVisit([]);
    setMultiplier(1);

    setTurnIndex((prev) => {
      const nextIdx = nextAliveIndex(base, prev);
      const nextP = base[nextIdx];
      setDartsLeft(nextP?.killerPhase === "SELECT" ? 1 : 3);
      return nextIdx;
    });
  }

  function finishAssignIfReady() {
    setPlayers((prev) => {
      const allHave = prev.every(
        (p) => p.eliminated || (p.number && p.number >= 1 && p.number <= 20)
      );
      if (!allHave) return prev;

      const next = prev.map((p) => {
        if (p.eliminated) return p;
        return {
          ...p,
          killerPhase: p.killerPhase === "SELECT" ? "ARMING" : p.killerPhase,
          isKiller: false,
        };
      });

      setAssignDone(true);

      const firstAlive = next.findIndex((p) => !p.eliminated);
      const idx = firstAlive >= 0 ? firstAlive : 0;
      setTurnIndex(idx);
      setDartsLeft(3);
      setVisit([]);
      setMultiplier(1);

      pushLog("✅ Assignation terminée. La partie commence !");
      pushEvent({ t: Date.now(), type: "ASSIGN_DONE" });

      return next;
    });
  }

  function getOrderedFinalPlayers(finalPlayers: KillerPlayerState[], elimOrder: string[]) {
    const alive = finalPlayers.filter((p) => !p.eliminated);

    const seen = new Set<string>();
    const deadIds = (elimOrder || [])
      .filter(Boolean)
      .filter((id) => {
        const k = String(id);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

    const deadById = new Map(
      finalPlayers.filter((p) => p.eliminated).map((p) => [p.id, p])
    );

    const orderedDead: KillerPlayerState[] = [];
    for (let i = deadIds.length - 1; i >= 0; i--) {
      const p = deadById.get(deadIds[i]);
      if (p) orderedDead.push(p);
    }

    const already = new Set(orderedDead.map((p) => p.id));
    const remainingDead = finalPlayers
      .filter((p) => p.eliminated && !already.has(p.id))
      .sort((a, b) => Number(b.eliminatedAt || 0) - Number(a.eliminatedAt || 0));

    return [...alive, ...orderedDead, ...remainingDead];
  }

  function makeMatchId(prefix: string, ts: number) {
    return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function buildMatchRecord(
    finalPlayersRaw: KillerPlayerState[],
    winnerId: string,
    elim: string[]
  ) {
    const finishedAt = Date.now();
    const id = makeMatchId("killer", finishedAt);

    const ordered = getOrderedFinalPlayers(finalPlayersRaw, elim);

    const detailedByPlayer: Record<string, any> = {};
    for (const p of finalPlayersRaw) {
      detailedByPlayer[p.id] = {
        playerId: p.id,
        profileId: p.id,
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
        number: p.number,
        eliminated: !!p.eliminated,
        isKiller: p.killerPhase === "ACTIVE",
        killerPhase: p.killerPhase,
        kills: p.kills,
        autoKills: p.autoKills ?? 0,
        selfPenaltyHits: p.selfPenaltyHits ?? 0,
        livesStolen: p.livesStolen ?? 0,
        livesHealed: p.livesHealed ?? 0,
        hitsOnSelf: p.hitsOnSelf,
        totalThrows: p.totalThrows,
        killerThrows: p.killerThrows,
        offensiveThrows: p.offensiveThrows,
        killerHits: p.killerHits,
        uselessHits: p.uselessHits,
        livesTaken: p.livesTaken,
        livesLost: p.livesLost,
        throwsToBecomeKiller: p.becameAtThrow ? p.becameAtThrow : p.throwsToBecomeKiller,
        hitsBySegment: p.hitsBySegment || {},
        hitsByNumber: p.hitsByNumber || {},
      };
    }

    const ranking = ordered.map((p, idx) => ({
      playerId: p.id,
      rank: idx + 1,
      name: p.name,
      number: p.number,
      eliminated: p.eliminated,
      kills: p.kills,
      autoKills: p.autoKills ?? 0,
      livesTaken: p.livesTaken,
    }));

    const resumeId = (config as any)?.resumeId || null;
    const perPlayer = (config as any)?.perPlayer || null;

    const rec: any = {
      id,
      resumeId,
      kind: "killer",
      status: "finished",
      createdAt: startedAt,
      updatedAt: finishedAt,
      winnerId,
      players: finalPlayersRaw.map((p) => ({
        id: p.id,
        name: p.name,
        avatarDataUrl: p.avatarDataUrl ?? null,
        isBot: !!p.isBot,
        botLevel: p.botLevel ?? "",
      })),
      summary: {
        mode: "killer",
        livesStart: config.lives,
        becomeRule: config.becomeRule,
        damageRule: config.damageRule,
        detailedByPlayer,
        perPlayer,
        ranking,
      },
      payload: {
        mode: "killer",
        config,
        resumeId,
        summary: { mode: "killer", detailedByPlayer, perPlayer, ranking },
      },
    };

    return rec as MatchRecord;
  }

  // ✅ Variantes robustes (supporte plusieurs structures config)
const selfPenaltyOn = truthy(
  (config as any)?.selfHitWhileKiller ??
    (config as any)?.selfPenalty ??
    (config as any)?.self_penalty ??
    (config as any)?.variants?.selfHitWhileKiller ??
    (config as any)?.variants?.selfPenalty ??
    (config as any)?.variants?.self_penalty ??
    (config as any)?.options?.selfPenalty ??
    (config as any)?.rules?.selfPenalty
);

const selfPenaltyMultOn = truthy(
  (config as any)?.selfHitUsesMultiplier ??
    (config as any)?.selfPenaltyMultiplier ??
    (config as any)?.self_penalty_multiplier ??
    (config as any)?.variants?.selfHitUsesMultiplier ??
    (config as any)?.variants?.selfPenaltyMultiplier ??
    (config as any)?.options?.selfPenaltyMultiplier ??
    (config as any)?.rules?.selfPenaltyMultiplier
);

const lifeStealOn = truthy(
  (config as any)?.lifeSteal ??
    (config as any)?.life_steal ??
    (config as any)?.variants?.lifeSteal ??
    (config as any)?.variants?.life_steal ??
    (config as any)?.options?.lifeSteal ??
    (config as any)?.rules?.lifeSteal
);

const bullSplashOn = truthy(
  (config as any)?.bullSplash ??
    (config as any)?.bull_splash ??
    (config as any)?.variants?.bullSplash ??
    (config as any)?.variants?.bull_splash ??
    (config as any)?.options?.bullSplash ??
    (config as any)?.rules?.bullSplash
);

const bullHealOn = truthy(
  (config as any)?.bullHeal ??
    (config as any)?.bull_heal ??
    (config as any)?.variants?.bullHeal ??
    (config as any)?.variants?.bull_heal ??
    (config as any)?.options?.bullHeal ??
    (config as any)?.rules?.bullHeal
);

// ✅ BLIND KILLER (VRAI): masque les numéros pour TOUS les joueurs pendant la partie.
// Le joueur actif ne voit pas non plus son propre numéro.
// Les numéros réapparaissent uniquement à la fin (overlay de fin) / après victoire.
const blindKillerOn = truthy(
  (config as any)?.blindKiller ??
    (config as any)?.blind_killer ??
    (config as any)?.blind ??
    (config as any)?.variants?.blindKiller ??
    (config as any)?.variants?.blind_killer ??
    (config as any)?.options?.blindKiller ??
    (config as any)?.options?.blind_killer ??
    (config as any)?.rules?.blindKiller ??
    (config as any)?.rules?.blind_killer
);


  function applyThrow(t: ThrowInput) {
    if (inputDisabledBase) return;
    if (dartsLeft <= 0) return;
    if (isBotTurn) return;
  
    // unlock audio if not yet
    try {
      sfx.unlock?.();
    } catch {}
  
    if (assignActive && turnIndex !== assignIndex) {
      setTurnIndex(assignIndex);
      setDartsLeft(1);
      setVisit([]);
    }
  
    snapshot();
    setMultiplier(1);
  
    const thr: ThrowInput = {
      target: clampInt(t.target, 0, 25, 0),
      mult: clampInt(t.mult, 1, 3, 1) as Mult,
    };
  
    setVisit((v) => [...v, thr].slice(0, 3));
    setDartsLeft((d) => Math.max(0, d - 1));
  
    // ✅ Reset pending events (sera rempli dans setPlayers)
    pendingSfxRef.current = null;
    pendingDeathAfterRef.current = false;
    pendingVoiceRef.current = null;
  
    setPlayers((prev) => {
      const next = prev.map((p) => ({
        ...p,
        hitsBySegment: { ...(p.hitsBySegment || {}) },
        hitsByNumber: { ...(p.hitsByNumber || {}) },
      }));
  
      const me = next[turnIndex];
      if (!me || me.eliminated) return prev;
  
      me.totalThrows += 1;
  
      const seg = segmentKey(thr);
      me.hitsBySegment = incMap(me.hitsBySegment, seg, 1);
      if (thr.target !== 0) me.hitsByNumber = incMap(me.hitsByNumber, thr.target, 1);
  
      if (me.killerPhase !== "ACTIVE" && !me.becameAtThrow) me.throwsToBecomeKiller += 1;
      if (me.killerPhase === "ACTIVE") me.killerThrows += 1;
  
      if (thr.target === 0) {
        me.uselessHits += 1;
        pushLog(`🎯 ${me.name} : MISS`);
        pushEvent({ t: Date.now(), type: "THROW", actorId: me.id, throw: thr });
        return next;
      }
  
      // BULL / DBULL (25) — variantes possibles si KILLER ACTIF
      if (thr.target === 25) {
  const isDBull = thr.mult === 2;

  const bullSplashOn = !!(config as any)?.bullSplash; // dmg zone
  const bullHealOn = !!(config as any)?.bullHeal;     // heal

  // Si pas killer actif OU pas de variantes -> comportement "inutile" (comme avant)
  if (me.killerPhase !== "ACTIVE" || (!bullSplashOn && !bullHealOn)) {
    me.uselessHits += 1;
    pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
    pushEvent({ t: Date.now(), type: "THROW", actorId: me.id, throw: thr });
    return next;
  }

  // ✅ KILLER ACTIF + variantes bull
  let didSomething = false;

  // 1) Splash dmg: enlève 1 à tous (BULL) / 2 à tous (DBULL)
  if (bullSplashOn) {
    const dmg = isDBull ? 2 : 1;
    const victims = next.filter((p, idx) => idx !== turnIndex && !p.eliminated);

    let totalLoss = 0;
    let anyElim = false;

    for (const v of victims) {
      const before = v.lives;
      v.lives = Math.max(0, v.lives - dmg);
      const loss = Math.max(0, before - v.lives);
      if (loss > 0) {
        totalLoss += loss;
        v.livesLost += loss;
        didSomething = true;

        if (v.lives <= 0) {
          v.eliminated = true;
          v.eliminatedAt = Date.now();
          me.kills += 1;
          anyElim = true;
          if (!elimOrderRef.current.includes(v.id)) {
            elimOrderRef.current = [...(elimOrderRef.current || []), v.id];
          }
        }
      }
    }

    if (totalLoss > 0) {
      me.killerHits += 1;
      me.livesTaken += totalLoss;
      pendingSfxRef.current = { kind: "kill", mult: thr.mult };
      if (anyElim) pendingDeathAfterRef.current = true;
    }

    pushLog(
      didSomething
        ? `💥 ${me.name} fait ${fmtThrow(thr)} → dégâts de zone (-${dmg} à tous)`
        : `🎯 ${me.name} : ${fmtThrow(thr)}`
    );
    pushEvent({
      t: Date.now(),
      type: "BULL_SPLASH",
      actorId: me.id,
      dmg,
      throw: thr,
      totalLoss,
    });
  }

  // 2) Heal: récupère 1 (BULL) / 2 (DBULL)
  if (bullHealOn) {
    const heal = isDBull ? 2 : 1;
    const before = me.lives;
    me.lives = Math.max(0, me.lives + heal);
    const gained = Math.max(0, me.lives - before);
    if (gained > 0) didSomething = true;

    if (gained > 0) {
      me.livesHealed = (me.livesHealed ?? 0) + gained;
    }

    pushLog(`💚 ${me.name} fait ${fmtThrow(thr)} → +${gained} vie(s)`);
    pushEvent({ t: Date.now(), type: "BULL_HEAL", actorId: me.id, heal: gained, throw: thr });
  }

  if (!didSomething) {
    me.uselessHits += 1;
  }

  return next;
}
  
      // SELECT NUMBER (assignation au lancer)
      if (assignActive && numberAssignMode === "throw" && me.killerPhase === "SELECT") {
        const n = normalizeNumberFromHit(thr.target);
  
        const alreadyTaken = next.some(
          (p, idx) => idx !== turnIndex && !p.eliminated && p.number === n
        );
  
        if (alreadyTaken) {
          me.uselessHits += 1;
          pushLog(`⚠️ ${me.name} vise ${n} mais il est déjà pris → numéro NON attribué`);
          pushEvent({
            t: Date.now(),
            type: "SELECT_NUMBER_CONFLICT",
            actorId: me.id,
            number: n,
            throw: thr,
          });
  
          setTimeout(() => {
            const nextIdx = (assignIndex + 1) % players.length;
            setAssignIndex(nextIdx);
            setTurnIndex(nextIdx);
            setDartsLeft(1);
            setVisit([]);
            setTimeout(() => finishAssignIfReady(), 0);
          }, 0);
  
          return next;
        }
  
        me.number = n;
        me.killerPhase = "ARMING";
        me.isKiller = false;
  
        pushLog(`🧩 ${me.name} choisit le numéro ${n}`);
        pushEvent({
          t: Date.now(),
          type: "SELECT_NUMBER",
          actorId: me.id,
          number: n,
          throw: thr,
        });
  
        setTimeout(() => {
          const nextIdx = (assignIndex + 1) % players.length;
          setAssignIndex(nextIdx);
          setTurnIndex(nextIdx);
          setDartsLeft(1);
          setVisit([]);
          setTimeout(() => finishAssignIfReady(), 0);
        }, 0);
  
        return next;
      }
  
      // AUTOKILL
      if (autoKillOn && me.number && thr.target === me.number) {
        me.hitsOnSelf += 1;
        me.autoKills = (me.autoKills ?? 0) + 1;
        me.livesLost += Math.max(0, me.lives);
        me.lives = 0;
        me.eliminated = true;
        me.eliminatedAt = Date.now();
        me.killerPhase = "ARMING";
        me.isKiller = false;
  
        if (!elimOrderRef.current.includes(me.id)) {
          elimOrderRef.current = [...(elimOrderRef.current || []), me.id];
        }
  
        pushLog(`☠️ ${me.name} s'AUTO-KILL sur ${me.number} (${fmtThrow(thr)})`);
        pushEvent({
          t: Date.now(),
          type: "AUTOKILL",
          actorId: me.id,
          number: me.number,
          throw: thr,
        });

        // ✅ SFX + voice (après commit)
        pendingSfxRef.current = { kind: "auto_kill", mult: thr.mult };
        pendingDeathAfterRef.current = true;
        pendingVoiceRef.current = { kind: "auto_kill", killer: me.name };
  
        return next;
      }
  
      if (!me.number) {
        me.uselessHits += 1;
        pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
        pushEvent({ t: Date.now(), type: "THROW", actorId: me.id, throw: thr });
        return next;
      }
  
      // ARMING => devient killer
      if (
        me.killerPhase !== "ACTIVE" &&
        thr.target === me.number &&
        canBecomeKiller(config.becomeRule, thr)
      ) {
        me.killerPhase = "ACTIVE";
        me.isKiller = true;
        me.hitsOnSelf += 1;
        if (!me.becameAtThrow) me.becameAtThrow = me.throwsToBecomeKiller;
  
        pushLog(`🟡 ${me.name} devient KILLER (${fmtThrow(thr)} sur ${thr.target})`);
        pushEvent({
          t: Date.now(),
          type: "BECOME_KILLER",
          actorId: me.id,
          number: me.number,
          throw: thr,
        });
  
        try {
          sfx.become?.();
        } catch {}
  
        return next;
      }
  
      // ACTIVE => attaque
if (me.killerPhase === "ACTIVE") {
      // ✅ AUTO-PÉNALITÉ (KILLER qui touche SON numéro)
  if (me.number && thr.target === me.number && selfPenaltyOn) {
    me.hitsOnSelf = (me.hitsOnSelf ?? 0) + 1;
    me.selfPenaltyHits = (me.selfPenaltyHits ?? 0) + 1;

    const dmg = selfPenaltyMultOn ? dmgFrom(thr.mult, "multiplier") : 1;

    const beforeMe = me.lives;
    me.lives = Math.max(0, me.lives - dmg);
    const actualLossMe = Math.max(0, beforeMe - me.lives);

    if (actualLossMe > 0) {
      me.livesLost += actualLossMe;

      // ✅ IMPORTANT SFX: self-hit dédié
      pendingSfxRef.current = { kind: "self_hit", mult: thr.mult };
      pendingVoiceRef.current = { kind: "self_hit", killer: me.name };

    }

    pushLog(
      `⚠️ ${me.name} se pénalise (${fmtThrow(thr)} sur ${thr.target}, -${dmg}) → ${me.lives} vie(s)`
    );
    pushEvent({
      t: Date.now(),
      type: "SELF_PENALTY",
      actorId: me.id,
      number: me.number,
      dmg,
      throw: thr,
    });

    if (me.lives <= 0) {
      me.eliminated = true;
      me.eliminatedAt = Date.now();
      me.killerPhase = "ARMING";
      me.isKiller = false;

      if (!elimOrderRef.current.includes(me.id)) {
        elimOrderRef.current = [...(elimOrderRef.current || []), me.id];
      }

      pushLog(`☠️ ${me.name} meurt par auto-pénalité`);
      // ✅ enchaîner death après le SFX de self-hit
      pendingSfxRef.current = pendingSfxRef.current || { kind: "self_hit", mult: thr.mult };
      pendingDeathAfterRef.current = true;
    }

    return next;
  }

  // ✅ HIT VICTIME (numéro d'un adversaire vivant)
  const victimIdx = next.findIndex(
    (p, idx) => idx !== turnIndex && !p.eliminated && p.number === thr.target
  );

  if (victimIdx >= 0) {
    const victim = next[victimIdx];

    me.offensiveThrows += 1;

    const dmg = dmgFrom(thr.mult, config.damageRule);
    const before = victim.lives;
    victim.lives = Math.max(0, victim.lives - dmg);

    const actualLoss = Math.max(0, before - victim.lives);
    if (actualLoss > 0) {
      me.killerHits += 1;
      me.livesTaken += actualLoss;
      victim.livesLost += actualLoss;

      // ✅ LIFE STEAL
      if (lifeStealOn) {
        me.lives = Math.max(0, (me.lives ?? 0) + actualLoss);
        me.livesStolen = (me.livesStolen ?? 0) + actualLoss;
      }

      pendingSfxRef.current = { kind: "kill", mult: thr.mult };
      pendingVoiceRef.current = { kind: "kill", killer: me.name, victim: victim.name };

    }

    pushEvent({
      t: Date.now(),
      type: "HIT_VICTIM",
      actorId: me.id,
      targetId: victim.id,
      targetNumber: victim.number,
      dmg,
      actualLoss,
      throw: thr,
    });

    if (victim.lives <= 0) {
      victim.eliminated = true;
      victim.eliminatedAt = Date.now();
      me.kills += 1;

      if (!elimOrderRef.current.includes(victim.id)) {
        elimOrderRef.current = [...(elimOrderRef.current || []), victim.id];
      }

      pushLog(
        `💀 ${me.name} élimine ${victim.name} (${fmtThrow(thr)} sur ${thr.target}, -${dmg})`
      );
      pushEvent({
        t: Date.now(),
        type: "KILL",
        actorId: me.id,
        targetId: victim.id,
        targetNumber: victim.number,
        throw: thr,
      });

      // ✅ enchaîner un "death" APRÈS le SFX de dégâts
      pendingSfxRef.current = pendingSfxRef.current || { kind: "kill", mult: thr.mult };
      pendingDeathAfterRef.current = true;
    } else {
      pushLog(
        `🔻 ${me.name} touche ${victim.name} (${fmtThrow(thr)} sur ${thr.target}, -${dmg}) → ${victim.lives} vie(s)`
      );
    }

    return next;
  }
}
  
      me.uselessHits += 1;
      pushLog(`🎯 ${me.name} : ${fmtThrow(thr)}`);
      pushEvent({ t: Date.now(), type: "THROW", actorId: me.id, throw: thr });
      return next;
    });
  
    // ✅ Jouer SFX + Voice APRÈS la maj d'état (robuste React 18)
    setTimeout(() => {
      const ps = pendingSfxRef.current;
      const pv = pendingVoiceRef.current;
      const thenDeath = pendingDeathAfterRef.current;

      // reset
      pendingSfxRef.current = null;
      pendingVoiceRef.current = null;
      pendingDeathAfterRef.current = false;

      try {
        if (!ps) {
          sfx.hit?.();
        } else if (ps.kind === "hit") {
          sfx.hit?.();
        } else if (ps.kind === "kill") {
          sfx.kill?.(ps.mult);
        } else if (ps.kind === "self_hit") {
          sfx.selfHit?.(ps.mult);
        } else if (ps.kind === "auto_kill") {
          sfx.autoKill?.(ps.mult);
        } else if (ps.kind === "death") {
          sfx.death?.();
        } else if (ps.kind === "lastDead") {
          sfx.lastDead?.();
        }

        if (thenDeath) {
          setTimeout(() => {
            try {
              sfx.death?.();
            } catch {}
          }, 180);
        }
      } catch {}

      try {
        if (pv) {
          voice.speakLater(pv.kind, { killer: pv.killer, victim: pv.victim });
        }
      } catch {}
    }, 0);
  }
  

  // ✅ fin de partie (son lastDead + record)
  React.useEffect(() => {
    const ww = winner(players);
    if (ww && !finishedRef.current) {
      if (!lastDeadPlayedRef.current) {
        lastDeadPlayedRef.current = true;
        try {
          sfx.lastDead?.();
        } catch {}
      }

      finishedRef.current = true;
      setFinished(true);
      pushLog(`🏆 ${ww.name} gagne !`);

      let rec: any = null;
      try {
        rec = buildMatchRecord(players, ww.id, elimOrderRef.current || []);
      } catch {
        rec = null;
      }

      if (!rec) {
        rec = {
          id: `killer-${Date.now()}`,
          kind: "killer",
          status: "finished",
          createdAt: startedAt,
          updatedAt: Date.now(),
          winnerId: ww.id,
          players: players.map((p) => ({
            id: p.id,
            name: p.name,
            avatarDataUrl: p.avatarDataUrl ?? null,
          })),
          summary: { mode: "killer", ranking: [] },
          payload: { mode: "killer", config },
        };
      }

      setEndRec(rec);
      setShowEnd(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // BOT AUTOPLAY
React.useEffect(() => {
  if (!players.length) return;
  if (finishedRef.current || finished) return;
  if (winner(players)) return;

  const activeTurnIndex = assignActive ? assignIndex : turnIndex;
  const me = players[activeTurnIndex];
  if (!me || me.eliminated) return;
  if (!me.isBot) return;

  if (dartsLeft <= 0) {
    if (botBusyRef.current) return;
    botBusyRef.current = true;
    botTimerRef.current = setTimeout(() => {
      botTimerRef.current = null;
      if (finishedRef.current || finished) {
        botBusyRef.current = false;
        return;
      }
      if (assignActive) {
        const nextIdx = (assignIndex + 1) % players.length;
        setAssignIndex(nextIdx);
        setTurnIndex(nextIdx);
        setDartsLeft(1);
        setVisit([]);
        setTimeout(() => finishAssignIfReady(), 0);
      } else {
        endTurn(players);
      }
      botBusyRef.current = false;
    }, 340);

    return () => {
      if (botTimerRef.current) clearTimeout(botTimerRef.current);
      botTimerRef.current = null;
      botBusyRef.current = false;
    };
  }

  if (botBusyRef.current) return;
  botBusyRef.current = true;

  const delay = 320 + Math.floor(Math.random() * 420);
  botTimerRef.current = setTimeout(() => {
    botTimerRef.current = null;
    if (finishedRef.current || finished) {
      botBusyRef.current = false;
      return;
    }

    const nowMe = players[activeTurnIndex];
    if (!nowMe || nowMe.eliminated || !nowMe.isBot) {
      botBusyRef.current = false;
      return;
    }

    snapshot();
    setMultiplier(1);

    const thr = decideBotThrow(nowMe, players, config, assignActive);
    const thrSafe: ThrowInput = {
      target: clampInt(thr.target, 0, 25, 0),
      mult: clampInt(thr.mult, 1, 3, 1) as Mult,
    };

    setVisit((v) => [...v, thrSafe].slice(0, 3));
    setDartsLeft((d) => Math.max(0, d - 1));

    try {
      sfx.unlock?.();
    } catch {}

    // ✅ Reset pending events BOT (sera rempli dans setPlayers)
    pendingSfxRef.current = null;
    pendingVoiceRef.current = null;
    pendingDeathAfterRef.current = false;

    setPlayers((prev) => {
      const next = prev.map((p) => ({
        ...p,
        hitsBySegment: { ...(p.hitsBySegment || {}) },
        hitsByNumber: { ...(p.hitsByNumber || {}) },
      }));

      const me2 = next[activeTurnIndex];
      if (!me2 || me2.eliminated) return prev;

      me2.totalThrows += 1;

      const seg = segmentKey(thrSafe);
      me2.hitsBySegment = incMap(me2.hitsBySegment, seg, 1);
      if (thrSafe.target !== 0)
        me2.hitsByNumber = incMap(me2.hitsByNumber, thrSafe.target, 1);

      if (thrSafe.target === 0) {
        me2.uselessHits += 1;
        pushLog(`🎯 ${me2.name} : MISS`);
        pushEvent({
          t: Date.now(),
          type: "THROW",
          actorId: me2.id,
          throw: thrSafe,
          bot: true,
        });
        return next;
      }

      // BULL / DBULL (25) — variantes possibles si KILLER ACTIF
if (thrSafe.target === 25) {
  const isDBull = thrSafe.mult === 2;

  // Si pas killer actif OU pas de variantes -> inutile
  if (me2.killerPhase !== "ACTIVE" || (!bullSplashOn && !bullHealOn)) {
    me2.uselessHits += 1;
    pushLog(`🎯 ${me2.name} : ${fmtThrow(thrSafe)}`);
    pushEvent({
      t: Date.now(),
      type: "THROW",
      actorId: me2.id,
      throw: thrSafe,
      bot: true,
    });
    return next;
  }

  let didSomething = false;

  // 1) Splash dmg: -1 à tous (BULL) / -2 à tous (DBULL)
  if (bullSplashOn) {
    const dmg = isDBull ? 2 : 1;
    const victims = next.filter((p, idx) => idx !== activeTurnIndex && !p.eliminated);

    let totalLoss = 0;

    for (const v of victims) {
      const before = v.lives;
      v.lives = Math.max(0, v.lives - dmg);
      const loss = Math.max(0, before - v.lives);
      if (loss > 0) {
        totalLoss += loss;
        v.livesLost += loss;
        didSomething = true;

        if (v.lives <= 0) {
          v.eliminated = true;
          v.eliminatedAt = Date.now();
          me2.kills += 1;
          if (!elimOrderRef.current.includes(v.id)) {
            elimOrderRef.current = [...(elimOrderRef.current || []), v.id];
          }
        }
      }
    }

    if (totalLoss > 0) {
      me2.killerHits += 1;
      me2.livesTaken += totalLoss;
      pendingSfxRef.current = { kind: "kill", mult: thrSafe.mult };
    }

    pushLog(
      didSomething
        ? `💥 ${me2.name} fait ${fmtThrow(thrSafe)} → dégâts de zone (-${dmg} à tous)`
        : `🎯 ${me2.name} : ${fmtThrow(thrSafe)}`
    );

    pushEvent({
      t: Date.now(),
      type: "BULL_SPLASH",
      actorId: me2.id,
      dmg,
      totalLoss,
      throw: thrSafe,
      bot: true,
    });
  }

  // 2) Heal: +1 (BULL) / +2 (DBULL)
  if (bullHealOn) {
    const heal = isDBull ? 2 : 1;
    const before = me2.lives;
    me2.lives = Math.max(0, me2.lives + heal);
    const gained = Math.max(0, me2.lives - before);
    if (gained > 0) didSomething = true;

    if (gained > 0) {
      me2.livesHealed = (me2.livesHealed ?? 0) + gained;
    }

    pushLog(`💚 ${me2.name} fait ${fmtThrow(thrSafe)} → +${gained} vie(s)`);
    pushEvent({
      t: Date.now(),
      type: "BULL_HEAL",
      actorId: me2.id,
      heal: gained,
      throw: thrSafe,
      bot: true,
    });
  }

  if (!didSomething) me2.uselessHits += 1;
  return next;
}

      if (
        assignActive &&
        numberAssignMode === "throw" &&
        me2.killerPhase === "SELECT"
      ) {
        const n = normalizeNumberFromHit(thrSafe.target);

        const alreadyTaken = next.some(
          (p, idx) => idx !== activeTurnIndex && !p.eliminated && p.number === n
        );

        if (alreadyTaken) {
          me2.uselessHits += 1;
          pushLog(`⚠️ ${me2.name} vise ${n} déjà pris → numéro NON attribué`);
          pushEvent({
            t: Date.now(),
            type: "SELECT_NUMBER_CONFLICT",
            actorId: me2.id,
            number: n,
            throw: thrSafe,
            bot: true,
          });

          setTimeout(() => {
            const nextIdx = (assignIndex + 1) % players.length;
            setAssignIndex(nextIdx);
            setTurnIndex(nextIdx);
            setDartsLeft(1);
            setVisit([]);
            setTimeout(() => finishAssignIfReady(), 0);
          }, 0);

          return next;
        }

        me2.number = n;
        me2.killerPhase = "ARMING";
        me2.isKiller = false;

        pushLog(`🧩 ${me2.name} choisit le numéro ${n}`);
        pushEvent({
          t: Date.now(),
          type: "SELECT_NUMBER",
          actorId: me2.id,
          number: n,
          throw: thrSafe,
          bot: true,
        });

        setTimeout(() => {
          const nextIdx = (assignIndex + 1) % players.length;
          setAssignIndex(nextIdx);
          setTurnIndex(nextIdx);
          setDartsLeft(1);
          setVisit([]);
          setTimeout(() => finishAssignIfReady(), 0);
        }, 0);

        return next;
      }

      if (autoKillOn && me2.number && thrSafe.target === me2.number) {
        me2.hitsOnSelf += 1;
        me2.autoKills = (me2.autoKills ?? 0) + 1;
        me2.livesLost += Math.max(0, me2.lives);
        me2.lives = 0;
        me2.eliminated = true;
        me2.eliminatedAt = Date.now();
        me2.killerPhase = "ARMING";
        me2.isKiller = false;

        if (!elimOrderRef.current.includes(me2.id)) {
          elimOrderRef.current = [...(elimOrderRef.current || []), me2.id];
        }

        pushLog(
          `☠️ ${me2.name} s'AUTO-KILL sur ${me2.number} (${fmtThrow(thrSafe)})`
        );
        pushEvent({
          t: Date.now(),
          type: "AUTOKILL",
          actorId: me2.id,
          number: me2.number,
          throw: thrSafe,
          bot: true,
        });

        pendingSfxRef.current = { kind: "auto_kill", mult: thrSafe.mult };
        pendingDeathAfterRef.current = true;
        pendingVoiceRef.current = { kind: "auto_kill", killer: me2.name };

        return next;
      }

      if (
        me2.killerPhase !== "ACTIVE" &&
        me2.number &&
        thrSafe.target === me2.number &&
        canBecomeKiller(config.becomeRule, thrSafe)
      ) {
        me2.killerPhase = "ACTIVE";
        me2.isKiller = true;
        me2.hitsOnSelf += 1;
        if (!me2.becameAtThrow) me2.becameAtThrow = me2.throwsToBecomeKiller;

        pushLog(
          `🟡 ${me2.name} devient KILLER (${fmtThrow(thrSafe)} sur ${thrSafe.target})`
        );
        pushEvent({
          t: Date.now(),
          type: "BECOME_KILLER",
          actorId: me2.id,
          number: me2.number,
          throw: thrSafe,
          bot: true,
        });
        return next;
      }

      if (me2.killerPhase === "ACTIVE") {
        // ✅ AUTO-PÉNALITÉ (BOT)
        if (me2.number && thrSafe.target === me2.number && selfPenaltyOn) {
          me2.hitsOnSelf = (me2.hitsOnSelf ?? 0) + 1;
    me2.selfPenaltyHits = (me2.selfPenaltyHits ?? 0) + 1;
      
          const dmg = selfPenaltyMultOn ? dmgFrom(thrSafe.mult, "multiplier") : 1;
      
          const beforeMe = me2.lives;
          me2.lives = Math.max(0, me2.lives - dmg);
          const actualLossMe = Math.max(0, beforeMe - me2.lives);
      
          if (actualLossMe > 0) {
            me2.livesLost += actualLossMe;
            pendingSfxRef.current = { kind: "self_hit", mult: thrSafe.mult };
            pendingVoiceRef.current = { kind: "self_hit", killer: me2.name };
          }
      
          pushLog(
            `⚠️ ${me2.name} se pénalise (${fmtThrow(thrSafe)} sur ${thrSafe.target}, -${dmg}) → ${me2.lives} vie(s)`
          );
          pushEvent({
            t: Date.now(),
            type: "SELF_PENALTY",
            actorId: me2.id,
            number: me2.number,
            dmg,
            throw: thrSafe,
            bot: true,
          });
      
          if (me2.lives <= 0) {
            me2.eliminated = true;
            me2.eliminatedAt = Date.now();
            me2.killerPhase = "ARMING";
            me2.isKiller = false;
      
            if (!elimOrderRef.current.includes(me2.id)) {
              elimOrderRef.current = [...(elimOrderRef.current || []), me2.id];
            }
      
            pushLog(`☠️ ${me2.name} meurt par auto-pénalité`);
            pendingSfxRef.current = pendingSfxRef.current || { kind: "self_hit", mult: thrSafe.mult };
            pendingDeathAfterRef.current = true;
          }
      
          return next;
        }
      
        // ✅ HIT VICTIME (BOT)
        const victimIdx = next.findIndex(
          (p, idx) => idx !== activeTurnIndex && !p.eliminated && p.number === thrSafe.target
        );
      
        if (victimIdx >= 0) {
          const victim = next[victimIdx];
      
          me2.offensiveThrows += 1;
      
          const dmg = dmgFrom(thrSafe.mult, config.damageRule);
          const before = victim.lives;
          victim.lives = Math.max(0, victim.lives - dmg);
      
          const actualLoss = Math.max(0, before - victim.lives);
          if (actualLoss > 0) {
            me2.killerHits += 1;
            me2.livesTaken += actualLoss;
            victim.livesLost += actualLoss;
      
            // ✅ LIFE STEAL
            if (lifeStealOn) {
              me2.lives = Math.max(0, (me2.lives ?? 0) + actualLoss);
              me2.livesStolen = (me2.livesStolen ?? 0) + actualLoss;
            }
      
            pendingSfxRef.current = { kind: "kill", mult: thrSafe.mult };
            pendingVoiceRef.current = { kind: "kill", killer: me2.name, victim: victim.name };
          }
      
          pushEvent({
            t: Date.now(),
            type: "HIT_VICTIM",
            actorId: me2.id,
            targetId: victim.id,
            targetNumber: victim.number,
            dmg,
            actualLoss,
            throw: thrSafe,
            bot: true,
          });
      
          if (victim.lives <= 0) {
            victim.eliminated = true;
            victim.eliminatedAt = Date.now();
            me2.kills += 1;
      
            if (!elimOrderRef.current.includes(victim.id)) {
              elimOrderRef.current = [...(elimOrderRef.current || []), victim.id];
            }
      
            pushLog(
              `💀 ${me2.name} élimine ${victim.name} (${fmtThrow(thrSafe)} sur ${thrSafe.target}, -${dmg})`
            );
            pushEvent({
              t: Date.now(),
              type: "KILL",
              actorId: me2.id,
              targetId: victim.id,
              targetNumber: victim.number,
              throw: thrSafe,
              bot: true,
            });
      
            // ✅ enchaîner death après le SFX de dégâts
            pendingSfxRef.current = pendingSfxRef.current || { kind: "kill", mult: thrSafe.mult };
            pendingDeathAfterRef.current = true;
          } else {
            pushLog(
              `🔻 ${me2.name} touche ${victim.name} (${fmtThrow(thrSafe)} sur ${thrSafe.target}, -${dmg}) → ${victim.lives} vie(s)`
            );
          }
      
          return next;
        }
      }

      me2.uselessHits += 1;
      pushLog(`🎯 ${me2.name} : ${fmtThrow(thrSafe)}`);
      pushEvent({
        t: Date.now(),
        type: "THROW",
        actorId: me2.id,
        throw: thrSafe,
        bot: true,
      });
      return next;
    });

    // ✅ Jouer SFX + Voice BOT APRÈS la maj d'état (robuste React 18)
    setTimeout(() => {
      const ps = pendingSfxRef.current;
      const pv = pendingVoiceRef.current;
      const thenDeath = pendingDeathAfterRef.current;

      // reset
      pendingSfxRef.current = null;
      pendingVoiceRef.current = null;
      pendingDeathAfterRef.current = false;

      try {
        if (!ps) {
          sfx.hit?.();
        } else if (ps.kind === "hit") {
          sfx.hit?.();
        } else if (ps.kind === "kill") {
          sfx.kill?.(ps.mult);
        } else if (ps.kind === "self_hit") {
          sfx.selfHit?.(ps.mult);
        } else if (ps.kind === "auto_kill") {
          sfx.autoKill?.(ps.mult);
        } else if (ps.kind === "death") {
          sfx.death?.();
        } else if (ps.kind === "lastDead") {
          sfx.lastDead?.();
        }

        if (thenDeath) {
          setTimeout(() => {
            try {
              sfx.death?.();
            } catch {}
          }, 180);
        }
      } catch {}

      try {
        if (pv) {
          voice.speakLater(pv.kind, { killer: pv.killer, victim: pv.victim });
        }
      } catch {}
    }, 0);

    botBusyRef.current = false;
  }, delay);

  return () => {
    if (botTimerRef.current) clearTimeout(botTimerRef.current);
    botTimerRef.current = null;
    botBusyRef.current = false;
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [turnIndex, dartsLeft, finished, players, assignActive, assignIndex]);

  // keep turnIndex safe
  React.useEffect(() => {
    if (!players.length) return;
    const me = players[turnIndex];
    if (!me || me.eliminated)
      setTurnIndex((prev) => nextAliveIndex(players, prev));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [players]);

  // boot assign
  React.useEffect(() => {
    if (!assignActive) return;
    setTurnIndex(assignIndex);
    setDartsLeft(1);
    setVisit([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignActive, assignIndex]);

  // ✅ FULLSCREEN PLAY: cache tabbar + bloque scroll global (html/body)
React.useEffect(() => {
  if (typeof document === "undefined") return;

  const prevBodyOverflow = document.body.style.overflow;
  const prevHtmlOverflow = document.documentElement.style.overflow;

  document.body.classList.add("dc-fullscreen-play");
  document.body.style.overflow = "hidden";
  document.documentElement.style.overflow = "hidden";

  const st = document.createElement("style");
  st.setAttribute("data-dc-killer-fullscreen", "1");
  st.textContent = `
    body.dc-fullscreen-play .dc-tabbar,
    body.dc-fullscreen-play .tabbar,
    body.dc-fullscreen-play .bottom-tabbar,
    body.dc-fullscreen-play .bottom-nav,
    body.dc-fullscreen-play nav[role="navigation"],
    body.dc-fullscreen-play [data-app-tabbar],
    body.dc-fullscreen-play [data-tabbar]{
      display:none !important;
      visibility:hidden !important;
      height:0 !important;
    }
    body.dc-fullscreen-play{
      padding-bottom: 0 !important;
      overscroll-behavior: none !important;
    }

    /* ✅ KILLER: on force la disparition du total volée (toutes variantes possibles) */
    .dc-killer-keypad .keypad-total,
    .dc-killer-keypad .Keypad-total,
    .dc-killer-keypad [data-keypad-total],
    .dc-killer-keypad [data-total],
    .dc-killer-keypad .total,
    .dc-killer-keypad .visit-total,
    .dc-killer-keypad .score,
    .dc-killer-keypad .sum,
    .dc-killer-keypad .result,
    .dc-killer-keypad .center,
    .dc-killer-keypad .middle{
      display:none !important;
      visibility:hidden !important;
      opacity:0 !important;
    }
  `;
  document.head.appendChild(st);

  return () => {
    document.body.classList.remove("dc-fullscreen-play");
    document.body.style.overflow = prevBodyOverflow || "";
    document.documentElement.style.overflow = prevHtmlOverflow || "";
    try {
      st.remove();
    } catch {}
  };
}, []);

if (!config || !config.players || config.players.length < 2) {
  return (
    <div style={{ padding: 16, color: "#fff" }}>
      <button onClick={() => go("killer_config")}>← Retour</button>
      <p>Configuration KILLER invalide.</p>
    </div>
  );
}

const currentThrow = toKeypadThrow(visit);
const canValidateTurn =
  !inputDisabledBase && !isBotTurn && (visit.length > 0 || dartsLeft === 0);

function handleValidate() {
  if (inputDisabledBase) return;
  if (isBotTurn) return;
  if (!canValidateTurn) return;
  endTurn(players);
}

const RULES = rulesText(config);

function saveAndGoSummary(rec: any) {
  try {
    if (rec) onFinish(rec);
  } catch {}

  const matchId = rec?.id || rec?.matchId || rec?.payload?.matchId || null;
  if (matchId) go("killer_summary", { matchId });
  else go("statsHub", { tab: "history", mode: "killer" });
}

const endPlayersOrdered = React.useMemo(() => {
  if (!showEnd) return players;
  return getOrderedFinalPlayers(players, elimOrderRef.current || []);
}, [showEnd, players]);

const theme = gold;

// ✅ BLIND KILLER: on masque les numéros pour tous les joueurs pendant la partie.
// (On révèle à la fin uniquement.)
const blindMask = !!blindKillerOn && !showEnd && !finished && !w;

const isCurrentKillerActive =
  !!current && current.killerPhase === "ACTIVE" && !current.eliminated;

return (
  <div
    style={{
      height: "100dvh",
      overflow: "hidden",
      background: pageBg,
      color: "#fff",
      display: "flex",
      flexDirection: "column",
      padding: 10,
      gap: 10,
      overscrollBehavior: "none",
    }}
  >
    {/* ✅ SCRIM BLOQUANT (fond/menu/list/keypad inactifs) */}
    {assignActive && (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 8500,
          background: "rgba(0,0,0,.72)",
          backdropFilter: "blur(3px) grayscale(1)",
          WebkitBackdropFilter: "blur(3px) grayscale(1)",
          pointerEvents: "auto",
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onMouseDown={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onTouchStart={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
      />
    )}

    <AssignOverlay
      open={assignActive}
      player={assignPlayer}
      index={assignIndex}
      total={players.length}
      takenNumbers={takenNumbers}
      onPickNumber={(n) => {
        applyThrow({ target: n, mult: 1 });
      }}
    />

    {/* ✅ LOG POPIN */}
    {showLog && (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setShowLog(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.55)",
          zIndex: 9999,
          padding: 14,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 520,
            ...card,
            padding: 14,
            marginTop: 70,
            border: "1px solid rgba(255,198,58,.25)",
            boxShadow: "0 18px 55px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 1000,
                letterSpacing: 1.2,
                color: gold,
                textTransform: "uppercase",
              }}
            >
              Log
            </div>
            <button
              type="button"
              onClick={() => setShowLog(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
            {(log || []).slice(0, 60).map((l, i) => (
              <div key={i} style={{ fontSize: 12, opacity: 0.9 }}>
                {l}
              </div>
            ))}
            {!log?.length && (
              <div style={{ fontSize: 12, opacity: 0.7 }}>
                (vide pour l’instant)
              </div>
            )}
          </div>
        </div>
      </div>
    )}

    {/* RULES POPIN */}
    {showRules && (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setShowRules(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.55)",
          zIndex: 9999,
          padding: 14,
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 520,
            ...card,
            padding: 14,
            marginTop: 70,
            border: "1px solid rgba(255,198,58,.25)",
            boxShadow: "0 18px 55px rgba(0,0,0,.6)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 10,
            }}
          >
            <div
              style={{
                fontWeight: 1000,
                letterSpacing: 1.2,
                color: gold,
                textTransform: "uppercase",
              }}
            >
              Règles KILLER
            </div>
            <button
              type="button"
              onClick={() => setShowRules(false)}
              style={{
                width: 34,
                height: 34,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.10)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 900,
                cursor: "pointer",
              }}
              aria-label="Fermer"
              title="Fermer"
            >
              ✕
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gap: 10 }}>
            {RULES.map((r, idx) => (
              <div
                key={idx}
                style={{
                  borderRadius: 14,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(0,0,0,.25)",
                  padding: 10,
                }}
              >
                <div
                  style={{
                    fontWeight: 950,
                    fontSize: 12,
                    color: "#ffe7b0",
                    textTransform: "uppercase",
                  }}
                >
                  {r.title}
                </div>
                <div
                  style={{
                    marginTop: 4,
                    fontSize: 12,
                    opacity: 0.9,
                    lineHeight: 1.35,
                    whiteSpace: "pre-line",
                  }}
                >
                  {r.body}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )}

    {/* ✅ END OVERLAY */}
    {showEnd && (
      <div
        role="dialog"
        aria-modal="true"
        onClick={() => setShowEnd(false)}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,.72)",
          zIndex: 10000,
          padding: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: "100%",
            maxWidth: 520,
            ...card,
            padding: 16,
            border: "1px solid rgba(255,198,58,.22)",
            boxShadow: "0 18px 65px rgba(0,0,0,.65)",
          }}
        >
          <div style={{ textAlign: "center" }}>
            <div
              style={{
                fontSize: 12,
                fontWeight: 1000,
                letterSpacing: 1.6,
                textTransform: "uppercase",
                color: gold,
              }}
            >
              FIN DE PARTIE
            </div>
            <div style={{ marginTop: 6, fontSize: 20, fontWeight: 1000 }}>
              🏆 {winner(players)?.name || "—"} gagne !
            </div>
          </div>

          <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
            {endPlayersOrdered.map((p, i) => (
              <div
                key={p.id}
                style={{
                  display: "grid",
                  gridTemplateColumns: "32px 1fr auto",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 14,
                  background:
                    i === 0 ? "rgba(255,198,58,.12)" : "rgba(0,0,0,.25)",
                  border: "1px solid rgba(255,255,255,.08)",
                  opacity: p.eliminated ? 0.85 : 1,
                }}
              >
                <div
                  style={{
                    fontWeight: 1000,
                    color: i === 0 ? gold : "#fff",
                  }}
                >
                  {i + 1}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <AvatarMedallion
                    size={28}
                    src={p.avatarDataUrl}
                    name={p.name}
                  />
                  <span style={{ fontWeight: 1000 }}>{p.name}</span>
                  <span style={{ fontSize: 12, opacity: 0.8, color: gold }}>
                    {p.number || "?"}
                  </span>
                </div>
                <div
                  style={{
                    fontWeight: 1000,
                    color: i === 0 ? gold : "rgba(255,255,255,.75)",
                  }}
                >
                  {i === 0 ? "WIN" : p.eliminated ? "DEAD" : ""}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: 16,
              display: "flex",
              gap: 12,
              justifyContent: "center",
            }}
          >
            <button
              type="button"
              onClick={() => {
                setShowEnd(false);
                setTimeout(() => {
                  if (endRec) onFinish(endRec);
                  go("killer_config");
                }, 0);
              }}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,180,0,.30)",
                background: `linear-gradient(180deg, ${gold}, ${gold2})`,
                color: "#1a1a1a",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Quitter
            </button>

            <button
              type="button"
              onClick={() => {
                setShowEnd(false);
                setTimeout(() => saveAndGoSummary(endRec), 0);
              }}
              style={{
                height: 44,
                padding: "0 16px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Voir résumé
            </button>
          </div>
        </div>
      </div>
    )}

    {/* =========================
        ✅ TOP FIXED AREA (non scrollable)
       ========================= */}
    <div style={{ flex: "0 0 auto" }}>
      {/* ✅ HEADER */}
      <div style={{ ...card, padding: 8 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 10,
          }}
        >
          <button
            type="button"
            onClick={() => go("killer_config")}
            style={{
              height: 34,
              padding: "0 12px",
              borderRadius: 12,
              border: "1px solid rgba(255,180,0,.30)",
              background: `linear-gradient(180deg, ${gold}, ${gold2})`,
              color: "#1a1a1a",
              fontWeight: 1000,
              cursor: "pointer",
              boxShadow: "0 10px 22px rgba(255,170,0,.18)",
              whiteSpace: "nowrap",
            }}
          >
            ← Quitter
          </button>

          <div style={{ textAlign: "center", lineHeight: 1 }}>
            <span
              style={{
                display: "inline-block",
                color: gold,
                fontWeight: 1000,
                textTransform: "uppercase",
                letterSpacing: 1.6,
                textShadow: "0 0 14px rgba(255,198,58,.25)",
              }}
            >
              KILLER
            </span>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
            <button
              type="button"
              onClick={() => setShowLog(true)}
              style={{
                height: 30,
                padding: "0 10px",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
              }}
              title="Log"
            >
              Log
            </button>

            <InfoDot
              onClick={() => setShowRules(true)}
              size={30}
              color="#FFFFFF"
            />
          </div>
        </div>

        {/* ✅ Carousel */}
        <TargetsCarousel
          players={players}
          activeId={current?.id || null}
          theme={theme}
          blindMask={blindKillerOn}
        />
      </div>

      {/* ✅ ACTIVE PLAYER (FIXED) */}
      <div style={{ marginTop: 8, ...card, padding: 12 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "92px 1fr 112px",
            gap: 10,
            alignItems: "center",
          }}
        >
          <div style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <AvatarMedallion
              size={84}
              src={current?.avatarDataUrl}
              name={current?.name}
            />
            <div
              style={{
                fontSize: 13,
                fontWeight: 1000,
                color: gold,
                textTransform: "uppercase",
                textAlign: "center",
                width: 92,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              title={current?.name}
            >
              {current?.name ?? "—"}
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(0,0,0,.28)",
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <StatRow label="Darts" value={dartsLeft} />
            <StatRow label="Lancers" value={current?.totalThrows ?? 0} />
            <StatRow label="Dégâts" value={current?.livesTaken ?? 0} />
            <StatRow label="Kills" value={current?.kills ?? 0} />
          </div>

          <div style={{ display: "grid", justifyItems: "end", gap: 8 }}>
            {/* ✅ numéro GROS sans # */}
            <div
              style={{
                width: 108,
                textAlign: "center",
                fontWeight: 1000,
                fontSize: 26,
                color: gold,
                letterSpacing: 0.8,
                lineHeight: 1,
                textShadow: "0 0 14px rgba(255,198,58,.22)",
              }}
            >
              {blindMask
                ? "?"
                : current?.killerPhase === "SELECT"
                ? "?"
                : current?.number ?? "?"}
              {current?.killerPhase === "ACTIVE" && (
                <KillerIcon size={46} variant="active" />
              )}
              {current?.eliminated && <DeadIcon size={46} variant="active" />}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "56px 56px",
                gap: 8,
                width: 112,
                justifyContent: "end",
              }}
            >
              <HeartKpi value={current?.lives ?? 0} />
              <SurvivorKpi value={aliveCount} />
            </div>
          </div>
        </div>

        {(waitingValidate || isBotTurn) && !finished && !w && (
          <div
            style={{
              marginTop: 10,
              display: "flex",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                background: "rgba(0,0,0,.35)",
                border: "1px solid rgba(255,198,58,.18)",
                boxShadow: "0 12px 35px rgba(0,0,0,.35)",
                fontSize: 12,
                fontWeight: 900,
                color: "#ffe7b0",
                textAlign: "center",
              }}
            >
              {isBotTurn
                ? "🤖 Le bot joue…"
                : "Appuie sur VALIDER pour passer au joueur suivant"}
            </div>
          </div>
        )}
      </div>
    </div>

   {/* =========================
    ✅ ONLY SCROLLABLE AREA: LISTE JOUEURS
   ========================= */}
<div
  style={{
    flex: "1 1 auto",
    minHeight: 0,
    overflowY: "auto",
    overflowX: "hidden",
    WebkitOverflowScrolling: "touch",
    paddingBottom: 6,
    marginTop: 8,
  }}
>
  <div style={{ display: "grid", gap: 8 }}>
    {players.map((p, idx) => {
      const isMe = idx === turnIndex;
      const last = (p.lastVisit || []).slice(0, 3);
      const lastDarts = toKeypadThrow(last as any);

      const neonHalo = isMe
        ? "0 0 0 1px rgba(255,198,58,.25), 0 0 16px rgba(255,198,58,.18), 0 0 40px rgba(255,198,58,.10)"
        : "none";

      return (
        <div
          key={p.id}
          style={{
            ...card,
            padding: "8px 10px",
            opacity: p.eliminated ? 0.92 : 1,
            border: "1px solid rgba(255,255,255,.08)",
            boxShadow: neonHalo,
            background: p.eliminated
              ? "linear-gradient(180deg, rgba(70,10,10,.90), rgba(16,8,10,.98))"
              : "linear-gradient(180deg, rgba(22,22,23,.78), rgba(12,12,14,.95))",
            display: "grid",
            gridTemplateColumns: "auto 1fr auto",
            alignItems: "center",
            gap: 10,
          }}
        >
          <AvatarMedallion size={40} src={p.avatarDataUrl} name={p.name} />

          <div style={{ minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                minWidth: 0,
              }}
            >
              <div style={{ fontWeight: 1000, minWidth: 0 }}>
                <span
                  style={{
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  <span
                    style={{
                      color: p.eliminated ? "rgba(255,140,140,.95)" : "#fff",
                      fontSize: 13,
                      fontWeight: 1000,
                    }}
                  >
                    {p.name}
                  </span>{" "}
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 1000,
                      color: p.eliminated ? "rgba(255,140,140,.85)" : gold,
                      opacity: 0.95,
                    }}
                  >
                    {blindMask ? "?" : p.killerPhase === "SELECT" ? "?" : p.number || "?"}
                  </span>
                </span>

                {p.killerPhase === "ACTIVE" && !p.eliminated && (
                  <KillerIcon size={18} variant="list" />
                )}
                {p.eliminated && <DeadIcon size={18} variant="list" />}

                {p.isBot && (
                  <span
                    style={{
                      marginLeft: 6,
                      fontSize: 11,
                      opacity: 0.85,
                      whiteSpace: "nowrap",
                    }}
                  >
                    🤖{p.botLevel ? ` ${p.botLevel}` : ""}
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 4,
                  flex: "0 0 auto",
                  transform: "scale(.92)",
                  transformOrigin: "right center",
                }}
              >
                <span style={chipStyleMini(lastDarts[0])}>{fmtChip(lastDarts[0])}</span>
                <span style={chipStyleMini(lastDarts[1])}>{fmtChip(lastDarts[1])}</span>
                <span style={chipStyleMini(lastDarts[2])}>{fmtChip(lastDarts[2])}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              minWidth: 52,
              textAlign: "center",
              fontWeight: 1000,
              borderRadius: 14,
              padding: "8px 10px",
              background: p.eliminated ? "rgba(255,80,80,.12)" : "rgba(0,0,0,.45)",
              border: p.eliminated
                ? "1px solid rgba(255,80,80,.35)"
                : "1px solid rgba(255,255,255,.08)",
              color: p.eliminated ? "rgba(255,140,140,.95)" : gold,
              display: "grid",
              placeItems: "center",
            }}
          >
            {p.eliminated ? (
              "DEAD"
            ) : (
              <div style={{ transform: "scale(1.18)" }}>
                <MiniHeart value={p.lives ?? 0} active={false} />
              </div>
            )}
          </div>
        </div>
      );
    })}
  </div>
</div>

{/* ✅ BOTTOM sticky KEYPAD */}
{!assignActive && !w && !finished && !isBotTurn && !showEnd && (
  <div
    style={{
      flex: "0 0 auto",
      position: "sticky",
      bottom: 0,
      zIndex: 60,
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      background:
        "linear-gradient(180deg, rgba(0,0,0,0), rgba(0,0,0,.25) 30%, rgba(0,0,0,.45))",
    }}
  >
    <div style={{ display: "flex", justifyContent: "center", gap: 10 }}>
      <span style={chipStyleBig(currentThrow[0])}>
        {fmtChip(currentThrow[0])}
      </span>
      <span style={chipStyleBig(currentThrow[1])}>
        {fmtChip(currentThrow[1])}
      </span>
      <span style={chipStyleBig(currentThrow[2])}>
        {fmtChip(currentThrow[2])}
      </span>
    </div>

    <div style={{ marginTop: 10 }} className="dc-killer-keypad">
      <ScoreInputHub
        currentThrow={currentThrow}
        multiplier={multiplier}
        onSimple={() => setMultiplier(1)}
        onDouble={() => setMultiplier(2)}
        onTriple={() => setMultiplier(3)}
        onBackspace={() => {}}
        onCancel={undo}
        onNumber={(n: number) => applyThrow({ target: n, mult: multiplier })}
        onBull={() => {
          const m: Mult = multiplier === 2 ? 2 : 1;
          applyThrow({ target: 25, mult: m });
        }}
        onValidate={handleValidate}
        onDirectDart={(d) => applyThrow({ target: d.v, mult: d.mult as any })}
        hidePreview={true}
        hideTotal={true}
        centerSlot={
          isCurrentKillerActive ? (
            <div
              style={{
                width: 110,
                height: 44,
                borderRadius: 22,
                background: "rgba(10,10,12,.98)",
                border: "1px solid rgba(255,255,255,.14)",
                boxShadow: "0 14px 30px rgba(0,0,0,.65)",
                display: "grid",
                placeItems: "center",
                pointerEvents: "none",
              }}
            >
              <div
                style={{
                  opacity: 0.98,
                  filter: "drop-shadow(0 14px 18px rgba(255,198,58,.26))",
                }}
              >
                <KillerIcon size={40} variant="active" />
              </div>
            </div>
          ) : null
        }
      />
    </div>
  </div>
)}
  </div>
);
}