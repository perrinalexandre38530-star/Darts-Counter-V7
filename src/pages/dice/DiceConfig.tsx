// @ts-nocheck
// =============================================================
// src/pages/dice/DiceConfig.tsx
// Config DICE — gabarit proche MolkkyConfig (minimal stable)
// - Sélection 2 joueurs
// - Options : cible / nb dés / sets
// - Lance via go("dice_play", { players, config })
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";

import { saveDiceState, clearDiceState } from "../../lib/diceStore";
import type { DiceConfig as DiceCfg, DicePlayer, DiceRuntimeState } from "../../lib/diceTypes";

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

export default function DiceConfig({ go, store, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#7cff6d";
  const textMain = theme?.colors?.text ?? "#fff";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,.72)";
  const cardBg = theme?.colors?.card ?? "rgba(255,255,255,.06)";
  const stroke = theme?.colors?.stroke ?? "rgba(255,255,255,.10)";

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const preset = params?.preset || "duel";

  // Defaults
  const defaultA = profiles?.[0]?.id ?? null;
  const defaultB = profiles?.[1]?.id ?? profiles?.[0]?.id ?? null;

  const [pA, setPA] = React.useState(defaultA);
  const [pB, setPB] = React.useState(defaultB);

    const presetDefaults = React.useMemo(() => {
    const p = String(preset || "duel").toLowerCase();
    if (p === "race") return { mode: "race", targetScore: 200, diceCount: 3, sets: 1 };
    if (p === "tenk" || p === "10k" || p === "10000") return { mode: "tenk", targetScore: 10000, diceCount: 6, sets: 1 };
    return { mode: presetDefaults.mode, targetScore: 100, diceCount: 2, sets: 1 };
  }, [preset]);

  const [targetScore, setTargetScore] = React.useState(presetDefaults.targetScore);
  const [diceCount, setDiceCount] = React.useState(presetDefaults.diceCount);
  const [sets, setSets] = React.useState(presetDefaults.sets);

  // sync si on change de preset (rare)
  React.useEffect(() => {
    setTargetScore(presetDefaults.targetScore);
    setDiceCount(presetDefaults.diceCount);
    setSets(presetDefaults.sets);
  }, [presetDefaults.targetScore, presetDefaults.diceCount, presetDefaults.sets]);


  const playerA = profiles.find((p: any) => p.id === pA) || null;
  const playerB = profiles.find((p: any) => p.id === pB) || null;

  const canStart = !!playerA && !!playerB && String(playerA?.id) !== "" && String(playerB?.id) !== "";

  function buildPlayers(): DicePlayer[] {
    const pa = playerA;
    const pb = playerB;

    return [
      {
        id: pa.id,
        name: pa.name || pa.nickname || pa.ni || "Player A",
        avatarDataUrl: pa.avatarDataUrl || pa.avatar || pa.photo || null,
      },
      {
        id: pb.id,
        name: pb.name || pb.nickname || pb.ni || "Player B",
        avatarDataUrl: pb.avatarDataUrl || pb.avatar || pb.photo || null,
      },
    ];
  }

  function start() {
    if (!canStart) return;

    const cfg: DiceCfg = {
      mode: presetDefaults.mode,
      targetScore: clamp(targetScore, 10, 10000, 100),
      diceCount: clamp(diceCount, 1, 10, 2),
      sets: clamp(sets, 1, 25, 1),
    };

    const players = buildPlayers();

    const st: DiceRuntimeState = {
      createdAt: Date.now(),
      config: cfg,
      players,
      scores: Object.fromEntries(players.map((p) => [p.id, 0])),
      setsWon: Object.fromEntries(players.map((p) => [p.id, 0])),
      currentTurnId: players[0].id,
      lastRoll: undefined,
      finished: false,
      winnerId: null,
    };

    try { clearDiceState(); } catch {}
    try { saveDiceState(st); } catch {}

    go("dice_play", { players, config: cfg, preset });
  }

  return (
    <div className="pageWrap" style={{ padding: 14, color: textMain }}>
      <BackDot onClick={() => go("games")} />
      <InfoDot title="Dice" lines={["Mode Duel", "2 joueurs", "Cible / Dés / Sets"]} />

      <div
        style={{
          marginTop: 10,
          borderRadius: 18,
          padding: 14,
          background: cardBg,
          border: `1px solid ${stroke}`,
        }}
      >
        <div style={{ fontSize: 20, fontWeight: 900, letterSpacing: 0.4 }}>
          🎲 Dice Duel — Config
        </div>
        <div style={{ marginTop: 6, color: textSoft, fontSize: 13 }}>
          Sélectionne 2 joueurs puis lance la partie.
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 14 }}>
          <div style={{ padding: 12, borderRadius: 16, border: `1px solid ${stroke}` }}>
            <div style={{ fontSize: 12, color: textSoft, marginBottom: 8 }}>Joueur A</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ProfileAvatar size={44} name={playerA?.name || ""} src={playerA?.avatarDataUrl || null} />
              <select
                value={pA || ""}
                onChange={(e) => setPA(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 12, background: "rgba(0,0,0,.25)", color: textMain, border: `1px solid ${stroke}` }}
              >
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.nickname || p.ni || p.email || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ padding: 12, borderRadius: 16, border: `1px solid ${stroke}` }}>
            <div style={{ fontSize: 12, color: textSoft, marginBottom: 8 }}>Joueur B</div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <ProfileAvatar size={44} name={playerB?.name || ""} src={playerB?.avatarDataUrl || null} />
              <select
                value={pB || ""}
                onChange={(e) => setPB(e.target.value)}
                style={{ flex: 1, padding: 10, borderRadius: 12, background: "rgba(0,0,0,.25)", color: textMain, border: `1px solid ${stroke}` }}
              >
                {profiles.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name || p.nickname || p.ni || p.email || p.id}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginTop: 14 }}>
          <Field label="Cible" value={targetScore} setValue={setTargetScore} min={10} max={10000} />
          <Field label="Nb dés" value={diceCount} setValue={setDiceCount} min={1} max={10} />
          <Field label="Sets" value={sets} setValue={setSets} min={1} max={25} />
        </div>

        <button
          onClick={start}
          disabled={!canStart}
          style={{
            marginTop: 14,
            width: "100%",
            padding: "12px 14px",
            borderRadius: 16,
            fontWeight: 900,
            letterSpacing: 0.4,
            border: "none",
            cursor: canStart ? "pointer" : "not-allowed",
            background: canStart ? primary : "rgba(255,255,255,.12)",
            color: canStart ? "#001a05" : "rgba(255,255,255,.55)",
            boxShadow: canStart ? `0 0 20px ${primary}55` : "none",
          }}
        >
          Lancer
        </button>
      </div>
    </div>
  );
}

function Field({ label, value, setValue, min, max }: any) {
  return (
    <div style={{ padding: 12, borderRadius: 16, border: "1px solid rgba(255,255,255,.10)" }}>
      <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>{label}</div>
      <input
        type="number"
        value={value}
        min={min}
        max={max}
        onChange={(e) => setValue(Number(e.target.value))}
        style={{
          width: "100%",
          padding: 10,
          borderRadius: 12,
          background: "rgba(0,0,0,.25)",
          color: "#fff",
          border: "1px solid rgba(255,255,255,.10)",
        }}
      />
    </div>
  );
}
