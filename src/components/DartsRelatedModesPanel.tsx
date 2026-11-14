import React from "react";
import { useLang } from "../contexts/LangContext";
import { DARTS_GAMES } from "../games/dartsGameRegistry";
import { dartsGameFamily, dartsGameRelatedIds } from "../games/dartsGameFamilies";
import { getTicker } from "../lib/tickers";

type Props = {
  gameId: string;
  onOpenGame: (gameId: string) => void;
  accent?: string;
  compact?: boolean;
  bare?: boolean;
};

/** Bi-directional links between an original game and its playable variants. */
export default function DartsRelatedModesPanel({ gameId, onOpenGame, accent = "#F6C256", compact = false, bare = false }: Props) {
  const { lang } = useLang();
  const family = dartsGameFamily(gameId);
  const siblings = dartsGameRelatedIds(gameId);
  if (!family || !siblings.length) return null;
  const isFr = String(lang || "fr").toLowerCase().startsWith("fr");
  const isMain = gameId === family.mainId;
  const main = DARTS_GAMES.find(g => g.id === family.mainId);
  return <section data-mss-game-family={family.id} data-mss-game-id={gameId} style={{
    margin: bare ? "10px auto 5px" : "8px auto 12px", width: "100%", maxWidth: 900, boxSizing: "border-box",
    padding: bare ? "0" : compact ? 8 : 11,
    borderRadius: bare ? 0 : 14, border: bare ? "none" : `1px solid ${accent}60`,
    background: bare ? "transparent" : `linear-gradient(150deg,${accent}13,rgba(7,10,19,.97) 75%)`,
  }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
      <strong style={{ color: accent, fontSize: compact ? 11 : 13, letterSpacing: .9 }}>
        {isFr ? "VARIANTES" : "VARIANTS"}
      </strong>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, padding: "2px 1px 5px" }}>
      {siblings.map(id => {
        const game = DARTS_GAMES.find(g => g.id === id);
        if (!game) return null;
        const tickerKey = ({
          ptit_hun: "ptit_1", training_super_bull: "super_bull", top_10_training: "top_10",
          training_x01: "x01",
        } as Record<string, string>)[id] || id;
        const ticker = getTicker(tickerKey, String(lang || "fr"));
        const mainLink = id === family.mainId;
        return <button key={id} type="button" disabled={!game.ready} onClick={() => { if(game.ready) onOpenGame(id); }} aria-label={`${isFr ? "Jouer à" : "Play"} ${game.label}${game.ready ? "" : " · Bientôt disponible"}`}
          style={{ minWidth: 0, width: "100%", borderRadius: 10, overflow: "hidden", cursor: game.ready ? "pointer" : "not-allowed", padding: 5,
            display: "grid", gridTemplateRows: "50px auto", gap: 5, textAlign: "left", border: `1px solid ${mainLink ? accent + "8c" : "rgba(255,255,255,.12)"}`,
            background: mainLink ? `${accent}17` : "rgba(255,255,255,.035)", color: "#fff", opacity: game.ready ? 1 : .5 }}>
          {ticker ? <img src={ticker} alt="" aria-hidden="true" style={{ width: "100%", height: 50, borderRadius: 6, objectFit: "cover" }} />
            : <div style={{ display: "grid", placeItems: "center", height: 50, borderRadius: 6, background: `${accent}15`, fontSize: 18 }}>🎯</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 5, alignItems: "center", minWidth: 0 }}>
            <span style={{ fontWeight: 1000, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.label}</span>
            <span style={{ color: accent, fontWeight: 1000, fontSize: 14 }}>{game.ready ? "›" : "·"}</span>
          </div>
        </button>;
      })}
    </div>
  </section>;
}
