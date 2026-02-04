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
    });

    setTeams(teamA, teamB);
    setMode(mode);
    setTarget(clamp(target, 1, 99));
    setTeamsProfiles(selA.slice(0, capA), selB.slice(0, capB));
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
