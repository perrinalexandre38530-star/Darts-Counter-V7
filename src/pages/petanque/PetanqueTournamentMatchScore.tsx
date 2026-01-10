// ============================================
// src/pages/petanque/PetanqueTournamentMatchScore.tsx
// TOURNOI PÉTANQUE — saisie score ONLINE (nécessite login Supabase)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  listPetanqueMatches,
  submitPetanqueMatchScore,
  type PetanqueTournamentMatch,
} from "../../lib/petanque/petanqueTournamentsApi";

export default function PetanqueTournamentMatchScore({ go, params }: any) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, d: string) => d);

  const tournamentId = String(params?.tournamentId || "");
  const matchId = String(params?.matchId || "");

  const [m, setM] = React.useState<PetanqueTournamentMatch | null>(null);
  const [a, setA] = React.useState<number>(0);
  const [b, setB] = React.useState<number>(0);
  const [status, setStatus] = React.useState<string>("");

  const load = React.useCallback(async () => {
    setStatus("");
    if (!tournamentId || !matchId) return;
    try {
      const all = await listPetanqueMatches(tournamentId);
      const one = all.find((x) => String(x.id) === String(matchId)) ?? null;
      setM(one);
      setA(Number(one?.a_score ?? 0));
      setB(Number(one?.b_score ?? 0));
    } catch (e: any) {
      setStatus(e?.message || "Erreur chargement match");
    }
  }, [tournamentId, matchId]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function submit() {
    setStatus("");
    try {
      const aa = Math.max(0, Math.floor(Number(a) || 0));
      const bb = Math.max(0, Math.floor(Number(b) || 0));
      await submitPetanqueMatchScore({ matchId, a_score: aa, b_score: bb });
      setStatus("Score enregistré ✅");
      await load();
    } catch (e: any) {
      setStatus(e?.message || "Erreur enregistrement score");
    }
  }

  if (!tournamentId || !matchId) {
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
        onClick={() => go("petanque_tournament_view", { id: tournamentId })}
        style={{
          borderRadius: 12,
          padding: "8px 10px",
          border: `1px solid ${theme.borderSoft}`,
          background: theme.card,
          color: theme.text,
          cursor: "pointer",
        }}
      >
        ← Tournoi
      </button>

      <div style={{ marginTop: 12, fontWeight: 950, fontSize: 16, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
        {m ? `${m.a_name} vs ${m.b_name}` : t("common.loading", "Chargement…")}
      </div>

      <div style={{ marginTop: 14, display: "flex", gap: 10, maxWidth: 420 }}>
        <input
          type="number"
          value={a as any}
          onChange={(e) => setA(Number(e.target.value))}
          style={{
            width: 120,
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            fontWeight: 900,
            textAlign: "center",
          }}
        />
        <div style={{ alignSelf: "center", fontWeight: 900, opacity: 0.8 }}>-</div>
        <input
          type="number"
          value={b as any}
          onChange={(e) => setB(Number(e.target.value))}
          style={{
            width: 120,
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            fontWeight: 900,
            textAlign: "center",
          }}
        />
      </div>

      <button
        onClick={submit}
        style={{
          marginTop: 14,
          borderRadius: 999,
          padding: "12px 14px",
          border: "none",
          fontWeight: 950,
          background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
          color: "#1b1508",
          cursor: "pointer",
        }}
      >
        {t("petanque.tournaments.submitScore", "Enregistrer le score")}
      </button>

      {status ? <div style={{ marginTop: 10, fontWeight: 900, color: status.includes("✅") ? theme.primary : "#ff6b6b" }}>{status}</div> : null}
    </div>
  );
}
