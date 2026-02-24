// =============================================================
// src/pages/molkky/MolkkyHome.tsx
// HOME Mölkky — même structure visuelle que PingPongHome / PetanqueHome
// - Header "Bienvenue" + titre auto-fit
// - ActiveProfileCard + ArcadeTicker
// - KPIs basés sur l'historique (kind/sport === "molkky")
// =============================================================

import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { useHistory } from "../../hooks/useHistory";

type Props = {
  store: Store;
  update: (mut: any) => void; // compat
  go: (tab: any, params?: any) => void;
};

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

/**
 * Auto-fit du titre : ne coupe jamais le texte, scale si ça dépasse.
 */
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

// -------------------------------------------------------------
// ✅ Fallback tickers (pas d'assets requis)
// -------------------------------------------------------------
const svgToDataUri = (svg: string) => `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;

const M_TICKER_HERO = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="50%" cy="35%" r="80%">
      <stop offset="0%" stop-color="#1a2233"/>
      <stop offset="55%" stop-color="#0b0f18"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9cff6a"/>
      <stop offset="0.5" stop-color="#ffffff"/>
      <stop offset="1" stop-color="#9cff6a"/>
    </linearGradient>
    <filter id="glow" x="-30%" y="-30%" width="160%" height="160%">
      <feGaussianBlur stdDeviation="10" result="b"/>
      <feColorMatrix in="b" type="matrix" values="0 0 0 0 0.45  0 0 0 0 1  0 0 0 0 0.55  0 0 0 0.9 0" result="g"/>
      <feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <g opacity="0.18" filter="url(#glow)">
    <circle cx="240" cy="175" r="140" fill="#9cff6a"/>
    <circle cx="980" cy="175" r="180" fill="#9cff6a"/>
  </g>
  <g transform="translate(650 78)">
    <rect x="0" y="0" width="420" height="200" rx="26" fill="rgba(0,0,0,0.40)" stroke="rgba(255,255,255,0.14)"/>
    <text x="210" y="92" text-anchor="middle" font-family="Arial" font-size="56" font-weight="900" fill="url(#g)">MÖLKKY</text>
    <text x="210" y="138" text-anchor="middle" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.86)">PREMIUM MODE</text>
  </g>
  <!-- quilles stylisées -->
  <g transform="translate(150 65)">
    <g fill="rgba(255,255,255,0.18)">
      <rect x="0" y="60" width="64" height="170" rx="18"/>
      <rect x="78" y="35" width="64" height="195" rx="18"/>
      <rect x="156" y="20" width="64" height="210" rx="18"/>
      <rect x="234" y="45" width="64" height="185" rx="18"/>
      <rect x="312" y="75" width="64" height="155" rx="18"/>
    </g>
    <g fill="rgba(0,0,0,0.35)">
      <text x="32" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">1</text>
      <text x="110" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">2</text>
      <text x="188" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">3</text>
      <text x="266" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">4</text>
      <text x="344" y="170" text-anchor="middle" font-family="Arial" font-size="28" font-weight="900">5</text>
    </g>
  </g>
</svg>
`);

const M_TICKER_TIP = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#08101c"/>
      <stop offset="1" stop-color="#060812"/>
    </linearGradient>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#9cff6a"/>
      <stop offset="1" stop-color="#ffffff"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <text x="70" y="95" font-family="Arial" font-size="36" font-weight="900" fill="url(#g)">ASTUCE</text>
  <text x="70" y="150" font-family="Arial" font-size="26" font-weight="800" fill="rgba(255,255,255,0.88)">Vise la quille "1" ou "2"</text>
  <text x="70" y="190" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.75)">pour temporiser quand tu es proche de 50.</text>
  <g transform="translate(860 70)" opacity="0.22">
    <rect x="0" y="60" width="70" height="180" rx="18" fill="#ffffff"/>
    <rect x="85" y="30" width="70" height="210" rx="18" fill="#ffffff"/>
    <rect x="170" y="10" width="70" height="230" rx="18" fill="#ffffff"/>
  </g>
</svg>
`);

const M_TICKER_RULE = svgToDataUri(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="350" viewBox="0 0 1200 350">
  <defs>
    <radialGradient id="bg" cx="45%" cy="40%" r="85%">
      <stop offset="0" stop-color="#111a2b"/>
      <stop offset="70%" stop-color="#070b14"/>
      <stop offset="100%" stop-color="#050710"/>
    </radialGradient>
  </defs>
  <rect width="1200" height="350" fill="url(#bg)"/>
  <text x="70" y="92" font-family="Arial" font-size="36" font-weight="900" fill="#9cff6a">RÈGLE CLÉ</text>
  <text x="70" y="150" font-family="Arial" font-size="26" font-weight="900" fill="#ffffff">50 EXACT</text>
  <text x="70" y="190" font-family="Arial" font-size="22" font-weight="800" fill="rgba(255,255,255,0.75)">Au-delà → retour à 25 (option classique).</text>
</svg>
`);

export default function MolkkyHome({ store, go }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);
  const { rows, loading } = useHistory();

  const molkkyMatches = useMemo(() => {
    const list = (rows ?? []).filter((m: any) => (m?.kind || m?.sport) === "molkky");
    // plus récent d'abord
    return list.sort((a: any, b: any) => (Number(b?.updatedAt || b?.createdAt) || 0) - (Number(a?.updatedAt || a?.createdAt) || 0));
  }, [rows]);

  const global = useMemo(() => {
    const played = molkkyMatches.length;
    let wins = 0;
    let losses = 0;
    let lastWinner = "";
    let lastWhen = 0;

    const meId = (activeProfile as any)?.id;
    for (const m of molkkyMatches as any[]) {
      const payload = (m as any)?.payload ?? (m as any)?.data ?? {};
      const summary = payload?.summary ?? payload ?? {};
      const winnerId = summary?.winnerId ?? (m as any)?.winnerId;
      const winnerName = summary?.winnerName ?? "";
      const when = Number((m as any)?.updatedAt || (m as any)?.createdAt) || 0;
      if (when > lastWhen) {
        lastWhen = when;
        lastWinner = winnerName || "";
      }
      if (meId && winnerId) {
        if (winnerId === meId) wins++;
        else losses++;
      }
    }

    const winrate = played && meId ? wins / Math.max(1, wins + losses) : 0;
    return { played, wins, losses, winrate, lastWinner };
  }, [molkkyMatches, activeProfile]);

  const { wrapRef: titleWrapRef, textRef: titleTextRef, scale: titleScale } = useAutoFitTitle([theme?.primary, lang?.lang]);

  const tickerItems: ArcadeTickerItem[] = useMemo(
    () => [
      {
        title: t("molkky.ticker.hero", "Mölkky"),
        subtitle: t("molkky.ticker.hero.sub", "Mode Premium"),
        image: M_TICKER_HERO,
      },
      {
        title: t("molkky.ticker.tip", "Astuce"),
        subtitle: t("molkky.ticker.tip.sub", "Temporise près de 50"),
        image: M_TICKER_TIP,
      },
      {
        title: t("molkky.ticker.rule", "Règle clé"),
        subtitle: t("molkky.ticker.rule.sub", "50 exact + retour à 25"),
        image: M_TICKER_RULE,
      },
    ],
    [t]
  );

  const [tickerIndex, setTickerIndex] = useState(0);

  // rotation auto comme les autres homes
  useEffect(() => {
    const id = window.setInterval(() => {
      setTickerIndex((i) => (i + 1) % tickerItems.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center" }}>
      {/* ===== HEADER ===== */}
      <div style={{ width: "100%", display: "flex", justifyContent: "center", paddingTop: 10, paddingBottom: 8 }}>
        <div
          style={{
            ...sectionWrap,
            borderRadius: 18,
            border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
            background: "rgba(0,0,0,0.22)",
            boxShadow: "0 18px 70px rgba(0,0,0,0.55)",
            padding: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(255,255,255,0.06)",
                boxShadow: "0 6px 22px rgba(0,0,0,0.28)",
                fontWeight: 950,
                letterSpacing: 0.25,
                color: theme.text,
                userSelect: "none",
              }}
            >
              <span style={{ opacity: 0.95 }}>👋</span>
              <span>{t("home.welcome", "Bienvenue")}</span>
            </div>
          </div>

          <div ref={titleWrapRef} style={{ width: "100%", display: "flex", justifyContent: "center" }}>
            <div
              ref={titleTextRef}
              style={{
                transform: `scale(${titleScale})`,
                transformOrigin: "center",
                fontSize: 28,
                fontWeight: 1000,
                letterSpacing: 1.2,
                textTransform: "uppercase",
                lineHeight: 1.05,
                paddingInline: 6,
                backgroundImage: `linear-gradient(90deg, ${theme.primary} 0%, #ffffff 35%, ${theme.primary} 70%, #ffffff 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                color: "transparent",
                backgroundSize: "200% 100%",
                animation: "dcTitleShimmer 3.6s linear infinite, dcTitlePulse 2.8s ease-in-out infinite",
                textShadow: "0 10px 30px rgba(0,0,0,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              {t("molkky.title", "Mölkky")}
            </div>
          </div>
        </div>
      </div>

      {/* ===== BODY ===== */}
      <div style={{ ...sectionWrap }}>
        <div style={{ marginBottom: 10 }}>
          <ActiveProfileCard
            hideStatus={true}
            profile={activeProfile as any}
            stats={{} as any}
            globalTitle={t("molkky.home.global.title", "Vue globale")}
            globalKpis={[
              { label: t("molkky.home.global.played", "Parties"), value: loading ? "…" : global.played },
              { label: t("molkky.home.global.wl", "V / D"), value: loading ? "…" : `${global.wins} / ${global.losses}` },
              { label: t("molkky.home.global.winrate", "Winrate"), value: loading ? "…" : `${Math.round(global.winrate * 100)}%` },
              { label: t("molkky.home.global.last", "Dernier vainqueur"), value: loading ? "…" : (global.lastWinner || "—") },
            ]}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <ArcadeTicker items={tickerItems} activeIndex={tickerIndex} onChangeIndex={setTickerIndex} />
        </div>

        <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 6, marginBottom: 16 }}>
          <button
            onClick={() => go("molkky_config")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(255,255,255,0.08)",
              color: theme.text,
              fontWeight: 950,
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0,0,0,0.28)",
            }}
          >
            {t("molkky.cta.new", "Nouvelle partie")}
          </button>
          <button
            onClick={() => go("molkky_menu")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
              background: "rgba(255,255,255,0.04)",
              color: theme.text,
              fontWeight: 900,
              cursor: "pointer",
              opacity: 0.96,
            }}
          >
            {t("molkky.cta.menu", "Menu Mölkky")}
          </button>
        </div>
      </div>
    </div>
  );
}
