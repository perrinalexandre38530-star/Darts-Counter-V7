import React from "react";
import type { Store } from "../lib/types";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import tickerCompetitions from "../assets/tickers/ticker_competitions.png";
import leagueWatermark from "../assets/ui/competition_league_watermark.png";
import tournamentWatermark from "../assets/ui/competition_tournament_watermark.png";

// Page d'entrée COMPÉTITIONS : menu local épuré.
// Le sport actif reste imposé par GameSelect, mais il n'est plus affiché en annotation.

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

function CompetitionHeader({ onBack }: { onBack: () => void }) {
  return (
    <div
      style={{
        position: "relative",
        margin: "0 0 22px",
        width: "100%",
      }}
    >
      <img
        src={tickerCompetitions}
        alt="Compétitions"
        draggable={false}
        style={{
          display: "block",
          width: "100%",
          maxWidth: "100%",
          height: "auto",
          maxHeight: 118,
          objectFit: "contain",
          borderRadius: 16,
          boxShadow: "0 14px 42px rgba(0,0,0,.62), 0 0 26px rgba(183,255,0,.16)",
          userSelect: "none",
        }}
      />

      <div style={{ position: "absolute", left: 10, top: 10, zIndex: 5 }}>
        <BackDot onClick={onBack} size={40} title="Retour" />
      </div>
    </div>
  );
}

function InfoContent({ kind, sportLabel }: { kind: "league" | "tournament"; sportLabel: string }) {
  if (kind === "league") {
    return (
      <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
        <p style={{ margin: 0 }}>
          Une ligue / championnat sert à organiser une compétition longue en <b>{sportLabel}</b> : classement, journées, matchs aller simple ou aller/retour.
        </p>
        <p style={{ margin: 0 }}>
          Le parcours guidé te fera choisir le type local/online, le format solo/équipe, les participants, puis les règles adaptées au sport actif.
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
      <p style={{ margin: 0 }}>
        Un tournoi sert à créer une compétition courte en <b>{sportLabel}</b> : élimination directe, poules, poules + phase finale ou formats compatibles.
      </p>
      <p style={{ margin: 0 }}>
        Le parcours guidé reprend les réglages existants, mais les découpe étape par étape pour éviter une configuration trop chargée.
      </p>
    </div>
  );
}

function CompetitionCard({
  tag,
  title,
  tone,
  watermark,
  onClick,
  info,
}: {
  tag: string;
  title: string;
  tone: "gold" | "pink";
  watermark: string;
  onClick: () => void;
  info: React.ReactNode;
}) {
  const accent = tone === "gold" ? "#f7c85c" : "#ff7fe2";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onClick();
      }}
      style={{
        position: "relative",
        overflow: "hidden",
        width: "100%",
        textAlign: "left",
        border: `1px solid ${accent}55`,
        borderRadius: 18,
        padding: "18px 16px 16px",
        minHeight: 128,
        color: "white",
        background:
          tone === "gold"
            ? "radial-gradient(130% 120% at 0% 0%, rgba(247,200,92,.20), transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))"
            : "radial-gradient(130% 120% at 0% 0%, rgba(255,127,226,.18), transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))",
        boxShadow: `0 18px 45px rgba(0,0,0,.55), 0 0 22px ${accent}22`,
        cursor: "pointer",
        WebkitTapHighlightColor: "transparent",
      }}
    >
      <img
        src={watermark}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position: "absolute",
          right: -48,
          top: "50%",
          width: 190,
          height: 190,
          objectFit: "contain",
          opacity: 0.34,
          pointerEvents: "none",
          transform: "translateY(-50%) rotate(-7deg)",
          filter: `drop-shadow(0 0 18px ${accent}44)`,
          userSelect: "none",
        }}
      />

      <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
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
            textTransform: "uppercase",
          }}
        >
          {tag}
        </span>
        <span
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
          style={{ display: "inline-flex", position: "relative", zIndex: 4 }}
        >
          <InfoDot title={tag} size={35} color={accent} glow={`${accent}77`} content={info} />
        </span>
      </div>

      <div
        style={{
          position: "relative",
          zIndex: 2,
          marginTop: 18,
          fontSize: 16,
          lineHeight: 1.12,
          fontWeight: 950,
          letterSpacing: 0.1,
          paddingRight: 42,
        }}
      >
        {title}
      </div>

    </div>
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
    configMode: "guided",
  });

  return (
    <div style={{ padding: 18, paddingBottom: 108, color: "white" }}>
      <CompetitionHeader onBack={() => go("games")} />

      <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
        <CompetitionCard
          tag="LIGUE / CHAMPIONNAT"
          title={`Créer une ligue ${label}`}
          tone="gold"
          watermark={leagueWatermark}
          info={<InfoContent kind="league" sportLabel={label} />}
          onClick={() => go("tournament_create", createParams("league"))}
        />
        <CompetitionCard
          tag="TOURNOI"
          title={`Créer un tournoi ${label}`}
          tone="pink"
          watermark={tournamentWatermark}
          info={<InfoContent kind="tournament" sportLabel={label} />}
          onClick={() => go("tournament_create", createParams("tournament"))}
        />
      </div>
    </div>
  );
}
