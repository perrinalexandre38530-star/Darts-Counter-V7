// @ts-nocheck
// =============================================================
// src/pages/dice/DiceHome.tsx
// HOME Dice — même structure visuelle que PingPongHome / MolkkyHome
// - ActiveProfileCard + ArcadeTicker
// =============================================================

import React, { useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

const PAGE_MAX_WIDTH = 620;
const SECTION_PAD_X = 10;
const sectionWrap: React.CSSProperties = {
  width: "100%",
  maxWidth: PAGE_MAX_WIDTH,
  paddingInline: SECTION_PAD_X,
};

function safeActiveProfile(store: Store): Profile | null {
  const anyStore = store as any;
  const profiles: Profile[] = anyStore?.profiles ?? [];
  const activeProfileId: string | null = anyStore?.activeProfileId ?? null;
  if (!profiles.length) return null;
  if (!activeProfileId) return profiles[0];
  return profiles.find((p) => p.id === activeProfileId) ?? profiles[0];
}

function useAutoFitTitle(deps: any[] = []) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const textRef = useRef<HTMLDivElement | null>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const measure = () => {
      const wrap = wrapRef.current;
      const text = textRef.current;
      if (!wrap || !text) return;

      text.style.transform = "scale(1)";
      // eslint-disable-next-line @typescript-eslint/no-unused-expressions
      text.offsetHeight;

      const wrapW = wrap.getBoundingClientRect().width;
      const textW = text.getBoundingClientRect().width;
      if (!wrapW || !textW) return;
      const next = textW > wrapW ? Math.max(0.75, Math.min(1, wrapW / textW)) : 1;
      setScale(next);
    };

    measure();
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { wrapRef, textRef, scale };
}

const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const D_TICKER_HERO = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
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
  <g opacity="0.18" filter="url(#glow)">
    <circle cx="240" cy="175" r="140" fill="#8b5cf6"/>
    <circle cx="980" cy="175" r="180" fill="#8b5cf6"/>
  </g>
  <g transform="translate(620 78)">
    <rect x="0" y="0" width="500" height="200" rx="26" fill="rgba(0,0,0,0.40)" stroke="rgba(255,255,255,0.14)"/>
    <text x="250" y="92" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="url(#g)" filter="url(#glow)">DICE</text>
    <text x="250" y="138" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.86)">COUNTER</text>
  </g>
  <g transform="translate(160 85)">
    <rect x="0" y="0" width="180" height="180" rx="30" fill="rgba(255,255,255,0.10)" stroke="rgba(255,255,255,0.14)"/>
    <circle cx="55" cy="55" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="125" cy="55" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="55" cy="125" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="125" cy="125" r="12" fill="rgba(255,255,255,0.55)"/>
    <circle cx="90" cy="90" r="12" fill="rgba(255,255,255,0.55)"/>
  </g>
</svg>
`);

type Props = {
  store: Store;
  update: (mut: any) => void;
  go: (tab: any, params?: any) => void;
};

export default function DiceHome({ store, update, go }: Props) {
  const { theme } = useTheme() as any;
  const { t } = useLang() as any;

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);

  const { wrapRef, textRef, scale } = useAutoFitTitle([t, theme]);

  const items: ArcadeTickerItem[] = useMemo(
    () => [
      {
        id: "dice_duel",
        title: "Dice Duel",
        subtitle: "2 joueurs • Score = somme",
        img: D_TICKER_HERO,
        onClick: () => go("dice_menu"),
      },
      {
        id: "dice_stats",
        title: "Stats",
        subtitle: "(à venir) Historique & classements",
        img: D_TICKER_HERO,
        onClick: () => go("dice_menu"),
      },
    ],
    [go]
  );

  return (
    <div
      style={{
        minHeight: "100vh",
        paddingTop: 18,
        paddingBottom: 96,
        background: theme.bg,
        color: theme.text,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 14,
      }}
    >
      <div style={sectionWrap}>
        <div style={{ fontSize: 13, fontWeight: 800, opacity: 0.78 }}>{t?.("home.welcome", "Bienvenue")}</div>
        <div ref={wrapRef} style={{ width: "100%", overflow: "hidden" }}>
          <div
            ref={textRef}
            style={{
              transformOrigin: "left center",
              transform: `scale(${scale})`,
              fontSize: 34,
              fontWeight: 1000,
              letterSpacing: 0.2,
              lineHeight: 1.08,
              textShadow: `0 0 18px ${(theme.primary ?? "#8b5cf6") + "55"}`,
            }}
          >
            Dice Counter
          </div>
        </div>
      </div>

      <div style={sectionWrap}>
        <ActiveProfileCard
          theme={theme}
          profile={activeProfile}
          onEdit={() => go("profiles", { view: "me" })}
          onPick={() => go("profiles", { view: "locals" })}
        />
      </div>

      <div style={sectionWrap}>
        <ArcadeTicker items={items} theme={theme} />
      </div>

      <div style={sectionWrap}>
        <button
          onClick={() => go("games")}
          style={{
            width: "100%",
            borderRadius: 16,
            padding: "14px 14px",
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.18)"}`,
            background: "rgba(255,255,255,0.08)",
            color: theme.text,
            fontWeight: 1000,
            letterSpacing: 0.8,
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Aller aux jeux
        </button>
      </div>
    </div>
  );
}
