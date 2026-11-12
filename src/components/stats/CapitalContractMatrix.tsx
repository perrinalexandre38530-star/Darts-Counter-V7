import React from "react";
import { CAPITAL_CONTRACT_META, type CapitalContractId, type CapitalVisit } from "../../lib/capitalGame";

const PLAYER_COLORS = ["#2fd8ff", "#e761c4", "#ff9b52", "#8c7dff", "#67e2a1", "#ffcf57", "#ff6f88", "#62d7c9"];
const SUCCESS = "#4dff89";
const FAILURE = "#ffad45";

type Participant = { id?: string; name?: string; nickname?: string };

/**
 * Capitaux cumulés après chaque contrat. La colonne des contrats reste fixe :
 * les colonnes joueurs défilent à l'horizontale, sans masquer les participants.
 * Utilisé dans les stats live ET sur l'écran de fin de partie.
 */
export default function CapitalContractMatrix({
  contracts, participants, visits, scores, compact = false,
}: {
  contracts: CapitalContractId[];
  participants: Participant[];
  visits: CapitalVisit[];
  scores?: number[];
  compact?: boolean;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const contractColumnWidth = compact ? 124 : 146;
  const playerColumnWidth = compact ? 88 : 102;
  const totalWidth = contractColumnWidth + participants.length * playerColumnWidth;
  const [position, setPosition] = React.useState({ left: false, right: false, progress: 0, visibleRatio: 1 });

  const updateScrollPosition = React.useCallback(() => {
    const area = scrollRef.current;
    if (!area) return;
    const max = Math.max(0, area.scrollWidth - area.clientWidth);
    const left = Math.max(0, area.scrollLeft);
    const next = {
      left: left > 2,
      right: left < max - 2,
      progress: max ? Math.min(1, left / max) : 0,
      visibleRatio: area.scrollWidth ? Math.min(1, area.clientWidth / area.scrollWidth) : 1,
    };
    setPosition((before) => Object.keys(next).every((key) =>
      Math.abs(Number(before[key as keyof typeof next]) - Number(next[key as keyof typeof next])) < 0.001
    ) ? before : next);
  }, []);

  React.useEffect(() => {
    const area = scrollRef.current;
    if (!area) return;
    updateScrollPosition();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(updateScrollPosition) : null;
    observer?.observe(area);
    if (area.firstElementChild) observer?.observe(area.firstElementChild);
    window.addEventListener("resize", updateScrollPosition);
    return () => {
      observer?.disconnect();
      window.removeEventListener("resize", updateScrollPosition);
    };
  }, [compact, participants.length, contracts.length, updateScrollPosition]);

  const moveHorizontal = (direction: -1 | 1) => {
    scrollRef.current?.scrollBy({ left: direction * (playerColumnWidth * 2 + 24), behavior: "smooth" });
  };

  const byPlayerAndRound = React.useMemo(() => {
    const map = new Map<string, CapitalVisit>();
    for (const visit of visits || []) {
      map.set(`${String(visit.playerId)}:${visit.contractIndex}`, visit);
    }
    return map;
  }, [visits]);

  const cellStyle: React.CSSProperties = {
    width: playerColumnWidth,
    maxWidth: playerColumnWidth,
    boxSizing: "border-box",
    padding: compact ? "7px 3px" : "9px 4px",
    textAlign: "center",
    borderRight: "1px solid rgba(255,255,255,.045)",
    borderBottom: "1px solid rgba(255,255,255,.075)",
  };
  const stickyCell: React.CSSProperties = {
    width: contractColumnWidth,
    maxWidth: contractColumnWidth,
    boxSizing: "border-box",
    position: "sticky", left: 0,
    zIndex: 2,
    textAlign: "left",
    padding: compact ? "8px 6px" : "9px 8px",
    borderRight: "1px solid rgba(255,255,255,.14)",
    borderBottom: "1px solid rgba(255,255,255,.09)",
  };
  const hasOverflow = position.left || position.right;
  const thumbWidth = Math.max(10, position.visibleRatio * 100);
  const thumbOffset = position.progress * (100 - thumbWidth);

  return (
    <section aria-label="Tableau de tous les contrats CAPITAL" style={{ color: "#fff", minWidth: 0, width: "100%", border: "1px solid rgba(53,216,255,.30)", borderRadius: 16, overflow: "hidden", background: "rgba(2,9,16,.66)" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", padding: "10px 10px", gap: 7, borderBottom: "1px solid rgba(255,255,255,.10)" }}>
        <strong style={{ color: "#fbd56b", fontSize: 12, letterSpacing: .3 }}>TABLEAU DES CONTRATS</strong>
        <div style={{ display: "flex", gap: 9, fontSize: 9, fontWeight: 900, whiteSpace: "nowrap" }}>
          <span style={{ color: SUCCESS }}>● RÉUSSI</span>
          <span style={{ color: FAILURE }}>● RATÉ</span>
          <span style={{ opacity: .55 }}>— À JOUER</span>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "5px 9px", background: "rgba(255,185,52,.06)", borderBottom: "1px solid rgba(255,194,75,.16)" }}>
        <button type="button" onClick={() => moveHorizontal(-1)} disabled={!position.left} aria-label="Voir les joueurs précédents" title="Colonnes joueurs précédentes" style={{ flex: "0 0 28px", width: 28, height: 26, borderRadius: 8, border: "1px solid rgba(255,199,83,.38)", background: "#1b2026", color: position.left ? "#ffd26c" : "#5c6470", cursor: position.left ? "pointer" : "default", fontSize: 17 }}>‹</button>
        <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ flex: "0 0 auto", fontSize: 9.5, fontWeight: 850, color: "#ffd26c" }}>{participants.length} joueur{participants.length > 1 ? "s" : ""}</span>
          <div aria-hidden="true" style={{ position: "relative", height: 5, borderRadius: 99, flex: 1, minWidth: 12, background: "rgba(255,255,255,.13)", overflow: "hidden" }}>
            <div style={{ position: "absolute", left: `${thumbOffset}%`, width: `${thumbWidth}%`, height: "100%", background: "linear-gradient(90deg,#d88a16,#ffd36b)", borderRadius: 99 }} />
          </div>
          <span style={{ fontSize: 9, color: "#b9bfca", whiteSpace: "nowrap" }}>{hasOverflow ? "Glisser ↔" : "Tout visible"}</span>
        </div>
        <button type="button" onClick={() => moveHorizontal(1)} disabled={!position.right} aria-label="Voir les joueurs suivants" title="Colonnes joueurs suivantes" style={{ flex: "0 0 28px", width: 28, height: 26, borderRadius: 8, border: "1px solid rgba(255,199,83,.38)", background: "#1b2026", color: position.right ? "#ffd26c" : "#5c6470", cursor: position.right ? "pointer" : "default", fontSize: 17 }}>›</button>
      </div>

      <div
        ref={scrollRef}
        data-testid="capital-contracts-horizontal-scroll"
        className="dc-scroll-thin"
        onScroll={updateScrollPosition}
        tabIndex={0}
        role="region"
        aria-label="Tableau défilant horizontalement, tous les joueurs"
        style={{ width: "100%", maxWidth: "100%", minWidth: 0, overflowX: "auto", overflowY: "hidden", overscrollBehaviorX: "contain", WebkitOverflowScrolling: "touch", scrollbarWidth: "thin", scrollbarColor: "#d99c30 #1c242c" }}
      >
        <table style={{ width: "100%", minWidth: totalWidth, borderCollapse: "separate", borderSpacing: 0, tableLayout: "fixed", fontSize: compact ? 10.5 : 11 }}>
          <colgroup>
            <col style={{ width: contractColumnWidth }}/>
            {participants.map((p, i) => <col key={String(p.id ?? i)} style={{ width: playerColumnWidth }}/>) }
          </colgroup>
          <thead><tr>
            <th scope="col" style={{ ...stickyCell, zIndex: 5, background: "#10202b", padding: "10px 6px", fontSize: compact ? 10 : 11 }}>TOUR / CONTRAT</th>
            {participants.map((p, i) => <th scope="col" key={String(p.id ?? i)} style={{ ...cellStyle, position: "sticky", top: 0, zIndex: 3, background: "#10202b", color: PLAYER_COLORS[i % PLAYER_COLORS.length], overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={p.nickname || p.name || `Joueur ${i+1}`}>{p.nickname || p.name || `Joueur ${i+1}`}</th>)}
          </tr></thead>
          <tbody>
            {contracts.map((contractId, round) => (
              <tr key={`${contractId}-${round}`}>
                <th scope="row" style={{ ...stickyCell, background: round % 2 ? "#0b161f" : "#111d28", fontWeight: 950, lineHeight: 1.15, overflowWrap: "anywhere" }}><span style={{ color: "#9aabb8", marginRight: 5 }}>#{round + 1}</span>{CAPITAL_CONTRACT_META[contractId]?.label || contractId}</th>
                {participants.map((p, i) => {
                  const visit = byPlayerAndRound.get(`${String(p.id ?? i)}:${round}`);
                  const isOpening = contractId === "capital";
                  const color = visit?.success ? SUCCESS : FAILURE;
                  return <td key={`${String(p.id ?? i)}-${round}`} style={{ ...cellStyle, background: visit ? (visit.success ? "rgba(77,255,137,.085)" : "rgba(255,173,69,.09)") : "transparent", boxShadow: visit ? `inset 3px 0 ${color}` : "none" }}>
                    {visit ? <><div style={{ color, fontWeight: 1000, fontSize: compact ? 15 : 18, fontVariantNumeric: "tabular-nums" }}>{visit.scoreAfter}</div><div style={{ color, opacity: .92, fontSize: 9, fontWeight: 950 }}>{isOpening ? `Départ ${visit.visitScore}` : visit.success ? `+${Number(visit.visitScore || 0) + Number(visit.bonusPoints || 0)}` : `−${visit.penaltyLost || 0} · échec`}</div></> : <span style={{ color: "#6b7a86", fontSize: 16 }}>—</span>}
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
          {scores ? <tfoot><tr><th scope="row" style={{ ...stickyCell, background: "#172430", color: "#fbd56b" }}>CAPITAL ACTUEL</th>{participants.map((p, i) => <td key={String(p.id ?? i)} style={{ ...cellStyle, background: "#172430", color: PLAYER_COLORS[i % PLAYER_COLORS.length], fontSize: compact ? 16 : 18, fontWeight: 1000 }}>{Number(scores[i] || 0)}</td>)}</tr></tfoot> : null}
        </table>
      </div>
    </section>
  );
}
