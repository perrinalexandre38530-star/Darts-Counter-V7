// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Config Baby-Foot (LOCAL ONLY) — V3
// - Mode 1v1 / 2v2 / 2v1
// - Sélection de profils réels par équipe (comme Darts/Pétanque)
// - Score cible (ou Sets BO3/BO5) + Handicap + Golden Goal
// - Chrono + prolongation + tirs au but (auto)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileMedallionCarousel from "../../components/ProfileMedallionCarousel";
import type { Store, Profile } from "../../lib/types";

import {
  loadBabyFootState,
  resetBabyFoot,
  setMode,
  setTarget,
  setTeams,
  setTeamsProfiles,
  setOptions,
  startMatch,
  type BabyFootMode,
} from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store: Store;
};

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

function toInt(v: any, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

export default function BabyFootConfig({ go, store, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const saved = useMemo(() => loadBabyFootState(), []);

  const presetMode = (params as any)?.presetMode as BabyFootMode | undefined;
  const presetTarget = (params as any)?.presetTarget as number | undefined;
  const presetDurationSec = (params as any)?.presetDurationSec as number | undefined;
  const presetGoldenGoal = !!(params as any)?.presetGoldenGoal;
  const presetBestOf = (params as any)?.presetBestOf as 0 | 3 | 5 | undefined;
  const presetSetTarget = (params as any)?.presetSetTarget as number | undefined;
  const presetHandicapA = (params as any)?.presetHandicapA as number | undefined;
  const presetHandicapB = (params as any)?.presetHandicapB as number | undefined;

  const [mode, setModeUI] = useState<BabyFootMode>(presetMode || saved.mode || "1v1");
  const [teamA, setTeamA] = useState(saved.teamA || "TEAM A");
  const [teamB, setTeamB] = useState(saved.teamB || "TEAM B");

  // scoring
  const [target, setTargetUI] = useState<number>(presetTarget ?? saved.target ?? 10);

  // options
  const [goldenGoal, setGoldenGoal] = useState<boolean>(presetGoldenGoal || saved.goldenGoal || false);
  const [setsBestOf, setSetsBestOf] = useState<0 | 3 | 5>((presetBestOf ?? saved.setsBestOf ?? 0) as any);
  const [setTarget, setSetTarget] = useState<number>(presetSetTarget ?? saved.setTarget ?? 7);
  const [handicapA, setHandicapA] = useState<number>(presetHandicapA ?? saved.handicapA ?? 0);
  const [handicapB, setHandicapB] = useState<number>(presetHandicapB ?? saved.handicapB ?? 0);

  // timer
  const [chronoOn, setChronoOn] = useState<boolean>(presetDurationSec ? true : saved.matchDurationSec ? true : false);
  const [durationSec, setDurationSec] = useState<number>(presetDurationSec ?? saved.matchDurationSec ?? 210);
  const [overtimeSec, setOvertimeSec] = useState<number>(saved.overtimeSec ?? 60);

  const [selA, setSelA] = useState<string[]>(Array.isArray(saved.teamAProfileIds) ? saved.teamAProfileIds : []);
  const [selB, setSelB] = useState<string[]>(Array.isArray(saved.teamBProfileIds) ? saved.teamBProfileIds : []);

  const capA = mode === "2v2" || mode === "2v1" ? 2 : 1;
  const capB = mode === "2v2" ? 2 : 1;

  const profiles: Profile[] = (store as any)?.profiles || [];
  const medallions = profiles.map((p) => ({ id: p.id, name: p.name, profile: p }));

  const canStart = selA.length === capA && selB.length === capB;

  const toggle = (team: "A" | "B", id: string) => {
    if (team === "A") {
      setSelA((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capA) return prev; // cap
        if (selB.includes(id)) return prev;
        return [...prev, id];
      });
    } else {
      setSelB((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= capB) return prev;
        if (selA.includes(id)) return prev;
        return [...prev, id];
      });
    }
  };

  const onStart = () => {
    const tgt = clamp(toInt(target, 10), 1, 99);
    const bo: 0 | 3 | 5 = setsBestOf === 3 || setsBestOf === 5 ? setsBestOf : 0;

    resetBabyFoot({
      teamA,
      teamB,
      mode,
      teamAPlayers: capA,
      teamBPlayers: capB,
      target: tgt,

      teamAProfileIds: selA.slice(0, capA),
      teamBProfileIds: selB.slice(0, capB),

      goldenGoal: !!goldenGoal,
      setsBestOf: bo,
      setTarget: clamp(toInt(setTarget, 7), 1, 30),
      handicapA: clamp(toInt(handicapA, 0), 0, 20),
      handicapB: clamp(toInt(handicapB, 0), 0, 20),

      matchDurationSec: chronoOn ? clamp(toInt(durationSec, 210), 10, 3600) : null,
      overtimeSec: clamp(toInt(overtimeSec, 60), 0, 600),
    });

    setTeams(teamA, teamB);
    setMode(mode);
    setTarget(tgt);
    setTeamsProfiles(selA.slice(0, capA), selB.slice(0, capB));
    setOptions({
      goldenGoal: !!goldenGoal,
      setsBestOf: bo,
      setTarget: clamp(toInt(setTarget, 7), 1, 30),
      handicapA: clamp(toInt(handicapA, 0), 0, 20),
      handicapB: clamp(toInt(handicapB, 0), 0, 20),
      matchDurationSec: chronoOn ? clamp(toInt(durationSec, 210), 10, 3600) : null,
      overtimeSec: clamp(toInt(overtimeSec, 60), 0, 600),
    });

    startMatch();
    go("babyfoot_play");
  };

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>BABY-FOOT — CONFIG</div>
        <InfoDot title="Baby-foot" body="Profils • Modes • Sets • Chrono • Local only" />
      </div>

      <div style={card(theme)}>
        <div style={h2(theme)}>{t("babyfoot.config.mode", "Mode")}</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {(["1v1", "2v2", "2v1"] as BabyFootMode[]).map((m) => (
            <button
              key={m}
              onClick={() => {
                setModeUI(m);
                // auto-resize selection caps
                const nextCapA = m === "2v2" || m === "2v1" ? 2 : 1;
                const nextCapB = m === "2v2" ? 2 : 1;
                setSelA((prev) => prev.slice(0, nextCapA));
                setSelB((prev) => prev.slice(0, nextCapB));
              }}
              style={pill(theme, mode === m)}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div style={card(theme)}>
        <div style={h2(theme)}>{t("babyfoot.config.teams", "Équipes")}</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <div style={label(theme)}>TEAM A</div>
            <input value={teamA} onChange={(e) => setTeamA(e.target.value)} style={input(theme)} />
          </div>
          <div>
            <div style={label(theme)}>TEAM B</div>
            <input value={teamB} onChange={(e) => setTeamB(e.target.value)} style={input(theme)} />
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={h2(theme)}>{t("babyfoot.config.players", "Joueurs")}</div>

        <div style={sub(theme)}>
          TEAM A — {selA.length}/{capA}
        </div>
        <ProfileMedallionCarousel
          items={medallions as any}
          selectedIds={selA}
          onToggle={(id: string) => toggle("A", id)}
          maxSelected={capA}
        />

        <div style={{ height: 10 }} />

        <div style={sub(theme)}>
          TEAM B — {selB.length}/{capB}
        </div>
        <ProfileMedallionCarousel
          items={medallions as any}
          selectedIds={selB}
          onToggle={(id: string) => toggle("B", id)}
          maxSelected={capB}
        />

        {!canStart && (
          <div style={{ marginTop: 10, color: theme.textSoft, fontWeight: 800, fontSize: 12 }}>
            {t("babyfoot.config.needPlayers", "Sélectionne le bon nombre de joueurs pour chaque équipe.")}
          </div>
        )}
      </div>

      <div style={card(theme)}>
        <div style={h2(theme)}>{t("babyfoot.config.scoring", "Règles de score")}</div>

        <div style={row}>
          <div style={label(theme)}>{t("babyfoot.config.goldenGoal", "Golden goal")}</div>
          <button onClick={() => setGoldenGoal((v) => !v)} style={toggleBtn(theme, goldenGoal)}>
            {goldenGoal ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
        </div>

        <div style={row}>
          <div style={label(theme)}>{t("babyfoot.config.sets", "Sets")}</div>
          <select value={String(setsBestOf)} onChange={(e) => setSetsBestOf(toInt(e.target.value, 0) as any)} style={select(theme)}>
            <option value="0">{t("babyfoot.config.sets.off", "Off (score cible)")}</option>
            <option value="3">{t("babyfoot.config.sets.bo3", "BO3")}</option>
            <option value="5">{t("babyfoot.config.sets.bo5", "BO5")}</option>
          </select>
        </div>

        {setsBestOf ? (
          <div style={row}>
            <div style={label(theme)}>{t("babyfoot.config.setTarget", "But(s) pour gagner un set")}</div>
            <input
              value={String(setTarget)}
              onChange={(e) => setSetTarget(toInt(e.target.value, 7))}
              style={smallInput(theme)}
              inputMode="numeric"
            />
          </div>
        ) : (
          <div style={row}>
            <div style={label(theme)}>{t("babyfoot.config.target", "Score cible")}</div>
            <input
              value={String(target)}
              onChange={(e) => setTargetUI(toInt(e.target.value, 10))}
              style={smallInput(theme)}
              inputMode="numeric"
            />
          </div>
        )}

        <div style={row}>
          <div style={label(theme)}>{t("babyfoot.config.handicap", "Handicap (départ)")}</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ fontWeight: 900, opacity: 0.8 }}>A</div>
            <input value={String(handicapA)} onChange={(e) => setHandicapA(toInt(e.target.value, 0))} style={tinyInput(theme)} inputMode="numeric" />
            <div style={{ fontWeight: 900, opacity: 0.8 }}>B</div>
            <input value={String(handicapB)} onChange={(e) => setHandicapB(toInt(e.target.value, 0))} style={tinyInput(theme)} inputMode="numeric" />
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={h2(theme)}>{t("babyfoot.config.timer", "Chrono")}</div>

        <div style={row}>
          <div style={label(theme)}>{t("babyfoot.config.timer.enable", "Activer chrono")}</div>
          <button onClick={() => setChronoOn((v) => !v)} style={toggleBtn(theme, chronoOn)}>
            {chronoOn ? t("common.on", "ON") : t("common.off", "OFF")}
          </button>
        </div>

        {chronoOn && (
          <>
            <div style={row}>
              <div style={label(theme)}>{t("babyfoot.config.timer.duration", "Durée (sec)")}</div>
              <input value={String(durationSec)} onChange={(e) => setDurationSec(toInt(e.target.value, 210))} style={smallInput(theme)} inputMode="numeric" />
            </div>

            <div style={row}>
              <div style={label(theme)}>{t("babyfoot.config.timer.overtime", "Prolongation (sec)")}</div>
              <input value={String(overtimeSec)} onChange={(e) => setOvertimeSec(toInt(e.target.value, 60))} style={smallInput(theme)} inputMode="numeric" />
            </div>

            <div style={{ marginTop: 8, color: theme.textSoft, fontWeight: 800, fontSize: 12, lineHeight: 1.35 }}>
              {t(
                "babyfoot.config.timer.rule",
                "En cas d'égalité à la fin du temps : prolongation (si >0), sinon tirs au but automatiques."
              )}
            </div>
          </>
        )}
      </div>

      <button
        onClick={onStart}
        disabled={!canStart}
        style={{
          width: "100%",
          marginTop: 12,
          padding: "14px 14px",
          borderRadius: 18,
          border: "1px solid rgba(255,255,255,0.14)",
          background: canStart ? theme.primary : "rgba(255,255,255,0.08)",
          color: canStart ? "#001018" : theme.textSoft,
          fontWeight: 1000,
          letterSpacing: 1,
          cursor: canStart ? "pointer" : "not-allowed",
          boxShadow: canStart ? `0 0 22px ${theme.primary}55` : "none",
        }}
      >
        {t("babyfoot.config.start", "LANCER LA PARTIE")}
      </button>
    </div>
  );
}

const row: any = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 10 };

function wrap(theme: any) {
  return { minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text };
}
const topRow: any = { display: "grid", gridTemplateColumns: "48px 1fr 48px", alignItems: "center", gap: 10, marginBottom: 12 };
const topTitle: any = { textAlign: "center", fontWeight: 950, letterSpacing: 1, opacity: 0.95 };
function card(theme: any) {
  return {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: theme.card,
    padding: 14,
    marginBottom: 12,
    boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
  };
}
function h2(theme: any) {
  return { fontWeight: 1000, color: theme.primary, letterSpacing: 0.8, marginBottom: 10 };
}
function sub(theme: any) {
  return { fontSize: 12, color: theme.textSoft, fontWeight: 900, marginBottom: 6 };
}
function label(theme: any) {
  return { fontSize: 12, color: theme.textSoft, fontWeight: 900 };
}
function input(theme: any) {
  return {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: "1px solid rgba(255,255,255,0.14)",
    background: "rgba(0,0,0,0.20)",
    color: theme.text,
    fontWeight: 900,
    outline: "none",
  };
}
function smallInput(theme: any) {
  return { ...input(theme), width: 96, textAlign: "center" as const };
}
function tinyInput(theme: any) {
  return { ...input(theme), width: 70, textAlign: "center" as const, padding: "8px 10px" };
}
function select(theme: any) {
  return { ...input(theme), width: 220, padding: "9px 10px" };
}
function pill(theme: any, active: boolean) {
  return {
    padding: "10px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.primary : "rgba(255,255,255,0.14)"}`,
    background: active ? `${theme.primary}22` : "rgba(0,0,0,0.20)",
    color: active ? theme.primary : theme.text,
    fontWeight: 1000,
    cursor: "pointer",
    minWidth: 80,
  };
}
function toggleBtn(theme: any, on: boolean) {
  return {
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${on ? theme.primary : "rgba(255,255,255,0.14)"}`,
    background: on ? `${theme.primary}22` : "rgba(0,0,0,0.20)",
    color: on ? theme.primary : theme.textSoft,
    fontWeight: 1000,
    cursor: "pointer",
    minWidth: 74,
    textAlign: "center" as const,
  };
}
