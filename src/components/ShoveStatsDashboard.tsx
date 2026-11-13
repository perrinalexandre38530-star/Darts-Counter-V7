import React from "react";
import { shoveTargets, shoveRuleSet } from "../lib/gameEngines/shoveAPennyTargets";
import { rankShovePlayers } from "../lib/gameEngines/shoveAPennyRanking";
import { deriveShoveMatchRecords } from "../lib/gameEngines/shoveAPennyRecords";
import "./ShoveStatsDashboard.css";

const PALETTE = ["#ffc34d", "#60c9ff", "#dc99ff", "#83e4b8", "#ff9b91", "#a7caed"];
const SOFT = "#aeb8c9";
const avatarOf = (p: any): string | null => p?.avatarDataUrl || p?.avatarUrl || p?.avatar || p?.photoDataUrl || null;
const num = (v: any) => Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0;
const pct = (v: number, total: number) => total ? Math.min(100, Math.round(v / total * 100)) : 0;
const oneDec = (v: number) => (Math.round(v * 10) / 10).toLocaleString("fr-FR", { maximumFractionDigits: 1 });
type TabId = "resume" | "marques" | "evolution" | "comparatif" | "records";
const TABS: ReadonlyArray<{ id: TabId; label: string }> = [
  { id: "resume", label: "RÉSUMÉ" }, { id: "marques", label: "MARQUES" },
  { id: "evolution", label: "ÉVOLUTION" }, { id: "comparatif", label: "COMPARATIF" },
  { id: "records", label: "RECORDS" },
];

/** Same monochrome, outlined bottom-nav icon treatment used by CAPITAL. */
function TabIcon({ id, size = 21 }: { id: TabId; size?: number }) {
  const line = { stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round", fill: "none" } as const;
  const paths: Record<TabId, React.ReactNode> = {
    resume: <><path {...line} d="M3 20h18M5 17V11h3v6M11 17V4h3v13M17 17V8h3v9" /></>,
    marques: <><rect {...line} x="3" y="3" width="18" height="18" rx="2"/><path {...line} d="M3 9h18M3 15h18M9 3v18M15 3v18"/></>,
    evolution: <><path {...line} d="m3 17 6-6 4 3 7-9M15 5h5v5M3 21h18"/></>,
    comparatif: <><path {...line} d="M12 3v18M5 7h14M6 8l-3 5h6L6 8ZM18 8l-3 5h6l-3-5ZM8 21h8"/></>,
    records: <><path {...line} d="M8 5h8l-1 6a3 3 0 0 1-6 0L8 5ZM8 6H5c0 4 1 5 4 5M16 6h3c0 4-1 5-4 5M12 14v5M8 21h8M10 19h4"/></>,
  };
  return <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">{paths[id]}</svg>;
}

/** Live and final statistics use only the committed Wave61 match state. */
export default function ShoveStatsDashboard({ state, profiles = [], accent = "#ffc34d", activePlayerId, isFinal = false, compactHeader = false }: {
  state: any; profiles?: any[]; accent?: string; activePlayerId?: string; isFinal?: boolean; compactHeader?: boolean;
}) {
  const [tab, setTab] = React.useState<TabId>("resume");
  const [selectedPlayerId, setSelectedPlayerId] = React.useState<string | null>(null);
  const targets = shoveTargets(shoveRuleSet(state?.config?.modeOptions?.ruleSet));
  const required = Math.max(2, Math.min(5, num(state?.config?.modeOptions?.marksPerBox) || 3));
  const goal = required * targets.length;
  const playerIds = rankShovePlayers(state);
  const profileMap = new Map((profiles || []).map((p: any) => [String(p.id), p]));
  const visits: any[] = Array.isArray(state?.visits) ? state.visits : [];
  const history: any[] = Array.isArray(state?.special?.shoveHistory) ? state.special.shoveHistory : [];
  const rows = playerIds.map((id: string, index: number) => {
    const participant = state?.players?.find((p: any) => String(p.id) === id) || {};
    const profile: any = profileMap.get(id) || participant;
    const st = state?.statsByPlayer?.[id] || {};
    const marks = state?.special?.shoveMarksByPlayer?.[id] || {};
    const total = targets.reduce((sum, n) => sum + num(marks[String(n)]), 0);
    const closed = targets.filter((n) => num(marks[String(n)]) >= required).length;
    const darts = num(st.darts), misses = num(st.misses);
    const hits = Math.max(0, num(st.hits));
    return {
      id, name: String(profile.name || participant.name || "Joueur"), avatar: avatarOf(profile),
      rank: index + 1, tone: PALETTE[index % PALETTE.length], marks, total, closed,
      darts, visits: num(st.visits), hits, misses, doubles: num(st.doubles), triples: num(st.triples),
      accuracy: pct(hits, darts), marksPerDart: darts ? total / darts : 0,
      bestVisit: num(st.bestVisit),
    };
  });
  const id = selectedPlayerId && rows.some((r) => r.id === selectedPlayerId) ? selectedPlayerId
    : rows.some((r) => r.id === String(activePlayerId)) ? String(activePlayerId) : rows[0]?.id;
  const selected = rows.find((r) => r.id === id) || rows[0];
  const selectedTone = selected?.tone || accent;
  const records = deriveShoveMatchRecords(state);
  const gains = history.filter((h) => String(h.playerId) === String(id)).slice(-15).map((h) => num(h.gained));
  const chartMax = Math.max(1, ...gains);
  const x = (index: number) => 17 + index * (gains.length > 1 ? 266 / (gains.length - 1) : 0);
  const y = (value: number) => 79 - (value / chartMax) * 61;
  const points = gains.map((n, i) => `${x(i)},${y(n)}`).join(" ");
  const impactRows: ReadonlyArray<[string, number, string]> = selected ? [
    ["SIMPLES", Math.max(0, selected.hits - selected.doubles - selected.triples), "#b7c4d3"],
    ["DOUBLES", selected.doubles, "#4fd1ff"],
    ["TRIPLES", selected.triples, "#fa80d8"],
    ["MISS", selected.misses, "#ff6574"],
  ] : [];
  const totalImpact = impactRows.reduce((sum, row) => sum + row[1], 0);
  const kpis = selected ? [
    ["CASES FERMÉES", `${selected.closed}/${targets.length}`],
    ["MARQUES", `${selected.total}/${goal}`],
    ["PRÉCISION", `${selected.accuracy}%`],
    ["FLÉCHETTES", selected.darts],
    ["VOLÉES", selected.visits],
    ["MARQUES / FLÉCHETTE", oneDec(selected.marksPerDart)],
    ["DOUBLES", selected.doubles], ["TRIPLES", selected.triples], ["MISS", selected.misses],
  ] : [];

  return <section data-shove-stats-dashboard="v132" className="mss-shove-stats" style={{ "--shove-stats-accent": accent, "--shove-player-tone": selectedTone } as React.CSSProperties}>
    <header className="mss-shove-stats-head" style={compactHeader ? { justifyContent:"flex-end", marginTop:-4 } : undefined}>
      {!compactHeader ? <strong>STATISTIQUES SHOVE A PENNY</strong> : null}
      <span>{isFinal ? "BILAN FINAL" : "EN DIRECT"} · {visits.length} VOLÉES</span>
    </header>
    <nav role="tablist" aria-label="Statistiques SHOVE A PENNY" className="mss-shove-stats-tabs">
      {TABS.map(({ id: tabId, label }) => <button type="button" role="tab" key={tabId} aria-label={label}
        aria-selected={tab === tabId} aria-controls={`shove-stats-panel-${tabId}`}
        onClick={() => setTab(tabId)} className={tab === tabId ? "is-selected" : ""}>
        <TabIcon id={tabId}/>{tab === tabId ? <span>{label}</span> : null}
      </button>)}
    </nav>
    {tab !== "records" ? <div className="mss-shove-stats-players" aria-label="Joueur analysé">
      {rows.map((row) => <button key={row.id} type="button" aria-pressed={row.id === id} onClick={() => setSelectedPlayerId(row.id)}
        className={row.id === id ? "is-active" : ""} style={{ "--shove-player-tone": row.tone } as React.CSSProperties}>
        {row.avatar ? <img src={row.avatar} alt=""/> : <b>{row.name[0]}</b>}
        <span>{row.name}</span><small>{row.closed}/{targets.length}</small>
      </button>)}
    </div> : null}

    {tab === "resume" && <div role="tabpanel" id="shove-stats-panel-resume" className="mss-shove-stats-section">
      <div className="mss-shove-stats-kpis">{kpis.map(([label, value], i) => <div key={label} className="mss-shove-kpi" style={{ animationDelay: `${i * 35}ms` }}><span>{label}</span><strong>{value}</strong></div>)}</div>
      {selected && <div className="mss-shove-stats-panel">
        <h4>RÉPARTITION DES IMPACTS</h4>
        <div className="mss-shove-accuracy-layout">
          <div className="mss-shove-accuracy-ring" role="img" aria-label={`Précision ${selected.accuracy}%`}
            style={{ background: `conic-gradient(${selectedTone} ${selected.accuracy}%, #293446 ${selected.accuracy}% 100%)` }}>
            <div><strong>{selected.accuracy}%</strong><small>PRÉCISION</small></div>
          </div>
          <div className="mss-shove-impact-list">{impactRows.map(([label, value, tone]) => <div key={label}>
            <span style={{ color: tone }}>{label}</span><b>{value}</b>
            <div className="mss-shove-meter"><i style={{ width: `${pct(value, totalImpact)}%`, background: tone }} /></div>
          </div>)}</div>
        </div>
      </div>}
    </div>}

    {tab === "marques" && <div role="tabpanel" id="shove-stats-panel-marques" className="mss-shove-stats-section">
      <div className="mss-shove-stats-panel"><h4>MARQUES PAR CASE</h4>
        {selected ? <div className="mss-shove-sector-bars">{targets.map((target, i) => {
          const value = num(selected.marks[String(target)]);
          const closed = value >= required;
          return <div key={target} className="mss-shove-sector-bar" title={`${target === 25 ? "BULL" : target} : ${value}/${required} marques`}>
            <b>{value}</b><div className="mss-shove-sector-track"><i className={closed ? "is-closed" : ""} style={{ height: `${pct(value, required)}%`, animationDelay: `${i * 65}ms` }} /></div>
            <small>{target === 25 ? "BULL" : target}</small>
          </div>;
        })}</div> : null}
        <p className="mss-shove-chart-note">Une case se ferme uniquement après {required} marques ; les marques partielles restent visibles.</p>
      </div>
    </div>}

    {tab === "evolution" && <div role="tabpanel" id="shove-stats-panel-evolution" className="mss-shove-stats-section">
      <div className="mss-shove-stats-panel"><h4>ÉVOLUTION PAR VOLÉE</h4>
        {gains.length ? <>
          <svg viewBox="0 0 302 105" role="img" aria-label="Évolution des marques validées par volée" className="mss-shove-evolution-svg">
            {[18,48,79].map((z) => <line key={z} x1="15" y1={z} x2="286" y2={z} stroke="#465166" strokeWidth=".8" strokeDasharray="3 4" />)}
            <polygon fill={`${selectedTone}19`} points={`17,79 ${points} ${x(gains.length-1)},79`} />
            <polyline fill="none" stroke={selectedTone} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" points={points} className="mss-shove-evolution-line" />
            {gains.map((gain, i) => <g key={i} className="mss-shove-evolution-point" style={{ animationDelay: `${i * 50}ms` }}>
              <circle cx={x(i)} cy={y(gain)} r="4.2" fill={selectedTone} stroke="#090d16" strokeWidth="1.4"/>
              <text x={x(i)} y={Math.max(9, y(gain)-9)} fill="#f0f3fa" fontSize="9" textAnchor="middle">{gain}</text>
            </g>)}
          </svg><div className="mss-shove-evolution-caption">{gains.length} dernières volées · {gains.reduce((a,b)=>a+b,0)} marques</div>
        </> : <p className="mss-shove-chart-note">Le graphique apparaîtra après la première volée validée.</p>}
      </div>
    </div>}

    {tab === "comparatif" && <div role="tabpanel" id="shove-stats-panel-comparatif" className="mss-shove-stats-section">
      <div className="mss-shove-stats-panel"><h4>COMPARATIF DES JOUEURS</h4>
        {rows.map((row, i) => <div key={row.id} className="mss-shove-compare-row" style={{ "--compare-tone": row.tone } as React.CSSProperties}>
          <div><strong>#{i+1} · {row.name}</strong><span>{row.closed}/{targets.length} CASES</span></div>
          <div className="mss-shove-meter"><i style={{ width: `${pct(row.closed, targets.length)}%`, animationDelay: `${i * 75}ms` }} /></div>
          <small>{row.total}/{goal} marques · {row.accuracy}% précision · {row.darts} fléchettes</small>
        </div>)}
      </div>
    </div>}

    {tab === "records" && <div role="tabpanel" id="shove-stats-panel-records" data-shove-records-tab="1" className="mss-shove-stats-section">
      <div className="mss-shove-stats-panel"><h4>RECORDS DE CETTE PARTIE</h4>
        {records.length ? records.map((record, i) => <div key={record.id} className="mss-shove-record" style={{ animationDelay: `${i * 75}ms` }}>
          <div><strong>{record.label}</strong><span>{record.player}</span></div><b>{record.value}</b>
        </div>) : <p className="mss-shove-chart-note">Aucun record pour le moment. Les performances apparaîtront après plusieurs volées validées.</p>}
      </div>
    </div>}
  </section>;
}
