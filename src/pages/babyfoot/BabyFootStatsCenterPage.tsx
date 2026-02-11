// ============================================
// src/pages/babyfoot/BabyFootStatsCenterPage.tsx
// Baby-Foot — Centre de statistiques (ossature VISUELLE identique à StatsHub Darts)
// Objectif (PATCH SAFE):
// - Même rendu/cheminement "Centre de statistiques" que StatsHub (Darts)
// - Onglets: MATCH / FUN / TRAINING / DÉFIS
// - Carrousel modes (1v1 / 2v2 / 2v1 / tous…)
// - Carrousel profils (si scope=locals)
// - Placeholders 100% anti-crash (branchage stats réelles ensuite)
// PATCH (MATCH + FILTRES):
// - Ajout filtres période J / S / M / A / ARV (UI type StatsHub)
// - Pages MATCH différenciées (1v1 / 2v2 / 2v1 / Tous) : +détails (toujours SAFE)
// ============================================

import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";
import { GoldPill } from "../../components/StatsPlayerDashboard";

// Effet shimmer à l'intérieur des lettres (même esprit que StatsHub Darts)
const statsNameCss = `
.bf-stats-name-wrapper{position:relative;display:inline-block;font-weight:900;}
.bf-stats-name-base{color:var(--bf-accent,#f6c256);text-shadow:none!important;}
.bf-stats-name-shimmer{position:absolute;inset:0;color:transparent;
  background-image: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 40%, rgba(255,255,255,0.55) 50%, rgba(255,255,255,0.08) 60%, transparent 100%);
  background-size:200% 100%;background-position:0% 0%;
  -webkit-background-clip:text;background-clip:text;
  animation: bfStatsNameShimmer 2.4s linear infinite;pointer-events:none;
}
@keyframes bfStatsNameShimmer{0%{background-position:-80% 0%}100%{background-position:120% 0%}}
`;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type TopTab = "match" | "fun" | "training" | "defis";
type PeriodKey = "J" | "S" | "M" | "A" | "ARV";

const TOP_TABS: { key: TopTab; label: string }[] = [
  { key: "match", label: "MATCH" },
  { key: "fun", label: "FUN" },
  { key: "training", label: "TRAINING" },
  { key: "defis", label: "DÉFIS" },
];

const PERIODS: { key: PeriodKey; label: string; hint: string }[] = [
  { key: "J", label: "J", hint: "Jour" },
  { key: "S", label: "S", hint: "Semaine" },
  { key: "M", label: "M", hint: "Mois" },
  { key: "A", label: "A", hint: "Année" },
  { key: "ARV", label: "ARV", hint: "À vie" },
];

const MODES_BY_TAB: Record<TopTab, { key: string; label: string }[]> = {
  match: [
    { key: "1v1", label: "1V1" },
    { key: "2v2", label: "2V2" },
    { key: "2v1", label: "2V1" },
    { key: "all", label: "TOUS" },
  ],
  fun: [
    { key: "fun", label: "FUN" },
    { key: "all", label: "TOUS" },
  ],
  training: [
    { key: "training", label: "TRAINING" },
    { key: "all", label: "TOUS" },
  ],
  defis: [
    { key: "defis", label: "DÉFIS" },
    { key: "all", label: "TOUS" },
  ],
};

function clampIndex(idx: number, len: number) {
  if (len <= 0) return 0;
  const m = idx % len;
  return m < 0 ? m + len : m;
}

export default function BabyFootStatsCenterPage({ store, go, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  // scope: active | locals
  const scope = String(params?.scope || "active");

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  const active: Profile | null =
    profiles.find((p: any) => p.id === activeProfileId) ?? profiles[0] ?? null;

  // Palette proche de StatsHub
  const T = React.useMemo(() => {
    const accent = theme?.primary ?? "#f6c256";
    const accentGlow = theme?.primaryGlow ?? accent;
    const addAlpha = (c: string, aHex: string) => {
      // support: #RRGGBB
      if (typeof c === "string" && c.startsWith("#") && c.length === 7) return `${c}${aHex}`;
      return c;
    };
    return {
      accent,
      accentGlow,
      accent20: addAlpha(accent, "33"),
      accent30: addAlpha(accent, "4D"),
      accent40: addAlpha(accent, "66"),
      accent50: addAlpha(accent, "80"),
      text: theme?.text ?? "#fff",
      text30: "rgba(255,255,255,.30)",
      text40: "rgba(255,255,255,.40)",
      card: theme?.card ?? "rgba(20,20,24,.92)",
      borderSoft: theme?.borderSoft ?? "rgba(255,255,255,.10)",
    };
  }, [theme]);

  const [topTab, setTopTab] = React.useState<TopTab>("match");

  // --- Filtres période (J/S/M/A/ARV) ---
  const [period, setPeriod] = React.useState<PeriodKey>("M");

  // --- Carrousel modes (comme StatsHub, avec prev/next) ---
  const modes = MODES_BY_TAB[topTab] ?? MODES_BY_TAB.match;
  const [modeIdx, setModeIdx] = React.useState(0);

  React.useEffect(() => {
    setModeIdx(0);
  }, [topTab]);

  const currentMode = React.useMemo(() => {
    return modes[clampIndex(modeIdx, modes.length)] ?? { key: "all", label: "TOUS" };
  }, [modes, modeIdx]);

  const currentModeLabel = React.useMemo(() => {
    const left = TOP_TABS.find((x) => x.key === topTab)?.label ?? "MATCH";
    const right = currentMode?.label ?? "TOUS";
    return `${left} — ${right}`;
  }, [currentMode, topTab]);

  const canScrollModes = modes.length > 1;
  const goPrevMode = () => setModeIdx((i) => clampIndex(i - 1, modes.length));
  const goNextMode = () => setModeIdx((i) => clampIndex(i + 1, modes.length));

  // --- Carrousel profils (comme StatsHub) ---
  const filteredPlayers: Profile[] = React.useMemo(() => {
    if (scope === "locals") return profiles;
    return active ? [active] : [];
  }, [scope, profiles, active]);

  const [playerIdx, setPlayerIdx] = React.useState(0);

  React.useEffect(() => {
    setPlayerIdx(0);
  }, [scope, activeProfileId]);

  const selectedProfile: Profile | null =
    filteredPlayers[clampIndex(playerIdx, filteredPlayers.length)] ?? null;

  const canScrollPlayers = filteredPlayers.length > 1;
  const goPrevPlayer = () => setPlayerIdx((i) => clampIndex(i - 1, filteredPlayers.length));
  const goNextPlayer = () => setPlayerIdx((i) => clampIndex(i + 1, filteredPlayers.length));

  // --- Styles (copiés dans l'esprit de StatsHub) ---
  const statsPageWrap: React.CSSProperties = {
    width: "100%",
    maxWidth: 620,
    margin: "0 auto",
  };

  const statsStack: React.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  };

  const card: React.CSSProperties = {
    borderRadius: 18,
    background: T.card,
    border: `1px solid ${T.borderSoft}`,
    boxShadow: `
      0 0 0 1px ${T.accent20},
      0 12px 26px rgba(0,0,0,.55)
    `,
    padding: 12,
  };

  const softCard: React.CSSProperties = {
    borderRadius: 18,
    background: "linear-gradient(180deg,rgba(18,18,22,.98),rgba(9,9,12,.96))",
    border: `1px solid ${T.text30}`,
    boxShadow: `
      0 0 0 1px ${T.accent20},
      0 10px 22px rgba(0,0,0,.55)
    `,
    padding: 12,
  };

  // --- Placeholders SAFE (valeurs = 0 / null) ---
  // NOTE: on n'accède à aucun store.history ici (patch SAFE). Branchage ensuite.
  const kpis = React.useMemo(() => {
    return {
      matches: 0,
      goals: 0,
      conceded: 0,
      winrate: 0,
      gpm: 0,
      gcm: 0,
      diff: 0,
      cleanSheets: 0,
      comebacks: 0,
      decisiveGoals: 0,
      decisivePens: 0,
      momentum: 0,
      streakBest: 0,
      streakNow: 0,
      convPct: null as number | null,
      avgDuration: "00:00",
      avgGoalsPerMin: "—",
    };
  }, []);

  const periodLabel = React.useMemo(() => {
    return PERIODS.find((p) => p.key === period)?.hint ?? "Mois";
  }, [period]);

  const matchContent = React.useMemo(() => {
    const modeKey = String(currentMode?.key || "all");

    // KPI packs (SAFE) — on différencie seulement le rendu/les libellés par mode
    if (modeKey === "1v1") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title={`Résumé 1V1 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts marqués" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 1v1 branchées sur l'historique baby-foot ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Attaque / Défense" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts / match" value={String(kpis.gpm)} />
              <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
              <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
              <KpiTile label="Buts / min" value={kpis.avgGoalsPerMin} />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Moments clés" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts décisifs" value={String(kpis.decisiveGoals)} />
              <KpiTile label="Pénalties décisifs" value={String(kpis.decisivePens)} />
              <KpiTile label="Comebacks" value={String(kpis.comebacks)} />
              <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
            </div>

            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              Notes : les “moments clés” seront calculés best-effort une fois les events disponibles.
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Séries" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Série en cours" value={String(kpis.streakNow)} />
              <KpiTile label="Meilleure série" value={String(kpis.streakBest)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
              <KpiTile label="Indice régularité" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (modeKey === "2v2") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title={`Résumé 2V2 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate équipe" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts équipe" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 2v2 : branchage équipe/composition ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Synergie" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Coéquipiers (top)" value="—" />
              <KpiTile label="Répartition buts" value="—" />
              <KpiTile label="Assists" value="—" />
              <KpiTile label="Actions clés" value="—" />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Qualité de jeu" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
              <KpiTile label="Comebacks" value={String(kpis.comebacks)} />
              <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
            </div>
            <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
              Notes : la “synergie” nécessite les compositions Team A / Team B dans l’historique.
            </div>
          </div>
        </div>
      );
    }

    if (modeKey === "2v1") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title={`Résumé 2V1 — ${periodLabel}`} T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Matchs" value={String(kpis.matches)} />
              <KpiTile label="Winrate" value={`${kpis.winrate}%`} />
              <KpiTile label="Buts marqués" value={String(kpis.goals)} />
              <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
              <KpiTile label="Diff. buts" value={String(kpis.diff)} />
              <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
            </div>
            <SectionHint text="(Patch SAFE) — stats 2v1 : affichage “avantage / handicap” ensuite." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Difficulté" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Buts / match" value={String(kpis.gpm)} />
              <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
              <KpiTile label="Comebacks" value={String(kpis.comebacks)} />
              <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
            </div>
          </div>

          <div style={softCard}>
            <SectionTitle title="Résilience" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Série en cours" value={String(kpis.streakNow)} />
              <KpiTile label="Meilleure série" value={String(kpis.streakBest)} />
              <KpiTile label="Buts décisifs" value={String(kpis.decisiveGoals)} />
              <KpiTile
                label="Conversion tirs"
                value={kpis.convPct == null ? "—" : `${Math.round(kpis.convPct * 100)}%`}
              />
            </div>
          </div>
        </div>
      );
    }

    // TOUS
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={softCard}>
          <SectionTitle title={`Résumé (Tous modes MATCH) — ${periodLabel}`} T={T} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiTile label="Matchs" value={String(kpis.matches)} />
            <KpiTile label="Winrate global" value={`${kpis.winrate}%`} />
            <KpiTile label="Buts marqués" value={String(kpis.goals)} />
            <KpiTile label="Buts encaissés" value={String(kpis.conceded)} />
            <KpiTile label="Diff. buts" value={String(kpis.diff)} />
            <KpiTile label="Durée moyenne" value={kpis.avgDuration} />
          </div>

          <SectionHint text="(Patch SAFE) — l’agrégation multi-modes sera branchée ensuite." />
        </div>

        <div style={softCard}>
          <SectionTitle title="Qualité de jeu" T={T} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <KpiTile label="Buts / match" value={String(kpis.gpm)} />
            <KpiTile label="Encaissés / match" value={String(kpis.gcm)} />
            <KpiTile label="Clean sheets" value={String(kpis.cleanSheets)} />
            <KpiTile label="Momentum (bursts)" value={String(kpis.momentum)} />
          </div>

          <div style={{ marginTop: 10, fontSize: 11, color: "rgba(255,255,255,.55)" }}>
            Notes : la “conversion tirs” et les stats avancées arrivent une fois les événements disponibles.
          </div>
        </div>
      </div>
    );
  }, [currentMode, kpis, periodLabel, softCard, T]);

  const content = React.useMemo(() => {
    // IMPORTANT: chaque onglet a son propre contenu (même si placeholders SAFE)
    if (topTab === "fun") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Résumé FUN" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Parties FUN" value="0" />
              <KpiTile label="Points FUN" value="0" />
              <KpiTile label="Meilleur run" value="—" />
              <KpiTile label="Régularité" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats FUN à brancher sur l'historique baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Moments" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Séries" value="—" />
              <KpiTile label="Comebacks" value="—" />
              <KpiTile label="Buts express" value="—" />
              <KpiTile label="Actions clés" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (topTab === "training") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Training" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Sessions" value="0" />
              <KpiTile label="Temps total" value="00:00" />
              <KpiTile label="Objectifs" value="0" />
              <KpiTile label="Progression" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats Training à brancher sur sessions/records baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Précision" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Conversion tirs" value="—" />
              <KpiTile label="Buts / min" value="—" />
              <KpiTile label="Meilleur score" value="—" />
              <KpiTile label="Répétabilité" value="—" />
            </div>
          </div>
        </div>
      );
    }

    if (topTab === "defis") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={softCard}>
            <SectionTitle title="Défis" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Défis joués" value="0" />
              <KpiTile label="Défis gagnés" value="0" />
              <KpiTile label="Série (streak)" value="—" />
              <KpiTile label="Difficulté" value="—" />
            </div>
            <SectionHint text="(Patch SAFE) — stats Défis à brancher sur les modes 'Défis' baby-foot." />
          </div>

          <div style={softCard}>
            <SectionTitle title="Trophées" T={T} />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <KpiTile label="Badges" value="—" />
              <KpiTile label="Records" value="—" />
              <KpiTile label="Temps record" value="—" />
              <KpiTile label="Rang" value="—" />
            </div>
          </div>
        </div>
      );
    }

    // MATCH (différencié par mode)
    return matchContent;
  }, [topTab, softCard, T, matchContent]);

  return (
    <div style={{ padding: 16, paddingBottom: 80, background: theme?.bg, color: theme?.text }}>
      <style>{statsNameCss}</style>

      <div style={statsPageWrap}>
        <div style={statsStack}>
          {/* HEADER : titre centré + carrousel modes (IDENTIQUE StatsHub) */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 8,
              marginBottom: 2,
            }}
          >
            <div
              style={{
                width: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => go("stats")}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 999,
                  border: `1px solid ${T.text30}`,
                  background: "rgba(0,0,0,.45)",
                  color: T.text,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  fontSize: 16,
                  flex: "0 0 auto",
                }}
                aria-label="Retour"
              >
                ←
              </button>

              <div
                style={{
                  fontSize: 15,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 1.1,
                  color: T.accent,
                  textShadow: `0 0 10px ${T.accent}, 0 0 22px ${T.accentGlow}`,
                  textAlign: "center",
                  flex: 1,
                }}
              >
                {t?.("bfStatsCenter.title", "Centre de statistiques") ?? "Centre de statistiques"}
              </div>

              <div style={{ width: 32, height: 32, flex: "0 0 auto" }} />
            </div>

            {/* Badge "Dashboard global" — placé SOUS le titre */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: 2 }}>
              <div
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: `radial-gradient(circle at 0% 0%, ${T.accent40}, transparent 65%)`,
                  color: T.accent,
                  fontWeight: 900,
                  fontSize: 11,
                  letterSpacing: 0.9,
                  textTransform: "uppercase",
                  textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                  whiteSpace: "nowrap",
                }}
              >
                Dashboard global
              </div>
            </div>

            {/* Filtres période (J/S/M/A/ARV) — comme StatsHub */}
            <div style={{ width: "100%", display: "flex", justifyContent: "center", marginTop: 6 }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  flexWrap: "wrap",
                }}
              >
                {PERIODS.map((p) => (
                  <GoldPill
                    key={p.key}
                    active={period === p.key}
                    onClick={() => setPeriod(p.key)}
                    style={{
                      padding: "6px 10px",
                      borderRadius: 14,
                      fontSize: 12,
                      minWidth: 44,
                      justifyContent: "center",
                    }}
                    title={p.hint}
                  >
                    {p.label}
                  </GoldPill>
                ))}
              </div>
            </div>

            {/* Carrousel modes */}
            <div
              style={{
                marginTop: 8,
                padding: 8,
                borderRadius: 18,
                border: `1px solid ${T.accent30}`,
                background: "linear-gradient(180deg,rgba(18,18,22,.98),rgba(9,9,12,.96))",
                boxShadow: `0 0 0 1px ${T.accent20}, 0 8px 20px rgba(0,0,0,.55)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 6,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={goPrevMode}
                disabled={!canScrollModes}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: canScrollModes
                    ? `radial-gradient(circle at 30% 30%, ${T.accent40}, transparent 55%)`
                    : "rgba(0,0,0,.45)",
                  color: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollModes ? "pointer" : "default",
                  fontSize: 13,
                }}
              >
                ◀
              </button>

              <div
                style={{
                  flex: 1,
                  padding: "7px 10px",
                  borderRadius: 999,
                  border: `1px solid ${T.accent}`,
                  background: `radial-gradient(circle at 0% 0%, ${T.accent40}, transparent 65%)`,
                  textAlign: "center",
                  fontSize: 13,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: 0.9,
                  color: T.accent,
                  textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {currentModeLabel}
              </div>

              <button
                type="button"
                onClick={goNextMode}
                disabled={!canScrollModes}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 999,
                  border: `1px solid ${T.accent50}`,
                  background: canScrollModes
                    ? `radial-gradient(circle at 70% 30%, ${T.accent40}, transparent 55%)`
                    : "rgba(0,0,0,.45)",
                  color: T.accent,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: canScrollModes ? "pointer" : "default",
                  fontSize: 13,
                }}
              >
                ▶
              </button>
            </div>
          </div>

          {/* CARROUSEL PROFIL (identique StatsHub) */}
          <div style={card}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
              }}
            >
              {/* Flèche gauche — MASQUÉE UNIQUEMENT POUR PROFIL ACTIF */}
              {scope !== "locals" ? (
                <div style={{ width: 26, height: 26 }} />
              ) : (
                <button
                  type="button"
                  onClick={goPrevPlayer}
                  disabled={!canScrollPlayers}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: `1px solid ${T.text30}`,
                    background: canScrollPlayers
                      ? `radial-gradient(circle at 30% 30%, ${T.text30}, transparent 55%)`
                      : "rgba(0,0,0,.45)",
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: canScrollPlayers ? "pointer" : "default",
                    fontSize: 13,
                  }}
                >
                  ◀
                </button>
              )}

              {/* Avatar + StarRing + nom */}
              <div
                style={{
                  flex: 1,
                  display: "flex",
                  justifyContent: "center",
                  minWidth: 0,
                  overflow: "visible",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                  <StatsPlayerAvatar profile={selectedProfile} theme={theme} />

                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 900,
                        letterSpacing: 0.9,
                        textTransform: "uppercase",
                        color: T.accent,
                        textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
                      }}
                    >
                      {scope === "locals" ? "Profils locaux" : "Statistiques"}
                    </div>

                    <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      <span className="bf-stats-name-wrapper" style={{ ...({ "--bf-accent": T.accent } as any) }}>
                        <span className="bf-stats-name-base">{selectedProfile?.name ?? "—"}</span>
                        <span className="bf-stats-name-shimmer">{selectedProfile?.name ?? "—"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flèche droite */}
              {scope !== "locals" ? (
                <div style={{ width: 26, height: 26 }} />
              ) : (
                <button
                  type="button"
                  onClick={goNextPlayer}
                  disabled={!canScrollPlayers}
                  style={{
                    width: 26,
                    height: 26,
                    borderRadius: 999,
                    border: `1px solid ${T.text30}`,
                    background: canScrollPlayers
                      ? `radial-gradient(circle at 70% 30%, ${T.text30}, transparent 55%)`
                      : "rgba(0,0,0,.45)",
                    color: T.text,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: canScrollPlayers ? "pointer" : "default",
                    fontSize: 13,
                  }}
                >
                  ▶
                </button>
              )}
            </div>

            {/* Tabs (MATCH/FUN/TRAINING/DÉFIS) */}
            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", overflowX: "auto" }}>
              {TOP_TABS.map((tt) => (
                <GoldPill
                  key={tt.key}
                  active={topTab === tt.key}
                  onClick={() => setTopTab(tt.key)}
                  style={{ padding: "7px 10px", borderRadius: 14 }}
                >
                  {tt.label}
                </GoldPill>
              ))}
            </div>
          </div>

          {/* CONTENU */}
          {content}
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, T }: { title: string; T: any }) {
  return (
    <div
      style={{
        fontSize: 12,
        fontWeight: 900,
        letterSpacing: 0.9,
        textTransform: "uppercase",
        color: T.accent,
        textShadow: `0 0 8px ${T.accent}, 0 0 16px ${T.accentGlow}`,
        marginBottom: 10,
      }}
    >
      {title}
    </div>
  );
}

function SectionHint({ text }: { text: string }) {
  return <div style={{ marginTop: 10, fontSize: 12, color: "rgba(255,255,255,.65)" }}>{text}</div>;
}

function StatsPlayerAvatar({ profile, theme }: { profile: any; theme: any }) {
  return (
    <div style={{ position: "relative", width: 58, height: 58, overflow: "visible" }}>
      <div style={{ position: "absolute", inset: -6, pointerEvents: "none" }}>
        <ProfileStarRing size={70} score={0} theme={theme} />
      </div>
      <div
        style={{
          width: 58,
          height: 58,
          borderRadius: 999,
          overflow: "hidden",
          boxShadow: `0 0 0 2px ${theme?.primary}55, 0 0 18px ${theme?.primary}22`,
          background: "rgba(0,0,0,.35)",
        }}
      >
        <ProfileAvatar profile={profile} size={58} />
      </div>
    </div>
  );
}

function KpiTile({ label, value }: { label: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: "linear-gradient(180deg, rgba(22,23,28,.92), rgba(17,18,22,.92))",
        border: "1px solid rgba(255,255,255,.10)",
        padding: 12,
      }}
    >
      <div
        style={{
          fontSize: 11,
          fontWeight: 900,
          letterSpacing: 0.5,
          textTransform: "uppercase",
          color: "rgba(255,255,255,.65)",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 20, fontWeight: 950, color: "#fff", marginTop: 4 }}>{value}</div>
    </div>
  );
}
