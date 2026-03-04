// @ts-nocheck
// =============================================================
// src/pages/dice/DiceYamsConfig.tsx
// Config Yam's — style identique (carte + boutons) / stable
// - Sélection 2 joueurs
// - Options : nb relances (0-2), manches (13), BO (sets)
// - Lance via go("dice_yams_play", { players, config })
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ConfigTickerHeader from "../../components/ConfigTickerHeader";
import { getTicker } from "../../lib/tickers";
import ProfileAvatar from "../../components/ProfileAvatar";

import type { DiceConfig as DiceCfg, DicePlayer } from "../../lib/diceTypes";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store?: any;
};

const clamp = (v: any, a: number, b: number, def: number) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return def;
  return Math.max(a, Math.min(b, n));
};

export default function DiceYamsConfig({ go, store }: Props) {
  const { theme } = useTheme() as any;

  const headerSrc = getTicker("dice_yams") || getTicker("dice_games") || "";

  const { t } = useLang() as any;

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];

  const defaultA = profiles?.[0]?.id ?? null;
  const defaultB = profiles?.[1]?.id ?? profiles?.[0]?.id ?? null;

  const [pA, setPA] = React.useState(defaultA);
  const [pB, setPB] = React.useState(defaultB);

  const [rerolls, setRerolls] = React.useState(2); // 0..2
  const [rounds, setRounds] = React.useState(13);  // 13 catégories
  const [sets, setSets] = React.useState(1);

  const playerA = profiles.find((p: any) => p.id === pA) || null;
  const playerB = profiles.find((p: any) => p.id === pB) || null;

  const canStart = !!playerA && !!playerB && String(playerA?.id) !== "" && String(playerB?.id) !== "";

  function buildPlayers(): DicePlayer[] {
    const pa = playerA;
    const pb = playerB;
    return [
      { id: String(pa.id), name: String(pa.name || pa.email || "Joueur A"), avatarDataUrl: pa.avatarDataUrl || pa.avatar || null },
      { id: String(pb.id), name: String(pb.name || pb.email || "Joueur B"), avatarDataUrl: pb.avatarDataUrl || pb.avatar || null },
    ];
  }

  function start() {
    if (!canStart) return;

    const config: DiceCfg = {
      mode: "yams",
      diceCount: 5,
      sets: clamp(sets, 1, 9, 1),
      yamsRerolls: clamp(rerolls, 0, 2, 2),
      yamsRounds: clamp(rounds, 1, 20, 13),
      yamsUpperBonusThreshold: 63,
      yamsUpperBonusValue: 35,
    };

    go("dice_yams_play", { players: buildPlayers(), config });
  }

  return (
    <div style={{ padding: 18 }}>
      <ConfigTickerHeader
        src={headerSrc}
        height={92}
        left={<BackDot onClick={() => go("dice_menu")} />}
        right={<InfoDot title="Yam's — Config"
        desc={`Yam's / Yahtzee (5 dés)\n\n• 13 catégories\n• 3 lancers max (2 relances)\n• Bonus haut: 63 → +35\n\nChoisis 2 joueurs puis lance.`} />}
        sticky={false}
      />

      <BackDot onClick={() => go("dice_games")} />
      <InfoDot
        title="Yam's — Config"
        desc={`Yam's / Yahtzee (5 dés)\n\n• 13 catégories\n• 3 lancers max (2 relances)\n• Bonus haut: 63 → +35\n\nChoisis 2 joueurs puis lance.`}
      />

      <div
        style={{
          maxWidth: 560,
          margin: "48px auto 0",
          padding: 18,
          borderRadius: 18,
          border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
          background: theme.card ?? "rgba(0,0,0,0.35)",
          boxShadow: "0 18px 60px rgba(0,0,0,0.35)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ fontSize: 22 }}>🎲</div>
          <div style={{ fontWeight: 900, fontSize: 22, letterSpacing: 0.5 }}>Yam&apos;s — Config</div>
        </div>
        <div style={{ marginTop: 6, opacity: 0.75, fontSize: 13 }}>
          Sélectionne 2 joueurs puis lance la partie.
        </div>

        {/* Players */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginTop: 16 }}>
          {[{ label: "Joueur A", value: pA, set: setPA }, { label: "Joueur B", value: pB, set: setPB }].map((row: any, idx: number) => {
            const p = profiles.find((x: any) => x.id === row.value) || null;
            return (
              <div
                key={idx}
                style={{
                  padding: 12,
                  borderRadius: 16,
                  border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                  background: "rgba(0,0,0,0.25)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.75, marginBottom: 8 }}>{row.label}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 44, height: 44 }}>
                    <ProfileAvatar profile={p} size={44} />
                  </div>
                  <select
                    value={row.value ?? ""}
                    onChange={(e) => row.set(e.target.value)}
                    style={{
                      flex: 1,
                      height: 44,
                      borderRadius: 12,
                      border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                      background: "rgba(0,0,0,0.45)",
                      color: "#fff",
                      padding: "0 10px",
                    }}
                  >
                    {profiles.map((pp: any) => (
                      <option key={pp.id} value={pp.id}>
                        {pp.name || pp.email || "Profil"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Options */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12, marginTop: 14 }}>
          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>Relances</div>
            <input
              type="number"
              value={rerolls}
              onChange={(e) => setRerolls(clamp(e.target.value, 0, 2, 2))}
              style={{
                marginTop: 8,
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                padding: "0 10px",
                fontWeight: 800,
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>Manches</div>
            <input
              type="number"
              value={rounds}
              onChange={(e) => setRounds(clamp(e.target.value, 1, 20, 13))}
              style={{
                marginTop: 8,
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                padding: "0 10px",
                fontWeight: 800,
              }}
            />
          </div>

          <div
            style={{
              padding: 12,
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(0,0,0,0.25)",
            }}
          >
            <div style={{ fontSize: 12, opacity: 0.75 }}>Sets</div>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(clamp(e.target.value, 1, 9, 1))}
              style={{
                marginTop: 8,
                width: "100%",
                height: 44,
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(0,0,0,0.45)",
                color: "#fff",
                padding: "0 10px",
                fontWeight: 800,
              }}
            />
          </div>
        </div>

        <button
          disabled={!canStart}
          onClick={start}
          style={{
            marginTop: 16,
            width: "100%",
            height: 54,
            borderRadius: 16,
            border: "none",
            background: canStart ? theme.accent ?? "#b6ff00" : "rgba(255,255,255,0.12)",
            color: "#000",
            fontWeight: 1000,
            letterSpacing: 1,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? "0 10px 30px rgba(182,255,0,0.25)" : "none",
          }}
        >
          Lancer
        </button>
      </div>
    </div>
  );
}
