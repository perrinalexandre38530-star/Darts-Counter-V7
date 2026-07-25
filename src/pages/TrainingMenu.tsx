import React, { useLayoutEffect } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import InfoDot from "../components/InfoDot";
import BackDot from "../components/BackDot";
import tickerTrainingFr from "../assets/tickers/ticker_menu_training_fr.png";
import tickerTrainingEn from "../assets/tickers/ticker_menu_training_en.png";
import { dartsGameRegistry } from "../games/dartsGameRegistry";

type Tab =
  | "games"
  | "training"
  | "training_x01"
  | "training_clock"
  | "training_stats"
  | "training_mode";

type Props = {
  go?: (tab: Tab, params?: any) => void;
};

type ModeCard = {
  id: string;
  label: string;
  subtitle: string;
  tab: Tab;
  params?: any;
  infoTitle: string;
  infoBody: string;
  ticker?: string | null;
};

const TICKERS = import.meta.glob("../assets/tickers/*.{png,webp}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function norm(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function findTickerSmart(gameId: string): string | null {
  const raw = norm(gameId);
  if (!raw) return null;

  const candidates = Array.from(
    new Set([
      raw,
      raw.replace(/^training_/, ""),
      raw.replace(/_training$/, ""),
      raw.replace(/^training_/, "").replace(/_training$/, ""),
    ])
  ).filter(Boolean);

  for (const [path, src] of Object.entries(TICKERS)) {
    const file = norm(
      String(path.split("/").pop() || "")
        .replace(/\.(png|webp)$/i, "")
        .replace(/^ticker_/, "")
    );
    if (candidates.includes(file)) return src;
  }

  return null;
}

const CARD_SPECS = [
  {
    id: "evolution",
    label: "ÉVOLUTION",
    subtitle: "Toutes tes statistiques Training",
    tab: "training_stats" as const,
  },
  {
    id: "training_x01",
    label: "TRAINING X01",
    subtitle: "Travaille ton scoring et tes fins",
    tab: "training_x01" as const,
  },
  {
    id: "tour_horloge",
    label: "TOUR DE L’HORLOGE",
    subtitle: "Simple / Double / Triple",
    tab: "training_clock" as const,
  },
  {
    id: "training_doubleio",
    label: "DOUBLE IN / DOUBLE OUT",
    subtitle: "DI / DO / DI+DO — précision & régularité",
    tab: "training_mode" as const,
  },
  {
    id: "training_challenges",
    label: "CHALLENGES",
    subtitle: "Défis courts : doubles, bull, triples, checkout",
    tab: "training_mode" as const,
  },
  {
    id: "training_ghost",
    label: "GHOST MODE",
    subtitle: "Affronte une moyenne fantôme",
    tab: "training_mode" as const,
  },
  {
    id: "training_precision_gauntlet",
    label: "PRECISION GAUNTLET",
    subtitle: "Parcours de cibles exactes sous pression",
    tab: "training_mode" as const,
  },
  {
    id: "training_repeat_master",
    label: "REPEAT MASTER",
    subtitle: "Construis une série parfaite sur une cible",
    tab: "training_mode" as const,
  },
  {
    id: "training_super_bull",
    label: "SUPER BULL (TRAINING)",
    subtitle: "BULL / DBULL — précision du centre",
    tab: "training_mode" as const,
  },
  {
    id: "training_time_attack",
    label: "TIME ATTACK",
    subtitle: "Marque un maximum avant la fin du chrono",
    tab: "training_mode" as const,
  },
];

export default function TrainingMenu({ go }: Props) {
  const { theme } = useTheme();
  const { lang, t } = useLang();
  const [infoId, setInfoId] = React.useState<string | null>(null);

  useLayoutEffect(() => {
    try {
      window.scrollTo(0, 0);
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    } catch {}
  }, []);

  const registry = React.useMemo(() => {
    const map = new Map<string, any>();
    for (const game of dartsGameRegistry || []) map.set(String(game.id), game);
    return map;
  }, []);

  const cards: ModeCard[] = React.useMemo(
    () =>
      CARD_SPECS.map((spec) => {
        const game = registry.get(spec.id);
        const infoTitle =
          spec.id === "evolution"
            ? t("training.menu.evolution.title", "Évolution Training")
            : String(game?.infoTitle || spec.label);
        const infoBody =
          spec.id === "evolution"
            ? t(
                "training.menu.evolution.info",
                "Ouvre les statistiques Training : sessions, précision, progression et résultats par mode."
              )
            : String(
                game?.infoBody ||
                  "Mode d'entraînement solo. Les résultats sont enregistrés exclusivement dans les statistiques Training."
              );

        return {
          ...spec,
          params:
            spec.tab === "training_mode"
              ? { modeId: spec.id }
              : undefined,
          infoTitle,
          infoBody,
          ticker: findTickerSmart(spec.id),
        };
      }),
    [registry, t]
  );

  const openMode = (card: ModeCard) => {
    if (!go) return;
    go(card.tab, card.params);
  };

  const selectedInfo = infoId ? cards.find((card) => card.id === infoId) || null : null;
  const headerTicker = lang === "fr" ? tickerTrainingFr : tickerTrainingEn;
  const accent = "#27dcff";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: theme.bg,
        color: theme.text,
        paddingBottom: 90,
      }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 80,
          height: 118,
          overflow: "hidden",
          background: "#020b14",
          borderBottom: "1px solid rgba(39,220,255,.28)",
        }}
      >
        <img
          src={headerTicker}
          alt="Training"
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
          }}
        />
        <div
          aria-hidden
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg,#020b14 0%,rgba(2,11,20,.05) 22%,rgba(2,11,20,.05) 78%,#020b14 100%)",
          }}
        />
        <div style={{ position: "absolute", left: 10, top: 10, zIndex: 3 }}>
          <BackDot
            onClick={() => go?.("games")}
            title={t("common.back", "Retour")}
            color={accent}
            glow="rgba(39,220,255,.55)"
          />
        </div>
      </div>

      <main style={{ width: "min(720px,100%)", margin: "0 auto", padding: "14px 12px 20px" }}>
        {cards.map((card) => (
          <div
            key={card.id}
            role="button"
            tabIndex={0}
            onClick={() => openMode(card)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                openMode(card);
              }
            }}
            style={{
              position: "relative",
              width: "100%",
              minHeight: 96,
              overflow: "hidden",
              marginBottom: 11,
              borderRadius: 22,
              border: "1px solid rgba(39,220,255,.42)",
              background: "linear-gradient(135deg,rgba(7,30,44,.96),rgba(2,12,20,.98))",
              cursor: "pointer",
              boxShadow: "0 12px 28px rgba(0,0,0,.32), inset 0 0 32px rgba(39,220,255,.035)",
            }}
          >
            {card.ticker ? (
              <img
                src={card.ticker}
                alt=""
                aria-hidden
                draggable={false}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                  opacity: 0.26,
                }}
              />
            ) : (
              <div
                aria-hidden
                style={{
                  position: "absolute",
                  right: 28,
                  top: "50%",
                  transform: "translateY(-50%)",
                  maxWidth: "56%",
                  fontWeight: 950,
                  fontSize: "clamp(30px,9vw,58px)",
                  lineHeight: 0.88,
                  textAlign: "right",
                  color: "rgba(39,220,255,.055)",
                  textTransform: "uppercase",
                  pointerEvents: "none",
                }}
              >
                {card.label}
              </div>
            )}

            <div
              aria-hidden
              style={{
                position: "absolute",
                inset: 0,
                background:
                  "linear-gradient(90deg,rgba(2,12,20,.98) 0%,rgba(2,12,20,.83) 47%,rgba(2,12,20,.22) 100%)",
              }}
            />

            <div
              style={{
                position: "relative",
                zIndex: 2,
                minHeight: 96,
                display: "grid",
                gridTemplateColumns: "minmax(0,1fr) 52px",
                alignItems: "center",
                gap: 8,
                padding: "13px 12px 13px 20px",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "clamp(15px,4vw,21px)",
                    fontWeight: 950,
                    letterSpacing: 1,
                    color: accent,
                    textTransform: "uppercase",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    textShadow: "0 0 13px rgba(39,220,255,.28)",
                  }}
                >
                  {card.label}
                </div>
                <div
                  style={{
                    marginTop: 6,
                    fontSize: 12.5,
                    fontWeight: 700,
                    color: "rgba(220,239,255,.72)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {card.subtitle}
                </div>
              </div>

              <div
                onClick={(e) => {
                  e.stopPropagation();
                  setInfoId(card.id);
                }}
                style={{ display: "grid", placeItems: "center", justifySelf: "end" }}
              >
                <InfoDot
                  onClick={() => setInfoId(card.id)}
                  color={accent}
                  glow="rgba(39,220,255,.45)"
                />
              </div>
            </div>
          </div>
        ))}
      </main>

      {selectedInfo ? (
        <div
          onClick={() => setInfoId(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 600,
            display: "grid",
            placeItems: "center",
            padding: 16,
            background: "rgba(0,0,0,.80)",
            backdropFilter: "blur(6px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(560px,100%)",
              borderRadius: 22,
              border: "1px solid rgba(39,220,255,.44)",
              background: "linear-gradient(160deg,rgba(7,28,42,.99),rgba(2,10,18,.99))",
              padding: 18,
              boxShadow: "0 25px 70px rgba(0,0,0,.75)",
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 19, color: accent }}>
              {selectedInfo.infoTitle}
            </div>
            <div style={{ marginTop: 10, fontSize: 13.5, lineHeight: 1.6, opacity: 0.86 }}>
              {selectedInfo.infoBody}
            </div>
            <button
              type="button"
              onClick={() => setInfoId(null)}
              style={{
                width: "100%",
                height: 44,
                marginTop: 16,
                borderRadius: 999,
                border: "1px solid rgba(39,220,255,.42)",
                background: "linear-gradient(180deg,#39e4ff,#09afd9)",
                color: "#001018",
                fontWeight: 950,
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
