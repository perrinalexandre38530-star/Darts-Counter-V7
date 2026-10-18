// @ts-nocheck
import React from "react";
import type { X01ConfigV3 } from "../types/x01v3";
import { useTheme } from "../contexts/ThemeContext";
import BackDot from "../components/BackDot";
import tickerX01 from "../assets/tickers/ticker_x01.png";
import X01AwenaRulesVideo from "../components/X01AwenaRulesVideo";
import x01AwenaRulesPoster from "../assets/videos/x01_awena_rules_poster.webp";

type QuickMode = "solo" | "duel" | "teams" | "multi";
type VictoryMode = "best_of" | "first_to";
type FormatUnit = "legs" | "sets";

const LS_KEY = "mss:x01:quick-config:v1";
const BO_VALUES = [1, 3, 5, 7];
const FT_VALUES = [1, 3, 5, 7, 9, 11, 13];

function chip(active: boolean, accent: string): React.CSSProperties {
  return {
    borderRadius: 14,
    border: `1px solid ${active ? accent : "rgba(255,255,255,.13)"}`,
    background: active ? `${accent}22` : "rgba(255,255,255,.035)",
    color: active ? accent : "rgba(255,255,255,.86)",
    fontWeight: 950,
    minHeight: 44,
    padding: "8px 12px",
    cursor: "pointer",
    boxShadow: active ? `0 0 0 1px ${accent}22 inset, 0 0 18px ${accent}12` : "none",
  };
}

export default function X01QuickConfig({ onBack, onStart }: { onBack: () => void; onStart: (cfg: X01ConfigV3) => void }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#55e6ff";
  const primarySoft = `${accent}22`;
  const warm = "#ffc857";
  const [rulesVideoOpen, setRulesVideoOpen] = React.useState(false);
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
  const summary = `${startScore} · ${inMode === "double" ? "DOUBLE IN" : "SIMPLE IN"} · ${outMode === "double" ? "DOUBLE OUT" : "SIMPLE OUT"} · ${victoryMode === "best_of" ? "BO" : "FT"}${target} ${unit.toUpperCase()}`;

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

  const card: React.CSSProperties = {
    background: "rgba(10,12,24,0.94)",
    borderRadius: 18,
    padding: 12,
    boxShadow: "0 16px 40px rgba(0,0,0,0.55)",
    border: `1px solid ${accent}33`,
  };
  const block: React.CSSProperties = {
    border: "1px solid rgba(255,255,255,.10)",
    borderRadius: 18,
    background: "rgba(255,255,255,.035)",
    padding: 12,
    display: "grid",
    gap: 9,
  };
  const label: React.CSSProperties = { fontSize: 11, opacity: .62, fontWeight: 950, letterSpacing: .85, textTransform: "uppercase" };

  return (
    <div
      className="screen x01-config-v3-screen msc-mode-config"
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        padding: "12px 12px 76px",
        background: "radial-gradient(circle at top, #15192c 0, #05060c 50%, #020308 100%)",
        color: "#fff",
      }}
    >
      <header className="msc-mode-config-header" style={{ marginBottom: 10, marginLeft: -12, marginRight: -12 }}>
        <div className="msc-config-ticker-frame" style={{ position: "relative", width: "100%", paddingTop: "max(6px, env(safe-area-inset-top))" }}>
          <img className="msc-config-ticker-image" src={tickerX01} alt="X01" style={{ width: "100%", height: "auto", display: "block", userSelect: "none", pointerEvents: "none" }} draggable={false} />
          <div style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot onClick={onBack} title="Retour" size={36} color={accent} glow={`${accent}88`} />
          </div>
        </div>
      </header>

      <div style={{ flex: 1, overflowY: "auto", paddingTop: 4, paddingBottom: 12, display: "grid", gap: 14 }}>
        <section style={card}>
          <div style={{ display: "flex", alignItems: "stretch", justifyContent: "space-between", gap: 12 }}>
            <div style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: accent }}>Configuration X01</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" style={{ ...chip(true, accent), minHeight: 38, padding: "8px 16px" }}>Partie rapide</button>
                <button type="button" style={{ ...chip(false, accent), minHeight: 38, padding: "8px 16px", opacity: .88 }}>Arcade disponible</button>
              </div>
              <div style={{ fontSize: 11, color: "#9298bb", lineHeight: 1.35 }}>
                La configuration rapide va à l’essentiel. Tu lances un vrai match X01 sans profils, avec saisie volée par défaut et sons coupés.
              </div>
              <div style={{ marginTop: "auto", width: "100%" }}>
                <div style={{ position: "relative", height: 44, borderRadius: 14, overflow: "hidden", boxShadow: `0 0 16px ${accent}20`, border: `1px solid ${accent}30` }}>
                  <svg viewBox="0 0 760 88" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: "100%" }} aria-hidden="true">
                    <defs>
                      <linearGradient id="awenaExplainGradientQuick" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor={accent} stopOpacity="0.96" />
                        <stop offset="55%" stopColor="#ffe09a" stopOpacity="0.96" />
                        <stop offset="100%" stopColor="#ff9adf" stopOpacity="0.96" />
                      </linearGradient>
                      <mask id="awenaExplainCutoutMaskQuick">
                        <rect x="0" y="0" width="760" height="88" rx="16" ry="16" fill="white" />
                        <text x="380" y="57" textAnchor="middle" fontSize="28" fontWeight="900" letterSpacing="1.6" fill="black" style={{ textTransform: "uppercase" }}>AWENA VOUS EXPLIQUE</text>
                      </mask>
                    </defs>
                    <rect x="0" y="0" width="760" height="88" rx="16" ry="16" fill="url(#awenaExplainGradientQuick)" mask="url(#awenaExplainCutoutMaskQuick)" />
                  </svg>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setRulesVideoOpen(true)}
              aria-label="Voir la vidéo Awena des règles du X01"
              title="Awena · Voir l’explication vidéo"
              style={{
                flex: "0 0 auto",
                width: 98,
                alignSelf: "stretch",
                borderRadius: 18,
                border: `1px solid ${accent}66`,
                background: "linear-gradient(180deg, rgba(10,14,28,.98), rgba(6,8,18,.98))",
                padding: 5,
                display: "flex",
                flexDirection: "column",
                gap: 6,
                cursor: "pointer",
                boxShadow: `0 0 20px ${accent}1c`,
              }}
            >
              <div style={{ position: "relative", width: "100%", aspectRatio: "9 / 16", borderRadius: 14, overflow: "hidden", background: "#050713", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.05)" }}>
                <img src={x01AwenaRulesPoster} alt="Awena vous explique les règles du X01" style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }} />
                <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.04), rgba(0,0,0,.36))" }} />
                <div style={{ position: "absolute", inset: "auto 0 8px 0", display: "flex", justifyContent: "center" }}>
                  <div style={{ width: 40, height: 40, borderRadius: 999, border: `1px solid ${accent}aa`, background: "rgba(5,10,24,.78)", color: "#fff", display: "grid", placeItems: "center", boxShadow: `0 0 0 1px ${accent}18 inset, 0 0 14px ${accent}2b` }}>▶</div>
                </div>
                <div style={{ position: "absolute", right: 7, bottom: 7, borderRadius: 999, background: "rgba(0,0,0,.72)", color: "#fff", fontWeight: 900, fontSize: 10, padding: "4px 8px" }}>35 s</div>
              </div>
              <div style={{ padding: "0 4px 3px", textAlign: "left" }}>
                <div style={{ fontSize: 10, fontWeight: 1000, letterSpacing: .7, color: accent }}>AWENA · RÈGLES X01</div>
                <div style={{ fontSize: 9.5, color: "#fff", fontWeight: 900, lineHeight: 1.22 }}>Voir la vidéo</div>
              </div>
            </button>
          </div>
        </section>

        <section style={card}>
          <div style={{ display: "grid", gap: 12 }}>
            <div>
              <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, fontWeight: 900, color: accent }}>Configuration rapide</div>
              <div style={{ marginTop: 4, fontSize: 11, color: "#9aa1bf" }}>Même moteur X01 que l’Arcade · profils temporaires · sauvegarde dans PARTIES RAPIDES.</div>
            </div>

            <div style={block}>
              <div style={label}>Format joueurs</div>
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
              <div style={label}>Score de départ</div>
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
              <div style={label}>Format match</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <button type="button" style={chip(victoryMode === "best_of", warm)} onClick={() => setVictoryMode("best_of")}>BEST OF</button>
                <button type="button" style={chip(victoryMode === "first_to", warm)} onClick={() => setVictoryMode("first_to")}>FIRST TO</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(48px, 1fr))", gap: 6 }}>
                {(victoryMode === "best_of" ? BO_VALUES : FT_VALUES).map((v) => <button key={v} type="button" style={chip(target === v, warm)} onClick={() => setTarget(v)}>{v}</button>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 7 }}>
                <button type="button" style={chip(unit === "legs", warm)} onClick={() => setUnit("legs")}>LEGS</button>
                <button type="button" style={chip(unit === "sets", warm)} onClick={() => setUnit("sets")}>SETS</button>
              </div>
            </div>

            <div style={{ borderRadius: 16, border: `1px solid ${accent}44`, background: `${accent}0d`, padding: 10, textAlign: "center", fontSize: 12, fontWeight: 900 }}>
              {summary}
            </div>

            <button type="button" onClick={start} style={{ minHeight: 58, border: `1px solid ${accent}aa`, borderRadius: 17, background: `linear-gradient(180deg, ${accent}3a, ${accent}14)`, color: "#e8fff7", fontWeight: 1000, fontSize: 18, letterSpacing: .6, cursor: "pointer", boxShadow: `0 0 22px ${accent}18` }}>
              JOUER
            </button>
          </div>
        </section>
      </div>

      <X01AwenaRulesVideo open={rulesVideoOpen} onDone={() => setRulesVideoOpen(false)} />
    </div>
  );
}
