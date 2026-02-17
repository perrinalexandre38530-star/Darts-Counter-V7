// src/pages/batard/BatardPlay.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useFullscreenPlay } from "../../hooks/useFullscreenPlay";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import Section from "../../components/Section";
import Keypad from "../../components/Keypad";
import { useLang } from "../../contexts/LangContext";
import { useTheme } from "../../contexts/ThemeContext";
import tickerBatard from "../../assets/tickers/ticker_bastard.png";

import type { Dart as UIDart } from "../../lib/types";
import type { BatardConfig as BatardRulesConfig, BatardRound } from "../../lib/batard/batardTypes";
import { computeBatardReplaySnapshot, useBatardEngine } from "../../hooks/useBatardEngine";
import type { BatardConfigPayload } from "./BatardConfig";

import { History } from "../../lib/history";
import { PRO_BOTS } from "../../lib/botsPro";
import { getProBotAvatar } from "../../lib/botsProAvatars";

const INFO_TEXT = `BÂTARD — basé sur BatardConfig
- Chaque round impose une contrainte (cible / bull / multiplicateur)
- scoreOnlyValid: si activé => tu scores uniquement les flèches valides
- minValidHitsToAdvance: nb minimum de hits valides pour avancer
- failPolicy: malus / recul rounds / freeze
`;

// ---------------- Constantes visuelles (align X01PlayV3) ----------------
const CONTENT_MAX = 520;

const miniCard: React.CSSProperties = {
  width: "clamp(150px, 42vw, 190px)",
  maxWidth: "100%",
  padding: 6,
  borderRadius: 12,
  overflow: "hidden",
  background: "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
  border: "1px solid rgba(255,255,255,.10)",
  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
};

const miniText: React.CSSProperties = {
  fontSize: 12,
  color: "#d9dbe3",
  lineHeight: 1.25,
};

const miniRankRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(0,1fr) max-content",
  gap: 8,
  alignItems: "center",
  padding: "3px 6px",
  borderRadius: 6,
  background: "rgba(255,255,255,.04)",
  marginBottom: 3,
  fontSize: 11,
  lineHeight: 1.15,
  minWidth: 0,
  overflow: "hidden",
};

const miniRankName: React.CSSProperties = {
  fontWeight: 700,
  color: "#ffcf57",
  minWidth: 0,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};

const miniRankScore: React.CSSProperties = {
  fontWeight: 800,
  color: "#ffcf57",
  whiteSpace: "nowrap",
};

// -------------------------------------------------------------
// Helpers
// -------------------------------------------------------------
function roundLabel(round: BatardRound | null, idx: number) {
  if (!round) return `Round #${idx + 1}`;

  if (round.type === "TARGET_BULL") {
    return `Round #${idx + 1} — BULL (${round.multiplierRule || "ANY"})`;
  }

  if (round.type === "ANY_SCORE") {
    const m = round.multiplierRule || "ANY";
    return `Round #${idx + 1} — SCORE LIBRE (${m})`;
  }

  const t = typeof (round as any).target === "number" ? (round as any).target : "?";
  const m = round.multiplierRule || "ANY";
  return `Round #${idx + 1} — ${m} ${t}`;
}

function makeMatchId(prefix: string) {
  const ts = Date.now();
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 8)}`;
}

function fmt(d?: UIDart) {
  if (!d) return "—";
  if (d.v === 0) return "MISS";
  if (d.v === 25) return d.mult === 2 ? "DBULL" : "BULL";
  const prefix = d.mult === 3 ? "T" : d.mult === 2 ? "D" : "S";
  return `${prefix}${d.v}`;
}

function chipStyle(d?: UIDart, red = false): React.CSSProperties {
  if (!d)
    return {
      background: "rgba(255,255,255,.06)",
      color: "#bbb",
      border: "1px solid rgba(255,255,255,.08)",
    };

  if (red)
    return {
      background: "rgba(200,30,30,.18)",
      color: "#ff8a8a",
      border: "1px solid rgba(255,80,80,.35)",
    };

  if (d.v === 25 && d.mult === 2)
    return {
      background: "rgba(13,160,98,.18)",
      color: "#8ee6bf",
      border: "1px solid rgba(13,160,98,.35)",
    };

  if (d.v === 25)
    return {
      background: "rgba(13,160,98,.12)",
      color: "#7bd6b0",
      border: "1px solid rgba(13,160,98,.3)",
    };

  if (d.mult === 3)
    return {
      background: "rgba(179,68,151,.18)",
      color: "#ffd0ff",
      border: "1px solid rgba(179,68,151,.35)",
    };

  if (d.mult === 2)
    return {
      background: "rgba(46,150,193,.18)",
      color: "#cfeaff",
      border: "1px solid rgba(46,150,193,.35)",
    };

  return {
    background: "rgba(255,187,51,.12)",
    color: "#ffc63a",
    border: "1px solid rgba(255,187,51,.4)",
  };
}

function dartValue(d: UIDart) {
  if (d.v === 25 && d.mult === 2) return 50;
  return d.v * d.mult;
}

function sumThrow(throwDarts: UIDart[] | undefined | null): number {
  if (!throwDarts || !Array.isArray(throwDarts)) return 0;
  return throwDarts.reduce((s, d) => s + dartValue(d), 0);
}

type LightPlayer = { id: string; name?: string; avatarDataUrl?: string | null; dartSetId?: string | null };

// -------------------------------------------------------------
// PlayersModal — liste flottante X01-like (ordre de jeu)
// -------------------------------------------------------------
function PlayersModal(props: {
  open: boolean;
  onClose: () => void;
  title: string;
  rows: Array<{
    id: string;
    name: string;
    avatar: string | null;
    score: number;
    hits: number;
    turns: number;
    fails: number;
    advances: number;
    lastVisit?: UIDart[] | null;
    isActive?: boolean;
  }>;
}) {
  const { open, onClose, title, rows } = props;
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.62)",
        backdropFilter: "blur(6px)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          maxHeight: "min(78vh, 680px)",
          overflow: "hidden",
          borderRadius: 16,
          background: "linear-gradient(180deg, rgba(22,22,26,.98), rgba(10,10,12,.98))",
          border: "1px solid rgba(255,255,255,.10)",
          boxShadow: "0 18px 60px rgba(0,0,0,.55)",
        }}
      >
        <div
          style={{
            padding: "10px 12px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            borderBottom: "1px solid rgba(255,255,255,.08)",
          }}
        >
          <div style={{ fontWeight: 900, color: "#ffcf57" }}>{title}</div>
          <button
            className="btn"
            onClick={onClose}
            style={{
              padding: "6px 10px",
              borderRadius: 10,
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.10)",
              color: "#d9dbe3",
            }}
          >
            OK
          </button>
        </div>

        <div style={{ padding: 10, overflow: "auto", maxHeight: "calc(min(78vh, 680px) - 54px)" }}>
          {rows.map((r, idx) => (
            <div
              key={r.id}
              style={{
                padding: 10,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.10)",
                background: r.isActive ? "rgba(255,195,26,.10)" : "rgba(255,255,255,.03)",
                boxShadow: r.isActive ? "0 0 0 1px rgba(255,195,26,.22), 0 10px 30px rgba(0,0,0,.25)" : "none",
                marginBottom: 8,
              }}
            >
              <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 10, alignItems: "center" }}>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: "50%",
                    overflow: "hidden",
                    background: "linear-gradient(180deg,#1b1b1f,#111114)",
                    border: "1px solid rgba(255,255,255,.10)",
                  }}
                >
                  {r.avatar ? (
                    <img src={r.avatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "#999",
                        fontWeight: 800,
                      }}
                    >
                      ?
                    </div>
                  )}
                </div>

                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 900,
                        color: "#ffcf57",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {idx + 1}. {r.name}
                    </div>
                    {r.isActive ? (
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 900,
                          padding: "2px 8px",
                          borderRadius: 999,
                          background: "rgba(255,195,26,.18)",
                          border: "1px solid rgba(255,195,26,.28)",
                          color: "#ffcf57",
                          whiteSpace: "nowrap",
                        }}
                      >
                        ACTIF
                      </span>
                    ) : null}
                  </div>

                  <div
                    style={{
                      marginTop: 6,
                      display: "flex",
                      gap: 8,
                      flexWrap: "wrap",
                      fontSize: 12,
                      opacity: 0.95,
                      color: "#d9dbe3",
                    }}
                  >
                    <span>
                      Score: <b style={{ color: "#ffcf57" }}>{r.score}</b>
                    </span>
                    <span>
                      Hits: <b>{r.hits}</b>
                    </span>
                    <span>
                      Tours: <b>{r.turns}</b>
                    </span>
                    <span>
                      Fails: <b>{r.fails}</b>
                    </span>
                    <span>
                      Adv: <b>{r.advances}</b>
                    </span>
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 900, fontSize: 20, color: "#ffcf57", lineHeight: 1 }}>{r.score}</div>
                </div>
              </div>

              {Array.isArray(r.lastVisit) && r.lastVisit.length ? (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[0, 1, 2].map((i) => {
                    const d = r.lastVisit?.[i];
                    const st = chipStyle(d, false);
                    return (
                      <span
                        key={i}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          minWidth: 44,
                          height: 28,
                          padding: "0 10px",
                          borderRadius: 10,
                          border: st.border as string,
                          background: st.background as string,
                          color: st.color as string,
                          fontWeight: 900,
                          fontSize: 13,
                        }}
                      >
                        {fmt(d)}
                      </span>
                    );
                  })}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// GameInfoModal — ✅ CENTRÉ verticalement/horizontalement
// -------------------------------------------------------------
function GameInfoModal({
  open,
  onClose,
  info,
}: {
  open: boolean;
  onClose: () => void;
  info: {
    winMode: string;
    failPolicy: string;
    failValue: number;
    scoreOnlyValid: boolean;
    minValidHitsToAdvance: number;
    presetLabel?: string;
  };
}) {
  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "rgba(0,0,0,.55)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center", // ✅ center Y
        justifyContent: "center", // ✅ center X
        padding: 14,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(520px, 96vw)",
          maxHeight: "min(78vh, 680px)",
          overflow: "auto",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,.10)",
          background: "linear-gradient(180deg, rgba(18,18,22,.98), rgba(10,10,12,.98))",
          boxShadow: "0 18px 38px rgba(0,0,0,.55)",
          padding: 12,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontWeight: 900, fontSize: 16, color: "#ffcf57" }}>Infos de partie</div>
            {info?.presetLabel ? <div style={{ fontSize: 12, opacity: 0.85, color: "#d9dbe3" }}>{info.presetLabel}</div> : null}
          </div>
          <button
            onClick={onClose}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.06)",
              color: "#d9dbe3",
              fontWeight: 900,
              padding: "10px 12px",
              cursor: "pointer",
            }}
          >
            Fermer
          </button>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, color: "#d9dbe3" }}>
          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, opacity: 0.95 }}>Condition de victoire</div>
            <div style={{ marginTop: 6 }}>
              winMode: <b style={{ color: "#ffcf57" }}>{info.winMode}</b>
            </div>
          </div>

          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, opacity: 0.95 }}>Échec (failPolicy)</div>
            <div style={{ marginTop: 6 }}>
              {info.failPolicy}
              {info.failPolicy !== "NONE" ? <b style={{ color: "#ffcf57" }}>{` (${info.failValue})`}</b> : null}
            </div>
          </div>

          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, opacity: 0.95 }}>Score uniquement valide</div>
            <div style={{ marginTop: 6 }}>
              scoreOnlyValid: <b style={{ color: "#ffcf57" }}>{String(info.scoreOnlyValid)}</b>
            </div>
          </div>

          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,.10)", background: "rgba(255,255,255,.04)" }}>
            <div style={{ fontWeight: 900, opacity: 0.95 }}>Hits minimum pour avancer</div>
            <div style={{ marginTop: 6 }}>
              minValidHitsToAdvance: <b style={{ color: "#ffcf57" }}>{info.minValidHitsToAdvance}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// HeaderBlock — copie visuelle X01PlayV3 (adapté score croissant)
// -------------------------------------------------------------
type HeaderBlockProps = {
  currentPlayer: { id: string; name: string } | null;
  currentAvatar: string | null;
  currentScore: number;
  currentThrow: UIDart[];
  liveRanking: Array<{ id: string; name: string; score: number }>;
  curDarts: number;
  curM3D: string;

  // ✅ batard stats (remplace les stats génériques)
  curHits: number;
  curFails: number;
  curAdvances: number;
  bestVisit: number;

  // ✅ infos de round / cible (affichage X01-like)
  roundIndex: number;
  roundsTotal: number;
  targetChipLabel: string;
  targetChipTone: "single" | "double" | "triple" | "bull" | "neutral";

  // ✅ modals
  onOpenInfo: () => void;
};

function HeaderBlock(props: HeaderBlockProps) {
  const {
    currentPlayer,
    currentAvatar,
    currentScore,
    currentThrow,
    liveRanking,
    curDarts,
    curM3D,
    curHits,
    curFails,
    curAdvances,
    bestVisit,
    roundIndex,
    roundsTotal,
    targetChipLabel,
    targetChipTone,
    onOpenInfo,
  } = props;

  const scoreAfterAll = Math.max((currentScore ?? 0) + sumThrow(currentThrow), 0);
  const bgAvatarUrl = currentAvatar || null;

  return (
    <div
      style={{
        background:
          "radial-gradient(120% 140% at 0% 0%, rgba(255,195,26,.10), transparent 55%), linear-gradient(180deg, rgba(15,15,18,.9), rgba(10,10,12,.8))",
        border: "1px solid rgba(255,255,255,.08)",
        borderRadius: 18,
        padding: 7,
        boxShadow: "0 8px 26px rgba(0,0,0,.35)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(90deg, rgba(10,10,12,.98) 0%, rgba(10,10,12,.92) 28%, rgba(10,10,12,.62) 52%, rgba(10,10,12,.22) 68%, rgba(10,10,12,0) 80%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          gap: 8,
          alignItems: "center",
          position: "relative",
          zIndex: 2,
        }}
      >
        {/* AVATAR + STATS */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 5 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: "50%",
              overflow: "hidden",
              background: "linear-gradient(180deg,#1b1b1f,#111114)",
              boxShadow: "0 6px 22px rgba(0,0,0,.35)",
            }}
          >
            {currentAvatar ? (
              <img src={currentAvatar} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  color: "#999",
                  fontWeight: 700,
                }}
              >
                ?
              </div>
            )}
          </div>

          <div style={{ fontWeight: 900, fontSize: 17, color: "#ffcf57" }}>{currentPlayer?.name ?? "—"}</div>
          <div style={{ fontSize: 11.5, color: "#d9dbe3" }}>
            {liveRanking?.length ? (
              <>
                Leader : <b>{liveRanking[0]?.name}</b>
              </>
            ) : null}
          </div>

          {/* Mini card stats joueur actif (Batard) */}
          <div style={{ ...miniCard, width: 176, height: "auto", padding: 7 }}>
            <div style={miniText}>
              <div>
                Hits : <b>{curHits}</b>
              </div>
              <div>
                Fails : <b>{curFails}</b>
              </div>
              <div>
                Avances : <b>{curAdvances}</b>
              </div>
            </div>
          </div>
        </div>

        {/* SCORE + PASTILLES + RANKING */}
        <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: 5, position: "relative", overflow: "visible" }}>
          {!!bgAvatarUrl && (
            <img
              src={bgAvatarUrl}
              aria-hidden
              style={{
                position: "absolute",
                top: "40%",
                left: "60%",
                transform: "translate(-50%, -50%)",
                height: "250%",
                width: "auto",
                WebkitMaskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,1) 69%, rgba(0,0,0,1) 100%)",
                maskImage:
                  "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.2) 25%, rgba(0,0,0,0.85) 52%, rgba(0,0,0,1) 69%, rgba(0,0,0,1) 100%)",
                WebkitMaskRepeat: "no-repeat",
                maskRepeat: "no-repeat",
                WebkitMaskSize: "100% 100%",
                maskSize: "100% 100%",
                opacity: 0.22,
                filter: "saturate(1.35) contrast(1.18) brightness(1.08) drop-shadow(-10px 0 26px rgba(0,0,0,.55))",
                pointerEvents: "none",
                userSelect: "none",
                zIndex: 0,
              }}
            />
          )}

          {/* KPI row (X01-like): ROUND / CIBLE / info */}
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              gap: 6,
              alignItems: "center",
              flexWrap: "nowrap",
              marginBottom: 2,
              position: "relative",
              zIndex: 2,
            }}
          >
            {(() => {
              const toneMap: Record<string, { bg: string; border: string; fg: string }> = {
                single: { bg: "rgba(255,187,51,.12)", border: "1px solid rgba(255,187,51,.42)", fg: "#ffc63a" },
                double: { bg: "rgba(46,150,193,.18)", border: "1px solid rgba(46,150,193,.40)", fg: "#cfeaff" },
                triple: { bg: "rgba(179,68,151,.18)", border: "1px solid rgba(179,68,151,.40)", fg: "#ffd0ff" },
                bull: { bg: "rgba(13,160,98,.16)", border: "1px solid rgba(13,160,98,.40)", fg: "#8ee6bf" },
                neutral: { bg: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.10)", fg: "#d9dbe3" },
              };
              const pill = (label: string, value: string, tone: keyof typeof toneMap) => {
                const st = toneMap[tone] || toneMap.neutral;
                return (
                  <div
                    style={{
                      minWidth: 74,
                      maxWidth: 86,
                      padding: "6px 8px",
                      borderRadius: 12,
                      background: st.bg,
                      border: st.border,
                      color: st.fg,
                      boxShadow: "0 8px 20px rgba(0,0,0,.28)",
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                      lineHeight: 1.05,
                      overflow: "hidden",
                    }}
                  >
                    <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.6, opacity: 0.95 }}>{label}</div>
                    <div style={{ fontSize: 13, fontWeight: 900, whiteSpace: "nowrap" }}>{value}</div>
                  </div>
                );
              };

              return (
                <>
                  {pill("ROUND", `${Math.max(1, (roundIndex || 0) + 1)}/${Math.max(1, roundsTotal || 1)}`, "neutral")}
                  {pill("CIBLE", targetChipLabel || "—", (targetChipTone as any) || "neutral")}
                  <button
                    type="button"
                    onClick={onOpenInfo}
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: 12,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(0,0,0,.20)",
                      color: "#d9dbe3",
                      fontWeight: 900,
                      boxShadow: "0 8px 20px rgba(0,0,0,.28)",
                    }}
                    aria-label="Infos partie"
                    title="Infos partie"
                  >
                    i
                  </button>
                </>
              );
            })()}
          </div>

          <div
            style={{
              fontSize: 64,
              fontWeight: 900,
              position: "relative",
              zIndex: 2,
              color: "#ffcf57",
              textShadow: "0 4px 18px rgba(255,195,26,.25)",
              lineHeight: 1.02,
            }}
          >
            {scoreAfterAll}
          </div>

          {/* Volée — ✅ couleurs EXACTES du Keypad via chipStyle */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, position: "relative", zIndex: 2 }}>
            {[0, 1, 2].map((i) => {
              const d = currentThrow[i];
              const st = chipStyle(d, false);
              return (
                <div
                  key={i}
                  style={{
                    background: st.background as string,
                    border: st.border as string,
                    borderRadius: 999,
                    padding: "10px 14px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    minWidth: 56,
                    fontSize: 18,
                    fontWeight: 900,
                    color: st.color as string,
                    boxShadow: "0 10px 22px rgba(0,0,0,.30)",
                  }}
                >
                  {d ? fmt(d) : "—"}
                </div>
              );
            })}
          </div>

          {/* Mini classement (statique) */}
          <div
            style={{
              ...miniCard,
              alignSelf: "center",
              width: "min(310px,100%)",
              padding: 6,
              position: "relative",
              zIndex: 2,
              textAlign: "left",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
              <div style={{ fontWeight: 900, color: "#ffcf57" }}>Classement</div>
              <div style={{ fontSize: 11, opacity: 0.85, color: "#d9dbe3" }}>
                {liveRanking.length} joueur{liveRanking.length === 1 ? "" : "s"}
              </div>
            </div>

            <div style={{ maxHeight: 3 * 26, overflow: liveRanking.length > 3 ? "auto" : "visible" }}>
              {liveRanking.map((r, i) => (
                <div key={r.id} style={miniRankRow}>
                  <div style={miniRankName}>
                    {i + 1}. {r.name}
                  </div>
                  <div style={miniRankScore}>{r.score}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// -------------------------------------------------------------
// BatardPlay
// -------------------------------------------------------------
export default function BatardPlay(props: any) {
  useFullscreenPlay();
  const { t } = useLang();
  const { theme } = useTheme();

  const store = (props as any)?.store ?? (props as any)?.params?.store ?? null;
  const storeProfiles: any[] = Array.isArray((store as any)?.profiles) ? (store as any).profiles : [];

  const cfg: BatardConfigPayload =
    (props?.params?.config as BatardConfigPayload) ||
    (props?.config as BatardConfigPayload) || {
      players: 2,
      botsEnabled: false,
      botLevel: "normal",
      presetId: "classic",
      batard: {
        presetId: "classic_bar",
        label: "Classic (Bar)",
        winMode: "SCORE_MAX",
        failPolicy: "NONE",
        failValue: 0,
        scoreOnlyValid: true,
        minValidHitsToAdvance: 1,
        rounds: [{ id: "r9", label: "Score Max", type: "ANY_SCORE", multiplierRule: "ANY" }],
      } as BatardRulesConfig,
    };

  const resumeId: string | null =
    (props?.params?.resumeId as string) ||
    (props?.params?.matchId as string) ||
    (props?.resumeId as string) ||
    null;

  const [resumeLoaded, setResumeLoaded] = useState<boolean>(false);
  const [runtimeCfg, setRuntimeCfg] = useState<BatardConfigPayload>(cfg);
  const [engineResetKey, setEngineResetKey] = useState<number>(0);
  const [engineInit, setEngineInit] = useState<any | null>(null);

  const lightPlayers: LightPlayer[] = useMemo(() => {
    const humans = (runtimeCfg.selectedHumanIds || []).filter(Boolean);
    const bots = runtimeCfg.botsEnabled ? (runtimeCfg.selectedBotIds || []).filter(Boolean) : [];

    const fallbackHumans =
      humans.length > 0
        ? humans
        : storeProfiles
            .filter((p) => p && p.id != null && !(p.isBot === true))
            .slice(0, Math.max(2, runtimeCfg.players))
            .map((p) => String(p.id));

    const allIds = [...fallbackHumans, ...bots].slice(0, Math.max(2, runtimeCfg.players));

    return allIds.map((id) => {
      const bot = PRO_BOTS.find((b) => b.id === id);
      if (bot) {
        return {
          id,
          name: bot.displayName || id,
          avatarDataUrl: getProBotAvatar(bot.avatarKey || bot.id) || null,
          dartSetId: null,
        };
      }

      const prof = storeProfiles.find((p) => String(p?.id) === String(id));
      return {
        id: String(id),
        name: prof?.name || prof?.displayName || String(id),
        avatarDataUrl: prof?.avatarDataUrl ?? null,
        dartSetId: (prof as any)?.dartSetId ?? (prof as any)?.activeDartSetId ?? null,
      };
    });
  }, [runtimeCfg.selectedHumanIds, runtimeCfg.selectedBotIds, runtimeCfg.botsEnabled, runtimeCfg.players, storeProfiles]);

  const playerIds = useMemo(() => lightPlayers.map((p) => p.id), [lightPlayers]);

  const { states, ranking, currentPlayerIndex, currentRound, submitVisit, finished, winnerId, turnCounter } =
    useBatardEngine(playerIds, runtimeCfg.batard, { resetKey: engineResetKey, initialSnapshot: engineInit });

  const active = states[currentPlayerIndex];
  const activeRoundIdx = (active as any)?.roundIndex ?? 0;

  const matchIdRef = useRef<string>((props?.params?.matchId as string) || makeMatchId("batard"));
  const createdAtRef = useRef<number>(Date.now());
  const visitsRef = useRef<any[]>([]);
  const didSaveFinishedRef = useRef<boolean>(false);

  useEffect(() => {
    let cancelled = false;
    if (!resumeId || resumeLoaded) return;
    (async () => {
      try {
        const rec: any = await History.get(resumeId);
        if (!rec || cancelled) {
          setResumeLoaded(true);
          return;
        }

        const payload = (rec as any).payload || (rec as any).decoded || null;
        const savedCfg = payload?.config || null;
        const savedVisits = Array.isArray(payload?.visits) ? payload.visits : [];

        if (rec?.id) matchIdRef.current = String(rec.id);
        if (payload?.createdAt) createdAtRef.current = Number(payload.createdAt) || createdAtRef.current;

        visitsRef.current = savedVisits;

        if (savedCfg) {
          const maybePlayers = Array.isArray(savedCfg.players) ? savedCfg.players : null;
          if (maybePlayers && maybePlayers.length) {
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any), players: maybePlayers.length }));
          } else {
            setRuntimeCfg((prev) => ({ ...(prev as any), ...(savedCfg as any) }));
          }
        }

        const ids: string[] = Array.isArray(savedCfg?.players)
          ? savedCfg.players.map((p: any) => String(p.id))
          : lightPlayers.map((p) => p.id);

        const snap = computeBatardReplaySnapshot(ids, (savedCfg?.batard || runtimeCfg.batard) as any, savedVisits);
        setEngineInit(snap);
        setEngineResetKey((k) => k + 1);
      } catch (e) {
        console.warn("[BatardPlay] resume load failed", e);
      } finally {
        if (!cancelled) setResumeLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resumeId]);

  function buildSummaryFromStates(finalStates: any[]) {
    const dartsByPlayer: Record<string, number> = {};
    const pointsByPlayer: Record<string, number> = {};
    const turnsByPlayer: Record<string, number> = {};
    const avg3ByPlayer: Record<string, number> = {};
    const failsByPlayer: Record<string, number> = {};
    const validHitsByPlayer: Record<string, number> = {};
    const advancesByPlayer: Record<string, number> = {};
    const bestVisitByPlayer: Record<string, number> = {};

    try {
      for (const v of visitsRef.current) {
        const pid = String(v?.p || "");
        if (!pid) continue;
        const sc = Number(v?.score || 0);
        bestVisitByPlayer[pid] = Math.max(Number(bestVisitByPlayer[pid] || 0), sc);
      }
    } catch {}

    for (const p of finalStates || []) {
      const pid = String(p.id);
      const darts = Number(p?.stats?.dartsThrown || 0);
      const pts = Number(p?.stats?.pointsAdded || 0);
      const turns = Number(p?.stats?.turns || 0);
      const a3 = darts > 0 ? (pts / darts) * 3 : 0;

      dartsByPlayer[pid] = darts;
      pointsByPlayer[pid] = pts;
      turnsByPlayer[pid] = turns;
      avg3ByPlayer[pid] = a3;

      failsByPlayer[pid] = Number(p?.stats?.fails || 0);
      validHitsByPlayer[pid] = Number(p?.stats?.validHits || 0);
      advancesByPlayer[pid] = Number(p?.stats?.advances || 0);
    }

    return {
      matchId: matchIdRef.current,
      mode: "batard",
      presetId: runtimeCfg.presetId,
      batardPresetId: (runtimeCfg.batard as any)?.presetId,
      status: finished ? "finished" : "in_progress",

      darts: dartsByPlayer,
      pointsByPlayer,
      dartsByPlayer,
      turnsByPlayer,
      avg3ByPlayer,
      bestVisitByPlayer,

      failsByPlayer,
      validHitsByPlayer,
      advancesByPlayer,

      turns: turnCounter,
      winMode: runtimeCfg.batard.winMode,
      failPolicy: runtimeCfg.batard.failPolicy,
      failValue: runtimeCfg.batard.failValue,
      scoreOnlyValid: runtimeCfg.batard.scoreOnlyValid,
      minValidHitsToAdvance: runtimeCfg.batard.minValidHitsToAdvance,
    };
  }

  async function upsertHistory(status: "in_progress" | "finished") {
    const matchId = matchIdRef.current;
    const createdAt = createdAtRef.current;
    const updatedAt = Date.now();

    const summary = buildSummaryFromStates(states as any);

    const dartSetId = (() => {
      try {
        const ids = (lightPlayers as any[]).map((p) => (p as any)?.dartSetId).filter((x) => typeof x === "string" && String(x).trim());
        if (!ids.length) return null;
        const uniq = Array.from(new Set(ids.map((x) => String(x).trim())));
        return uniq.length === 1 ? uniq[0] : null;
      } catch {
        return null;
      }
    })();

    const dartSetIdsByPlayer = (() => {
      try {
        const out: Record<string, string | null> = {};
        (lightPlayers as any[]).forEach((p) => {
          const pid = String((p as any)?.id ?? "");
          if (!pid) return;
          const v = (p as any)?.dartSetId;
          out[pid] = typeof v === "string" && v.trim() ? v.trim() : null;
        });
        return out;
      } catch {
        return {};
      }
    })();

    const unifiedStats = (() => {
      try {
        const pointsByPlayer = (summary as any)?.pointsByPlayer || {};
        const dartsByPlayer = (summary as any)?.dartsByPlayer || (summary as any)?.darts || {};
        const turnsByPlayer = (summary as any)?.turnsByPlayer || {};
        const avg3ByPlayer = (summary as any)?.avg3ByPlayer || {};
        const failsByPlayer = (summary as any)?.failsByPlayer || {};
        const validHitsByPlayer = (summary as any)?.validHitsByPlayer || {};
        const advancesByPlayer = (summary as any)?.advancesByPlayer || {};
        const bestVisitByPlayer = (summary as any)?.bestVisitByPlayer || {};

        return {
          sport: "batard",
          mode: "batard",
          players: (lightPlayers as any[]).map((p) => {
            const pid = String((p as any)?.id ?? "");
            return {
              id: pid,
              name: String((p as any)?.name ?? (p as any)?.label ?? ""),
              win: status === "finished" ? pid === String(winnerId || "") : undefined,
              score: Number(pointsByPlayer?.[pid] ?? 0) || 0,
              darts: {
                thrown: Number(dartsByPlayer?.[pid] ?? 0) || 0,
              },
              averages: {
                avg3d: Number(avg3ByPlayer?.[pid] ?? 0) || 0,
              },
              special: {
                turns: Number(turnsByPlayer?.[pid] ?? 0) || 0,
                fails: Number(failsByPlayer?.[pid] ?? 0) || 0,
                validHits: Number(validHitsByPlayer?.[pid] ?? 0) || 0,
                advances: Number(advancesByPlayer?.[pid] ?? 0) || 0,
                bestVisit: Number(bestVisitByPlayer?.[pid] ?? 0) || 0,
              },
            };
          }),
          global: {
            duration: Number(updatedAt - createdAt) || 0,
            turns: Number(turnCounter || 0) || 0,
          },
        };
      } catch {
        return { sport: "batard", mode: "batard", players: [], global: {} };
      }
    })();

    const payload = {
      matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,

      dartSetId,
      meta: { dartSetId, dartSetIdsByPlayer },

      stats: unifiedStats,

      config: {
        ...runtimeCfg,
        players: lightPlayers,
      },

      visits: visitsRef.current,
      states: states,
      winnerId: status === "finished" ? winnerId : null,
    };

    const record: any = {
      id: matchId,
      kind: "batard",
      status,
      createdAt,
      updatedAt,
      players: lightPlayers,
      winnerId: status === "finished" ? winnerId : null,
      summary,
      payload,
    };

    try {
      await History.upsert(record);
    } catch (e) {
      console.warn("[BatardPlay] History.upsert failed", e);
    }
  }

  // -----------------------------------------------------------
  // UI local state (keypad)
  // -----------------------------------------------------------
  const [multiplier, setMultiplier] = useState<1 | 2 | 3>(1);
  const [currentThrow, setCurrentThrow] = useState<UIDart[]>([]);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [infoOpen, setInfoOpen] = useState<boolean>(false);

  // ✅ Modal joueurs (classement)
  const [playersOpen, setPlayersOpen] = useState(false);

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  const onNumber = (v: number) => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v, mult: multiplier, label: `${multiplier}x${v}` }]);
  };

  const onBull = () => {
    if (finished) return;
    if (currentThrow.length >= 3) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => [...prev, { v: 25, mult: multiplier, label: multiplier === 2 ? "DBULL" : "BULL" }]);
  };

  const onUndo = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow((prev) => prev.slice(0, -1));
  };

  const onCancel = () => {
    if (finished) return;
    setInfoMsg(null);
    setCurrentThrow([]);
    setMultiplier(1);
  };

  const onValidate = () => {
    if (finished) return;

    const darts = [...currentThrow];
    const pid = String((states[currentPlayerIndex] as any)?.id || playerIds[currentPlayerIndex] || "");

    const sc = darts.reduce((s, d) => s + Number((d.v || 0) * (d.mult || 1)), 0);

    visitsRef.current.push({
      p: pid,
      darts: darts.map((d) => ({ v: d.v, mult: d.mult })),
      score: sc,
      ts: Date.now(),
      roundIndexBefore: (states[currentPlayerIndex] as any)?.roundIndex ?? 0,
    });

    submitVisit(darts);

    setCurrentThrow([]);
    setMultiplier(1);
    setInfoMsg(null);
  };

  const lastSavedTurnRef = useRef<number>(-1);
  useEffect(() => {
    if (finished) return;
    if (turnCounter === lastSavedTurnRef.current) return;
    lastSavedTurnRef.current = turnCounter;
    if (turnCounter <= 0) return;
    upsertHistory("in_progress");
  }, [turnCounter, finished]);

  useEffect(() => {
    if (!finished) return;
    if (didSaveFinishedRef.current) return;
    didSaveFinishedRef.current = true;
    upsertHistory("finished");
  }, [finished]);

  const winner = useMemo(() => {
    if (!finished || !winnerId) return null;
    const w = states.find((p: any) => p.id === winnerId) || null;
    return w ? { id: (w as any).id, score: (w as any).score } : null;
  }, [finished, winnerId, states]);

  // -----------------------------------------------------------
  // X01-like header derived values
  // -----------------------------------------------------------
  const activeId = String((states[currentPlayerIndex] as any)?.id || playerIds[currentPlayerIndex] || "");
  const activeLP = lightPlayers.find((p) => String(p.id) === activeId) || null;
  const activeName = String(activeLP?.name || activeId || "—");
  const activeAvatar = (activeLP?.avatarDataUrl as any) || null;

  const activeScore = Number((states[currentPlayerIndex] as any)?.score ?? 0) || 0;
  const activeDarts = Number((states[currentPlayerIndex] as any)?.stats?.dartsThrown ?? 0) || 0;
  const activeHits = Number((states[currentPlayerIndex] as any)?.stats?.validHits ?? 0) || 0;
  const activeTurns = Number((states[currentPlayerIndex] as any)?.stats?.turns ?? 0) || 0;
  const activeFails = Number((states[currentPlayerIndex] as any)?.stats?.fails ?? 0) || 0;
  const activeAdvances = Number((states[currentPlayerIndex] as any)?.stats?.advances ?? 0) || 0;

  const activeM3D = activeDarts > 0 ? ((activeScore / activeDarts) * 3).toFixed(1) : "0.0";

  const activeBestVisit = (() => {
    try {
      let best = 0;
      for (const v of visitsRef.current || []) {
        if (String(v?.p || "") !== activeId) continue;
        const sc = Number(v?.score || 0);
        if (sc > best) best = sc;
      }
      return best;
    } catch {
      return 0;
    }
  })();

  const roundsTotal = Math.max(1, Number((runtimeCfg as any)?.batard?.rounds?.length || 1) || 1);
  const targetChip = useMemo(() => {
    const r: any = currentRound as any;
    const m = String(r?.multiplierRule || "ANY");
    const tone = ((): "single" | "double" | "triple" | "bull" | "neutral" => {
      if (r?.type === "TARGET_BULL") return "bull";
      if (m === "SINGLE") return "single";
      if (m === "DOUBLE") return "double";
      if (m === "TRIPLE") return "triple";
      return "neutral";
    })();

    if (r?.type === "TARGET_BULL") {
      return { label: m === "DOUBLE" ? "DBULL" : "BULL", tone };
    }
    if (r?.type === "ANY_SCORE") {
      return { label: "SCORE", tone: "neutral" as const };
    }

    const target = typeof r?.target === "number" ? r.target : null;
    const prefix = m === "SINGLE" ? "S" : m === "DOUBLE" ? "D" : m === "TRIPLE" ? "T" : "";
    if (target == null) return { label: "—", tone: "neutral" as const };
    return { label: `${prefix}${target}`, tone };
  }, [currentRound]);

  const liveRanking = useMemo(() => {
    const src: any[] = Array.isArray(ranking) && ranking.length ? ranking : Array.isArray(states) ? states : [];
    const arr = src
      .map((p: any) => {
        const pid = String(p?.id ?? "");
        const lp = lightPlayers.find((x) => String(x.id) === pid);
        return {
          id: pid,
          name: String(lp?.name || pid || "—"),
          score: Number(p?.score ?? 0) || 0,
        };
      })
      .filter((x) => x.id);
    arr.sort((a, b) => (b.score || 0) - (a.score || 0));
    return arr;
  }, [ranking, states, lightPlayers]);

  // ✅ Ordre de jeu (comme X01: à partir du joueur actif, boucle)
  const orderedRowsForModal = useMemo(() => {
    const st: any[] = Array.isArray(states) ? states : [];
    if (!st.length) return [];

    const rotated = [...st.slice(currentPlayerIndex), ...st.slice(0, currentPlayerIndex)];

    return rotated.map((p: any) => {
      const pid = String(p?.id ?? "");
      const lp = lightPlayers.find((x) => String(x.id) === pid);
      return {
        id: pid,
        name: String(lp?.name || pid || "—"),
        avatar: (lp?.avatarDataUrl as any) || null,
        score: Number(p?.score ?? 0) || 0,
        hits: Number(p?.stats?.validHits ?? 0) || 0,
        turns: Number(p?.stats?.turns ?? 0) || 0,
        fails: Number(p?.stats?.fails ?? 0) || 0,
        advances: Number(p?.stats?.advances ?? 0) || 0,
        lastVisit: Array.isArray(p?.lastVisit) ? (p.lastVisit as UIDart[]) : null,
        isActive: String(pid) === String(activeId),
      };
    });
  }, [states, currentPlayerIndex, lightPlayers, activeId]);

  return (
    <div className="page">
      <PageHeader
        title="BÂTARD"
        tickerSrc={tickerBatard}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="BÂTARD" content={INFO_TEXT} />}
      />

      {/* ✅ plus de titre "STATUT" */}
      <Section title="">
        <div style={{ maxWidth: CONTENT_MAX, margin: "0 auto" }}>
          <HeaderBlock
            currentPlayer={{ id: activeId, name: activeName }}
            currentAvatar={activeAvatar}
            currentScore={activeScore}
            currentThrow={currentThrow}
            liveRanking={liveRanking}
            curDarts={activeDarts}
            curM3D={activeM3D}
            curHits={activeHits}
            curFails={activeFails}
            curAdvances={activeAdvances}
            bestVisit={activeBestVisit}
            roundIndex={activeRoundIdx}
            roundsTotal={roundsTotal}
            targetChipLabel={targetChip.label}
            targetChipTone={targetChip.tone}
            onOpenInfo={() => setInfoOpen(true)}
          />

          {/* Carte JOUEURS (ouvre bloc flottant) — style X01/Killer */}
          <button
            type="button"
            onClick={() => setPlayersOpen(true)}
            style={{
              width: "100%",
              marginTop: 10,
              borderRadius: 18,
              border: "1px solid rgba(255,255,255,.10)",
              background: "linear-gradient(180deg,rgba(22,22,26,.96),rgba(14,14,16,.98))",
              boxShadow: "0 10px 22px rgba(0,0,0,.35)",
              padding: 12,
              position: "relative",
              overflow: "hidden",
              textAlign: "left",
              cursor: "pointer",
            }}
            aria-label="Ouvrir la liste des joueurs"
            title="Ouvrir la liste des joueurs"
          >
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: `url(${tickerBatard})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.22,
                filter: "saturate(1.2) contrast(1.1)",
              }}
            />
            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg, rgba(10,10,12,.96) 0%, rgba(10,10,12,.88) 35%, rgba(10,10,12,.45) 70%, rgba(10,10,12,.18) 100%)",
              }}
            />

            <div style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ fontWeight: 900, letterSpacing: 0.8, color: theme?.primary || "#ffcf57" }}>JOUEURS</div>
              </div>

              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  color: "#0b0b0d",
                  background: theme?.primary || "#ffcf57",
                  boxShadow: "0 10px 22px rgba(0,0,0,.35)",
                  border: "1px solid rgba(255,255,255,.18)",
                }}
              >
                {lightPlayers.length}
              </div>
            </div>
          </button>
        </div>

        {infoMsg && (
          <div style={{ marginTop: 10, padding: 10, borderRadius: 12, background: "rgba(255,255,255,0.08)" }}>
            {infoMsg}
          </div>
        )}
      </Section>

      <PlayersModal open={playersOpen} onClose={() => setPlayersOpen(false)} title="Joueurs (ordre de jeu)" rows={orderedRowsForModal} />

      <GameInfoModal
        open={infoOpen}
        onClose={() => setInfoOpen(false)}
        info={{
          winMode: String((runtimeCfg as any)?.batard?.winMode || "—"),
          failPolicy: String((runtimeCfg as any)?.batard?.failPolicy || "—"),
          failValue: Number((runtimeCfg as any)?.batard?.failValue || 0) || 0,
          scoreOnlyValid: Boolean((runtimeCfg as any)?.batard?.scoreOnlyValid),
          minValidHitsToAdvance: Number((runtimeCfg as any)?.batard?.minValidHitsToAdvance || 0) || 0,
          presetLabel: String((runtimeCfg as any)?.batard?.label || (runtimeCfg as any)?.batard?.presetId || ""),
        }}
      />

      {finished && winner ? (
        <Section title="🏁 Fin de partie">
          <div style={{ fontWeight: 900, fontSize: 22 }}>
            Gagnant: {lightPlayers.find((p) => p.id === winner.id)?.name || winner.id} — {winner.score} pts
          </div>

          <div style={{ marginTop: 12, opacity: 0.9, fontSize: 13 }}>
            Classement:
            <ol style={{ marginTop: 8 }}>
              {ranking.map((p: any) => (
                <li key={p.id}>
                  {lightPlayers.find((x) => x.id === p.id)?.name || p.id} — {p.score} pts (fails {p.stats.fails}, turns {p.stats.turns})
                </li>
              ))}
            </ol>
          </div>

          <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
            <button className="btn btn-primary" onClick={() => props?.setTab?.("statsHub", { tab: "history" })}>
              Historique
            </button>
            <button className="btn" onClick={() => props?.setTab?.("batard_config")}>
              Rejouer / Reconfigurer
            </button>
          </div>
        </Section>
      ) : (
        <div style={{ paddingBottom: 120 }}>
          <Keypad
            currentThrow={currentThrow}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onNumber={onNumber}
            onBull={onBull}
            onUndo={onUndo}
            onCancel={onCancel}
            onValidate={onValidate}
            hidePreview={true}
          />
        </div>
      )}
    </div>
  );
}
