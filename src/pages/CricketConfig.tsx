// ============================================
// src/pages/CricketConfig.tsx
// Cricket — CONFIG (v1)
// ✅ Multi (2..4) conservé
// ✅ Teams (2v2) optionnel
// ✅ Ajout de BOTS (v1) pour compléter
// ✅ Ordre départ: choisi OU aléatoire
// ✅ maxRounds appliqué réellement (via engine)
// ✅ dartSetId (v1) stocké dans History/events
// ============================================

import React from "react";
import type { Profile } from "../lib/types";

export type CricketScoreMode = "points" | "no-points";
export type CricketStartOrder = "selected" | "random";
export type CricketGameMode = "solo" | "teams";

export type CricketConfigState = {
  selectedIds: string[]; // profils + bots
  bots: { id: string; name: string }[];
  scoreMode: CricketScoreMode;
  maxRounds: number;
  rotateFirstPlayer: boolean;
  startOrder: CricketStartOrder;
  mode: CricketGameMode; // solo vs teams
  // teams: A/B assignation simple
  teamsMap: Record<string, "A" | "B">;

  // dart sets (v1)
  dartSetId: string; // libre pour l’instant
};

const T = {
  card: "#121420",
  text: "#fff",
  textSoft: "rgba(255,255,255,0.7)",
  gold: "#F6C256",
  borderSoft: "rgba(255,255,255,0.08)",
};

type Props = {
  profiles: Profile[];
  value: CricketConfigState;
  onChange: (v: CricketConfigState) => void;
  onStart: () => void;
};

export default function CricketConfig({ profiles, value, onChange, onStart }: Props) {
  const selectedCount = value.selectedIds.length;

  const canStartSolo =
    selectedCount >= 2 && selectedCount <= 4;

  const canStartTeams =
    selectedCount === 4 &&
    // 2 in A and 2 in B
    Object.values(value.teamsMap).filter((x) => x === "A").length === 2 &&
    Object.values(value.teamsMap).filter((x) => x === "B").length === 2;

  const canStart = value.mode === "teams" ? canStartTeams : canStartSolo;

  const profileById = React.useMemo(() => {
    const m = new Map<string, Profile>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  }, [profiles]);

  function set(patch: Partial<CricketConfigState>) {
    onChange({ ...value, ...patch });
  }

  function toggleId(id: string) {
    set({
      selectedIds: (() => {
        const prev = value.selectedIds;
        const idx = prev.indexOf(id);
        if (idx !== -1) return prev.filter((x) => x !== id);
        if (prev.length >= 4) return prev;
        return [...prev, id];
      })(),
    });
  }

  function ensureTeamsMapForSelected(nextSelected: string[]) {
    const nextMap: Record<string, "A" | "B"> = { ...value.teamsMap };
    for (const id of Object.keys(nextMap)) {
      if (!nextSelected.includes(id)) delete nextMap[id];
    }
    // assignation auto si manque
    for (const id of nextSelected) {
      if (!nextMap[id]) nextMap[id] = "A";
    }
    return nextMap;
  }

  React.useEffect(() => {
    // keep teamsMap clean
    const tm = ensureTeamsMapForSelected(value.selectedIds);
    if (JSON.stringify(tm) !== JSON.stringify(value.teamsMap)) {
      set({ teamsMap: tm });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value.selectedIds.join("|")]);

  function addBot() {
    if (value.selectedIds.length >= 4) return;
    const n = value.bots.length + 1;
    const id = `bot_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const bot = { id, name: `BOT ${n}` };
    const nextSelected = [...value.selectedIds, id];
    const tm = ensureTeamsMapForSelected(nextSelected);
    set({
      bots: [...value.bots, bot],
      selectedIds: nextSelected,
      teamsMap: tm,
    });
  }

  function removeBot(id: string) {
    const nextBots = value.bots.filter((b) => b.id !== id);
    const nextSelected = value.selectedIds.filter((x) => x !== id);
    const tm = ensureTeamsMapForSelected(nextSelected);
    set({ bots: nextBots, selectedIds: nextSelected, teamsMap: tm });
  }

  const allPlayers = React.useMemo(() => {
    const botsAsProfiles = value.bots.map((b) => ({
      id: b.id,
      name: b.name,
      avatarDataUrl: null,
    })) as any as Profile[];
    return [...profiles, ...botsAsProfiles];
  }, [profiles, value.bots]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(circle at top, #1c2540 0, #050712 55%, #000 100%)`,
        color: T.text,
        padding: "16px 12px 92px",
        boxSizing: "border-box",
      }}
    >
      {/* HEADER */}
      <div style={{ marginBottom: 16 }}>
        <div
          style={{
            fontSize: 26,
            fontWeight: 900,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: T.gold,
            textShadow:
              "0 0 6px rgba(246,194,86,0.8), 0 0 18px rgba(246,194,86,0.6)",
          }}
        >
          CRICKET
        </div>
        <div style={{ fontSize: 13, marginTop: 4, color: T.textSoft }}>
          Sélectionne les joueurs et les options pour cette manche.
        </div>
      </div>

      {/* JOUEURS */}
      <div
        style={{
          borderRadius: 18,
          background: T.card,
          border: `1px solid ${T.borderSoft}`,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div
          style={{
            fontSize: 13,
            textTransform: "uppercase",
            letterSpacing: 1.2,
            color: T.textSoft,
            marginBottom: 6,
          }}
        >
          Joueurs ({value.selectedIds.length}/4)
        </div>

        <div style={{ fontSize: 12, color: T.textSoft, marginBottom: 10 }}>
          Mode solo: 2 à 4 joueurs. Mode équipes: <strong>4 joueurs</strong> (2v2).
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {allPlayers.map((p) => {
            const isSelected = value.selectedIds.includes(p.id);
            const isBot = String(p.id).startsWith("bot_");
            return (
              <div
                key={p.id}
                style={{
                  width: "calc(50% - 5px)",
                  borderRadius: 14,
                  border: `1px solid ${isSelected ? "rgba(246,194,86,0.55)" : T.borderSoft}`,
                  background: isSelected ? "rgba(246,194,86,0.10)" : "rgba(0,0,0,0.25)",
                  padding: 10,
                }}
                onClick={() => toggleId(p.id)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 42,
                      height: 42,
                      borderRadius: "50%",
                      background: "#0b1220",
                      border: `2px solid ${isSelected ? T.gold : "rgba(148,163,184,0.25)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontWeight: 900,
                      color: isSelected ? T.gold : "rgba(255,255,255,0.65)",
                      flexShrink: 0,
                    }}
                  >
                    {(p.name || "?")
                      .split(" ")
                      .filter(Boolean)
                      .map((s) => s[0])
                      .join("")
                      .toUpperCase()
                      .slice(0, 2)}
                  </div>

                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: 800,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {p.name}
                    </div>
                    <div style={{ fontSize: 11, color: T.textSoft }}>
                      {isSelected ? "Sélectionné" : "—"} {isBot ? " • BOT" : ""}
                    </div>
                  </div>

                  {isBot && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeBot(p.id);
                      }}
                      style={{
                        border: "none",
                        background: "rgba(255,255,255,0.08)",
                        color: "#fff",
                        borderRadius: 10,
                        padding: "6px 8px",
                        cursor: "pointer",
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Teams assignation */}
                {value.mode === "teams" && isSelected && (
                  <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
                    {(["A", "B"] as const).map((team) => {
                      const active = value.teamsMap[p.id] === team;
                      return (
                        <button
                          key={team}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            set({
                              teamsMap: { ...value.teamsMap, [p.id]: team },
                            });
                          }}
                          style={{
                            flex: 1,
                            padding: "6px 0",
                            borderRadius: 999,
                            border: active ? `1px solid ${T.gold}` : `1px solid ${T.borderSoft}`,
                            background: active ? "rgba(246,194,86,0.16)" : "rgba(0,0,0,0.25)",
                            color: active ? T.gold : T.textSoft,
                            fontSize: 12,
                            fontWeight: 800,
                            cursor: "pointer",
                          }}
                        >
                          Team {team}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
          <button
            type="button"
            onClick={addBot}
            disabled={value.selectedIds.length >= 4}
            style={{
              flex: 1,
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${T.borderSoft}`,
              background:
                value.selectedIds.length >= 4 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.35)",
              color: value.selectedIds.length >= 4 ? "rgba(255,255,255,0.45)" : "#fff",
              fontWeight: 800,
              cursor: value.selectedIds.length >= 4 ? "not-allowed" : "pointer",
            }}
          >
            + Ajouter BOT
          </button>

          <button
            type="button"
            onClick={() => set({ selectedIds: [], teamsMap: {} })}
            style={{
              padding: "10px 12px",
              borderRadius: 14,
              border: `1px solid ${T.borderSoft}`,
              background: "rgba(0,0,0,0.35)",
              color: T.textSoft,
              fontWeight: 800,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* OPTIONS */}
      <div
        style={{
          borderRadius: 18,
          background: T.card,
          border: `1px solid ${T.borderSoft}`,
          padding: 14,
          marginBottom: 14,
        }}
      >
        <div style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 1.2, color: T.textSoft, marginBottom: 10 }}>
          Options
        </div>

        {/* Mode: solo/teams */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>Mode de jeu</span>
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => set({ mode: "solo" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.mode === "solo" ? "rgba(246,194,86,0.20)" : "rgba(255,255,255,0.08)",
                color: value.mode === "solo" ? T.gold : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              SOLO
            </button>
            <button
              type="button"
              onClick={() => set({ mode: "teams" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.mode === "teams" ? "rgba(246,194,86,0.20)" : "rgba(255,255,255,0.08)",
                color: value.mode === "teams" ? T.gold : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              2v2
            </button>
          </div>
        </div>

        {/* Score mode */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>Mode de score</span>
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => set({ scoreMode: "points" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.scoreMode === "points" ? "rgba(34,197,94,0.25)" : "rgba(255,255,255,0.08)",
                color: value.scoreMode === "points" ? "#a7f3d0" : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              POINTS
            </button>
            <button
              type="button"
              onClick={() => set({ scoreMode: "no-points" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.scoreMode === "no-points" ? "rgba(251,191,36,0.20)" : "rgba(255,255,255,0.08)",
                color: value.scoreMode === "no-points" ? "#fde68a" : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              SANS
            </button>
          </div>
        </div>

        {/* maxRounds */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>Nombre max de tours</span>
          <div style={{ display: "inline-flex", gap: 6 }}>
            {[10, 15, 20].map((n) => {
              const active = value.maxRounds === n;
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => set({ maxRounds: n })}
                  style={{
                    width: 42,
                    height: 28,
                    borderRadius: 999,
                    border: active ? `1px solid ${T.gold}` : `1px solid ${T.borderSoft}`,
                    background: active ? "rgba(246,194,86,0.14)" : "rgba(0,0,0,0.35)",
                    color: active ? T.gold : T.textSoft,
                    fontWeight: 900,
                    cursor: "pointer",
                  }}
                >
                  {n}
                </button>
              );
            })}
          </div>
        </div>

        {/* rotate first player */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>
            Premier joueur tourne <span style={{ opacity: 0.7 }}>(à chaque nouvelle manche)</span>
          </span>
          <button
            type="button"
            onClick={() => set({ rotateFirstPlayer: !value.rotateFirstPlayer })}
            style={{
              width: 44,
              height: 24,
              borderRadius: 999,
              border: "none",
              background: value.rotateFirstPlayer ? "#22c55e" : "#4b5563",
              position: "relative",
              cursor: "pointer",
              padding: 2,
            }}
          >
            <div
              style={{
                position: "absolute",
                top: 2,
                bottom: 2,
                left: value.rotateFirstPlayer ? 22 : 2,
                width: 20,
                borderRadius: 999,
                background: "#0b1120",
                transition: "left 0.15s ease",
              }}
            />
          </button>
        </div>

        {/* start order */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, marginBottom: 10 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>Ordre de départ</span>
          <div style={{ display: "inline-flex", gap: 6 }}>
            <button
              type="button"
              onClick={() => set({ startOrder: "selected" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.startOrder === "selected" ? "rgba(246,194,86,0.20)" : "rgba(255,255,255,0.08)",
                color: value.startOrder === "selected" ? T.gold : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              CHOISI
            </button>
            <button
              type="button"
              onClick={() => set({ startOrder: "random" })}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: "none",
                background: value.startOrder === "random" ? "rgba(56,189,248,0.18)" : "rgba(255,255,255,0.08)",
                color: value.startOrder === "random" ? "#7dd3fc" : T.textSoft,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              ALÉA
            </button>
          </div>
        </div>

        {/* dartSetId (v1) */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13, color: T.textSoft }}>Set de fléchettes (id)</span>
          <input
            value={value.dartSetId}
            onChange={(e) => set({ dartSetId: e.target.value })}
            placeholder="ex: preset_01 ou set_xxx"
            style={{
              width: 180,
              padding: "8px 10px",
              borderRadius: 12,
              border: `1px solid ${T.borderSoft}`,
              background: "rgba(0,0,0,0.35)",
              color: "#fff",
              outline: "none",
              fontWeight: 700,
              fontSize: 12,
            }}
          />
        </div>

        {value.mode === "teams" && !canStartTeams && (
          <div style={{ marginTop: 10, color: "rgba(255,255,255,0.65)", fontSize: 12 }}>
            ➜ En 2v2, il faut <strong>4 joueurs</strong> et <strong>2 en Team A</strong> + <strong>2 en Team B</strong>.
          </div>
        )}
      </div>

      {/* START */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 80,
          padding: "0 16px",
        }}
      >
        <button
          type="button"
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: "100%",
            padding: "12px 16px",
            borderRadius: 999,
            border: "none",
            background: canStart
              ? "linear-gradient(135deg,#ffc63a,#ffaf00)"
              : "linear-gradient(135deg,#6b7280,#4b5563)",
            color: canStart ? "#211500" : "#e5e7eb",
            fontSize: 15,
            fontWeight: 900,
            textTransform: "uppercase",
            letterSpacing: 1.4,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 0 20px rgba(240,177,42,.35)" : "none",
          }}
        >
          Lancer la partie
        </button>
      </div>
    </div>
  );
}
