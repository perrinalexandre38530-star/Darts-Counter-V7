import React from "react";
import type { Store } from "../lib/types";

// Page d'entrée COMPÉTITIONS : volontairement locale par défaut.
// Le ONLINE reste un flux séparé via le menu Online, avec un raccourci clair ici.

type Props = {
  store: Store;
  update?: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
  source?: "local" | "online";
  params?: any;
};

const DARTS_MODES = new Set(["darts", "x01", "cricket", "killer", "shanghai", "golf", "clock", "scram", "warfare", "battle_royale", "territories", "capital", "batard", "five_lives"]);

function normalizeCompetitionSport(value: any): string {
  const raw = String(value || "darts").toLowerCase().trim();
  if (!raw || DARTS_MODES.has(raw)) return "darts";
  if (raw === "baby-foot" || raw === "baby_foot" || raw === "foosball") return "babyfoot";
  if (raw === "ping-pong" || raw === "tabletennis" || raw === "table_tennis") return "pingpong";
  if (raw === "dice" || raw === "dice_game") return "dicegame";
  return raw;
}

function sportLabel(sport: string): string {
  const s = normalizeCompetitionSport(sport);
  if (s === "darts") return "FLÉCHETTES";
  if (s === "babyfoot") return "BABY-FOOT";
  if (s === "petanque") return "PÉTANQUE";
  if (s === "pingpong") return "PING-PONG";
  if (s === "molkky") return "MÖLKKY";
  if (s === "dicegame") return "DÉS";
  return s.toUpperCase();
}

function pickActiveSport(store: Store, params?: any): string {
  const forced = params?.forceMode || params?.sport || params?.sportId;
  const fromStore = (store as any)?.activeSport || (store as any)?.sport || (store as any)?.currentSport;
  return normalizeCompetitionSport(forced || fromStore || "darts");
}

function CompetitionCard({
  tag,
  title,
  text,
  tone,
  onClick,
}: {
  tag: string;
  title: string;
  text: string;
  tone: "gold" | "pink";
  onClick: () => void;
}) {
  const accent = tone === "gold" ? "#f7c85c" : "#ff7fe2";
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        width: "100%",
        textAlign: "left",
        border: `1px solid ${accent}55`,
        borderRadius: 18,
        padding: "18px 16px",
        color: "white",
        background:
          tone === "gold"
            ? "radial-gradient(120% 120% at 0% 0%, rgba(247,200,92,.20), transparent 56%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))"
            : "radial-gradient(120% 120% at 0% 0%, rgba(255,127,226,.18), transparent 56%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))",
        boxShadow: `0 18px 45px rgba(0,0,0,.55), 0 0 22px ${accent}22`,
        cursor: "pointer",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
        <span
          style={{
            display: "inline-flex",
            padding: "4px 12px",
            borderRadius: 999,
            border: `1px solid ${accent}77`,
            color: accent,
            background: "rgba(0,0,0,.35)",
            fontSize: 12,
            fontWeight: 950,
            letterSpacing: 0.4,
          }}
        >
          {tag}
        </span>
        <span style={{ color: accent, fontWeight: 950, fontSize: 18 }}>›</span>
      </div>
      <div style={{ marginTop: 12, fontSize: 19, lineHeight: 1.05, fontWeight: 1000, letterSpacing: 0.2 }}>{title}</div>
      <div style={{ marginTop: 8, color: "rgba(255,255,255,.78)", fontSize: 14, lineHeight: 1.25, fontWeight: 650 }}>{text}</div>
    </button>
  );
}

export default function TournamentsHome({ store, go, params }: Props) {
  const activeSport = pickActiveSport(store, params);
  const label = sportLabel(activeSport);

  const createParams = (competitionKind: "league" | "tournament") => ({
    forceMode: activeSport,
    sport: activeSport,
    source: "local",
    competitionKind,
  });

  return (
    <div style={{ padding: 18, paddingBottom: 108, color: "white" }}>
      <div
        style={{
          borderRadius: 22,
          padding: 18,
          border: "1px solid rgba(180,255,0,.35)",
          background: "linear-gradient(180deg, rgba(18,18,24,.98), rgba(5,5,8,.99))",
          boxShadow: "0 22px 60px rgba(0,0,0,.65)",
        }}
      >
        <h1
          style={{
            margin: 0,
            textAlign: "center",
            color: "#b7ff00",
            fontSize: "clamp(28px, 7vw, 40px)",
            lineHeight: 0.95,
            fontWeight: 1000,
            letterSpacing: 0.6,
          }}
        >
          COMPÉTITIONS
        </h1>
        <p style={{ margin: "12px 0 0", color: "#b7ff00", fontSize: 14.5, lineHeight: 1.25, fontWeight: 650 }}>
          Crée une compétition locale pour le sport actif : <b>{label}</b>.
        </p>
        <p style={{ margin: "6px 0 0", color: "rgba(255,255,255,.72)", fontSize: 13.5, lineHeight: 1.25 }}>
          Le choix du sport vient de Jeux / GameSelect : ici tu ne verras pas de tournoi baby-foot si tu es en fléchettes, ni l’inverse.
        </p>
      </div>

      <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
        <CompetitionCard
          tag="LIGUE / CHAMPIONNAT"
          title={`Créer une ligue ${label}`}
          text="Classement, journées, matchs aller/retour et suivi championnat en local."
          tone="gold"
          onClick={() => go("tournament_create", createParams("league"))}
        />
        <CompetitionCard
          tag="TOURNOI"
          title={`Créer un tournoi ${label}`}
          text="Bracket, poules + KO, élimination simple/double selon le sport actif."
          tone="pink"
          onClick={() => go("tournament_create", createParams("tournament"))}
        />
      </div>

      <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr", marginTop: 14 }}>
        <button
          type="button"
          onClick={() => go("tournament_list", { forceMode: activeSport, sport: activeSport, source: "local" })}
          style={{
            border: "1px solid rgba(255,255,255,.14)",
            borderRadius: 999,
            padding: "13px 10px",
            color: "white",
            background: "linear-gradient(180deg, rgba(255,255,255,.08), rgba(255,255,255,.03))",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          MES LOCALES
        </button>
        <button
          type="button"
          onClick={() => go("online", { section: "competitions", forceMode: activeSport, sport: activeSport })}
          style={{
            border: "1px solid rgba(79,180,255,.45)",
            borderRadius: 999,
            padding: "13px 10px",
            color: "white",
            background: "linear-gradient(180deg, rgba(79,180,255,.16), rgba(255,255,255,.03))",
            fontWeight: 950,
            cursor: "pointer",
          }}
        >
          CRÉER ONLINE
        </button>
      </div>
    </div>
  );
}
