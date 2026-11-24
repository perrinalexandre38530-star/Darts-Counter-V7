import React from "react";
import BackDot from "./BackDot";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";

// Same asset convention as GameModeEntryChoice; eager Vite URLs work in WebView/Android.
const tickerAssets = import.meta.glob("../assets/tickers/ticker_*.{png,webp,jpg,jpeg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const aliases: Record<string, string> = {
  "5_vies": "five_lives", "five_lives": "five_lives", "halve_it": "halve_it",
  "superbull": "super_bull", "killer_progressif": "killer", "president": "president",
  "9_dart_century": "9_dart_century", "bss_king": "bss_king",
  "game_170": "v170", "170": "v170", "ptit_hun": "ptit_1", "p_tit_1": "ptit_1",
  "departements": "territories_fr", "territories": "territories_fr",
};
export function dartsQuickTicker(id: string, lang = "fr"): string | null {
  const key = String(id || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  const normalized = aliases[key] || key;
  const locale = lang === "fr" ? "fr" : "en";
  const candidates = [`${normalized}_${locale}`, normalized, `${normalized}_en`, `${normalized}_fr`];
  for (const candidate of candidates) {
    const path = Object.keys(tickerAssets).find(p => /\.(png|webp|jpg|jpeg)$/.test(p) && p.split("/").pop()?.replace(/\.(png|webp|jpg|jpeg)$/, "") === `ticker_${candidate}`);
    if (path) return tickerAssets[path];
  }
  return null;
}
export default function DartsQuickHeader({ modeId, title, onBack }: { modeId: string; title?: string; onBack: () => void }) {
  const { lang } = useLang();
  const ticker = dartsQuickTicker(modeId, String(lang || "fr"));
  return <header className="msc-mode-config-header" style={{margin:"0 -12px 12px",position:"relative"}}>
    <div className="msc-config-ticker-frame" style={{position:"relative",width:"100%",minHeight: ticker ? undefined : 84,background:"#0b0d19"}}>
      {ticker ? <img className="msc-config-ticker-image" src={ticker} alt={title || modeId} draggable={false} style={{width:"100%",height:"auto",display:"block",pointerEvents:"none",userSelect:"none"}} />
        : <div style={{minHeight:84,display:"grid",placeItems:"center",padding:"10px 64px",fontWeight:950,fontSize:21,textAlign:"center"}}>{title || modeId.toUpperCase()}</div>}
      <div style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)"}}><BackDot onClick={onBack} title="Retour" size={36} /></div>
    </div>
  </header>;
}
/** Compact quick-play heading: the ticker already carries the game identity. */
export function DartsQuickIntro({ title }: { title: string }) {
  const { theme } = useTheme();
  const accent = theme?.primary || "#f6c256";
  return <section aria-label={`Configuration ${title} · Partie rapide`} style={{
    background: "rgba(10,12,24,.94)", border: `1px solid ${accent}4d`,
    borderRadius: 18, padding: "12px 14px", display: "flex",
    justifyContent: "space-between", alignItems: "center", gap: 10,
    flexWrap: "wrap", boxShadow: "0 12px 30px rgba(0,0,0,.29)"
  }}>
    <strong style={{ fontSize: 13, color: accent, fontWeight: 950, letterSpacing: .65 }}>
      CONFIGURATION {title.toUpperCase()}
    </strong>
    <span style={{ border: `1px solid ${accent}88`, borderRadius: 12,
      background: `${accent}18`, color: accent, padding: "7px 10px",
      fontSize: 11, fontWeight: 950, whiteSpace: "nowrap" }}>PARTIE RAPIDE</span>
  </section>;
}
