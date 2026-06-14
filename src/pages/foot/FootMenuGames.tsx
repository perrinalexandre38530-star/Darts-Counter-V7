import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { FOOT_FORMATS } from "./footFormats";
import footCover01 from "../../assets/covers/football/football_cover_01.webp";
import footHeaderTicker from "../../assets/tickers/ticker_foot_header_cartoon.webp";

const TICKERS = import.meta.glob("../../assets/tickers/*.{png,webp,jpg,jpeg}", {
  eager: true,
  import: "default",
}) as Record<string, string>;

function findTickerById(id: string): string | null {
  const raw = String(id || "");
  if (!raw) return null;

  const norm = raw.trim().toLowerCase();
  const candidates = Array.from(
    new Set([
      norm,
      `foot_${norm}`,
      `football_${norm}`,
      norm.replace(/\s+/g, "_"),
      norm.replace(/\s+/g, "-"),
      norm.replace(/-/g, "_"),
      norm.replace(/_/g, "-"),
      norm.replace(/[^a-z0-9_\-]/g, ""),
    ])
  ).filter(Boolean);

  for (const c of candidates) {
    const suffixes = [`/ticker_${c}.png`, `/ticker-${c}.png`, `/ticker_${c}.webp`, `/ticker-${c}.webp`];
    for (const k of Object.keys(TICKERS)) {
      if (suffixes.some((s) => k.endsWith(s))) return TICKERS[k];
    }
  }

  return null;
}

type Props = { go: (route: any, params?: any) => void; params?: any; store?: any };

const FORMAT_INFO: Record<string, string> = {
  penalty: `OBJECTIF
• Duel tireur contre gardien.

RÈGLES
• 5 tirs par camp.
• Victoire au plus grand nombre de buts.
• Mort subite si égalité.
• Arrêt ou tir hors cadre = raté.

STATISTIQUES
• Tirs, buts, arrêts, réussite.`,
  "1v1": `OBJECTIF
• Match classique à un joueur contre un joueur.

RÈGLES
• Gestion des buts, cartons et score.
• Prolongation et tirs au but possibles.

STATISTIQUES
• Buteurs, passeurs, cartons, homme du match.`,
  "2v2": `OBJECTIF
• Match par équipes de 2 joueurs.

RÈGLES
• 2 joueurs par équipe.
• Score équipe.
• Cartons attribuables aux joueurs.

STATISTIQUES
• Buteurs, passeurs, cartons.`,
  "3v3": `OBJECTIF
• Football réduit rapide.

RÈGLES
• 3 joueurs par équipe.
• Match dynamique.
• Gestion des événements de match.

STATISTIQUES
• Buteurs, passeurs, cartons.`,
  "5v5": `OBJECTIF
• Football Five / Futsal.

RÈGLES
• 5 joueurs par équipe.
• Terrain réduit.
• Remplacements libres.

STATISTIQUES
• Buteurs, passeurs, CSC, cartons.`,
  "7v7": `OBJECTIF
• Football à effectif réduit.

RÈGLES
• 7 joueurs par équipe.
• Gestion des remplacements.

STATISTIQUES
• Buteurs, passeurs, cartons, clean sheet.`,
  "8v8": `OBJECTIF
• Format intermédiaire.

RÈGLES
• 8 joueurs par équipe.
• Match plus tactique.

STATISTIQUES
• Gestion complète des événements.`,
  "11v11": `OBJECTIF
• Football officiel.

RÈGLES
• 11 joueurs par équipe.
• Temps réglementaire configurable.
• Prolongations et TAB facultatifs.

STATISTIQUES
• Buteurs, passeurs, cartons, clean sheet, homme du match.`,
};

export default function FootMenuGames({ go }: Props) {
  const { theme } = useTheme();
  const [info, setInfo] = React.useState<{ title: string; body: string } | null>(null);

  const pageBg = theme?.bg || "#020604";
  const cardBg = theme?.card || "rgba(255,255,255,.055)";
  const border = theme?.borderSoft || "rgba(255,255,255,.14)";
  const primary = theme?.primary || "#24e8ff";
  const text = theme?.text || "#fff";
  const textSoft = theme?.textSoft || "rgba(255,255,255,.72)";

  function renderTickerWatermark(formatId: string) {
    const src = findTickerById(formatId) || footCover01;
    if (!src) return null;

    // Même logique visuelle que les cartes Jeux Darts Counter :
    // ticker discret, posé à droite, en cover, avec masque horizontal.
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
          opacity: 0.22,
          zIndex: 0,
          WebkitMaskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 16%, rgba(0,0,0,1) 84%, rgba(0,0,0,0) 100%)",
        }}
      >
        <img
          src={src as any}
          alt=""
          draggable={false}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: "center",
            transform: "translateZ(0)",
            filter: "contrast(1.05) saturate(1.05) drop-shadow(0 0 10px rgba(0,0,0,0.25))",
          }}
        />
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
        paddingBottom: 96,
        color: text,
        background: pageBg,
      }}
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <div
          aria-label="FOOT"
          style={{
            position: "relative",
            height: 108,
            marginBottom: 14,
            borderRadius: 20,
            border: `1px solid ${border}`,
            overflow: "hidden",
            background: "rgba(2,12,22,.62)",
            boxShadow: `0 14px 34px rgba(0,0,0,.62), 0 0 22px ${primary}22, inset 0 0 24px ${primary}24`,
          }}
        >
          <img
            src={footHeaderTicker as any}
            alt="FOOT"
            draggable={false}
            style={{
              position: "absolute",
              inset: 0,
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center",
              filter: "saturate(1.08) contrast(1.08)",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "linear-gradient(90deg, rgba(2,8,18,.18) 0%, rgba(2,8,18,.00) 26%, rgba(2,8,18,.00) 74%, rgba(2,8,18,.18) 100%), linear-gradient(180deg, rgba(2,8,18,.12) 0%, rgba(2,8,18,.00) 48%, rgba(2,8,18,.34) 100%)",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              inset: 0,
              boxShadow: `inset 0 0 20px rgba(0,0,0,.45), inset 0 0 20px ${primary}22`,
              pointerEvents: "none",
            }}
          />
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", zIndex: 2 }}>
            <BackDot onClick={() => go("home")} />
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {FOOT_FORMATS.map((f, index) => {
            const isDuel = f.kind === "duel";
            const subtitle = isDuel ? "DUEL" : "ÉQUIPES";
            return (
              <button
                key={f.id}
                onClick={() => go("foot_config", { format: f.id })}
                style={{
                  position: "relative",
                  width: "100%",
                  minHeight: 76,
                  padding: 14,
                  paddingRight: 48,
                  textAlign: "left",
                  borderRadius: 16,
                  border: `1px solid ${border}`,
                  background: cardBg,
                  color: text,
                  cursor: "pointer",
                  boxShadow: "0 10px 24px rgba(0,0,0,.55)",
                  overflow: "hidden",
                }}
              >
                {renderTickerWatermark(f.id)}

                <div style={{ position: "relative", zIndex: 1 }}>
                  <div
                    style={{
                      fontSize: 15,
                      fontWeight: 1000,
                      letterSpacing: 0.9,
                      color: primary,
                      textTransform: "uppercase",
                      textShadow: `0 0 12px ${primary}55`,
                    }}
                  >
                    {f.label}
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
                      setInfo({ title: f.label, body: FORMAT_INFO[f.id] || f.maxPlayersHint });
                    }}
                    glow={primary + "88"}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {info && (
        <div
          onClick={() => setInfo(null)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.64)",
            display: "grid",
            placeItems: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(ev) => ev.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              borderRadius: 22,
              border: `1px solid ${border}`,
              background: cardBg,
              color: text,
              padding: 18,
              boxShadow: `0 18px 50px rgba(0,0,0,.65), 0 0 22px ${primary}44`,
            }}
          >
            <div style={{ color: primary, fontWeight: 1000, fontSize: 18, marginBottom: 10 }}>{info.title}</div>
            <div style={{ whiteSpace: "pre-line", color: textSoft, fontWeight: 750, lineHeight: 1.35 }}>{info.body}</div>
            <button
              onClick={() => setInfo(null)}
              style={{
                marginTop: 16,
                width: "100%",
                border: `1px solid ${border}`,
                background: "rgba(255,255,255,.08)",
                color: text,
                borderRadius: 14,
                padding: 12,
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              FERMER
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
