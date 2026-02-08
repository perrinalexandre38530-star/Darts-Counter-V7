// ============================================
// src/components/StatsCricketDashboard.tsx
// Dashboard Cricket — KPIs + récap + historique
//
// ⚠️ IMPORTANT (Darts Counter V7)
// Dans StatsHub, on injecte des stats via statsBridge.getCricketProfileStats()
// (type CricketProfileStats). On doit donc afficher un dashboard complet
// même si aucune donnée n'existe (valeurs à 0, sections visibles).
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import type { CricketProfileStats } from "../lib/cricketStats";

type Props = {
  stats?: CricketProfileStats | null;
  title?: string;
};

const EMPTY: CricketProfileStats = {
  matchesTotal: 0,
  matchesSolo: 0,
  matchesTeams: 0,

  winsTotal: 0,
  lossesTotal: 0,
  winsSolo: 0,
  lossesSolo: 0,
  winsTeams: 0,
  lossesTeams: 0,

  bestPointsInMatch: 0,
  bestPointsMatchId: undefined,
  bestPointsLegId: undefined,

  history: [],

  totalPointsFor: 0,
  totalPointsAgainst: 0,
  avgPointsFor: 0,
  avgPointsAgainst: 0,

  totalDarts: 0,
  totalMarks: 0,
  globalMpr: 0,
  globalHitRate: 0,
  globalScoringRate: 0,
};

export default function StatsCricketDashboard({ stats, title }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const s = stats ?? EMPTY;
  const sAny: any = s as any;

  const neon = theme.accent ?? "#FFD700";

  const winRatePct =
    s.matchesTotal > 0 ? Math.round((s.winsTotal / s.matchesTotal) * 100) : 0;
  const hitRatePct = Math.round((s.globalHitRate ?? 0) * 1000) / 10;
  const scoringRatePct = Math.round((s.globalScoringRate ?? 0) * 1000) / 10;

  const fmtPct = (n: number) => `${Number.isFinite(n) ? n : 0}%`;
  const fmtNum = (n: any) =>
    Number.isFinite(Number(n)) ? String(Math.round(Number(n) * 10) / 10) : "0";

  const subtitleStyle: React.CSSProperties = {
    color: neon,
    fontWeight: 900,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    fontSize: 12,
    marginBottom: 8,
  };

  const card: React.CSSProperties = {
    background: "rgba(0,0,0,0.25)",
    border: "1px solid rgba(255,255,255,0.10)",
    borderRadius: 16,
    padding: 12,
  };

  // Variantes (best-effort, sans dépendre d'un schéma strict)
  const byScoringVariant: any = sAny?.byScoringVariant ?? {};
  const byVariantId: any = sAny?.byVariantId ?? {};
  const totalInflictedPoints: number = Number(sAny?.totalInflictedPoints ?? 0);

  const pointsAgg = byScoringVariant?.["points"] ?? null;
  const noPointsAgg = byScoringVariant?.["no-points"] ?? null;
  const cutThroatAgg = byScoringVariant?.["cut-throat"] ?? null;

  const variantKeys: string[] = Object.keys(byVariantId || {}).filter(Boolean);

  return (
    <div style={{ padding: 16 }}>
      <h2
        style={{
          textAlign: "center",
          color: neon,
          fontWeight: 900,
          marginBottom: 10,
          fontSize: 22,
          letterSpacing: 0.2,
        }}
      >
        {title ?? t("stats.cricket.title", "Statistiques Cricket")}
      </h2>

      {/* ============================== KPIs ============================== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 10,
          marginBottom: 12,
        }}
      >
        <KPI
          label={t("stats.common.matches", "Manches")}
          value={s.matchesTotal}
          neon={neon}
        />
        <KPI
          label={t("stats.common.winrate", "Winrate")}
          value={fmtPct(winRatePct)}
          neon={neon}
        />

        <KPI
          label={t("stats.common.wins", "Victoires")}
          value={s.winsTotal}
          neon={neon}
        />
        <KPI
          label={t("stats.common.losses", "Défaites")}
          value={s.lossesTotal}
          neon={neon}
        />

        <KPI label={t("stats.cricket.mpr", "MPR")} value={fmtNum(s.globalMpr)} neon={neon} />
        <KPI
          label={t("stats.cricket.hitRate", "Hit rate")}
          value={fmtPct(hitRatePct)}
          neon={neon}
        />

        <KPI
          label={t("stats.cricket.scoringRate", "Scoring rate")}
          value={fmtPct(scoringRatePct)}
          neon={neon}
        />
        <KPI
          label={t("stats.cricket.bestPoints", "Best points")}
          value={s.bestPointsInMatch ?? 0}
          neon={neon}
        />
      </div>

      {/* ============================== Répartition solo/teams ============================== */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={subtitleStyle}>{t("stats.cricket.breakdown", "Répartition")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div
            style={{
              padding: 10,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg,#14161B,#0E1014)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: theme.textSoft,
                fontWeight: 900,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {t("stats.cricket.solo", "Solo")}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                justifyContent: "space-between",
                color: "#ddd",
                fontSize: 13,
              }}
            >
              <span>{t("stats.common.matches", "Manches")}</span>
              <strong style={{ color: neon }}>{s.matchesSolo}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.wins", "Victoires")}</span>
              <strong style={{ color: neon }}>{s.winsSolo}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.losses", "Défaites")}</span>
              <strong style={{ color: neon }}>{s.lossesSolo}</strong>
            </div>
          </div>

          <div
            style={{
              padding: 10,
              borderRadius: 14,
              border: "1px solid rgba(255,255,255,0.08)",
              background: "linear-gradient(180deg,#14161B,#0E1014)",
            }}
          >
            <div
              style={{
                fontSize: 11,
                color: theme.textSoft,
                fontWeight: 900,
                letterSpacing: 0.4,
                textTransform: "uppercase",
              }}
            >
              {t("stats.cricket.teams", "Équipes")}
            </div>
            <div
              style={{
                marginTop: 6,
                display: "flex",
                justifyContent: "space-between",
                color: "#ddd",
                fontSize: 13,
              }}
            >
              <span>{t("stats.common.matches", "Manches")}</span>
              <strong style={{ color: neon }}>{s.matchesTeams}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.wins", "Victoires")}</span>
              <strong style={{ color: neon }}>{s.winsTeams}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.losses", "Défaites")}</span>
              <strong style={{ color: neon }}>{s.lossesTeams}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* ============================== Totaux points / volume ============================== */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={subtitleStyle}>{t("stats.cricket.totals", "Totaux")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <KPIFlat label={t("stats.cricket.pointsFor", "Points marqués")} value={s.totalPointsFor} neon={neon} />
          <KPIFlat label={t("stats.cricket.pointsAgainst", "Points concédés")} value={s.totalPointsAgainst} neon={neon} />
          <KPIFlat label={t("stats.cricket.avgFor", "Moy. points (pour)")} value={fmtNum(s.avgPointsFor)} neon={neon} />
          <KPIFlat label={t("stats.cricket.avgAgainst", "Moy. points (contre)")} value={fmtNum(s.avgPointsAgainst)} neon={neon} />
          <KPIFlat label={t("stats.cricket.totalDarts", "Fléchettes")} value={s.totalDarts} neon={neon} />
          <KPIFlat label={t("stats.cricket.totalMarks", "Marks")} value={s.totalMarks} neon={neon} />
        </div>
      </div>

      {/* ============================== Variantes / Règles ============================== */}
      <div style={{ ...card, marginBottom: 12 }}>
        <div style={subtitleStyle}>{t("stats.cricket.variants", "Variantes")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {t("stats.cricket.variant.points", "Avec points")}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.matches", "Manches")}</span>
              <strong style={{ color: neon }}>{pointsAgg?.matches ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.wins", "Victoires")}</span>
              <strong style={{ color: neon }}>{pointsAgg?.wins ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.losses", "Défaites")}</span>
              <strong style={{ color: neon }}>{pointsAgg?.losses ?? 0}</strong>
            </div>
          </div>

          <div style={{ padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {t("stats.cricket.variant.noPoints", "Sans points")}
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.matches", "Manches")}</span>
              <strong style={{ color: neon }}>{noPointsAgg?.matches ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.wins", "Victoires")}</span>
              <strong style={{ color: neon }}>{noPointsAgg?.wins ?? 0}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
              <span>{t("stats.common.losses", "Défaites")}</span>
              <strong style={{ color: neon }}>{noPointsAgg?.losses ?? 0}</strong>
            </div>
          </div>

          <div style={{ gridColumn: "1 / -1", padding: 10, borderRadius: 14, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.04)" }}>
            <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 900, letterSpacing: 0.4, textTransform: "uppercase" }}>
              {t("stats.cricket.variant.cutThroat", "Cut-Throat")}
            </div>
            <div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
                <span>{t("stats.common.matches", "Manches")}</span>
                <strong style={{ color: neon }}>{cutThroatAgg?.matches ?? 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
                <span>{t("stats.cricket.inflicted", "Infligés")}</span>
                <strong style={{ color: neon }}>{Number.isFinite(totalInflictedPoints) ? totalInflictedPoints : 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
                <span>{t("stats.common.wins", "Victoires")}</span>
                <strong style={{ color: neon }}>{cutThroatAgg?.wins ?? 0}</strong>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", color: "#ddd", fontSize: 13 }}>
                <span>{t("stats.common.losses", "Défaites")}</span>
                <strong style={{ color: neon }}>{cutThroatAgg?.losses ?? 0}</strong>
              </div>
            </div>
          </div>
        </div>

        <div style={{ marginTop: 10, fontSize: 12, color: theme.textSoft }}>
          <strong style={{ color: neon }}>{t("stats.cricket.rules", "Règles")}:</strong>{" "}
          {variantKeys.length ? variantKeys.join(" • ") : t("stats.common.none", "—")}
        </div>
      </div>

      {/* ============================== Historique ============================== */}
      <div style={card}>
        <div style={subtitleStyle}>{t("stats.common.history", "Historique")}</div>

        {Array.isArray(s.history) && s.history.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {s.history.slice(0, 12).map((h) => {
              const dt = new Date((h as any).ts || 0);
              const dateLabel = Number.isFinite(dt.getTime())
                ? dt.toLocaleDateString(undefined, {
                    year: "2-digit",
                    month: "2-digit",
                    day: "2-digit",
                  })
                : "—";

              return (
                <div
                  key={`${(h as any).legId}:${(h as any).ts}`}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 14,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(255,255,255,0.04)",
                    display: "grid",
                    gridTemplateColumns: "72px 1fr auto",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      fontSize: 11,
                      color: theme.textSoft,
                      fontWeight: 900,
                    }}
                  >
                    {dateLabel}
                  </div>

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        gap: 8,
                        alignItems: "center",
                      }}
                    >
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 900,
                          letterSpacing: 0.6,
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: 999,
                          border: "1px solid rgba(255,255,255,0.12)",
                          background: "rgba(0,0,0,0.25)",
                          color: "#ddd",
                          flexShrink: 0,
                        }}
                      >
                        {(h as any).mode === "teams"
                          ? t("stats.cricket.teams", "Équipes")
                          : t("stats.cricket.solo", "Solo")}
                      </span>

                      <div
                        style={{
                          fontSize: 13,
                          color: "#ddd",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {(h as any).opponentLabel ||
                          t("stats.common.unknownOpponent", "Adversaire")}
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 4,
                        fontSize: 12,
                        color: theme.textSoft,
                      }}
                    >
                      {t("stats.common.score", "Score")}:{" "}
                      <strong style={{ color: neon }}>
                        {(h as any).pointsFor}
                      </strong>{" "}
                      — {(h as any).pointsAgainst}
                    </div>
                  </div>

                  <div
                    style={{
                      fontSize: 11,
                      fontWeight: 900,
                      color: (h as any).won ? "#44ff88" : "#ff4b4b",
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.12)",
                      background: "rgba(0,0,0,0.25)",
                    }}
                  >
                    {(h as any).won
                      ? t("stats.common.win", "WIN")
                      : t("stats.common.loss", "LOSS")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              color: theme.textSoft,
              fontSize: 13,
              padding: "10px 0",
              textAlign: "center",
            }}
          >
            {t(
              "stats.cricket.noData",
              "Aucune donnée Cricket pour le moment — lance une partie Cricket et tes stats apparaîtront ici."
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KPI({ label, value, neon }: { label: string; value: any; neon: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.06)",
        padding: 10,
        borderRadius: 14,
        border: `1px solid ${neon}40`,
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.8 }}>{label}</div>
      <div style={{ fontSize: 20, color: neon, fontWeight: 900, lineHeight: 1.1 }}>
        {value}
      </div>
    </div>
  );
}

function KPIFlat({ label, value, neon }: { label: string; value: any; neon: string }) {
  return (
    <div
      style={{
        background: "rgba(255,255,255,0.04)",
        padding: "10px 12px",
        borderRadius: 14,
        border: `1px solid rgba(255,255,255,0.10)`,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ fontSize: 12, opacity: 0.85 }}>{label}</div>
      <div style={{ fontSize: 16, color: neon, fontWeight: 900 }}>{value}</div>
    </div>
  );
}
