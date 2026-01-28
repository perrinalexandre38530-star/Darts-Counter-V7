// ============================================
// src/pages/Games.tsx — Sélecteur de modes de jeu
// Style harmonisé avec TrainingMenu (cartes néon)
//
// ✅ CHANGE (REQUEST FINAL):
// - FAVORIS (centrés, sans i) + AUCUNE annotation
// - FAVORIS calculés automatiquement via le NOMBRE DE PARTIES JOUÉES (history)
// - Remettre les cartes TRAINING et TOURNOIS sous les favoris
//   et AU-DESSUS des onglets, séparés par une barre de séparation thème
// - IMPORTANT ROUTING :
//   * Carte TRAINING => ouvre le HUB Training (tab "training")
//   * Favori TRAINING => ouvre sa CONFIG dédiée si elle existe
//     - training_x01 => tab "training_x01" (TrainingX01Config)
//     - tour_horloge => tab "training_clock" (TrainingClockConfig)
//     - autres trainings => fallback vers "training" (hub)
// - Onglets colorisés par catégorie comme les favoris
// - SUPPRIMER l’onglet "TRAINING" (mais garder la carte TRAINING au-dessus)
//
// ✅ TICKERS
// - Ticker du haut (NewModesTicker): NEW + centre + PLAY (OK)
// - Ticker du bas (juste sous favoris): IMAGE SEULE (sans NEW/PLAY), cliquable
// - ✅ NEW: Intégrer un ticker discret DANS chaque carte de jeu (liste)
//   * 75% de la largeur, 100% de la hauteur
//   * côté droit (sous le bouton "i"), opacity faible
//   * dégradé des deux côtés pour fondre avec la carte
//
// ✅ Chargement images tickers:
// - Mets tes images: src/assets/tickers/ticker_<gameId>.png
// - Chargées via import.meta.glob
// ============================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useDevMode } from "../contexts/DevModeContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import {
  DARTS_GAMES,
  GAME_CATEGORIES,
  GAME_SUBCATEGORIES,
  sortByPopularity,
  type GameCategory,
  type DartsGameDef,
} from "../games/dartsGameRegistry";
import { History } from "../lib/history";
import { devClickable, devVisuallyDisabled } from "../lib/devGate";

// ✅ NEW ticker component (haut seulement)
import NewModesTicker, { type NewModeTickerItem } from "../components/NewModesTicker";
import newGameBadge from "../assets/new_game.png";
import playBadge from "../assets/play.png";

// ✅ Tickers images (Vite): /src/assets/tickers/ticker_<gameId>.png
const TICKERS = import.meta.glob("../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTickerById(id: string): string | null {
  const raw = String(id || "");
  if (!raw) return null;

  // Accepte plusieurs conventions de nommage (underscore, tiret, espaces)
  // pour éviter les "missing ticker" lorsqu'un id diffère du nom de fichier.
  const norm = raw.trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixA = `/ticker_${c}.png`;
    const suffixB = `/ticker-${c}.png`;
    for (const k of Object.keys(TICKERS)) {
      if (k.endsWith(suffixA) || k.endsWith(suffixB)) return TICKERS[k];
    }
  }
  return null;
}

type Props = {
  setTab: (tab: any, params?: any) => void;
};

type InfoGame = {
  label: string;
  infoTitle?: string;
  infoBody?: string;
  ready: boolean;
};

type PlayCountMap = Record<string, number>;

function safeUpper(s: string) {
  return (s || "").toUpperCase();
}

// ✅ TERRITORIES: ticker watermark depends on UI language (dc_lang_v1)
// Assets attendus: ticker_territories_<code>.png (ou ticker-territories-<code>.png)
// Mapping langue -> code ticker: fr->fr, en->en, es->es, de->de, it->it, ru->ru, zh->cn, ja->jp, défaut->world
function territoriesTickerKeyForLang(langCode: any): string {
  const l = String(langCode || '').toLowerCase();
  const map: Record<string, string> = {
    fr: 'fr',
    en: 'en',
    es: 'es',
    de: 'de',
    it: 'it',
    ru: 'ru',
    zh: 'cn',
    ja: 'jp',
  };
  const code = map[l] || 'world';
  return `territories_${code}`;
}

// ✅ derive a “count key” from history records for a given game def
function matchRecordToGameId(rec: any, gameId: string): boolean {
  const k = String(rec?.kind || "");
  if (k && k === gameId) return true;

  const m1 = String(rec?.game?.mode || "");
  const m2 = String(rec?.mode || "");
  const m3 = String(rec?.summary?.mode || "");
  const m4 = String(rec?.payload?.mode || "");

  return m1 === gameId || m2 === gameId || m3 === gameId || m4 === gameId;
}

function pickDefaultFavorite(cat: GameCategory): DartsGameDef | null {
  const list = DARTS_GAMES.filter((g) => g.category === cat).slice().sort(sortByPopularity);
  return list[0] ?? null;
}

function pickFavoriteByCounts(cat: GameCategory, counts: PlayCountMap): DartsGameDef | null {
  const list = DARTS_GAMES.filter((g) => g.category === cat).slice().sort(sortByPopularity);
  if (!list.length) return null;

  let best: DartsGameDef | null = null;
  let bestCount = -1;

  for (const g of list) {
    const c = counts[g.id] ?? 0;
    if (c > bestCount) {
      bestCount = c;
      best = g;
    }
  }

  if (bestCount <= 0) return pickDefaultFavorite(cat);
  return best;
}

export default function Games({ setTab }: Props) {
  const { theme } = useTheme();
  const { t, lang } = useLang();
  const dev = useDevMode() as any;

  const [activeCat, setActiveCat] = React.useState<GameCategory>("classic");
  const [infoGame, setInfoGame] = React.useState<InfoGame | null>(null);

  // ✅ counts from history (finished matches)
  const [counts, setCounts] = React.useState<PlayCountMap>({});

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function navigate(tab: string, params?: any) {
    setTab(tab, params);
  }

  // Smart navigation for ticker items
  function navSmart(path: string) {
    if (!path) return;
    const p = String(path);

    if (p.startsWith("tab:")) {
      navigate(p.replace("tab:", ""));
      return;
    }

    if (!p.includes("/") && !p.includes("#") && !p.includes("?")) {
      navigate(p);
      return;
    }

    if (p.startsWith("#")) {
      window.location.hash = p.replace(/^#/, "");
      return;
    }

    window.location.href = p;
  }

  function configPathForGame(g: any): string {
    const raw = String(g?.configTab || g?.configPath || "");
    if (raw) return raw.startsWith("tab:") ? raw : `tab:${raw}`;

    const tab = String(g?.tab || "");
    if (tab) {
      if (/config/i.test(tab)) return `tab:${tab}`;
      if (/_play$/i.test(tab)) return `tab:${tab.replace(/_play$/i, "_config")}`;
      if (/Play$/i.test(tab)) return `tab:${tab.replace(/Play$/i, "Config")}`;
      if (/Play/i.test(tab)) return `tab:${tab.replace(/Play/gi, "Config")}`;
      return `tab:${g.id}_config`;
    }
    return `tab:${g.id}_config`;
  }

  // ✅ Séparateur visuel (barre néon)
  const separatorBar = (
    <div
      style={{
        height: 1,
        margin: "12px 4px",
        background: `linear-gradient(90deg,
          rgba(0,0,0,0),
          ${theme.primary}AA,
          rgba(255,255,255,0.10),
          ${theme.primary}AA,
          rgba(0,0,0,0)
        )`,
        boxShadow: `0 0 14px ${theme.primary}55`,
        borderRadius: 999,
      }}
    />
  );

  // ✅ Load counts once (and keep resilient)
  React.useEffect(() => {
    let alive = true;

    (async () => {
      try {
        const rows = await History.listFinished();
        const map: PlayCountMap = {};

        for (const r of rows as any[]) {
          for (const g of DARTS_GAMES) {
            if (matchRecordToGameId(r, g.id)) {
              map[g.id] = (map[g.id] ?? 0) + 1;
            }
          }
        }

        if (alive) setCounts(map);
      } catch {
        if (alive) setCounts({});
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  // ✅ Remove TRAINING tab entirely (keep its card above)
  const visibleCategories = React.useMemo(
    () => GAME_CATEGORIES.filter((c) => c.id !== "training"),
    []
  );

  React.useEffect(() => {
    if (activeCat === "training") setActiveCat("classic");
  }, [activeCat]);

  const gamesForCat = React.useMemo(() => {
    return DARTS_GAMES.filter((g) => g.category === activeCat).slice().sort(sortByPopularity);
  }, [activeCat]);

  // Favorites (computed from counts)
  const favClassic = React.useMemo(() => pickFavoriteByCounts("classic", counts), [counts]);
  const favTraining = React.useMemo(() => pickFavoriteByCounts("training", counts), [counts]);
  const favVariant = React.useMemo(() => pickFavoriteByCounts("variant", counts), [counts]);
  const favChallenge = React.useMemo(() => pickFavoriteByCounts("challenge", counts), [counts]);
  const favFun = React.useMemo(() => pickFavoriteByCounts("fun", counts), [counts]);

  // ✅ Routing du favori training : config dédiée quand disponible
  function trainingFavoriteTarget(game: DartsGameDef | null): { tab: string; params?: any } {
    if (!game) return { tab: "training" };
    if (game.id === "training_x01") return { tab: "training_x01" };
    if (game.id === "tour_horloge") return { tab: "training_clock" };
    return { tab: "training" };
  }

  // Styles helpers
  function tintedCardStyle(tint: { border: string; bg: string; title: string; glow: string }) {
    return {
      border: `1px solid ${tint.border}`,
      background: tint.bg,
      boxShadow: `0 10px 24px rgba(0,0,0,0.55), 0 0 18px ${tint.glow}`,
    } as React.CSSProperties;
  }

  const TINT_STATS = {
    border: "rgba(120,255,180,0.40)",
    bg: "linear-gradient(180deg, rgba(120,255,180,0.14), rgba(255,255,255,0.05))",
    title: "#8CFFCB",
    glow: "rgba(120,255,180,0.22)",
  };

  const TINT_CLASSIC = {
    border: "rgba(255,215,120,0.45)",
    bg: "linear-gradient(180deg, rgba(255,215,120,0.16), rgba(255,255,255,0.05))",
    title: "#FFD88A",
    glow: "rgba(255,215,120,0.24)",
  };

  const TINT_TRAINING = {
    border: "rgba(255,170,90,0.45)",
    bg: "linear-gradient(180deg, rgba(255,170,90,0.16), rgba(255,255,255,0.05))",
    title: "#FFBE7A",
    glow: "rgba(255,170,90,0.24)",
  };

  const TINT_VARIANT = {
    border: "rgba(160,120,255,0.45)",
    bg: "linear-gradient(180deg, rgba(160,120,255,0.16), rgba(255,255,255,0.05))",
    title: "#C7A7FF",
    glow: "rgba(160,120,255,0.24)",
  };

  const TINT_CHALLENGE = {
    border: "rgba(120,200,255,0.45)",
    bg: "linear-gradient(180deg, rgba(120,200,255,0.16), rgba(255,255,255,0.05))",
    title: "#9FD7FF",
    glow: "rgba(120,200,255,0.24)",
  };

  const TINT_FUN = {
    border: "rgba(255,120,200,0.48)",
    bg: "linear-gradient(180deg, rgba(255,120,200,0.16), rgba(255,255,255,0.05))",
    title: "#FF9FDC",
    glow: "rgba(255,120,200,0.26)",
  };

  function tintForCategory(cat: GameCategory) {
    if (cat === "classic") return TINT_CLASSIC;
    if (cat === "variant") return TINT_VARIANT;
    if (cat === "challenge") return TINT_CHALLENGE;
    return TINT_FUN;
  }

  function renderFavoriteCard(opts: {
    title: string;
    tint: { border: string; bg: string; title: string; glow: string };
    game: DartsGameDef | null;
    fallbackTab: string;
    kind: "classic" | "training" | "variant" | "challenge" | "fun";
  }) {
    const g = opts.game;

    const ready = !!g?.ready;
    const visuallyDisabled = g ? devVisuallyDisabled(ready) : true;
    const clickable = g ? devClickable(ready, !!dev?.enabled) : false;
    const label = g ? safeUpper(g.label) : safeUpper(t("games.fav.none", "AUCUN"));

    let goTab = g ? g.tab : opts.fallbackTab;
    let params: any = undefined;

    if (opts.kind === "training") {
      const target = trainingFavoriteTarget(g);
      goTab = target.tab;
      params = target.params;
    }

    const glow = opts.tint.glow;
    const border = opts.tint.border;
    const titleColor = opts.tint.title;

    return (
      <button
        onClick={() => setTab(clickable ? goTab : "mode_not_ready", params)}
        style={{
          position: "relative",
          width: "100%",
          padding: 14,
          textAlign: "center",
          borderRadius: 16,
          cursor: "pointer",
          overflow: "hidden",
          userSelect: "none",
          WebkitTapHighlightColor: "transparent",

          border: `1px solid ${border}`,
          background: opts.tint.bg,
          boxShadow: visuallyDisabled
            ? `0 8px 18px rgba(0,0,0,0.45)`
            : `0 14px 28px rgba(0,0,0,0.60), 0 0 22px ${glow}`,
          opacity: visuallyDisabled ? 0.6 : 1,
          transform: "translateZ(0)",
          transition: "transform 140ms ease, box-shadow 140ms ease, opacity 140ms ease",
        }}
        onMouseDown={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(0.992)";
        }}
        onMouseUp={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.transform = "scale(1)";
        }}
      >
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: -40,
            background: `radial-gradient(320px 180px at 50% 15%, ${glow}, rgba(0,0,0,0) 60%)`,
            opacity: visuallyDisabled ? 0.35 : 0.7,
            pointerEvents: "none",
            filter: "blur(2px)",
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            top: -60,
            left: -80,
            width: 180,
            height: 220,
            transform: "rotate(20deg)",
            background:
              "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.0) 70%)",
            opacity: visuallyDisabled ? 0.12 : 0.22,
            pointerEvents: "none",
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 1,
            borderRadius: 15,
            border: "1px solid rgba(255,255,255,0.08)",
            pointerEvents: "none",
          }}
        />

        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 64,
            fontWeight: 900,
            color: "rgba(255,255,255,0.08)",
            transform: "translateY(6px)",
            pointerEvents: "none",
            textShadow: `0 0 24px ${glow}`,
            opacity: visuallyDisabled ? 0.05 : 0.08,
          }}
        >
          ★
        </div>

        <div
          aria-hidden
          style={{
            position: "absolute",
            right: 10,
            top: 10,
            width: 10,
            height: 10,
            borderRadius: 999,
            background: titleColor,
            boxShadow: `0 0 10px ${glow}, 0 0 18px ${glow}`,
            opacity: visuallyDisabled ? 0.35 : 0.85,
            pointerEvents: "none",
          }}
        />

        <div
          style={{
            fontSize: 12,
            fontWeight: 900,
            letterSpacing: 1.0,
            color: titleColor,
            textTransform: "uppercase",
            textShadow: `0 0 12px ${glow}`,
            position: "relative",
            zIndex: 1,
          }}
        >
          {opts.title}
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 13,
            fontWeight: 950,
            letterSpacing: 0.6,
            color: "#fff",
            textTransform: "uppercase",
            textShadow: visuallyDisabled ? "none" : "0 0 10px rgba(0,0,0,0.35)",
            position: "relative",
            zIndex: 1,
          }}
        >
          {label}
        </div>
      </button>
    );
  }

  // ✅ Ticker du haut: nouveaux modes
  const newModes: NewModeTickerItem[] = React.useMemo(() => {
    const list = (DARTS_GAMES || []).filter((g: any) => g && g.ready);

    const explicit = list.filter((g: any) => g.isNew === true);
    const base = explicit.length
      ? explicit
      : list.filter((g: any) => {
          const id = String(g.id || "");
          return (
            id.includes("happy") ||
            id.includes("t70") ||
            id.includes("halve") ||
            id.includes("bobs") ||
            id.includes("bob") ||
            id.includes("count") ||
            id.includes("prison") ||
            id.includes("encul") ||
            id.includes("vache")
          );
        });

    return (base.length ? base : list.slice(0, 6)).slice(0, 12).map((g: any) => ({
      id: String(g.id),
      label: String(g.label),
      configPath: configPathForGame(g),
    }));
  }, []);

  // ✅ Ticker du bas: tous les modes (random), IMAGE SEULE (sans NEW/PLAY)
  const allTickerPool = React.useMemo(() => {
    return (DARTS_GAMES || [])
      .filter((g: any) => g && g.ready)
      .map((g: any) => {
        const id = String(g.id);
        const tickerSrc = id === 'departements' ? findTickerById(territoriesTickerKeyForLang(lang)) : findTickerById(id);
        return {
          id,
          label: String(g.label || id),
          tickerSrc,
          configPath: configPathForGame(g),
        };
      })
      .filter((x: any) => !!x.tickerSrc);
  }, [lang]);

  const [allTickerIdx, setAllTickerIdx] = React.useState(0);

  React.useEffect(() => {
    if (!allTickerPool.length) return;
    const ms = 2600;
    const it = window.setInterval(() => {
      setAllTickerIdx((prev) => {
        const n = allTickerPool.length;
        if (n <= 1) return 0;
        let next = Math.floor(Math.random() * n);
        if (next === prev) next = (next + 1) % n;
        return next;
      });
    }, ms);
    return () => window.clearInterval(it);
  }, [allTickerPool.length]);

  // ✅ helper: watermark ticker inside game cards (75% width, 100% height, fades)
  function renderGameTickerWatermark(gameId: string) {
    const src = gameId === 'departements' ? findTickerById(territoriesTickerKeyForLang(lang)) : findTickerById(gameId);
    if (!src) return null;

    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "75%",
          pointerEvents: "none",
          opacity: 0.22, // discret
          zIndex: 0,
          // dégradé des deux côtés: transparent -> opaque -> transparent
          WebkitMaskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
        }}
      >
        <img
          src={src}
          alt=""
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover", // 100% hauteur garanti (peut crop un peu)
            objectPosition: "center",
            transform: "translateZ(0)",
            filter: "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))",
          }}
          draggable={false}
        />
        {/* légère couche pour fondre avec la carte */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.00) 35%, rgba(0,0,0,0.00) 65%, rgba(0,0,0,0.35) 100%)",
            opacity: 0.55,
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: PAGE_BG,
        color: theme.text,
      }}
    >
      {/* ✅ BackDot retour Home (fixe en haut à gauche) */}
      <div
        style={{
          position: "fixed",
          top: 12,
          left: 12,
          zIndex: 60,
        }}
      >
        <BackDot onClick={() => setTab("home")} />
      </div>


      <h1
        style={{
          margin: 0,
          marginBottom: 6,
          fontSize: 24,
          color: theme.primary,
          textAlign: "center",
          textShadow: `0 0 12px ${theme.primary}66`,
        }}
      >
        {t("games.title", "TOUS LES JEUX")}
      </h1>

      <div
        style={{
          fontSize: 13,
          color: theme.textSoft,
          marginBottom: 18,
          textAlign: "center",
        }}
      >
        {t("games.subtitle", "Choisis un mode de jeu")}
      </div>

      {/* ✅ Top : ticker + favoris */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 10 }}>
        {/* ✅ TICKER HAUT (NEW + PLAY autorisés) */}
        <NewModesTicker
          items={newModes}
          intervalMs={3000}
          leftLogoSrc={newGameBadge}
          playLogoSrc={playBadge}
          onNavigate={(path) => navSmart(String(path || ""))}
        />

        {renderFavoriteCard({
          title: t("games.fav.classic.title", "FAVORI — CLASSIQUES"),
          tint: TINT_CLASSIC,
          game: favClassic,
          fallbackTab: "mode_not_ready",
          kind: "classic",
        })}

        {renderFavoriteCard({
          title: t("games.fav.training.title", "FAVORI — TRAINING"),
          tint: TINT_TRAINING,
          game: favTraining,
          fallbackTab: "training",
          kind: "training",
        })}

        {renderFavoriteCard({
          title: t("games.fav.variant.title", "FAVORI — VARIANTES"),
          tint: TINT_VARIANT,
          game: favVariant,
          fallbackTab: "mode_not_ready",
          kind: "variant",
        })}

        {renderFavoriteCard({
          title: t("games.fav.challenge.title", "FAVORI — DÉFIS"),
          tint: TINT_CHALLENGE,
          game: favChallenge,
          fallbackTab: "mode_not_ready",
          kind: "challenge",
        })}

        {renderFavoriteCard({
          title: t("games.fav.fun.title", "FAVORI — FUN"),
          tint: TINT_FUN,
          game: favFun,
          fallbackTab: "mode_not_ready",
          kind: "fun",
        })}

        {separatorBar}

        {/* ✅ TRAINING + TOURNOIS sous favoris */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {/* ✅ TICKER BAS (IMAGE SEULE) — SANS NEW/PLAY */}
          {(() => {
            const current = allTickerPool.length
              ? allTickerPool[allTickerIdx % allTickerPool.length]
              : null;

            if (!current) return null;

            return (
              <div style={{ display: "flex", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => navSmart(current.configPath)}
                  style={{
                    width: "100%",
                    maxWidth: 800, // largeur max = largeur PNG
                    aspectRatio: "800 / 230",
                    position: "relative",
                    overflow: "hidden",
                    borderRadius: 18,
                    border: `1px solid ${TINT_STATS.border}`,
                    background: `linear-gradient(180deg, rgba(120,255,180,0.10), rgba(0,0,0,0.18))`,
                    boxShadow: `0 12px 26px rgba(0,0,0,0.55), 0 0 18px ${TINT_STATS.glow}`,
                    padding: 0,
                    cursor: "pointer",
                  }}
                  aria-label={`Ouvrir config ${current.label}`}
                >
                  <img
                    src={current.tickerSrc as any}
                    alt={current.label}
                    style={{
                      position: "absolute",
                      inset: 0,
                      width: "100%",
                      height: "100%",
                      objectFit: "contain",
                      display: "block",
                      transform: "translateZ(0)",
                      filter: "drop-shadow(0 0 10px rgba(0,0,0,0.35))",
                    }}
                    draggable={false}
                  />
                </button>
              </div>
            );
          })()}

          {/* TRAINING HUB */}
          <button
            onClick={() => navigate("training")}
            style={{
              position: "relative",
              width: "100%",
              padding: 14,
              paddingRight: 46,
              textAlign: "left",
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: CARD_BG,
              cursor: "pointer",
              boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 12px ${theme.primary}55`,
              }}
            >
              {t("games.training.title", "TRAINING")}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
              {t("games.training.subtitle", "Améliore ta progression.")}
            </div>

            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <InfoDot
                onClick={(ev) => {
                  ev.stopPropagation();
                  setInfoGame({
                    label: "Training",
                    ready: true,
                    infoTitle: "Training",
                    infoBody:
                      "Hub d'entraînement : accès à Training X01, Tour de l'horloge et autres drills (selon implémentation).",
                  });
                }}
                glow={theme.primary + "88"}
              />
            </div>
          </button>

          {/* TOURNOIS */}
          <button
            onClick={() => navigate("tournaments")}
            style={{
              position: "relative",
              width: "100%",
              padding: 14,
              paddingRight: 46,
              textAlign: "left",
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: CARD_BG,
              cursor: "pointer",
              boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                fontSize: 14,
                fontWeight: 800,
                letterSpacing: 0.8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 12px ${theme.primary}55`,
              }}
            >
              {t("games.tournaments.title", "TOURNOIS")}
            </div>
            <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft, opacity: 0.9 }}>
              {t("games.tournaments.subtitle", "Crée des tournois en local (poules, élimination…).")}
            </div>

            <div
              style={{
                position: "absolute",
                right: 10,
                top: "50%",
                transform: "translateY(-50%)",
              }}
            >
              <InfoDot
                onClick={(ev) => {
                  ev.stopPropagation();
                  setInfoGame({
                    label: "Tournois",
                    ready: true,
                    infoTitle: "Tournois (Local)",
                    infoBody:
                      "Crée des tournois en local : round-robin, élimination directe, poules + phase finale, byes et paramètres complets selon le mode.",
                  });
                }}
                glow={theme.primary + "88"}
              />
            </div>
          </button>
        </div>
      </div>

      {/* ✅ Onglets catégories - couleurs liées aux favoris (sans TRAINING) */}
      <div
        style={{
          display: "flex",
          gap: 8,
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: 12,
        }}
      >
        {visibleCategories.map((c) => {
          const on = c.id === activeCat;
          const tint = tintForCategory(c.id);

          return (
            <button
              key={c.id}
              onClick={() => setActiveCat(c.id)}
              style={{
                padding: "8px 12px",
                borderRadius: 999,
                border: `1px solid ${on ? tint.border : theme.borderSoft}`,
                background: on ? tint.bg : theme.card,
                color: on ? tint.title : theme.text,
                fontWeight: 900,
                fontSize: 12,
                cursor: "pointer",
                boxShadow: on ? `0 0 18px ${tint.glow}` : "none",
              }}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      {/* Cartes de jeux (liste) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {(() => {
          const ordered = (GAME_SUBCATEGORIES?.[activeCat] || []).map((s) => s.id);

          const groups: Record<string, typeof gamesForCat> = {};
          for (const g of gamesForCat) {
            const key = (g as any).subCategory ? String((g as any).subCategory) : "other";
            (groups[key] ||= []).push(g);
          }

          const keys = Array.from(new Set([...ordered, ...Object.keys(groups)])).filter(
            (k) => (groups[k] || []).length > 0
          );

          const labelFor = (k: string) => {
            const def = (GAME_SUBCATEGORIES?.[activeCat] || []).find((s) => s.id === k);
            if (def?.label) return def.label;
            if (k === "other") return t("games.subcat.other", "Autres");
            return k;
          };

          return keys.map((k) => (
            <div key={k} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div
                style={{
                  marginTop: 6,
                  marginBottom: 2,
                  padding: "6px 10px",
                  borderRadius: 999,
                  alignSelf: "flex-start",
                  border: `1px solid ${theme.borderSoft}`,
                  background: `linear-gradient(180deg, rgba(255,255,255,0.06), rgba(0,0,0,0.08))`,
                  color: theme.textSoft,
                  fontWeight: 900,
                  fontSize: 11,
                  letterSpacing: 0.6,
                  textTransform: "uppercase",
                }}
              >
                {labelFor(k)}
              </div>

              {(groups[k] || []).map((g) => {
                const ready = !!g?.ready;
                const visuallyDisabled = devVisuallyDisabled(ready);
                const clickable = devClickable(ready, !!dev?.enabled);
                const comingSoon = visuallyDisabled ? t("games.status.comingSoon", "Bientôt disponible") : null;

                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      if (!clickable) return navigate("mode_not_ready");
                      // Support des variantes via params (ex: Cricket Cut-Throat)
                      const params = g.variantId ? { gameId: g.id, baseGame: g.baseGame, variantId: g.variantId } : undefined;
                      return navigate(g.tab, params);
                    }}
                    style={{
                      position: "relative",
                      width: "100%",
                      padding: 14,
                      paddingRight: 46,
                      textAlign: "left",
                      borderRadius: 16,
                      border: `1px solid ${theme.borderSoft}`,
                      background: CARD_BG,
                      cursor: "pointer",
                      opacity: visuallyDisabled ? 0.55 : 1,
                      boxShadow: visuallyDisabled ? "none" : `0 10px 24px rgba(0,0,0,0.55)`,
                      overflow: "hidden",
                    }}
                  >
                    {/* ✅ Watermark ticker (75% largeur / 100% hauteur, fade) */}
                    {renderGameTickerWatermark(g.id)}

                    {/* ✅ contenu au-dessus */}
                    <div style={{ position: "relative", zIndex: 1 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 800,
                          letterSpacing: 0.8,
                          color: visuallyDisabled ? theme.textSoft : theme.primary,
                          textTransform: "uppercase",
                          textShadow: visuallyDisabled ? "none" : `0 0 12px ${theme.primary}55`,
                        }}
                      >
                        {g.label}
                      </div>

                      <div
                        style={{
                          marginTop: 4,
                          fontSize: 12,
                          color: theme.textSoft,
                          opacity: 0.9,
                        }}
                      >
                        {comingSoon && (
                          <span style={{ fontSize: 11, fontStyle: "italic", opacity: 0.9 }}>
                            {comingSoon}
                          </span>
                        )}
                      </div>
                    </div>

                    <div
                      style={{
                        position: "absolute",
                        right: 10,
                        top: "50%",
                        transform: "translateY(-50%)",
                        zIndex: 2,
                      }}
                    >
                      <InfoDot
                        onClick={(ev) => {
                          ev.stopPropagation();
                          setInfoGame({
                            label: g.label,
                            ready: g.ready,
                            infoTitle: g.infoTitle,
                            infoBody: g.infoBody,
                          });
                        }}
                        glow={theme.primary + "88"}
                      />
                    </div>
                  </button>
                );
              })}
            </div>
          ));
        })()}
      </div>

      {/* Overlay d'information */}
      {infoGame && (
        <div
          onClick={() => setInfoGame(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.72)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: 420,
              margin: 16,
              padding: 18,
              borderRadius: 18,
              background: theme.card,
              border: `1px solid ${theme.primary}55`,
              boxShadow: `0 18px 40px rgba(0,0,0,.7)`,
              color: theme.text,
            }}
          >
            <div
              style={{
                fontSize: 16,
                fontWeight: 800,
                marginBottom: 8,
                color: theme.primary,
                textTransform: "uppercase",
                textShadow: `0 0 10px ${theme.primary}55`,
              }}
            >
              {infoGame.infoTitle ?? infoGame.label}
            </div>

            <div
              style={{
                fontSize: 13,
                lineHeight: 1.4,
                color: theme.textSoft,
                marginBottom: 12,
              }}
            >
              {infoGame.infoBody ?? ""}
            </div>

            {!infoGame.ready && (
              <div style={{ fontSize: 12, fontWeight: 600, color: theme.primary, marginBottom: 10 }}>
                {t("games.status.comingSoon", "Bientôt disponible")}
              </div>
            )}

            <button
              type="button"
              onClick={() => setInfoGame(null)}
              style={{
                display: "block",
                marginLeft: "auto",
                padding: "6px 14px",
                borderRadius: 999,
                border: "none",
                background: theme.primary,
                color: "#000",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              {t("games.info.close", "Fermer")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
