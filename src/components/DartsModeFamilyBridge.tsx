import React from "react";
import { useLang } from "../contexts/LangContext";
import tickerChaseFr from "../assets/tickers/ticker_chase_fr.webp";
import tickerChaseEn from "../assets/tickers/ticker_chase_en.webp";
import tickerSplitFr from "../assets/tickers/ticker_split_score_fr.webp";
import tickerSplitEn from "../assets/tickers/ticker_split_score_en.webp";
import tickerFiveLives from "../assets/tickers/ticker_five_lives.png";
import tickerHalveIt from "../assets/tickers/ticker_halve_it.png";

type Props = {
  family: "five_lives" | "halve_it";
  current: "main" | "variant";
  onOpenRelated: () => void;
  onBrowseVariants?: () => void;
  accent?: string;
};

/** Direct bridge between a main game and its playable variant.
 * Used on the entry screen and on both configuration screens.
 * No game state is copied: navigation opens the correct preset from scratch.
 */
export default function DartsModeFamilyBridge({ family, current, onOpenRelated, onBrowseVariants, accent = "#c7a7ff" }: Props) {
  const { lang } = useLang();
  const fr = String(lang || "fr").toLowerCase() === "fr";
  const mainName = family === "five_lives" ? (fr ? "LES 5 VIES" : "FIVE LIVES") : "HALVE-IT";
  const variantName = family === "five_lives" ? "CHASE" : "SPLIT SCORE";
  const variantImage = family === "five_lives" ? (fr ? tickerChaseFr : tickerChaseEn) : (fr ? tickerSplitFr : tickerSplitEn);
  const mainImage = family === "five_lives" ? tickerFiveLives : tickerHalveIt;
  const targetName = current === "main" ? variantName : mainName;
  const subtitle = family === "five_lives"
    ? (current === "main"
      ? (fr ? "5 vies · égalité acceptée · ordre remélangé" : "5 lives · equal scores accepted · shuffled order")
      : (fr ? "Version classique et relais, ordre conservé" : "Classic and relay rules, fixed turn order"))
    : (current === "main"
      ? (fr ? "Départ 40 · parcours officiel de 9 manches" : "Start at 40 · official 9-round sequence")
      : (fr ? "Parcours et capital configurables" : "Customizable target routes and starting score"));
  const heading = current === "main" ? (fr ? "VARIANTE ASSOCIÉE" : "RELATED VARIANT") : (fr ? "JEU PRINCIPAL" : "MAIN GAME");
  return (
    <section aria-label={heading} style={{ boxSizing: "border-box", width: "100%", maxWidth: 800, margin: "6px auto 12px", padding: 9, border: `1px solid ${accent}66`, borderRadius: 16, background: `linear-gradient(130deg,${accent}1b,rgba(7,10,18,.95) 70%)`, boxShadow: "0 8px 22px rgba(0,0,0,.24)" }}>
      <div style={{ fontSize: 10, fontWeight: 950, color: accent, letterSpacing: 1.2, marginBottom: 7 }}>{heading}</div>
      <button type="button" onClick={onOpenRelated} aria-label={`${fr ? "Ouvrir" : "Open"} ${targetName}`} style={{ width: "100%", minHeight: 64, cursor: "pointer", display: "grid", gridTemplateColumns: "minmax(86px,118px) minmax(0,1fr) auto", alignItems: "center", gap: 9, textAlign: "left", color: "#fff", background: "rgba(255,255,255,.035)", borderRadius: 11, border: "1px solid rgba(255,255,255,.10)", padding: 6 }}>
        <img src={current === "main" ? variantImage : mainImage} alt="" aria-hidden="true" style={{ width: "100%", height: 52, objectFit: "cover", borderRadius: 8 }} />
        <span style={{ display: "grid", gap: 3, minWidth: 0 }}>
          <strong style={{ fontSize: 13, fontWeight: 1000, letterSpacing: .5 }}>{targetName}</strong>
          <small style={{ fontSize: 10, lineHeight: 1.3, color: "#c7cbd7" }}>{subtitle}</small>
        </span>
        <span aria-hidden="true" style={{ color: accent, fontSize: 20, fontWeight: 950, paddingRight: 4 }}>›</span>
      </button>
      {onBrowseVariants ? <button type="button" onClick={onBrowseVariants} style={{ marginTop: 8, padding: "5px 8px", border: "none", background: "none", color: accent, fontWeight: 850, fontSize: 10.5, cursor: "pointer" }}>{fr ? "Voir toutes les variantes dans Games" : "Browse all variants in Games"} ›</button> : null}
    </section>
  );
}
