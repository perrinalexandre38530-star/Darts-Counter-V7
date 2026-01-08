// =============================================================
// src/pages/petanque/PetanqueHome.tsx
// HOME Pétanque — même structure visuelle que src/pages/Home.tsx
// (ActiveProfileCard + ArcadeTicker + bloc détails)
// =============================================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

import type { Store, Profile } from "../../lib/types";
import ActiveProfileCard from "../../components/home/ActiveProfileCard";
import ArcadeTicker, { type ArcadeTickerItem } from "../../components/home/ArcadeTicker";

import { loadPetanqueState } from "../../lib/petanqueStore";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

const PAGE_MAX_WIDTH = 520;
const DETAIL_INTERVAL_MS = 7000;

// ✅ on réutilise le même CDN que Home.tsx (zéro asset nouveau)
const IMG_BASE =
  "https://cdn.jsdelivr.net/gh/perrinalexandre38530-star/Darts-Counter-V5.3@main/public/img/";

const TICKER_IMAGES = {
  local: ["ticker-x01.jpg", "ticker-x01-2.jpg"],
  leaderboard: ["ticker-leaderboard.jpg", "ticker-leaderboard-2.jpg"],
  training: ["ticker-training.jpg", "ticker-training-2.jpg"],
  global: ["ticker-global.jpg", "ticker-global-2.jpg"],
  tip: ["ticker-tip.jpg", "ticker-tip-2.jpg"],
  tipNews: ["ticker-tip-news.jpg", "ticker-tip-news-2.jpg"],
} as const;

function hashStringToInt(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function pickTickerImage<K extends keyof typeof TICKER_IMAGES>(key: K, seed: string): string {
  const arr = TICKER_IMAGES[key];
  if (!arr || arr.length === 0) return "";
  const idx = hashStringToInt(`${key}::${seed}`) % arr.length;
  return IMG_BASE + arr[idx];
}

function safeActiveProfile(store: Store): Profile | null {
  const profiles = store?.profiles ?? [];
  const activeProfileId = (store as any)?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;
  return active ?? null;
}

export default function PetanqueHome({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const activeProfile = useMemo(() => safeActiveProfile(store), [store]);

  // On “fake” des stats minimales pour ActiveProfileCard :
  // -> l’objectif est VISUEL (même carte), on n’essaie pas d’inventer des stats darts.
  const [kpis, setKpis] = useState<{ ends: number; scoreA: number; scoreB: number; target: number; finished: boolean }>({
    ends: 0,
    scoreA: 0,
    scoreB: 0,
    target: 13,
    finished: false,
  });

  useEffect(() => {
    const st = loadPetanqueState();
    setKpis({
      ends: Array.isArray(st?.ends) ? st.ends.length : 0,
      scoreA: Number(st?.scoreA ?? 0) || 0,
      scoreB: Number(st?.scoreB ?? 0) || 0,
      target: Number(st?.target ?? 13) || 13,
      finished: !!st?.finished,
    });
  }, []);

  // ✅ mêmes patterns que Home.tsx (ticker + detail cards)
  const seed = String(activeProfile?.id ?? "anon");

  const tickerItems: ArcadeTickerItem[] = useMemo(() => {
    const st = loadPetanqueState();
    const ends = Array.isArray(st?.ends) ? st.ends.length : 0;
    const a = Number(st?.scoreA ?? 0) || 0;
    const b = Number(st?.scoreB ?? 0) || 0;
    const target = Number(st?.target ?? 13) || 13;
    const finished = !!st?.finished;

    const resume = finished
      ? t("petanque.home.ticker.resume.finished", "Partie terminée — relance une nouvelle partie.")
      : ends > 0
        ? t("petanque.home.ticker.resume.dynamic", `Reprends ta partie : ${a} — ${b} (objectif ${target}).`)
        : t("petanque.home.ticker.resume.empty", "Aucune mène enregistrée — lance une partie pour commencer.");

    return [
      {
        id: "petanque-resume",
        title: t("petanque.home.ticker.resume.title", "Pétanque — Partie"),
        text: resume,
        detail: ends > 0 ? `${ends} mènes · ${a}—${b} · obj ${target}` : "",
        backgroundImage: pickTickerImage("local", `${seed}::petanque-resume`),
        accentColor: theme.primary ?? "#F6C256",
      },
      {
        id: "petanque-measure",
        title: t("petanque.home.ticker.measure.title", "Mesurage"),
        text: t("petanque.home.ticker.measure.text", "Mesure rapide : égalité, cochonnet, terrain incliné."),
        detail: t("petanque.home.ticker.measure.detail", "Manuel · Photo · LIVE radar"),
        backgroundImage: pickTickerImage("training", `${seed}::petanque-measure`),
        accentColor: "#00E5A8",
      },
      {
        id: "petanque-tournaments",
        title: t("petanque.home.ticker.tournaments.title", "Tournois"),
        text: t("petanque.home.ticker.tournaments.text", "Crée et gère tes tournois. (Mode commun multi-sport)"),
        detail: t("petanque.home.ticker.tournaments.detail", "KO · Poules · RR"),
        backgroundImage: pickTickerImage("leaderboard", `${seed}::petanque-tournaments`),
        accentColor: "#FF7A18",
      },
      {
        id: "petanque-tip",
        title: t("petanque.home.ticker.tip.title", "Astuce"),
        text: t("petanque.home.ticker.tip.text", "Annonce clairement la mène et la marque avant de reprendre le jeu."),
        detail: t("petanque.home.ticker.tip.detail", "Rythme · Clarté · Fair-play"),
        backgroundImage: pickTickerImage("tip", `${seed}::petanque-tip`),
        accentColor: "#FFFFFF",
      },
    ];
  }, [seed, theme.primary, t, kpis.ends, kpis.scoreA, kpis.scoreB, kpis.target, kpis.finished]);

  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    if (!tickerItems.length) return;
    const id = window.setInterval(() => {
      setTickerIndex((prev) => (tickerItems.length ? (prev + 1) % tickerItems.length : 0));
    }, DETAIL_INTERVAL_MS);
    return () => window.clearInterval(id);
  }, [tickerItems.length]);

  useEffect(() => {
    setTickerIndex(0);
  }, [activeProfile?.id]);

  const currentTicker = tickerItems.length ? tickerItems[Math.min(tickerIndex, tickerItems.length - 1)] : null;

  // --- “Carte détails” : mêmes 2 colonnes que Home.tsx ---
  const detailAccent = currentTicker?.accentColor ?? theme.primary ?? "#F6C256";

  const leftTitle = currentTicker?.title ?? t("petanque.home.detail.left.title", "Pétanque");
  const leftText = currentTicker?.text ?? "";

  const statsBackgroundImage = currentTicker?.backgroundImage ?? "";

  const rightTitle = t("petanque.home.detail.right.title", "Accès rapide");
  const rightText = t("petanque.home.detail.right.text", "Lance une partie, ouvre le menu Pétanque, ou va sur Tournois/Stats.");

  const primary = theme.primary ?? "#F6C256";

  return (
    <div
      className="petanque-home container"
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        paddingTop: 16,
        paddingBottom: 0,
        alignItems: "center",
        background: theme.bg,
        color: theme.text,
      }}
    >
      <style>{`
        @keyframes dcTitlePulse { 0%,100% { filter: brightness(1); } 50% { filter: brightness(1.18); } }
        @keyframes dcTitleShimmer { 0% { background-position: 0% 0%; } 100% { background-position: 200% 0%; } }
      `}</style>

      {/* ===== HEADER (copie logique de Home.tsx) ===== */}
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, paddingInline: 18, marginBottom: 10 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ textAlign: "left" }}>
            <span
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: 1.1,
                textTransform: "uppercase",
                color: primary,
              }}
            >
              {t("home.welcome", "Bienvenue")}
            </span>
          </div>

          <div
            style={{
              fontSize: 32,
              fontWeight: 900,
              letterSpacing: 3,
              textAlign: "center",
              textTransform: "uppercase",
              backgroundImage: `linear-gradient(120deg, ${primary}, #ffffff, ${primary})`,
              backgroundSize: "200% 100%",
              WebkitBackgroundClip: "text",
              color: "transparent",
              animation: "dcTitlePulse 3.6s ease-in-out infinite, dcTitleShimmer 7s linear infinite",
            }}
          >
            BARSPORTS COUNTER
          </div>

          <div style={{ width: 1 }} />
        </div>
      </div>

      {/* Carte joueur actif (même composant) */}
      {activeProfile && (
        <ActiveProfileCard
          profile={activeProfile as any}
          stats={{
            // stats minimalistes “neutres” (on remaisonne la carte sans casser le type côté runtime)
            games: 0,
            wins: 0,
            winRate01: 0,
            avg3D: 0,
            bestVisit: 0,
            bestCheckout: 0,
          } as any}
          status={"offline" as any}
        />
      )}

      {/* Ticker arcade (même composant) */}
      <ArcadeTicker
        items={tickerItems}
        activeIndex={tickerIndex}
        intervalMs={DETAIL_INTERVAL_MS}
        onIndexChange={(index: number) => {
          if (!tickerItems.length) return;
          const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
          setTickerIndex(safe);
        }}
        onActiveIndexChange={(index: number) => {
          if (!tickerItems.length) return;
          const safe = Math.min(Math.max(index, 0), tickerItems.length - 1);
          setTickerIndex(safe);
        }}
      />

      {/* Bloc détail du ticker : 2 mini-cards côte à côte (même look que Home.tsx) */}
      {currentTicker && (
        <div
          style={{
            width: "100%",
            maxWidth: PAGE_MAX_WIDTH,
            marginTop: 10,
            marginBottom: 10,
            borderRadius: 22,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
            boxShadow: "0 18px 40px rgba(0,0,0,0.85)",
            padding: 8,
            background: "radial-gradient(circle at top, rgba(255,255,255,0.06), rgba(3,4,10,1))",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            {/* gauche */}
            <div
              style={{
                flex: 1,
                borderRadius: 18,
                overflow: "hidden",
                position: "relative",
                minHeight: 108,
                backgroundColor: "#05060C",
                backgroundImage: statsBackgroundImage ? `url("${statsBackgroundImage}")` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.45))",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", padding: "10px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 800,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                    color: detailAccent,
                  }}
                >
                  {leftTitle}
                </div>

                <div style={{ fontSize: 11, lineHeight: 1.35, color: theme.textSoft ?? "rgba(255,255,255,0.9)" }}>
                  {leftText}
                </div>

                {/* mini-kpis (style Home) */}
                <div style={{ marginTop: 2, display: "grid", gridTemplateColumns: "repeat(2, minmax(0,1fr))", gap: 6 }}>
                  <MiniKpi label={t("petanque.home.kpi.ends", "Mènes")} value={String(kpis.ends)} primary={detailAccent} theme={theme} />
                  <MiniKpi label={t("petanque.home.kpi.score", "Score")} value={`${kpis.scoreA}—${kpis.scoreB}`} primary={detailAccent} theme={theme} />
                </div>
              </div>
            </div>

            {/* droite */}
            <div
              style={{
                flex: 1,
                borderRadius: 18,
                overflow: "hidden",
                position: "relative",
                minHeight: 108,
                backgroundColor: "#05060C",
                backgroundImage: `url("${pickTickerImage("tipNews", `${seed}::petanque-right`)}")`,
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(130deg, rgba(0,0,0,0.85), rgba(0,0,0,0.55))",
                  pointerEvents: "none",
                }}
              />
              <div style={{ position: "relative", padding: "10px 10px 10px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 0.8, textTransform: "uppercase", color: "#FFFFFF" }}>
                  {rightTitle}
                </div>
                <div style={{ fontSize: 11, lineHeight: 1.35, color: theme.textSoft ?? "rgba(255,255,255,0.9)" }}>
                  {rightText}
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
                  <QuickBtn theme={theme} tint={theme.primary} label={t("petanque.home.quick.play", "Lancer / Reprendre")} onClick={() => go("petanque_play")} />
                  <QuickBtn theme={theme} tint={"#00E5A8"} label={t("petanque.home.quick.measure", "Mesurer")} onClick={() => go("petanque_play", { openMeasure: true })} />
                  <QuickBtn theme={theme} tint={"#FFFFFF"} label={t("petanque.home.quick.games", "Menu Jeux")} onClick={() => go("games")} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Résumé (petit bloc bas, sobre) */}
      <div style={{ width: "100%", maxWidth: PAGE_MAX_WIDTH, paddingInline: 18, marginTop: 8 }}>
        <div
          style={{
            borderRadius: 18,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
            background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))",
            padding: 12,
            boxShadow: "0 14px 30px rgba(0,0,0,0.55)",
          }}
        >
          <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 0.8, textTransform: "uppercase", color: theme.primary }}>
            {t("petanque.home.resume.title", "Résumé")}
          </div>
          <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
            <Pill theme={theme} label={t("petanque.home.teamA", "Équipe A")} />
            <div style={{ fontWeight: 1000, fontSize: 24, letterSpacing: 1 }}>{kpis.scoreA} — {kpis.scoreB}</div>
            <Pill theme={theme} label={t("petanque.home.teamB", "Équipe B")} />
          </div>
        </div>
      </div>

      <div style={{ height: 26 }} />
    </div>
  );
}

function MiniKpi({ label, value, primary, theme }: any) {
  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        background: "rgba(0,0,0,0.22)",
        padding: "8px 9px",
        display: "flex",
        flexDirection: "column",
        gap: 3,
      }}
    >
      <div style={{ fontSize: 10, fontWeight: 900, letterSpacing: 0.7, textTransform: "uppercase", color: primary }}>
        {label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 1000, color: "#fff" }}>{value}</div>
    </div>
  );
}

function QuickBtn({ theme, tint, label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${String(tint)}66`,
        background: `linear-gradient(180deg, ${String(tint)}22, rgba(0,0,0,0.45))`,
        color: "#fff",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.4,
        padding: "8px 10px",
        cursor: "pointer",
        boxShadow: `0 0 0 1px rgba(0,0,0,0.35), 0 10px 18px rgba(0,0,0,0.55)`,
      }}
    >
      {label}
    </button>
  );
}

function Pill({ theme, label }: any) {
  return (
    <div
      style={{
        padding: "7px 12px",
        borderRadius: 999,
        border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.12)"}`,
        background: "rgba(0,0,0,0.25)",
        color: "rgba(255,255,255,0.92)",
        fontWeight: 950,
        fontSize: 12,
        letterSpacing: 0.4,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </div>
  );
}
