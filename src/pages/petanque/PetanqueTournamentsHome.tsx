// ============================================
// src/pages/petanque/PetanqueTournamentsHome.tsx
// TOURNOIS PÉTANQUE — home ONLINE (liste + rejoindre + créer)
// UX calquée sur tes pages “Shell / cards”
// ============================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import {
  listPetanqueTournamentsOnline,
  getPetanqueTournamentByInvite,
  type PetanqueTournament,
} from "../../lib/petanque/petanqueTournamentsApi";

export default function PetanqueTournamentsHome({ go }: any) {
  const { theme } = useTheme();
  const lang = useLang();
  const t = (lang as any)?.t ?? ((_: string, d: string) => d);

  const [list, setList] = React.useState<PetanqueTournament[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [invite, setInvite] = React.useState("");
  const [err, setErr] = React.useState("");

  const load = React.useCallback(async () => {
    setErr("");
    setLoading(true);
    try {
      const items = await listPetanqueTournamentsOnline();
      setList(items);
    } catch (e: any) {
      setErr(e?.message || "Erreur chargement tournois");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function join() {
    setErr("");
    const code = invite.trim().toUpperCase();
    if (!code) return;
    try {
      const tour = await getPetanqueTournamentByInvite(code);
      go("petanque_tournament_view", { id: tour.id });
    } catch (e: any) {
      setErr(e?.message || "Code invalide");
    }
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <button
          onClick={() => go("petanque_menu")}
          style={{
            borderRadius: 12,
            padding: "8px 10px",
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
          }}
        >
          ← Pétanque
        </button>

        <div style={{ flex: 1, textAlign: "center" }}>
          <div style={{ fontWeight: 950, fontSize: 18, color: theme.primary, textShadow: `0 0 12px ${theme.primary}66` }}>
            {t("petanque.tournaments.title", "TOURNOIS")}
          </div>
          <div style={{ fontSize: 12.5, opacity: 0.8 }}>
            {t("petanque.tournaments.subtitle", "Création & saisie des scores en ligne")}
          </div>
        </div>

        <div style={{ width: 90 }} />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        <div style={{ display: "flex", gap: 10 }}>
          <input
            value={invite}
            onChange={(e) => setInvite(e.target.value)}
            placeholder={t("petanque.tournaments.join.placeholder", "Code tournoi (ex: A7K2Q9)")}
            style={{
              flex: 1,
              padding: 10,
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              color: theme.text,
              outline: "none",
              textTransform: "uppercase",
              letterSpacing: 1.2,
              fontWeight: 800,
            }}
          />
          <button
            onClick={join}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: "none",
              fontWeight: 950,
              background: "linear-gradient(180deg,#ffc63a,#ffaf00)",
              color: "#1b1508",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t("petanque.tournaments.join.cta", "Rejoindre")}
          </button>
        </div>

        <button
          onClick={() => go("petanque_tournament_create")}
          style={{
            width: "100%",
            borderRadius: 18,
            padding: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            color: theme.text,
            cursor: "pointer",
            textAlign: "left",
            boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 900, letterSpacing: 0.8, color: theme.primary, textTransform: "uppercase" }}>
            {t("petanque.tournaments.create.title", "CRÉER UN TOURNOI")}
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
            {t("petanque.tournaments.create.subtitle", "Génère un code partageable et des matchs round 1.")}
          </div>
        </button>

        {err ? <div style={{ marginTop: 4, color: "#ff6b6b", fontWeight: 800 }}>{err}</div> : null}

        <div style={{ marginTop: 10, fontWeight: 950, opacity: 0.9 }}>
          {t("petanque.tournaments.list.title", "Tournois récents")}
        </div>

        {loading ? (
          <div style={{ opacity: 0.8 }}>{t("common.loading", "Chargement…")}</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {list.map((x) => (
              <button
                key={x.id}
                onClick={() => go("petanque_tournament_view", { id: x.id })}
                style={{
                  width: "100%",
                  borderRadius: 16,
                  padding: 14,
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  color: theme.text,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontWeight: 950, color: theme.primary, textTransform: "uppercase" }}>{x.name}</div>
                <div style={{ marginTop: 4, fontSize: 12, opacity: 0.85 }}>
                  Code: <b>{x.invite_code}</b> • Cible: {x.target_score} • {x.visibility}
                </div>
              </button>
            ))}
            {!list.length ? <div style={{ opacity: 0.75 }}>Aucun tournoi.</div> : null}
          </div>
        )}

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
    </div>
  );
}
