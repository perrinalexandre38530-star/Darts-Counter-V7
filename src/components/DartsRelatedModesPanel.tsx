import React from "react";
import { createPortal } from "react-dom";
import { DartsGuideRelatedSlot } from "./DartsConfigGuideBoundary";
import { useLang } from "../contexts/LangContext";
import { DARTS_GAMES } from "../games/dartsGameRegistry";
import { dartsGameFamily, dartsGameRelatedIds, dartsGameHasAlliedFamilies } from "../games/dartsGameFamilies";
import { getTicker } from "../lib/tickers";
import MssCricketVariantPreview, { hasCricketVariantPreview } from "./MssCricketVariantPreview";

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
  const guideRelatedSlot = React.useContext(DartsGuideRelatedSlot);
  const family = dartsGameFamily(gameId);
  const siblings = dartsGameRelatedIds(gameId);
  const crossFamilies = dartsGameHasAlliedFamilies(gameId);
  // Règle MSS globale : 2 colonnes × 2 lignes, défilement de 4 cartes toutes les 3 s.
  // Le même composant est utilisé dans les configs, les entrées de mode et les InfoDot Games.
  const [page, setPage] = React.useState(0);
  const pages = Math.max(1, Math.ceil(siblings.length / 4));
  React.useEffect(() => { setPage(0); }, [gameId]);
  React.useEffect(() => {
    if (pages <= 1) return;
    const timer = window.setInterval(() => setPage(current => (current + 1) % pages), 3000);
    return () => window.clearInterval(timer);
  }, [pages, gameId]);
  if (!family || !siblings.length) return null;
  const visibleSiblings = siblings.slice((page % pages) * 4, (page % pages) * 4 + 4);
  const isFr = String(lang || "fr").toLowerCase().startsWith("fr");
  const isMain = gameId === family.mainId;
  const main = DARTS_GAMES.find(g => g.id === family.mainId);
  const panel = <section data-mss-game-family={family.id} data-mss-game-id={gameId} style={{
    margin: bare ? "10px auto 5px" : "8px auto 12px", width: "100%", maxWidth: 900, boxSizing: "border-box",
    padding: bare ? "0" : compact ? 8 : 11,
    borderRadius: bare ? 0 : 14, border: bare ? "none" : `1px solid ${accent}60`,
    background: bare ? "transparent" : `linear-gradient(150deg,${accent}13,rgba(7,10,19,.97) 75%)`,
  }}>
    <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8, marginBottom: 7 }}>
      <strong style={{ color: accent, fontSize: compact ? 11 : 13, letterSpacing: .9 }}>
        {crossFamilies ? (isFr ? "JEUX DE SURVIE APPARENTÉS" : "RELATED SURVIVAL GAMES") : (isFr ? "VARIANTES" : "VARIANTS")}
      </strong>
    </div>
    {crossFamilies ? <div style={{ color: "#cfd4dd", fontSize: compact ? 9 : 10, lineHeight: 1.4, marginBottom: 8 }}>{isFr ? "Killer et 5 Vies : mêmes enjeux de survie, mais règles et scores distincts." : "Killer and Five Lives: shared survival theme, different rules and scoring."}</div> : null}
    <div aria-live="off" data-mss-variants-page={`${(page % pages) + 1}/${pages}`} style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 8, padding: "2px 1px 5px" }}>
      {visibleSiblings.map(id => {
        const game = DARTS_GAMES.find(g => g.id === id);
        if (!game) return null;
        const tickerKey = ({
          ptit_hun: "ptit_1", training_super_bull: "super_bull", top_10_training: "top_10",
          training_x01: "x01",
        } as Record<string, string>)[id] || id;
        const ticker = getTicker(tickerKey, String(lang || "fr"));
        const cricketPreview = !ticker && hasCricketVariantPreview(id);
        const mainLink = id === family.mainId;
        return <button key={id} type="button" disabled={!game.ready} onClick={() => { if(game.ready) onOpenGame(id); }} aria-label={`${isFr ? "Jouer à" : "Play"} ${game.label}${game.ready ? "" : " · Bientôt disponible"}`}
          style={{ minWidth: 0, width: "100%", borderRadius: 10, overflow: "hidden", cursor: game.ready ? "pointer" : "not-allowed", padding: 5,
            display: "grid", gridTemplateRows: "50px auto", gap: 5, textAlign: "left", border: `1px solid ${mainLink ? accent + "8c" : "rgba(255,255,255,.12)"}`,
            background: mainLink ? `${accent}17` : "rgba(255,255,255,.035)", color: "#fff", opacity: game.ready ? 1 : .5 }}>
          {ticker ? <img src={ticker} alt="" aria-hidden="true" style={{ width: "100%", height: 50, borderRadius: 6, objectFit: "cover" }} />
            : cricketPreview ? <MssCricketVariantPreview gameId={id} />
            : <div style={{ display: "grid", placeItems: "center", height: 50, borderRadius: 6, background: `${accent}15`, fontSize: 18 }}>🎯</div>}
          <div style={{ display: "flex", justifyContent: "space-between", gap: 5, alignItems: "center", minWidth: 0 }}>
            <span style={{ fontWeight: 1000, fontSize: 10, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{game.label}</span>
            <span style={{ color: accent, fontWeight: 1000, fontSize: 14 }}>{game.ready ? "›" : "·"}</span>
          </div>
        </button>;
      })}
    </div>
    {pages > 1 && <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 7 }}>
      <button type="button" aria-label={isFr ? "Variantes précédentes" : "Previous variants"} onClick={() => setPage(current => (current - 1 + pages) % pages)} style={{ border: `1px solid ${accent}55`, borderRadius: 9, padding: "3px 11px", color: accent, background: "rgba(255,255,255,.04)", cursor: "pointer" }}>←</button>
      <span aria-live="polite" style={{ fontSize: 10, fontWeight: 850, color: accent, minWidth: 67, textAlign: "center" }}>{(page % pages) + 1} / {pages}</span>
      <button type="button" aria-label={isFr ? "Variantes suivantes" : "Next variants"} onClick={() => setPage(current => (current + 1) % pages)} style={{ border: `1px solid ${accent}55`, borderRadius: 9, padding: "3px 11px", color: accent, background: "rgba(255,255,255,.04)", cursor: "pointer" }}>→</button>
    </div>}
  </section>;
  return guideRelatedSlot ? createPortal(panel, guideRelatedSlot) : panel;
}
