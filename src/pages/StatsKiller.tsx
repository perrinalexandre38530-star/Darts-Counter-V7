// @ts-nocheck
// ============================================
// src/pages/StatsKiller.tsx
// Onglet KILLER dans le "Centre de statistiques" (StatsHub)
// - Robuste: lit memHistory (agrégé App.tsx) et filtre kind === "killer"
// - Support: scope "active" (playerId forcé) ou "locals" (playerId optionnel)
// - ✅ NEW: branche statsKiller.ts (Option A) : kills, hitsBySegment/Number, fav segment/number, total hits
// ============================================

import React from "react";
import type { Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { computeKillerStatsAggForProfile } from "../lib/statsKiller";

type Props = {
  profiles: Profile[];
  memHistory: any[]; // records déjà "withAvatars"
  playerId?: string | null; // si défini, filtre par joueur
  title?: string; // optionnel
};

function pct(n: number) {
  if (!Number.isFinite(n)) return "0";
  return String(Math.round(n));
}

function num(n: any, fb = 0) {
  const x = Number(n);
  return Number.isFinite(x) ? x : fb;
}

function safeStr(v: any) {
  if (v === undefined || v === null) return "";
  return String(v);
}

function bestKeyFromMap(map: any): { key: string; value: number } {
  if (!map || typeof map !== "object") return { key: "", value: 0 };
  let bestK = "";
  let bestV = 0;
  for (const [k0, v0] of Object.entries(map)) {
    const v = num(v0, 0);
    if (v > bestV) {
      bestV = v;
      bestK = safeStr(k0);
    }
  }
  return { key: bestK, value: bestV };
}

function parseSegmentKeyToNumber(segKey: string): number {
  const k = safeStr(segKey).toUpperCase();
  if (k === "SB" || k === "BULL") return 25;
  if (k === "DB" || k === "DBULL") return 25;
  const m = k.match(/^([SDT])(\d{1,2})$/);
  if (m) {
    const n = Number(m[2]);
    if (n >= 1 && n <= 20) return n;
  }
  return 0;
}

function aggregateHitsByNumberFromSegments(hitsBySegment: any) {
  const out: Record<string, number> = {};
  if (!hitsBySegment || typeof hitsBySegment !== "object") return out;
  for (const [seg0, c0] of Object.entries(hitsBySegment)) {
    const seg = safeStr(seg0).toUpperCase();
    const c = num(c0, 0);
    if (c <= 0) continue;
    const n = parseSegmentKeyToNumber(seg);
    if (n > 0) out[String(n)] = (out[String(n)] || 0) + c;
  }
  return out;
}

export default function StatsKiller({ profiles, memHistory, playerId = null, title = "KILLER" }: Props) {
  const { theme } = useTheme();

  const data = React.useMemo(() => {
    const list = Array.isArray(memHistory) ? memHistory : [];
    const killer = list.filter((r) => (r?.kind || r?.payload?.kind) === "killer");

    const filtered = playerId
      ? killer.filter((r) => (r?.players || r?.payload?.players || []).some((p: any) => p?.id === playerId))
      : killer;

    // KPI basiques (matches / wins / lastAt)
    let played = 0;
    let wins = 0;
    let lastAt = 0;

    const items = filtered
      .slice()
      .sort((a: any, b: any) => Number(b?.updatedAt ?? b?.createdAt ?? 0) - Number(a?.updatedAt ?? a?.createdAt ?? 0))
      .map((r: any) => {
        const when = Number(r?.updatedAt ?? r?.createdAt ?? 0);
        if (when > lastAt) lastAt = when;

        played += 1;
        const w = r?.winnerId ?? r?.payload?.winnerId ?? null;
        if (playerId && w && w === playerId) wins += 1;

        const players = (r?.players || r?.payload?.players || []) as any[];
        const names = players.map((p) => p?.name).filter(Boolean).join(" · ");

        const winnerName = w
          ? profiles.find((p) => p.id === w)?.name ?? players.find((p) => p?.id === w)?.name ?? "—"
          : "—";

        return { id: r?.id || `${when}-${Math.random()}`, when, names, winnerName };
      });

    const winRate = playerId && played > 0 ? (wins / played) * 100 : 0;

    // ✅ Stats enrichies via statsKiller.ts (Option A)
    // - on calcule SEULEMENT si playerId est fourni (Stats joueur actif)
    let agg: any = null;
    if (playerId) {
      try {
        agg = computeKillerStatsAggForProfile(filtered, playerId);
      } catch {
        agg = null;
      }
    }

    // Fallbacks / dérivés
    const hitsBySegment = agg?.hitsBySegment || agg?.hitsBySegmentAgg || agg?.hits_by_segment || null;
    const hitsByNumber =
      agg?.hitsByNumber ||
      agg?.hitsByNumberAgg ||
      agg?.hits_by_number ||
      (hitsBySegment ? aggregateHitsByNumberFromSegments(hitsBySegment) : null);

    const bestSeg = bestKeyFromMap(hitsBySegment);
    const bestNum = bestKeyFromMap(hitsByNumber);

    const totalHits =
      num(agg?.totalHits, 0) ||
      (hitsBySegment
        ? Object.values(hitsBySegment).reduce((s: number, v: any) => s + num(v, 0), 0)
        : 0);

    const kills = num(agg?.kills, 0) || num(agg?.totalKills, 0);

    return {
      played,
      wins,
      winRate,
      lastAt,
      items: items.slice(0, 20),

      agg,
      kills,
      totalHits,
      favSegment: bestSeg.key || "",
      favSegmentHits: bestSeg.value || 0,
      favNumber: bestNum.key ? Number(bestNum.key) : 0,
      favNumberHits: bestNum.value || 0,
    };
  }, [memHistory, playerId, profiles]);

  const lastStr = data.lastAt ? new Date(data.lastAt).toLocaleString() : "—";
  const favNumberLabel = data.favNumber ? (data.favNumber === 25 ? "BULL" : `#${data.favNumber}`) : "—";
  const favSegLabel = data.favSegment ? data.favSegment : "—";

  return (
    <div style={{ padding: 12 }}>
      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: theme.primary,
          textShadow: `0 0 12px ${theme.primary}66`,
          marginBottom: 10,
        }}
      >
        {title}
      </div>

      {/* KPIs */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <Kpi label="Matchs" value={`${data.played}`} theme={theme} />
        <Kpi label={playerId ? "Victoires" : "Dernier match"} value={playerId ? `${data.wins}` : lastStr} theme={theme} />

        {playerId && (
          <>
            <Kpi label="Win %" value={`${pct(data.winRate)}`} theme={theme} />
            <Kpi label="Kills" value={`${data.kills || 0}`} theme={theme} />
            <Kpi label="Auto-kills" value={`${Math.round(num(data.agg?.autoKillsTotal, 0))}`} theme={theme} />
            <Kpi label="Hits total" value={`${data.totalHits || 0}`} theme={theme} />
            <Kpi label="Dernier match" value={lastStr} theme={theme} />
          </>
        )}
      </div>

      {/* Favoris (uniquement joueur actif) */}
      {playerId && (
        <div
          style={{
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            overflow: "hidden",
            boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              padding: "10px 12px",
              borderBottom: `1px solid ${theme.borderSoft}`,
              color: theme.textSoft,
              fontSize: 12,
            }}
          >
            Favoris (Option A)
          </div>

          <div style={{ padding: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiSmall label="Segment favori" value={`${favSegLabel}`} sub={`${data.favSegmentHits || 0} hits`} theme={theme} />
            <KpiSmall label="Numéro favori" value={`${favNumberLabel}`} sub={`${data.favNumberHits || 0} hits`} theme={theme} />
          </div>
        </div>
      )}

      {/* Historique */}
      <div
        style={{
          borderRadius: 14,
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          overflow: "hidden",
          boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
        }}
      >
        <div style={{ padding: "10px 12px", borderBottom: `1px solid ${theme.borderSoft}`, color: theme.textSoft, fontSize: 12 }}>
          Historique KILLER (20 derniers)
        </div>

        {data.items.length === 0 ? (
          <div style={{ padding: 12, color: theme.textSoft, fontSize: 12 }}>Aucun match KILLER trouvé.</div>
        ) : (
          data.items.map((it: any) => (
            <div
              key={it.id}
              style={{
                padding: "10px 12px",
                borderBottom: `1px solid ${theme.borderSoft}`,
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              <div style={{ fontSize: 12.5, fontWeight: 800, color: theme.text }}>{new Date(it.when).toLocaleString()}</div>
              <div style={{ fontSize: 12, color: theme.textSoft }}>{it.names || "—"}</div>
              <div style={{ fontSize: 12, color: theme.primary }}>Vainqueur : {it.winnerName}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: theme.card,
        padding: "10px 12px",
        boxShadow: `0 12px 24px rgba(0,0,0,.45), 0 0 12px ${theme.primary}18`,
        minHeight: 64,
      }}
    >
      <div style={{ fontSize: 11, color: theme.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </div>
      <div style={{ fontSize: 16, fontWeight: 900, color: theme.text }}>{value}</div>
    </div>
  );
}

function KpiSmall({ label, value, sub, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,0.20)",
        padding: "10px 12px",
        boxShadow: `0 10px 18px rgba(0,0,0,.35)`,
        minHeight: 62,
      }}
    >
      <div style={{ fontSize: 10.5, color: theme.textSoft, marginBottom: 6, textTransform: "uppercase", letterSpacing: 0.7 }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 900, color: theme.text }}>{value}</div>
      <div style={{ marginTop: 3, fontSize: 10.5, color: theme.primary, fontWeight: 800 }}>{sub}</div>
    </div>
  );
}
