import React from "react";
import type { DrinkCardBackground, DrinkCardIcon } from "../organizations/organizationDrinkCards";
import { stampRowLengths } from "../organizations/buvetteLayout";

/** Ligne vectorielle façon bottom-nav : même trait, même forme lisible à toutes les tailles. */
export function BuvetteGlyph({ icon = "cup", size = 25, color = "currentColor", filled = false }: {
  icon?: DrinkCardIcon; size?: number; color?: string; filled?: boolean;
}) {
  const p = { fill: "none", stroke: color, strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const shapes: Record<DrinkCardIcon, React.ReactNode> = {
    cup: <><path {...p} d="M5 5h14l-1.7 11.5a5.4 5.4 0 0 1-10.6 0L5 5Z"/><path {...p} d="M6.2 9h11.6M10 2h4"/></>,
    coffee: <><path {...p} d="M4 7h13v8a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V7ZM17 9h2a2 2 0 0 1 0 4h-2M3 22h16"/><path {...p} d="M8 2v3M13 2v3"/></>,
    beer: <><path {...p} d="M6 5h11v16H7L6 5ZM17 8h2.2a2.3 2.3 0 0 1 0 4.6H17M6 11h11"/><path {...p} d="M7 5c-2.7-3.5 1.6-4.5 3.3-2.3 1.5-2 4.7-2 5.7.3"/></>,
    soda: <><path {...p} d="M5 6h14l-2 15H7L5 6ZM7 11h10M12 11v6M4 3h16"/><path {...p} d="m13 6 3-4"/></>,
    water: <><path {...p} d="M8 3h8l1 4-1 3 2 10H6l2-10-1-3 1-4ZM8 10h8M9 3h6M7 15h10"/></>,
    wine: <><path {...p} d="M5 3h14l-1.3 8a5.8 5.8 0 0 1-11.4 0L5 3ZM12 17v5M7 22h10M6.5 9h11"/></>,
    cocktail: <><path {...p} d="M3 5h18l-9 10L3 5ZM12 15v7M7 22h10M8 8h8M14 6l4-4"/><circle {...p} cx="18.5" cy="3.5" r="1.5"/></>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
    {filled ? <circle cx="12" cy="12" r="11.1" fill={`${color}1d`}/> : null}{shapes[icon]}
  </svg>;
}

export const BUVETTE_BACKGROUNDS: Array<{ key: DrinkCardBackground; fr: string; en: string; es: string }> = [
  { key: "bar-night", fr: "Ambiance bar", en: "Bar atmosphere", es: "Ambiente de bar" },
  { key: "graphite", fr: "Graphite", en: "Graphite", es: "Grafito" },
  { key: "wood", fr: "Bois club-house", en: "Clubhouse wood", es: "Madera" },
  { key: "gold", fr: "Prestige doré", en: "Prestige gold", es: "Dorado" },
  { key: "clean", fr: "Noir & blanc", en: "Black & white", es: "Blanco y negro" },
  { key: "custom", fr: "Mon image", en: "My image", es: "Mi imagen" },
];

export type BuvetteVisual = {
  templateName: string; paidDrinks: number; bonusDrinks: number; remaining: number;
  icon: DrinkCardIcon; color: string; backgroundKey: DrinkCardBackground; backgroundUrl: string;
  price?: number; currency?: string; usedSlots?: number[];
};

export function clubBuvetteBackground(preset: DrinkCardBackground, url: string) {
  const selected = preset === "custom" && (/^https:\/\//i.test(url) || /^data:image\/\w+;base64,/i.test(url)) ? url.replace(/["\\]/g, "") : "/assets/buvette/bar-ambiance.jpg";
  switch (preset) {
    case "bar-night": case "custom": return `linear-gradient(155deg,rgba(5,8,16,.35),rgba(5,8,16,.93) 78%),url("${selected}")`;
    case "wood": return "repeating-linear-gradient(4deg,rgba(226,158,85,.13) 0px,rgba(226,158,85,.13) 2px,transparent 2px,transparent 18px),linear-gradient(135deg,#3a251c,#0f1017 80%)";
    case "gold": return "radial-gradient(ellipse at 90% 10%,rgba(206,157,45,.27),transparent 56%),linear-gradient(140deg,#31291b,#0c0e19 70%)";
    case "clean": return "linear-gradient(145deg,#292d37,#101119 75%)";
    default: return "radial-gradient(ellipse at 10% 0%,rgba(188,202,236,.14),transparent 60%),linear-gradient(150deg,#222838,#0a0d15 85%)";
  }
}

/** Représentation commune à l'aperçu, à la carte interactive et à l'impression. */
export default function ClubBuvetteCardVisual({ data, memberName, avatarUrl, clubName, logoUrl, compact = false, onConsume, pending = false, disabled = false, lang = "fr", printId }: {
  data: BuvetteVisual; memberName: string; avatarUrl?: string; clubName: string; logoUrl?: string;
  compact?: boolean; onConsume?: (slotIndex: number) => void; pending?: boolean; disabled?: boolean; lang?: string; printId?: string;
}) {
  const total = Math.max(1, Math.min(250, data.paidDrinks + data.bonusDrinks));
  const spent = Math.max(0, Math.min(total, total - data.remaining));
  const sizes = stampRowLengths(total);
  let offset = 0;
  const canStamp = !!onConsume && !pending && !disabled && data.remaining > 0;
  return <div id={printId} className="mss-buvette-visual" style={{
    position: "relative", isolation: "isolate", overflow: "hidden", borderRadius: compact ? 14 : 22,
    padding: compact ? "12px" : "clamp(12px, 3.5vw, 24px)", color: "#fff", maxWidth: 720, width: "100%", margin: "auto", boxSizing: "border-box",
    border: `1.5px solid ${data.color}`, boxShadow: `0 14px 40px #0006, inset 0 0 0 1px ${data.color}33`,
    backgroundImage: clubBuvetteBackground(data.backgroundKey, data.backgroundUrl), backgroundSize: "cover", backgroundPosition: "center",
  }}>
    {logoUrl ? <img src={logoUrl} alt="" aria-hidden="true" style={{ position: "absolute", zIndex: -1, width: "72%", height: "72%", objectFit: "contain", top: "14%", left: "14%", filter: "grayscale(1) brightness(2.6) contrast(1.4)", opacity: .13, pointerEvents: "none" }} /> : null}
    <div style={{ position: "absolute", inset: 0, zIndex: -2, background: "linear-gradient(180deg,rgba(0,0,0,.24),rgba(0,0,0,.12))", pointerEvents: "none" }}/>
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(90px,1fr) minmax(0,1fr)", gap: 6, alignItems: "start" }}>
      <div style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
        {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: compact ? 29 : 42, height: compact ? 29 : 42, objectFit: "cover", borderRadius: "50%", border: `2px solid ${data.color}`, flexShrink: 0, background: "#101321" }}/> : <span style={{ width: compact ? 29 : 42, height: compact ? 29 : 42, display: "grid", placeItems: "center", borderRadius: "50%", background: `${data.color}44`, border: `2px solid ${data.color}`, flexShrink: 0, fontWeight: 900 }}>{memberName.slice(0, 1).toUpperCase() || "?"}</span>}
        <strong style={{ overflowWrap: "anywhere", fontSize: compact ? 10 : "clamp(12px, 2.5vw, 18px)", fontWeight: 950, lineHeight: 1.12, textShadow: "0 2px 8px #000d" }}>{memberName}</strong>
      </div>
      <div style={{ textAlign: "center", minWidth: 0 }}>
        <div style={{ fontSize: compact ? 11 : "clamp(15px, 3vw, 23px)", fontWeight: 1000, lineHeight: 1.08, letterSpacing: ".045em", textShadow: "0 2px 6px #000c" }}>{lang === "en" ? "DRINK CARD" : lang === "es" ? "TARJETA BAR" : "CARTE BUVETTE"}</div>
        <div style={{ fontSize: compact ? 8 : 10, color: "#f0f0f0", marginTop: 5, overflowWrap: "anywhere" }}>{clubName}</div>
      </div>
      <div style={{ display: "grid", placeItems: "center", justifySelf: "end", width: 36, height: 36, borderRadius: 11, color: data.color, border: `1px solid ${data.color}88`, background: "rgba(0,0,0,.32)" }}><BuvetteGlyph icon="cup" size={25} color={data.color}/></div>
    </div>
    <div style={{ margin: compact ? "12px 0 8px" : "16px 0 13px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 7, flexWrap: "wrap" }}>
      <div style={{ minWidth: 0 }}><strong style={{ fontWeight: 950, fontSize: compact ? 12 : 17, color: data.color, textShadow: "0 1px 3px #000" }}>{data.templateName}</strong><div style={{ fontSize: compact ? 9 : 11, color: "#dfdfdf" }}>{data.paidDrinks}{data.bonusDrinks ? ` + ${data.bonusDrinks} ★` : ""} · {data.price !== undefined ? `${data.price.toFixed(2)} ${data.currency || "EUR"}` : ""}</div></div>
      <div style={{ fontWeight: 950, fontSize: compact ? 13 : 20, fontVariantNumeric: "tabular-nums", textShadow: "0 2px 4px #000" }}><span style={{ color: data.color }}>{data.remaining}</span><span style={{ color: "#dedede" }}> / {total}</span></div>
    </div>
    <div style={{ display: "grid", gap: compact ? 4 : 7 }}>
      {sizes.map((count, rowIdx) => {
        const start = offset; offset += count;
        return <div key={rowIdx} style={{ display: "flex", justifyContent: "center", gap: compact ? 3 : 5, width: "100%" }}>
          {Array.from({ length: count }, (_, j) => {
            const index = start + j, used = data.usedSlots ? data.usedSlots.includes(index + 1) : index < spent, gift = index >= data.paidDrinks;
            const fillColor = used ? "#de343f" : data.color;
            const commonStyle: React.CSSProperties = { width: `min(${compact ? 26 : 47}px,calc((100% - ${(compact ? 3 : 5) * (Math.max(...sizes)-1)}px)/${Math.max(...sizes)}))`, aspectRatio: ".86", flexShrink: 1, minWidth: 0, border: 0, background: "transparent", padding: 0, cursor: canStamp && !used ? "pointer" : "default", touchAction: "manipulation" };
            return <button key={index} type="button" className="mss-buvette-stamp" style={commonStyle} disabled={!canStamp || used} onClick={() => onConsume?.(index + 1)}
              aria-label={`${index + 1}/${total} · ${used ? (lang === "en" ? "Used" : "Consommée") : (lang === "en" ? "Available" : "Disponible")}${gift ? " ★" : ""}`}
              title={used ? "Consommée" : gift ? "Boisson offerte" : "Valider une boisson"}>
              <svg width="100%" height="100%" viewBox="0 0 36 43" aria-hidden="true">
                <path d="M5 4H31L27 35Q18 42 9 35Z" fill={fillColor} fillOpacity={used ? .83 : .83} stroke={used ? "#ff868b" : data.color} strokeWidth="2.2" strokeLinejoin="round"/>
                <path d="M7 12h22M10 34h16" stroke="#fff" strokeOpacity=".48" strokeWidth="1.1" strokeLinecap="round"/>
                <path d="M8 6h20" stroke="#fff" strokeOpacity=".35" strokeWidth="1.3"/>
                <text x="18" y="25.4" fill="#fff" textAnchor="middle" fontWeight="900" fontSize={gift ? 11.8 : 11.3} stroke="#000" strokeOpacity=".13" strokeWidth=".4">{used ? "×" : gift ? "★" : String(index + 1)}</text>
              </svg>
            </button>;
          })}
        </div>;
      })}
    </div>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: compact ? 10 : 16, borderTop: "1px solid #ffffff40", paddingTop: 8, fontSize: compact ? 8 : 10, color: "#f0f0f0" }}>
      <span>{lang === "en" ? "PREPAID CLUB CARD" : lang === "es" ? "TARJETA PREPAGO" : "CARTE CLUB PRÉPAYÉE"}</span>
      <span style={{ display: "flex", alignItems: "center", gap: 5 }}><BuvetteGlyph icon={data.icon} size={16} color={data.color}/>{data.bonusDrinks ? `${data.bonusDrinks} ★` : ""}</span>
    </div>
  </div>;
}
