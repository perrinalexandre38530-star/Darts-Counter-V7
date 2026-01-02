// =======================================================
// src/pages/X01PlayOnline.tsx
// Partie X01 ONLINE (moteur V3 + synchro ONLINE)
// - Support multi-joueurs (jusqu’à 10)
// - Ordre de tir ALÉATOIRE imposé par l’hôte
// - Sets / Legs X01 V3
// - UI style X01PlayV3 (header compact, scoreboard, keypad)
// - Synchro ONLINE via useX01OnlineV3
// =======================================================

import React from "react";
import { useX01OnlineV3 } from "../hooks/useX01OnlineV3";
import type { X01ConfigV3 } from "../types/x01v3";

import Keypad from "../components/Keypad";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import EndOfLegOverlay from "../components/EndOfLegOverlay";
import trophyCup from "../ui_assets/trophy-cup.png";

type Props = {
  role: "host" | "guest";
  config: X01ConfigV3;              // Config V3 avec players[] (ordre déjà randomisé par l’hôte)
  meta: {
    lobbyId: string;
    matchId: string;
  };
  onSendCommand: (env: any) => void;
  onSendSnapshot: (env: any) => void;
  onExit: () => void;
};

export default function X01PlayOnline({
  role,
  config,
  meta,
  onSendCommand,
  onSendSnapshot,
  onExit,
}: Props) {
  
  // ====================================================
  // MOTEUR ONLINE
  // ====================================================
  const online = useX01OnlineV3({
    role,
    meta,
    config,
    onSendCommand,
    onSendSnapshot,
  });

  const engine = online.engine;
  const state = engine.state;

  const localPlayerId = online.getLocalPlayerId();
  const isLocalTurn = state.turn.playerId === localPlayerId;

  // ====================================================
  // FIN DE LEG / MATCH
  // ====================================================
  const [endedLeg, setEndedLeg] = React.useState<any>(null);

  React.useEffect(() => {
    if (state.legResult && !endedLeg) {
      setEndedLeg(state.legResult);
    }
  }, [state.legResult, endedLeg]);

  function handleCloseLegBanner() {
    setEndedLeg(null);
  }

  // ====================================================
  // THROW LOCALEMENT + réseau
  // ====================================================
  function handleKeypad(input: { segment: number; multiplier: number }) {
    if (!isLocalTurn) return;
    online.sendLocalThrow({
      segment: input.segment,
      multiplier: input.multiplier,
    });
  }

  // ====================================================
  // HEADER X01 style compact
  // ====================================================
  const turnIndex = state.turn.index; // index joueur courant
  const activeId = state.turn.playerId;

  const players = config.players.map((p) => {
    const score = state.scores[p.id] ?? config.startValue;
    const isActive = p.id === activeId;
    return {
      id: p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl ?? null,
      score,
      isActive,
    };
  });

  // ====================================================
  // RENDER
  // ====================================================
  return (
    <div
      className="container"
      style={{
        paddingBottom: 110,
        color: "#f5f5f7",
      }}
    >
      {/* ---------------------------------- */}
      {/* HEADER COMPACT (avatars + sets/legs) */}
      {/* ---------------------------------- */}
      <DuelHeaderCompact
        players={players}
        sets={{
          currentSet: state.currentSetIndex + 1,
          totalSets: config.sets,
        }}
        legs={{
          currentLeg: state.currentLegIndex + 1,
          totalLegs: config.legsPerSet,
        }}
        onExit={onExit}
        online={true}
        role={role}
      />

      {/* ---------------------------------- */}
      {/* SCOREBOARD simple (style V3) */}
      {/* ---------------------------------- */}
      <div
        style={{
          marginTop: 12,
          padding: 12,
          borderRadius: 12,
          background: "rgba(10,10,10,0.65)",
          border: "1px solid rgba(255,255,255,0.12)",
          fontSize: 13,
        }}
      >
        {players.map((p, idx) => (
          <div
            key={p.id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "6px 4px",
              marginBottom: 2,
              borderRadius: 8,
              background: p.isActive
                ? "linear-gradient(180deg,#ffd56a,#e9a93d)"
                : "rgba(255,255,255,0.06)",
              color: p.isActive ? "#221600" : "#f5f5f7",
              fontWeight: p.isActive ? 800 : 500,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: "50%",
                  overflow: "hidden",
                  background: "rgba(0,0,0,0.6)",
                }}
              >
                {p.avatarDataUrl ? (
                  <img
                    src={p.avatarDataUrl}
                    alt=""
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "100%",
                      height: "100%",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 14,
                      fontWeight: 800,
                      opacity: 0.6,
                    }}
                  >
                    {p.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <span>{p.name}</span>
            </div>

            <b style={{ fontSize: 16 }}>{p.score}</b>
          </div>
        ))}
      </div>

      {/* ---------------------------------- */}
      {/* KEYBOARD DARTS (throw) */}
      {/* ---------------------------------- */}
      <div style={{ marginTop: 16 }}>
        <Keypad
          disabled={!isLocalTurn}
          onThrow={(seg, mul) => handleKeypad({ segment: seg, multiplier: mul })}
        />
      </div>

      {/* ---------------------------------- */}
      {/* OVERLAY FIN DE LEG */}
      {/* ---------------------------------- */}
      {endedLeg && (
        <EndOfLegOverlay
          result={endedLeg}
          players={players}
          trophy={trophyCup}
          onClose={handleCloseLegBanner}
        />
      )}
    </div>
  );
}
