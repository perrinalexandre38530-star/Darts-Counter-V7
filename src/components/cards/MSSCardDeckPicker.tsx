import React from "react";
import { getMSSCardDeck, setMSSCardDeck, mssCardDeckLabel, mssVisualCardUrl, mssVisualJokerUrl, type MSSCardDeckId } from "../../lib/mssCardDeck";

/** Compact shared artwork picker. The active deck is a global visual preference. */
export default function MSSCardDeckPicker({ onChange }: { onChange?: (deck: MSSCardDeckId) => void } = {}) {
  const [deck, changeDeck] = React.useState<MSSCardDeckId>(getMSSCardDeck);
  const options: MSSCardDeckId[] = ["legends", "bots"];
  return <div style={{ marginTop: 10, padding: 9, borderRadius: 13, border: "1px solid rgba(244,198,106,.34)", background: "linear-gradient(135deg,rgba(242,192,86,.08),rgba(0,0,0,.18))" }}>
    <div style={{ color: "#f7d488", textAlign: "center", fontSize: 10.5, fontWeight: 1050, letterSpacing: .55, marginBottom: 7 }}>CHOISIR LE JEU DE CARTES</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 7 }}>
      {options.map((item) => {
        const active = deck === item;
        return <button key={item} type="button" aria-label={`Choisir le jeu ${mssCardDeckLabel(item)}`} aria-pressed={active} onClick={() => { setMSSCardDeck(item); changeDeck(item); onChange?.(item); }} style={{ minWidth: 0, padding: "8px 5px", cursor: "pointer", borderRadius: 11, display: "grid", gap: 4, justifyItems: "center", background: active ? "rgba(246,194,86,.16)" : "rgba(255,255,255,.025)", border: `1px solid ${active ? "#f6c256" : "rgba(255,255,255,.14)"}`, boxShadow: active ? "inset 0 0 0 1px rgba(246,194,86,.22)" : "none", color: "#fff" }}>
          <div style={{ height: 69, display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
            <img src={mssVisualCardUrl("S", 14, item) || ""} alt="" draggable={false} loading="lazy" style={{ width: 43, height: 65, objectFit: "fill" }} />
            <img src={mssVisualJokerUrl("hawaii-501", item)} alt="" draggable={false} loading="lazy" style={{ width: 43, height: 65, objectFit: "fill" }} />
          </div>
          <span style={{ fontSize: 10, fontWeight: 1100, letterSpacing: .3, color: active ? "#ffe2a0" : "#e5e7ee" }}>{active ? "✓ " : ""}{mssCardDeckLabel(item)}</span>
        </button>;
      })}
    </div>
    <div style={{ textAlign: "center", color: "#a9adbf", fontSize: 9, marginTop: 7 }}>54 cartes par jeu · préférence visuelle commune · règles inchangées</div>
  </div>;
}
