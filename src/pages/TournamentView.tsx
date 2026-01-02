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
        <div style={{ fontWeight: 900, fontSize: 12.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {name || "Joueur"}
        </div>
        {extra ? (
          <div style={{ fontSize: 11, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
    String(m?.phase || "") === "groups" ||
    (typeof m?.groupIndex === "number" && m.groupIndex >= 0);

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
    return <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />;
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
      leftAvatarUrl={pa?.avatar || null}
      rightName={rightName}
      rightAvatarUrl={pb?.avatar || null}
    />
  );
}

function computeStandings(groupPlayerIds: string[], groupMatches: any[]) {
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
      rows[a].points += 2;
    } else if (w && w === b) {
      rows[b].wins += 1;
      rows[a].losses += 1;
      rows[b].points += 2;
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
   KO DETAILS (Détails)
-------------------------- */
function getMatchScore(m: any) {
  if (!m) return null;

  const a =
    (typeof m?.scoreA === "number" ? m.scoreA : null) ??
    (typeof m?.aScore === "number" ? m.aScore : null) ??
    (typeof m?.legsA === "number" ? m.legsA : null) ??
    (typeof m?.result?.a === "number" ? m.result.a : null) ??
    (typeof m?.score?.a === "number" ? m.score.a : null) ??
    null;

  const b =
    (typeof m?.scoreB === "number" ? m.scoreB : null) ??
    (typeof m?.bScore === "number" ? m.bScore : null) ??
    (typeof m?.legsB === "number" ? m.legsB : null) ??
    (typeof m?.result?.b === "number" ? m.result.b : null) ??
    (typeof m?.score?.b === "number" ? m.score.b : null) ??
    null;

  if (a != null && b != null) return { a, b };

  const status = String(m?.status || "");
  const done = status === "done";
  if (done) {
    const w = String(m?.winnerId || "");
    const A = String(m?.aPlayerId || "");
    const B = String(m?.bPlayerId || "");
    if (w && A && B) {
      if (w === A) return { a: 1, b: 0 };
      if (w === B) return { a: 0, b: 1 };
    }
  }

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
}: {
  koMatches: any[];
  renderMatchCard: (m: any) => React.ReactNode;
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
                const sc = getMatchScore(m);
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

function WorldCupBracketViewPure({ koMatches, playersById, allMatches }: any) {
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
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: matchTop(ri, i),
                      height: MATCH_H,
                      display: "grid",
                      placeItems: "center",
                      gap: 10,
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

function StandingsTable({ rows, playersById, accent = "#7fe2a9" }: { rows: any[]; playersById: Record<string, any>; accent?: string }) {
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
      <div style={{ minWidth: 420 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "34px 1fr 52px 44px 44px 44px 56px",
            gap: 10,
            padding: "10px 12px",
            position: "sticky",
            top: 0,
            background: "rgba(8,10,14,0.85)",
            backdropFilter: "blur(8px)",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
            fontSize: 11,
            fontWeight: 950,
            color: "rgba(255,255,255,0.72)",
            zIndex: 2,
          }}
        >
          <div>#</div>
          <div>Joueur</div>
          <div style={{ textAlign: "right", color: accent }}>Pts</div>
          <div style={{ textAlign: "right" }}>J</div>
          <div style={{ textAlign: "right" }}>V</div>
          <div style={{ textAlign: "right" }}>D</div>
          <div style={{ textAlign: "right" }}>Δ</div>
        </div>

        <div style={{ display: "grid" }}>
          {(rows || []).map((r: any, idx: number) => {
            const pl = playersById[String(r.id)];
            const diff = (r.scored ?? 0) - (r.conceded ?? 0);
            const played = r.played ?? (r.wins ?? 0) + (r.losses ?? 0);

            return (
              <div
                key={String(r.id)}
                style={{
                  display: "grid",
                  gridTemplateColumns: "34px 1fr 52px 44px 44px 44px 56px",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 12px",
                  borderBottom: "1px solid rgba(255,255,255,0.06)",
                }}
              >
                <div style={{ fontWeight: 950, color: idx === 0 ? "#ffcf57" : "rgba(255,255,255,0.70)" }}>{idx + 1}</div>
                <div style={{ minWidth: 0 }}>
                  <PlayerPill name={pl?.name || "Joueur"} avatarUrl={pl?.avatar} />
                </div>
                <div style={{ textAlign: "right", fontWeight: 950, color: accent }}>{r.points ?? 0}</div>
                <div style={{ textAlign: "right", opacity: 0.9 }}>{played}</div>
                <div style={{ textAlign: "right", opacity: 0.9 }}>{r.wins ?? 0}</div>
                <div style={{ textAlign: "right", opacity: 0.9 }}>{r.losses ?? 0}</div>
                <div style={{ textAlign: "right", opacity: 0.9 }}>{diff}</div>
              </div>
            );
          })}
        </div>
      </div>
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
    const pls = (tour as any)?.players || [];
    for (const p of pls) {
      if (!p?.id) continue;
      out[String(p.id)] = {
        id: String(p.id),
        name: p?.name || "Joueur",
        avatar: p?.avatar || p?.avatarDataUrl || p?.avatarUrl || null,
        countryCode: p?.countryCode || null,
      };
    }
    return out;
  }, [tour]);

  // ------------------------------------------------------------
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

  const onOpenResult = React.useCallback((m: any) => setResultMatch(m), []);

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
    if (viewKind === "single_ko") return ["home", "bracket", "matches", "stats"];
    if (viewKind === "double_ko") return ["home", "bracket", "matches", "repechage", "stats"];
    if (viewKind === "round_robin") return ["home", "standings", "matches", "stats"];
    return ["home", "pools", "standings", "bracket", "matches", ...(repechageEnabled ? ["repechage"] : []), "stats"];
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
        const r = submitResult({ tournament: tour as any, matches: safeMatches as any, matchId: String(m.id), winnerId, historyMatchId: null });
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

        const r = submitResult({ tournament: curTour, matches: curMatches, matchId: String(m.id), winnerId, historyMatchId: null });
        curTour = r.tournament;
        curMatches = r.matches;
      }

      await persist(curTour as any, curMatches as any);
    } catch (e) {
      console.error("[TournamentView] simulateTournament error:", e);
    }
  }, [tour, safeMatches, persist]);

  function renderMatchCard(m: any, accent: string) {
    const status = String(m?.status || "pending");
    const playable = isRealPlayable(m);
    const running = status === "running" || status === "playing";
    const done = status === "done";
    const topTag = done ? "TERMINÉ" : running ? "EN COURS" : playable ? "À JOUER" : "ATTENTE";
    const topColor = done ? "#7fe2a9" : running ? "#4fb4ff" : playable ? "#ffcf57" : "rgba(255,255,255,0.55)";

    const phaseLabel = matchPhaseLabel(m, viewKind, koRoundsCount);

    return (
      <div
        key={m.id}
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.10)",
          background: "linear-gradient(180deg, rgba(0,0,0,0.35), rgba(255,255,255,0.03))",
          padding: 12,
          boxShadow: "0 14px 30px rgba(0,0,0,0.35)",
          width: "100%",
          maxWidth: "100%",
          overflow: "hidden",
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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              type="button"
              onClick={() => simulateMatch(m)}
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
              onClick={() => {
                if (done) onOpenResult(m);
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
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 10, width: "100%", maxWidth: "100%" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", minWidth: 0 }}>
            <div style={{ minWidth: 0, flex: "1 1 0", overflow: "hidden" }}>
              {renderPlayerOrTbd(safeMatches as any, m, "a", playersById)}
            </div>
            <div style={{ fontWeight: 950, fontSize: 13, opacity: 0.9, flex: "0 0 auto" }}>{done ? scoreText(m) : "VS"}</div>
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

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      {/* HEADER */}
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 88px", alignItems: "center", gap: 10 }}>
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

        <div style={{ textAlign: "center", minWidth: 0 }}>
          <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: 0.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(tour as any)?.name || "Mon tournoi"}
          </div>
          <div style={{ fontSize: 11.5, opacity: 0.75, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {(tour as any)?.status ? String((tour as any).status).toUpperCase() : "—"} • {playableMatches.length} à jouer
          </div>
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

      <NeonTopTabsIconsOnly tabs={TABS} activeKey={tab} onChange={setTab} />

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
            <Card title="Classement" subtitle={viewKind === "round_robin" ? "Classement du championnat." : "Classement par poule."} accent={TAB_COLORS.standings} icon="🏁">
              {viewKind === "round_robin" ? (
                <StandingsTable rows={computeStandings(Object.keys(playersById), byPhase.groups)} playersById={playersById} accent={TAB_COLORS.standings} />
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
                      <WorldCupBracketViewPure koMatches={koMatches} playersById={playersById} allMatches={safeMatches as any} />
                    </div>
                  ) : null}

                  {bracketSub === "details" ? (
                    <div style={{ marginTop: 12 }}>
                      {(() => {
                        const detailsKo = koMatches.filter((m: any) => !isByeMatch(m));
                        return <WorldCupKoDetailsColumns koMatches={detailsKo} renderMatchCard={(m: any) => renderMatchCard(m, TAB_COLORS.bracket)} />;
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

      {/* Modal résultat */}
      {resultMatch ? (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,0.62)", display: "grid", placeItems: "end center", padding: 12 }}
          onMouseDown={() => setResultMatch(null)}
        >
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
              <div style={{ fontWeight: 950, fontSize: 14, color: "#ffcf57" }}>Résultat</div>
              <button type="button" onClick={() => setResultMatch(null)} style={{ border: "none", background: "transparent", color: "rgba(255,255,255,0.75)", fontSize: 20, cursor: "pointer", lineHeight: 1 }} aria-label="Fermer" title="Fermer">
                ✕
              </button>
            </div>

            <div style={{ padding: 14 }}>
              <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 10 }}>Choisis le vainqueur pour enregistrer le résultat.</div>

              <div style={{ display: "grid", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).aPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(255,207,87,0.18), rgba(255,207,87,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).aPlayerId)]?.name || "Joueur A"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (!tour) return;
                    const r = submitResult({
                      tournament: tour as any,
                      matches: safeMatches as any,
                      matchId: (resultMatch as any).id,
                      winnerId: String((resultMatch as any).bPlayerId),
                      historyMatchId: null,
                    });
                    persist(r.tournament as any, r.matches as any);
                    setResultMatch(null);
                  }}
                  style={{
                    borderRadius: 16,
                    padding: "12px 12px",
                    border: "1px solid rgba(255,255,255,0.10)",
                    background: "linear-gradient(180deg, rgba(79,180,255,0.18), rgba(79,180,255,0.08))",
                    color: "rgba(255,255,255,0.92)",
                    fontWeight: 950,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  ✅ {playersById[String((resultMatch as any).bPlayerId)]?.name || "Joueur B"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
