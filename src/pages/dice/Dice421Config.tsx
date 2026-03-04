// @ts-nocheck
// =============================================================
// src/pages/dice/Dice421Config.tsx
// Config DICE — 421 (gabarit 2 joueurs)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ConfigTickerHeader from "../../components/ConfigTickerHeader";
import { getTicker } from "../../lib/tickers";
import ProfileAvatar from "../../components/ProfileAvatar";

import { saveDiceState, clearDiceState } from "../../lib/diceStore";
import type { DicePlayer, DiceRuntimeState } from "../../lib/diceTypes";

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

function PlayerSelect({ label, value, onChange, profiles, theme }: any) {
  const p = profiles?.find((x: any) => x.id === value) ?? null;

  return (
    <div
      style={{
        flex: 1,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      }}
    >
      <div style={{ width: 40, height: 40, flex: "0 0 auto" }}>
        <ProfileAvatar size={40} profile={p} />
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>{label}</div>
        <select
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          style={{
            marginTop: 6,
            width: "100%",
            height: 38,
            borderRadius: 10,
            border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.10)"}`,
            background: "rgba(0,0,0,.35)",
            color: "#fff",
            padding: "0 10px",
            outline: "none",
            fontWeight: 800,
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
}

function Field({ label, value, onChange, theme, min = 0, max = 99999 }: any) {
  return (
    <div
      style={{
        flex: 1,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        padding: 12,
        minWidth: 0,
      }}
    >
      <div style={{ fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 900 }}>{label}</div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(clamp(e.target.value, min, max, value))}
        style={{
          marginTop: 8,
          width: "100%",
          height: 40,
          borderRadius: 10,
          border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.10)"}`,
          background: "rgba(0,0,0,.35)",
          color: "#fff",
          padding: "0 10px",
          outline: "none",
          fontWeight: 900,
        }}
      />
    </div>
  );
}

function Toggle({ label, checked, onChange, theme }: any) {
  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        cursor: "pointer",
        userSelect: "none",
      }}
    >
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} />
      <span style={{ fontWeight: 900, color: "#fff" }}>{label}</span>
    </label>
  );
}

export default function Dice421Config({ go, store }: Props) {
  const { theme } = useTheme() as any;

  const headerSrc = getTicker("dice_421") || getTicker("dice_games") || "";

  const { t } = useLang() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#7cff6d";
  const stroke = theme?.colors?.stroke ?? "rgba(255,255,255,.10)";

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const defaultA = profiles?.[0]?.id ?? null;
  const defaultB = profiles?.[1]?.id ?? profiles?.[0]?.id ?? null;

  const [playerA, setPlayerA] = React.useState(defaultA);
  const [playerB, setPlayerB] = React.useState(defaultB);

  const [rounds, setRounds] = React.useState(8);
  const [sets, setSets] = React.useState(1);

  const [announce, setAnnounce] = React.useState(true);
  const [penalty, setPenalty] = React.useState(true);

  const canStart = !!playerA && !!playerB && playerA !== playerB;

  const onLaunch = () => {
    if (!canStart) return;

    const players: DicePlayer[] = [
      { id: playerA, slot: "A" } as any,
      { id: playerB, slot: "B" } as any,
    ];

    const config: any = {
      mode: "421",
      rounds,
      sets,
      announce,
      penalty,
    };

    const rt: DiceRuntimeState = {
      config,
      players,
      createdAt: Date.now(),
    } as any;

    try {
      clearDiceState();
      saveDiceState(rt);
    } catch {}

    go("dice_421_play", { players, config, title: "421", subtitle: "Combinaisons • annonces • points" });
  };

  return (
    <div style={{ padding: 18 }}>
      <ConfigTickerHeader
        src={headerSrc}
        height={92}
        left={<BackDot onClick={() => go("dice_menu")} />}
        right={<InfoDot title="421 — Config"
          desc={
            "421 (FR) — config de base.\n\n• 3 dés\n• Combinaisons + annonces\n• Points par manche\n\nPLAY/scoring à venir."
          } />}
        sticky={false}
      />

      
      

      <div
        style={{
          maxWidth: 720,
          marginInline: "auto",
          marginTop: 52,
          borderRadius: 18,
          padding: 18,
          border: `1px solid ${stroke}`,
          background: "rgba(0,0,0,.28)",
          boxShadow: "0 18px 50px rgba(0,0,0,.45)",
        }}
      >
        <div style={{ fontSize: 22, fontWeight: 900, color: "#fff" }}>421 — Config</div>
        <div style={{ marginTop: 6, color: "rgba(255,255,255,.72)" }}>Combinaisons • annonces • points</div>

        <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
          <PlayerSelect label="Joueur A" value={playerA} onChange={setPlayerA} profiles={profiles} theme={theme} />
          <PlayerSelect label="Joueur B" value={playerB} onChange={setPlayerB} profiles={profiles} theme={theme} />
        </div>

        <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" }}>
          <Field label="Manches" value={rounds} onChange={setRounds} theme={theme} min={1} max={20} />
          <Field label="Sets" value={sets} onChange={setSets} theme={theme} min={1} max={9} />
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <Toggle label="Annonces (placeholder)" checked={announce} onChange={setAnnounce} theme={theme} />
          <Toggle label="Pénalités (placeholder)" checked={penalty} onChange={setPenalty} theme={theme} />
        </div>

        <button
          onClick={onLaunch}
          disabled={!canStart}
          style={{
            marginTop: 16,
            width: "100%",
            height: 54,
            borderRadius: 14,
            border: "none",
            background: canStart ? primary : "rgba(255,255,255,.08)",
            color: canStart ? "#0b0b0b" : "rgba(255,255,255,.45)",
            fontWeight: 900,
            letterSpacing: 1,
            cursor: canStart ? "pointer" : "not-allowed",
            boxShadow: canStart ? `0 10px 28px ${primary}55` : "none",
          }}
        >
          LANCER
        </button>

        {!canStart && (
          <div style={{ marginTop: 10, color: "rgba(255,255,255,.55)", fontWeight: 800 }}>
            Sélectionne 2 joueurs différents.
          </div>
        )}
      </div>
    </div>
  );
}
