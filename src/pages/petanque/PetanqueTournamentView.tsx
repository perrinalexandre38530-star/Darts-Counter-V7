// ============================================
// src/pages/petanque/PetanqueTournamentView.tsx
// TOURNOI PÉTANQUE — vue ONLINE (code partage + liste matchs)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  getPetanqueTournamentById,
  listPetanqueMatches,
  type PetanqueTournament,
  type PetanqueTournamentMatch,
} from "../../lib/petanque/petanqueTournamentsApi";

export default function PetanqueTournamentView({ go, params }: any) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, d: string) => d);

  const id = String(params?.id || params?.tournamentId || "");
  const [tour, setTour] = React.useState<PetanqueTournament | null>(null);
  const [matches, setMatches] = React.useState<PetanqueTournamentMatch[]>([]);
  const [err, setErr] = React.useState("");
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!id) return;
    setErr("");
    setLoading(true);
    try {
      const T = await getPetanqueTournamentById(id);
      const M = await listPetanqueMatches(id);
      setTour(T);
      setMatches(M);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement tournoi");
    } finally {
      setLoading(false);
    }
  }, [id]);

  React.useEffect(() => {
    load();
  }, [load]);

  if (!id) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: theme.bg, color: theme.text }}>
        <button onClick={() => go("petanque_tournaments")}>← Tournois</button>
        <div style={{ marginTop: 12, fontWeight: 950 }}>Paramètres manquants</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <button
        onClick={() => go("petanque_tournaments")}
        style={{
          borderRadius: 12,
          padding: "8px 10px",
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          color: theme.text,
          cursor: "pointer",
        }}
      >
        ← Tournois
      </button>

      {loading ? (
        <div style={{ marginTop: 12, fontWeight: 950, color: theme.primary }}>Chargement…</div>
      ) : err ? (
        <div style={{ marginTop: 12, color: "#ff6b6b", fontWeight: 900 }}>{err}</div>
      ) : tour ? (
        <>
          <div style={{ marginTop: 12, fontWeight: 950, fontSize: 18, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
            {tour.name}
          </div>

          <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.85 }}>
            Code: <b style={{ letterSpacing: 1.4 }}>{tour.invite_code}</b> • Cible: {tour.target_score} • {tour.visibility}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
            <div style={{ fontWeight: 950, opacity: 0.9 }}>{t("petanque.tournaments.matches", "Matchs")}</div>

            {matches.map((m) => {
              const done = m.status === "finished";
              return (
                <button
                  key={m.id}
                  onClick={() => go("petanque_tournament_match_score", { tournamentId: tour.id, matchId: m.id })}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    borderRadius: 16,
                    padding: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: theme.card,
                    color: theme.text,
                    cursor: "pointer",
                    opacity: m.b_name === "BYE" ? 0.6 : 1,
                  }}
                >
                  <div style={{ fontWeight: 950, color: theme.primary, textTransform: "uppercase" }}>
                    Round {m.round} — {m.a_name} vs {m.b_name}
                  </div>
                  <div style={{ marginTop: 6, fontSize: 12.5, opacity: 0.85 }}>
                    {done ? (
                      <>
                        Score: <b>{m.a_score}</b> - <b>{m.b_score}</b>
                      </>
                    ) : (
                      <>En attente • Cliquer pour saisir le score</>
                    )}
                  </div>
                </button>
              );
            })}

            {!matches.length ? <div style={{ opacity: 0.75 }}>Aucun match.</div> : null}

            <button
              onClick={load}
              style={{
                marginTop: 10,
                borderRadius: 999,
                padding: "10px 12px",
                border: `1px solid ${theme.borderSoft}`,
                background: "transparent",
                color: theme.text,
                cursor: "pointer",
                fontWeight: 900,
              }}
            >
              {t("common.refresh", "Rafraîchir")}
            </button>
          </div>
        </>
      ) : (
        <div style={{ marginTop: 12, opacity: 0.85 }}>Introuvable.</div>
      )}
    </div>
  );
}
