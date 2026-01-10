// ============================================
// src/pages/petanque/PetanqueTournamentCreate.tsx
// TOURNOI PÉTANQUE — création ONLINE (nécessite login Supabase)
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { createPetanqueTournamentOnline } from "../../lib/petanque/petanqueTournamentsApi";

export default function PetanqueTournamentCreate({ go }: any) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, d: string) => d);

  const [name, setName] = React.useState("Tournoi Pétanque");
  const [targetScore, setTargetScore] = React.useState(13);
  const [visibility, setVisibility] = React.useState<"public" | "private">("public");
  const [playersText, setPlayersText] = React.useState("Équipe A\nÉquipe B\nÉquipe C\nÉquipe D");
  const [status, setStatus] = React.useState("");

  async function create() {
    setStatus("");
    try {
      const players = playersText
        .split("\n")
        .map((x) => x.trim())
        .filter(Boolean);

      if (players.length < 2) {
        setStatus("Ajoute au moins 2 équipes/joueurs.");
        return;
      }

      const tour = await createPetanqueTournamentOnline({
        name: name.trim() || "Tournoi Pétanque",
        targetScore: Math.max(1, Math.floor(Number(targetScore) || 13)),
        visibility,
        players,
      });

      go("petanque_tournament_view", { id: tour.id });
    } catch (e: any) {
      setStatus(e?.message || "Erreur création tournoi");
    }
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

      <div style={{ marginTop: 12, fontWeight: 950, fontSize: 18, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
        {t("petanque.tournaments.create.header", "CRÉER UN TOURNOI")}
      </div>

      <div style={{ display: "grid", gap: 10, marginTop: 12, maxWidth: 520 }}>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du tournoi"
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            outline: "none",
            fontWeight: 800,
          }}
        />

        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={targetScore as any}
            onChange={(e) => setTargetScore(Number(e.target.value))}
            type="number"
            min={1}
            style={{
              width: 140,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              color: theme.text,
              outline: "none",
              fontWeight: 800,
            }}
          />
          <div style={{ alignSelf: "center", opacity: 0.85 }}>Score cible</div>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setVisibility("public")}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: `1px solid ${theme.borderSoft}`,
              background: visibility === "public" ? theme.primary : theme.card,
              color: visibility === "public" ? "#000" : theme.text,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Public
          </button>
          <button
            onClick={() => setVisibility("private")}
            style={{
              borderRadius: 999,
              padding: "10px 12px",
              border: `1px solid ${theme.borderSoft}`,
              background: visibility === "private" ? theme.primary : theme.card,
              color: visibility === "private" ? "#000" : theme.text,
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            Privé
          </button>
        </div>

        <textarea
          value={playersText}
          onChange={(e) => setPlayersText(e.target.value)}
          rows={8}
          style={{
            padding: 10,
            borderRadius: 12,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            outline: "none",
            fontWeight: 800,
            lineHeight: 1.35,
          }}
        />

        <button
          onClick={create}
          style={{
            borderRadius: 999,
            padding: "12px 14px",
            border: "none",
            fontWeight: 950,
            background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
            color: "#1b1508",
            cursor: "pointer",
          }}
        >
          Créer
        </button>

        {status ? <div style={{ color: "#ff6b6b", fontWeight: 900 }}>{status}</div> : null}
      </div>
    </div>
  );
}
