// @ts-nocheck
// ============================================
// src/pages/molkky/MolkkyStatsPlayersPage.tsx
// ✅ Objectif: rendu VISUEL identique au dashboard Stats (darts)
// - Carousel profil (prev/next) en haut
// - Cards / layout copiés du pattern StatsHub
// - Données: agrégées depuis lib/molkkyStats (fallback 0 si vide)
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";

import { useStore } from "../../contexts/StoreContext";

import { loadMolkkyMatches } from "../../lib/molkkyStore";
import { aggregatePlayers, safeNum, formatDuration } from "../../lib/molkkyStats";

import type { Profile } from "../../lib/types";

type Props = { go?: any };

export default function MolkkyStatsPlayersPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  // i18n helper: if t() returns the key (missing translation), use fallback.
  const tr = React.useCallback(
    (key: string, fallback: string) => {
      const v = (t as any)?.(key, fallback) ?? fallback;
      return v === key ? fallback : v;
    },
    [t]
  );

  // ✅ Source of truth: global Store (persisted in IndexedDB via lib/storage)
  const { store } = useStore();

  const allProfiles: Profile[] = useMemo(() => {
    const arr = (store as any)?.profiles;
    return Array.isArray(arr) ? arr : [];
  }, [store]);

  const activeProfileId = (store as any)?.activeProfileId || "";

  const matches = useMemo(() => {
    try {
      return loadMolkkyMatches();
    } catch {
      return [];
    }
  }, []);

  const playerAgg = useMemo(() => aggregatePlayers(matches), [matches]);

  const profiles = useMemo(() => {
    // Dashboard "profil actif" : on laisse TOUS les profils locaux dans le carousel
    // (comme le dashboard darts), mais l'index démarre sur l'actif.
    return allProfiles;
  }, [allProfiles]);

  const initialIndex = useMemo(() => {
    const idx = profiles.findIndex((p) => p?.id === activeProfileId);
    return idx >= 0 ? idx : 0;
  }, [profiles, activeProfileId]);

  const [idx, setIdx] = useState(initialIndex);
  useEffect(() => setIdx(initialIndex), [initialIndex]);

  const selected = profiles[idx] || profiles[0] || null;

  const stats = useMemo(() => {
    const name = selected?.name || "";
    const row = playerAgg?.find((p) => (p?.name || "") === name) || null;
    return {
      matches: safeNum(row?.matches),
      wins: safeNum(row?.wins),
      winrate: safeNum(row?.winrate) * 100,
      avgPts: safeNum(row?.avgPtsPerThrow),
      bestPts: safeNum(row?.bestPtsPerThrow),
      avgTurns: safeNum(row?.avgTurns),
      bestTurns: safeNum(row?.bestTurns),
      avgDurationMs: safeNum(row?.avgDurationMs),
      bestDurationMs: safeNum(row?.bestDurationMs),
    };
  }, [selected, playerAgg]);

  const canPrev = idx > 0;
  const canNext = idx < profiles.length - 1;

  const accent = theme?.accent || "#b7ff00";
  const border = "rgba(183,255,0,0.35)";

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background:
      "radial-gradient(1200px 700px at 50% 0%, rgba(183,255,0,0.10), rgba(0,0,0,0) 60%), #050607",
    color: "#fff",
    padding: "14px 12px 90px",
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  };

  const title: React.CSSProperties = {
    fontWeight: 900,
    letterSpacing: 1,
    fontSize: 12,
    opacity: 0.9,
    textTransform: "uppercase",
  };

  const pill: React.CSSProperties = {
    margin: "10px auto 14px",
    width: "100%",
    maxWidth: 520,
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: "rgba(0,0,0,0.30)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    boxShadow: "0 10px 24px rgba(0,0,0,0.35)",
  };

  const pillLabel: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.8,
    color: "rgba(255,255,255,0.92)",
    textTransform: "uppercase",
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${border}`,
    background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.55))",
    boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
    overflow: "hidden",
  };

  const playerCard: React.CSSProperties = {
    ...card,
    padding: 14,
    display: "grid",
    gridTemplateColumns: "38px 1fr 38px",
    alignItems: "center",
    gap: 10,
    maxWidth: 520,
    margin: "0 auto 14px",
  };

  const arrowBtn = (enabled: boolean): React.CSSProperties => ({
    width: 34,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${border}`,
    background: enabled ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.15)",
    color: enabled ? accent : "rgba(255,255,255,0.25)",
    display: "grid",
    placeItems: "center",
    cursor: enabled ? "pointer" : "default",
    boxShadow: enabled ? `0 0 18px rgba(183,255,0,0.12)` : "none",
    userSelect: "none",
    fontSize: 18,
    fontWeight: 900,
  });

  const centerBlock: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    minHeight: 76,
  };

  const nameStyle: React.CSSProperties = {
    fontWeight: 900,
    fontSize: 14,
    letterSpacing: 0.5,
    textAlign: "center",
    color: "rgba(255,255,255,0.92)",
  };

  const smallMuted: React.CSSProperties = {
    fontSize: 11,
    opacity: 0.72,
    textAlign: "center",
    marginTop: 2,
  };

  const grid: React.CSSProperties = {
    maxWidth: 520,
    margin: "0 auto",
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: 12,
  };

  const statCard: React.CSSProperties = {
    ...card,
    padding: 14,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  };

  // ⚠️ Compat alias: certains patchs/branches utilisaient `StatCard` (UpperCamelCase)
  // comme style object. On garde les deux pour éviter un ReferenceError.
  const StatCard = statCard;

  const statLeft: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 2 };
  const statLabel: React.CSSProperties = { fontSize: 11, opacity: 0.8, fontWeight: 700 };
  const statValue: React.CSSProperties = { fontSize: 22, fontWeight: 900, letterSpacing: 0.2 };

  const badge: React.CSSProperties = {
    width: 28,
    height: 28,
    borderRadius: 10,
    border: `1px solid ${border}`,
    display: "grid",
    placeItems: "center",
    background: "rgba(0,0,0,0.25)",
    color: accent,
    fontWeight: 900,
  };

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => (go ? go("molkky_stats") : window.history.back())} />
        <div style={title}>{t("stats.center","CENTRE DE STATISTIQUES")}</div>
        <InfoDot
          onClick={() =>
            alert(
              "Stats Mölkky — Dashboard (style darts)\n\n- Carousel pour naviguer entre les profils\n- Les données sont calculées via l'historique local"
            )
          }
        />
      </div>

      <div style={pill}>
        <div style={pillLabel}>{t("stats.dashboard","DASHBOARD GLOBAL")}</div>
      </div>

      <div style={playerCard}>
        <button
          style={arrowBtn(canPrev)}
          onClick={() => {
            if (!canPrev) return;
            setIdx((v) => Math.max(0, v - 1));
          }}
          aria-label="prev"
        >
          ‹
        </button>

        <div style={centerBlock}>
          {selected ? (
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ position: "relative", width: 58, height: 58 }}>
                <ProfileStarRing profile={selected} size={58} />
                <div style={{ position: "absolute", inset: 4, borderRadius: 999, overflow: "hidden" }}>
                  <ProfileAvatar profile={selected} size={50} />
                </div>
              </div>
              <div style={{ minWidth: 140 }}>
                <div style={nameStyle}>{selected?.name || "—"}</div>
                <div style={smallMuted}>
                  {tr("stats.matches","Matchs") + ": "}
                  {stats.matches} • {tr("stats.winrate","Winrate") + ": "}
                  {stats.winrate.toFixed?.(0) || 0}%
                </div>
              </div>
            </div>
          ) : (
            <div style={{ opacity: 0.65, textAlign: "center" }}>{tr("profiles.none","profiles.none") || "Aucun profil."}</div>
          )}
        </div>

        <button
          style={arrowBtn(canNext)}
          onClick={() => {
            if (!canNext) return;
            setIdx((v) => Math.min(profiles.length - 1, v + 1));
          }}
          aria-label="next"
        >
          ›
        </button>
      </div>

      <div style={grid}>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 900, fontSize: 15, marginBottom: 6 }}>{tr("stats.stats","stats.stats") || "Statistiques"}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.desc","stats.desc") || "Analyse des performances — Mölkky."}</div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, marginTop: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.favoriteMode","stats.favoriteMode") || "Mode de jeu préféré"}</div>
              <div
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${border}`,
                  background: "rgba(0,0,0,0.25)",
                  fontWeight: 900,
                  fontSize: 11,
                  color: accent,
                  minWidth: 120,
                  textAlign: "center",
                }}
              >
                {tr("molkky.classic","molkky.classic") || "MÖLKKY"}
              </div>
            </div>
          </div>
        </div>

        <div style={statCard}>
          <div style={statLeft}>
            <div style={statLabel}>{tr("stats.avgPts","stats.avgPts") || "Moyenne (pts / lancer)"}</div>
            <div style={statValue}>{stats.avgPts.toFixed?.(1) || stats.avgPts} pts</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.avgLabel","stats.avgLabel") || "Visites moyennes"}</div>
          </div>
          <div style={badge}>⌀</div>
        </div>

        <div style={statCard}>
          <div style={statLeft}>
            <div style={statLabel}>{tr("stats.best","stats.best") || "Meilleure visite"}</div>
            <div style={statValue}>{stats.bestPts.toFixed?.(0) || stats.bestPts} pts</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.record","stats.record") || "Record personnel"}</div>
          </div>
          <div style={badge}>★</div>
        </div>

        <div style={statCard}>
          <div style={statLeft}>
            <div style={statLabel}>{tr("stats.winrate","stats.winrate") || "Taux de victoire"}</div>
            <div style={statValue}>{stats.winrate.toFixed?.(0) || stats.winrate} %</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.total","stats.total") || "Tous matchs"}</div>
          </div>
          <div style={badge}>%</div>
        </div>

        <div style={{ ...card, padding: 14 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 900 }}>{tr("stats.evolution","stats.evolution") || "Évolution"}</div>
            <div style={{ fontSize: 11, opacity: 0.75 }}>{tr("stats.perGame","stats.perGame") || "Moyenne par partie"}</div>
          </div>
          <div
            style={{
              marginTop: 10,
              height: 140,
              borderRadius: 14,
              border: `1px solid ${border}`,
              background: "linear-gradient(180deg, rgba(183,255,0,0.10), rgba(0,0,0,0.15))",
              display: "grid",
              placeItems: "center",
              color: "rgba(255,255,255,0.45)",
              fontWeight: 800,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              fontSize: 11,
            }}
          >
            {tr("stats.chartSoon","stats.chartSoon") || "Graphique"}
          </div>
          <div style={{ marginTop: 10, fontSize: 11, opacity: 0.75 }}>
            {tr("stats.avgDuration","Durée moyenne") + ": "}
            {formatDuration(stats.avgDurationMs)} • {tr("stats.avgTurns","Tours moyens") + ": "}
            {stats.avgTurns.toFixed?.(1) || stats.avgTurns}
          </div>
        </div>
      </div>
    </div>
  );
}
