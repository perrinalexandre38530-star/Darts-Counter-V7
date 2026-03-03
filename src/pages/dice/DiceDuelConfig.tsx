// @ts-nocheck
// =============================================================
// src/pages/dice/DiceConfig.tsx
// Config DICE — UI calquée sur MolkkyConfig / X01ConfigV3
// - 2 profils locaux (pas de bots)
// - Cible + nb de dés + nb de sets
// - Lance DicePlay via go("dice_play", { players, config })
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileMedallionCarousel from "../../components/ProfileMedallionCarousel";

import type { Store, Profile } from "../../lib/types";
import type { DiceConfig as DiceCfg } from "../../lib/diceTypes";

const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string | null | undefined) {
  if (!id) return null;
  const norm = String(id)
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

  const target = `/ticker_${norm}.png`;
  const k = Object.keys(TICKERS).find((x) => x.toLowerCase().endsWith(target));
  return k ? TICKERS[k] : null;
}

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const FALLBACK_HEADER = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="85%">
      <stop offset="0%" stop-color="#1b1630"/>
      <stop offset="55%" stop-color="#0b0f18"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#8b5cf6"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#8b5cf6"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.55  0 0 0 0 0.35  0 0 0 0 1  0 0 0 0.9 0" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <g opacity="0.16" filter="url(#glow)">
    <circle cx="240" cy="175" r="140" fill="#8b5cf6"/>
    <circle cx="980" cy="175" r="180" fill="#8b5cf6"/>
  </g>
  <g transform="translate(600 78)">
    <rect x="0" y="0" width="520" height="200" rx="26" fill="rgba(0,0,0,0.40)" stroke="rgba(255,255,255,0.14)"/>
    <text x="260" y="92" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="url(#g)" filter="url(#glow)">DICE</text>
    <text x="260" y="138" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.86)">DUEL CONFIG</text>
  </g>
  <g transform="translate(160 80)">
    <rect x="0" y="0" width="170" height="170" rx="28" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)"/>
    <circle cx="50" cy="50" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="120" cy="50" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="50" cy="120" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="120" cy="120" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="85" cy="85" r="12" fill="rgba(255,255,255,0.55)"/>
  </g>
</svg>
`);

type Props = {
  go: (t: any, p?: any) => void;
  params?: any;
  store?: Store | any;
};

export default function DiceConfig({ go, store, params }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const primary = theme?.colors?.accent ?? theme?.primary ?? "#8b5cf6";
  const textSoft = theme?.colors?.textSoft ?? "rgba(255,255,255,0.75)";

  const headerTicker = getTicker("dice_duel") || getTicker("dice_games") || FALLBACK_HEADER;

  const profiles: Profile[] = Array.isArray(store?.profiles) ? (store.profiles as any) : [];

  const medallions = React.useMemo(
    () =>
      (profiles || [])
        .filter((p: any) => !(p as any)?.isBot)
        .map((p: any) => ({
          id: p.id,
          name: p.nickname || p.displayName || p.name || "Profil",
          profile: p,
        })),
    [profiles]
  );

  const [selectedIds, setSelectedIds] = React.useState<string[]>(
    Array.isArray(params?.selectedIds) && params.selectedIds.length ? params.selectedIds : []
  );

  const [targetScore, setTargetScore] = React.useState<number>(Number(params?.config?.targetScore ?? 100) || 100);
  const [diceCount, setDiceCount] = React.useState<number>(Number(params?.config?.diceCount ?? 2) || 2);
  const [sets, setSets] = React.useState<number>(Number(params?.config?.sets ?? 1) || 1);

  const [rulesOpen, setRulesOpen] = React.useState(false);

  const players = React.useMemo(() => {
    const set = new Set(selectedIds);
    return medallions.filter((m) => set.has(m.id));
  }, [selectedIds, medallions]);

  const canStart = players.length === 2;

  const cfg: DiceCfg = React.useMemo(
    () => ({
      mode: "duel",
      targetScore: Math.max(10, Math.min(9999, Number(targetScore) || 100)),
      diceCount: Math.max(1, Math.min(10, Number(diceCount) || 2)),
      sets: Math.max(1, Math.min(9, Number(sets) || 1)),
    }),
    [targetScore, diceCount, sets]
  );

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: theme.card,
    boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
    padding: 14,
  };

  const label: React.CSSProperties = {
    fontSize: 12,
    fontWeight: 900,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    opacity: 0.85,
    marginBottom: 8,
  };

  const input: React.CSSProperties = {
    width: "100%",
    padding: "10px 12px",
    borderRadius: 14,
    border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
    background: "rgba(0,0,0,0.24)",
    color: theme.text,
    fontWeight: 800,
    outline: "none",
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 110,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* Header ticker + dots */}
      <div style={{ position: "relative", width: "100%", marginBottom: 12 }}>
        <img
          src={headerTicker}
          alt="Dice Config"
          style={{
            width: "100%",
            height: 100,
            objectFit: "cover",
            borderRadius: 16,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
            display: "block",
          }}
          draggable={false}
        />

        <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          <BackDot onClick={() => go("games")} />
        </div>
        <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
          <InfoDot onClick={() => setRulesOpen(true)} glow={primary + "88"} />
        </div>
      </div>

      {/* Players */}
      <div style={card}>
        <div style={label}>{t?.("config.players", "Joueurs")}</div>
        <div style={{ opacity: 0.9, color: textSoft, fontSize: 13, marginBottom: 10 }}>
          Sélectionne exactement 2 profils.
        </div>

        <ProfileMedallionCarousel
          items={medallions}
          selectedIds={selectedIds}
          setSelectedIds={(ids: string[]) => {
            // Force max 2 (garde le dernier choisi)
            const next = Array.isArray(ids) ? ids.slice(-2) : [];
            setSelectedIds(next);
          }}
          maxSelect={2}
        />
      </div>

      <div style={{ height: 12 }} />

      {/* Config */}
      <div style={card}>
        <div style={label}>{t?.("config.rules", "Règles")}</div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Cible</div>
            <input
              style={input}
              type="number"
              min={10}
              max={9999}
              value={targetScore}
              onChange={(e) => setTargetScore(Number(e.target.value))}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Dés / lancer</div>
            <input
              style={input}
              type="number"
              min={1}
              max={10}
              value={diceCount}
              onChange={(e) => setDiceCount(Number(e.target.value))}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Sets</div>
            <input style={input} type="number" min={1} max={9} value={sets} onChange={(e) => setSets(Number(e.target.value))} />
          </div>

          <div>
            <div style={{ fontSize: 12, fontWeight: 900, opacity: 0.85, marginBottom: 6 }}>Mode</div>
            <div
              style={{
                ...input,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                textTransform: "uppercase",
                letterSpacing: 0.8,
              }}
            >
              DUEL
            </div>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div style={{ position: "fixed", left: 0, right: 0, bottom: 0, padding: 16, paddingBottom: 16 }}>
        <div style={{ maxWidth: 680, margin: "0 auto" }}>
          <button
            onClick={() => {
              if (!canStart) return;
              const chosen = players.map((p: any) => ({ id: p.id, name: p.name, avatarDataUrl: p.profile?.avatarDataUrl ?? null }));
              go("dice_play", { players: chosen, config: cfg });
            }}
            disabled={!canStart}
            style={{
              width: "100%",
              borderRadius: 16,
              padding: "14px 14px",
              border: "1px solid rgba(255,255,255,0.18)",
              background: canStart
                ? `linear-gradient(90deg, ${primary}, rgba(255,255,255,0.92))`
                : "rgba(255,255,255,0.10)",
              color: canStart ? "#0b0b12" : "rgba(255,255,255,0.55)",
              fontWeight: 1000,
              fontSize: 14,
              letterSpacing: 0.8,
              textTransform: "uppercase",
              boxShadow: canStart ? `0 0 18px ${primary}66` : "none",
              cursor: canStart ? "pointer" : "not-allowed",
            }}
          >
            Lancer
          </button>
        </div>
      </div>

      {/* Rules modal */}
      {rulesOpen && (
        <div
          onClick={() => setRulesOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 560,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.16)"}`,
              background: theme.card,
              boxShadow: "0 22px 60px rgba(0,0,0,0.75)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 8 }}>Règles — Dice Duel</div>
            <pre style={{ whiteSpace: "pre-wrap", margin: 0, opacity: 0.9, fontFamily: "inherit", lineHeight: 1.35 }}>
{`• À ton tour, tu lances X dés\n• Ton score = somme des dés\n• Premier à atteindre / dépasser la cible gagne le set\n• Le nombre de sets gagnants dépend de ta config`}
            </pre>
            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 14 }}>
              <button
                onClick={() => setRulesOpen(false)}
                style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.16)"}`,
                  background: "rgba(255,255,255,0.06)",
                  color: theme.text,
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
