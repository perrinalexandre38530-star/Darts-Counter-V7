// @ts-nocheck
// ============================================
// src/pages/TournamentView.tsx
// Tournois (LOCAL) — View (multi-visuals) — V5 (PATCH COMPLET)
//
// ✅ UI (demandes):
// - Header type "capture 2": retour à gauche, titre centré, icônes à droite (simulate/delete)
// - Top tabs: icônes ONLY (1 ligne)
// - Titre d’onglet (page) en gros centré sous les tabs
// - Supprime "Simuler prochain match" (déjà un bouton simuler par match)
// - Fix labels matchs poules: "Poule A • Round 1" (plus de KO label sur poules)
// - TAB "Tableau": sous-onglets "Vue" (bracket coupe du monde) / "Détails" (vue actuelle)
//
// ✅ BRACKET "VUE" (DEMANDÉ PAR TOI):
// - Afficher UNIQUEMENT : avatars + drapeaux + traits qui relient (comme ta capture FIFA)
// - Aucun bouton / aucun texte / aucune carte de match dans "Vue"
// - Traits propres (SVG) + layout stable
//
// ✅ DÉTAILS (FIX demandé):
// - Centrage vertical "en escalier" des colonnes (comme Vue) => SEULEMENT dans "Détails"
// - Afficher les scores sur les matchs terminés (badge overlay + ton scoreText existant)
//
// ✅ Fix IMPORTANT:
// - Evite les doublons de matchs KO (dédup par id)
// - Evite l’erreur "16 matchs en huitièmes" due à mauvais filtrage KO (phase/stage)
//
// ✅ FIX BUG CRITIQUE (doublons poules après simulation):
// - Certains matchs reviennent avec groupIndex/groupId/phase/stageIndex undefined
//   => rrMatchesByGroup met alors gi=0 par défaut => tout part en Poule A.
//
// ✅ Solution robuste (FINAL):
//  1) mergeStableMatchMeta: merge anti-undefined + verrouillage depuis l’état précédent
//  2) stableMetaRef: snapshot par match.id des meta structurelles
//     - IMPORTANT: snapshot "UPGRADABLE" : si stable manque une clé et qu’on la voit plus tard, on la complète
//     - MAIS on ne remplace jamais une valeur stable déjà connue
//  3) persist: merged -> applyStableMeta -> updateStableMetaFromMatches (pour capturer les nouvelles meta propres)
// ============================================

import React from "react";
import MatchDetailCard from "../components/tournament/MatchDetailCard";
import type { Store } from "../lib/types";
import type { Tournament, TournamentMatch } from "../lib/tournaments/types";

import { startMatch, submitResult } from "../lib/tournaments/engine";
import {
  getTournamentLocal,
  listMatchesForTournamentLocal,
  upsertTournamentLocal,
  upsertMatchesForTournamentLocal,
  deleteTournamentLocal,
  deleteMatchesForTournamentLocal,
} from "../lib/tournaments/storeLocal";

import { History } from "../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  id: string;
};

const BYE = "__BYE__";
const TBD = "__TBD__";

const THEME = "#ffcf57";
const TAB_COLORS: Record<string, string> = {
  home: "#ffcf57",
  pools: "#42e6a4",
  standings: "#7fe2a9",
  bracket: "#4fb4ff",
  matches: "#ff4fd8",
  repechage: "#ff8f2b",
  linked: "#ffd56a",
  stats: "#b6b6ff",
};

function isByeId(x: any) {
  return String(x || "") === BYE;
}
function isTbdId(x: any) {
  return String(x || "") === TBD;
}
function isVoidByeMatch(m: any) {
  return isByeId(m?.aPlayerId) && isByeId(m?.bPlayerId);
}
function isByeMatch(m: any) {
  if (!m) return false;
  if (isVoidByeMatch(m)) return true;
  return isByeId(m?.aPlayerId) || isByeId(m?.bPlayerId);
}
function otherIdIfBye(m: any) {
  const a = String(m?.aPlayerId || "");
  const b = String(m?.bPlayerId || "");
  if (isByeId(a) && !isByeId(b) && b && !isTbdId(b)) return b;
  if (isByeId(b) && !isByeId(a) && a && !isTbdId(a)) return a;
  return "";
}
function isRealPlayable(m: any) {
  if (!m) return false;
  if (String(m.status || "") !== "pending") return false;
  if (!m?.aPlayerId || !m?.bPlayerId) return false;
  if (isTbdId(m.aPlayerId) || isTbdId(m.bPlayerId)) return false;
  if (isByeId(m.aPlayerId) || isByeId(m.bPlayerId)) return false;
  if (isVoidByeMatch(m)) return false;
  return true;
}

function formatDate(ts?: number) {
  if (!ts) return "";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "";
  }
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

// ------------------------------------------------------------
// ✅ PÉTANQUE SCORE HELPERS (tournoi)
// - Score peut venir de match.payload / match.summary
// - OU du storage History via match.historyMatchId
// ------------------------------------------------------------
type PetScore = { a: number; b: number };
type ScoreMap = Record<string, PetScore>;

function isPetanqueTournament(tour: any): boolean {
  const raw =
    tour?.game?.mode ||
    tour?.mode ||
    tour?.gameKey ||
    tour?.type ||
    tour?.format?.game ||
    tour?.config?.mode ||
    "";
  const mode = String(raw || "").toLowerCase().trim();
  return mode === "petanque" || mode.includes("petanque");
}

function extractPetanqueScoreFromMatch(m: any): PetScore | null {
  if (!m) return null;

  // 1) payload direct
  const p = m?.payload;
  const k1 = String(p?.kind || "").toLowerCase();
  if (k1 === "petanque") {
    const a = Number(p?.scoreA);
    const b = Number(p?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  // 2) summary direct
  const s = m?.summary;
  const k2 = String(s?.kind || "").toLowerCase();
  if (k2 === "petanque") {
    const a = Number(s?.scoreA);
    const b = Number(s?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  // 3) payload.summary
  const ps = p?.summary;
  const k3 = String(ps?.kind || "").toLowerCase();
  if (k3 === "petanque") {
    const a = Number(ps?.scoreA);
    const b = Number(ps?.scoreB);
    if (Number.isFinite(a) && Number.isFinite(b)) return { a: Math.floor(a), b: Math.floor(b) };
  }

  return null;
}

/* -------------------------
   Neon Icons (inline SVG)
-------------------------- */
function Icon({ name, color = THEME }: any) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none" };
  const stroke = color;
  const sw = 2.2;

  if (name === "back")
    return (
      <svg {...common}>
        <path d="M15 6 9 12l6 6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );

  if (name === "trash")
    return (
      <svg {...common}>
        <path d="M4 7h16" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M10 11v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M14 11v6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M6 7l1 14h10l1-14" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M9 7V4h6v3" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "play")
    return (
      <svg {...common}>
        <path d="M9 7v10l10-5-10-5Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "home")
    return (
      <svg {...common}>
        <path
          d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "pools")
    return (
      <svg {...common}>
        <path d="M7 7h10v4H7V7Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M5 18h6v-4H5v4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M13 18h6v-4h-6v4Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
      </svg>
    );

  if (name === "standings")
    return (
      <svg {...common}>
        <path d="M6 20V10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M12 20V4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M18 20v-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "bracket")
    return (
      <svg {...common}>
        <path d="M6 6h6v5H6V6Z" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M12 8h6v5h-6" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M12 10h3v8h-3" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M6 13h6" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  if (name === "matches")
    return (
      <svg {...common}>
        <path d="M7 7h10M7 12h10M7 17h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path
          d="M5 5v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V5"
          stroke={stroke}
          strokeWidth={sw}
          strokeLinejoin="round"
        />
      </svg>
    );

  if (name === "repechage")
    return (
      <svg {...common}>
        <path d="M6 7h9a4 4 0 0 1 0 8H8" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
        <path d="M9 9 6 7l3-2" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" />
        <path d="M8 15h10" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      </svg>
    );

  return (
    <svg {...common}>
      <path d="M5 19V5" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M9 19v-7" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M13 19v-11" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
      <path d="M17 19v-4" stroke={stroke} strokeWidth={sw} strokeLinecap="round" />
    </svg>
  );
}

/* -------------------------
   Top Tabs NEON (1 ligne + ICONES ONLY)
-------------------------- */
function NeonTopTabsIconsOnly({ tabs, activeKey, onChange }: any) {
  const iconMap: Record<string, string> = {
    home: "home",
    pools: "pools",
    standings: "standings",
    bracket: "bracket",
    matches: "matches",
    repechage: "repechage",
    linked: "matches",
    stats: "stats",
  };

  return (
    <div
      className="dc-scroll-thin"
      style={{
        marginTop: 10,
        display: "flex",
        gap: 10,
        alignItems: "center",
        overflowX: "auto",
        overflowY: "hidden",
        paddingBottom: 6,
        WebkitOverflowScrolling: "touch",
        width: "100%",
        maxWidth: "100%",
      }}
    >
      {(tabs || []).map((k: string) => {
        const accent = TAB_COLORS[k] || THEME;
        const active = activeKey === k;

        return (
          <button
            key={k}
            type="button"
            onClick={() => onChange(k)}
            style={{
              flex: "0 0 auto",
              width: 34,
              height: 34,
              borderRadius: 999,
              border: active ? `1px solid ${accent}CC` : "1px solid rgba(255,255,255,0.10)",
              background: active
                ? `radial-gradient(120% 180% at 20% 0%, ${accent}2a, rgba(0,0,0,0.25)), linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))`
                : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
              cursor: "pointer",
              boxShadow: active ? `0 0 16px ${accent}33` : "none",
              display: "grid",
              placeItems: "center",
            }}
            title={k}
            aria-label={k}
          >
            <span aria-hidden style={{ filter: active ? `drop-shadow(0 0 10px ${accent}66)` : "none" }}>
              <Icon name={iconMap[k] || "stats"} color={accent} />
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* -------------------------
   UI building blocks
-------------------------- */
function Pill({ active, label, onClick, accent = "#ffcf57" }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        flex: "0 0 auto",
        borderRadius: 999,
        padding: "7px 12px",
        border: active ? `1px solid ${accent}AA` : "1px solid rgba(255,255,255,0.12)",
        background: active
          ? `linear-gradient(180deg, ${accent}, ${accent}CC)`
          : "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))",
        color: active ? "#1b1508" : "rgba(255,255,255,0.92)",
        fontWeight: active ? 950 : 850,
        fontSize: 12.2,
        cursor: "pointer",
        boxShadow: active ? `0 10px 22px ${accent}25` : "none",
        whiteSpace: "nowrap",
      }}
      title={label}
    >
      {label}
    </button>
  );
}

function Card({ title, subtitle, badge, children, accent = "#ffcf57", icon }: any) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 14,
        marginTop: 12,
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,0.08), transparent 55%), linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))",
        border: "1px solid rgba(255,255,255,0.10)",
        boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
        overflow: "hidden",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
          {icon ? (
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: 10,
                display: "grid",
                placeItems: "center",
                background: `radial-gradient(circle at 30% 0%, ${accent}, ${accent}55)`,
                color: "#150d06",
                fontWeight: 950,
                flex: "0 0 auto",
              }}
            >
              {icon}
            </div>
          ) : null}
          <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
            <div
              style={{
                fontSize: 12.5,
                fontWeight: 950,
                letterSpacing: 0.3,
                color: accent,
                textShadow: `0 0 10px ${accent}40`,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {title}
            </div>
            {subtitle ? <div style={{ fontSize: 11.5, opacity: 0.78, lineHeight: 1.35 }}>{subtitle}</div> : null}
          </div>
        </div>
        {badge}
      </div>

      {children ? <div style={{ marginTop: 12, overflow: "hidden" }}>{children}</div> : null}
    </div>
  );
}

function MiniBadge({ label, value, accent = "#ffcf57" }: any) {
  return (
    <div
      style={{
        borderRadius: 999,
        padding: "6px 10px",
        border: `1px solid ${accent}55`,
        background: `linear-gradient(180deg, ${accent}22, rgba(255,255,255,0.04))`,
        color: "rgba(255,255,255,0.92)",
        fontWeight: 900,
        fontSize: 12,
        display: "flex",
        alignItems: "baseline",
        gap: 8,
        whiteSpace: "nowrap",
        flex: "0 0 auto",
      }}
    >
      <span style={{ opacity: 0.75, fontWeight: 850, fontSize: 11.5 }}>{label}</span>
      <span style={{ color: accent, textShadow: `0 0 10px ${accent}30` }}>{value}</span>
    </div>
  );
}

function AvatarCircle({ name, avatarUrl, size = 30, dim }: any) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        overflow: "hidden",
        background: "rgba(0,0,0,0.35)",
        border: "1px solid rgba(255,255,255,0.12)",
        display: "grid",
        placeItems: "center",
        flex: "0 0 auto",
        opacity: dim ? 0.65 : 1,
      }}
    >
      {avatarUrl ? (
        <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      ) : (
        <div style={{ fontWeight: 950, fontSize: Math.max(11, Math.floor(size * 0.4)) }}>{getInitials(name)}</div>
      )}
    </div>
  );
}

function PlayerPill({ name, avatarUrl, dim, extra }: any) {
  return (
    <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0, opacity: dim ? 0.6 : 1 }}>
      <AvatarCircle name={name} avatarUrl={avatarUrl} size={30} dim={dim} />
      <div style={{ minWidth: 0, display: "grid", gap: 2 }}>
        <div
          style={{
            fontWeight: 900,
            fontSize: 12.5,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name || "Joueur"}
        </div>
        {extra ? (
          <div
            style={{
              fontSize: 11,
              opacity: 0.75,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {extra}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/* ============================================================
   ✅ FIX BUG POOLS/KO (merge meta stable)
   ============================================================ */
function mergeStableMatchMeta(prevMatches: any[], nextMatches: any[]) {
  const prevById = new Map<string, any>();
  for (const pm of Array.isArray(prevMatches) ? prevMatches : []) {
    const id = String(pm?.id || "");
    if (!id) continue;
    const cur = prevById.get(id);
    if (!cur || (pm?.updatedAt ?? 0) >= (cur?.updatedAt ?? 0)) prevById.set(id, pm);
  }

  const STABLE_KEYS = [
    "phase",
    "stageIndex",
    "stage",
    "groupIndex",
    "groupId",
    "group",
    "roundIndex",
    "orderIndex",
    "bracketIndex",
    "bracketSide",
  ];

  const out: any[] = [];
  const seen = new Set<string>();

  for (const nm of Array.isArray(nextMatches) ? nextMatches : []) {
    const id = String(nm?.id || "");
    if (!id) continue;

    if (seen.has(id)) continue;
    seen.add(id);

    const pm = prevById.get(id);

    const merged: any = pm ? { ...pm } : {};
    for (const [k, v] of Object.entries(nm || {})) {
      if (v !== undefined) merged[k] = v;
    }

    if (pm) {
      for (const k of STABLE_KEYS) {
        const pv = pm?.[k];
        if (pv !== undefined && pv !== null) merged[k] = pv;
      }

      if (typeof pm?.groupIndex === "number") merged.groupIndex = pm.groupIndex;
      if (pm?.groupId != null) merged.groupId = pm.groupId;

      if (String(pm?.phase || "") === "ko") merged.phase = "ko";
      if (pm?.stageIndex === 1) merged.stageIndex = 1;
    }

    out.push(merged);
  }

  return out;
}

function scoreText(m: any) {
  const sc = getMatchScore(m);
  if (!sc) return "";
  return `${sc.a} - ${sc.b}`;
}

function koTourLabel(roundIndex: number, totalRounds: number) {
  const remaining = totalRounds - roundIndex;
  if (remaining <= 1) return "Finale";
  if (remaining === 2) return "Demi-finale";
  if (remaining === 3) return "Quart de finale";
  if (remaining === 4) return "Huitième de finale";
  return `Tour ${roundIndex + 1}`;
}

function matchPhaseLabel(m: any, viewKind: string, koRoundsCount: number) {
  const isGroupLike =
    String(m?.phase || "") === "groups" || (typeof m?.groupIndex === "number" && m.groupIndex >= 0);

  if (isGroupLike) {
    const g = typeof m?.groupIndex === "number" ? m.groupIndex : null;
    const gLabel = g != null ? `Poule ${String.fromCharCode(65 + g)}` : null;
    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
    return [gLabel, `Round ${r + 1}`].filter(Boolean).join(" • ");
  }

  if (viewKind.includes("ko") || viewKind === "groups_ko") {
    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
    return koTourLabel(r, koRoundsCount);
  }

  const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
  return `Round ${r + 1}`;
}

function matchPhaseShortLabel(m: any, viewKind: string, koRoundsCount: number) {
  const isGroupLike =
    String(m?.phase || "") === "groups" || (typeof m?.groupIndex === "number" && m.groupIndex >= 0);

  if (isGroupLike) {
    const g = typeof m?.groupIndex === "number" ? m.groupIndex : null;
    return g != null ? `Poule ${String.fromCharCode(65 + g)}` : "Poule";
  }

  return matchPhaseLabel(m, viewKind, koRoundsCount);
}

function pickFirstDefined(obj: any, keys: string[]) {
  for (const k of keys) {
    const v = obj?.[k];
    if (v != null && v !== "") return v;
  }
  return null;
}

function resolveSourceMatchForTbdSide(allMatches: any[], current: any, side: "a" | "b"): any | null {
  const directKeysA = ["aFromMatchId", "fromMatchIdA", "prevMatchIdA", "sourceMatchIdA", "feederMatchIdA"];
  const directKeysB = ["bFromMatchId", "fromMatchIdB", "prevMatchIdB", "sourceMatchIdB", "feederMatchIdB"];

  const direct = pickFirstDefined(current, side === "a" ? directKeysA : directKeysB);
  if (direct) {
    const f = allMatches.find((m) => String(m?.id) === String(direct));
    if (f) return f;
  }

  const currentId = String(current?.id || "");
  if (!currentId) return null;

  const candidates = allMatches.filter((m) => {
    const next = pickFirstDefined(m, ["nextMatchId", "nextId", "winnerToMatchId", "toMatchId"]);
    if (!next) return false;
    return String(next) === currentId;
  });

  if (!candidates.length) return null;

  const bySide = candidates.find((m) => {
    const slot = pickFirstDefined(m, ["nextSlot", "toSlot", "winnerToSlot", "slot"]);
    if (!slot) return false;
    const s = String(slot).toLowerCase();
    return side === "a" ? s.includes("a") || s.includes("left") : s.includes("b") || s.includes("right");
  });

  return bySide || candidates[0] || null;
}

function WinnerPlaceholder({ label, leftAvatarUrl, leftName, rightAvatarUrl, rightName }: any) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
      <div style={{ display: "flex", alignItems: "center", gap: -8, flex: "0 0 auto" }}>
        <div style={{ marginRight: -8, zIndex: 2 }}>
          <AvatarCircle name={leftName} avatarUrl={leftAvatarUrl} size={26} />
        </div>
        <AvatarCircle name={rightName} avatarUrl={rightAvatarUrl} size={26} />
      </div>

      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 950, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {label}
        </div>
        <div style={{ fontSize: 11, opacity: 0.72, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {leftName} vs {rightName}
        </div>
      </div>
    </div>
  );
}

function renderPlayerOrTbd(allMatches: any[], current: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? current?.aPlayerId : current?.bPlayerId || "");
  if (!pid) return <PlayerPill name="TBD" dim />;

  if (isByeId(pid)) return <PlayerPill name="BYE" dim />;

  if (!isTbdId(pid)) {
    const pl = playersById[pid];
    return <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatarDataUrl || pl?.avatar || pl?.avatarUrl || null} />;
  }

  const feeder = resolveSourceMatchForTbdSide(allMatches, current, side);
  if (!feeder) return <PlayerPill name="Vainqueur du match précédent" dim />;

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  const leftName = pa?.name || (isByeId(fa) ? "BYE" : isTbdId(fa) ? "TBD" : "Joueur");
  const rightName = pb?.name || (isByeId(fb) ? "BYE" : isTbdId(fb) ? "TBD" : "Joueur");
  const label = `Vainqueur match`;

  return (
    <WinnerPlaceholder
      label={label}
      leftName={leftName}
      leftAvatarUrl={pa?.avatarDataUrl || pa?.avatar || pa?.avatarUrl || null}
      rightName={rightName}
      rightAvatarUrl={pb?.avatarDataUrl || pb?.avatar || pb?.avatarUrl || null}
    />
  );
}

function computeStandings(groupPlayerIds: string[], groupMatches: any[], winPoints = 2) {
  const rows: Record<
    string,
    { id: string; played: number; wins: number; losses: number; points: number; scored: number; conceded: number }
  > = {};
  for (const pid of groupPlayerIds) rows[pid] = { id: pid, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

  for (const m of groupMatches) {
    if (m?.status !== "done") continue;

    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;
    if (isByeId(a) || isByeId(b)) continue;
    if (isTbdId(a) || isTbdId(b)) continue;

    if (!rows[a]) rows[a] = { id: a, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };
    if (!rows[b]) rows[b] = { id: b, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += winPoints;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += winPoints;
    }
  }

  const arr = Object.values(rows);
  arr.sort((r1, r2) => {
    if (r2.points !== r1.points) return r2.points - r1.points;
    const diff1 = r1.scored - r1.conceded;
    const diff2 = r2.scored - r2.conceded;
    if (diff2 !== diff1) return diff2 - diff1;
    return r2.wins - r1.wins;
  });
  return arr;
}

/* -------------------------
   STATS
-------------------------- */
function computeTournamentStats(playersById: Record<string, any>, matches: any[]) {
  const rows: Record<string, any> = {};
  const ids = Object.keys(playersById || {});
  for (const pid of ids) {
    rows[pid] = { id: pid, name: playersById[pid]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };
  }

  const done = (matches || []).filter((m) => String(m?.status) === "done" && !isByeMatch(m) && !isVoidByeMatch(m));

  for (const m of done) {
    const a = String(m?.aPlayerId || "");
    const b = String(m?.bPlayerId || "");
    if (!a || !b) continue;

    if (!rows[a]) rows[a] = { id: a, name: playersById[a]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };
    if (!rows[b]) rows[b] = { id: b, name: playersById[b]?.name || "Joueur", played: 0, wins: 0, losses: 0, scored: 0, conceded: 0, points: 0 };

    const sa = typeof m?.scoreA === "number" ? m.scoreA : 0;
    const sb = typeof m?.scoreB === "number" ? m.scoreB : 0;

    rows[a].played += 1;
    rows[b].played += 1;
    rows[a].scored += sa;
    rows[a].conceded += sb;
    rows[b].scored += sb;
    rows[b].conceded += sa;

    const w = String(m?.winnerId || "");
    if (w && w === a) {
      rows[a].wins += 1;
      rows[b].losses += 1;
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
    }
  }

  const list = Object.values(rows).map((r: any) => {
    const diff = r.scored - r.conceded;
    const winrate = r.played ? Math.round((r.wins / r.played) * 100) : 0;
    return { ...r, diff, winrate };
  });

  list.sort((a: any, b: any) => b.points - a.points || b.diff - a.diff || b.wins - a.wins);

  const global = {
    totalMatches: (matches || []).filter((m) => !isVoidByeMatch(m)).length,
    doneMatches: done.length,
    runningMatches: (matches || []).filter((m) => ["running", "playing"].includes(String(m?.status || ""))).length,
    playableMatches: (matches || []).filter((m) => isRealPlayable(m)).length,
    players: ids.length,
  };

  const leaders = {
    points: list[0] || null,
    wins: [...list].sort((a: any, b: any) => b.wins - a.wins || b.winrate - a.winrate)[0] || null,
    diff: [...list].sort((a: any, b: any) => b.diff - a.diff || b.points - a.points)[0] || null,
    scored: [...list].sort((a: any, b: any) => b.scored - a.scored || b.points - a.points)[0] || null,
  };

  return { global, list, leaders };
}


/* -------------------------
   PARTIES HISTORIQUES LIÉES À UNE LIGUE
-------------------------- */
function linkedSafeLower(v: any) {
  return String(v ?? "").toLowerCase().trim();
}

function getHistoryRowId(rec: any) {
  return String(rec?.id ?? rec?.matchId ?? rec?.historyMatchId ?? "").trim();
}

function getHistoryRowTime(rec: any) {
  const n = Number(rec?.updatedAt ?? rec?.createdAt ?? rec?.summary?.finishedAt ?? rec?.payload?.updatedAt ?? rec?.payload?.createdAt ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function getHistoryRowStatus(rec: any) {
  const raw = linkedSafeLower(rec?.status ?? rec?.summary?.status ?? rec?.payload?.status);
  if (raw === "finished" || raw === "done" || raw === "termine" || raw === "terminé") return "finished";
  if (rec?.winnerId || rec?.summary?.winnerId || rec?.payload?.winnerId || rec?.payload?.summary?.winnerId) return "finished";
  if (Array.isArray(rec?.summary?.rankings) || Array.isArray(rec?.payload?.summary?.rankings) || Array.isArray(rec?.payload?.rankings)) return "finished";
  if (raw === "in_progress" || raw === "playing" || raw === "running") return "in_progress";
  return raw || "finished";
}

function getHistoryMode(rec: any) {
  const raw =
    rec?.kind ??
    rec?.mode ??
    rec?.game?.mode ??
    rec?.game?.kind ??
    rec?.summary?.mode ??
    rec?.summary?.kind ??
    rec?.summary?.game?.mode ??
    rec?.payload?.kind ??
    rec?.payload?.mode ??
    rec?.payload?.game?.mode ??
    rec?.payload?.config?.mode ??
    rec?.payload?.summary?.kind ??
    rec?.payload?.summary?.mode ??
    "";
  return linkedSafeLower(raw);
}

function normalizeHistorySport(v: any) {
  const raw = linkedSafeLower(v);
  if (!raw) return "";
  if (["darts", "x01", "cricket", "shanghai", "killer", "clock", "scram", "golf"].includes(raw)) return "darts";
  if (["babyfoot", "baby-foot", "foosball", "baby_foot"].includes(raw)) return "babyfoot";
  if (["petanque", "pétanque", "boules"].includes(raw)) return "petanque";
  if (["pingpong", "ping-pong", "table_tennis", "table-tennis"].includes(raw)) return "pingpong";
  if (["molkky", "mölkky"].includes(raw)) return "molkky";
  if (["dice", "dicegame", "dés", "des"].includes(raw)) return "dicegame";
  return raw;
}

function getTournamentSport(tour: any) {
  return normalizeHistorySport(
    tour?.sport ??
      tour?.competitionSport ??
      tour?.game?.rules?.sport ??
      tour?.meta?.forceMode ??
      tour?.game?.mode ??
      tour?.mode ??
      "darts"
  ) || "darts";
}

function getHistorySport(rec: any) {
  return normalizeHistorySport(
    rec?.sport ??
      rec?.competitionSport ??
      rec?.game?.sport ??
      rec?.summary?.sport ??
      rec?.payload?.sport ??
      rec?.payload?.game?.sport ??
      getHistoryMode(rec)
  );
}

function getLeagueFormatForLinkedHistory(tour: any) {
  const f = linkedSafeLower(tour?.game?.rules?.leagueFormat ?? tour?.meta?.leagueFormat ?? tour?.leagueFormat ?? tour?.format);
  const s = linkedSafeLower(tour?.game?.rules?.scoringMode ?? tour?.meta?.scoringMode ?? tour?.scoringMode);
  const mf = linkedSafeLower(tour?.meta?.format);
  if (f === "multi" || s === "rank_points" || mf === "league_multi") return "multi";
  if (f === "free" || mf === "league_free") return "free";
  if (f === "return") return "return";
  if (f === "simple") return "simple";
  return f || "";
}

function getHistoryRawModeText(rec: any) {
  return [
    rec?.kind,
    rec?.mode,
    rec?.variant,
    rec?.game?.mode,
    rec?.game?.kind,
    rec?.summary?.mode,
    rec?.summary?.kind,
    rec?.summary?.game?.mode,
    rec?.payload?.kind,
    rec?.payload?.mode,
    rec?.payload?.variant,
    rec?.payload?.gameMode,
    rec?.payload?.game?.mode,
    rec?.payload?.config?.mode,
    rec?.payload?.summary?.kind,
    rec?.payload?.summary?.mode,
  ].filter(Boolean).map((x: any) => linkedSafeLower(x)).join("|");
}

function getHistoryParticipantCount(rec: any) {
  const players = getHistoryPlayers(rec);
  const ranking = getHistoryRanking(rec);
  const n = Math.max(
    Array.isArray(players) ? players.length : 0,
    Array.isArray(ranking) ? ranking.length : 0,
    Number(rec?.playersCount || 0),
    Number(rec?.summary?.playersCount || 0),
    Number(rec?.payload?.playersCount || 0),
    Number(rec?.payload?.summary?.playersCount || 0)
  );
  return Number.isFinite(n) ? n : 0;
}

function getHistoryX01Kind(rec: any): "multi" | "duo" | "x01" | "other" {
  const mode = getHistoryMode(rec);
  const raw = getHistoryRawModeText(rec);
  const isTraining = raw.includes("training_x01") || raw.includes("training-x01") || raw.includes("training");
  if (isTraining) return "other";
  const isX01 = mode === "x01" || raw.includes("x01");
  if (!isX01) return "other";
  const count = getHistoryParticipantCount(rec);
  if (count > 2) return "multi";
  if (count === 2) return "duo";
  return "x01";
}

function getHistoryLinkedDisplayMode(rec: any) {
  const x01Kind = getHistoryX01Kind(rec);
  if (x01Kind === "multi") return "x01 multi";
  if (x01Kind === "duo") return "x01 duo";
  return getHistoryMode(rec);
}

function isHistoryCompatibleWithTournament(rec: any, tour: any) {
  const ts = getTournamentSport(tour);
  const hs = getHistorySport(rec);
  if (ts && hs && ts !== hs) return false;

  const leagueFormat = getLeagueFormatForLinkedHistory(tour);
  if (ts === "darts" && leagueFormat === "multi") {
    // Une Ligue MULTI est alimentée par des parties libres X01 MULTI uniquement.
    // On exclut donc les X01 DUO affichés dans l'historique.
    return getHistoryX01Kind(rec) === "multi";
  }
  if (ts === "darts" && leagueFormat === "free") {
    // Une Saison libre classique est alimentée par des matchs X01 DUO uniquement.
    return getHistoryX01Kind(rec) === "duo";
  }

  const tMode = linkedSafeLower(tour?.game?.mode ?? tour?.mode ?? "");
  const hMode = getHistoryMode(rec);
  if (!tMode || !hMode) return true;
  if (tMode === hMode) return true;
  if (normalizeHistorySport(tMode) === normalizeHistorySport(hMode)) return true;
  if (normalizeHistorySport(tMode) === "darts" && normalizeHistorySport(hMode) === "darts") return true;
  return false;
}

function getHistoryPlayers(rec: any) {
  const sources = [
    rec?.players,
    rec?.summary?.players,
    rec?.payload?.players,
    rec?.payload?.summary?.players,
    rec?.payload?.config?.players,
    rec?.payload?.state?.players,
  ];
  const map = new Map<string, any>();
  for (const src of sources) {
    if (!Array.isArray(src)) continue;
    for (const p of src) {
      const id = String(p?.id ?? p?.playerId ?? p?.profileId ?? p?.uid ?? p?.name ?? "").trim();
      if (!id) continue;
      const prev = map.get(id) || {};
      map.set(id, {
        ...prev,
        ...p,
        id,
        name: p?.name ?? p?.displayName ?? p?.nickname ?? p?.label ?? prev?.name ?? id,
        avatarDataUrl: p?.avatarDataUrl ?? p?.avatar ?? p?.avatarUrl ?? p?.photo ?? p?.image ?? prev?.avatarDataUrl ?? null,
        avatarUrl: p?.avatarUrl ?? p?.avatarDataUrl ?? p?.avatar ?? p?.photo ?? p?.image ?? prev?.avatarUrl ?? null,
        avatar: p?.avatarDataUrl ?? p?.avatar ?? p?.avatarUrl ?? p?.photo ?? p?.image ?? prev?.avatar ?? null,
        isBot: !!(p?.isBot || p?.bot || prev?.isBot),
      });
    }
  }
  return Array.from(map.values());
}

function getHistoryRanking(rec: any) {
  const candidates = [
    rec?.summary?.rankings,
    rec?.summary?.ranking,
    rec?.summary?.classification,
    rec?.payload?.summary?.rankings,
    rec?.payload?.summary?.ranking,
    rec?.payload?.ranking,
    rec?.payload?.rankings,
    rec?.payload?.finalRanking,
    rec?.payload?.result?.rankings,
    rec?.payload?.state?.ranking,
  ];
  const players = getHistoryPlayers(rec);
  const byId = new Map(players.map((p: any) => [String(p.id), p]));

  for (const raw of candidates) {
    if (!Array.isArray(raw) || !raw.length) continue;
    const out = raw
      .map((r: any, idx: number) => {
        const id = String(r?.id ?? r?.playerId ?? r?.profileId ?? r?.pid ?? r?.uid ?? r?.name ?? "").trim();
        if (!id) return null;
        const p = byId.get(id) || {};
        const rank = Math.max(1, Math.floor(Number(r?.rank ?? r?.place ?? r?.position ?? idx + 1) || idx + 1));
        return {
          ...p,
          ...r,
          id,
          playerId: id,
          rank,
          name: r?.name ?? p?.name ?? id,
          score: r?.score ?? r?.points ?? r?.remaining ?? r?.total ?? null,
          avatarDataUrl: r?.avatarDataUrl ?? r?.avatar ?? r?.avatarUrl ?? p?.avatarDataUrl ?? p?.avatar ?? null,
          avatarUrl: r?.avatarUrl ?? r?.avatarDataUrl ?? r?.avatar ?? p?.avatarUrl ?? null,
          avatar: r?.avatarDataUrl ?? r?.avatar ?? r?.avatarUrl ?? p?.avatar ?? null,
        };
      })
      .filter(Boolean)
      .sort((a: any, b: any) => Number(a.rank || 0) - Number(b.rank || 0));
    if (out.length) return out;
  }

  // Fallback 1v1 : vainqueur puis autre joueur.
  const winnerId = String(rec?.winnerId ?? rec?.summary?.winnerId ?? rec?.payload?.winnerId ?? rec?.payload?.summary?.winnerId ?? "").trim();
  if (winnerId && players.length >= 2) {
    const rest = players.filter((p: any) => String(p.id) !== winnerId);
    const win = players.find((p: any) => String(p.id) === winnerId) || { id: winnerId, name: winnerId };
    return [win, ...rest].map((p: any, idx: number) => ({ ...p, playerId: String(p.id), rank: idx + 1 }));
  }

  return players.map((p: any, idx: number) => ({ ...p, playerId: String(p.id), rank: idx + 1 }));
}

function getHistoryScorePair(rec: any, aId: string, bId: string) {
  const s = rec?.summary || rec?.payload?.summary || rec?.payload || {};
  const directA = Number(s?.scoreA ?? s?.setsA ?? s?.legsA ?? s?.result?.scoreA ?? s?.result?.a ?? rec?.scoreA ?? rec?.setsA ?? rec?.legsA);
  const directB = Number(s?.scoreB ?? s?.setsB ?? s?.legsB ?? s?.result?.scoreB ?? s?.result?.b ?? rec?.scoreB ?? rec?.setsB ?? rec?.legsB);
  if (Number.isFinite(directA) && Number.isFinite(directB)) return { a: Math.floor(directA), b: Math.floor(directB) };
  const winnerId = String(rec?.winnerId ?? s?.winnerId ?? "");
  if (winnerId && winnerId === aId) return { a: 1, b: 0 };
  if (winnerId && winnerId === bId) return { a: 0, b: 1 };
  return { a: 1, b: 0 };
}

function getRankPointsForTournament(tour: any) {
  const raw = tour?.game?.rules?.rankPoints ?? tour?.meta?.rankPoints ?? tour?.rankPoints ?? [];
  if (Array.isArray(raw)) return raw.map((x: any) => Math.max(0, Math.floor(Number(x) || 0))).filter((x: number) => Number.isFinite(x));
  if (typeof raw === "string") return raw.split(/[;,|\s]+/).map((x) => Math.max(0, Math.floor(Number(x) || 0))).filter((x) => Number.isFinite(x));
  return [10, 8, 6, 4, 2, 1];
}

function isLeagueMultiTournament(tour: any) {
  const f = linkedSafeLower(tour?.game?.rules?.leagueFormat ?? tour?.meta?.leagueFormat ?? tour?.format);
  const s = linkedSafeLower(tour?.game?.rules?.scoringMode ?? tour?.meta?.scoringMode ?? tour?.scoringMode);
  return f === "multi" || s === "rank_points" || linkedSafeLower(tour?.meta?.format) === "league_multi";
}

function getLeagueMultiEndPenalty(rank: number, totalPlayers: number) {
  const r = Math.max(1, Math.floor(Number(rank) || 1));
  const total = Math.max(0, Math.floor(Number(totalPlayers) || 0));
  if (total < 3 || r <= 1) return 0;
  const fromLast = total - r;
  if (fromLast === 0) return 5;
  if (fromLast === 1) return 3;
  if (fromLast === 2) return 1;
  return 0;
}

function getLeagueMultiRankPoints(tour: any, rank: number, totalPlayers: number) {
  const r = Math.max(1, Math.floor(Number(rank) || 1));
  const base = Math.max(0, Number(getRankPointsForTournament(tour)[r - 1] ?? 0) || 0);
  const malus = getLeagueMultiEndPenalty(r, totalPlayers);
  return Math.max(0, base - malus);
}

function getSeasonFreeRankPoints(rank: number) {
  return Math.max(1, Math.floor(Number(rank) || 1)) === 1 ? 3 : 0;
}

function getLinkedPointsAwarded(link: any, tour: any) {
  const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
  const leagueFormat = getLeagueFormatForLinkedHistory(tour);

  if (ranking.length && leagueFormat === "multi") {
    const total = ranking.length;
    return ranking
      .map((r: any, idx: number) => {
        const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
        const base = Math.max(0, Number(getRankPointsForTournament(tour)[rank - 1] ?? 0) || 0);
        const malus = getLeagueMultiEndPenalty(rank, total);
        return {
          playerId: String(r?.playerId ?? r?.id ?? ""),
          name: r?.name || "Joueur",
          rank,
          basePoints: base,
          malus,
          points: Math.max(0, base - malus),
        };
      })
      .filter((r: any) => r.playerId);
  }

  if (ranking.length && leagueFormat === "free") {
    return ranking
      .map((r: any, idx: number) => {
        const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
        return {
          playerId: String(r?.playerId ?? r?.id ?? ""),
          name: r?.name || "Joueur",
          rank,
          basePoints: getSeasonFreeRankPoints(rank),
          malus: 0,
          points: getSeasonFreeRankPoints(rank),
        };
      })
      .filter((r: any) => r.playerId);
  }

  return Array.isArray(link?.pointsAwarded) ? link.pointsAwarded : [];
}

function buildLinkedHistoryEntry(rec: any, tour: any) {
  const historyMatchId = getHistoryRowId(rec);
  const ranking = getHistoryRanking(rec).map((r: any, idx: number) => ({ ...r, rank: Math.max(1, Number(r?.rank || idx + 1) || idx + 1) }));
  const pointsAwarded = getLinkedPointsAwarded({ ranking }, tour);

  return {
    id: `linked_${historyMatchId}`,
    historyMatchId,
    matchId: historyMatchId,
    source: "history",
    linkedAt: Date.now(),
    createdAt: getHistoryRowTime(rec) || Date.now(),
    mode: getHistoryMode(rec) || tour?.game?.mode || "x01",
    sport: getHistorySport(rec) || getTournamentSport(tour),
    status: "linked",
    label: `${String(getHistoryMode(rec) || tour?.game?.mode || "match").toUpperCase()} • ${formatDate(getHistoryRowTime(rec))}`,
    players: getHistoryPlayers(rec),
    ranking,
    pointsAwarded,
  };
}

function getPlayedCount(row: any) {
  return Math.max(0, Number(row?.played ?? ((Number(row?.wins || 0) + Number(row?.losses || 0)))) || 0);
}

function getPointsAverage(row: any) {
  const played = getPlayedCount(row);
  if (!played) return 0;
  return (Number(row?.points || 0) || 0) / played;
}

function roundPointsAverage(value: number) {
  const n = Number(value || 0);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

function formatPointsAverage(value: number) {
  const n = roundPointsAverage(value);
  if (!Number.isFinite(n)) return "0";
  return n.toFixed(1).replace(/\.0$/, "");
}

function getPodiumCount(row: any, averageMode = false) {
  const explicit =
    Number(row?.podium ?? row?.podiums ?? row?.top3 ?? row?.topThree ?? row?.podiumCount ?? NaN);
  if (Number.isFinite(explicit)) return Math.max(0, Math.floor(explicit));

  // Saison libre / DUO : une partie à 2 joueurs place forcément les deux joueurs dans le TOP 3.
  // Pour les anciennes lignes sans champ podium, on retombe donc sur le nombre de matchs joués.
  if (averageMode) return getPlayedCount(row);

  return 0;
}

function PodiumHeaderIcon({ color = "#7fe2a9" }: { color?: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-label="Podium" style={{ display: "block" }}>
      <path d="M10 7h4v13h-4V7Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 12h4v8H4v-8Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M16 10h4v10h-4V10Z" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      <path d="M12 3.5l.78 1.58 1.74.25-1.26 1.23.3 1.73L12 7.47l-1.56.82.3-1.73-1.26-1.23 1.74-.25L12 3.5Z" fill={color} />
    </svg>
  );
}

const AVERAGE_STANDINGS_MIN_PLAYED = 2;

function sortAverageStandingsRows(rows: any[]) {
  return (Array.isArray(rows) ? rows.slice() : []).sort((a: any, b: any) => {
    const avgDiff = getPointsAverage(b) - getPointsAverage(a);
    if (Math.abs(avgDiff) > 0.000001) return avgDiff;
    if ((Number(b?.points || 0) || 0) !== (Number(a?.points || 0) || 0)) return (Number(b?.points || 0) || 0) - (Number(a?.points || 0) || 0);
    if (getPodiumCount(b, true) !== getPodiumCount(a, true)) return getPodiumCount(b, true) - getPodiumCount(a, true);
    if ((Number(b?.wins || 0) || 0) !== (Number(a?.wins || 0) || 0)) return (Number(b?.wins || 0) || 0) - (Number(a?.wins || 0) || 0);
    return ((Number(b?.scored || 0) || 0) - (Number(b?.conceded || 0) || 0)) - ((Number(a?.scored || 0) || 0) - (Number(a?.conceded || 0) || 0));
  });
}

function withPointsAverage(rows: any[]) {
  return (Array.isArray(rows) ? rows : []).map((r: any) => ({
    ...r,
    pointsAverage: roundPointsAverage(getPointsAverage(r)),
    pointsPerMatch: roundPointsAverage(getPointsAverage(r)),
    ptMoy: roundPointsAverage(getPointsAverage(r)),
  }));
}

function computeLinkedMultiStandings(tour: any, linkedMatches: any[]) {
  const rows: Record<string, any> = {};
  const players = Array.isArray(tour?.players) ? tour.players : [];
  for (const p of players) {
    const id = String(p?.id || "");
    if (!id) continue;
    rows[id] = { id, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0, podium: 0, podiums: 0, top3: 0 };
  }

  for (const link of Array.isArray(linkedMatches) ? linkedMatches : []) {
    const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
    const pointsAwarded = getLinkedPointsAwarded(link, tour);
    const pointsById = new Map(pointsAwarded.map((x: any) => [String(x?.playerId || ""), Number(x?.points || 0)]));
    const count = ranking.length;
    ranking.forEach((r: any, idx: number) => {
      const id = String(r?.playerId ?? r?.id ?? "");
      if (!id) return;
      if (!rows[id]) rows[id] = { id, played: 0, wins: 0, losses: 0, points: 0, scored: 0, conceded: 0, podium: 0, podiums: 0, top3: 0 };
      const rank = Math.max(1, Number(r?.rank || idx + 1) || idx + 1);
      rows[id].played += 1;
      if (rank === 1) rows[id].wins += 1;
      if (rank > 1) rows[id].losses += 1;
      if (rank <= 3) {
        rows[id].podium = (Number(rows[id].podium || 0) || 0) + 1;
        rows[id].podiums = (Number(rows[id].podiums || 0) || 0) + 1;
        rows[id].top3 = (Number(rows[id].top3 || 0) || 0) + 1;
      }
      rows[id].points += Number(pointsById.get(id) ?? 0) || 0;
      rows[id].scored += Math.max(0, count - rank + 1);
      rows[id].conceded += Math.max(0, rank - 1);
    });
  }

  return sortAverageStandingsRows(withPointsAverage(Object.values(rows)));
}

/* -------------------------
   KO DETAILS (Détails)
-------------------------- */
function getMatchScore(m: any) {
  if (!m) return null;

  const a =
    (typeof m?.scoreA === "number" ? m.scoreA : null) ??
    (typeof m?.aScore === "number" ? m.aScore : null) ??
    (typeof m?.setsA === "number" ? m.setsA : null) ??
    (typeof m?.legsA === "number" ? m.legsA : null) ??
    (typeof m?.result?.a === "number" ? m.result.a : null) ??
    (typeof m?.score?.a === "number" ? m.score.a : null) ??
    null;

  const b =
    (typeof m?.scoreB === "number" ? m.scoreB : null) ??
    (typeof m?.bScore === "number" ? m.bScore : null) ??
    (typeof m?.setsB === "number" ? m.setsB : null) ??
    (typeof m?.legsB === "number" ? m.legsB : null) ??
    (typeof m?.result?.b === "number" ? m.result.b : null) ??
    (typeof m?.score?.b === "number" ? m.score.b : null) ??
    null;

  if (a != null && b != null) return { a, b };
  return null;
}

function ScoreBadge({ score }: { score: { a: number; b: number } | null }) {
  if (!score) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%,-50%)",
        padding: "6px 10px",
        borderRadius: 999,
        background: "rgba(10,12,16,0.72)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: "0 12px 26px rgba(0,0,0,0.35)",
        fontSize: 12,
        fontWeight: 950,
        letterSpacing: 0.2,
        color: "rgba(255,255,255,0.92)",
        pointerEvents: "none",
        whiteSpace: "nowrap",
      }}
    >
      {score.a}–{score.b}
    </div>
  );
}

function WorldCupKoDetailsColumns({
  koMatches,
  renderMatchCard,
  getScore,
}: {
  koMatches: any[];
  renderMatchCard: (m: any) => React.ReactNode;
  getScore: (m: any) => { a: number; b: number } | null;
}) {
  if (!koMatches?.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>;

  const CARD_H = 138;
  const GAP = 12;
  const PAD_T = 8;

  const rounds = Array.from(new Set(koMatches.map((m) => Number(m.roundIndex ?? 0)))).sort((a, b) => a - b);
  const byRound: Record<number, any[]> = {};
  for (const r of rounds) byRound[r] = [];
  for (const m of koMatches) byRound[Number(m.roundIndex ?? 0)].push(m);
  for (const r of rounds) byRound[r].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const maxLen = Math.max(...rounds.map((r) => (byRound[r] || []).length), 1);

  return (
    <div className="dc-scroll-thin" style={{ overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", paddingBottom: 10, width: "100%", maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "stretch", gap: 12 }}>
        {rounds.map((r) => {
          const items = byRound[r] || [];
          const missing = maxLen - items.length;
          const offset = PAD_T + (missing * (CARD_H + GAP)) / 2;

          return (
            <div
              key={r}
              style={{
                flex: "0 0 auto",
                width: 292,
                paddingTop: Math.max(0, offset),
                paddingBottom: PAD_T,
                display: "grid",
                gridAutoRows: `${CARD_H}px`,
                gap: GAP,
              }}
            >
              {items.map((m) => {
                const sc = getScore(m);
                return (
                  <div key={m.id} style={{ position: "relative", minHeight: CARD_H }}>
                    <div style={{ height: "100%" }}>{renderMatchCard(m)}</div>
                    <ScoreBadge score={sc} />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------
   BRACKET (Vue)
-------------------------- */
function flagEmojiFromISO(code?: string) {
  const cc = String(code || "").trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) return "";
  const A = 0x1f1e6;
  const base = "A".charCodeAt(0);
  const first = A + (cc.charCodeAt(0) - base);
  const second = A + (cc.charCodeAt(1) - base);
  return String.fromCodePoint(first, second);
}

function BracketAvatar({ player, dim }: any) {
  const name = player?.name || "Joueur";
  const avatar = player?.avatar || null;
  const flag = flagEmojiFromISO(player?.countryCode);

  return (
    <div style={{ position: "relative", width: 34, height: 34, opacity: dim ? 0.55 : 1 }}>
      <div style={{ filter: "drop-shadow(0 0 10px rgba(0,0,0,0.35))" }}>
        <AvatarCircle name={name} avatarUrl={avatar} size={34} dim={dim} />
      </div>
      {flag ? (
        <div
          title={player?.countryCode || ""}
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "rgba(10,10,14,0.92)",
            border: "1px solid rgba(255,255,255,0.14)",
            display: "grid",
            placeItems: "center",
            fontSize: 12,
            boxShadow: "0 10px 22px rgba(0,0,0,0.35)",
          }}
        >
          {flag}
        </div>
      ) : null}
    </div>
  );
}

function resolvePlayerForSide(allMatches: any[], m: any, side: "a" | "b", playersById: Record<string, any>) {
  const pid = String(side === "a" ? m?.aPlayerId : m?.bPlayerId || "");
  if (!pid) return { kind: "tbd" as const, player: null };
  if (isByeId(pid)) return { kind: "bye" as const, player: null };
  if (!isTbdId(pid)) return { kind: "player" as const, player: playersById[pid] || null };

  const feeder = resolveSourceMatchForTbdSide(allMatches, m, side);
  if (!feeder) return { kind: "tbd" as const, player: null };

  const fa = String(feeder?.aPlayerId || "");
  const fb = String(feeder?.bPlayerId || "");
  const pa = fa && playersById[fa] ? playersById[fa] : null;
  const pb = fb && playersById[fb] ? playersById[fb] : null;

  return { kind: "feeder" as const, feederA: pa, feederB: pb };
}

function WorldCupBracketViewPure({ koMatches, playersById, allMatches, onOpenMatch }: any) {
  if (!koMatches?.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match KO à afficher.</div>;

  const COL_W = 86;
  const COL_GAP = 60;
  const MATCH_H = 78;
  const ROW_GAP = 22;
  const PAD_T = 12;
  const PAD_L = 12;

  const STEP = MATCH_H + ROW_GAP;

  const rounds = Array.from(new Set(koMatches.map((m: any) => Number(m.roundIndex ?? 0)))).sort((a, b) => a - b);
  const byRound: Record<number, any[]> = {};
  for (const r of rounds) byRound[r] = [];
  for (const m of koMatches) {
    const r = Number(m.roundIndex ?? 0);
    (byRound[r] ||= []).push(m);
  }
  for (const r of rounds) byRound[r].sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

  const firstRound = rounds[0];
  const firstCount = (byRound[firstRound] || []).length;
  const canvasH = PAD_T * 2 + firstCount * MATCH_H + Math.max(0, firstCount - 1) * ROW_GAP;
  const canvasW = PAD_L * 2 + rounds.length * COL_W + Math.max(0, rounds.length - 1) * COL_GAP;

  const colX = (roundPos: number) => PAD_L + roundPos * (COL_W + COL_GAP);

  function matchTop(roundPos: number, matchIndex: number) {
    const pow = 2 ** roundPos;
    return PAD_T + ((pow - 1) / 2) * STEP + matchIndex * pow * STEP;
  }
  function matchCenterY(roundPos: number, matchIndex: number) {
    return matchTop(roundPos, matchIndex) + MATCH_H / 2;
  }

  const lines: Array<{ x1: number; y1: number; x2: number; y2: number; xm: number }> = [];
  for (let ri = 0; ri < rounds.length - 1; ri++) {
    const r = rounds[ri];
    const nextR = rounds[ri + 1];
    const left = byRound[r] || [];
    const right = byRound[nextR] || [];

    for (let i = 0; i < left.length; i++) {
      const j = Math.floor(i / 2);
      if (!right[j]) continue;

      const x1 = colX(ri) + COL_W;
      const y1 = matchCenterY(ri, i);
      const x2 = colX(ri + 1);
      const y2 = matchCenterY(ri + 1, j);
      const xm = x1 + COL_GAP * 0.52;
      lines.push({ x1, y1, x2, y2, xm });
    }
  }

  return (
    <div className="dc-scroll-thin" style={{ width: "100%", maxWidth: "100%", overflowX: "auto", overflowY: "hidden", WebkitOverflowScrolling: "touch", paddingBottom: 8 }}>
      <div style={{ position: "relative", width: canvasW, height: canvasH, margin: "0 auto" }}>
        <svg width={canvasW} height={canvasH} viewBox={`0 0 ${canvasW} ${canvasH}`} style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
          {lines.map((L, idx) => (
            <g key={idx}>
              <path d={`M ${L.x1} ${L.y1} L ${L.xm} ${L.y1}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <path d={`M ${L.xm} ${L.y1} L ${L.xm} ${L.y2}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <path d={`M ${L.xm} ${L.y2} L ${L.x2} ${L.y2}`} stroke="rgba(255,255,255,0.22)" strokeWidth={2} fill="none" />
              <circle cx={L.xm} cy={L.y2} r={4.2} fill="rgba(79,180,255,0.65)" />
            </g>
          ))}
        </svg>

        {rounds.map((r, ri) => {
          const items = byRound[r] || [];
          return (
            <div key={r} style={{ position: "absolute", top: 0, left: colX(ri), width: COL_W, height: canvasH }}>
              {items.map((m: any, i: number) => {
                const a = resolvePlayerForSide(allMatches, m, "a", playersById);
                const b = resolvePlayerForSide(allMatches, m, "b", playersById);

                const renderSide = (s: any) => {
                  if (s.kind === "player") return <BracketAvatar player={s.player} />;
                  if (s.kind === "bye") return <BracketAvatar player={{ name: "BYE" }} dim />;
                  if (s.kind === "feeder")
                    return (
                      <div style={{ display: "flex", gap: 6 }}>
                        <BracketAvatar player={s.feederA || { name: "TBD" }} dim={!s.feederA} />
                        <BracketAvatar player={s.feederB || { name: "TBD" }} dim={!s.feederB} />
                      </div>
                    );
                  return <BracketAvatar player={{ name: "TBD" }} dim />;
                };

                return (
                  <div
                    key={m.id}
                    onClick={onOpenMatch ? () => onOpenMatch(m) : undefined}
                    role={onOpenMatch ? "button" : undefined}
                    tabIndex={onOpenMatch ? 0 : undefined}
                    onKeyDown={onOpenMatch ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onOpenMatch(m);
                      }
                    } : undefined}
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: matchTop(ri, i),
                      height: MATCH_H,
                      display: "grid",
                      placeItems: "center",
                      gap: 10,
                      cursor: onOpenMatch ? "pointer" : "default",
                    }}
                  >
                    {renderSide(a)}
                    {renderSide(b)}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div style={{ position: "absolute", top: 0, left: canvasW - PAD_L, width: PAD_L, height: canvasH }} />
      </div>
    </div>
  );
}

function StandingsTable({
  rows,
  playersById,
  accent = "#7fe2a9",
  averageMode = false,
}: {
  rows: any[];
  playersById: Record<string, any>;
  accent?: string;
  averageMode?: boolean;
}) {
  const sortedRows = averageMode ? sortAverageStandingsRows(withPointsAverage(rows || [])) : (rows || []);
  const eligibleRows = averageMode ? sortedRows.filter((r: any) => getPlayedCount(r) >= AVERAGE_STANDINGS_MIN_PLAYED) : sortedRows;
  const displayRows = averageMode && eligibleRows.length > 0 ? eligibleRows : sortedRows;
  const hiddenUnderMin = averageMode && eligibleRows.length > 0 ? Math.max(0, sortedRows.length - eligibleRows.length) : 0;
  const showDelta = !averageMode;

  const thStyle: React.CSSProperties = {
    padding: "8px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.10)",
    background: "rgba(8,10,14,0.92)",
    color: "rgba(255,255,255,0.70)",
    fontSize: 9.5,
    lineHeight: 1,
    fontWeight: 950,
    textTransform: "uppercase",
    letterSpacing: 0.2,
  };
  const tdStyle: React.CSSProperties = {
    padding: "7px 6px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
    fontSize: 11,
    lineHeight: 1.05,
    verticalAlign: "middle",
  };
  const right: React.CSSProperties = { textAlign: "right", whiteSpace: "nowrap" };

  return (
    <div
      className="dc-scroll-thin"
      style={{
        width: "100%",
        overflowX: "auto",
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
      }}
    >
      {averageMode ? (
        <div
          style={{
            padding: "7px 9px",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            background: "rgba(127,226,169,0.055)",
            color: "rgba(255,255,255,0.74)",
            fontSize: 10,
            fontWeight: 850,
          }}
        >
          Classement officiel : <b style={{ color: accent }}>Pts/match</b>, 2 matchs minimum.
          {hiddenUnderMin ? <span style={{ opacity: 0.72 }}> {hiddenUnderMin} joueur(s) masqué(s).</span> : null}
        </div>
      ) : null}

      <table
        style={{
          width: "100%",
          minWidth: averageMode ? 450 : 430,
          borderCollapse: "collapse",
          tableLayout: "fixed",
        }}
      >
        <colgroup>
          <col style={{ width: 30 }} />
          <col />
          {averageMode ? <col style={{ width: 52 }} /> : null}
          {averageMode ? <col style={{ width: 42 }} /> : null}
          <col style={{ width: 42 }} />
          <col style={{ width: 34 }} />
          <col style={{ width: 34 }} />
          <col style={{ width: 38 }} />
          {showDelta ? <col style={{ width: 42 }} /> : null}
        </colgroup>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: "left" }}>#</th>
            <th style={{ ...thStyle, textAlign: "left" }}>Joueur</th>
            {averageMode ? <th style={{ ...thStyle, ...right, color: accent }}>Pts/m</th> : null}
            {averageMode ? (
              <th style={{ ...thStyle, ...right, color: accent }} title="Podiums : nombre de TOP 3">
                <span style={{ display: "inline-flex", justifyContent: "flex-end", width: "100%" }}><PodiumHeaderIcon color={accent} /></span>
              </th>
            ) : null}
            <th style={{ ...thStyle, ...right, color: averageMode ? "rgba(255,255,255,0.80)" : accent }}>Pts</th>
            <th style={{ ...thStyle, ...right }}>J</th>
            <th style={{ ...thStyle, ...right }}>{averageMode ? "1er" : "V"}</th>
            <th style={{ ...thStyle, ...right }}>{averageMode ? "Aut." : "D"}</th>
            {showDelta ? <th style={{ ...thStyle, ...right }}>Δ</th> : null}
          </tr>
        </thead>
        <tbody>
          {displayRows.map((r: any, idx: number) => {
            const pl = playersById[String(r.id)];
            const diff = (r.scored ?? 0) - (r.conceded ?? 0);
            const played = getPlayedCount(r);
            const avg = r?.pointsAverage ?? r?.pointsPerMatch ?? r?.ptMoy ?? getPointsAverage(r);
            const name = pl?.name || "Joueur";
            const avatarUrl = pl?.avatarDataUrl || pl?.avatar || pl?.avatarUrl || null;
            const podiumCount = getPodiumCount(r, averageMode);

            return (
              <tr key={String(r.id)}>
                <td style={{ ...tdStyle, fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.70)", fontSize: 13 }}>{idx + 1}</td>
                <td style={{ ...tdStyle, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                    <AvatarCircle name={name} avatarUrl={avatarUrl} size={24} />
                    <span
                      title={name}
                      style={{
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        fontSize: 10.5,
                        fontWeight: 900,
                        color: "rgba(255,255,255,0.92)",
                      }}
                    >
                      {name}
                    </span>
                  </div>
                </td>
                {averageMode ? <td style={{ ...tdStyle, ...right, fontWeight: 1000, color: accent, fontSize: 13 }}>{formatPointsAverage(avg)}</td> : null}
                {averageMode ? <td style={{ ...tdStyle, ...right, fontWeight: 950, color: "rgba(255,255,255,0.86)" }}>{podiumCount}</td> : null}
                <td style={{ ...tdStyle, ...right, fontWeight: 950, color: averageMode ? "rgba(255,255,255,0.86)" : accent }}>{r.points ?? 0}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{played}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{r.wins ?? 0}</td>
                <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{r.losses ?? 0}</td>
                {showDelta ? <td style={{ ...tdStyle, ...right, opacity: 0.9 }}>{diff}</td> : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------
   MAIN
-------------------------- */
export default function TournamentView({ store, go, id }: Props) {
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [matches, setMatches] = React.useState<TournamentMatch[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [resultMatch, setResultMatch] = React.useState<TournamentMatch | null>(null);
  const [selectedMatch, setSelectedMatch] = React.useState<TournamentMatch | null>(null);
  const [attachOpen, setAttachOpen] = React.useState(false);
  const [attachLoading, setAttachLoading] = React.useState(false);
  const [attachRows, setAttachRows] = React.useState<any[]>([]);
  const [attachSelected, setAttachSelected] = React.useState<Record<string, boolean>>({});
  const [attachError, setAttachError] = React.useState<string>("");
  const [attachInfo, setAttachInfo] = React.useState<string>("");

  // ✅ PÉTANQUE : cache score par historyMatchId
  const [petScoresByHistoryId, setPetScoresByHistoryId] = React.useState<ScoreMap>({});

  const safeMatches: TournamentMatch[] = React.useMemo(() => (Array.isArray(matches) ? matches : []), [matches]);

  // ✅ ref pour merge meta (fix bug poules après simulation)
  const matchesRef = React.useRef<TournamentMatch[]>([]);
  React.useEffect(() => {
    matchesRef.current = safeMatches;
  }, [safeMatches]);

  // ------------------------------------------------------------
  // ✅ FREEZE META STRUCTURELLE PAR match.id (FIX FINAL)
  // ------------------------------------------------------------
  const stableMetaRef = React.useRef<Map<string, any>>(new Map());

  function extractStableMeta(m: any) {
    const meta: any = {};
    // ⚠️ on stocke UNIQUEMENT les valeurs réellement définies (pas undefined / pas null)
    if (m?.phase != null) meta.phase = m.phase;
    if (m?.stageIndex != null) meta.stageIndex = m.stageIndex;
    if (m?.groupIndex != null) meta.groupIndex = m.groupIndex;
    if (m?.groupId != null) meta.groupId = m.groupId;
    if (m?.roundIndex != null) meta.roundIndex = m.roundIndex;
    if (m?.orderIndex != null) meta.orderIndex = m.orderIndex;
    return meta;
  }

  function upgradeStable(existing: any, incoming: any) {
    // ✅ On complète uniquement les clés manquantes (on ne remplace jamais une stable déjà connue)
    const out = { ...(existing || {}) };
    for (const [k, v] of Object.entries(incoming || {})) {
      if (v == null) continue;
      if (out[k] === undefined || out[k] === null) out[k] = v;
    }
    return out;
  }

  function updateStableMetaFromMatches(list: any[]) {
    const map = stableMetaRef.current;
    for (const m of Array.isArray(list) ? list : []) {
      const id = String(m?.id || "");
      if (!id) continue;
      const inc = extractStableMeta(m);
      if (!map.has(id)) map.set(id, inc);
      else map.set(id, upgradeStable(map.get(id), inc));
    }
  }

  // seed + complétion snapshot (UPGRADABLE)
  React.useEffect(() => {
    if (!safeMatches.length) return;
    updateStableMetaFromMatches(safeMatches as any[]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeMatches]);

  function applyStableMeta(nextMatches: any[]) {
    const map = stableMetaRef.current;
    if (!map.size) return nextMatches;

    return (Array.isArray(nextMatches) ? nextMatches : []).map((m: any) => {
      const id = String(m?.id || "");
      if (!id) return m;
      const stable = map.get(id);
      if (!stable) return m;

      const out = { ...m };
      if (stable.phase !== undefined) out.phase = stable.phase;
      if (stable.stageIndex !== undefined) out.stageIndex = stable.stageIndex;
      if (stable.groupIndex !== undefined) out.groupIndex = stable.groupIndex;
      if (stable.groupId !== undefined) out.groupId = stable.groupId;
      if (stable.roundIndex !== undefined) out.roundIndex = stable.roundIndex;
      if (stable.orderIndex !== undefined) out.orderIndex = stable.orderIndex;
      return out;
    });
  }

  // ------------------------------------------------------------
  // MATCHES VISIBLES
  // ------------------------------------------------------------
  const visibleMatches: TournamentMatch[] = React.useMemo(() => {
    return safeMatches.filter((m: any) => !isVoidByeMatch(m));
  }, [safeMatches]);

  const playersById = React.useMemo(() => {
    const out: Record<string, any> = {};
    const sources = [
      ...((((tour as any)?.players || []) as any[])),
      ...((((tour as any)?.participants || []) as any[])),
      ...((((tour as any)?.bots || []) as any[])),
    ];

    for (const p of sources) {
      const id = String(p?.id || "");
      if (!id) continue;

      const prev = out[id] || {};
      out[id] = {
        ...prev,
        ...p,
        id,
        name:
          p?.name ||
          p?.label ||
          p?.botName ||
          prev?.name ||
          "Joueur",
        avatar:
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.avatarUrl ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatar ||
          null,
        avatarDataUrl:
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.avatarUrl ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatarDataUrl ||
          null,
        avatarUrl:
          p?.avatarUrl ||
          p?.avatarDataUrl ||
          p?.avatar ||
          p?.photo ||
          p?.image ||
          p?.img ||
          p?.picture ||
          prev?.avatarUrl ||
          null,
        countryCode: p?.countryCode || prev?.countryCode || null,
        isBot: !!(p?.isBot || p?.bot || prev?.isBot),
      };
    }

    return out;
  }, [tour]);

  const linkedHistoryMatches = React.useMemo(() => {
    const raw = (tour as any)?.linkedMatches ?? (tour as any)?.meta?.linkedMatches ?? [];
    return Array.isArray(raw) ? raw : [];
  }, [tour]);

  const isLeagueMulti = React.useMemo(() => isLeagueMultiTournament(tour), [tour]);
  const leagueFormatForStandings = React.useMemo(() => getLeagueFormatForLinkedHistory(tour), [tour]);
  const isLeagueFree = leagueFormatForStandings === "free";
  const isAveragePointsLeague = leagueFormatForStandings === "multi" || leagueFormatForStandings === "free";

  const linkedMultiStandings = React.useMemo(() => {
    return computeLinkedMultiStandings(tour, linkedHistoryMatches);
  }, [tour, linkedHistoryMatches]);


  const tournamentBestOf = React.useMemo(() => {
    const raw =
      (tour as any)?.game?.rules?.bestOf ??
      (tour as any)?.game?.bestOf ??
      (tour as any)?.rules?.bestOf ??
      (tour as any)?.bestOf ??
      1;
    const n = Math.max(1, Math.floor(Number(raw) || 1));
    return [1, 3, 5, 7, 9, 11].includes(n) ? n : 1;
  }, [tour]);


function buildSyntheticScore(winnerId: string, aId: string, bId: string) {
  const bestOf = Math.max(1, tournamentBestOf || 1);
  const winsNeeded = Math.floor(bestOf / 2) + 1;
  const loserMax = Math.max(0, winsNeeded - 1);
  const loserWins = loserMax > 0 ? Math.floor(Math.random() * (loserMax + 1)) : 0;
  const winnerIsA = winnerId === aId;
  const a = winnerIsA ? winsNeeded : loserWins;
  const b = winnerIsA ? loserWins : winsNeeded;
  return {
    scoreA: a,
    scoreB: b,
    setsA: a,
    setsB: b,
    legsA: a,
    legsB: b,
  };
}

function randInt(min: number, max: number) {
  const lo = Math.ceil(Number(min) || 0);
  const hi = Math.floor(Number(max) || 0);
  if (hi <= lo) return lo;
  return Math.floor(Math.random() * (hi - lo + 1)) + lo;
}

function round2(n: number) {
  return Math.round(Number(n || 0) * 100) / 100;
}

function buildSyntheticLegStats(playerId: string, wonLeg: boolean) {
  const darts = randInt(wonLeg ? 12 : 15, wonLeg ? 24 : 30);
  const visits = Math.max(4, Math.ceil(darts / 3));
  const avg3 = round2((wonLeg ? randInt(58, 92) : randInt(42, 76)) + Math.random());
  const bestVisit = wonLeg ? [100, 121, 140, 180][randInt(0, 3)] : [81, 95, 100, 121, 140][randInt(0, 4)];
  const bestCheckout = wonLeg ? [0, 32, 40, 52, 64, 80, 96, 110, 120][randInt(0, 8)] : 0;
  return { playerId, avg3, darts, visits, bestVisit, bestCheckout };
}

function padSyntheticDarts(darts: string[]) {
  const out = Array.isArray(darts) ? darts.slice(0, 3) : [];
  while (out.length < 3) out.push("MISS");
  return out;
}

type SyntheticDart = { label: string; value: number; isCheckout: boolean };

const SYNTHETIC_DARTS: SyntheticDart[] = (() => {
  const base: SyntheticDart[] = [{ label: "MISS", value: 0, isCheckout: false }];
  for (let n = 1; n <= 20; n++) {
    base.push({ label: String(n), value: n, isCheckout: false });
    base.push({ label: `D${n}`, value: n * 2, isCheckout: true });
    base.push({ label: `T${n}`, value: n * 3, isCheckout: false });
  }
  base.push({ label: "BULL", value: 25, isCheckout: false });
  base.push({ label: "DBULL", value: 50, isCheckout: true });

  return base.sort((a, b) => {
    if (b.value !== a.value) return b.value - a.value;
    if (Number(b.isCheckout) !== Number(a.isCheckout)) return Number(b.isCheckout) - Number(a.isCheckout);
    return a.label.localeCompare(b.label);
  });
})();

const SYNTHETIC_FINISHERS = SYNTHETIC_DARTS.filter((d) => d.isCheckout);

function findSyntheticCombo(total: number, requireCheckout: boolean) {
  const target = Math.max(0, Math.min(180, Math.floor(Number(total) || 0)));
  if (!target) return ["MISS", "MISS", "MISS"];

  const finishers = requireCheckout ? SYNTHETIC_FINISHERS : SYNTHETIC_DARTS;

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of SYNTHETIC_DARTS) {
      for (const d3 of finishers) {
        if (d1.value + d2.value + d3.value !== target) continue;
        const seq = [d1.label, d2.label, d3.label];
        while (seq.length && seq[seq.length - 1] === "MISS") seq.pop();
        const compact = seq.filter((x) => x !== "MISS");
        return padSyntheticDarts(compact.length ? compact : ["MISS"]);
      }
    }
  }

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of finishers) {
      if (d1.value + d2.value !== target) continue;
      return padSyntheticDarts([d1.label, d2.label].filter((x) => x !== "MISS"));
    }
  }

  for (const d1 of finishers) {
    if (d1.value === target) return padSyntheticDarts([d1.label]);
  }

  for (const d1 of SYNTHETIC_DARTS) {
    for (const d2 of SYNTHETIC_DARTS) {
      for (const d3 of SYNTHETIC_DARTS) {
        if (d1.value + d2.value + d3.value !== target) continue;
        const seq = [d1.label, d2.label, d3.label];
        while (seq.length && seq[seq.length - 1] === "MISS") seq.pop();
        const compact = seq.filter((x) => x !== "MISS");
        return padSyntheticDarts(compact.length ? compact : ["MISS"]);
      }
    }
  }

  return padSyntheticDarts(["T20", "20", String(Math.max(1, Math.min(20, target - 80)))]);
}

function syntheticDartsForTotal(total: number, options?: { checkout?: boolean }) {
  const presets = [
    { total: 180, darts: ["T20", "T20", "T20"] },
    { total: 140, darts: ["T20", "T20", "20"] },
    { total: 121, darts: ["T20", "11", "BULL"] },
    { total: 120, darts: ["20", "T20", "20"] },
    { total: 100, darts: ["20", "T20", "20"] },
    { total: 95, darts: ["T19", "18", "20"] },
    { total: 81, darts: ["T19", "12", "12"] },
    { total: 60, darts: ["20", "20", "20"] },
    { total: 45, darts: ["15", "15", "15"] },
    { total: 40, darts: ["D20", "MISS", "MISS"] },
    { total: 32, darts: ["D16", "MISS", "MISS"] },
  ];
  const exact = !options?.checkout ? presets.find((x) => x.total === total) : null;
  if (exact) return padSyntheticDarts(exact.darts);
  return findSyntheticCombo(total, !!options?.checkout);
}

function buildSyntheticVisits(playerId: string, stats: any, opts?: any) {
  const rounds = Math.max(3, Math.floor(Number(opts?.rounds || stats?.visits || 5)));
  const wonLeg = !!opts?.wonLeg;
  const targetAvg = Math.max(36, Math.min(110, Math.round(Number(stats?.avg3 || 60))));
  let remain = 501;
  const rows: any[] = [];

  for (let i = 0; i < rounds; i++) {
    const last = i === rounds - 1;
    const remainBefore = remain;
    let total = 0;
    let checkout = false;

    if (wonLeg && last) {
      total = remain;
      if (total > 170 || total <= 1) {
        total = Math.max(2, Math.min(170, Number(stats?.bestCheckout || 40) || 40));
        remain = total;
      }
      checkout = total === remain;
    } else {
      const roundsLeftAfter = rounds - i - 1;
      const wiggle = randInt(-16, 16);
      const desired = Math.max(18, Math.min(140, targetAvg + wiggle));
      let minKeep = 2;
      let maxKeep = 500;

      if (wonLeg) {
        if (roundsLeftAfter <= 1) {
          minKeep = 2;
          maxKeep = 170;
        } else {
          minKeep = 2 + 18 * (roundsLeftAfter - 1);
          maxKeep = 170 + 140 * (roundsLeftAfter - 1);
        }
      } else {
        minKeep = 2;
        maxKeep = 500;
      }

      const minTotal = Math.max(18, remain - maxKeep);
      const maxTotal = Math.max(minTotal, Math.min(140, remain - minKeep));
      total = Math.max(minTotal, Math.min(maxTotal, desired));

      if (!Number.isFinite(total) || total <= 0 || total >= remain) {
        total = Math.max(18, Math.min(60, remain - minKeep));
      }
    }

    const safeTotal = Math.max(0, Math.min(remainBefore, Math.floor(total)));
    remain = Math.max(0, remainBefore - safeTotal);

    rows.push({
      playerId,
      visitIndex: i,
      total: safeTotal,
      darts: syntheticDartsForTotal(safeTotal, { checkout }),
      remainBefore,
      remainAfter: remain,
      bust: false,
      checkout,
    });
  }

  if (wonLeg && rows.length) {
    const last = rows[rows.length - 1];
    last.total = last.remainBefore;
    last.darts = syntheticDartsForTotal(last.total, { checkout: true });
    last.remainAfter = 0;
    last.checkout = true;
    remain = 0;
  }

  return rows;
}

function summarizeSyntheticVisits(playerId: string, rows: any[]) {
  const visits = Array.isArray(rows) ? rows.length : 0;
  const darts = visits * 3;
  const totals = (rows || []).map((r: any) => Number(r?.total || 0));
  const totalScored = totals.reduce((s: number, x: number) => s + x, 0);
  const avg3 = visits ? round2(totalScored / visits) : 0;
  const bestVisit = totals.length ? Math.max(...totals) : 0;
  const bestCheckout = (rows || []).reduce((best: number, r: any) => r?.checkout ? Math.max(best, Number(r?.total || 0)) : best, 0);
  return { playerId, avg3, darts, visits, bestVisit, bestCheckout };
}

function buildSyntheticLegVisitsPair(args: any) {
  const { aId, bId, aSeed, bSeed, winnerId } = args || {};
  const loserStarts = winnerId === aId ? bId : aId;
  const rounds = Math.max(3, Math.min(10, Math.round((Number(aSeed?.visits || 5) + Number(bSeed?.visits || 5)) / 2)));
  const aVisits = buildSyntheticVisits(aId, aSeed, { rounds, wonLeg: winnerId === aId, starts: loserStarts === aId });
  const bVisits = buildSyntheticVisits(bId, bSeed, { rounds, wonLeg: winnerId === bId, starts: loserStarts === bId });
  return {
    [aId]: aVisits,
    [bId]: bVisits,
    statsA: summarizeSyntheticVisits(aId, aVisits),
    statsB: summarizeSyntheticVisits(bId, bVisits),
  };
}

function buildSyntheticLegWinnerOrder(args: any) {
  const { aId, bId, winnerId, scoreA, scoreB } = args || {};
  const winsA = Math.max(0, Math.floor(Number(scoreA || 0)));
  const winsB = Math.max(0, Math.floor(Number(scoreB || 0)));
  const finalWinnerId = String(winnerId || "");
  const loserId = finalWinnerId === aId ? bId : aId;
  const winnerWins = finalWinnerId === aId ? winsA : winsB;
  const loserWins = finalWinnerId === aId ? winsB : winsA;

  if (!aId || !bId || !finalWinnerId || winnerWins <= 0) return [];

  const order: string[] = Array.from({ length: loserWins }, () => loserId);
  for (let i = order.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [order[i], order[j]] = [order[j], order[i]];
  }

  const earlyWinnerWins = Math.max(0, winnerWins - 1);
  for (let i = 0; i < earlyWinnerWins; i++) {
    const slot = order.length ? ((Math.random() * (order.length + 1)) | 0) : 0;
    order.splice(slot, 0, finalWinnerId);
  }

  order.push(finalWinnerId);
  return order;
}

async function createSyntheticHistoryForSimulation(args: any) {
  const { tournament, match, winnerId, synthetic } = args || {};
  const aId = String(match?.aPlayerId || "");
  const bId = String(match?.bPlayerId || "");
  if (!aId || !bId) return null;

  const aPlayer = playersById[aId] || { id: aId, name: "Joueur A" };
  const bPlayer = playersById[bId] || { id: bId, name: "Joueur B" };
  const targetScoreA = Math.max(0, Math.floor(Number(synthetic?.scoreA || 0)));
  const targetScoreB = Math.max(0, Math.floor(Number(synthetic?.scoreB || 0)));
  const legWinnerOrder = buildSyntheticLegWinnerOrder({ aId, bId, winnerId, scoreA: targetScoreA, scoreB: targetScoreB });
  const totalLegs = Math.max(1, legWinnerOrder.length || (targetScoreA + targetScoreB));
  const legs: any[] = [];
  let cumA = 0;
  let cumB = 0;

  for (let i = 0; i < totalLegs; i++) {
    const legWinnerId = String(legWinnerOrder[i] || winnerId || aId);

    if (legWinnerId === aId) {
      cumA += 1;
    } else if (legWinnerId === bId) {
      cumB += 1;
    }

    const aSeed = buildSyntheticLegStats(aId, legWinnerId === aId);
    const bSeed = buildSyntheticLegStats(bId, legWinnerId === bId);
    const paired = buildSyntheticLegVisitsPair({ aId, bId, aSeed, bSeed, winnerId: legWinnerId });
    const aStats = paired.statsA;
    const bStats = paired.statsB;
    const aVisitsHistory = paired[aId];
    const bVisitsHistory = paired[bId];
    legs.push({
      id: `${String(match?.id || 'match')}-leg-${i + 1}`,
      label: `Leg ${i + 1}`,
      scoreA: cumA,
      scoreB: cumB,
      winnerId: legWinnerId,
      summary: {
        kind: "x01",
        simulated: true,
        legIndex: i,
        winnerId: legWinnerId,
        scoreA: cumA,
        scoreB: cumB,
        avg3ByPlayer: { [aId]: aStats.avg3, [bId]: bStats.avg3 },
        bestVisitByPlayer: { [aId]: aStats.bestVisit, [bId]: bStats.bestVisit },
        bestCheckoutByPlayer: { [aId]: aStats.bestCheckout, [bId]: bStats.bestCheckout },
        visitsHistoryByPlayer: {
          [aId]: aVisitsHistory,
          [bId]: bVisitsHistory,
        },
        perPlayer: {
          [aId]: { avg3: aStats.avg3, darts: aStats.darts, visits: aStats.visits, bestVisit: aStats.bestVisit, bestCheckout: aStats.bestCheckout, visitsHistory: aVisitsHistory },
          [bId]: { avg3: bStats.avg3, darts: bStats.darts, visits: bStats.visits, bestVisit: bStats.bestVisit, bestCheckout: bStats.bestCheckout, visitsHistory: bVisitsHistory },
        },
      },
    });
  }

  const avg = (arr: any[]) => (arr.length ? round2(arr.reduce((s, x) => s + Number(x || 0), 0) / arr.length) : 0);
  const max = (arr: any[]) => (arr.length ? Math.max(...arr.map((x) => Number(x || 0))) : 0);
  const perA = legs.map((x) => x?.summary?.perPlayer?.[aId] || {});
  const perB = legs.map((x) => x?.summary?.perPlayer?.[bId] || {});
  const summary = {
    kind: "x01",
    simulated: true,
    winnerId,
    scoreA: Number(synthetic?.scoreA || 0),
    scoreB: Number(synthetic?.scoreB || 0),
    legsWon: { [aId]: Number(synthetic?.legsA || synthetic?.scoreA || 0), [bId]: Number(synthetic?.legsB || synthetic?.scoreB || 0) },
    setsWon: { [aId]: Number(synthetic?.setsA || synthetic?.scoreA || 0), [bId]: Number(synthetic?.setsB || synthetic?.scoreB || 0) },
    avg3ByPlayer: { [aId]: avg(perA.map((x) => x.avg3)), [bId]: avg(perB.map((x) => x.avg3)) },
    bestVisitByPlayer: { [aId]: max(perA.map((x) => x.bestVisit)), [bId]: max(perB.map((x) => x.bestVisit)) },
    bestCheckoutByPlayer: { [aId]: max(perA.map((x) => x.bestCheckout)), [bId]: max(perB.map((x) => x.bestCheckout)) },
    visitsHistoryByPlayer: {
      [aId]: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[aId] || []),
      [bId]: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[bId] || []),
    },
    perPlayer: {
      [aId]: { avg3: avg(perA.map((x) => x.avg3)), darts: perA.reduce((s, x) => s + Number(x.darts || 0), 0), visits: perA.reduce((s, x) => s + Number(x.visits || 0), 0), bestVisit: max(perA.map((x) => x.bestVisit)), bestCheckout: max(perA.map((x) => x.bestCheckout)), visitsHistory: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[aId] || []) },
      [bId]: { avg3: avg(perB.map((x) => x.avg3)), darts: perB.reduce((s, x) => s + Number(x.darts || 0), 0), visits: perB.reduce((s, x) => s + Number(x.visits || 0), 0), bestVisit: max(perB.map((x) => x.bestVisit)), bestCheckout: max(perB.map((x) => x.bestCheckout)), visitsHistory: legs.flatMap((x) => x?.summary?.visitsHistoryByPlayer?.[bId] || []) },
    },
    legs,
    legacy: {
      avg3: { [aId]: avg(perA.map((x) => x.avg3)), [bId]: avg(perB.map((x) => x.avg3)) },
      darts: { [aId]: perA.reduce((s, x) => s + Number(x.darts || 0), 0), [bId]: perB.reduce((s, x) => s + Number(x.darts || 0), 0) },
      visits: { [aId]: perA.reduce((s, x) => s + Number(x.visits || 0), 0), [bId]: perB.reduce((s, x) => s + Number(x.visits || 0), 0) },
      bestVisit: { [aId]: max(perA.map((x) => x.bestVisit)), [bId]: max(perB.map((x) => x.bestVisit)) },
      bestCheckout: { [aId]: max(perA.map((x) => x.bestCheckout)), [bId]: max(perB.map((x) => x.bestCheckout)) },
    },
  };

  const now = Date.now();
  const rec: any = {
    id: `sim-${String(tournament?.id || 'tour')}-${String(match?.id || 'match')}-${now}`,
    kind: String(tournament?.game?.mode || tournament?.mode || 'x01'),
    status: 'finished',
    winnerId,
    createdAt: now,
    updatedAt: now,
    players: [
      { id: aId, name: aPlayer?.name || 'Joueur A', avatarDataUrl: aPlayer?.avatarDataUrl || aPlayer?.avatar || aPlayer?.avatarUrl || null },
      { id: bId, name: bPlayer?.name || 'Joueur B', avatarDataUrl: bPlayer?.avatarDataUrl || bPlayer?.avatar || bPlayer?.avatarUrl || null },
    ],
    summary,
    payload: {
      kind: 'x01',
      simulated: true,
      winnerId,
      scoreA: Number(synthetic?.scoreA || 0),
      scoreB: Number(synthetic?.scoreB || 0),
      legsWon: summary.legsWon,
      setsWon: summary.setsWon,
      legs,
      summary,
    },
  };

  try {
    await (History as any)?.upsert?.(rec);
  } catch (e) {
    console.error('[TournamentView] synthetic history upsert error:', e);
  }
  return rec;
}

// ------------------------------------------------------------
// LOAD  // ------------------------------------------------------------
  // LOAD
  // ------------------------------------------------------------
  React.useEffect(() => {
    let alive = true;
    async function load() {
      setLoading(true);
      try {
        const t = await getTournamentLocal(id);
        const ms = await listMatchesForTournamentLocal(id);
        if (!alive) return;

        setTour((t as any) ?? null);

        // ✅ DEDUP au chargement
        const uniqById = (() => {
          const map = new Map<string, any>();
          for (const m of Array.isArray(ms) ? ms : []) {
            const mid = String(m?.id || "");
            if (!mid) continue;
            const cur = map.get(mid);
            if (!cur || (m?.updatedAt ?? 0) >= (cur?.updatedAt ?? 0)) map.set(mid, m);
          }
          return Array.from(map.values());
        })();

        setMatches(uniqById as any);
      } catch (e) {
        console.error("[TournamentView] load error:", e);
        if (alive) {
          setTour(null);
          setMatches([]);
        }
      } finally {
        if (alive) setLoading(false);
      }
    }
    load();
    return () => {
      alive = false;
    };
  }, [id]);

  // ------------------------------------------------------------
  // ✅ PÉTANQUE : charge les scores depuis History via historyMatchId
  // ------------------------------------------------------------
  React.useEffect(() => {
    let alive = true;

    async function loadPetanqueScoresFromHistory() {
      try {
        if (!tour) return;
        if (!isPetanqueTournament(tour)) return;

        const ids = (matches || []).map((m: any) => String(m?.historyMatchId || "")).filter(Boolean);
        const unique = Array.from(new Set(ids)).filter((hid) => hid && !petScoresByHistoryId[hid]);
        if (!unique.length) return;

        const next: ScoreMap = {};
        for (const hid of unique) {
          try {
            const rec: any = await (History as any)?.get?.(hid);
            const s = rec?.summary || rec?.payload?.summary || rec?.payload || null;
            const k = String(s?.kind || "").toLowerCase();
            if (k !== "petanque") continue;

            const a = Number(s?.scoreA);
            const b = Number(s?.scoreB);
            if (Number.isFinite(a) && Number.isFinite(b)) {
              next[hid] = { a: Math.floor(a), b: Math.floor(b) };
            }
          } catch {}
        }

        if (alive && Object.keys(next).length) {
          setPetScoresByHistoryId((prev) => ({ ...prev, ...next }));
        }
      } catch {}
    }

    loadPetanqueScoresFromHistory();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tour, matches]);

  // ------------------------------------------------------------
  // PERSIST (MERGE + FREEZE META)
  // ------------------------------------------------------------
  const persist = React.useCallback(async (nextTour: Tournament, nextMatches: TournamentMatch[]) => {
    // 1) merge anti-undefined + verrouillage depuis prev
    const merged = mergeStableMatchMeta(matchesRef.current as any, Array.isArray(nextMatches) ? nextMatches : []);
    // 2) 🔒 override structurel depuis snapshot
    const stabilized = applyStableMeta(Array.isArray(merged) ? merged : []);
    // 3) ✅ on met à jour le snapshot avec les meta désormais “propres”
    updateStableMetaFromMatches(stabilized as any[]);

    setTour(nextTour);
    setMatches(stabilized as any);

    try {
      await upsertTournamentLocal(nextTour as any);
      await upsertMatchesForTournamentLocal((nextTour as any).id, stabilized as any);
    } catch (e) {
      console.error("[TournamentView] persist error:", e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadAttachableHistory = React.useCallback(async () => {
    if (!tour) return;
    setAttachOpen(true);
    setAttachLoading(true);
    setAttachError("");
    setAttachInfo("");
    setAttachSelected({});
    try {
      const linkedIds = new Set((linkedHistoryMatches || []).map((x: any) => String(x?.historyMatchId || x?.matchId || x?.id || "")).filter(Boolean));
      const api: any = History as any;
      const raw = typeof api.listFinished === "function" ? await api.listFinished() : await api.list();
      const rows = (Array.isArray(raw) ? raw : [])
        .filter((r: any) => getHistoryRowId(r))
        .filter((r: any) => !linkedIds.has(getHistoryRowId(r)))
        .filter((r: any) => getHistoryRowStatus(r) === "finished")
        .filter((r: any) => isHistoryCompatibleWithTournament(r, tour))
        .map((r: any) => ({
          ...r,
          __historyId: getHistoryRowId(r),
          __mode: getHistoryLinkedDisplayMode(r) || String((tour as any)?.game?.mode || "match"),
          __time: getHistoryRowTime(r),
          __rankingCount: getHistoryRanking(r).length,
          __playersCount: getHistoryPlayers(r).length,
        }))
        .filter((r: any) => {
          if (!isLeagueMulti) return true;
          return Number(r.__rankingCount || 0) >= 2 || Number(r.__playersCount || 0) >= 2;
        })
        .sort((a: any, b: any) => Number(b.__time || 0) - Number(a.__time || 0))
        .slice(0, 250);
      setAttachRows(rows);
      setAttachInfo(rows.length ? `${rows.length} partie(s) compatible(s) trouvée(s).` : "Aucune partie compatible trouvée dans l’historique.");
    } catch (e: any) {
      console.error("[TournamentView] load attachable history failed", e);
      setAttachRows([]);
      setAttachError(e?.message || "Impossible de charger l’historique.");
    } finally {
      setAttachLoading(false);
    }
  }, [tour, linkedHistoryMatches, isLeagueMulti]);

  const attachSelectedHistoryMatches = React.useCallback(async () => {
    if (!tour) return;
    const selectedIds = Object.keys(attachSelected || {}).filter((id) => attachSelected[id]);
    if (!selectedIds.length) {
      setAttachError("Sélectionne au moins une partie à rattacher.");
      return;
    }

    setAttachLoading(true);
    setAttachError("");
    try {
      const api: any = History as any;
      const linkedExisting = Array.isArray((tour as any)?.linkedMatches) ? (tour as any).linkedMatches.slice() : [];
      const linkedIds = new Set(linkedExisting.map((x: any) => String(x?.historyMatchId || x?.matchId || x?.id || "")).filter(Boolean));

      const entries: any[] = [];
      for (const hid of selectedIds) {
        if (linkedIds.has(hid)) continue;
        const lite = attachRows.find((r: any) => String(r.__historyId || getHistoryRowId(r)) === hid) || null;
        const full = typeof api.get === "function" ? ((await api.get(hid).catch(() => null)) || lite) : lite;
        if (!full) continue;
        entries.push(buildLinkedHistoryEntry(full, tour));
      }

      if (!entries.length) {
        setAttachError("Aucune nouvelle partie à rattacher.");
        return;
      }

      const playersMap = new Map<string, any>();
      for (const p of Array.isArray((tour as any)?.players) ? (tour as any).players : []) {
        const idp = String(p?.id || "");
        if (idp) playersMap.set(idp, p);
      }
      for (const link of entries) {
        for (const p of Array.isArray(link?.players) ? link.players : []) {
          const idp = String(p?.id || p?.playerId || "");
          if (!idp || playersMap.has(idp)) continue;
          playersMap.set(idp, {
            id: idp,
            name: p?.name || "Joueur",
            avatarDataUrl: p?.avatarDataUrl || p?.avatar || p?.avatarUrl || null,
            avatarUrl: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || null,
            avatar: p?.avatarDataUrl || p?.avatar || p?.avatarUrl || null,
            isBot: !!p?.isBot,
          });
        }
        for (const r of Array.isArray(link?.ranking) ? link.ranking : []) {
          const idp = String(r?.playerId || r?.id || "");
          if (!idp || playersMap.has(idp)) continue;
          playersMap.set(idp, {
            id: idp,
            name: r?.name || "Joueur",
            avatarDataUrl: r?.avatarDataUrl || r?.avatar || r?.avatarUrl || null,
            avatarUrl: r?.avatarUrl || r?.avatarDataUrl || r?.avatar || null,
            avatar: r?.avatarDataUrl || r?.avatar || r?.avatarUrl || null,
            isBot: !!r?.isBot,
          });
        }
      }

      let nextMatches: any[] = Array.isArray(safeMatches) ? safeMatches.slice() : [];
      if (!isLeagueMulti) {
        const existingByHistory = new Set(nextMatches.map((m: any) => String(m?.historyMatchId || "")).filter(Boolean));
        for (const link of entries) {
          const hid = String(link?.historyMatchId || "");
          if (!hid || existingByHistory.has(hid)) continue;
          const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
          if (ranking.length < 2) continue;
          const aId = String(ranking[0]?.playerId || ranking[0]?.id || "");
          const bId = String(ranking[1]?.playerId || ranking[1]?.id || "");
          if (!aId || !bId) continue;
          const src = attachRows.find((r: any) => String(r.__historyId || getHistoryRowId(r)) === hid) || null;
          const sc = getHistoryScorePair(src || link, aId, bId);
          nextMatches.push({
            id: `linked_${hid}`,
            tournamentId: (tour as any).id,
            stageIndex: 0,
            groupIndex: 0,
            roundIndex: 999,
            orderIndex: nextMatches.length,
            aPlayerId: aId,
            bPlayerId: bId,
            status: "done",
            winnerId: aId,
            scoreA: sc.a,
            scoreB: sc.b,
            setsA: sc.a,
            setsB: sc.b,
            legsA: sc.a,
            legsB: sc.b,
            historyMatchId: hid,
            createdAt: link.createdAt || Date.now(),
            updatedAt: Date.now(),
            phase: "groups",
            linkedFromHistory: true,
          });
        }
      }

      const nextLinked = [...linkedExisting, ...entries];
      const nextTour: any = {
        ...(tour as any),
        players: Array.from(playersMap.values()),
        linkedMatches: nextLinked,
        meta: { ...((tour as any)?.meta || {}), linkedMatches: nextLinked },
        updatedAt: Date.now(),
      };

      await persist(nextTour as any, nextMatches as any);
      setAttachOpen(false);
      setAttachRows([]);
      setAttachSelected({});
      setAttachInfo(`${entries.length} partie(s) rattachée(s).`);
    } catch (e: any) {
      console.error("[TournamentView] attach selected history failed", e);
      setAttachError(e?.message || "Erreur pendant le rattachement des parties.");
    } finally {
      setAttachLoading(false);
    }
  }, [tour, attachSelected, attachRows, safeMatches, isLeagueMulti, persist]);

  const onStartMatch = React.useCallback(
    async (matchId: string) => {
      if (!tour) return;
      try {
        const r = startMatch({ tournament: tour as any, matches: safeMatches as any, matchId });
        await persist(r.tournament as any, r.matches as any);
        go("tournament_match_play", { tournamentId: (tour as any).id, matchId });
      } catch (e) {
        console.error("[TournamentView] startMatch error:", e);
      }
    },
    [tour, safeMatches, persist, go]
  );

  const onOpenMatchDetails = React.useCallback((m: any) => setSelectedMatch(m), []);

  const autoQualified = React.useMemo(() => {
    const ids: string[] = [];
    for (const m of visibleMatches as any[]) {
      if (!m) continue;
      if (!isByeMatch(m)) continue;
      if (isVoidByeMatch(m)) continue;
      const pid = otherIdIfBye(m);
      if (!pid) continue;
      ids.push(pid);
    }
    const uniq = Array.from(new Set(ids)).filter((x) => x && !isByeId(x) && !isTbdId(x));
    return uniq.map((pid) => playersById[pid]).filter(Boolean);
  }, [visibleMatches, playersById]);

  const displayMatches = React.useMemo(() => visibleMatches.filter((m: any) => !isByeMatch(m)), [visibleMatches]);

  const viewKind = String((tour as any)?.viewKind || "groups_ko");
  const repechageEnabled = !!(tour as any)?.repechage?.enabled || (tour as any)?.viewKind === "double_ko";

  const byPhase = React.useMemo(() => {
    // Robust split between Groups / KO / Repechage.
    // IMPORTANT: older engine versions incorrectly set groupIndex=0 for KO matches.
    // So we MUST prefer phase/stageIndex over groupIndex to avoid "everything in Poule A".
    const phaseOf = (m: any) => String(m?.phase || "");
    const stageOf = (m: any) => (typeof m?.stageIndex === "number" ? m.stageIndex : -1);

    const isKo = (m: any) => phaseOf(m) === "ko" || stageOf(m) === 1;

    const isRep = (m: any) =>
      phaseOf(m) === "repechage" ||
      stageOf(m) === 2 ||
      // compat: certains double_ko ont stageIndex=1 pour losers
      (stageOf(m) === 1 && (tour as any)?.viewKind === "double_ko" && phaseOf(m) === "repechage");

    const isGroup = (m: any) => {
      if (isKo(m) || isRep(m)) return false;
      const ph = phaseOf(m);
      const st = stageOf(m);
      // groupe si explicitement groups OU stageIndex=0
      if (ph === "groups" || st === 0) return true;
      // fallback legacy si groupIndex>=0 mais pas KO/Rep
      return typeof m?.groupIndex === "number" && m.groupIndex >= 0;
    };

    const groups = displayMatches.filter(isGroup);
    const ko = displayMatches.filter((m: any) => !isGroup(m) && isKo(m));
    const rep = displayMatches.filter((m: any) => !isGroup(m) && isRep(m));

    return { groups, ko, rep };
  }, [displayMatches, tour]);

  const playableMatches = React.useMemo(() => displayMatches.filter((m: any) => isRealPlayable(m)), [displayMatches]);
  const runningMatches = React.useMemo(
    () => displayMatches.filter((m: any) => ["running", "playing"].includes(String(m?.status || ""))),
    [displayMatches]
  );
  const doneMatches = React.useMemo(() => displayMatches.filter((m: any) => String(m?.status || "") === "done"), [displayMatches]);

  const groupsMeta = React.useMemo(() => Math.max(1, Number((tour as any)?.stages?.[0]?.groups || 1)), [tour]);

  const TABS = React.useMemo(() => {
    if (viewKind === "single_ko") return ["home", "bracket", "matches", "linked", "stats"];
    if (viewKind === "double_ko") return ["home", "bracket", "matches", "linked", "repechage", "stats"];
    if (viewKind === "round_robin") return ["home", "standings", "matches", "linked", "stats"];
    return ["home", "pools", "standings", "bracket", "matches", "linked", ...(repechageEnabled ? ["repechage"] : []), "stats"];
  }, [viewKind, repechageEnabled]);

  const [tab, setTab] = React.useState<string>("home");
  React.useEffect(() => {
    if (!TABS.includes(tab)) setTab("home");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [TABS.join("|")]);

  const tabLabel: Record<string, string> = {
    home: "Accueil",
    bracket: "Tableau",
    matches: "Matchs",
    standings: "Classement",
    pools: "Poules",
    repechage: "Repêchage",
    linked: "Liées",
    stats: "Stats",
  };

  const [activeGroupIdx, setActiveGroupIdx] = React.useState(0);

  const rrMatchesByGroup = React.useMemo(() => {
    const out: any[] = Array.from({ length: groupsMeta }, () => []);
    for (const m of byPhase.groups as any[]) {
      const gi = typeof m?.groupIndex === "number" ? m.groupIndex : -1;
      if (gi < 0 || gi >= groupsMeta) continue;
      (out[gi] ||= []).push(m);
    }
    for (const arr of out)
      arr.sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return out;
  }, [byPhase.groups, groupsMeta]);

  const rrPlayersByGroup = React.useMemo(() => {
    const out: string[][] = Array.from({ length: groupsMeta }, () => []);
    for (let g = 0; g < groupsMeta; g++) {
      const set = new Set<string>();
      for (const m of rrMatchesByGroup[g] || []) {
        const a = String(m.aPlayerId || "");
        const b = String(m.bPlayerId || "");
        if (a && !isByeId(a) && !isTbdId(a)) set.add(a);
        if (b && !isByeId(b) && !isTbdId(b)) set.add(b);
      }
      out[g] = Array.from(set);
    }
    return out;
  }, [rrMatchesByGroup, groupsMeta]);

  const rrStandingsByGroup = React.useMemo(() => {
    const out: any[] = [];
    for (let g = 0; g < groupsMeta; g++) out[g] = computeStandings(rrPlayersByGroup[g] || [], rrMatchesByGroup[g] || []);
    return out;
  }, [rrPlayersByGroup, rrMatchesByGroup, groupsMeta]);

  const koRoundsCount = React.useMemo(() => {
    const ko = (byPhase.ko || []).filter((m: any) => typeof m.roundIndex === "number");
    const max = ko.reduce((acc: number, m: any) => Math.max(acc, Number(m.roundIndex)), 0);
    return max + 1;
  }, [byPhase.ko]);

  const onOpenResult = React.useCallback(
    (m: any) => {
      const historyMatchId = String(m?.historyMatchId || "");
      if (!historyMatchId) return;
      go("tournament_match_result", {
        tournamentId: String((tour as any)?.id || id || ""),
        matchId: String(m?.id || ""),
        historyMatchId,
        phaseLabel: matchPhaseLabel(m, viewKind, koRoundsCount),
      });
    },
    [go, tour, id, viewKind, koRoundsCount]
  );

  /* -------------------------
     SIMULATION
  -------------------------- */
  const simulateMatch = React.useCallback(
    async (m: any) => {
      if (!tour) return;
      if (!isRealPlayable(m)) return;

      const a = String(m?.aPlayerId || "");
      const b = String(m?.bPlayerId || "");
      if (!a || !b || isByeId(a) || isByeId(b) || isTbdId(a) || isTbdId(b)) return;

      const winnerId = Math.random() < 0.5 ? a : b;

      try {
        const synthetic = buildSyntheticScore(winnerId, a, b);
        const saved = await createSyntheticHistoryForSimulation({ tournament: tour as any, match: m, winnerId, synthetic });
        const r = submitResult({ tournament: tour as any, matches: safeMatches as any, matchId: String(m.id), winnerId, historyMatchId: saved?.id || null, ...synthetic });
        await persist(r.tournament as any, r.matches as any);
      } catch (e) {
        console.error("[TournamentView] simulateMatch error:", e);
      }
    },
    [tour, safeMatches, persist]
  );

  const simulateTournament = React.useCallback(async () => {
    if (!tour) return;

    let guard = 0;
    let curTour = tour as any;
    let curMatches = safeMatches as any[];

    try {
      while (guard++ < 4000) {
        const playable = (curMatches || []).filter((m) => isRealPlayable(m));
        if (!playable.length) break;

        const m = playable[0];
        const a = String(m?.aPlayerId || "");
        const b = String(m?.bPlayerId || "");
        if (!a || !b || isByeId(a) || isByeId(b) || isTbdId(a) || isTbdId(b)) break;

        const winnerId = Math.random() < 0.5 ? a : b;

        const bestOf = Math.max(1, Math.floor(Number((curTour as any)?.game?.rules?.bestOf ?? (curTour as any)?.game?.bestOf ?? (curTour as any)?.rules?.bestOf ?? (curTour as any)?.bestOf ?? 1) || 1));
        const winsNeeded = Math.floor(bestOf / 2) + 1;
        const loserMax = Math.max(0, winsNeeded - 1);
        const loserWins = loserMax > 0 ? Math.floor(Math.random() * (loserMax + 1)) : 0;
        const winnerIsA = winnerId === a;
        const synthetic = {
          scoreA: winnerIsA ? winsNeeded : loserWins,
          scoreB: winnerIsA ? loserWins : winsNeeded,
          setsA: winnerIsA ? winsNeeded : loserWins,
          setsB: winnerIsA ? loserWins : winsNeeded,
          legsA: winnerIsA ? winsNeeded : loserWins,
          legsB: winnerIsA ? loserWins : winsNeeded,
        };
        const saved = await createSyntheticHistoryForSimulation({ tournament: curTour, match: m, winnerId, synthetic });
        const r = submitResult({ tournament: curTour, matches: curMatches, matchId: String(m.id), winnerId, historyMatchId: saved?.id || null, ...synthetic });
        curTour = r.tournament;
        curMatches = r.matches;
      }

      await persist(curTour as any, curMatches as any);
    } catch (e) {
      console.error("[TournamentView] simulateTournament error:", e);
    }
  }, [tour, safeMatches, persist]);

  // ------------------------------------------------------------
  // ✅ SCORE UNIFIÉ (Pétanque via payload/History, sinon engine score normal)
  // ------------------------------------------------------------
  const isPet = React.useMemo(() => isPetanqueTournament(tour), [tour]);

  function getPetanqueScoreForMatch(m: any): PetScore | null {
    if (!isPet) return null;

    const direct = extractPetanqueScoreFromMatch(m);
    if (direct) return direct;

    const hid = String(m?.historyMatchId || "");
    if (hid && petScoresByHistoryId[hid]) return petScoresByHistoryId[hid];

    if (typeof m?.scoreA === "number" && typeof m?.scoreB === "number") {
      return { a: Math.floor(m.scoreA), b: Math.floor(m.scoreB) };
    }

    return null;
  }

  function getScoreForAnyMatch(m: any) {
    if (isPet) {
      const ps = getPetanqueScoreForMatch(m);
      if (ps) return ps;
    }
    return getMatchScore(m);
  }

  function scoreTextAny(m: any) {
    const sc = getScoreForAnyMatch(m);
    if (!sc) return "";
    return `${sc.a} - ${sc.b}`;
  }

  function renderMatchCard(m: any, accent: string, opts?: { clickable?: boolean; hideActions?: boolean }) {
    const status = String(m?.status || "pending");
    const playable = isRealPlayable(m);
    const running = status === "running" || status === "playing";
    const done = status === "done";
    const topTag = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";
    const topColor = done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.55)";

    const phaseLabel = matchPhaseLabel(m, viewKind, koRoundsCount);
    const clickable = opts?.clickable !== false;
    const hideActions = !!opts?.hideActions;

    return (
      <div
        key={m.id}
        onClick={clickable ? () => onOpenMatchDetails(m) : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        onKeyDown={clickable ? (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onOpenMatchDetails(m);
          }
        } : undefined}
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
          padding: 12,
          boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
          cursor: clickable ? "pointer" : "default",
          transition: "transform 140ms ease, box-shadow 140ms ease, border-color 140ms ease",
          outline: "none",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ width: 10, height: 10, borderRadius: 99, background: topColor, boxShadow: `0 0 14px ${topColor}55`, flex: "0 0 auto" }} />
            <div style={{ display: "grid", gap: 3, minWidth: 0 }}>
              <div style={{ fontWeight: 950, fontSize: 12.5, color: topColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {topTag}
              </div>
              <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {m?.updatedAt ? `• ${formatDate(m.updatedAt)}` : ""}
              </div>
            </div>
          </div>

          {!hideActions ? (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                simulateMatch(m);
              }}
              disabled={!playable}
              title="Simuler"
              style={{
                width: 34,
                height: 34,
                borderRadius: 999,
                border: playable ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.08)",
                background: playable ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.03)",
                display: "grid",
                placeItems: "center",
                cursor: playable ? "pointer" : "default",
                opacity: playable ? 1 : 0.45,
              }}
            >
              <Icon name="play" color={playable ? "#ffcf57" : "rgba(255,255,255,0.45)"} />
            </button>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (done) onOpenMatchDetails(m);
                else if (running || playable) onStartMatch(m.id);
              }}
              disabled={!done && !running && !playable}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "none",
                fontWeight: 950,
                cursor: !done && !running && !playable ? "default" : "pointer",
                background:
                  !done && !running && !playable
                    ? "linear-gradient(180deg,#3a3a3a,#232323)"
                    : running
                    ? "linear-gradient(180deg,#4fb4ff,#1c78d5)"
                    : done
                    ? "linear-gradient(180deg,#7fe2a9,#2da36a)"
                    : "linear-gradient(180deg,#ffc63a,#ffaf00)",
                color: !done && !running && !playable ? "rgba(255,255,255,0.55)" : "#120c06",
                opacity: !done && !running && !playable ? 0.6 : 1,
                whiteSpace: "nowrap",
                flex: "0 0 auto",
              }}
            >
              {done ? "Voir" : running ? "Reprendre" : playable ? "Jouer" : "—"}
            </button>
          </div>
          ) : (
          <div
            style={{
              borderRadius: 999,
              padding: "8px 10px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: "rgba(255,255,255,0.04)",
              fontWeight: 900,
              fontSize: 11.5,
              color: topColor,
              whiteSpace: "nowrap",
              flex: "0 0 auto",
            }}
          >
            Détails
          </div>
          )}
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, width: "100%", maxWidth: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: "1 1 0", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}
            </div>

            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9, flex: "0 0 auto" }}>
              {done ? scoreTextAny(m) : "VS"}
            </div>

            <div style={{ minWidth: 0, flex: "1 1 0", display: "flex", justifyContent: "flex-end", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "b", playersById)}
            </div>
          </div>

          <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {phaseLabel}
          </div>

          {done && m?.winnerId ? (
            <div style={{ fontSize: 11.5, opacity: 0.78, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              ✅ Vainqueur : <b style={{ color: "#7fe2a9" }}>{playersById[String(m.winnerId)]?.name || "—"}</b>
            </div>
          ) : null}
        </div>
      </div>
    );
  }

  function sectionTitleForMatches() {
    if (viewKind === "round_robin") return "Tous les rounds à jouer";
    if (viewKind === "groups_ko") return "Tous les matchs (poules + éliminatoires)";
    return "Matchs à jouer";
  }

  const stats = React.useMemo(() => computeTournamentStats(playersById, displayMatches), [playersById, displayMatches]);

  const koMatches = React.useMemo(() => {
    const raw = (byPhase.ko || [])
      .filter((m: any) => !m?.groupId)
      .filter((m: any) => !isVoidByeMatch(m))
      .slice();

    const map = new Map<string, any>();
    for (const m of raw) {
      const k = String(m?.id || "");
      if (!k) continue;
      if (!map.has(k)) map.set(k, m);
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));
    return arr;
  }, [byPhase.ko]);

  const [bracketSub, setBracketSub] = React.useState<"view" | "details">("view");

  const tourIdentity: any = (tour as any)?.identity || {};
  const tournamentLogoSrc =
    tourIdentity.logoDataUrl ||
    tourIdentity.logoUrl ||
    tourIdentity.avatarDataUrl ||
    (tour as any)?.logoDataUrl ||
    (tour as any)?.logoUrl ||
    (tour as any)?.avatarDataUrl ||
    null;
  const tournamentCoverSrc =
    tourIdentity.coverDataUrl ||
    tourIdentity.bannerDataUrl ||
    tourIdentity.coverUrl ||
    (tour as any)?.coverDataUrl ||
    (tour as any)?.bannerDataUrl ||
    (tour as any)?.coverUrl ||
    null;

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* HEADER VISUEL COMPÉTITION */}
      {(tournamentCoverSrc || tournamentLogoSrc) ? (
        <div
          style={{
            position: "relative",
            overflow: "hidden",
            borderRadius: 24,
            border: "1px solid rgba(255,207,87,0.18)",
            background: tournamentCoverSrc
              ? `linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.32), rgba(0,0,0,.82)), url("${tournamentCoverSrc}") center / cover no-repeat`
              : "linear-gradient(180deg, rgba(255,255,255,0.055), rgba(255,255,255,0.025))",
            boxShadow: "0 16px 44px rgba(0,0,0,.42)",
            padding: "12px 14px",
            minHeight: 94,
            display: "grid",
            alignItems: "center",
            marginBottom: 12,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: tournamentLogoSrc ? "54px 1fr" : "1fr", alignItems: "center", gap: 12, position: "relative", zIndex: 1 }}>
            {tournamentLogoSrc ? (
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 999,
                  padding: 4,
                  border: "1px solid rgba(255,207,87,.62)",
                  background: "rgba(0,0,0,.50)",
                  boxShadow: "0 0 22px rgba(255,207,87,.30)",
                  display: "grid",
                  placeItems: "center",
                  overflow: "hidden",
                }}
              >
                <img src={tournamentLogoSrc} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 999, display: "block" }} />
              </div>
            ) : null}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 16px rgba(0,0,0,.80)" }}>
                {(tour as any)?.name || "Mon tournoi"}
              </div>
              <div style={{ marginTop: 3, fontSize: 11.5, opacity: 0.88, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textShadow: "0 2px 12px rgba(0,0,0,.75)" }}>
                {(tour as any)?.status ? String((tour as any).status).toUpperCase() : "—"} • {playableMatches.length} à jouer
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {/* NAVIGATION PRINCIPALE : titre supprimé, icônes intégrées à la place */}
      <div style={{ display: "grid", gridTemplateColumns: "40px minmax(0, 1fr) 88px", alignItems: "center", gap: 10 }}>
        <button
          type="button"
          onClick={() => go("tournaments")}
          title="Retour"
          style={{
            width: 40,
            height: 40,
            borderRadius: 999,
            border: "1px solid rgba(255,255,255,0.14)",
            background: "rgba(255,255,255,0.05)",
            display: "grid",
            placeItems: "center",
            cursor: "pointer",
          }}
        >
          <Icon name="back" color="#ffcf57" />
        </button>

        <div style={{ minWidth: 0, display: "flex", justifyContent: "center", overflow: "hidden" }}>
          <NeonTopTabsIconsOnly tabs={TABS} activeKey={tab} onChange={setTab} />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button
            type="button"
            onClick={simulateTournament}
            title="Simuler le tournoi"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,0.14)",
              background: "rgba(255,255,255,0.05)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="play" color="#ffcf57" />
          </button>

          <button
            type="button"
            onClick={async () => {
              if (!id) return;
              const ok = window.confirm("Supprimer ce tournoi et tous ses matchs ?");
              if (!ok) return;
              try {
                await deleteMatchesForTournamentLocal(id);
                await deleteTournamentLocal(id);
              } catch (e) {
                console.error("[TournamentView] delete error:", e);
              } finally {
                go("tournaments");
              }
            }}
            title="Supprimer"
            style={{
              width: 40,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,80,120,0.35)",
              background: "rgba(255,80,120,0.08)",
              display: "grid",
              placeItems: "center",
              cursor: "pointer",
            }}
          >
            <Icon name="trash" color="#ff4fd8" />
          </button>
        </div>
      </div>

      <div
        style={{
          marginTop: 2,
          textAlign: "center",
          fontWeight: 950,
          fontSize: 18,
          color: TAB_COLORS[tab] || "#ffcf57",
          textShadow: `0 0 18px ${(TAB_COLORS[tab] || "#ffcf57")}33`,
        }}
      >
        {tabLabel[tab] || "—"}
      </div>

      {loading ? (
        <Card title="Chargement…" subtitle="Récupération du tournoi et des matchs." accent={TAB_COLORS.home} />
      ) : !tour ? (
        <Card title="Introuvable" subtitle="Ce tournoi n'existe pas (ou a été supprimé)." accent="#ff4fd8" />
      ) : (
        <>
          {/* HOME */}
          {tab === "home" ? (
            <>
              {autoQualified.length ? (
                <Card
                  title="Qualifiés d’office"
                  subtitle="Exempt (BYE) — ces joueurs passent automatiquement."
                  accent={TAB_COLORS.standings}
                  icon="★"
                  badge={<MiniBadge label="Qualifiés" value={autoQualified.length} accent={TAB_COLORS.standings} />}
                >
                  <div style={{ display: "grid", gap: 10 }}>
                    {autoQualified.map((p: any) => (
                      <div
                        key={String(p.id)}
                        style={{
                          borderRadius: 16,
                          border: "1px solid rgba(255,255,255,0.10)",
                          background: "linear-gradient(180deg, rgba(0,0,0,0.28), rgba(255,255,255,0.03))",
                          padding: 12,
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          width: "100%",
                          maxWidth: "100%",
                          overflow: "hidden",
                        }}
                      >
                        <PlayerPill name={p?.name || "Joueur"} avatarUrl={p?.avatar || null} />
                        <div style={{ fontWeight: 950, color: "#7fe2a9", opacity: 0.95, whiteSpace: "nowrap" }}>✅ Qualifié</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card
                title="À jouer"
                subtitle={playableMatches.length ? "Les prochains matchs jouables." : "Aucun match jouable pour le moment."}
                accent={TAB_COLORS.home}
                icon="⚡"
                badge={<MiniBadge label="À jouer" value={playableMatches.length} accent={TAB_COLORS.home} />}
              >
                {playableMatches.length ? <div style={{ display: "grid", gap: 10 }}>{playableMatches.slice(0, 8).map((m: any) => renderMatchCard(m, TAB_COLORS.home))}</div> : null}
              </Card>

              <Card
                title="Derniers matchs terminés"
                subtitle={doneMatches.length ? "Résultats récents." : "Aucun match terminé."}
                accent={TAB_COLORS.standings}
                icon="✓"
                badge={<MiniBadge label="Terminés" value={doneMatches.length} accent={TAB_COLORS.standings} />}
              >
                {doneMatches.length ? (
                  <div style={{ display: "grid", gap: 10 }}>
                    {doneMatches
                      .slice()
                      .sort((a: any, b: any) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0))
                      .slice(0, 6)
                      .map((m: any) => renderMatchCard(m, TAB_COLORS.standings))}
                  </div>
                ) : null}
              </Card>

              <Card
                title="Parties déjà jouées"
                subtitle="Rattache des parties terminées de l’historique à cette ligue, sans les supprimer de l’historique."
                accent={TAB_COLORS.linked}
                icon="＋"
                badge={<MiniBadge label="Liées" value={linkedHistoryMatches.length} accent={TAB_COLORS.linked} />}
              >
                <button
                  type="button"
                  onClick={loadAttachableHistory}
                  style={{
                    width: "100%",
                    border: "none",
                    borderRadius: 999,
                    padding: "12px 14px",
                    fontWeight: 1000,
                    cursor: "pointer",
                    color: "#1b1204",
                    background: "linear-gradient(180deg,#ffe68a,#ffc447)",
                    boxShadow: "0 12px 28px rgba(255,207,87,.22)",
                  }}
                >
                  + Ajouter des parties déjà jouées
                </button>
              </Card>
            </>
          ) : null}

          {/* POOLS */}
          {tab === "pools" ? (
            <Card title="Poules" subtitle="Sous-onglets par poule + rounds." accent={TAB_COLORS.pools} icon="▦">
              <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                {Array.from({ length: groupsMeta }, (_, i) => (
                  <Pill key={i} active={activeGroupIdx === i} label={`${String.fromCharCode(65 + i)}`} onClick={() => setActiveGroupIdx(i)} accent={TAB_COLORS.pools} />
                ))}
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                {(() => {
                  const arr = rrMatchesByGroup[activeGroupIdx] || [];
                  const byRound: Record<number, any[]> = {};
                  for (const m of arr) {
                    const r = Number(m.roundIndex ?? 0);
                    if (!byRound[r]) byRound[r] = [];
                    byRound[r].push(m);
                  }
                  const rounds = Object.keys(byRound).map(Number).sort((a, b) => a - b);
                  return rounds.map((r) => (
                    <div key={r} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                      <div style={{ fontWeight: 950, color: TAB_COLORS.pools, marginBottom: 10 }}>ROUND {r + 1}</div>
                      <div style={{ display: "grid", gap: 10 }}>
                        {byRound[r]
                          .filter((m) => !isByeMatch(m))
                          .filter((m) => !isTbdId(m?.aPlayerId) && !isTbdId(m?.bPlayerId))
                          .map((m: any) => renderMatchCard(m, TAB_COLORS.pools))}
                      </div>
                    </div>
                  ));
                })()}
              </div>
            </Card>
          ) : null}

          {/* STANDINGS */}
          {tab === "standings" ? (
            <Card title="Classement" subtitle={viewKind === "round_robin" ? (isAveragePointsLeague ? "Classement par moyenne de points par match." : "Classement du championnat.") : "Classement par poule."} accent={TAB_COLORS.standings} icon="🏁">
              {viewKind === "round_robin" ? (
                <>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <MiniBadge label={isLeagueMulti ? "Parties liées" : "Matchs"} value={isLeagueMulti ? linkedHistoryMatches.length : byPhase.groups.length} accent={TAB_COLORS.standings} />
                    <button type="button" onClick={loadAttachableHistory} style={{ borderRadius: 999, border: "1px solid rgba(255,207,87,.45)", background: "rgba(255,207,87,.10)", color: "#ffcf57", fontWeight: 950, padding: "8px 10px", cursor: "pointer" }}>+ Partie jouée</button>
                  </div>
                  <StandingsTable rows={isLeagueMulti ? linkedMultiStandings : computeStandings(Object.keys(playersById), byPhase.groups, isLeagueFree ? 3 : 2)} playersById={playersById} accent={TAB_COLORS.standings} averageMode={isAveragePointsLeague} />
                </>
              ) : (
                <div style={{ display: "grid", gap: 12 }}>
                  <div className="dc-scroll-thin" style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                    {Array.from({ length: groupsMeta }, (_, i) => (
                      <Pill key={i} active={activeGroupIdx === i} label={`${String.fromCharCode(65 + i)}`} onClick={() => setActiveGroupIdx(i)} accent={TAB_COLORS.pools} />
                    ))}
                  </div>

                  <StandingsTable rows={rrStandingsByGroup[activeGroupIdx] || []} playersById={playersById} accent={TAB_COLORS.standings} />
                </div>
              )}
            </Card>
          ) : null}

          {/* BRACKET */}
          {tab === "bracket" ? (
            <Card title="Tableau" subtitle={viewKind === "round_robin" ? "Le classement est dans l’onglet Classement." : "Éliminatoires (Vue coupe du monde / Détails)."} accent={TAB_COLORS.bracket} icon="⟂">
              {viewKind === "round_robin" ? (
                <div style={{ fontSize: 12, opacity: 0.78 }}>Pas de bracket en championnat.</div>
              ) : (
                <>
                  <div className="dc-scroll-thin" style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 4, WebkitOverflowScrolling: "touch" }}>
                    <Pill active={bracketSub === "view"} label="Vue" onClick={() => setBracketSub("view")} accent={TAB_COLORS.bracket} />
                    <Pill active={bracketSub === "details"} label="Détails" onClick={() => setBracketSub("details")} accent={TAB_COLORS.bracket} />
                  </div>

                  {bracketSub === "view" ? (
                    <div style={{ marginTop: 12 }}>
                      <WorldCupBracketViewPure koMatches={koMatches} playersById={playersById} allMatches={safeMatches as any} onOpenMatch={onOpenMatchDetails} />
                    </div>
                  ) : null}

                  {bracketSub === "details" ? (
                    <div style={{ marginTop: 12 }}>
                      {(() => {
                        const detailsKo = koMatches.filter((m: any) => !isByeMatch(m));
                        return (
                          <WorldCupKoDetailsColumns
                            koMatches={detailsKo}
                            renderMatchCard={(m: any) => renderMatchCard(m, TAB_COLORS.bracket, { clickable: true, hideActions: true })}
                            getScore={getScoreForAnyMatch}
                          />
                        );
                      })()}
                    </div>
                  ) : null}
                </>
              )}
            </Card>
          ) : null}

          {/* MATCHES */}
          {tab === "matches" ? (
            <Card title="Matchs" subtitle={sectionTitleForMatches()} accent={TAB_COLORS.matches} icon="≡">
              {(() => {
                let arr: any[] = [];
                if (viewKind === "round_robin") arr = byPhase.groups.slice();
                else if (viewKind === "groups_ko") arr = displayMatches.slice();
                else arr = byPhase.ko.slice();

                arr = arr.filter((m) => !isByeMatch(m)).filter((m) => !isVoidByeMatch(m));
                if (!arr.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match à afficher.</div>;

                const byBlock: Record<string, any[]> = {};
                for (const m of arr) {
                  const isGroupLike =
                    String(m?.phase || "") === "groups" ||
                    typeof m?.groupIndex === "number" ||
                    m?.stageIndex === 0;

                  if (isGroupLike) {
                    if (typeof m?.groupIndex !== "number") {
                      const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                      const key = `UNASSIGNED_R${r}`;
                      (byBlock[key] ||= []).push(m);
                    } else {
                      const g = m.groupIndex;
                      const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                      const key = `G${g}_R${r}`;
                      (byBlock[key] ||= []).push(m);
                    }
                  } else {
                    const r = typeof m?.roundIndex === "number" ? m.roundIndex : 0;
                    const key = `KO_R${r}`;
                    (byBlock[key] ||= []).push(m);
                  }
                }

                const keys = Object.keys(byBlock).sort((a, b) => {
                  const aUn = a.startsWith("UNASSIGNED");
                  const bUn = b.startsWith("UNASSIGNED");
                  if (aUn !== bUn) return aUn ? 1 : -1;
                  return a.localeCompare(b);
                });

                return (
                  <div style={{ display: "grid", gap: 12 }}>
                    {keys.map((k) => {
                      const items = (byBlock[k] || [])
                        .slice()
                        .sort((a, b) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                      const first = items[0];
                      const isUnassigned = k.startsWith("UNASSIGNED_");
                      const isGroupLike =
                        !isUnassigned &&
                        (String(first?.phase || "") === "groups" || typeof first?.groupIndex === "number" || first?.stageIndex === 0);

                      let title = "Matchs";
                      if (isUnassigned) {
                        const r = typeof first?.roundIndex === "number" ? first.roundIndex : 0;
                        title = `À classer • Round ${r + 1}`;
                      } else if (isGroupLike) {
                        const g = first.groupIndex;
                        const r = typeof first.roundIndex === "number" ? first.roundIndex : 0;
                        title = `Poule ${String.fromCharCode(65 + g)} • Round ${r + 1}`;
                      } else {
                        const r = typeof first?.roundIndex === "number" ? first.roundIndex : 0;
                        title = koTourLabel(r, koRoundsCount);
                      }

                      return (
                        <div key={k} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, overflow: "hidden" }}>
                          <div style={{ fontWeight: 950, color: isUnassigned ? "#ff8f2b" : TAB_COLORS.matches, marginBottom: 10 }}>{title}</div>
                          <div style={{ display: "grid", gap: 10 }}>{items.map((m: any) => renderMatchCard(m, TAB_COLORS.matches))}</div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}
            </Card>
          ) : null}

          {/* REPECHAGE */}
          {tab === "repechage" ? (
            <Card title="Repêchage" subtitle="Matchs de repêchage (Losers / ou stage dédié)." accent={TAB_COLORS.repechage} icon="↻">
              {(() => {
                const rep = byPhase.rep
                  .filter((m: any) => !isByeMatch(m))
                  .filter((m: any) => !isVoidByeMatch(m))
                  .slice()
                  .sort((a: any, b: any) => (a.roundIndex ?? 0) - (b.roundIndex ?? 0) || (a.orderIndex ?? 0) - (b.orderIndex ?? 0));

                if (!rep.length) return <div style={{ fontSize: 12, opacity: 0.78 }}>Aucun match de repêchage.</div>;
                return <div style={{ display: "grid", gap: 10 }}>{rep.map((m) => renderMatchCard(m, TAB_COLORS.repechage))}</div>;
              })()}
            </Card>
          ) : null}

          {/* PARTIES LIÉES */}
          {tab === "linked" ? (
            <Card title="Parties liées" subtitle="Parties de l’historique rattachées à cette ligue. Le rattachement ne modifie pas l’historique d’origine." accent={TAB_COLORS.linked} icon="↔">
              <button
                type="button"
                onClick={loadAttachableHistory}
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: 999,
                  padding: "12px 14px",
                  fontWeight: 1000,
                  cursor: "pointer",
                  color: "#1b1204",
                  background: "linear-gradient(180deg,#ffe68a,#ffc447)",
                  boxShadow: "0 12px 28px rgba(255,207,87,.22)",
                  marginBottom: 12,
                }}
              >
                + Ajouter des parties déjà jouées
              </button>

              {linkedHistoryMatches.length ? (
                <div style={{ display: "grid", gap: 10 }}>
                  {linkedHistoryMatches
                    .slice()
                    .sort((a: any, b: any) => Number(b?.linkedAt || b?.createdAt || 0) - Number(a?.linkedAt || a?.createdAt || 0))
                    .map((link: any) => {
                      const ranking = Array.isArray(link?.ranking) ? link.ranking : [];
                      const points = getLinkedPointsAwarded(link, tour);
                      return (
                        <div key={String(link?.historyMatchId || link?.id)} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.035)", padding: 12 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                            <div style={{ fontWeight: 950, color: TAB_COLORS.linked }}>{String(link?.mode || "MATCH").toUpperCase()}</div>
                            <div style={{ fontSize: 11, opacity: .75 }}>{formatDate(Number(link?.createdAt || link?.linkedAt || 0))}</div>
                          </div>
                          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                            {ranking.slice(0, 8).map((r: any, idx: number) => {
                              const pid = String(r?.playerId || r?.id || "");
                              const pts = points.find((p: any) => String(p?.playerId || "") === pid)?.points ?? 0;
                              return (
                                <div key={`${pid}_${idx}`} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 8, alignItems: "center", fontSize: 12 }}>
                                  <b style={{ color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,.72)" }}>{idx + 1}</b>
                                  <PlayerPill name={r?.name || playersById[pid]?.name || "Joueur"} avatarUrl={r?.avatarDataUrl || r?.avatar || playersById[pid]?.avatar || null} />
                                  <b style={{ color: TAB_COLORS.linked }}>+{pts}</b>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                </div>
              ) : (
                <div style={{ fontSize: 12, opacity: .76 }}>Aucune partie liée pour l’instant.</div>
              )}
            </Card>
          ) : null}

          {/* STATS */}
          {tab === "stats" ? (
            <Card title="Statistiques" subtitle="Synthèse (basée sur scores simples). Les “vraies stats mode” seront branchées ensuite." accent={TAB_COLORS.stats} icon="📊">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <MiniBadge label="Matchs" value={stats.global.totalMatches} accent={TAB_COLORS.stats} />
                <MiniBadge label="Terminés" value={stats.global.doneMatches} accent="#7fe2a9" />
                <MiniBadge label="En cours" value={stats.global.runningMatches} accent="#4fb4ff" />
                <MiniBadge label="À jouer" value={stats.global.playableMatches} accent="#ffcf57" />
              </div>

              <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
                {stats.list.map((r: any, idx: number) => (
                  <div
                    key={r.id}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "28px 1fr auto",
                      gap: 10,
                      alignItems: "center",
                      padding: "10px 12px",
                      borderRadius: 14,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.25)",
                      width: "100%",
                      maxWidth: "100%",
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.75)" }}>{idx + 1}</div>
                    <PlayerPill name={r.name} avatarUrl={playersById[String(r.id)]?.avatar} />
                    <div style={{ textAlign: "right", fontSize: 11.5, opacity: 0.9, whiteSpace: "nowrap" }}>
                      <b style={{ color: TAB_COLORS.stats }}>{r.points}</b> pts • {r.wins}-{r.losses} • <b style={{ color: "#7fe2a9" }}>{r.winrate}%</b> • Δ {r.diff}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : null}
        </>
      )}


      {attachOpen ? (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            background: "rgba(0,0,0,.68)",
            display: "grid",
            placeItems: "end center",
            padding: 14,
          }}
          onClick={() => !attachLoading && setAttachOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px, 100%)",
              maxHeight: "78vh",
              overflow: "hidden",
              borderRadius: 24,
              border: "1px solid rgba(255,207,87,.26)",
              background: "linear-gradient(180deg, rgba(23,21,18,.98), rgba(8,8,12,.98))",
              boxShadow: "0 28px 80px rgba(0,0,0,.72)",
              padding: 14,
              color: "#fff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
              <div>
                <div style={{ color: TAB_COLORS.linked, fontWeight: 1000, fontSize: 14 }}>AJOUTER DES PARTIES JOUÉES</div>
                <div style={{ fontSize: 11.5, opacity: .75, marginTop: 3 }}>{isLeagueMulti ? "Ligue MULTI : points selon classement." : "Ligue classique : ajout comme résultat joué."}</div>
              </div>
              <button type="button" onClick={() => !attachLoading && setAttachOpen(false)} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 1000, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
              <MiniBadge label="Trouvées" value={attachRows.length} accent={TAB_COLORS.linked} />
              <MiniBadge label="Sélection" value={Object.values(attachSelected || {}).filter(Boolean).length} accent="#7fe2a9" />
            </div>

            {attachInfo ? <div style={{ marginTop: 10, fontSize: 12, opacity: .78 }}>{attachInfo}</div> : null}
            {attachError ? <div style={{ marginTop: 10, fontSize: 12, color: "#ff7a9e", fontWeight: 900 }}>{attachError}</div> : null}

            <div className="dc-scroll-thin" style={{ marginTop: 12, display: "grid", gap: 8, maxHeight: "48vh", overflowY: "auto", paddingRight: 3 }}>
              {attachLoading ? <div style={{ padding: 16, textAlign: "center", opacity: .8 }}>Chargement…</div> : null}
              {!attachLoading && !attachRows.length ? <div style={{ padding: 16, textAlign: "center", opacity: .72 }}>Aucune partie compatible à afficher.</div> : null}
              {!attachLoading && attachRows.map((row: any) => {
                const hid = String(row.__historyId || getHistoryRowId(row));
                const ranking = getHistoryRanking(row);
                const names = ranking.slice(0, 4).map((r: any, idx: number) => `${idx + 1}. ${r?.name || "Joueur"}`).join(" · ");
                const checked = !!attachSelected[hid];
                return (
                  <label key={hid} style={{ display: "grid", gridTemplateColumns: "24px 1fr", gap: 10, alignItems: "center", borderRadius: 16, border: checked ? `1px solid ${TAB_COLORS.linked}AA` : "1px solid rgba(255,255,255,.10)", background: checked ? "rgba(255,207,87,.12)" : "rgba(255,255,255,.035)", padding: 10, cursor: "pointer" }}>
                    <input type="checkbox" checked={checked} onChange={(e) => setAttachSelected((prev) => ({ ...prev, [hid]: e.target.checked }))} />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
                        <b style={{ color: TAB_COLORS.linked, fontSize: 12 }}>{String(row.__mode || getHistoryMode(row) || "MATCH").toUpperCase()}</b>
                        <span style={{ fontSize: 11, opacity: .72 }}>{formatDate(Number(row.__time || getHistoryRowTime(row)))}</span>
                      </div>
                      <div style={{ marginTop: 4, fontSize: 11.5, opacity: .82, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{names || `${row.__playersCount || 0} joueur(s)`}</div>
                    </div>
                  </label>
                );
              })}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
              <button type="button" disabled={attachLoading} onClick={() => setAttachOpen(false)} style={{ borderRadius: 999, padding: "12px 14px", border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.06)", color: "#fff", fontWeight: 950, cursor: "pointer" }}>Annuler</button>
              <button type="button" disabled={attachLoading} onClick={attachSelectedHistoryMatches} style={{ borderRadius: 999, padding: "12px 14px", border: "none", background: "linear-gradient(180deg,#ffe68a,#ffc447)", color: "#1b1204", fontWeight: 1000, cursor: "pointer", opacity: attachLoading ? .55 : 1 }}>Lier</button>
            </div>
          </div>
        </div>
      ) : null}

      {selectedMatch ? (
        <MatchDetailCard
          match={selectedMatch}
          playersById={playersById}
          allMatches={safeMatches as any}
          score={getScoreForAnyMatch(selectedMatch)}
          phaseLabel={matchPhaseShortLabel(selectedMatch, viewKind, koRoundsCount)}
          formatLabel={`BO${tournamentBestOf}`}
          onClose={() => setSelectedMatch(null)}
          onSimulate={() => simulateMatch(selectedMatch)}
          onPlay={() => {
            if (!selectedMatch) return;
            if (String(selectedMatch?.status || "") === "done") {
              return;
            }
            if (String(selectedMatch?.status || "") === "running" || String(selectedMatch?.status || "") === "playing" || isRealPlayable(selectedMatch)) {
              onStartMatch(String(selectedMatch.id));
            }
          }}
          onOpenResult={() => {
            if (!selectedMatch) return;
            onOpenResult(selectedMatch);
          }}
        />
      ) : null}

    </div>
  );
}
