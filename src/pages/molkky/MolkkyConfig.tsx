// =============================================================
// src/pages/molkky/MolkkyConfig.tsx
// Config MÖLKKY (LOCAL ONLY) — Premium
// - Sélection 2 à 6 profils locaux (pas de bots)
// - Options règles officielles
// - Lance MolkkyPlay via go("molkky_play", params)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileMedallionCarousel from "../../components/ProfileMedallionCarousel";

import type { Store, Profile } from "../../lib/types";
import type { MolkkyConfig as MolkkyEngineConfig } from "./engine/molkkyEngine";

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store?: Store | any;
};

function clampInt(v: any, min: number, max: number, fallback: number) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, Math.round(n)));
}

export default function MolkkyConfig({ go, store }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const profiles: Profile[] = Array.isArray(store?.profiles) ? (store.profiles as any) : [];

  const medallions = React.useMemo(
    () =>
      profiles.map((p: any) => ({
        id: p.id,
        name: p.nickname || p.displayName || p.name || "Profil",
        avatarDataUrl: p.avatarDataUrl || null,
        stars: p.stars || 0,
        countryCode: p.countryCode || null,
      })),
    [profiles]
  );

  const [playerCount, setPlayerCount] = React.useState<number>(2);
  const [selectedIds, setSelectedIds] = React.useState<string[]>(() => profiles.slice(0, 2).map((p: any) => p.id));

  const [targetScore, setTargetScore] = React.useState<number>(50);
  const [bounceBackTo25, setBounceBackTo25] = React.useState<boolean>(true);
  const [eliminationOnThreeMiss, setEliminationOnThreeMiss] = React.useState<boolean>(true);

  // Ajuste sélection si playerCount change
  React.useEffect(() => {
    setSelectedIds((prev) => {
      const uniq = Array.from(new Set(prev)).filter(Boolean);
      if (uniq.length === playerCount) return uniq;
      if (uniq.length > playerCount) return uniq.slice(0, playerCount);

      // compléter avec profils dispo
      const missing = playerCount - uniq.length;
      const pool = profiles.map((p: any) => p.id).filter((id: any) => id && !uniq.includes(id));
      return uniq.concat(pool.slice(0, missing));
    });
  }, [playerCount, profiles]);

  const toggle = React.useCallback(
    (id: string) => {
      setSelectedIds((prev) => {
        const has = prev.includes(id);
        if (has) return prev.filter((x) => x !== id);
        if (prev.length >= playerCount) return prev; // max
        return [...prev, id];
      });
    },
    [playerCount]
  );

  const canStart = selectedIds.length === playerCount && playerCount >= 2;

  const onStart = React.useCallback(() => {
    if (!canStart) return;

    const selectedProfiles = selectedIds
      .map((id) => profiles.find((p: any) => p.id === id))
      .filter(Boolean)
      .map((p: any) => ({
        id: p.id,
        name: p.nickname || p.displayName || p.name || "Joueur",
        avatarDataUrl: p.avatarDataUrl || null,
      }));

    const config: MolkkyEngineConfig = {
      targetScore: clampInt(targetScore, 10, 200, 50),
      bounceBackTo25: Boolean(bounceBackTo25),
      eliminationOnThreeMiss: Boolean(eliminationOnThreeMiss),
    };

    go("molkky_play", {
      players: selectedProfiles,
      config,
    });
  }, [canStart, selectedIds, profiles, targetScore, bounceBackTo25, eliminationOnThreeMiss, go]);

  const info = (
    <div style={{ display: "grid", gap: 8 }}>
      <div style={{ fontWeight: 1000 }}>Règles officielles (résumé)</div>
      <div style={{ opacity: 0.9, lineHeight: 1.35 }}>
        • 1 quille tombée ⇒ points = numéro (1..12).<br />
        • Plusieurs quilles ⇒ points = nombre de quilles.<br />
        • Objectif ⇒ <b>{targetScore}</b> points (50 officiel).<br />
        • Dépassement ⇒ retour à 25 {bounceBackTo25 ? "(activé)" : "(désactivé)"}.<br />
        • 3 MISS consécutifs ⇒ élimination {eliminationOnThreeMiss ? "(activé)" : "(désactivé)"}.
      </div>
    </div>
  );

  return (
    <div style={wrap(theme)}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_menu")} />
        <div style={topTitle}>MÖLKKY — CONFIG</div>
        <InfoDot content={info as any} />
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>JOUEURS</div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ ...label, minWidth: 140 }}>Nombre de joueurs</div>
          <input
            type="range"
            min={2}
            max={6}
            value={playerCount}
            onChange={(e) => setPlayerCount(parseInt(e.target.value || "2", 10))}
            style={{ flex: 1 }}
          />
          <div style={{ fontWeight: 1000, width: 32, textAlign: "right" }}>{playerCount}</div>
        </div>
        <div style={smallHint}>Sélectionne {playerCount} profil(s) local(aux).</div>
        <div style={{ marginTop: 10 }}>
          <ProfileMedallionCarousel items={medallions} selectedIds={selectedIds} onToggle={toggle} theme={theme} maxSelected={playerCount} />
        </div>
      </div>

      <div style={card(theme)}>
        <div style={sectionTitle}>RÈGLES</div>

        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <div style={{ ...label, width: 140 }}>Score cible</div>
            <input
              value={String(targetScore)}
              onChange={(e) => setTargetScore(parseInt(e.target.value || "50", 10))}
              style={{ ...input(theme), width: 110 }}
              inputMode="numeric"
            />
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 800 }}>50 officiel</div>
          </div>

          <label style={checkRow}>
            <input type="checkbox" checked={bounceBackTo25} onChange={(e) => setBounceBackTo25(!!e.target.checked)} />
            Retour à 25 si dépassement
          </label>

          <label style={checkRow}>
            <input
              type="checkbox"
              checked={eliminationOnThreeMiss}
              onChange={(e) => setEliminationOnThreeMiss(!!e.target.checked)}
            />
            Élimination après 3 MISS consécutifs
          </label>
        </div>
      </div>

      <button style={cta(theme, canStart)} onClick={onStart} disabled={!canStart}>
        {t?.("Lancer la partie") ?? "LANCER LA PARTIE"}
      </button>

      {!profiles.length && (
        <div style={{ marginTop: 12, opacity: 0.8, fontSize: 12 }}>
          Aucun profil local détecté. Va dans <b>Profils</b> pour créer des joueurs.
        </div>
      )}
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
  fontWeight: 1000,
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
  fontWeight: 1000,
  letterSpacing: 1,
  opacity: 0.9,
  marginBottom: 10,
};

const label: any = {
  fontSize: 12,
  fontWeight: 900,
  opacity: 0.8,
};

const smallHint: any = {
  marginTop: 6,
  fontSize: 12,
  opacity: 0.7,
  fontWeight: 800,
};

const input = (theme: any) => ({
  height: 42,
  padding: "0 10px",
  borderRadius: 12,
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(0,0,0,0.28)",
  color: theme?.colors?.text ?? "#fff",
  outline: "none",
});

const checkRow: any = {
  display: "flex",
  gap: 10,
  alignItems: "center",
  fontSize: 13,
  fontWeight: 850,
  opacity: 0.9,
};

const cta = (theme: any, enabled: boolean) => ({
  width: "100%",
  borderRadius: 16,
  padding: "14px 12px",
  border: "1px solid rgba(255,255,255,0.14)",
  background: enabled ? (theme?.colors?.accent ?? "#6cff7a") : "rgba(255,255,255,0.08)",
  color: enabled ? "#06100a" : (theme?.colors?.text ?? "#fff"),
  fontWeight: 1100,
  letterSpacing: 1,
  cursor: enabled ? "pointer" : "not-allowed",
  boxShadow: enabled ? "0 18px 50px rgba(0,0,0,0.45)" : "none",
});
