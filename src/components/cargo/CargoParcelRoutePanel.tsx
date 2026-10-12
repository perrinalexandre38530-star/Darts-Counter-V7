import React from "react";
import { cargoArtLibrary } from "./cargoArt";

const BLUE = "#56c9ff";
const GREEN = "#62e6a7";
const GOLD = "#f6c256";
const ORANGE = "#ff9b42";
const SOFT = "#aab1bf";

export default function CargoParcelRoutePanel({ activeSeries, bonuses, delivered = 0, deliveries = 0 }: any) {
  const count = Math.max(0, Math.min(5, Number(activeSeries?.count || 0)));
  const address = activeSeries?.number ? `QUAI ${String(activeSeries.number).padStart(2, "0")}` : "NOUVELLE ADRESSE";
  const bonus = Number(bonuses?.[count] || 0);
  const total = count + bonus;

  return <section style={{
    position: "relative",
    overflow: "hidden",
    borderRadius: 18,
    padding: 12,
    background: "radial-gradient(circle at 8% 0%,rgba(86,201,255,.14),transparent 34%),linear-gradient(180deg,rgba(18,22,30,.96),rgba(7,9,13,.98))",
    border: `1px solid ${BLUE}45`,
    boxShadow: "0 14px 34px rgba(0,0,0,.24)"
  }}>
    <div aria-hidden style={{ position: "absolute", right: -20, bottom: -34, width: 160, height: 160, opacity: .08, pointerEvents: "none" }}>
      <img src={cargoArtLibrary.colisCargo} alt="" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
    </div>

    <div style={{ position: "relative", zIndex: 1, display: "grid", gridTemplateColumns: "88px minmax(0,1fr)", gap: 12, alignItems: "center" }}>
      <div style={{ height: 88, display: "grid", placeItems: "center", borderRadius: 16, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)" }}>
        <img className="cargo-float-art" src={cargoArtLibrary.colisCargo} alt="Colis CARGO" style={{ width: 82, height: 82, objectFit: "contain", filter: "drop-shadow(0 10px 18px rgba(0,0,0,.42))" }} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ color: BLUE, fontSize: 8.5, fontWeight: 1100, letterSpacing: .75 }}>PARCEL DELIVERY · ADRESSE ACTIVE</div>
        <div style={{ marginTop: 3, color: "#fff", fontSize: 18, lineHeight: 1, fontWeight: 1150 }}>{address}</div>
        <div style={{ marginTop: 6, display: "flex", alignItems: "baseline", gap: 7 }}>
          <strong style={{ color: count >= 5 ? GREEN : ORANGE, fontSize: 27, lineHeight: 1, fontWeight: 1200 }}>{count}<span style={{ fontSize: 11, opacity: .55 }}>/5</span></strong>
          <span style={{ color: SOFT, fontSize: 8 }}>{activeSeries ? `${total} colis si validé maintenant` : "Le premier numéro touché ouvre une adresse"}</span>
        </div>
        <div style={{ marginTop: 7, display: "flex", gap: 5, flexWrap: "wrap" }}>
          <span style={{ padding: "3px 6px", borderRadius: 999, background: `${GREEN}10`, border: `1px solid ${GREEN}35`, color: GREEN, fontSize: 6.8, fontWeight: 1000 }}>{delivered} COLIS LIVRÉS</span>
          <span style={{ padding: "3px 6px", borderRadius: 999, background: `${GOLD}10`, border: `1px solid ${GOLD}35`, color: GOLD, fontSize: 6.8, fontWeight: 1000 }}>{deliveries} LIVRAISONS</span>
        </div>
      </div>
    </div>

    <div style={{ position: "relative", zIndex: 1, marginTop: 12 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6, alignItems: "center" }}>
        {[1,2,3,4,5].map((step) => {
          const reached = count >= step;
          const stepBonus = Number(bonuses?.[step] || 0);
          return <div key={step} className={reached ? "cargo-route-step is-reached" : "cargo-route-step"} style={{
            position: "relative",
            minHeight: 56,
            padding: "8px 4px",
            borderRadius: 13,
            textAlign: "center",
            background: reached ? `${GREEN}13` : "rgba(255,255,255,.025)",
            border: `1px solid ${reached ? GREEN : "rgba(255,255,255,.08)"}`,
            boxShadow: reached ? `0 0 14px ${GREEN}12` : "none"
          }}>
            <div style={{ color: reached ? GREEN : SOFT, fontSize: 7, fontWeight: 1000 }}>TOUCHE {step}</div>
            <div style={{ marginTop: 4, color: reached ? "#fff" : "#8992a2", fontSize: 17, fontWeight: 1150 }}>{step + stepBonus}</div>
            <div style={{ marginTop: 2, color: stepBonus ? GOLD : SOFT, fontSize: 6.4 }}>+{stepBonus} bonus</div>
          </div>;
        })}
      </div>
      <div style={{ marginTop: 9, height: 7, borderRadius: 999, overflow: "hidden", background: "rgba(255,255,255,.07)" }}>
        <div style={{ width: `${count * 20}%`, height: "100%", borderRadius: 999, background: `linear-gradient(90deg,${BLUE},${GREEN})`, boxShadow: `0 0 12px ${BLUE}55`, transition: "width .28s ease" }} />
      </div>
    </div>
  </section>;
}
