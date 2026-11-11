import React from "react";
import BackDot from "./BackDot";
import { useLang } from "../contexts/LangContext";

// Same asset convention as GameModeEntryChoice; eager Vite URLs work in WebView/Android.
const tickerAssets = import.meta.glob("../assets/tickers/ticker_*.{png,webp,jpg,jpeg}", { eager: true, query: "?url", import: "default" }) as Record<string, string>;
const aliases: Record<string, string> = {
  "5_vies": "five_lives", "five_lives": "five_lives", "halve_it": "halve_it",
  "superbull": "super_bull", "killer_progressif": "killer", "president": "president",
  "9_dart_century": "9_dart_century", "bss_king": "bss_king",
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
export function DartsQuickIntro({ title }: { title: string }) {
  return <section style={{background:"rgba(10,12,24,.94)",border:"1px solid rgba(85,230,255,.20)",borderRadius:18,padding:12,boxShadow:"0 16px 40px rgba(0,0,0,.38)",display:"grid",gap:9}}>
    <div style={{fontSize:12,color:"#55e6ff",fontWeight:950,letterSpacing:1}}>CONFIGURATION {title.toUpperCase()}</div>
    <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><span style={{border:"1px solid #55e6ff77",borderRadius:14,background:"#55e6ff22",color:"#a8f5ff",fontWeight:950,padding:"9px 15px",fontSize:12}}>PARTIE RAPIDE</span></div>
    <p style={{fontSize:11,color:"#9298bb",lineHeight:1.4,margin:0}}>Noms libres · sans profil enregistré · réglages essentiels du jeu</p>
  </section>;
}
