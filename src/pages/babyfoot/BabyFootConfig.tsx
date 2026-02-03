// =============================================================
// src/pages/babyfoot/BabyFootConfig.tsx
// Config Baby-Foot (LOCAL ONLY) — v2
// - Sélection des profils (comme Darts/Pétanque) + équipes
// - Modes : 1v1 / 2v2 / 2v1
// - Démarre une nouvelle partie en réinitialisant le state local
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import ProfileMedallionCarousel, { type MedallionItem } from "../../components/ProfileMedallionCarousel";
import {
  loadBabyFootState,
  resetBabyFoot,
  setConfig,
  type BabyFootMode,
  type BabyFootPlayer,
  type BabyFootTeamId,
} from "../../lib/babyfootStore";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store: any;
};

export default function BabyFootConfig({ go, params, store }: Props) {
  const { theme } = useTheme();
  const [st, setSt] = React.useState(() => loadBabyFootState());

  const mode: BabyFootMode = params?.mode === "2v2" ? "2v2" : params?.mode === "2v1" ? "2v1" : "1v1";
  const meta = params?.meta || {};
  const teamAPlayers = Math.max(
    1,
    Math.min(4, Number(meta.teamAPlayers) || (mode === "2v1" ? 2 : mode === "2v2" ? 2 : 1))
  );
  const teamBPlayers = Math.max(1, Math.min(4, Number(meta.teamBPlayers) || (mode === "2v1" ? 1 : mode === "2v2" ? 2 : 1)));

  const profiles = Array.isArray(store?.profiles) ? store.profiles : [];
  const humanProfiles = profiles.filter((p: any) => !(p as any)?.isBot);

  const items: MedallionItem[] = humanProfiles.map((p: any) => ({
    id: p.id,
    name: p.name ?? "",
    profile: p,
  }));

  const primary = theme?.colors?.primary ?? "#7dffca";
  const primarySoft = theme?.colors?.primarySoft ?? "rgba(125,255,202,0.16)";

  // Prefill: active profile in team A if possible
  const activeProfileId: string | null = store?.activeProfileId ?? null;

  const [teamA, setTeamA] = React.useState(st.teamA);
  const [teamB, setTeamB] = React.useState(st.teamB);
  const [target, setTarget] = React.useState(String(st.target || 10));

  const [teamAIds, setTeamAIds] = React.useState<string[]>(() => {
    const existing = (st.players || []).filter((pl) => pl.team === "A").map((pl) => pl.id);
    if (existing.length) return existing.slice(0, teamAPlayers);
    if (activeProfileId) return [activeProfileId].slice(0, teamAPlayers);
    return [];
  });
  const [teamBIds, setTeamBIds] = React.useState<string[]>(() => {
    const existing = (st.players || []).filter((pl) => pl.team === "B").map((pl) => pl.id);
    if (existing.length) return existing.slice(0, teamBPlayers);
    return [];
  });

  // ajuster si on change de mode (tailles)
  React.useEffect(() => {
    setTeamAIds((ids) => ids.slice(0, teamAPlayers));
    setTeamBIds((ids) => ids.slice(0, teamBPlayers));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamAPlayers, teamBPlayers]);

  function toggleFor(team: BabyFootTeamId, id: string) {
    if (team === "A") {
      setTeamAIds((prev) => {
        const has = prev.includes(id);
        const next = has ? prev.filter((x) => x !== id) : [...prev, id];
        // retirer aussi de l'autre team si présent
        const cleaned = next.filter((x, i, arr) => arr.indexOf(x) === i).slice(0, teamAPlayers);
        return cleaned;
      });
      setTeamBIds((prev) => prev.filter((x) => x !== id));
    } else {
      setTeamBIds((prev) => {
        const has = prev.includes(id);
        const next = has ? prev.filter((x) => x !== id) : [...prev, id];
        const cleaned = next.filter((x, i, arr) => arr.indexOf(x) === i).slice(0, teamBPlayers);
        return cleaned;
      });
      setTeamAIds((prev) => prev.filter((x) => x !== id));
    }
  }

  function buildPlayers(): BabyFootPlayer[] {
    const getProfile = (id: string) => humanProfiles.find((p: any) => p.id === id);
    const mk = (id: string, team: BabyFootTeamId): BabyFootPlayer => {
      const p = getProfile(id);
      return {
        id,
        team,
        name: p?.name ?? "",
        avatarDataUrl: p?.avatarDataUrl ?? null,
      };
    };
    const a = teamAIds.slice(0, teamAPlayers).map((id) => mk(id, "A"));
    const b = teamBIds.slice(0, teamBPlayers).map((id) => mk(id, "B"));
    return [...a, ...b];
  }

  const canStart = teamAIds.length === teamAPlayers && teamBIds.length === teamBPlayers;

  const onStart = () => {
    const base = resetBabyFoot(st);
    const next = setConfig(base, {
      teamA,
      teamB,
      target: Number(target) || 10,
      mode,
      teamAPlayers,
      teamBPlayers,
      players: buildPlayers(),
    });
    setSt(next);
    go("babyfoot_play", { matchId: next.matchId });
  };

  return (
    <div style={wrap(theme)}>
      <div style={head}>
        <button style={back(theme)} onClick={() => go("babyfoot_menu")}>
          ← Retour
        </button>
        <div style={title}>
          CONFIG — BABY-FOOT · {mode.toUpperCase()} ({teamAPlayers}v{teamBPlayers})
        </div>
      </div>

      <div style={card(theme)}>
        <div style={label}>Équipe A</div>
        <input value={teamA} onChange={(e) => setTeamA(e.target.value)} style={input(theme)} />

        <div style={{ height: 10 }} />

        <div style={label}>Équipe B</div>
        <input value={teamB} onChange={(e) => setTeamB(e.target.value)} style={input(theme)} />

        <div style={{ height: 12 }} />

        <div style={label}>Score cible</div>
        <input value={target} onChange={(e) => setTarget(e.target.value)} style={input(theme)} inputMode="numeric" />
      </div>

      <div style={card(theme)}>
        <div style={label}>Joueurs — {teamAPlayers} pour {teamA}</div>
        <ProfileMedallionCarousel
          items={items}
          selectedIds={teamAIds}
          onToggle={(id) => toggleFor("A", id)}
          primary={primary}
          primarySoft={primarySoft}
          grayscaleInactive
          padLeft={8}
        />

        <div style={{ height: 14 }} />

        <div style={label}>Joueurs — {teamBPlayers} pour {teamB}</div>
        <ProfileMedallionCarousel
          items={items}
          selectedIds={teamBIds}
          onToggle={(id) => toggleFor("B", id)}
          primary={primary}
          primarySoft={primarySoft}
          grayscaleInactive
          padLeft={8}
        />

        {!items.length ? (
          <div style={warn(theme)}>Aucun profil disponible. Crée un profil dans Profils.</div>
        ) : !canStart ? (
          <div style={warn(theme)}>
            Sélectionne {teamAPlayers} joueur(s) pour {teamA} et {teamBPlayers} pour {teamB}.
          </div>
        ) : null}
      </div>

      <div style={{ height: 10 }} />

      <button style={cta(theme, !canStart)} disabled={!canStart} onClick={onStart}>
        LANCER LA PARTIE
      </button>
    </div>
  );
}

function isDark(theme: any) {
  return theme?.id?.includes("dark") || theme?.id === "darkTitanium" || theme?.id === "dark";
}

function wrap(theme: any): React.CSSProperties {
  return {
    height: "100dvh",
    overflow: "auto",
    padding: 14,
    color: theme?.colors?.text ?? "#fff",
    background: isDark(theme)
      ? "radial-gradient(1200px 600px at 50% 10%, rgba(255,255,255,0.08), rgba(0,0,0,0.92))"
      : "radial-gradient(1200px 600px at 50% 10%, rgba(0,0,0,0.06), rgba(255,255,255,0.92))",
  };
}

const head: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 10 };
const title: React.CSSProperties = { fontWeight: 900, letterSpacing: 0.6, fontSize: 13, opacity: 0.95 };

function back(theme: any): React.CSSProperties {
  return {
    border: "none",
    borderRadius: 12,
    padding: "10px 12px",
    background: isDark(theme) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 800,
  };
}

function card(theme: any): React.CSSProperties {
  return {
    borderRadius: 16,
    padding: 12,
    background: isDark(theme) ? "rgba(255,255,255,0.06)" : "rgba(255,255,255,0.75)",
    boxShadow: isDark(theme) ? "0 10px 30px rgba(0,0,0,0.35)" : "0 10px 30px rgba(0,0,0,0.10)",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
    marginBottom: 10,
  };
}

const label: React.CSSProperties = { fontSize: 12, fontWeight: 800, opacity: 0.9, marginBottom: 6 };

function input(theme: any): React.CSSProperties {
  return {
    width: "100%",
    borderRadius: 12,
    padding: "10px 12px",
    border: isDark(theme) ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(0,0,0,0.10)",
    background: isDark(theme) ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
    color: theme?.colors?.text ?? "#fff",
    fontWeight: 800,
    outline: "none",
  };
}

function warn(theme: any): React.CSSProperties {
  return { marginTop: 10, fontSize: 12, opacity: 0.9, color: isDark(theme) ? "rgba(255,255,255,0.82)" : "rgba(0,0,0,0.72)" };
}

function cta(theme: any, disabled: boolean): React.CSSProperties {
  return {
    width: "100%",
    border: "none",
    borderRadius: 16,
    padding: "14px 14px",
    fontWeight: 1000,
    letterSpacing: 1.2,
    background: disabled ? (isDark(theme) ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)") : theme?.colors?.primary ?? "#7dffca",
    color: disabled ? (theme?.colors?.text ?? "#fff") : "#06110c",
    opacity: disabled ? 0.6 : 1,
  };
}
