// ============================================
// src/pages/DepartementsPlay.tsx
// TERRITORIES — PLAY (V1 jouable)
// - Carte SVG FR cliquable
// - ScoreInputHub (Keypad / Cible / Presets)
// - Teams Gold / Pink
// - Capture par touches (3 touches = capture)
// ============================================

import React from "react";
import PageHeader from "../components/PageHeader";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ScoreInputHub from "../components/ScoreInputHub";

import tickerTerritories from "../assets/tickers/ticker-departements.png";

// 👉 ta carte SVG FR
import FranceMapSvg from "../assets/maps/france_departements.svg";

import { playSound } from "../lib/sound";

// --------------------------------------------
// Types
// --------------------------------------------
type Team = "gold" | "pink";

type TerritoryState = {
  touches: number;
  owner: Team | null;
};

type Config = {
  teamSize: number;
  selectedIds: string[];
  teamsById: Record<string, number>;
  rounds: number;
  objective: number;
  mapId: string;
};

// --------------------------------------------
// Constantes
// --------------------------------------------
const TOUCHES_TO_CAPTURE = 3;

const TEAM_ORDER: Team[] = ["gold", "pink"];

const TEAM_COLORS: Record<Team, { label: string; color: string }> = {
  gold: { label: "TEAM Gold", color: "#FFD778" },
  pink: { label: "TEAM Pink", color: "#FF6FB1" },
};

const INFO_TEXT = `
TERRITORIES — Règles

But du jeu
- Capturer des territoires sur la carte.
- Une team gagne lorsqu’elle possède X territoires (objectif).

Déroulement
- Les teams jouent à tour de rôle.
- À chaque tour, le joueur lance 3 fléchettes.
- Chaque fléchette = 1 touche sur le territoire sélectionné.

Capture
- Un territoire est capturé à 3 touches.
- Une fois capturé, il appartient à la TEAM (Gold ou Pink).

Conditions de victoire
- Atteindre l’objectif de territoires
- Ou fin des rounds (la team avec le plus de territoires gagne)
`;

// --------------------------------------------

export default function DepartementsPlay(props: any) {
  const cfg: Config =
    (props?.params?.config as Config) ||
    JSON.parse(localStorage.getItem("dc_modecfg_departements") || "{}");

  // ------------------------------------------
  // State
  // ------------------------------------------
  const [round, setRound] = React.useState(1);
  const [teamIndex, setTeamIndex] = React.useState(0);
  const currentTeam: Team = TEAM_ORDER[teamIndex % TEAM_ORDER.length];

  const [territories, setTerritories] = React.useState<Record<string, TerritoryState>>({});
  const [activeTerritory, setActiveTerritory] = React.useState<string | null>(null);

  // ScoreInputHub
  const [currentThrow, setCurrentThrow] = React.useState<any[]>([]);
  const multiplier: 1 | 2 | 3 = 1; // non utilisé ici mais requis par l’API

  // ------------------------------------------
  // Helpers
  // ------------------------------------------
  function nextTurn() {
    setCurrentThrow([]);
    setActiveTerritory(null);

    setTeamIndex((i) => {
      const next = i + 1;
      if (next % TEAM_ORDER.length === 0) {
        setRound((r) => r + 1);
      }
      return next;
    });
  }

  function addTouch(territoryId: string) {
    setTerritories((prev) => {
      const cur = prev[territoryId] || { touches: 0, owner: null };
      if (cur.owner) return prev;

      const touches = cur.touches + 1;
      if (touches >= TOUCHES_TO_CAPTURE) {
        playSound("score-180"); // optionnel
        return {
          ...prev,
          [territoryId]: { touches, owner: currentTeam },
        };
      }

      return {
        ...prev,
        [territoryId]: { touches, owner: null },
      };
    });
  }

  function validateTurn() {
    if (!activeTerritory) return;

    currentThrow.forEach(() => {
      addTouch(activeTerritory);
    });

    nextTurn();
  }

  // ------------------------------------------
  // Derived
  // ------------------------------------------
  const scoreByTeam = React.useMemo(() => {
    const res: Record<Team, number> = { gold: 0, pink: 0 };
    Object.values(territories).forEach((t) => {
      if (t.owner) res[t.owner]++;
    });
    return res;
  }, [territories]);

  const selectionValid =
    !!activeTerritory && currentThrow.length > 0 && currentThrow.length <= 3;

  // ------------------------------------------
  // Render
  // ------------------------------------------
  return (
    <div className="page">
      <PageHeader
        title={null}
        tickerSrc={tickerTerritories}
        centerTicker
        left={<BackDot onClick={() => window.history.back()} />}
        right={<InfoDot title="Règles TERRITORIES" content={INFO_TEXT} />}
      />

      {/* HEADER INFOS */}
      <div
        style={{
          padding: "10px 14px",
          borderRadius: 16,
          background: "rgba(10,12,24,0.96)",
          border: "1px solid rgba(255,255,255,0.12)",
          marginBottom: 10,
        }}
      >
        <div style={{ fontSize: 12, opacity: 0.8 }}>
          France — ROUND {round}/{cfg.rounds}
        </div>

        <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between" }}>
          <div>
            À jouer :
            <span
              style={{
                marginLeft: 6,
                fontWeight: 900,
                color: TEAM_COLORS[currentTeam].color,
              }}
            >
              {TEAM_COLORS[currentTeam].label}
            </span>
          </div>

          <div>
            Objectif : {cfg.objective} territoires
          </div>
        </div>

        <div style={{ marginTop: 6, display: "flex", gap: 12 }}>
          <div style={{ color: TEAM_COLORS.gold.color }}>
            Gold : {scoreByTeam.gold}/{cfg.objective}
          </div>
          <div style={{ color: TEAM_COLORS.pink.color }}>
            Pink : {scoreByTeam.pink}/{cfg.objective}
          </div>
        </div>
      </div>

      {/* MAP */}
      <div
        style={{
          position: "relative",
          borderRadius: 18,
          background: "#000",
          border: "1px solid rgba(255,255,255,0.12)",
          padding: 10,
        }}
      >
        <FranceMapSvg
          className="territories-map"
          onClick={(e: any) => {
            const id = e.target?.id;
            if (!id) return;
            setActiveTerritory(id);
          }}
        />

        {/* Overlay simple */}
        {activeTerritory && (
          <div
            style={{
              position: "absolute",
              bottom: 10,
              left: 10,
              padding: "6px 10px",
              borderRadius: 999,
              background: TEAM_COLORS[currentTeam].color,
              color: "#000",
              fontWeight: 900,
              fontSize: 12,
            }}
          >
            Cible : {activeTerritory}
          </div>
        )}
      </div>

      {/* SCORE INPUT */}
      <ScoreInputHub
        currentThrow={currentThrow}
        multiplier={multiplier}
        onSimple={() =>
          setCurrentThrow((t) => (t.length < 3 ? [...t, { v: 1 }] : t))
        }
        onDouble={() =>
          setCurrentThrow((t) => (t.length < 3 ? [...t, { v: 1 }] : t))
        }
        onTriple={() =>
          setCurrentThrow((t) => (t.length < 3 ? [...t, { v: 1 }] : t))
        }
        onBull={() =>
          setCurrentThrow((t) => (t.length < 3 ? [...t, { v: 1 }] : t))
        }
        onUndo={() =>
          setCurrentThrow((t) => t.slice(0, -1))
        }
        onValidate={validateTurn}
        canValidate={selectionValid}
      />
    </div>
  );
}
