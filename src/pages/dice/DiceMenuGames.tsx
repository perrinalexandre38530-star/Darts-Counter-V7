// @ts-nocheck
// =============================================================
// src/pages/dice/DiceMenuGames.tsx
// Games — DICE (UI calquée sur src/pages/Games.tsx de DartsCounter)
// - FAVORIS auto depuis l'historique Dice
// - Onglets catégories
// - Cartes modes (Duel/Race/10 000/Yam's + bientôt)
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { useSport } from "../../contexts/SportContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { History } from "../../lib/history";
import { getTicker } from "../../lib/tickers";

type Props = {
  go: (route: string, params?: any) => void;
};

type DiceCat = "all" | "score" | "scorecard" | "risk";

type DiceGameDef = {
  id: string;
  title: string;
  subtitle: string;
  cat: Exclude<DiceCat, "all">;
  tickerKey?: string;
  route?: string; // navigation
  params?: any;
  disabled?: boolean;
  info?: string;
};

const DICE_GAMES: DiceGameDef[] = [
  {
    id: "duel",
    title: "DICE DUEL",
    subtitle: "2 dés • cible 100 • score = somme • BO (sets)",
    cat: "score",
    tickerKey: "dice_duel",
    route: "dice_config",
    params: { preset: "duel" },
    info: "Course au score. Chaque lancer = somme des dés. Premier à la cible.",
  },
  {
    id: "race",
    title: "DICE RACE",
    subtitle: "3 dés • cible 200 • score = somme • BO (sets)",
    cat: "score",
    tickerKey: "dice_race",
    route: "dice_config",
    params: { preset: "race" },
    info: "Variante plus rapide/nerveuse avec 3 dés et une cible plus haute.",
  },
  {
    id: "tenk",
    title: "10 000",
    subtitle: "6 dés • cible 10 000 • version simplifiée • BO (sets)",
    cat: "risk",
    tickerKey: "dice_10k",
    route: "dice_config",
    params: { preset: "tenk" },
    info: "Version simplifiée (pour l'instant) : course au score 10 000.",
  },
  {
    id: "yams",
    title: "YAM'S",
    subtitle: "5 dés • 2 relances • scorecard • bonus haut",
    cat: "scorecard",
    tickerKey: "dice_yams",
    route: "dice_yams_config",
    params: {},
    info: "Yahtzee/Yam's : feuille de score (brelan, full, carré, suite, yam's...).",
  },

  // BIENTÔT — placeholders (UI OK, pas de navigation)
  {
    id: "farkle",
    title: "FARKLE",
    route: "dice_farkle_config",
    params: {},
    subtitle: "Push-your-luck • combinaisons • bank/bust",
    cat: "risk",
    tickerKey: "dice_farkle",
    disabled: false,
    info: "À venir : vrai 10 000 / Farkle avec scoring des combinaisons + bank/bust.",
  },
  {
    id: "421",
    title: "421",
    route: "dice_421_config",
    params: {},
    subtitle: "Combinaisons • annonces • points",
    cat: "score",
    tickerKey: "dice_421",
    disabled: false,
    info: "À venir : 421 (FR) avec hiérarchie des combos et scoring.",
  },
  {
    id: "poker",
    title: "POKER DICE",
    route: "dice_poker_config",
    params: {},
    subtitle: "Combinaisons poker • manche rapide",
    cat: "scorecard",
    tickerKey: "dice_poker",
    disabled: false,
    info: "À venir : Poker Dice (paires, brelan, carré, full, quinte...).",
  },
];

function safeLower(v: any) {
  return String(v || "").toLowerCase();
}

function fmtCount(n: number) {
  if (!n) return "0";
  if (n >= 1000) return `${Math.floor(n / 100) / 10}k`;
  return String(n);
}

export default function DiceMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();
  const { sport } = useSport();

  const isDiceSport = safeLower(sport).includes("dice");
  // si on est pas en sport dice, on affiche quand même la page (mais sans dépendances)
  const [activeCat, setActiveCat] = React.useState<DiceCat>("all");
  const [infoGame, setInfoGame] = React.useState<DiceGameDef | null>(null);

  const [counts, setCounts] = React.useState<Record<string, number>>({});

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await History.list();
        const map: Record<string, number> = {};
        (rows || []).forEach((r: any) => {
          const kind = safeLower(r?.kind || r?.sport || r?.payload?.kind);
          if (!kind.includes("dice")) return;
          // mode stocké soit en root, soit dans summary
          const mode = safeLower(r?.mode || r?.summary?.mode || r?.payload?.mode);
          const key = mode || "duel";
          map[key] = (map[key] || 0) + 1;
        });
        if (alive) setCounts(map);
      } catch {
        if (alive) setCounts({});
      }
    })();
    return () => {
      alive = false;
    };
  }, [sport]);

  // favoris = top 3 modes joués
  const favorites = React.useMemo(() => {
    const defs = DICE_GAMES.filter((g) => !g.disabled);
    const scored = defs
      .map((g) => ({ g, n: counts[g.id] || 0 }))
      .sort((a, b) => b.n - a.n);
    // si aucun match, on propose 3 premiers "main"
    const hasAny = scored.some((x) => x.n > 0);
    return (hasAny ? scored : defs.map((g) => ({ g, n: 0 }))).slice(0, 3);
  }, [counts]);

  const tabs: { key: DiceCat; label: string }[] = [
    { key: "all", label: "TOUS" },
    { key: "score", label: "SCORE" },
    { key: "scorecard", label: "SCORECARD" },
    { key: "risk", label: "RISQUE" },
  ];

  const filtered = React.useMemo(() => {
    if (activeCat === "all") return DICE_GAMES;
    return DICE_GAMES.filter((g) => g.cat === activeCat);
  }, [activeCat]);

  const PAGE_BG = theme.bg;
  const CARD_BG = theme.card;

  function openGame(g: DiceGameDef) {
    if (g.disabled) {
      setInfoGame(g);
      return;
    }
    if (g.route) go(g.route, g.params);
  }

  const headerTicker = getTicker("dice_games") || getTicker("dice") || "";

  return (
    <div style={{ minHeight: "100vh", background: PAGE_BG, padding: 14 }}>
      {/* Header */}
      <div style={{ position: "relative", borderRadius: 18, overflow: "hidden", border: `1px solid ${theme.borderSoft}` }}>
        <div
          style={{
            height: 86,
            backgroundImage: headerTicker ? `url(${headerTicker})` : undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.68), rgba(0,0,0,.15))" }} />
        <div style={{ position: "absolute", left: 12, top: 12 }}>
          <BackDot onClick={() => go("dice_home")} />
        </div>
        <div style={{ position: "absolute", right: 12, top: 12 }}>
          <InfoDot
            onClick={() =>
              setInfoGame({
                id: "about",
                title: "DICE COUNTER",
                subtitle: "",
                cat: "score",
                info:
                  "Choisis un mode de jeu.\n\n• FAVORIS : calculés automatiquement selon tes parties.\n• Onglets : filtre par type de jeu.\n\nObjectif : garder l'UI identique DartsCounter, seul le contenu change.",
              } as any)
            }
          />
        </div>
        <div style={{ position: "absolute", left: 98, top: 26, right: 20, color: "#fff" }}>
          <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 1.4 }}>DICE</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>
            {isDiceSport ? "Choisis ton mode de jeu" : "Mode Dice"}
          </div>
        </div>
      </div>

      {/* FAVORIS */}
      <div style={{ marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 900, letterSpacing: 1.2, color: theme.textMuted }}>FAVORIS</div>
          <div style={{ fontSize: 12, color: theme.textMuted, opacity: 0.85 }}>
            Auto • basé sur tes parties
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10 }}>
          {favorites.map(({ g, n }) => (
            <button
              key={g.id}
              onClick={() => openGame(g)}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft}`,
                background: "transparent",
                overflow: "hidden",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  backgroundImage: (getTicker(g.tickerKey || "") || headerTicker) ? `url(${getTicker(g.tickerKey || "") || headerTicker})` : undefined,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: "saturate(1.08) contrast(1.05)",
                }}
              />
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.78), rgba(0,0,0,.20))" }} />
              <div style={{ position: "relative", padding: 16 }}>
                <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 12 }}>
                  <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 1, color: "#fff" }}>{g.title}</div>
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,.75)" }}>
                    {fmtCount(n)} match{n > 1 ? "s" : ""}
                  </div>
                </div>
                <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>{g.subtitle}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Separator */}
      <div style={{ height: 1, background: theme.borderSoft, opacity: 0.9, margin: "16px 2px" }} />

      {/* Onglets */}
      <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
        {tabs.map((tab) => {
          const active = activeCat === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveCat(tab.key)}
              style={{
                padding: "10px 12px",
                borderRadius: 999,
                border: `1px solid ${active ? theme.acc : theme.borderSoft}`,
                background: active ? "rgba(180,255,0,.12)" : CARD_BG,
                color: active ? theme.acc : theme.text,
                fontWeight: 900,
                letterSpacing: 1,
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Liste */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 10, paddingBottom: 28 }}>
        {filtered.map((g) => (
          <button
            key={g.id}
            onClick={() => openGame(g)}
            style={{
              position: "relative",
              width: "100%",
              padding: 0,
              textAlign: "left",
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: CARD_BG,
              overflow: "hidden",
              cursor: "pointer",
              opacity: g.disabled ? 0.55 : 1,
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                backgroundImage: (getTicker(g.tickerKey || "") || headerTicker) ? `url(${getTicker(g.tickerKey || "") || headerTicker})` : undefined,
                backgroundSize: "cover",
                backgroundPosition: "center",
                opacity: 0.78,
                filter: "saturate(1.1) contrast(1.05)",
              }}
            />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.82), rgba(0,0,0,.20))" }} />

            <div style={{ position: "relative", padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                <div style={{ fontSize: 18, fontWeight: 1000, letterSpacing: 1.2, color: "#fff" }}>{g.title}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {g.disabled ? (
                    <div
                      style={{
                        fontSize: 11,
                        fontWeight: 900,
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "rgba(255,255,255,.10)",
                        border: `1px solid ${theme.borderSoft}`,
                        color: "rgba(255,255,255,.75)",
                      }}
                    >
                      BIENTÔT
                    </div>
                  ) : (
                    <div style={{ fontSize: 12, color: "rgba(255,255,255,.72)" }}>{fmtCount(counts[g.id] || 0)}</div>
                  )}

                  <InfoDot onClick={(e: any) => (e?.stopPropagation?.(), setInfoGame(g))} />
                </div>
              </div>
              <div style={{ marginTop: 6, fontSize: 12.5, color: "rgba(255,255,255,.72)" }}>{g.subtitle}</div>
            </div>
          </button>
        ))}
      </div>

      {/* Modal info */}
      {infoGame && (
        <div
          onClick={() => setInfoGame(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 50,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 520,
              borderRadius: 18,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              boxShadow: "0 20px 80px rgba(0,0,0,.65)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 16, borderBottom: `1px solid ${theme.borderSoft}` }}>
              <div style={{ fontSize: 16, fontWeight: 1000, letterSpacing: 1.1, color: theme.text }}>{infoGame.title}</div>
              {!!infoGame.subtitle && (
                <div style={{ marginTop: 6, fontSize: 12.5, color: theme.textMuted }}>{infoGame.subtitle}</div>
              )}
            </div>
            <div style={{ padding: 16 }}>
              <div style={{ whiteSpace: "pre-wrap", fontSize: 13, lineHeight: 1.45, color: theme.textMuted }}>
                {infoGame.info || "—"}
              </div>

              <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end" }}>
                {!infoGame.disabled && infoGame.route && infoGame.id !== "about" && (
                  <button
                    onClick={() => {
                      const g = infoGame;
                      setInfoGame(null);
                      openGame(g);
                    }}
                    style={{
                      padding: "10px 14px",
                      borderRadius: 12,
                      border: `1px solid ${theme.acc}`,
                      background: "rgba(180,255,0,.12)",
                      color: theme.acc,
                      fontWeight: 1000,
                      cursor: "pointer",
                    }}
                  >
                    LANCER
                  </button>
                )}
                <button
                  onClick={() => setInfoGame(null)}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 12,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "transparent",
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
        </div>
      )}
    </div>
  );
}
