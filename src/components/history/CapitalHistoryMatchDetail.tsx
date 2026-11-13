import React from "react";
import { createPortal } from "react-dom";
import CapitalContractMatrix from "../stats/CapitalContractMatrix";
import CapitalMatchRecap from "../stats/CapitalMatchRecap";
import { CAPITAL_CONTRACT_META } from "../../lib/capitalGame";
import { readCapitalHistoryMatchDetail, type CapitalHistoryDetailPlayer } from "../../lib/capitalHistoryMatchDetail";

const GOLD = "#ffd578";
const COLORS = ["#4cdbff", "#ff78c8", "#ffc27d", "#ae9aff", "#5ef5a7", "#ffe86b", "#ff8190", "#78e8d9"];
const format = (value: number | null, digits = 0) =>
  value === null ? "—" : value.toLocaleString("fr-FR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const metric = (a: CapitalHistoryDetailPlayer, key: keyof CapitalHistoryDetailPlayer, digits = 0) => {
  const value = a[key];
  return typeof value === "number" && Number.isFinite(value) ? format(value, digits) : "—";
};
const smallTitle: React.CSSProperties = { color: GOLD, fontWeight: 950, fontSize: 12, letterSpacing: ".06em" };
const panel: React.CSSProperties = { padding: "12px", border: "1px solid rgba(255,190,67,.25)", borderRadius: 14, background: "rgba(7,13,23,.83)" };

/** Fiche de match, ouverte UNIQUEMENT depuis « VOIR STATS » d'une partie CAPITAL terminée. */
export default function CapitalHistoryMatchDetail({ record, onClose }: { record: any | null; onClose: () => void }) {
  const [tab, setTab] = React.useState<"classement" | "contrats" | "evolution">("classement");
  const closeRef = React.useRef<HTMLButtonElement>(null);
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;
  const data = React.useMemo(() => record ? readCapitalHistoryMatchDetail(record) : null, [record]);
  React.useEffect(() => {
    if (!record) return;
    setTab("classement");
    const bodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); onCloseRef.current(); } };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = bodyOverflow; window.removeEventListener("keydown", onKey); };
  }, [record]);
  if (!record || !data || typeof document === "undefined") return null;

  const { players, visits, contracts, teams } = data;
  const chartPlayers = players.map((p) => ({ id: p.id, name: p.name }));
  const scores = players.map((p) => p.finalCapital === null ? Number.NaN : p.finalCapital);
  const labelFor = (id: string) => data.contractLabels[id] || CAPITAL_CONTRACT_META[id as keyof typeof CAPITAL_CONTRACT_META]?.label || id;
  const rank = (player: CapitalHistoryDetailPlayer, index: number) => player.rank ?? (player.finalCapital === null ? null :
    1 + players.filter((other) => other.finalCapital !== null && other.finalCapital > player.finalCapital!).length);
  const headToHead: Array<{ label: string; key: keyof CapitalHistoryDetailPlayer; digits?: number; suffix?: string }> = [
    { label: "Capital final", key: "finalCapital" },
    { label: "Capital de départ", key: "startingCapital" },
    { label: "Points crédités", key: "pointsWon" },
    { label: "Capital perdu", key: "capitalLost" },
    { label: "Contrats réussis", key: "successfulContracts" },
    { label: "Contrats joués", key: "contractsPlayed" },
    { label: "Réussite", key: "successRate", digits: 1, suffix: "%" },
    { label: "Moyenne par volée", key: "averageVisit", digits: 1 },
    { label: "Meilleure volée", key: "bestVisit" },
    { label: "Fléchettes", key: "dartsThrown" },
  ];
  const decorated = (player: CapitalHistoryDetailPlayer, key: keyof CapitalHistoryDetailPlayer, digits = 0, suffix = "") =>
    `${metric(player, key, digits)}${typeof player[key] === "number" ? suffix : ""}`;

  return createPortal(
    <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 2147483000, display: "grid", placeItems: "center", padding: "max(8px, env(safe-area-inset-top)) 8px max(8px, env(safe-area-inset-bottom))", background: "rgba(0,0,0,.84)", backdropFilter: "blur(7px)" }}>
      <section role="dialog" aria-modal="true" aria-labelledby="capital-history-modal-title"
        style={{ width: "min(1060px, 100%)", maxHeight: "min(94dvh, 100%)", display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden", color: "#f5f7fb", borderRadius: 20, border: "1px solid rgba(255,202,91,.70)", boxShadow: "0 15px 65px rgba(0,0,0,.88), 0 0 20px rgba(249,152,24,.23)", background: "linear-gradient(145deg,#42220c 0%,#121924 22%,#07101a 100%)" }}>
        <header style={{ flexShrink: 0, padding: "12px 14px 10px", background: "radial-gradient(ellipse at 80% 10%,rgba(247,160,41,.22),transparent 68%),linear-gradient(90deg,rgba(72,41,10,.78),rgba(10,17,26,.91))", borderBottom: "1px solid rgba(255,206,92,.25)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: "#ffb856", fontSize: 10, fontWeight: 900, letterSpacing: ".13em" }}>HISTORIQUE V4 · CAPITAL</div>
              <h2 id="capital-history-modal-title" style={{ margin: "3px 0 0", fontWeight: 1000, fontSize: "clamp(17px,3vw,23px)", color: "#ffe29e", overflowWrap: "anywhere" }}>FICHE DE PARTIE · {data.variantName}</h2>
            </div>
            <button ref={closeRef} type="button" onClick={onClose} aria-label="Fermer la fiche CAPITAL" style={{ width: 38, height: 38, flexShrink: 0, borderRadius: 11, border: "1px solid rgba(255,208,101,.6)", background: "rgba(0,0,0,.44)", color: "#ffe4aa", fontSize: 25, cursor: "pointer" }}>×</button>
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12 }} role="tablist" aria-label="Sections du bilan CAPITAL">
            {([ ["classement","CLASSEMENT"], ["contrats","CONTRATS"], ["evolution","ÉVOLUTION"] ] as const).map(([id, label]) =>
              <button type="button" key={id} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}
                style={{ flex: "1 1 0", minWidth: 0, minHeight: 34, padding: "7px 3px", borderRadius: 10, border: `1px solid ${tab === id ? "#ffcd61" : "rgba(255,255,255,.12)"}`, background: tab === id ? "linear-gradient(110deg,#824809,#372309)" : "rgba(4,11,20,.58)", color: tab === id ? "#ffe8af" : "#adb9ca", fontSize: "clamp(9px,2.4vw,12px)", fontWeight: 950, cursor: "pointer" }}>{label}</button>)}
          </div>
        </header>
        <div style={{ overflowY: "auto", overflowX: "hidden", overscrollBehavior: "contain", flex: 1, minHeight: 0, padding: "12px clamp(8px,2.4vw,18px) 20px" }}>
          {data.integrityWarning && <p role="status" style={{ ...panel, color: "#ffc184", borderColor: "#ff9966" }}>Attention : une incohérence a été signalée par le contrôle d'intégrité de cette partie. Les valeurs sont affichées telles qu'enregistrées, sans correction automatique.</p>}
          {data.dataWarning && <p role="status" style={{ color: "#ffd3a0", margin: "0 0 12px", fontSize: 12 }}>{data.dataWarning}</p>}
          {tab === "classement" && <div style={{ display: "grid", gap: 12 }}>
            {teams.length > 0 && <div style={panel}><div style={smallTitle}>CLASSEMENT DES ÉQUIPES</div><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>{teams.map((team) => <div key={team.id} style={{ padding: "7px 11px", background: "rgba(255,207,95,.09)", borderRadius: 9, border: "1px solid rgba(255,207,95,.23)" }}><b>{team.name}</b> · {format(team.score)}</div>)}</div></div>}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 8 }}>
              {players.map((player, index) => <div key={player.id} style={{ ...panel, padding: 10, minWidth: 0, borderColor: `${COLORS[index % COLORS.length]}66` }}>
                <div style={{ color: COLORS[index % COLORS.length], fontSize: 11, fontWeight: 950, overflowWrap: "anywhere" }}>{rank(player, index) === 1 ? "🏆 " : `#${rank(player, index) ?? "—"} · `}{player.name}</div>
                <div style={{ fontSize: 27, fontWeight: 1000, color: "#ffe19c", fontVariantNumeric: "tabular-nums" }}>{format(player.finalCapital)}</div>
                <div style={{ fontSize: 10, color: "#bac4d2" }}>Capital final · {metric(player, "successfulContracts")}/{metric(player, "contractsPlayed")} contrats</div>
              </div>)}
            </div>
            {players.length === 2 ? <div style={{ ...panel, overflow: "hidden" }}>
              <div style={{ ...smallTitle, marginBottom: 10, textAlign: "center" }}>DUEL · COMPARATIF DES JOUEURS</div>
              <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(105px,1fr) minmax(0,1fr)", gap: 6, alignItems: "center" }}>
                <strong style={{ color: COLORS[0], textAlign: "center", overflowWrap: "anywhere", fontSize: 12 }}>{players[0].name}</strong>
                <span style={{ textAlign: "center", color: "#8e9daa", fontSize: 10 }}>STATISTIQUES</span>
                <strong style={{ color: COLORS[1], textAlign: "center", overflowWrap: "anywhere", fontSize: 12 }}>{players[1].name}</strong>
                {headToHead.map((item, idx) => <React.Fragment key={item.label}>
                  <div style={{ padding: "7px 0", textAlign: "center", fontWeight: 950, fontSize: 13, color: COLORS[0], background: idx % 2 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)" }}>{decorated(players[0], item.key, item.digits, item.suffix)}</div>
                  <div style={{ padding: "7px 0", textAlign: "center", fontSize: 9, color: "#d5bd9a", background: idx % 2 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)" }}>{item.label}</div>
                  <div style={{ padding: "7px 0", textAlign: "center", fontWeight: 950, fontSize: 13, color: COLORS[1], background: idx % 2 ? "rgba(255,255,255,.025)" : "rgba(255,255,255,.05)" }}>{decorated(players[1], item.key, item.digits, item.suffix)}</div>
                </React.Fragment>)}
              </div>
            </div> : <div style={panel}>
              <div style={{ ...smallTitle, marginBottom: 10 }}>COMPARATIF DES JOUEURS</div>
              <div style={{ overflowX: "auto", maxWidth: "100%", WebkitOverflowScrolling: "touch" }}>
                <table style={{ borderCollapse: "collapse", minWidth: 420, width: "100%", fontSize: 11, fontVariantNumeric: "tabular-nums" }}><thead><tr>{["Joueur","Capital","Gagnés","Perdus","Réussite","Flèches"].map((label) => <th key={label} scope="col" style={{ textAlign: label === "Joueur" ? "left" : "right", padding: 8, color: GOLD, borderBottom: "1px solid rgba(255,255,255,.2)" }}>{label}</th>)}</tr></thead><tbody>{players.map((p, i) => <tr key={p.id}><th scope="row" style={{ textAlign: "left", padding: 8, color: COLORS[i % COLORS.length], overflowWrap: "anywhere" }}>{p.name}</th>{[metric(p,"finalCapital"), metric(p,"pointsWon"), metric(p,"capitalLost"), decorated(p,"successRate",1,"%"), metric(p,"dartsThrown")].map((v, j) => <td key={j} style={{ textAlign: "right", padding: 8, borderBottom: "1px solid rgba(255,255,255,.07)" }}>{v}</td>)}</tr>)}</tbody></table>
              </div>
            </div>}
            {!players.length && <p style={{ color: "#e5cba5" }}>Aucun joueur identifiable dans cette sauvegarde.</p>}
          </div>}
          {tab === "contrats" && (contracts.length ? <div style={{ display: "grid", gap: 8 }}>
            <p style={{ margin: 0, fontSize: 11, color: "#c4cddd" }}>Chaque cellule reprend le capital enregistré après le contrat. Vert fluo : validé · Orange : échec · Tiret : volée absente.</p>
            <CapitalContractMatrix participants={chartPlayers} contracts={contracts} visits={visits} scores={data.journalComplete && players.every((p) => p.finalCapital !== null) ? scores : undefined} compact />
          </div> : <p>Liste des contrats indisponible dans l'enregistrement.</p>)}
          {tab === "evolution" && (visits.length && contracts.length && players.length ?
            <div style={{ minWidth: 0, margin: "-12px -8px 0" }}><CapitalMatchRecap players={chartPlayers} scores={scores} contracts={contracts} visits={visits} contractLabel={labelFor} /></div> :
            <div style={panel}>Évolution indisponible : cette sauvegarde ne contient pas de journal de volées exploitable.</div>)}
        </div>
      </section>
    </div>, document.body,
  );
}
