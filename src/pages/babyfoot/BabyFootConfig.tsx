// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Config Baby-Foot (LOCAL ONLY) — V2
// - Mode 1v1 / 2v2 / 2v1
// - Sélection de profils réels par équipe (comme Darts/Pétanque)
// - Score cible
// - Démarre la partie avec un state babyfootStore propre
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
  setAdvancedOptions,
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

export default function BabyFootConfig({ go, store, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const saved = useMemo(() => loadBabyFootState(), []);
    const presetMode = (params as any)?.presetMode as BabyFootMode | undefined;
  const presetTarget = (params as any)?.presetTarget as number | undefined;
  const [mode, setModeUI] = useState<BabyFootMode>(presetMode || saved.mode || "1v1");
  const [teamA, setTeamA] = useState(saved.teamA || "TEAM A");
  const [teamB, setTeamB] = useState(saved.teamB || "TEAM B");
  const [target, setTargetUI] = useState<number>(presetTarget ?? saved.target ?? 10);

  // Options avancées (V3)
  const [useTimer, setUseTimer] = useState<boolean>(Number.isFinite((saved as any).matchDurationSec) && (saved as any).matchDurationSec > 0);
  const [durationSec, setDurationSec] = useState<number>(params?.presetDurationSec ?? ((saved as any).matchDurationSec ?? 180));
  const [overtimeSec, setOvertimeSec] = useState<number>(((saved as any).overtimeSec ?? 60));
  const [goldenGoal, setGoldenGoal] = useState<boolean>(!!(saved as any).goldenGoal);
  const [overtimeGoldenGoal, setOvertimeGoldenGoal] = useState<boolean>((saved as any).overtimeGoldenGoal === undefined ? true : !!(saved as any).overtimeGoldenGoal);

  const [setsEnabled, setSetsEnabled] = useState<boolean>(!!(saved as any).setsEnabled);
  const [setsBestOf, setSetsBestOf] = useState<1 | 3 | 5>((((saved as any).setsBestOf ?? 3) === 5 ? 5 : ((saved as any).setsBestOf ?? 3) === 1 ? 1 : 3) as any);
  const [setTarget, setSetTarget] = useState<number>(((saved as any).setTarget ?? 5));

  const [handicapA, setHandicapA] = useState<number>(((saved as any).handicapA ?? 0));
  const [handicapB, setHandicapB] = useState<number>(((saved as any).handicapB ?? 0));

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
        // prevent selecting same profile in both teams
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
    // persist config in store
    resetBabyFoot({
      teamA,
      teamB,
      mode,
      teamAPlayers: capA,
      teamBPlayers: capB,
      target: clamp(target, 1, 99),
      teamAProfileIds: selA.slice(0, capA),
      teamBProfileIds: selB.slice(0, capB),

      matchDurationSec: useTimer ? clamp(durationSec, 30, 3600) : null,
      overtimeSec: clamp(overtimeSec, 0, 600),
      goldenGoal,
      overtimeGoldenGoal,

      setsEnabled,
      setsBestOf,
      setTarget: clamp(setTarget, 1, 99),

      handicapA: clamp(handicapA, 0, 20),
      handicapB: clamp(handicapB, 0, 20),
    });

    setTeams(teamA, teamB);
    setMode(mode);
    setTarget(clamp(target, 1, 99));
    setTeamsProfiles(selA.slice(0, capA), selB.slice(0, capB));
    setAdvancedOptions({
      matchDurationSec: useTimer ? clamp(durationSec, 30, 3600) : null,
      overtimeSec: clamp(overtimeSec, 0, 600),
      goldenGoal,
      overtimeGoldenGoal,
      setsEnabled,
      setsBestOf,
      setTarget: clamp(setTarget, 1, 99),
      handicapA: clamp(handicapA, 0, 20),
      handicapB: clamp(handicapB, 0, 20),
    });
    startMatch();

    go("babyfoot_play");
  };

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("babyfoot_menu")} />
        <div style={topTitle}>BABY-FOOT — CONFIG</div>
        <InfoDot
          title={t?.("babyfoot.config.infoTitle") ?? "Baby-foot"}
          body={
            t?.("babyfoot.config.infoBody") ??
            "Configure le format, les équipes, les profils et le score cible. Local only."
          }
        />
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>FORMAT</div>
        <div style={modeRow}>
          {(["1v1", "2v2", "2v1"] as BabyFootMode[]).map((m) => (
            <button
              key={m}
              style={modeBtn(theme, mode === m)}
              onClick={() => {
                setModeUI(m);
                // trim selections to caps
                const nextCapA = m === "2v2" || m === "2v1" ? 2 : 1;
                const nextCapB = m === "2v2" ? 2 : 1;
                setSelA((x) => x.slice(0, nextCapA));
                setSelB((x) => x.slice(0, nextCapB));
              }}
            >
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <div style={row2}>
          <div style={col}>
            <div style={label}>Nom équipe A</div>
            <input value={teamA} onChange={(e) => setTeamA(e.target.value)} style={input(theme)} />
          </div>
          <div style={col}>
            <div style={label}>Nom équipe B</div>
            <input value={teamB} onChange={(e) => setTeamB(e.target.value)} style={input(theme)} />
          </div>
        </div>

        <div style={{ ...row2, marginTop: 14 }}>
          <div style={col}>
            <div style={label}>Score cible</div>
            <input
              value={String(target)}
              onChange={(e) => setTargetUI(parseInt(e.target.value || "0", 10))}
              style={input(theme)}
              inputMode="numeric"
            />

          </div>

          {/* Options avancées */}
          <div style={{ ...card(theme), marginTop: 12 }}>
            <div style={{ ...sectionTitle, marginBottom: 10 }}>Options avancées</div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <div style={col}>
                <div style={label}>Chrono</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <button
                    onClick={() => setUseTimer((v) => !v)}
                    style={pill(theme, useTimer)}
                  >
                    {useTimer ? "ON" : "OFF"}
                  </button>
                  <input
                    value={String(durationSec)}
                    onChange={(e) => setDurationSec(parseInt(e.target.value || "0", 10))}
                    style={{ ...input(theme), width: 120, opacity: useTimer ? 1 : 0.45 }}
                    inputMode="numeric"
                    disabled={!useTimer}
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>sec</div>
                </div>
              </div>

              <div style={col}>
                <div style={label}>Prolongation</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <input
                    value={String(overtimeSec)}
                    onChange={(e) => setOvertimeSec(parseInt(e.target.value || "0", 10))}
                    style={{ ...input(theme), width: 120 }}
                    inputMode="numeric"
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>sec</div>
                </div>
                <div style={{ marginTop: 6 }}>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                    <input
                      type="checkbox"
                      checked={overtimeGoldenGoal}
                      onChange={(e) => setOvertimeGoldenGoal(!!e.target.checked)}
                    />
                    Golden goal (prolongation)
                  </label>
                </div>
              </div>

              <div style={col}>
                <div style={label}>Golden Goal (match)</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                  <input type="checkbox" checked={goldenGoal} onChange={(e) => setGoldenGoal(!!e.target.checked)} />
                  1er but = victoire
                </label>
              </div>

              <div style={col}>
                <div style={label}>Sets</div>
                <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontWeight: 900, opacity: 0.85 }}>
                  <input type="checkbox" checked={setsEnabled} onChange={(e) => setSetsEnabled(!!e.target.checked)} />
                  Activer les sets (BO3/BO5)
                </label>
                <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 8, opacity: setsEnabled ? 1 : 0.45 }}>
                  <select
                    value={String(setsBestOf)}
                    onChange={(e) => setSetsBestOf((parseInt(e.target.value || "3", 10) as any) as 1 | 3 | 5)}
                    style={{ ...input(theme), height: 42, padding: "0 10px" }}
                    disabled={!setsEnabled}
                  >
                    <option value="1">BO1</option>
                    <option value="3">BO3</option>
                    <option value="5">BO5</option>
                  </select>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Set cible</div>
                  <input
                    value={String(setTarget)}
                    onChange={(e) => setSetTarget(parseInt(e.target.value || "0", 10))}
                    style={{ ...input(theme), width: 90 }}
                    inputMode="numeric"
                    disabled={!setsEnabled}
                  />
                </div>
              </div>

              <div style={col}>
                <div style={label}>Handicap</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>A</div>
                  <input
                    value={String(handicapA)}
                    onChange={(e) => setHandicapA(parseInt(e.target.value || "0", 10))}
                    style={{ ...input(theme), width: 80 }}
                    inputMode="numeric"
                  />
                  <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>B</div>
                  <input
                    value={String(handicapB)}
                    onChange={(e) => setHandicapB(parseInt(e.target.value || "0", 10))}
                    style={{ ...input(theme), width: 80 }}
                    inputMode="numeric"
                  />
                </div>
                <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7, fontWeight: 800 }}>
                  Bonus appliqué au score initial (par set si sets activés).
                </div>
              </div>
            </div>
          </div>

          <div style={col}>
            <div style={label}>Rappel</div>
            <div style={hint}>
              {capA} joueur(s) équipe A • {capB} joueur(s) équipe B
            </div>
          </div>
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>JOUEURS — ÉQUIPE A</div>
        <ProfileMedallionCarousel
          items={medallions}
          selectedIds={selA}
          onToggle={(id) => toggle("A", id)}
          theme={theme}
          maxSelected={capA}
        />
        <div style={smallHint}>Sélectionne {capA} profil(s). (Un profil ne peut pas être dans les 2 équipes.)</div>
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>JOUEURS — ÉQUIPE B</div>
        <ProfileMedallionCarousel
          items={medallions}
          selectedIds={selB}
          onToggle={(id) => toggle("B", id)}
          theme={theme}
          maxSelected={capB}
        />
        <div style={smallHint}>Sélectionne {capB} profil(s).</div>
      </div>

      <button style={cta(theme, canStart)} onClick={onStart} disabled={!canStart}>
        LANCER LA PARTIE
      </button>
    </div>
  );
}

const wrap = (theme: any) => ({
  minHeight: "100vh",
  padding: 14,
  background: theme?.colors?.bg ?? "#05060a",
  color: theme?.colors?.text ?? "#fff",
});

const topRow: any = {
  display: "grid",
  gridTemplateColumns: "48px 1fr 48px",
  alignItems: "center",
  gap: 10,
  marginBottom: 12,
};

const topTitle: any = {
  textAlign: "center",
  fontWeight: 900,
  letterSpacing: 1,
  opacity: 0.95,
};

const card = (theme: any) => ({
  background: "rgba(255,255,255,0.06)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: 16,
  padding: 12,
  marginBottom: 12,
  boxShadow: "0 12px 28px rgba(0,0,0,0.35)",
});

const sectionTitle: any = {
  fontWeight: 900,
  letterSpacing: 0.6,
  marginBottom: 10,
  opacity: 0.9,
};

const modeRow: any = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: 10,
};

const modeBtn = (theme: any, active: boolean) => ({
  padding: "12px 10px",
  borderRadius: 14,
  border: "1px solid rgba(255,255,255,0.16)",
  background: active ? "rgba(255,255,255,0.16)" : "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 900,
  cursor: "pointer",
});



const pill = (theme: any, active: boolean) => ({
  height: 36,
  padding: "0 14px",
  borderRadius: 999,
  border: "1px solid rgba(255,255,255,0.16)",
  background: active ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 0.8,
  cursor: "pointer",
});
const row2: any = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 10,
  marginTop: 12,
};

const col: any = { display: "grid", gap: 6 };

const label: any = {
  fontSize: 12,
  opacity: 0.85,
  fontWeight: 800,
  letterSpacing: 0.4,
};

const input = (theme: any) => ({
  height: 42,
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "rgba(0,0,0,0.22)",
  color: theme?.colors?.text ?? "#fff",
  padding: "0 12px",
  outline: "none",
  fontWeight: 800,
});

const hint: any = {
  height: 42,
  borderRadius: 12,
  border: "1px dashed rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.12)",
  display: "flex",
  alignItems: "center",
  padding: "0 12px",
  opacity: 0.9,
  fontWeight: 800,
};

const smallHint: any = { marginTop: 8, opacity: 0.7, fontSize: 12 };

const cta = (theme: any, enabled: boolean) => ({
  marginTop: 6,
  width: "100%",
  height: 54,
  borderRadius: 16,
  border: "1px solid rgba(255,255,255,0.18)",
  background: enabled ? "rgba(255,255,255,0.18)" : "rgba(255,255,255,0.08)",
  color: theme?.colors?.text ?? "#fff",
  fontWeight: 950,
  letterSpacing: 1,
  cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? "0 14px 34px rgba(0,0,0,0.35)" : "none",
});
