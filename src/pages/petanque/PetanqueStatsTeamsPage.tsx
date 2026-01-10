// =============================================================
// src/pages/petanque/PetanqueStatsTeamsPage.tsx
// ✅ Page dédiée "STATS ÉQUIPES (Pétanque)" — même look Darts (scaffold)
// =============================================================

import React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

export default function PetanqueStatsTeamsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const title = t("petanque.stats.teams.title", "STATS ÉQUIPES") + " (Pétanque)";

  return (
    <div style={S.page(theme)}>
      <div style={S.topRow}>
        <button style={S.backBtn(theme)} onClick={() => go("petanque_stats", {})}>
          ← Retour
        </button>
      </div>

      <div style={S.title(theme)}>{title}</div>
      <div style={S.sub(theme)}>
        {t(
          "petanque.stats.teams.subtitle",
          "Bilan par équipe : compositions, victoires/défaites, points, régularité."
        )}
      </div>

      <div style={S.block(theme)}>
        <div style={S.blockTitle(theme)}>À faire ensuite</div>
        <div style={S.blockText(theme)}>
          Scaffold prêt. Prochaine étape : calculer les équipes à partir des matchs
          Pétanque (singles / 2v2 / 3v3 / ffa3) et agréger :
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
            <li>Victoires / défaites / %</li>
            <li>Points marqués / encaissés / diff</li>
            <li>Meilleures compositions</li>
            <li>Séries (streaks)</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            style={S.cta(theme)}
            onClick={() => go("petanque_stats_history", {})}
          >
            Ouvrir l’historique
          </button>
          <button
            style={S.cta(theme)}
            onClick={() => go("petanque_stats_leaderboards", {})}
          >
            Ouvrir les classements
          </button>
        </div>
      </div>
    </div>
  );
}

const S = {
  page: (theme: any) => ({
    minHeight: "100vh",
    padding: 16,
    background: theme.bg,
    color: theme.text,
  }),
  topRow: { display: "flex", alignItems: "center", marginBottom: 8 },
  backBtn: (theme: any) => ({
    border: "1px solid rgba(202,255,0,.25)",
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.9)",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  }),
  title: (theme: any) => ({
    fontSize: 34,
    fontWeight: 1000,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
    color: theme.primary,
    textShadow: "0 0 14px rgba(205, 255, 0, 0.22)",
    marginTop: 4,
  }),
  sub: (theme: any) => ({
    marginTop: 6,
    color: theme.textSoft,
    fontSize: 13,
    lineHeight: 1.35,
    maxWidth: 680,
  }),
  block: (_theme: any) => ({
    marginTop: 14,
    borderRadius: 18,
    padding: 14,
    border: "1px solid rgba(202,255,0,.20)",
    background: "linear-gradient(180deg, rgba(30,35,55,78), rgba(10,10,18,86))",
    boxShadow: "0 10px 34px rgba(0,0,0,55), 0 0 18px rgba(202,255,0,06)",
  }),
  blockTitle: (theme: any) => ({
    fontWeight: 1000,
    letterSpacing: 1.1,
    textTransform: "uppercase" as const,
    color: theme.primary,
  }),
  blockText: (_theme: any) => ({
    marginTop: 8,
    color: "rgba(240,240,240,.86)",
    lineHeight: 1.45,
    fontSize: 13,
  }),
  cta: (theme: any) => ({
    border: "1px solid rgba(202,255,0,.35)",
    background: "rgba(0,0,0,.18)",
    color: theme.primary,
    borderRadius: 999,
    padding: "10px 14px",
    fontWeight: 1000,
    letterSpacing: 0.8,
    cursor: "pointer",
  }),
};
