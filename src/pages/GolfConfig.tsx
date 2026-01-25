// @ts-nocheck
// =============================================================
// src/pages/GolfConfig.tsx
// GOLF — Config (PRO) alignée design X01/Killer (carrousels profils + bots)
// - Sélection joueurs via carrousel (profils locaux)
// - Sélection BOTS IA via carrousel (profils isBot + LS "dc_bots_v1")
// - Options PRO: 9/18, ordre trous, scoring, pénalité miss, grille, équipes
// =============================================================

import React, { useMemo, useState, useEffect } from "react";
import type { Store, Profile } from "../lib/types";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import tickerGolf from "../assets/tickers/ticker_golf.png";

type BotLevel = "easy" | "normal" | "hard";
type HoleOrderMode = "chronological" | "random";
type GolfScoringMode = "strokes" | "points";

export type PlayerLite = {
  id: string;
  name: string;
  avatarDataUrl?: any | null;
  avatarUrl?: any | null;
  isBot?: boolean;
  botLevel?: BotLevel | string;
};

export type GolfConfigPayload = {
  players: number; // compat (Play actuel)
  playersList?: PlayerLite[]; // futur / UI
  holes: 9 | 18;
  teamsEnabled: boolean;
  botsEnabled: boolean;
  botLevel: BotLevel;
  missStrokes: 4 | 5 | 6;
  holeOrderMode: HoleOrderMode;
  scoringMode: GolfScoringMode;
  showHoleGrid: boolean;
};

const LS_BOTS_KEY = "dc_bots_v1";

const INFO_TEXT = `GOLF (Darts) — règles

Principe
- 9 ou 18 trous.
- Au trou N, la cible est le numéro N.
- 3 flèches par joueur, puis on valide.

Scoring
- Strokes : 1/2/3 selon la flèche du 1er hit, sinon pénalité (4/5/6). Score bas gagne.
- Points : 3/2/1 selon la flèche du 1er hit, sinon 0. Score haut gagne.

Options
- Ordre des trous : chronologique ou aléatoire.
- Grille des trous : tableau récapitulatif en partie.
- Équipes (A/B) : total équipe = somme des joueurs (alternance 1/2).`;

function loadBotsFromLS(): PlayerLite[] {
  try {
    const raw = window.localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((b: any) => ({
        id: String(b?.id ?? ""),
        name: String(b?.name ?? "BOT"),
        avatarDataUrl: b?.avatarDataUrl ?? null,
        avatarUrl: b?.avatarUrl ?? null,
        isBot: true,
        botLevel: (b?.botLevel as any) ?? "normal",
      }))
      .filter((x: any) => x.id && x.name);
  } catch {
    return [];
  }
}

function Pill(props: {
  label: string;
  active?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  tone?: "primary" | "neutral";
}) {
  const { label, active, onClick, disabled } = props;
  const tone = props.tone ?? "neutral";
  const bg = active
    ? tone === "primary"
      ? "rgba(255,220,80,0.22)"
      : "rgba(255,255,255,0.10)"
    : "rgba(255,255,255,0.06)";
  const border = active
    ? tone === "primary"
      ? "1px solid rgba(255,220,80,0.65)"
      : "1px solid rgba(255,255,255,0.22)"
    : "1px solid rgba(255,255,255,0.10)";
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        border,
        background: bg,
        color: "#e9ecff",
        padding: "8px 12px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 800,
        letterSpacing: 0.4,
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? "not-allowed" : "pointer",
        boxShadow: active ? "0 0 16px rgba(255,220,80,0.25)" : "none",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

function AvatarTile(props: {
  p: PlayerLite;
  active: boolean;
  onToggle: () => void;
  accent: string;
}) {
  const { p, active, onToggle, accent } = props;
  return (
    <div
      role="button"
      onClick={onToggle}
      style={{
        minWidth: 120,
        maxWidth: 120,
        background: "transparent",
        border: "none",
        padding: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 6,
        flexShrink: 0,
        cursor: "pointer",
      }}
    >
      <div
        style={{
          width: 78,
          height: 78,
          borderRadius: "50%",
          overflow: "hidden",
          boxShadow: active ? `0 0 28px ${accent}aa` : "0 0 14px rgba(0,0,0,0.65)",
          background: active
            ? `radial-gradient(circle at 30% 20%, #fff8d0, ${accent})`
            : "#111320",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            overflow: "hidden",
            filter: active ? "none" : "grayscale(100%) brightness(0.55)",
            opacity: active ? 1 : 0.6,
            transition: "filter 0.2s ease, opacity 0.2s ease",
          }}
        >
          <ProfileAvatar
            profile={{
              id: p.id,
              name: p.name,
              avatarDataUrl: p.avatarDataUrl ?? null,
              avatarUrl: p.avatarUrl ?? null,
            }}
            size={78}
            ring={active ? "gold" : "none"}
          />
        </div>
      </div>

      <div
        style={{
          fontSize: 12,
          fontWeight: 900,
          color: active ? "#ffffff" : "rgba(220,225,255,0.72)",
          textAlign: "center",
          lineHeight: 1.05,
          width: 120,
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {p.name}
      </div>

      {p.isBot ? (
        <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.55)" }}>
          BOT
        </div>
      ) : (
        <div style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.35)" }}>
          JOUEUR
        </div>
      )}
    </div>
  );
}

export default function GolfConfig(props: { store?: Store; setTab?: any }) {
  const { t } = useLang() as any;
  const theme = useTheme() as any;

  const primary = theme?.primary ?? "#e5c85a";
  const cardBg = "rgba(14, 16, 30, 0.70)";

  const allProfiles: PlayerLite[] = useMemo(() => {
    const ps = (props?.store as any)?.profiles as Profile[] | undefined;
    if (!ps || !Array.isArray(ps)) return [];
    return ps.map((p: any) => ({
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      avatarUrl: p.avatarUrl ?? null,
      isBot: !!p.isBot,
      botLevel: p.botLevel ?? "normal",
    }));
  }, [props?.store]);

  const [botsFromLS, setBotsFromLS] = useState<PlayerLite[]>([]);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setBotsFromLS(loadBotsFromLS());
  }, []);

  const humanProfiles = useMemo(() => allProfiles.filter((p) => !p.isBot), [allProfiles]);
  const botProfiles = useMemo(() => {
    const fromStore = allProfiles.filter((p) => !!p.isBot);
    const byId = new Map<string, PlayerLite>();
    [...fromStore, ...(botsFromLS || [])].forEach((b) => {
      if (b?.id) byId.set(b.id, { ...b, isBot: true });
    });
    return Array.from(byId.values());
  }, [allProfiles, botsFromLS]);

  const [selectedHumanIds, setSelectedHumanIds] = useState<string[]>(() =>
    humanProfiles.slice(0, 2).map((p) => p.id)
  );
  const [botsEnabled, setBotsEnabled] = useState(false);
  const [selectedBotIds, setSelectedBotIds] = useState<string[]>(() => []);

  // PRO options
  const [holes, setHoles] = useState<9 | 18>(9);
  const [holeOrderMode, setHoleOrderMode] = useState<HoleOrderMode>("chronological");
  const [scoringMode, setScoringMode] = useState<GolfScoringMode>("strokes");
  const [missStrokes, setMissStrokes] = useState<4 | 5 | 6>(4);
  const [showHoleGrid, setShowHoleGrid] = useState(true);
  const [teamsEnabled, setTeamsEnabled] = useState(false);
  const [botLevel, setBotLevel] = useState<BotLevel>("normal");

  useEffect(() => {
    // sync default selection once profiles loaded
    if (selectedHumanIds.length === 0 && humanProfiles.length > 0) {
      setSelectedHumanIds(humanProfiles.slice(0, 2).map((p) => p.id));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [humanProfiles.length]);

  function toggle(list: string[], id: string, set: (v: string[]) => void) {
    set(list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  }

  const selectedPlayersList = useMemo(() => {
    const humans = humanProfiles.filter((p) => selectedHumanIds.includes(p.id));
    const bots = botsEnabled ? botProfiles.filter((p) => selectedBotIds.includes(p.id)) : [];
    return [...humans, ...bots];
  }, [humanProfiles, botProfiles, selectedHumanIds, selectedBotIds, botsEnabled]);

  const playersCount = Math.max(0, selectedPlayersList.length);
  const canStart = playersCount >= 2;

  const payload: GolfConfigPayload = {
    players: Math.max(2, Math.min(8, playersCount || 2)),
    playersList: selectedPlayersList.slice(0, 8),
    holes,
    teamsEnabled: teamsEnabled && playersCount >= 2,
    botsEnabled,
    botLevel,
    missStrokes,
    holeOrderMode,
    scoringMode,
    showHoleGrid,
  };

  function goBack() {
    if (props?.setTab) return props.setTab("games");
    window.history.back();
  }

  function start() {
    if (!canStart) return;
    if (props?.setTab) return props.setTab("golf_play", { config: payload });
  }

  return (
    <div className="page" style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      <PageHeader
        title="GOLF"
        tickerSrc={tickerGolf}
        left={<BackDot onClick={goBack} />}
        right={<InfoDot title="Règles GOLF" content={INFO_TEXT} />}
      />

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12 }}>
        {/* JOUEURS */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "20px 12px 16px",
            margin: "0 12px 16px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 900,
              color: primary,
              marginBottom: 10,
            }}
          >
            {t("config.players", "Joueurs")}
          </div>

          {humanProfiles.length === 0 ? (
            <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
              {t(
                "x01v3.noProfiles",
                "Aucun profil local. Tu peux créer des joueurs et des BOTS dans le menu Profils."
              )}
            </p>
          ) : (
            <>
              <div
                style={{
                  display: "flex",
                  gap: 18,
                  overflowX: "auto",
                  paddingBottom: 12,
                  marginBottom: 8,
                  paddingLeft: 24,
                  paddingRight: 8,
                  justifyContent: "flex-start",
                }}
                className="dc-scroll-thin"
              >
                {humanProfiles.map((p) => (
                  <AvatarTile
                    key={p.id}
                    p={p}
                    active={selectedHumanIds.includes(p.id)}
                    onToggle={() => toggle(selectedHumanIds, p.id, setSelectedHumanIds)}
                    accent={primary}
                  />
                ))}
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Pill
                  label={`${t("config.selected", "Sélection")}: ${selectedHumanIds.length}`}
                  active
                  tone="primary"
                />
                <Pill
                  label={t("config.select2", "Sélectionner 2")}
                  onClick={() => setSelectedHumanIds(humanProfiles.slice(0, 2).map((p) => p.id))}
                />
                <Pill
                  label={t("config.clear", "Vider")}
                  onClick={() => setSelectedHumanIds([])}
                  disabled={selectedHumanIds.length === 0}
                />
              </div>
            </>
          )}

          {/* Toggle bots */}
          <div style={{ height: 14 }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 12, fontWeight: 900, color: "rgba(240,245,255,0.78)" }}>
              {t("config.bots", "BOTS IA")}
            </div>
            <button
              type="button"
              onClick={() => setBotsEnabled((v) => !v)}
              style={{
                border: "1px solid rgba(255,255,255,0.14)",
                background: botsEnabled ? "rgba(255,220,80,0.18)" : "rgba(255,255,255,0.06)",
                color: "#e9ecff",
                padding: "8px 12px",
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              {botsEnabled ? t("common.on", "ON") : t("common.off", "OFF")}
            </button>
          </div>

          {botsEnabled && (
            <>
              <div style={{ height: 10 }} />

              {botProfiles.length === 0 ? (
                <p style={{ fontSize: 13, color: "#b3b8d0", marginBottom: 8 }}>
                  {t("x01v3.noBots", "Aucun BOT trouvé. Crée des BOTS dans Profils.")}
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: 18,
                    overflowX: "auto",
                    paddingBottom: 12,
                    marginBottom: 8,
                    paddingLeft: 24,
                    paddingRight: 8,
                  }}
                  className="dc-scroll-thin"
                >
                  {botProfiles.map((p) => (
                    <AvatarTile
                      key={p.id}
                      p={p}
                      active={selectedBotIds.includes(p.id)}
                      onToggle={() => toggle(selectedBotIds, p.id, setSelectedBotIds)}
                      accent={"#7cffef"}
                    />
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
                <Pill
                  label={`${t("config.selectedBots", "Bots")}: ${selectedBotIds.length}`}
                  active
                />
                <Pill
                  label={t("config.clear", "Vider")}
                  onClick={() => setSelectedBotIds([])}
                  disabled={selectedBotIds.length === 0}
                />
                <Pill label="Facile" active={botLevel === "easy"} onClick={() => setBotLevel("easy")} />
                <Pill
                  label="Normal"
                  active={botLevel === "normal"}
                  onClick={() => setBotLevel("normal")}
                  tone="primary"
                />
                <Pill label="Difficile" active={botLevel === "hard"} onClick={() => setBotLevel("hard")} />
              </div>
            </>
          )}
        </section>

        {/* RÈGLES */}
        <section
          style={{
            background: cardBg,
            borderRadius: 18,
            padding: "18px 12px 16px",
            margin: "0 12px 16px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.05)",
          }}
        >
          <div
            style={{
              fontSize: 12,
              textTransform: "uppercase",
              letterSpacing: 1,
              fontWeight: 900,
              color: primary,
              marginBottom: 12,
            }}
          >
            {t("config.rules", "Règles")}
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Pill label="9 trous" active={holes === 9} onClick={() => setHoles(9)} tone="primary" />
            <Pill label="18 trous" active={holes === 18} onClick={() => setHoles(18)} />
            <Pill
              label={t("golf.orderChrono", "Chronologique")}
              active={holeOrderMode === "chronological"}
              onClick={() => setHoleOrderMode("chronological")}
            />
            <Pill
              label={t("golf.orderRandom", "Aléatoire")}
              active={holeOrderMode === "random"}
              onClick={() => setHoleOrderMode("random")}
            />
          </div>

          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Pill
              label={t("golf.modeStrokes", "Strokes (score bas)")}
              active={scoringMode === "strokes"}
              onClick={() => setScoringMode("strokes")}
              tone="primary"
            />
            <Pill
              label={t("golf.modePoints", "Points (score haut)")}
              active={scoringMode === "points"}
              onClick={() => setScoringMode("points")}
            />
            <Pill label={`Pénalité miss: ${missStrokes}`} active tone="primary" />
            {[4, 5, 6].map((v) => (
              <Pill key={v} label={`${v}`} active={missStrokes === v} onClick={() => setMissStrokes(v as any)} />
            ))}
          </div>

          <div style={{ height: 10 }} />
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
            <Pill
              label={t("golf.teams", "Mode équipes")}
              active={teamsEnabled}
              onClick={() => setTeamsEnabled((x) => !x)}
            />
            <Pill
              label={t("golf.grid", "Grille trous")}
              active={showHoleGrid}
              onClick={() => setShowHoleGrid((x) => !x)}
            />
            <Pill
              label={`${t("config.totalPlayers", "Total joueurs")}: ${playersCount}`}
              active
              tone="primary"
            />
          </div>
        </section>

        {/* CTA */}
        <div style={{ padding: "0 12px 18px" }}>
          <button
            type="button"
            onClick={start}
            disabled={!canStart}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "14px 14px",
              border: "1px solid rgba(255,255,255,0.10)",
              background: canStart ? "rgba(255,220,80,0.22)" : "rgba(255,255,255,0.05)",
              color: canStart ? "#fff" : "rgba(255,255,255,0.45)",
              fontWeight: 950,
              letterSpacing: 0.6,
              cursor: canStart ? "pointer" : "not-allowed",
              boxShadow: canStart ? "0 10px 30px rgba(0,0,0,0.55)" : "none",
            }}
          >
            {t("config.start", "Démarrer la partie")}
          </button>

          {!canStart && (
            <div style={{ marginTop: 8, fontSize: 12, color: "rgba(255,255,255,0.55)" }}>
              {t("config.need2", "Sélectionne au moins 2 joueurs (humains et/ou bots).")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
