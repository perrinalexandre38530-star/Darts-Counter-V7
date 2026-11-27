import React from "react";
import { getTicker } from "../lib/tickers";

/**
 * MSS: identifiable in-app fallback for the Cricket family while individual
 * 800x230 artwork is awaiting artistic approval. Never substitutes a ticker
 * image file and never shows unrelated artwork or the generic 🎯 placeholder.
 */
const VARIANT_PREVIEWS: Record<string, { title: string; footer: string; color: string }> = {
  cricket_tactics: { title: "TACTICS", footer: "15–20 · D · T · BULL", color: "#d8a94a" },
  cricket_low_ball: { title: "LOW-BALL", footer: "1 · 2 · 3 · 4 · 5 · 6 · BULL", color: "#f2bc53" },
  cricket_spanish: { title: "SPANISH", footer: "11–20 · BULL", color: "#fb7754" },
  cricket_random: { title: "RANDOM", footer: "6 CIBLES ALÉATOIRES", color: "#79cffc" },
  cricket_pick_it: { title: "PICK-IT", footer: "CHOISIS TES 6 CIBLES", color: "#efb4ff" },
  cricket_hidden: { title: "HIDDEN", footer: "CIBLES SECRÈTES", color: "#8da1ec" },
  cricket_quickie: { title: "QUICKIE", footer: "10 MANCHES", color: "#ffbc65" },
  cricket_mickey_mouse: { title: "MICKEY MOUSE", footer: "DOUBLE · TRIPLE · BED", color: "#b3db68" },
  cricket_wild_mouse: { title: "WILD MOUSE", footer: "UNE FLÉCHETTE · UN CHOIX", color: "#73cfc0" },
  cricket_wild_card: { title: "WILD CARD", footer: "JOKER À CHAQUE MANCHE", color: "#f4a5dd" },
  cricket_sudden_death: { title: "SUDDEN DEATH", footer: "ÉLIMINATION", color: "#f18e7c" },
  cricket_english: { title: "ENGLISH", footer: "BATTEUR · LANCEUR", color: "#9ad1fb" },
};

export function hasCricketVariantPreview(id: string): boolean {
  return Object.prototype.hasOwnProperty.call(VARIANT_PREVIEWS, id);
}

export default function MssCricketVariantPreview({ gameId, height = 50 }: { gameId: string; height?: number }) {
  const v = VARIANT_PREVIEWS[gameId];
  if (!v) return null;
  const base = getTicker("cricket");
  return <div data-mss-cricket-preview={gameId} aria-hidden="true" style={{
    position: "relative", overflow: "hidden", width: "100%", height,
    borderRadius: 6, border: `1px solid ${v.color}5c`, boxSizing: "border-box",
    background: "linear-gradient(125deg,#15101a,#401b15 60%,#140c16)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: 2, isolation: "isolate", textAlign: "center", padding: "2px 8px",
  }}>
    {base && <img src={base} alt="" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .3, zIndex: -2 }} />}
    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(7,8,15,.8),rgba(11,10,14,.3) 50%,rgba(7,8,15,.8))", zIndex: -1 }}/>
    <strong style={{ color: v.color, fontSize: height < 60 ? 13 : 22, fontWeight: 1000, lineHeight: 1.05, letterSpacing: .65, textShadow: "0 2px 3px #000,0 0 12px #000", maxWidth: "100%" }}>{v.title}</strong>
    <span style={{ color: "#fff0cf", fontWeight: 800, fontSize: height < 60 ? 7 : 10, lineHeight: 1.15, letterSpacing: .45, textShadow: "0 1px 3px #000", maxWidth: "100%" }}>{v.footer}</span>
  </div>;
}
