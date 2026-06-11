import React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import { FOOT_FORMATS } from "./footFormats";
import footCover01 from "../../assets/covers/football/football_cover_01.webp";

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
  penalty: "Duel tireur/gardien. Séance rapide avec score des tirs réussis et ratés.",
  "1v1": "Duel joueur contre joueur. Score simple et événements essentiels.",
  "2v2": "Match par équipes de 2 joueurs. Sélection équipe domicile / extérieur.",
  "3v3": "Match par équipes de 3 joueurs. Format réduit rapide.",
  "5v5": "Match par équipes de 5 joueurs. Format futsal / petit terrain.",
  "7v7": "Match par équipes de 7 joueurs. Format jeunes / terrain réduit.",
  "8v8": "Match par équipes de 8 joueurs. Format intermédiaire.",
  "11v11": "Match complet par équipes de 11 joueurs. Format terrain complet.",
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

  function renderTickerWatermark(formatId: string, index: number) {
    const src = findTickerById(formatId) || footCover01;
    return (
      <div
        aria-hidden
        style={{
          position: "absolute",
          right: 0,
          top: 0,
          height: "100%",
          width: "78%",
          pointerEvents: "none",
          opacity: 0.24,
          zIndex: 0,
          WebkitMaskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 17%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(90deg, rgba(0,0,0,0) 0%, rgba(0,0,0,1) 17%, rgba(0,0,0,1) 86%, rgba(0,0,0,0) 100%)",
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
            objectPosition: `${50 + ((index % 3) - 1) * 8}% center`,
            filter: "contrast(1.08) saturate(1.08) drop-shadow(0 0 12px rgba(0,0,0,.35))",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(90deg, rgba(0,0,0,.55) 0%, rgba(0,0,0,.10) 40%, rgba(0,0,0,.10) 65%, rgba(0,0,0,.55) 100%)",
            opacity: 0.72,
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
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 38,
            marginBottom: 6,
          }}
        >
          <div style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot onClick={() => go("home")} />
          </div>
          <h1
            style={{
              margin: 0,
              fontSize: 24,
              letterSpacing: 1.2,
              color: primary,
              textAlign: "center",
              textShadow: `0 0 12px ${primary}66`,
            }}
          >
            FOOT — JEUX
          </h1>
        </div>

        <div
          style={{
            fontSize: 13,
            color: textSoft,
            marginBottom: 18,
            textAlign: "center",
            fontWeight: 800,
          }}
        >
          Choisis un format de match FOOT
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
                {renderTickerWatermark(f.id, index)}

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
                  <div style={{ marginTop: 5, fontSize: 12, color: textSoft, fontWeight: 800 }}>
                    {f.maxPlayersHint} · {subtitle}
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
