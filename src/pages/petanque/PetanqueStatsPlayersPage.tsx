// =============================================================
// src/pages/petanque/PetanqueStatsPlayersPage.tsx
// ✅ Page dédiée "STATS JOUEURS (Pétanque)" — même look Darts (shell simple + cards)
// ⚠️ Pour l’instant: scaffold (pas encore d’agrégateur pétanque).
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

export default function PetanqueStatsPlayersPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active =
    profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const title =
    t("petanque.stats.players.title", "STATS JOUEURS") + " (Pétanque)";

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
          "petanque.stats.players.subtitle",
          "Bilan par joueur : victoires/défaites, points, séries, régularité."
        )}
      </div>

      <div style={S.kpiRow}>
        <div style={S.kpiCard(theme, false)} onClick={() => {}}>
          <div style={S.kpiLabel(theme)}>Joueur actif</div>
          <div style={S.kpiValue(theme)}>{active?.name ?? "—"}</div>
        </div>
        <div style={S.kpiCard(theme, false)} onClick={() => {}}>
          <div style={S.kpiLabel(theme)}>Profils</div>
          <div style={S.kpiValue(theme)}>{profiles.length}</div>
        </div>
      </div>

      <div style={S.block(theme)}>
        <div style={S.blockTitle(theme)}>À faire ensuite</div>
        <div style={S.blockText(theme)}>
          Cette page est prête (layout identique). Prochaine étape : brancher
          l’historique Pétanque normalisé et calculer :
          <ul style={{ marginTop: 10, marginBottom: 0, paddingLeft: 18 }}>
            <li>Victoires / défaites / %</li>
            <li>Points marqués / encaissés / diff</li>
            <li>Top séries (mènes)</li>
            <li>Régularité</li>
          </ul>
        </div>

        <div style={{ display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" }}>
          <button
            style={S.cta(theme)}
            onClick={() => go("petanque_stats_history", { profileId: active?.id ?? null })}
          >
            Voir l’historique Pétanque
          </button>
          <button
            style={S.cta(theme)}
            onClick={() => go("petanque_stats_leaderboards", { profileId: active?.id ?? null })}
          >
            Voir les classements
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
  topRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
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
  kpiRow: {
    display: "flex",
    gap: 10,
    marginTop: 14,
    flexWrap: "wrap" as const,
  },
  kpiCard: (theme: any, active: boolean) => ({
    flex: "1 1 180px",
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${active ? "rgba(202,255,0,.55)" : "rgba(202,255,0,.22)"}`,
    background: "linear-gradient(180deg, rgba(30,35,55,78), rgba(10,10,18,86))",
    boxShadow: "0 10px 34px rgba(0,0,0,55), 0 0 18px rgba(202,255,0,06)",
    cursor: "default",
  }),
  kpiLabel: (_theme: any) => ({
    fontSize: 12,
    opacity: 0.8,
    fontWeight: 800,
  }),
  kpiValue: (theme: any) => ({
    marginTop: 6,
    fontSize: 18,
    fontWeight: 1000,
    color: "rgba(210,255,40,.92)",
  }),
  block: (theme: any) => ({
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
