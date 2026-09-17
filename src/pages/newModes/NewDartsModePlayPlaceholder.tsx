// @ts-nocheck
import React from "react";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import PageHeader from "../../components/PageHeader";
import { useTheme } from "../../contexts/ThemeContext";

export default function NewDartsModePlayPlaceholder({ title, ticker, accent, configTab, go, params }: any) {
  const { theme } = useTheme();
  const cfg = params?.config || {};
  const color = accent || theme?.primary || "#ffb13b";
  const players = Array.isArray(cfg?.selectedIds) ? cfg.selectedIds.length : Number(cfg?.players || 0);
  return <div style={{ minHeight: "100dvh", paddingBottom: 90 }}>
    <PageHeader tickerSrc={ticker} tickerAlt={title} left={<BackDot onClick={() => go?.(configTab)} color={color} glow={`${color}88`} title="Retour à la configuration" />} right={<InfoDot title={`${title} — moteur de jeu`} color={color} glow={`${color}77`} content={<div style={{ lineHeight: 1.5 }}>Le menu de configuration, les règles, les participants et la navigation sont intégrés. Le gameplay complet sera branché sur cette route dédiée.</div>} />} />
    <div style={{ padding: 12, maxWidth: 760, margin: "0 auto" }}>
      <section style={{ borderRadius: 20, padding: 18, background: "rgba(10,12,24,.96)", border: `1px solid ${color}55`, boxShadow: `0 18px 44px rgba(0,0,0,.55), 0 0 24px ${color}18` }}>
        <div style={{ color, fontSize: 12, fontWeight: 950, letterSpacing: 1.2, textTransform: "uppercase" }}>Écran de jeu préparé</div>
        <h2 style={{ margin: "8px 0 6px", fontSize: 25, color: "#fff" }}>{title}</h2>
        <p style={{ margin: 0, color: "#b7bbcf", lineHeight: 1.55, fontSize: 13 }}>La configuration arrive correctement jusqu'ici{players ? ` avec ${players} participant${players > 1 ? "s" : ""}` : ""}. Cette route sert maintenant de point d'entrée stable pour construire le moteur, l'UI de partie, l'historique et les statistiques sans devoir refaire les menus.</p>
        <div style={{ display: "grid", gap: 9, marginTop: 16 }}>
          <button onClick={() => go?.(configTab)} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${color}`, background: `${color}18`, color, fontWeight: 950 }}>← MODIFIER LA CONFIGURATION</button>
          <button onClick={() => go?.("games", { gamesView: "all" })} style={{ minHeight: 42, borderRadius: 999, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.05)", color: "#fff", fontWeight: 900 }}>RETOUR AUX MODES</button>
        </div>
      </section>
    </div>
  </div>;
}
