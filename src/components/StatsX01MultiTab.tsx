// ============================================
// src/components/StatsX01MultiTab.tsx
// Dashboard Stats — X01 Multi / Duels / Teams
// - Vue par profil actif (store.activeProfileId)
// - KPIs issus de StatsBridge.getBasicProfileStatsAsync
// - Répartition des matchs : Duel / Teams / Multi-joueurs
// - Classement des adversaires les plus fréquents
// ============================================

import React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import {
  getBasicProfileStatsAsync,
  type BasicProfileStats,
} from "../lib/statsBridge";
import { History } from "../lib/history";

type Props = {
  store: Store;
};

type OpponentRow = {
  id: string;
  name: string;
  games: number;
  wins: number;
};

type X01MultiMeta = {
  totalGames: number;
  totalWins: number;
  duelGames: number;
  duelWins: number;
  teamsGames: number;
  teamsWins: number;
  multiGames: number;
  multiWins: number;
  opponents: OpponentRow[];
};

export default function StatsX01MultiTab({ store }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfile: Profile | null =
    profiles.find((p) => p.id === (store as any).activeProfileId) ??
    profiles[0] ??
    null;

  const [loading, setLoading] = React.useState(true);
  const [basic, setBasic] = React.useState<BasicProfileStats | null>(null);
  const [meta, setMeta] = React.useState<X01MultiMeta | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Chargement stats globales (quick + History)
  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!activeProfile) {
        setLoading(false);
        setBasic(null);
        setMeta(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // A) quick-stats (StatsBridge)
        const basicStats = await getBasicProfileStatsAsync(
          activeProfile.id
        );

        // B) History X01
        const rows = await History.list();
        const metaStats = computeX01MultiMeta(
          rows as any[],
          activeProfile
        );

        if (cancelled) return;

        setBasic(basicStats);
        setMeta(metaStats);
      } catch (e) {
        if (!cancelled) {
          console.warn("[StatsX01MultiTab] load error", e);
          setError("Erreur lors du chargement des stats X01.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [activeProfile?.id]);

  if (!activeProfile) {
    return (
      <div style={{ padding: 12, color: "#ccc" }}>
        {t(
          "stats.x01multi.no_profile",
          "Aucun profil actif. Sélectionnez un profil pour voir les stats X01."
        )}
      </div>
    );
  }

  const games = basic?.games ?? 0;
  const wins = basic?.wins ?? 0;
  const darts = basic?.darts ?? 0;
  const avg3 = basic?.avg3 ?? 0;
  const bestVisit = basic?.bestVisit ?? 0;
  const bestCheckout = basic?.bestCheckout ?? 0;
  const coTotal = (basic as any)?.coTotal ?? 0;
  const winRateFromBridge = (basic as any)?.winRate ?? 0;

  const totalGames =
    meta && meta.totalGames > 0 ? meta.totalGames : games;
  const totalWins =
    meta && meta.totalWins > 0 ? meta.totalWins : wins;
  const totalLosses = Math.max(totalGames - totalWins, 0);
  const winRate =
    totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;

  const duelGames = meta?.duelGames ?? 0;
  const duelWins = meta?.duelWins ?? 0;

  const teamsGames = meta?.teamsGames ?? 0;
  const teamsWins = meta?.teamsWins ?? 0;

  const multiGames = meta?.multiGames ?? 0;
  const multiWins = meta?.multiWins ?? 0;

  const opponents = meta?.opponents ?? [];

  const accent = (theme as any)?.accent ?? "#ffc63a";

  return (
    <div
      className={`stats-x01multi theme-${theme.id}`}
      style={{
        padding: 12,
        paddingBottom: 80,
        maxWidth: 520,
        margin: "0 auto",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: "50%",
            overflow: "hidden",
            border: `2px solid ${accent}`,
            boxShadow: `0 0 16px ${accent}40`,
            background:
              "radial-gradient(circle at 30% 0%, rgba(255,255,255,0.16), rgba(0,0,0,0.9))",
          }}
        >
          {activeProfile.avatarDataUrl ? (
            <img
              src={activeProfile.avatarDataUrl}
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
              }}
            />
          ) : (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#bbb",
                fontWeight: 800,
                fontSize: 18,
              }}
            >
              {activeProfile.name?.[0]?.toUpperCase() ?? "?"}
            </div>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              letterSpacing: 1,
              textTransform: "uppercase",
              color: accent,
              opacity: 0.9,
              marginBottom: 2,
            }}
          >
            {t("stats.x01multi.title", "Stats X01 — Matches")}
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: "#f5f5f8",
            }}
          >
            {activeProfile.name}
          </div>
          <div
            style={{
              fontSize: 11.5,
              color: "#c0c3cf",
              marginTop: 2,
            }}
          >
            {t("stats.x01multi.subtitle", "Duels, équipes et multi-joueurs")}
          </div>
        </div>

        {/* Badge winrate global / loading */}
        <div
          style={{
            padding: "4px 9px",
            borderRadius: 999,
            border: `1px solid ${accent}60`,
            fontSize: 11,
            fontWeight: 700,
            color: accent,
            background:
              "linear-gradient(135deg, rgba(0,0,0,0.9), rgba(0,0,0,0.3))",
          }}
        >
          {loading
            ? t("stats.loading", "Chargement…")
            : `${winRate}% WR`}
        </div>
      </div>

      {error && (
        <div
          style={{
            marginBottom: 10,
            padding: 8,
            borderRadius: 10,
            background: "rgba(255,80,80,0.08)",
            color: "#ff9a9a",
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {/* GRID KPI PRINCIPALE (4 cartes) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 10,
        }}
      >
        <KpiCard
          label={t("stats.x01multi.matches", "Matches joués")}
          value={totalGames}
          hint={t("stats.x01multi.matches_hint", "Tous les X01 enregistrés")}
        />
        <KpiCard
          label={t("stats.x01multi.wins", "Victoires")}
          value={totalWins}
          highlight
          hint={`${winRate}% WR`}
        />
        <KpiCard
          label={t("stats.x01multi.losses", "Défaites")}
          value={totalLosses}
          hint={t("stats.x01multi.losses_hint", "Matches perdus")}
        />
        <KpiCard
          label={t("stats.x01multi.avg3", "Moy. 3 darts")}
          value={avg3.toFixed(2)}
          hint={t("stats.x01multi.avg3_hint", "Sur tous les X01")}
        />
      </div>

      {/* GRID KPI SECONDAIRE */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          marginBottom: 12,
        }}
      >
        <KpiMini
          label={t("stats.x01multi.best_visit", "Best visit")}
          value={bestVisit}
        />
        <KpiMini
          label={t("stats.x01multi.best_checkout", "Best checkout")}
          value={bestCheckout}
        />
        <KpiMini
          label={t("stats.x01multi.darts", "Darts jouées")}
          value={darts}
        />
        <KpiMini
          label={t("stats.x01multi.co_total", "Checkouts cumulés")}
          value={coTotal}
        />
        <KpiMini
          label={t("stats.x01multi.winrate_bridge", "WR (bridge)")}
          value={`${winRateFromBridge}%`}
        />
        <KpiMini
          label={t("stats.x01multi.matches_per_win", "Matches/victoire")}
          value={
            totalWins > 0 ? (totalGames / totalWins).toFixed(2) : "-"
          }
        />
      </div>

      {/* RÉPARTITION DUELS / TEAMS / MULTI */}
      <SectionTitle>
        {t(
          "stats.x01multi.split_title",
          "Répartition des types de matchs"
        )}
      </SectionTitle>
      <div
        style={{
          borderRadius: 16,
          border: "1px solid rgba(255,255,255,0.08)",
          padding: 10,
          marginBottom: 12,
          background:
            "linear-gradient(145deg, rgba(10,10,14,0.9), rgba(5,5,9,0.85))",
        }}
      >
        <SplitRow
          label={t("stats.x01multi.duel", "Duels (1v1)")}
          games={duelGames}
          wins={duelWins}
        />
        <SplitRow
          label={t("stats.x01multi.teams", "Teams")}
          games={teamsGames}
          wins={teamsWins}
        />
        <SplitRow
          label={t("stats.x01multi.multi", "Multi-joueurs")}
          games={multiGames}
          wins={multiWins}
        />
      </div>

      {/* CLASSEMENT ADVERSAIRES */}
      <SectionTitle>
        {t(
          "stats.x01multi.opponents_title",
          "Adversaires les plus fréquents"
        )}
      </SectionTitle>

      {opponents.length === 0 ? (
        <div
          style={{
            fontSize: 12,
            color: "#a7a9b5",
            padding: "4px 2px 10px",
          }}
        >
          {t(
            "stats.x01multi.no_opponents",
            "Pas encore assez de matchs enregistrés pour établir un classement des adversaires."
          )}
        </div>
      ) : (
        <div
          style={{
            borderRadius: 16,
            border: "1px solid rgba(255,255,255,0.08)",
            padding: 8,
            background:
              "linear-gradient(145deg, rgba(10,10,14,0.9), rgba(5,5,9,0.85))",
          }}
        >
          {opponents.slice(0, 5).map((o, idx) => {
            const wr =
              o.games > 0
                ? Math.round((o.wins / o.games) * 100)
                : 0;
            const isTop = idx === 0;
            const lineTemplate = t(
              "stats.x01multi.vs_line",
              "{{games}} matchs • {{wins}} victoires • {{wr}}% WR"
            ) as string;

            const line = lineTemplate
              .replace("{{games}}", String(o.games))
              .replace("{{wins}}", String(o.wins))
              .replace("{{wr}}", String(wr));

            return (
              <div
                key={o.id || idx}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "5px 6px",
                  borderRadius: 10,
                  marginBottom: 4,
                  background: isTop
                    ? "rgba(255,198,58,0.12)"
                    : "rgba(255,255,255,0.03)",
                }}
              >
                <div
                  style={{
                    width: 22,
                    textAlign: "center",
                    fontWeight: 800,
                    fontSize: 13,
                    color: isTop ? accent : "#ddd",
                  }}
                >
                  {idx + 1}.
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#f5f5f8",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {o.name}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#a7a9b5",
                      marginTop: 1,
                    }}
                  >
                    {line}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* FUTUR: zone courbes / graphiques */}
      <SectionTitle>
        {t(
          "stats.x01multi.future_section",
          "Évolution et graphiques détaillés"
        )}
      </SectionTitle>
      <div
        style={{
          fontSize: 11.5,
          color: "#8f93a5",
          padding: "4px 2px 18px",
        }}
      >
        {t(
          "stats.x01multi.future_hint",
          "Cette zone pourra accueillir plus tard des courbes (Sparkline, radar X01, progression de moyenne, etc.), sur le même modèle que Training X01."
        )}
      </div>
    </div>
  );
}

/* ============================================================
   COMPUTE META : scan History pour un profil donné
   - détecte les matchs X01 (game/variant contenant 'x01')
   - filtre les matchs où le profil a joué
   - catégorise Duel / Teams / Multi
   - construit un classement d'adversaires
============================================================ */

function computeX01MultiMeta(
  rows: any[],
  profile: Profile
): X01MultiMeta {
  const meta: X01MultiMeta = {
    totalGames: 0,
    totalWins: 0,
    duelGames: 0,
    duelWins: 0,
    teamsGames: 0,
    teamsWins: 0,
    multiGames: 0,
    multiWins: 0,
    opponents: [],
  };

  const byOpponent: Record<string, OpponentRow> = {};
  const pidTarget = profile.id;

  for (const r of rows || []) {
    const game = (r as any).game || (r as any).mode || "";
    const variant = String((r as any).variant || "").toLowerCase();
    const modeStr = String(game || "").toLowerCase();

    const isX01 =
      modeStr.includes("x01") || variant.includes("x01");
    if (!isX01) continue;

    const players: any[] =
      (r as any).players ??
      (r as any).config?.players ??
      [];

    if (!players.length) continue;

    const self =
      players.find(
        (p: any) =>
          p.profileId === pidTarget || p.id === pidTarget
      ) ?? null;
    if (!self) continue;

    const selfPid = self.id ?? pidTarget;

    const winnerId =
      (r as any).winnerId ??
      (r as any).summary?.winnerId ??
      (r as any).engineState?.winnerId ??
      (r as any).state?.winnerId ??
      null;

    const isWin =
      winnerId === selfPid || winnerId === pidTarget;

    const cfg = (r as any).config ?? {};
    const hasTeams = !!cfg.teams || cfg.matchMode === "teams";
    const nbPlayers = players.length;

    meta.totalGames += 1;
    if (isWin) meta.totalWins += 1;

    if (hasTeams) {
      meta.teamsGames += 1;
      if (isWin) meta.teamsWins += 1;
    } else if (nbPlayers === 2) {
      meta.duelGames += 1;
      if (isWin) meta.duelWins += 1;
    } else if (nbPlayers >= 3) {
      meta.multiGames += 1;
      if (isWin) meta.multiWins += 1;
    }

    // Adversaires : tous les autres joueurs de ce match
    for (const p of players) {
      const pProfileId = p.profileId ?? p.id;
      if (!pProfileId || pProfileId === pidTarget) continue;

      const key = String(pProfileId);
      if (!byOpponent[key]) {
        byOpponent[key] = {
          id: key,
          name: p.name || "—",
          games: 0,
          wins: 0,
        };
      }
      byOpponent[key].games += 1;
      if (isWin) {
        byOpponent[key].wins += 1;
      }
    }
  }

  meta.opponents = Object.values(byOpponent).sort((a, b) => {
    if (b.games !== a.games) return b.games - a.games;
    return b.wins - a.wins;
  });

  return meta;
}

/* ============================================================
   Sous-composants UI : KpiCard, KpiMini, SectionTitle, SplitRow
============================================================ */

function KpiCard(props: {
  label: string;
  value: string | number;
  hint?: string;
  highlight?: boolean;
}) {
  const { label, value, hint, highlight } = props;
  return (
    <div
      style={{
        borderRadius: 16,
        padding: 10,
        background: highlight
          ? "radial-gradient(circle at 0% 0%, rgba(255,198,58,0.25), rgba(10,10,14,0.96))"
          : "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(8,8,12,0.98))",
        border: highlight
          ? "1px solid rgba(255,198,58,0.7)"
          : "1px solid rgba(255,255,255,0.08)",
        boxShadow: highlight
          ? "0 10px 26px rgba(255,198,58,0.35)"
          : "0 8px 18px rgba(0,0,0,0.6)",
      }}
    >
      <div
        style={{
          fontSize: 11,
          color: "rgba(210,213,225,0.9)",
          marginBottom: 2,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 19,
          fontWeight: 800,
          color: highlight ? "#ffd76a" : "#f5f5f8",
          lineHeight: 1.1,
        }}
      >
        {value}
      </div>
      {hint && (
        <div
          style={{
            fontSize: 10.5,
            color: "rgba(180,184,198,0.9)",
            marginTop: 2,
          }}
        >
          {hint}
        </div>
      )}
    </div>
  );
}

function KpiMini(props: { label: string; value: string | number }) {
  const { label, value } = props;
  return (
    <div
      style={{
        borderRadius: 14,
        padding: "6px 8px",
        background: "rgba(14,16,24,0.96)",
        border: "1px solid rgba(255,255,255,0.06)",
      }}
    >
      <div
        style={{
          fontSize: 10.5,
          color: "rgba(190,193,206,0.95)",
          marginBottom: 1,
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 15,
          fontWeight: 800,
          color: "#f7f7fb",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 4,
        marginBottom: 6,
        fontSize: 12,
        fontWeight: 700,
        textTransform: "uppercase",
        letterSpacing: 0.6,
        color: "#cacde0",
      }}
    >
      {children}
    </div>
  );
}

function SplitRow(props: {
  label: string;
  games: number;
  wins: number;
}) {
  const { label, games, wins } = props;
  const losses = Math.max(games - wins, 0);
  const wr = games > 0 ? Math.round((wins / games) * 100) : 0;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "4px 2px",
      }}
    >
      <div
        style={{
          flex: 1,
          minWidth: 0,
          fontSize: 12.5,
          color: "#e4e6f3",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 11.5,
          color: "#a7a9b5",
          minWidth: 80,
          textAlign: "right",
        }}
      >
        {games} g • {wins} v • {losses} d
      </div>
      <div
        style={{
          marginLeft: 6,
          fontSize: 11.5,
          fontWeight: 700,
          color: "#ffd76a",
          minWidth: 40,
          textAlign: "right",
        }}
      >
        {wr}%
      </div>
    </div>
  );
}
