// @ts-nocheck
import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import { useTheme } from "../contexts/ThemeContext";

type QuickMode = "solo" | "duel" | "teams" | "multi";
type VictoryMode = "best_of" | "first_to";
type FormatUnit = "legs" | "sets";

const LS_KEY = "mss:x01:quick-config:v1";
const BO_VALUES = [1, 3, 5, 7];
const FT_VALUES = [1, 3, 5, 7, 9, 11, 13];

function chip(active: boolean, accent: string): React.CSSProperties {
  return {
    borderRadius: 12,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.13)"}`,
    background: active ? `${accent}22` : "rgba(255,255,255,.035)",
    color: active ? accent : "rgba(255,255,255,.78)",
    fontWeight: 950,
    minHeight: 40,
    padding: "8px 12px",
    cursor: "pointer",
  };
}

export default function X01QuickConfig({ onBack, onStart }: { onBack: () => void; onStart: (cfg: X01ConfigV3) => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#55e6ff";
  const [mode, setMode] = React.useState<QuickMode>("duel");
  const [multiCount, setMultiCount] = React.useState(4);
  const [startScore, setStartScore] = React.useState<301 | 501 | 701 | 901>(501);
  const [inMode, setInMode] = React.useState<"single" | "double">("single");
  const [outMode, setOutMode] = React.useState<"single" | "double">("double");
  const [victoryMode, setVictoryMode] = React.useState<VictoryMode>("best_of");
  const [target, setTarget] = React.useState(1);
  const [unit, setUnit] = React.useState<FormatUnit>("legs");
  const [names, setNames] = React.useState<string[]>(["J1", "J2", "J3", "J4", "J5", "J6", "J7", "J8", "J9", "J10"]);

  React.useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const v = JSON.parse(raw);
      if (["solo", "duel", "teams", "multi"].includes(v?.mode)) setMode(v.mode);
      if ([301, 501, 701, 901].includes(Number(v?.startScore))) setStartScore(Number(v.startScore) as any);
      if (["single", "double"].includes(v?.inMode)) setInMode(v.inMode);
      if (["single", "double"].includes(v?.outMode)) setOutMode(v.outMode);
      if (["best_of", "first_to"].includes(v?.victoryMode)) setVictoryMode(v.victoryMode);
      if (["legs", "sets"].includes(v?.unit)) setUnit(v.unit);
      if (Number.isFinite(Number(v?.target))) setTarget(Math.max(1, Number(v.target)));
      if (Number.isFinite(Number(v?.multiCount))) setMultiCount(Math.max(3, Math.min(10, Number(v.multiCount))));
    } catch {}
  }, []);

  React.useEffect(() => {
    const allowed = victoryMode === "best_of" ? BO_VALUES : FT_VALUES;
    if (!allowed.includes(target)) setTarget(allowed[0]);
  }, [victoryMode, target]);

  const playerCount = mode === "solo" ? 1 : mode === "duel" ? 2 : mode === "teams" ? 4 : multiCount;
  const shownNames = names.slice(0, playerCount);

  function updateName(index: number, value: string) {
    setNames((prev) => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  }

  function start() {
    const sessionId = `quick-${Date.now().toString(36)}`;
    const players = shownNames.map((rawName, idx) => {
      const id = `${sessionId}-p${idx + 1}`;
      const name = String(rawName || "").trim() || `J${idx + 1}`;
      return {
        id,
        profileId: null,
        temporaryPlayerId: id,
        isTemporary: true,
        name,
        avatarDataUrl: null,
        dartSetId: null,
      };
    });

    const isTeams = mode === "teams";
    const isMulti = mode === "multi";
    const selectedTarget = Math.max(1, target);
    const matchFormat = { type: victoryMode, target: selectedTarget, unit };

    // Un match en LEGS est représenté par un seul set et le format choisi au niveau legs.
    // Un match en SETS conserve 1 leg/set par défaut pour rester réellement "rapide".
    const setTarget = unit === "sets" ? selectedTarget : 1;
    const legTarget = unit === "legs" ? selectedTarget : 1;
    const legsPerSet = victoryMode === "best_of" ? legTarget : 1;

    const cfg: any = {
      id: `x01v3-${sessionId}`,
      createdAt: Date.now(),
      startScore,
      x01StartScore: startScore,
      inMode,
      outMode,
      gameMode: isTeams ? "teams" : isMulti ? "multi" : "solo",
      matchMode: isTeams ? "teams" : isMulti ? "multi" : "solo",
      x01Variant: isTeams ? "team" : isMulti ? "multi" : playerCount === 2 ? "duo" : "solo",
      players,
      teams: isTeams
        ? [
            { id: `${sessionId}-team-1`, name: "ÉQUIPE 1", players: [players[0].id, players[1].id] },
            { id: `${sessionId}-team-2`, name: "ÉQUIPE 2", players: [players[2].id, players[3].id] },
          ]
        : undefined,
      multiFinishMode: isMulti ? "stop_on_first" : "stop_on_first",
      serveMode: "alternate",
      matchVictoryMode: victoryMode,
      victoryMode,
      matchFormat,
      setVictoryMode: victoryMode,
      setVictoryTarget: setTarget,
      setFormat: { type: victoryMode, target: setTarget, unit: "sets" },
      legVictoryMode: victoryMode,
      legVictoryTarget: legTarget,
      legFormat: { type: victoryMode, target: legTarget, unit: "legs" },
      setsToWin: setTarget,
      legsPerSet,
      scoringSource: "manual",
      externalScoring: false,
      scoreInputDefaultMethod: "visit_score",
      voiceScoreInputEnabled: false,
      audio: { arcadeEnabled: false, hitEnabled: false, voiceEnabled: false, sfxVolume: 0 },
      quickParty: true,
      partyMode: "quick",
      profileStatsDeferred: true,
      temporaryParticipants: true,
      quickInputCanSwitchToDetailed: true,
    };

    try {
      localStorage.setItem(LS_KEY, JSON.stringify({ mode, multiCount, startScore, inMode, outMode, victoryMode, target: selectedTarget, unit }));
    } catch {}
    onStart(cfg as X01ConfigV3);
  }

  const block: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 18,
    background: "rgba(255,255,255,.035)",
    padding: 12,
    display: "grid",
    gap: 9,
  };
  const label: React.CSSProperties = { fontSize: 10, opacity: .55, fontWeight: 950, letterSpacing: .7 };

  return (
    <div style={{ color: "#fff", minHeight: "100%", padding: "10px 12px 28px", display: "grid", gap: 12, alignContent: "start" }}>
      <div style={{ display: "grid", gridTemplateColumns: "42px 1fr 42px", alignItems: "center" }}>
        <button type="button" onClick={onBack} style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,.15)", background: "rgba(255,255,255,.05)", color: "#fff", fontSize: 22 }}>‹</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 1000, fontSize: 22 }}>⚡ PARTIE RAPIDE X01</div>
          <div style={{ fontSize: 10, opacity: .58, fontWeight: 850 }}>SANS PROFIL · SON COUPÉ · SAISIE VOLÉE PAR DÉFAUT</div>
        </div>
        <div />
      </div>

      <div style={{ maxWidth: 900, width: "100%", margin: "0 auto", display: "grid", gap: 10 }}>
        <div style={block}>
          <div style={label}>FORMAT JOUEURS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
            {([['solo','SOLO'],['duel','1 VS 1'],['teams','2 VS 2'],['multi','MULTI']] as any[]).map(([key, text]) => (
              <button key={key} type="button" onClick={() => setMode(key)} style={chip(mode === key, "#52f5b2")}>{text}</button>
            ))}
          </div>
          {mode === "multi" ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 12 }}>
              <button type="button" style={chip(false, accent)} onClick={() => setMultiCount((n) => Math.max(3, n - 1))}>−</button>
              <strong>{multiCount} JOUEURS</strong>
              <button type="button" style={chip(false, accent)} onClick={() => setMultiCount((n) => Math.min(10, n + 1))}>+</button>
            </div>
          ) : null}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(145px, 1fr))", gap: 7 }}>
            {shownNames.map((name, i) => (
              <label key={i} style={{ display: "grid", gap: 4 }}>
                <span style={{ fontSize: 9, opacity: .48, fontWeight: 900 }}>{mode === "teams" ? `ÉQUIPE ${i < 2 ? 1 : 2} · J${i + 1}` : `J${i + 1}`}</span>
                <input
                  value={name}
                  onFocus={(e) => (e.currentTarget.select())}
                  onChange={(e) => updateName(i, e.target.value)}
                  placeholder={`J${i + 1}`}
                  maxLength={22}
                  style={{ borderRadius: 11, border: "1px solid rgba(255,255,255,.12)", background: "rgba(0,0,0,.24)", color: "#fff", padding: "10px 11px", fontWeight: 850, outline: "none" }}
                />
              </label>
            ))}
          </div>
        </div>

        <div style={block}>
          <div style={label}>SCORE DE DÉPART</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 7 }}>
            {[301,501,701,901].map((v) => <button key={v} type="button" style={chip(startScore === v, accent)} onClick={() => setStartScore(v as any)}>{v}</button>)}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 10 }}>
          <div style={block}>
            <div style={label}>IN</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <button type="button" style={chip(inMode === "single", accent)} onClick={() => setInMode("single")}>SIMPLE IN</button>
              <button type="button" style={chip(inMode === "double", accent)} onClick={() => setInMode("double")}>DOUBLE IN</button>
            </div>
          </div>
          <div style={block}>
            <div style={label}>OUT</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
              <button type="button" style={chip(outMode === "single", accent)} onClick={() => setOutMode("single")}>SIMPLE OUT</button>
              <button type="button" style={chip(outMode === "double", accent)} onClick={() => setOutMode("double")}>DOUBLE OUT</button>
            </div>
          </div>
        </div>

        <div style={block}>
          <div style={label}>FORMAT MATCH</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <button type="button" style={chip(victoryMode === "best_of", "#ffc857")} onClick={() => setVictoryMode("best_of")}>BEST OF</button>
            <button type="button" style={chip(victoryMode === "first_to", "#ffc857")} onClick={() => setVictoryMode("first_to")}>FIRST TO</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))", gap: 6 }}>
            {(victoryMode === "best_of" ? BO_VALUES : FT_VALUES).map((v) => <button key={v} type="button" style={chip(target === v, "#ffc857")} onClick={() => setTarget(v)}>{v}</button>)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
            <button type="button" style={chip(unit === "legs", "#ffc857")} onClick={() => setUnit("legs")}>LEGS</button>
            <button type="button" style={chip(unit === "sets", "#ffc857")} onClick={() => setUnit("sets")}>SETS</button>
          </div>
        </div>

        <div style={{ borderRadius: 16, border: "1px solid #52f5b244", background: "#52f5b20d", padding: 10, textAlign: "center", fontSize: 12, fontWeight: 900 }}>
          {startScore} · {inMode === "double" ? "DOUBLE IN" : "SIMPLE IN"} · {outMode === "double" ? "DOUBLE OUT" : "SIMPLE OUT"} · {victoryMode === "best_of" ? "BO" : "FT"}{target} {unit.toUpperCase()}
        </div>

        <button
          type="button"
          onClick={start}
          style={{ minHeight: 56, border: "1px solid #52f5b2aa", borderRadius: 17, background: "linear-gradient(180deg,#52f5b23a,#52f5b214)", color: "#baffdf", fontWeight: 1000, fontSize: 18, letterSpacing: .6, cursor: "pointer" }}
        >
          JOUER
        </button>
      </div>
    </div>
  );
}
