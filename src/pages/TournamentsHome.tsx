import { pickLegacyLocalizedText } from "../i18n/legacyLocalizedText";
import React from "react";
import { PageAdBanner } from "../monetization/AdSlot";
import type { Store } from "../lib/types";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import tickerCompetitions from "../assets/tickers/ticker_competitions.png";
import { FOOT_TICKERS } from "./foot/footTickers";
import { useLang, type Lang } from "../contexts/LangContext";
import leagueWatermark from "../assets/ui/competition_league_watermark.png";
import tournamentWatermark from "../assets/ui/competition_tournament_watermark.png";
import resumeWatermark from "../assets/ui/competition_resume_watermark.png";
import consultWatermark from "../assets/ui/competition_consult_watermark.png";

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

function tr3(lang: Lang, fr: string, en: string, es: string): string {
  return pickLegacyLocalizedText(lang, fr, en, es);
}

function sportLabel(sport: string, lang: Lang): string {
  const s = normalizeCompetitionSport(sport);
  if (s === "darts") return tr3(lang, "FLÉCHETTES", "DARTS", "DARDOS");
  if (s === "babyfoot") return tr3(lang, "BABY-FOOT", "FOOSBALL", "FUTBOLÍN");
  if (s === "petanque") return tr3(lang, "PÉTANQUE", "PÉTANQUE", "PETANCA");
  if (s === "pingpong") return "PING-PONG";
  if (s === "molkky") return "MÖLKKY";
  if (s === "dicegame") return tr3(lang, "DÉS", "DICE", "DADOS");
  return s.toUpperCase();
}

function pickActiveSport(store: Store, params?: any): string {
  const forced = params?.forceMode || params?.sport || params?.sportId;
  const fromStore = (store as any)?.activeSport || (store as any)?.sport || (store as any)?.currentSport;
  return normalizeCompetitionSport(forced || fromStore || "darts");
}

function smartBack(go: Props["go"], fallbackTab: any = "home", fallbackParams?: any) {
  // Navigation interne uniquement : history.back() pouvait revenir sur un hash vide/non géré
  // et provoquer l'écran noir. On utilise donc un fallback applicatif sûr.
  go(fallbackTab, fallbackParams);
}

function CompetitionHeader({ onBack, tickerSrc = tickerCompetitions, backTitle, alt }: { onBack: () => void; tickerSrc?: string; backTitle: string; alt: string }) {
  return (
    <div
      style={{
        position: "relative",
        margin: "0 0 22px",
        width: "100%",
      }}
    >
      <img
        src={tickerSrc}
        alt={alt}
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
        <BackDot onClick={onBack} size={40} title={backTitle} />
      </div>
    </div>
  );
}

function InfoContent({ kind, sportLabel, lang }: { kind: "league" | "tournament"; sportLabel: string; lang: Lang }) {
  if (kind === "league") {
    return (
      <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
        <p style={{ margin: 0 }}>
          {tr3(
            lang,
            "Une ligue / championnat sert à organiser une compétition longue : classement, journées, matchs aller simple ou aller/retour.",
            "A league / championship is designed for a longer competition: standings, rounds, single round-robin or home-and-away matches.",
            "Una liga / campeonato sirve para organizar una competición larga: clasificación, jornadas, ida o ida y vuelta."
          )}{" "}
          <b>{sportLabel}</b>
        </p>
        <p style={{ margin: 0 }}>
          {tr3(
            lang,
            "Le parcours guidé te fera choisir le type local/online, le format solo/équipe, les participants, puis les règles adaptées au sport actif.",
            "The guided setup lets you choose local/online play, solo/team format, participants, then the rules for the active sport.",
            "La configuración guiada te permite elegir local/online, formato individual/equipo, participantes y después las reglas del deporte activo."
          )}
        </p>
      </div>
    );
  }
  return (
    <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
      <p style={{ margin: 0 }}>
        {tr3(
          lang,
          "Un tournoi sert à créer une compétition courte : élimination directe, poules, poules + phase finale ou formats compatibles.",
          "A tournament creates a shorter competition: knockout, groups, groups + finals, or other compatible formats.",
          "Un torneo crea una competición corta: eliminación directa, grupos, grupos + fase final u otros formatos compatibles."
        )}{" "}
        <b>{sportLabel}</b>
      </p>
      <p style={{ margin: 0 }}>
        {tr3(
          lang,
          "Le parcours guidé reprend les réglages existants, mais les découpe étape par étape pour éviter une configuration trop chargée.",
          "The guided setup uses the existing options but splits them into steps to keep configuration clear.",
          "La configuración guiada usa las opciones existentes, pero las divide paso a paso para que sea más clara."
        )}
      </p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        margin: "4px 2px 0",
        display: "flex",
        alignItems: "center",
        gap: 8,
        color: "rgba(255,255,255,.82)",
        fontSize: 12,
        fontWeight: 1000,
        letterSpacing: .8,
        textTransform: "uppercase",
      }}
    >
      <span
        style={{
          width: 22,
          height: 3,
          borderRadius: 999,
          background: "linear-gradient(90deg, #c9ff00, rgba(201,255,0,0))",
          boxShadow: "0 0 12px rgba(201,255,0,.55)",
        }}
      />
      {children}
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
  tone: "gold" | "pink" | "blue" | "green";
  watermark: string;
  onClick: () => void;
  info: React.ReactNode;
}) {
  const accent =
    tone === "gold" ? "#f7c85c" :
    tone === "blue" ? "#4fb4ff" :
    tone === "green" ? "#7fe2a9" :
    "#ff7fe2";
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
            : tone === "blue"
            ? "radial-gradient(130% 120% at 0% 0%, rgba(79,180,255,.18), transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))"
            : tone === "green"
            ? "radial-gradient(130% 120% at 0% 0%, rgba(127,226,169,.18), transparent 58%), linear-gradient(180deg, rgba(24,24,30,.98), rgba(9,9,12,.99))"
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
          fontSize: 15,
          lineHeight: 1.10,
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
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string, es: string) => pickLegacyLocalizedText(lang, fr, en, es), [lang]);
  const activeSport = pickActiveSport(store, params);
  const label = sportLabel(activeSport, lang);
  const isFoot = activeSport === "foot" || activeSport === "football";
  const competitionTicker = isFoot ? FOOT_TICKERS.competition[0] : tickerCompetitions;
  const resumeWatermark2 = isFoot ? FOOT_TICKERS.competition[2] : resumeWatermark;
  const consultWatermark2 = isFoot ? FOOT_TICKERS.competition[3] : consultWatermark;
  const leagueWatermark2 = isFoot ? FOOT_TICKERS.competition[1] : leagueWatermark;
  const tournamentWatermark2 = isFoot ? FOOT_TICKERS.competition[2] : tournamentWatermark;
  type EntryMode = "menu" | "create" | "resume" | "consult";

  function initialMode(): EntryMode {
    const raw = String(params?.entry || params?.action || params?.view || "").toLowerCase();
    if (raw === "create" || raw === "creer" || raw === "créer") return "create";
    if (raw === "resume" || raw === "reprendre" || raw === "active") return "resume";
    if (raw === "consult" || raw === "consulter" || raw === "history" || raw === "historique") return "consult";
    return "menu";
  }

  const [entryMode, setEntryMode] = React.useState<EntryMode>(() => initialMode());

  const createParams = (competitionKind: "league" | "tournament") => ({
    forceMode: activeSport,
    sport: activeSport,
    source: "local",
    competitionKind,
    configMode: "guided",
  });

  const listParams = (competitionKind: "league" | "tournament", statusFilter: "active" | "done") => ({
    forceMode: activeSport,
    sport: activeSport,
    source: "local",
    competitionKind,
    filterKind: competitionKind,
    statusFilter,
    filter: statusFilter,
    view: statusFilter === "active" ? "resume" : "history",
  });

  const back = () => {
    if (entryMode !== "menu") {
      setEntryMode("menu");
      return;
    }
    smartBack(go, "home");
  };

  return (
    <div style={{ padding: 18, paddingBottom: 108, color: "white" }}>
      <CompetitionHeader onBack={back} tickerSrc={competitionTicker} backTitle={L("Retour", "Back", "Volver")} alt={L("Compétitions", "Competitions", "Competiciones")} />
      <PageAdBanner placement="competitions" slotKey={`page-competitions-${entryMode}-under-header`} />

      {entryMode === "menu" ? (
        <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
          <CompetitionCard
            tag={L("CRÉER", "CREATE", "CREAR")}
            title={L("Création d’une Compétition", "Create a Competition", "Crear una competición")}
            tone="gold"
            watermark={leagueWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Crée une nouvelle ligue / championnat ou un nouveau tournoi pour le sport actif :", "Create a new league / championship or tournament for the active sport:", "Crea una nueva liga / campeonato o un nuevo torneo para el deporte activo:")} <b>{label}</b>.
                </p>
              </div>
            }
            onClick={() => setEntryMode("create")}
          />

          <CompetitionCard
            tag={L("REPRENDRE", "RESUME", "REANUDAR")}
            title={L("Reprendre une Compétition en cours", "Resume an Ongoing Competition", "Reanudar una competición en curso")}
            tone="blue"
            watermark={resumeWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Retrouve uniquement les ligues et tournois non terminés : brouillons, en cours, ou compétitions à continuer.", "Show only unfinished leagues and tournaments: drafts, ongoing events, or competitions to continue.", "Muestra solo ligas y torneos sin terminar: borradores, en curso o competiciones pendientes.")}
                </p>
              </div>
            }
            onClick={() => setEntryMode("resume")}
          />

          <CompetitionCard
            tag={L("CONSULTER", "VIEW", "CONSULTAR")}
            title={L("Consulter Historique des compétitions terminées", "View Completed Competitions", "Consultar competiciones terminadas")}
            tone="green"
            watermark={consultWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Consulte uniquement les ligues et tournois terminés pour revoir l’historique, les classements et les résultats.", "View completed leagues and tournaments to review history, standings and results.", "Consulta ligas y torneos terminados para revisar el historial, las clasificaciones y los resultados.")}
                </p>
              </div>
            }
            onClick={() => setEntryMode("consult")}
          />
        </div>
      ) : null}

      {entryMode === "create" ? (
        <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
          <SectionLabel>{L("Créer", "Create", "Crear")}</SectionLabel>

          <CompetitionCard
            tag={L("LIGUE / CHAMPIONNAT", "LEAGUE / CHAMPIONSHIP", "LIGA / CAMPEONATO")}
            title={`${L("Créer une ligue", "Create a league", "Crear una liga")} ${label}`}
            tone="gold"
            watermark={leagueWatermark2}
            info={<InfoContent kind="league" sportLabel={label} lang={lang} />}
            onClick={() => go("tournament_create", createParams("league"))}
          />
          <CompetitionCard
            tag={L("TOURNOI", "TOURNAMENT", "TORNEO")}
            title={`${L("Créer un tournoi", "Create a tournament", "Crear un torneo")} ${label}`}
            tone="pink"
            watermark={tournamentWatermark2}
            info={<InfoContent kind="tournament" sportLabel={label} lang={lang} />}
            onClick={() => go("tournament_create", createParams("tournament"))}
          />
        </div>
      ) : null}

      {entryMode === "resume" ? (
        <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
          <SectionLabel>{L("Reprendre", "Resume", "Reanudar")}</SectionLabel>

          <CompetitionCard
            tag={L("LIGUES EN COURS", "ONGOING LEAGUES", "LIGAS EN CURSO")}
            title={`${L("Reprendre une ligue", "Resume a league", "Reanudar una liga")} ${label}`}
            tone="gold"
            watermark={leagueWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Affiche les ligues / championnats non terminés pour", "Show unfinished leagues / championships for", "Muestra ligas / campeonatos sin terminar para")} <b>{label}</b>.
                </p>
              </div>
            }
            onClick={() => go("tournament_list", listParams("league", "active"))}
          />
          <CompetitionCard
            tag={L("TOURNOIS EN COURS", "ONGOING TOURNAMENTS", "TORNEOS EN CURSO")}
            title={`${L("Reprendre un tournoi", "Resume a tournament", "Reanudar un torneo")} ${label}`}
            tone="pink"
            watermark={tournamentWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Affiche les tournois non terminés pour", "Show unfinished tournaments for", "Muestra torneos sin terminar para")} <b>{label}</b>.
                </p>
              </div>
            }
            onClick={() => go("tournament_list", listParams("tournament", "active"))}
          />
        </div>
      ) : null}

      {entryMode === "consult" ? (
        <div style={{ display: "grid", gap: 12, marginTop: 4 }}>
          <SectionLabel>{L("Consulter", "View", "Consultar")}</SectionLabel>

          <CompetitionCard
            tag={L("HISTORIQUE LIGUES", "LEAGUE HISTORY", "HISTORIAL DE LIGAS")}
            title={`${L("Ligues terminées", "Completed leagues", "Ligas terminadas")} ${label}`}
            tone="gold"
            watermark={leagueWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Consulte les ligues / championnats terminés pour", "View completed leagues / championships for", "Consulta ligas / campeonatos terminados para")} <b>{label}</b>.
                </p>
              </div>
            }
            onClick={() => go("tournament_list", listParams("league", "done"))}
          />
          <CompetitionCard
            tag={L("HISTORIQUE TOURNOIS", "TOURNAMENT HISTORY", "HISTORIAL DE TORNEOS")}
            title={`${L("Tournois terminés", "Completed tournaments", "Torneos terminados")} ${label}`}
            tone="pink"
            watermark={tournamentWatermark2}
            info={
              <div style={{ display: "grid", gap: 10, lineHeight: 1.35 }}>
                <p style={{ margin: 0 }}>
                  {L("Consulte les tournois terminés pour", "View completed tournaments for", "Consulta torneos terminados para")} <b>{label}</b>.
                </p>
              </div>
            }
            onClick={() => go("tournament_list", listParams("tournament", "done"))}
          />
        </div>
      ) : null}
    </div>
  );
}
