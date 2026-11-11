import React from "react";
import { useLang } from "../contexts/LangContext";
import BackDot from "./BackDot";
import DartsModeFamilyBridge from "./DartsModeFamilyBridge";
import tickerArcade from "../assets/tickers/ticker_arcade.png";
import tickerPartieRapide from "../assets/tickers/ticker_partie_rapide.png";
import tickerQuickGame from "../assets/tickers/ticker_quick_game.png";
// Les pages d'entrée utilisent les mêmes fichiers tickers que les jeux.
// Vite résout ces URL à la compilation, sans charger les images avant affichage.
const modeTickerFiles = import.meta.glob("../assets/tickers/ticker_*.{png,webp,jpg,jpeg}", {
  eager: true,
  query: "?url",
  import: "default",
}) as Record<string, string>;

const tickerAliases: Record<string, string> = {
  "5 vies": "five_lives",
  "five lives": "five_lives",
  "halve-it": "halve_it",
  "halve it": "halve_it",
  "super bull": "super_bull",
  "superbull": "super_bull",
  "bss king": "bss_king",
  "president": "president",
  "killer progressif": "killer",
  "killer progressive": "killer",
  "ptit_hun": "ptit_1",
  "p_tit_1": "ptit_1",
  "p tit 1": "ptit_1",
  "departements": "territories_fr",
  "territoires": "territories_fr",
  "territories": "territories_fr",
  "cricket_cut_throat": "cricket_cut_throat",
  "cut_throat": "cricket_cut_throat",
  "enculette_vache": "enculette",
};

function resolveEntryTicker(title: string, lang = "fr"): string | null {
  const normalized = String(title || "").trim().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ").trim();
  const key = tickerAliases[normalized] || normalized.replace(/\s+/g, "_");
  const preferred = String(lang).toLowerCase() === "fr" ? "fr" : "en";
  const variants = [`${key}_${preferred}`, key, `${key}_en`, `${key}_fr`];
  const path = variants.map((variant) => Object.keys(modeTickerFiles).find((name) =>
    ["png", "webp", "jpg", "jpeg"].some((ext) => name.endsWith(`/ticker_${variant}.${ext}`))
  )).find(Boolean);
  return path ? modeTickerFiles[path] : null;
}

type Props = {
  title: string;
  tickerId?: string;
  subtitle?: string;
  onQuick: () => void;
  onArcade: () => void;
  onBack: () => void;
  family?: "five_lives" | "halve_it";
  onVariant?: () => void;
};

export default function GameModeEntryChoice({ title, tickerId, onQuick, onArcade, onBack, family, onVariant }: Props) {
  const { lang } = useLang();
  const isFr = String(lang || "fr").toLowerCase() === "fr";
  // Un mode récent peut avoir un libellé différent de son identifiant
  // (ex. 9 DART CENTURY). Le ticker doit provenir de l'ID de la carte.
  const modeTicker = (tickerId ? resolveEntryTicker(tickerId, lang) : null) || resolveEntryTicker(title, lang);

  const labels = isFr
    ? {
        back: "Retour",
        quickAlt: "Partie rapide",
        arcadeAlt: "Arcade",
      }
    : {
        back: "Back",
        quickAlt: "Quick Game",
        arcadeAlt: "Arcade",
      };

  const tickerButton = (src: string, alt: string, onClick: () => void) => (
    <button
      type="button"
      onClick={onClick}
      aria-label={alt}
      style={{
        width: "100%",
        padding: 0,
        margin: 0,
        border: "none",
        background: "transparent",
        cursor: "pointer",
        display: "block",
        lineHeight: 0,
        borderRadius: 18,
        overflow: "visible",
        filter: "drop-shadow(0 10px 22px rgba(0,0,0,.34))",
      }}
    >
      <img
        src={src}
        alt={alt}
        style={{
          display: "block",
          width: "100%",
          height: "auto",
          objectFit: "contain",
          borderRadius: 18,
        }}
      />
    </button>
  );

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        boxSizing: "border-box",
        color: "#fff",
        padding: "12px 14px 28px",
        display: "grid",
        alignContent: "start",
        gap: 8,
        overflowX: "hidden",
      }}
    >
      {modeTicker ? (
        <div style={{ position: "relative", width: "100%", maxWidth: 900, margin: "0 auto" }}>
          <img src={modeTicker} alt={title} style={{ width: "100%", height: "auto", display: "block", borderRadius: 16 }} />
          <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
            <BackDot onClick={onBack} title={labels.back} size={36} />
          </div>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "42px minmax(0,1fr) 42px", alignItems: "center", gap: 8 }}>
          <BackDot onClick={onBack} title={labels.back} size={36} />
          <div style={{ minWidth: 0, textAlign: "center" }}>
            <div
              style={{
                fontSize: 25,
                fontWeight: 950,
                letterSpacing: 0.7,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {title}
            </div>
          </div>
          <div />
        </div>
      )}

      <div
        style={{
          width: "100%",
          maxWidth: 800,
          minWidth: 0,
          margin: "4px auto 0",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr)",
          gap: 8,
        }}
      >
        {tickerButton(isFr ? tickerPartieRapide : tickerQuickGame, labels.quickAlt, onQuick)}
        {tickerButton(tickerArcade, labels.arcadeAlt, onArcade)}
        {family && onVariant ? <DartsModeFamilyBridge family={family} current="main" onOpenRelated={onVariant} /> : null}
      </div>
    </div>
  );
}
