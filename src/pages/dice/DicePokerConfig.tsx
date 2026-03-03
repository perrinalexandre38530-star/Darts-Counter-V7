// @ts-nocheck
// =============================================================
// src/pages/dice/DicePokerConfig.ts
// ✅ Version SANS JSX (pour éviter erreur TS 'Unexpected token' si fichier en .ts)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
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

  return React.createElement(
    "div",
    {
      style: {
        flex: 1,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 0,
      },
    },
    React.createElement(
      "div",
      { style: { width: 40, height: 40, flex: "0 0 auto" } },
      React.createElement(ProfileAvatar as any, { size: 40, profile: p })
    ),
    React.createElement(
      "div",
      { style: { minWidth: 0, flex: 1 } },
      React.createElement(
        "div",
        { style: { fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 800 } },
        label
      ),
      React.createElement(
        "select",
        {
          value: value ?? "",
          onChange: (e: any) => onChange(e.target.value || null),
          style: {
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
          },
        },
        (profiles || []).map((pp: any) =>
          React.createElement("option", { key: pp.id, value: pp.id }, pp.name || pp.email || "Profil")
        )
      )
    )
  );
}

function Field({ label, value, onChange, theme, min = 0, max = 99999 }: any) {
  return React.createElement(
    "div",
    {
      style: {
        flex: 1,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        padding: 12,
        minWidth: 0,
      },
    },
    React.createElement(
      "div",
      { style: { fontSize: 12, color: "rgba(255,255,255,.55)", fontWeight: 900 } },
      label
    ),
    React.createElement("input", {
      type: "number",
      value,
      onChange: (e: any) => onChange(clamp(e.target.value, min, max, value)),
      style: {
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
      },
    })
  );
}

function Toggle({ label, checked, onChange, theme }: any) {
  return React.createElement(
    "label",
    {
      style: {
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: 12,
        borderRadius: 14,
        border: `1px solid ${theme?.colors?.stroke ?? "rgba(255,255,255,.12)"}`,
        background: "rgba(0,0,0,.18)",
        cursor: "pointer",
        userSelect: "none",
      },
    },
    React.createElement("input", {
      type: "checkbox",
      checked: !!checked,
      onChange: (e: any) => onChange(e.target.checked),
    }),
    React.createElement("span", { style: { fontWeight: 900, color: "#fff" } }, label)
  );
}

export default function DicePokerConfig({ go, store, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#7cff6d";
  const stroke = theme?.colors?.stroke ?? "rgba(255,255,255,.10)";

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const defaultA = profiles?.[0]?.id ?? null;
  const defaultB = profiles?.[1]?.id ?? profiles?.[0]?.id ?? null;

  const [playerA, setPlayerA] = React.useState(defaultA);
  const [playerB, setPlayerB] = React.useState(defaultB);

  const [rounds, setRounds] = React.useState(6);
  const [sets, setSets] = React.useState(1);
  const [rerolls, setRerolls] = React.useState(2);
  const [straightLow, setStraightLow] = React.useState(true);

  const canStart = !!playerA && !!playerB && playerA !== playerB;

  const onLaunch = () => {
    if (!canStart) return;

    const players: DicePlayer[] = [
      { id: playerA, slot: "A" } as any,
      { id: playerB, slot: "B" } as any,
    ];

    const config: any = {
      mode: "poker",
      rounds,
      sets,
      rerolls,
      straightLow,
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

    go("dice_poker_play", { players, config, title: "POKER DICE", subtitle: "Combinaisons poker • manche rapide" });
  };

  return React.createElement(
    "div",
    { style: { padding: 18 } },
    React.createElement(
      "div",
      { style: { position: "fixed", left: 14, top: 14, zIndex: 10 } },
      React.createElement(BackDot as any, { onClick: () => go("dice_menu") })
    ),
    React.createElement(
      "div",
      { style: { position: "fixed", right: 14, top: 14, zIndex: 10 } },
      React.createElement(InfoDot as any, {
        title: "POKER DICE — Config",
        desc:
          "Poker Dice — config de base.\n\n• 5 dés\n• 2 relances\n• Combinaisons poker (paire, brelan, full, carré, quinte, etc.)\n\nPLAY/scoring à venir.",
      })
    ),
    React.createElement(
      "div",
      {
        style: {
          maxWidth: 720,
          marginInline: "auto",
          marginTop: 52,
          borderRadius: 18,
          padding: 18,
          border: `1px solid ${stroke}`,
          background: "rgba(0,0,0,.28)",
          boxShadow: "0 18px 50px rgba(0,0,0,.45)",
        },
      },
      React.createElement("div", { style: { fontSize: 22, fontWeight: 900, color: "#fff" } }, "POKER DICE — Config"),
      React.createElement(
        "div",
        { style: { marginTop: 6, color: "rgba(255,255,255,.72)" } },
        "Combinaisons poker • manche rapide"
      ),

      React.createElement(
        "div",
        { style: { display: "flex", gap: 12, marginTop: 14 } },
        React.createElement(PlayerSelect as any, {
          label: "Joueur A",
          value: playerA,
          onChange: setPlayerA,
          profiles,
          theme,
        }),
        React.createElement(PlayerSelect as any, {
          label: "Joueur B",
          value: playerB,
          onChange: setPlayerB,
          profiles,
          theme,
        })
      ),

      React.createElement(
        "div",
        { style: { display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap" } },
        React.createElement(Field as any, { label: "Manches", value: rounds, onChange: setRounds, theme, min: 1, max: 20 }),
        React.createElement(Field as any, { label: "Relances", value: rerolls, onChange: setRerolls, theme, min: 0, max: 3 }),
        React.createElement(Field as any, { label: "Sets", value: sets, onChange: setSets, theme, min: 1, max: 9 })
      ),

      React.createElement(
        "div",
        { style: { marginTop: 14, display: "flex", flexDirection: "column", gap: 10 } },
        React.createElement(Toggle as any, {
          label: "Quinte basse autorisée (placeholder)",
          checked: straightLow,
          onChange: setStraightLow,
          theme,
        })
      ),

      React.createElement(
        "button",
        {
          onClick: onLaunch,
          disabled: !canStart,
          style: {
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
          },
        },
        "LANCER"
      ),

      !canStart
        ? React.createElement(
            "div",
            { style: { marginTop: 10, color: "rgba(255,255,255,.55)", fontWeight: 800 } },
            "Sélectionne 2 joueurs différents."
          )
        : null
    )
  );
}
