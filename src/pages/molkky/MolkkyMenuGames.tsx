// =============================================================
// src/pages/molkky/MolkkyMenuGames.tsx
// Games — MÖLKKY (aligné DIMENSIONS BabyFootGamesHub)
// - Header ticker FULL WIDTH (h=90) sous BackDot/InfoDot
// - Cartes tickers (h=86) + InfoDot (modal centré)
// - Pas de texte sur les cartes
// =============================================================

import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useSport } from "../../contexts/SportContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

const TICKERS = import.meta.glob("../../assets/tickers/*.png", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function getTicker(id: string) {
  const norm = String(id || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");
  const key = Object.keys(TICKERS).find((k) =>
    k.toLowerCase().includes(`/ticker_${norm}.png`)
  );
  return key ? TICKERS[key] : null;
}

type CardInfo = {
  id: "classic" | "fast" | "custom" | "header";
  title: string;
  desc: string;
  tickerId: string;
  preset?: "classic" | "fast" | "custom";
};

type Props = {
  go: (tab: any, params?: any) => void;
};

export default function MolkkyMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const sportApi: any = useSport() as any;
  const setSport = sportApi?.setSport as undefined | ((s: any) => void);
  const [info, setInfo] = React.useState<CardInfo | null>(null);

  const CARDS: CardInfo[] = [
    {
      id: "classic",
      title: "Classique",
      desc:
        "Mode officiel : 50 EXACT.\n\n• 1 quille = numéro\n• plusieurs quilles = nombre\n• dépassement → retour à 25 (si activé)\n• 3 MISS consécutifs → élimination (si activé)",
      tickerId: "molkky_classic",
      preset: "classic",
    },
    {
      id: "fast",
      title: "Rapide",
      desc:
        "Mode rapide : mêmes règles, rythme plus nerveux.\n\nRecommandé pour parties courtes (cible personnalisable dans Config).",
      tickerId: "molkky_rapide",
      preset: "fast",
    },
    {
      id: "custom",
      title: "Personnalisé",
      desc:
        "Mode custom : choisis la cible, l'option dépassement→25, et l'élimination 3 MISS.",
      tickerId: "molkky_custom",
      preset: "custom",
    },
  ];

  const headerTicker = getTicker("molkky_games");

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 16,
        paddingBottom: 90,
        background: theme.bg,
        color: theme.text,
      }}
    >
      {/* HEADER: ticker derrière les icônes (comme BabyFootGamesHub) */}
      <div style={{ position: "relative", width: "100%", marginBottom: 12 }}>
        <img
          src={headerTicker || getTicker("games") || getTicker("petanque_games") || ""}
          alt="Mölkky — Games"
          style={{
            width: "100%",
            height: 90,
            objectFit: "cover",
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
            boxShadow: "0 10px 26px rgba(0,0,0,0.35)",
            display: "block",
          }}
          draggable={false}
        />

        {/* BackDot LEFT */}
        <div
          style={{
            position: "absolute",
            left: 10,
            top: "50%",
            transform: "translateY(-50%)",
            zIndex: 2,
          }}
        >
          <BackDot onClick={() => { try { setSport?.("molkky"); } catch {} go("home"); }} />
        </div>

        {/* InfoDot RIGHT */}
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
            onClick={(ev: any) => {
              try {
                ev?.stopPropagation?.();
                ev?.preventDefault?.();
              } catch {}
              setInfo({
                id: "header",
                title: "MÖLKKY",
                desc:
                  "Règles rapides :\n\n• 1 quille = numéro\n• plusieurs quilles = nombre\n• objectif : 50 EXACT\n• dépassement → retour à 25 (option)\n• 3 MISS consécutifs → élimination (option)",
                tickerId: "molkky_games",
              });
            }}
            glow={theme.primary + "88"}
          />
        </div>
      </div>

      {/* CARDS: mêmes proportions (h=86) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {CARDS.map((c) => {
          const src = getTicker(c.tickerId) || headerTicker || "";
          return (
            <button
              key={c.id}
              onClick={() => go("molkky_config", { preset: c.preset })}
              style={{
                position: "relative",
                width: "100%",
                padding: 0,
                textAlign: "left",
                borderRadius: 16,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: theme.card,
                cursor: "pointer",
                boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
                overflow: "hidden",
              }}
            >
              <img
                src={src}
                alt={c.title}
                style={{
                  width: "100%",
                  height: 86,
                  display: "block",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
                draggable={false}
              />

              <div
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  zIndex: 3,
                }}
              >
                <InfoDot
                  onClick={(ev: any) => {
                    try {
                      ev?.stopPropagation?.();
                      ev?.preventDefault?.();
                    } catch {}
                    setInfo(c);
                  }}
                  glow={theme.primary + "88"}
                />
              </div>
            </button>
          );
        })}
      </div>

      {/* MODAL centered (copié BabyFootGamesHub) */}
      {info && (
        <div
          onClick={() => setInfo(null)}
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
              maxWidth: 520,
              borderRadius: 18,
              padding: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              boxShadow: "0 20px 50px rgba(0,0,0,0.65)",
              color: theme.text,
            }}
          >
            <div style={{ fontWeight: 950, fontSize: 18, marginBottom: 8 }}>
              {info.title}
            </div>
            <div
              style={{
                whiteSpace: "pre-wrap",
                lineHeight: 1.35,
                color: theme.textSoft ?? "rgba(255,255,255,0.85)",
                fontWeight: 650,
              }}
            >
              {info.desc}
            </div>

            <div style={{ height: 12 }} />
            <button
              onClick={() => setInfo(null)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 12,
                border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(255,255,255,0.06)",
                color: theme.text,
                fontWeight: 900,
                cursor: "pointer",
              }}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
