// =======================================================
// src/pages/X01PlayOnline.tsx
// X01 ONLINE (UI unifiée ScoreInputHub)
// - Utilise useX01OnlineV3 (moteur + réseau via callbacks parent)
// - Même logique de saisie que X01OnlinePlayV3 : Keypad / Cible / Presets
// - "Valider" = terminer la visite (compléter en MISS) => next player
// =======================================================

import React from "react";

import type { X01ConfigV3 } from "../types/x01v3";
import { useX01OnlineV3 } from "../hooks/useX01OnlineV3";

import ScoreInputHub from "../components/ScoreInputHub";
import { DuelHeaderCompact } from "../components/DuelHeaderCompact";
import X01LegOverlayV3 from "../components/x01v3/X01LegOverlayV3";

import { useTheme } from "../contexts/ThemeContext";
import type { Dart as UIDart } from "../lib/types";

type Props = {
  role: "host" | "guest";
  config: X01ConfigV3;
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
  const { theme } = useTheme();

  // ====================================================
  // MOTEUR ONLINE
  // ====================================================
  const online = useX01OnlineV3({
    role,
    meta: {
      lobbyId: meta.lobbyId,
      matchId: meta.matchId,
      createdAt: Date.now(),
      hostId: "",
    },
    config,
    onSendCommand,
    onSendSnapshot,
  });

  const { engine } = online;
  const { state, liveStatsByPlayer, activePlayerId, scores, status, startNextLeg } = engine;

  // ====================================================
  // TURN gating
  // ====================================================
  const localPlayerId = online.getLocalPlayerId();
  const isLocalTurn = !!localPlayerId && localPlayerId === activePlayerId;

  // ====================================================
  // UI input state (ScoreInputHub)
  // ====================================================
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);

  const currentThrow: UIDart[] = React.useMemo(() => {
    const darts = (state as any)?.visit?.darts;
    if (!Array.isArray(darts)) return [];
    return darts.map((d: any) => {
      const seg = Number(d?.segment ?? 0) || 0;
      const mulRaw = Number(d?.multiplier ?? 1) || 1;
      const mul: 1 | 2 | 3 = mulRaw === 2 ? 2 : mulRaw === 3 ? 3 : 1;
      return { v: seg, mult: seg === 0 ? 1 : mul };
    });
  }, [state]);

  const pushDart = React.useCallback(
    (seg: number, mul: number) => {
      if (!isLocalTurn) return;
      online.sendLocalThrow({ segment: seg, multiplier: mul as any });
    },
    [online, isLocalTurn]
  );

  return (
    <div className={`x01-play-v3-page theme-${theme.id}`}>
      <header className="x01-header">
        <DuelHeaderCompact
          // @ts-expect-error: adapter aux props réels
          players={config.players}
          scores={scores}
          currentSet={(state as any).currentSet}
          currentLeg={(state as any).currentLeg}
          activePlayerId={activePlayerId}
          onExit={onExit}
          online
          role={role}
        />
      </header>

      <main className="x01-main">
        {/* Ici, on garde la page volontairement légère : le gros rendu ONLINE est dans X01OnlinePlayV3.
            Cette page sert de "Play" réutilisable quand le parent gère le WS. */}
        <section style={{ padding: 12 }}>
          {(config.players || []).map((p: any) => {
            const isActive = p.id === activePlayerId;
            const score = scores[p.id] ?? (config as any).startScore ?? 501;
            const avg3 = (() => {
              const live = (liveStatsByPlayer as any)?.[p.id];
              if (!live || live.dartsThrown === 0) return 0;
              return (live.totalScore / live.dartsThrown) * 3;
            })();
            return (
              <div
                key={p.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "10px 12px",
                  marginBottom: 8,
                  borderRadius: 14,
                  background: isActive
                    ? "linear-gradient(180deg, rgba(255,214,106,.95), rgba(233,169,61,.92))"
                    : "rgba(255,255,255,.06)",
                  color: isActive ? "#221600" : "#f5f5f7",
                  border: "1px solid rgba(255,255,255,.12)",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: "rgba(0,0,0,.55)",
                    }}
                  >
                    {p.avatarDataUrl ? (
                      <img
                        src={p.avatarDataUrl}
                        alt=""
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "100%",
                          height: "100%",
                          display: "grid",
                          placeItems: "center",
                          fontWeight: 900,
                          opacity: 0.7,
                        }}
                      >
                        {(p.name || "J").slice(0, 2).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div>
                    <div style={{ fontWeight: 900, letterSpacing: 0.2 }}>{p.name || "Joueur"}</div>
                    <div style={{ fontSize: 11, opacity: 0.75, fontWeight: 800 }}>Avg3: {avg3.toFixed(1)}</div>
                  </div>
                </div>

                <div style={{ fontWeight: 1000, fontSize: 18 }}>{score}</div>
              </div>
            );
          })}
        </section>
      </main>

      <footer className="x01-keypad-footer">
        <ScoreInputHub
          currentThrow={currentThrow}
          multiplier={multiplier}
          disabled={!isLocalTurn}
          onSimple={() => setMultiplier(1)}
          onDouble={() => setMultiplier(2)}
          onTriple={() => setMultiplier(3)}
          onBackspace={() => {
            if (!isLocalTurn) return;
            online.sendLocalUndo();
          }}
          onCancel={() => {
            if (!isLocalTurn) return;
            online.sendLocalUndo();
          }}
          onNumber={(n) => {
            if (!isLocalTurn) return;
            if (n === 0) pushDart(0, 0);
            else pushDart(n, multiplier);
            setMultiplier(1);
          }}
          onBull={() => {
            if (!isLocalTurn) return;
            const mul: 1 | 2 = multiplier === 2 ? 2 : 1;
            pushDart(25, mul);
            setMultiplier(1);
          }}
          onValidate={() => {
            if (!isLocalTurn) return;
            online.sendForceNextPlayer();
          }}
          onDirectDart={(d) => {
            if (!isLocalTurn) return;
            if (d.v === 0) return pushDart(0, 0);
            if (d.v === 25) return pushDart(25, d.mult === 2 ? 2 : 1);
            pushDart(d.v, d.mult);
          }}
          showPlaceholders
        />
      </footer>

      <X01LegOverlayV3
        open={status === "leg_end" || status === "set_end"}
        config={config}
        state={state}
        liveStatsByPlayer={liveStatsByPlayer}
        onNextLeg={startNextLeg}
      />
    </div>
  );
}
