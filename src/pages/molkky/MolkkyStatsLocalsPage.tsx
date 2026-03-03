// @ts-nocheck
// ============================================
// src/pages/molkky/MolkkyStatsLocalsPage.tsx
// ✅ Rendu identique au dashboard Stats (darts) MAIS:
// - Carousel ne contient QUE les profils locaux (dc_profiles_v1)
// - Le profil ACTIF (dc_active_profile_id_v1) est EXCLU de cette liste
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";

import { loadMolkkyMatches } from "../../lib/molkkyStore";
import { aggregatePlayers, safeNum, formatDuration } from "../../lib/molkkyStats";

import type { Profile } from "../../lib/types";

type Props = { go?: any };

export default function MolkkyStatsLocalsPage({ go }: Props) {
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

  const allProfiles: Profile[] = useMemo(() => {
    try {
      const raw = localStorage.getItem("dc_profiles_v1");
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  const activeProfileId = useMemo(() => {
    try {
      return localStorage.getItem("dc_active_profile_id_v1") || "";
    } catch {
      return "";
    }
  }, []);

  const profiles = useMemo(() => {
    // ✅ IMPORTANT: le profil actif ne doit PAS être affiché ici
    return (allProfiles || []).filter((p) => (p?.id || "") !== activeProfileId);
  }, [allProfiles, activeProfileId]);

  const matches = useMemo(() => {
    try {
      return loadMolkkyMatches();
    } catch {
      return [];
    }
  }, []);

  const playerAgg = useMemo(() => aggregatePlayers(matches), [matches]);

  const [idx, setIdx] = useState(0);
  useEffect(() => {
    if (idx >= profiles.length) setIdx(0);
  }, [profiles.length]);

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
        <div style={title}>{tr("molkky.locals","molkky.locals") || "MÖLKKY — PROFILS LOCAUX"}</div>
        <InfoDot
          onClick={() =>
            alert(
              "Profils locaux (Mölkky)\n\n- Carousel uniquement sur les profils locaux\n- Profil actif exclu de la liste"
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

        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{tr("stats.more","stats.more") || "Détails"}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            {tr("stats.avgDuration","Durée moyenne") + ": "}
            {formatDuration(stats.avgDurationMs)} • {tr("stats.avgTurns","Tours moyens") + ": "}
            {stats.avgTurns.toFixed?.(1) || stats.avgTurns}
          </div>
        </div>

        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 900, marginBottom: 6 }}>{tr("stats.note","stats.note") || "Note"}</div>
          <div style={{ fontSize: 11, opacity: 0.75 }}>
            {tr("stats.localsHint","stats.localsHint") ||
              "Ici, seuls les profils locaux (hors profil actif) sont listés. Le rendu doit matcher le dashboard darts."}
          </div>
        </div>
      </div>
    </div>
  );
}
