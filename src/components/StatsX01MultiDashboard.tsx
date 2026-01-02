// =============================================================
// src/components/StatsX01MultiDashboard.tsx
// Dashboard X01 Multi (niveau Training X01)
// - KPIs complets (moy3D, winrate, volume, 180/140+/100+…)
// - Progression (sparkline moy3D par match)
// - Stats par paramètres (distance / IN / OUT)
// - Détail des matchs X01
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import SparklinePro from "./SparklinePro";
import { GoldPill } from "./StatsPlayerDashboard";
import type { SavedMatch } from "../lib/history";

// Types légers pour les joueurs (alignés avec StatsHub / PlayerLite)
export type X01MultiPlayer = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
};

type TimeRange = "day" | "week" | "month" | "year" | "all";

type Props = {
  records: SavedMatch[];
  activePlayer: X01MultiPlayer;
  allPlayers: X01MultiPlayer[]; // pour éventuels classements plus tard
};

// ---------- Helpers génériques ----------
const Nloc = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

function formatShortDate(ts: number) {
  try {
    const d = new Date(ts);
    const dd = d.toLocaleDateString(undefined, {
      day: "2-digit",
      month: "2-digit",
    });
    const hh = d.toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${dd} ${hh}`;
  } catch {
    return "";
  }
}

const ONE_DAY = 24 * 60 * 60 * 1000;
function inRange(ts: number | undefined, range: TimeRange, now: number) {
  if (!ts) return false;
  if (range === "all") return true;
  const delta =
    range === "day"
      ? ONE_DAY
      : range === "week"
      ? 7 * ONE_DAY
      : range === "month"
      ? 30 * ONE_DAY
      : 365 * ONE_DAY;
  return ts >= now - delta;
}

// ------------------------------------------------------------
// Extraction stats X01 pour un joueur dans un SavedMatch
// (supporte anciens résumés, moteur V3, payload.legs / payload.visits…)
// ------------------------------------------------------------
function extractX01PlayerStats(rec: SavedMatch, pid: string) {
  const ss: any =
    rec.summary ?? rec.payload?.summary ?? rec.engineState?.summary ?? {};

  const per: any[] =
    ss.perPlayer ??
    ss.players ??
    rec.payload?.summary?.perPlayer ??
    rec.engineState?.summary?.perPlayer ??
    [];

  let avg3 = 0;
  let bestVisit = 0;
  let bestCheckout = 0;
  let legs = 0;
  let darts = 0;
  let nb180 = 0;
  let nb140 = 0;
  let nb100 = 0;

  // A) Maps par joueur (avg3ByPlayer / bestVisitByPlayer / bestCheckoutByPlayer)
  const mapAvg3 =
    ss.avg3ByPlayer ??
    rec.engineState?.avg3ByPlayer ??
    rec.payload?.summary?.avg3ByPlayer ??
    null;

  const mapBestVisit =
    ss.bestVisitByPlayer ??
    rec.engineState?.bestVisitByPlayer ??
    rec.payload?.summary?.bestVisitByPlayer ??
    null;

  const mapBestCheckout =
    ss.bestCheckoutByPlayer ??
    rec.engineState?.bestCheckoutByPlayer ??
    rec.payload?.summary?.bestCheckoutByPlayer ??
    null;

  if (mapAvg3 && mapAvg3[pid] != null) {
    avg3 = Nloc(mapAvg3[pid]);
  }
  if (mapBestVisit && mapBestVisit[pid] != null) {
    bestVisit = Math.max(bestVisit, Nloc(mapBestVisit[pid]));
  }
  if (mapBestCheckout && mapBestCheckout[pid] != null) {
    bestCheckout = Math.max(bestCheckout, Nloc(mapBestCheckout[pid]));
  }

  // B) perPlayer
  const pstat =
    per.find((x) => x?.playerId === pid) ??
    (ss[pid] || ss.players?.[pid] || ss.perPlayer?.[pid]) ??
    {};

  if (!avg3) {
    avg3 =
      Nloc(pstat.avg3) ||
      Nloc(pstat.avg_3) ||
      Nloc(pstat.avg3Darts) ||
      Nloc(pstat.average3) ||
      Nloc(pstat.avg3D);
  }

  bestVisit = Math.max(
    bestVisit,
    Nloc(pstat.bestVisit),
    Nloc(pstat.best_visit)
  );
  bestCheckout = Math.max(
    bestCheckout,
    Nloc(pstat.bestCheckout),
    Nloc(pstat.best_co),
    Nloc(pstat.bestFinish)
  );

  legs += Nloc(pstat.legs || pstat.legsPlayed);
  darts += Nloc(pstat.darts || pstat.dartsThrown);
  nb180 += Nloc(pstat.nb180 || pstat["180"] || pstat.count180);
  nb140 += Nloc(pstat.nb140 || pstat["140+"] || pstat.count140);
  nb100 += Nloc(pstat.nb100 || pstat["100+"] || pstat.count100);

  // C) moteur V3 : liveStatsByPlayer / statsByPlayer
  const live =
    (rec as any).liveStatsByPlayer?.[pid] ??
    rec.engineState?.statsByPlayer?.[pid];

  if (live) {
    const dartsThrown = live.dartsThrown ?? live.darts ?? 0;
    const startScore =
      (rec as any).startScore ??
      (rec as any).config?.startScore ??
      (rec as any).config?.distance ??
      501;

    const scoreNow =
      (rec as any).scores?.[pid] ??
      live.scoreRemaining ??
      startScore;

    if (dartsThrown > 0) {
      const scored = startScore - scoreNow;
      const a3 = (scored / dartsThrown) * 3;
      if (a3 > 0) avg3 = a3;
    }

    bestVisit = Math.max(bestVisit, Nloc(live.bestVisit));
    bestCheckout = Math.max(bestCheckout, Nloc(live.bestCheckout));

    legs += Nloc(live.legsPlayed);
    darts += Nloc(live.dartsThrown ?? live.darts);
    nb180 += Nloc(live.nb180);
    nb140 += Nloc(live.nb140);
    nb100 += Nloc(live.nb100);
  }

  // D) payload.legs
  if ((!avg3 || (!bestVisit && !bestCheckout)) && (rec as any).payload?.legs) {
    const legsArr: any[] = Array.isArray((rec as any).payload.legs)
      ? (rec as any).payload.legs
      : [];

    let sumAvg3 = 0;
    let legsCount = 0;

    for (const leg of legsArr) {
      const plArr: any[] = Array.isArray(leg.perPlayer)
        ? leg.perPlayer
        : [];
      const pl = plArr.find((x) => x?.playerId === pid);
      if (!pl) continue;

      const legAvg =
        Nloc(pl.avg3) ||
        Nloc(pl.avg_3) ||
        Nloc(pl.avg3Darts) ||
        Nloc(pl.average3) ||
        Nloc(pl.avg3D);

      if (legAvg > 0) {
        sumAvg3 += legAvg;
        legsCount++;
      }

      bestVisit = Math.max(
        bestVisit,
        Nloc(pl.bestVisit),
        Nloc(pl.best_visit)
      );
      bestCheckout = Math.max(
        bestCheckout,
        Nloc(pl.bestCheckout),
        Nloc(pl.best_co),
        Nloc(pl.bestFinish)
      );

      legs += Nloc(pl.legs || 1);
      darts += Nloc(pl.darts || pl.dartsThrown);
      nb180 += Nloc(pl.nb180 || pl["180"] || pl.count180);
      nb140 += Nloc(pl.nb140 || pl["140+"] || pl.count140);
      nb100 += Nloc(pl.nb100 || pl["100+"] || pl.count100);
    }

    if (legsCount > 0 && (!avg3 || avg3 === 0)) {
      avg3 = sumAvg3 / legsCount;
    }
  }

  // E) payload.visits (fallback ultime)
  if ((!avg3 || (!bestVisit && !bestCheckout)) && (rec as any).payload?.visits) {
    const visits: any[] = Array.isArray((rec as any).payload.visits)
      ? (rec as any).payload.visits
      : [];

    let d = 0;
    let scored = 0;

    for (const v of visits) {
      if (v.p !== pid) continue;

      const segs = Array.isArray(v.segments) ? v.segments : [];
      const nbDarts = segs.length || 0;

      d += nbDarts;
      scored += Nloc(v.score);

      if (!v.bust) {
        const sc = Nloc(v.score);
        if (sc > bestVisit) bestVisit = sc;
        if (v.isCheckout && sc > bestCheckout) {
          bestCheckout = sc;
        }
      }
    }

    if (d > 0 && (!avg3 || avg3 === 0)) {
      avg3 = (scored / d) * 3;
    }

    darts += d;
  }

  return {
    avg3,
    bestVisit,
    bestCheckout,
    legs,
    darts,
    nb180,
    nb140,
    nb100,
  };
}

// =============================================================
// COMPONENT
// =============================================================
const StatsX01MultiDashboard: React.FC<Props> = ({
  records,
  activePlayer,
}) => {
  const { theme } = useTheme();
  const [range, setRange] = React.useState<TimeRange>("month");

  const now = Date.now();

  // Palette locale (style StatsHub / TrainingX01)
  const T = {
    gold: theme.primary,
    text: theme.text ?? "#FFFFFF",
    text70: "rgba(255,255,255,.70)",
    cardBg: "rgba(7,8,16,0.98)",
    edge: theme.edgeColor ?? "rgba(255,255,255,0.10)",
  };

  const card: React.CSSProperties = {
    background: T.cardBg,
    borderRadius: 22,
    border: `1px solid ${T.edge}`,
    boxShadow: "0 18px 32px rgba(0,0,0,.90)",
    padding: 12,
  };

  const goldNeon: React.CSSProperties = {
    color: T.gold,
    textTransform: "uppercase",
    letterSpacing: 0.9,
    fontWeight: 900,
    textShadow: `0 0 6px ${T.gold}CC, 0 0 14px ${T.gold}88`,
  };

  // --------- préparation des matchs filtrés ----------
  const x01Matches = React.useMemo(() => {
    const out: Array<{
      rec: SavedMatch;
      t: number;
      avg3: number;
      bestVisit: number;
      bestCheckout: number;
      result: "W" | "L" | "?";
      legs: number;
      darts: number;
      nb180: number;
      nb140: number;
      nb100: number;
      distance: number;
      inMode: string;
      outMode: string;
    }> = [];

    const seen = new Set<string>();

    for (const rec of records) {
      const kind = (rec.kind || "").toLowerCase();
      if (!kind.startsWith("x01")) continue;
      if ((rec as any).status && (rec as any).status !== "finished") continue;

      if (rec.id && seen.has(rec.id)) continue;
      if (rec.id) seen.add(rec.id);

      const players = Array.isArray((rec as any).players)
        ? (rec as any).players
        : [];
      if (!players.some((p: any) => p?.id === activePlayer.id)) continue;

      const tRaw = (rec as any).updatedAt ?? (rec as any).createdAt ?? 0;
      const t = tRaw || now;
      if (!inRange(t, range, now)) continue;

      const stats = extractX01PlayerStats(rec, activePlayer.id);

      const result: "W" | "L" | "?" =
        (rec as any).winnerId === activePlayer.id
          ? "W"
          : (rec as any).winnerId &&
            (rec as any).winnerId !== activePlayer.id
          ? "L"
          : "?";

      const cfg: any =
        (rec as any).config ??
        (rec as any).payload?.config ??
        (rec as any).engineState?.config ??
        {};

      const distance =
        Nloc(cfg.startScore ?? cfg.distance ?? cfg.x01Start ?? 501) || 501;
      const inMode = (cfg.inMode ?? cfg.in ?? "simple") as string;
      const outMode = (cfg.outMode ?? cfg.out ?? "double") as string;

      out.push({
        rec,
        t,
        avg3: stats.avg3 || 0,
        bestVisit: stats.bestVisit || 0,
        bestCheckout: stats.bestCheckout || 0,
        result,
        legs: stats.legs || 0,
        darts: stats.darts || 0,
        nb180: stats.nb180 || 0,
        nb140: stats.nb140 || 0,
        nb100: stats.nb100 || 0,
        distance,
        inMode,
        outMode,
      });
    }

    out.sort((a, b) => a.t - b.t);
    return out;
  }, [records, activePlayer.id, range, now]);

  const matchCount = x01Matches.length;
  const wins = x01Matches.filter((m) => m.result === "W").length;
  const losses = x01Matches.filter((m) => m.result === "L").length;
  const winRate = matchCount ? (wins / matchCount) * 100 : 0;

  const avg3Period =
    matchCount > 0
      ? x01Matches.reduce((s, m) => s + (m.avg3 || 0), 0) / matchCount
      : 0;

  const bestVisitPeriod =
    matchCount > 0
      ? Math.max(...x01Matches.map((m) => m.bestVisit || 0))
      : 0;

  const bestCheckoutPeriod =
    matchCount > 0
      ? Math.max(...x01Matches.map((m) => m.bestCheckout || 0))
      : 0;

  const totalLegs = x01Matches.reduce((s, m) => s + (m.legs || 0), 0);
  const totalDarts = x01Matches.reduce((s, m) => s + (m.darts || 0), 0);
  const total180 = x01Matches.reduce((s, m) => s + (m.nb180 || 0), 0);
  const total140 = x01Matches.reduce((s, m) => s + (m.nb140 || 0), 0);
  const total100 = x01Matches.reduce((s, m) => s + (m.nb100 || 0), 0);

  // progression
  const sparkPoints = x01Matches.map((m) => ({
    x: m.t,
    y: m.avg3 || 0,
  }));

  // ---- stats par paramètres (distance / in / out) ----
  type Bucket = {
    matches: number;
    wins: number;
    avg3Sum: number;
    bestVisit: number;
    bestCheckout: number;
  };

  const byParams = new Map<string, Bucket>();

  for (const m of x01Matches) {
    const key = `${m.distance}-${m.inMode}-${m.outMode}`;
    let b = byParams.get(key);
    if (!b) {
      b = {
        matches: 0,
        wins: 0,
        avg3Sum: 0,
        bestVisit: 0,
        bestCheckout: 0,
      };
      byParams.set(key, b);
    }
    b.matches++;
    if (m.result === "W") b.wins++;
    b.avg3Sum += m.avg3 || 0;
    b.bestVisit = Math.max(b.bestVisit, m.bestVisit || 0);
    b.bestCheckout = Math.max(b.bestCheckout, m.bestCheckout || 0);
  }

  const paramsRows = Array.from(byParams.entries())
    .map(([key, b]) => {
      const [distance, inMode, outMode] = key.split("-");
      const avg3 = b.matches ? b.avg3Sum / b.matches : 0;
      const wr = b.matches ? (b.wins / b.matches) * 100 : 0;
      return {
        key,
        distance,
        inMode,
        outMode,
        matches: b.matches,
        wins: b.wins,
        avg3,
        winRate: wr,
        bestVisit: b.bestVisit,
        bestCheckout: b.bestCheckout,
      };
    })
    .sort((a, b) => b.avg3 - a.avg3);

  // =======================
  // KPIs STYLE TRAINING X01
  // =======================
  const kpiBox: React.CSSProperties = {
    borderRadius: 18,
    padding: 10,
    background: "linear-gradient(180deg,#18181A,#0F0F12)",
    border: "1px solid rgba(255,255,255,.16)",
    boxShadow: "0 10px 24px rgba(0,0,0,.55)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    minHeight: 70,
  };

  const kpiLabel: React.CSSProperties = {
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    color: T.text70,
  };

  const kpiValueMain: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 900,
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* HEADER + FILTRES TEMPORELS */}
      <div style={{ ...card, padding: 14 }}>
        <div
          style={{
            ...goldNeon,
            fontSize: 18,
            marginBottom: 10,
            textAlign: "center",
          }}
        >
          X01 multi
        </div>

        {/* Filtres J/S/M/A/All */}
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "center",
            gap: 6,
            flexWrap: "nowrap",
            transform: "scale(0.92)",
            transformOrigin: "center",
          }}
        >
          {(["day", "week", "month", "year", "all"] as TimeRange[]).map(
            (r) => (
              <GoldPill
                key={r}
                active={range === r}
                onClick={() => setRange(r)}
                style={{
                  padding: "4px 12px",
                  fontSize: 11,
                  minWidth: "unset",
                  whiteSpace: "nowrap",
                }}
              >
                {r === "day" && "Jour"}
                {r === "week" && "Semaine"}
                {r === "month" && "Mois"}
                {r === "year" && "Année"}
                {r === "all" && "All"}
              </GoldPill>
            )
          )}
        </div>
      </div>

      {/* KPIs PRINCIPAUX */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0,1fr))",
          gap: 10,
        }}
      >
        {/* Matchs X01 */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(246,194,86,.9)",
            boxShadow:
              "0 0 0 1px rgba(246,194,86,.35), 0 0 14px rgba(246,194,86,.7)",
          }}
        >
          <div style={kpiLabel}>Matchs X01 (période)</div>
          <div
            style={{
              ...kpiValueMain,
              color: T.gold,
            }}
          >
            {matchCount}
          </div>
          <div style={{ fontSize: 11, color: T.text70 }}>
            {wins} victoires / {losses} défaites
          </div>
        </div>

        {/* Winrate */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(124,255,154,.6)",
            boxShadow:
              "0 0 0 1px rgba(124,255,154,.16), 0 0 12px rgba(124,255,154,.55)",
          }}
        >
          <div style={kpiLabel}>Winrate (période)</div>
          <div
            style={{
              ...kpiValueMain,
              color: "#7CFF9A",
            }}
          >
            {winRate.toFixed(1)}%
          </div>
          <div style={{ fontSize: 11, color: T.text70 }}>
            Performance globale en X01
          </div>
        </div>

        {/* Moy.3D */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(255,184,222,.6)",
            boxShadow:
              "0 0 0 1px rgba(255,184,222,.16), 0 0 12px rgba(255,184,222,.55)",
          }}
        >
          <div style={kpiLabel}>Moy.3D (période)</div>
          <div
            style={{
              ...kpiValueMain,
              color: "#FFB8DE",
            }}
          >
            {avg3Period.toFixed(1)}
          </div>
        </div>

        {/* Records BV / CO */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(71,181,255,.6)",
            boxShadow:
              "0 0 0 1px rgba(71,181,255,.16), 0 0 12px rgba(71,181,255,.55)",
          }}
        >
          <div style={kpiLabel}>Records (période)</div>
          <div
            style={{
              ...kpiValueMain,
              color: "#47B5FF",
              fontSize: 16,
            }}
          >
            BV {bestVisitPeriod || 0} / CO {bestCheckoutPeriod || 0}
          </div>
        </div>

        {/* Volume de jeu */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(180,255,255,.6)",
            boxShadow:
              "0 0 0 1px rgba(180,255,255,.16), 0 0 12px rgba(180,255,255,.55)",
          }}
        >
          <div style={kpiLabel}>Volume de jeu</div>
          <div
            style={{
              ...kpiValueMain,
              color: "#B4FFFF",
              fontSize: 16,
            }}
          >
            {totalLegs} legs · {totalDarts} darts
          </div>
        </div>

        {/* 180 / 140+ / 100+ */}
        <div
          style={{
            ...kpiBox,
            borderColor: "rgba(255,140,120,.8)",
            boxShadow:
              "0 0 0 1px rgba(255,140,120,.26), 0 0 12px rgba(255,140,120,.7)",
          }}
        >
          <div style={kpiLabel}>Scores élevés</div>
          <div
            style={{
              ...kpiValueMain,
              color: "#FF8C78",
              fontSize: 16,
            }}
          >
            {total180}×180 · {total140}×140+ · {total100}×100+
          </div>
        </div>
      </div>

      {/* SPARKLINE PROGRESSION */}
      <div style={card}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 800,
            textTransform: "uppercase",
            color: T.gold,
            textShadow:
              "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
            letterSpacing: 0.8,
            marginBottom: 6,
          }}
        >
          Progression X01 (Moy.3D par match)
        </div>

        {sparkPoints.length ? (
          <SparklinePro points={sparkPoints} height={64} />
        ) : (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucun match X01 dans la période sélectionnée.
          </div>
        )}
      </div>

      {/* STATS PAR PARAMÈTRES */}
      {paramsRows.length > 0 && (
        <div style={card}>
          <div
            style={{
              fontSize: 13,
              fontWeight: 800,
              textTransform: "uppercase",
              color: T.gold,
              textShadow:
                "0 0 6px rgba(246,194,86,.9), 0 0 14px rgba(246,194,86,.45)",
              letterSpacing: 0.8,
              marginBottom: 6,
            }}
          >
            Stats par paramètres de match
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
              fontSize: 11,
              color: T.text70,
            }}
          >
            {paramsRows.map((p) => (
              <div
                key={p.key}
                style={{
                  padding: 8,
                  borderRadius: 12,
                  background: "rgba(0,0,0,.45)",
                  border: "1px solid rgba(255,255,255,.06)",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginBottom: 2,
                    color: T.text,
                  }}
                >
                  <span>
                    {p.distance} · IN {p.inMode.toUpperCase()} / OUT{" "}
                    {p.outMode.toUpperCase()}
                  </span>
                  <span>
                    {p.matches} M · {p.wins} V
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <span>
                    Moy.3D : <b>{p.avg3.toFixed(1)}</b>
                  </span>
                  <span>
                    Winrate : <b>{p.winRate.toFixed(1)}%</b>
                  </span>
                </div>
                <div>
                  BV {p.bestVisit || 0}
                  {p.bestCheckout ? ` · CO ${p.bestCheckout}` : ""}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* LISTE DÉTAILLÉE DES MATCHS */}
      <div style={card}>
        <div
          style={{
            ...goldNeon,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          Matchs X01 (détail)
        </div>

        {x01Matches.length === 0 ? (
          <div style={{ fontSize: 12, color: T.text70 }}>
            Aucun match X01 pour cette période.
          </div>
        ) : (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 6,
            }}
          >
            {x01Matches
              .slice()
              .reverse()
              .map((m) => (
                <div
                  key={m.rec.id}
                  style={{
                    padding: 8,
                    borderRadius: 12,
                    background: "rgba(0,0,0,.45)",
                    fontSize: 11,
                    color: T.text70,
                    display: "flex",
                    flexDirection: "column",
                    gap: 3,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <span>
                      {formatShortDate(
                        (m.rec as any).updatedAt ??
                          (m.rec as any).createdAt ??
                          Date.now()
                      )}
                    </span>
                    <span
                      style={{
                        fontWeight: 700,
                        color:
                          m.result === "W"
                            ? "#7CFF9A"
                            : m.result === "L"
                            ? "#FF8A8A"
                            : T.gold,
                      }}
                    >
                      {m.avg3.toFixed(1)} Moy.3D ·{" "}
                      {m.result === "W"
                        ? "Victoire"
                        : m.result === "L"
                        ? "Défaite"
                        : "—"}
                    </span>
                  </div>
                  <div>
                    {m.distance} · IN {m.inMode.toUpperCase()} / OUT{" "}
                    {m.outMode.toUpperCase()}
                  </div>
                  <div>
                    BV {m.bestVisit || 0}
                    {m.bestCheckout ? ` · CO ${m.bestCheckout}` : ""}
                  </div>
                  <div>
                    Legs {m.legs || 0} · Darts {m.darts || 0} · {m.nb180}×180 /{" "}
                    {m.nb140}×140+ / {m.nb100}×100+
                  </div>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsX01MultiDashboard;
