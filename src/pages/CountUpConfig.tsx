// @ts-nocheck
// =============================================================
// src/pages/CountUpConfig.tsx
// COUNT-UP — CONFIG (look & feel coherent)
// - Selection joueurs (profils + bots)
// - Options simples: nb de rounds (volées), darts par volée, objectif optionnel
// - Bouton "Lancer" -> go("count_up_play", { config })
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";
import type { Store } from "../lib/store";

export type CountUpConfig = {
  players: Array<{
    id: string;
    name: string;
    avatarDataUrl?: string | null;
    isBot?: boolean;
  }>;
  rounds: number;        // nombre de volées
  dartsPerRound: number; // 3 par défaut
  targetScore?: number;  // optionnel: objectif à atteindre, sinon meilleur score après rounds
};

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const LS_BOTS_KEY = "dc_bots_v1";

function loadBots(): any[] {
  try {
    const raw = localStorage.getItem(LS_BOTS_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((b: any) => b && (b.id || b.name))
      .map((b: any) => ({
        id: String(b.id || b.name),
        name: String(b.name || "BOT"),
        avatarDataUrl: b.avatarDataUrl || b.avatar || null,
        isBot: true,
      }));
  } catch {
    return [];
  }
}

function dedupePlayers(list: any[]) {
  const m = new Map<string, any>();
  for (const p of list) {
    const id = String(p?.id || "");
    if (!id) continue;
    if (!m.has(id)) m.set(id, p);
  }
  return Array.from(m.values());
}

export default function CountUpConfigPage({ store, go }: Props) {
  const theme = useTheme();
  const primary = theme?.primary || "#f3c76a";
  const bg = theme?.pageBg || "linear-gradient(180deg, #05060a, #070811 55%, #05060a)";

  const humans = (store?.profiles || []).filter((p: any) => !p?.isBot);
  const bots = dedupePlayers(loadBots());

  const all = dedupePlayers([
    ...humans.map((p: any) => ({ id: String(p.id), name: p.name, avatarDataUrl: p.avatarDataUrl || null, isBot: false })),
    ...bots,
  ]);

  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => {
    if (all.length >= 2) return [all[0].id, all[1].id];
    if (all.length === 1) return [all[0].id];
    return [];
  });

  const [rounds, setRounds] = React.useState<number>(10);
  const [dartsPerRound, setDartsPerRound] = React.useState<number>(3);
  const [targetScore, setTargetScore] = React.useState<number | "">("");

  const [rulesOpen, setRulesOpen] = React.useState(false);

  const selectedPlayers = selectedIds
    .map((id) => all.find((p) => p.id === id))
    .filter(Boolean);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  function start() {
    if (selectedPlayers.length < 1) return;
    const cfg: CountUpConfig = {
      players: selectedPlayers,
      rounds,
      dartsPerRound,
      targetScore: targetScore === "" ? undefined : Number(targetScore),
    };
    go("count_up_play", { config: cfg });
  }

  const pill = (active: boolean): React.CSSProperties => ({
    padding: "8px 10px",
    borderRadius: 999,
    border: `1px solid ${active ? primary : "rgba(255,255,255,0.14)"}`,
    background: active ? `${primary}22` : "rgba(255,255,255,0.04)",
    color: active ? primary : "rgba(255,255,255,0.86)",
    fontWeight: 900,
    fontSize: 11,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    cursor: "pointer",
    userSelect: "none",
  });

  return (
    <div style={{ height: "100dvh", overflow: "hidden", background: bg, color: "#fff", display: "flex", flexDirection: "column" }}>
      {/* Topbar */}
      <div style={{ padding: 10, display: "flex", alignItems: "center", gap: 10 }}>
        <BackDot onClick={() => go("games")} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 1, textTransform: "uppercase", color: primary }}>
            Count-Up
          </div>
          <div style={{ opacity: 0.85, fontSize: 12 }}>Defi scoring sur un nombre de volees</div>
        </div>
        <InfoDot onClick={() => setRulesOpen(true)} />
      </div>

      {/* Content */}
      <div style={{ padding: 10, display: "flex", flexDirection: "column", gap: 10, overflow: "auto" }}>
        {/* Players */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
            <div style={{ fontWeight: 950, letterSpacing: 1, textTransform: "uppercase", color: primary }}>Joueurs</div>
            <button
              type="button"
              onClick={() => go("profiles_bots")}
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${primary}55`,
                background: "rgba(0,0,0,0.20)",
                color: primary,
                fontWeight: 900,
                fontSize: 11,
                textTransform: "uppercase",
                cursor: "pointer",
              }}
            >
              Gerer BOTS
            </button>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {all.map((p: any) => {
              const active = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggle(p.id)}
                  style={{
                    borderRadius: 16,
                    border: active ? `1px solid ${primary}66` : "1px solid rgba(255,255,255,0.10)",
                    background: active ? `${primary}14` : "rgba(0,0,0,0.10)",
                    padding: 10,
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <div style={{ display: "grid", placeItems: "center" }}>
                    <ProfileStarRing size={54} />
                    <div style={{ marginTop: -54 }}>
                      <ProfileAvatar size={54} profile={p} />
                    </div>
                  </div>
                  <div style={{ marginTop: 6, fontSize: 11, fontWeight: 900, opacity: 0.95, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {p.name}
                  </div>
                  {p.isBot ? <div style={{ fontSize: 10, opacity: 0.7 }}>BOT</div> : null}
                </button>
              );
            })}
          </div>

          <div style={{ marginTop: 10, opacity: 0.8, fontSize: 12 }}>
            Selection: <b>{selectedPlayers.length}</b>
          </div>
        </div>

        {/* Options */}
        <div
          style={{
            borderRadius: 18,
            border: "1px solid rgba(255,255,255,0.10)",
            background: "rgba(255,255,255,0.06)",
            padding: 12,
            boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          }}
        >
          <div style={{ fontWeight: 950, letterSpacing: 1, textTransform: "uppercase", color: primary }}>Options</div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ opacity: 0.85, fontSize: 12, marginRight: 6 }}>Volees</div>
            {[5, 10, 15, 20].map((v) => (
              <div key={v} style={pill(rounds === v)} onClick={() => setRounds(v)} role="button" tabIndex={0}>
                {v}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <div style={{ opacity: 0.85, fontSize: 12, marginRight: 6 }}>Fleches/volee</div>
            {[1, 2, 3].map((v) => (
              <div key={v} style={pill(dartsPerRound === v)} onClick={() => setDartsPerRound(v)} role="button" tabIndex={0}>
                {v}
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ opacity: 0.85, fontSize: 12, width: 150 }}>Objectif (optionnel)</div>
            <input
              value={targetScore}
              onChange={(e) => {
                const raw = e.target.value;
                if (raw === "") return setTargetScore("");
                const n = Math.max(0, Math.min(9999, Number(raw)));
                if (Number.isFinite(n)) setTargetScore(n);
              }}
              inputMode="numeric"
              placeholder="ex: 300"
              style={{
                flex: 1,
                minWidth: 0,
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(0,0,0,0.20)",
                color: "#fff",
                padding: "10px 12px",
                outline: "none",
                fontWeight: 900,
              }}
            />
          </div>
          <div style={{ marginTop: 8, opacity: 0.75, fontSize: 12 }}>
            Si objectif defini: le premier qui l'atteint gagne. Sinon: meilleur score apres toutes les volees.
          </div>
        </div>

        {/* Start */}
        <button
          type="button"
          onClick={start}
          style={{
            borderRadius: 18,
            border: `1px solid ${primary}55`,
            background: `linear-gradient(180deg, ${primary}35, ${primary}15)`,
            color: "#fff",
            padding: "14px 12px",
            fontWeight: 1000,
            letterSpacing: 1,
            textTransform: "uppercase",
            cursor: "pointer",
            boxShadow: `0 12px 40px ${primary}22`,
          }}
        >
          Lancer la partie
        </button>
      </div>

      {/* Rules modal (same style as X01ConfigV3) */}
      {rulesOpen ? (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 14,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              maxHeight: "78vh",
              overflowY: "auto",
              borderRadius: 18,
              background: "rgba(12,14,26,0.98)",
              border: `1px solid ${primary}33`,
              boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
              padding: 14,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 10 }}>
              <div style={{ fontWeight: 950, letterSpacing: 1, color: primary, textTransform: "uppercase" }}>Regles — Count-Up</div>
              <button
                type="button"
                onClick={() => setRulesOpen(false)}
                style={{
                  borderRadius: 12,
                  padding: "8px 10px",
                  border: "1px solid rgba(255,255,255,0.14)",
                  background: "rgba(255,255,255,0.06)",
                  color: "#fff",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
            <div style={{ fontSize: 13, lineHeight: 1.35, opacity: 0.92 }}>
              <p>
                Count-Up est un defi de scoring: chaque joueur additionne ses points sur un nombre fixe de volees.
              </p>
              <ul>
                <li>Chaque tour: tu saisis le total de ta volee (0 a 180).</li>
                <li>Apres {rounds} volees, on compare les scores: meilleur total gagne.</li>
                <li>Si un objectif est defini, le premier qui l'atteint ou le depasse gagne.</li>
              </ul>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
