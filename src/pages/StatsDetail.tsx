// ============================================
// src/pages/StatsDetail.tsx — Détail d’une partie (style noir/or)
// Lit l'historique (History.list() ou store.history) et affiche
// un tableau de fin de manche façon "overlay de fin".
// - Si status === "in_progress" -> bouton "Ouvrir la partie" (resume)
// ============================================

import React from "react";
import type { Store } from "../lib/types";
import ProfileAvatar from "../components/ProfileAvatar";
import StatsGolfMatch from "./StatsGolfMatch";

// ---------- Thème local ----------
const T = {
  gold: "#F6C256",
  text: "#FFFFFF",
  text70: "rgba(255,255,255,.70)",
  edge: "rgba(255,255,255,.10)",
  card: "linear-gradient(180deg,rgba(17,18,20,.94),rgba(13,14,17,.92))",
};

// ---------- Types très permissifs ----------
type PlayerLite = { id: string; name?: string; avatarDataUrl?: string | null };
type SavedMatch = {
  id: string;
  resumeId?: string;
  kind?: "x01" | "cricket" | string;
  status?: "in_progress" | "finished" | string;
  players?: PlayerLite[];
  winnerId?: string | null;
  createdAt?: number;
  updatedAt?: number;
  summary?: any;     // objet sauvegardé en fin de manche
  payload?: any;     // état étendu si dispo
};

// ---------- Helpers sûrs ----------
const toArr = <T,>(v: any): T[] => (Array.isArray(v) ? (v as T[]) : []);
const toObj = <T,>(v: any): T => (v && typeof v === "object" ? (v as T) : ({} as T));
const N = (x: any, d = 0) => (Number.isFinite(Number(x)) ? Number(x) : d);
const fmtDate = (ts?: number) =>
  new Date(N(ts, Date.now())).toLocaleString();

function initialFrom(name?: string) {
  const n = (name || "").trim();
  if (!n) return "—";
  const p = n.split(/\s+/);
  return (p[0][0] + (p[1]?.[0] || "")).toUpperCase();
}

function getPlayer(players: PlayerLite[], id?: string | null) {
  if (!id) return undefined;
  return players.find((p) => p.id === id);
}

// ---------- Extraction souple depuis summary ----------
// On accepte plusieurs variantes de structure pour rester compatible.
function buildGolfViewModel(rec: SavedMatch) {
  const players = toArr<PlayerLite>(rec.players);
  const S = toObj<any>(rec.summary);
  const P = toObj<any>(rec.payload);
  const payloadSummary = toObj<any>(P?.summary);
  const rankingsRaw =
    toArr<any>(S?.rankings).length ? toArr<any>(S?.rankings) :
    toArr<any>(payloadSummary?.rankings).length ? toArr<any>(payloadSummary?.rankings) :
    toArr<any>(P?.rankings);

  const normId = (v: any) => String(v ?? "");
  const findByPid = (obj: any, pid: string) => {
    if (!obj) return null;
    if (Array.isArray(obj)) {
      return obj.find((x: any) => [x?.id, x?.playerId, x?.profileId].map(normId).includes(pid)) || null;
    }
    if (typeof obj === "object") {
      if (obj[pid] != null) return obj[pid];
      const key = Object.keys(obj).find((k) => normId(k) === pid);
      return key ? obj[key] : null;
    }
    return null;
  };
  const readNum = (v: any) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };
  const pick = (obj: any, keys: string[]) => {
    for (const k of keys) {
      if (obj && obj[k] != null) return readNum(obj[k]);
    }
    return 0;
  };

  const order = rankingsRaw.length
    ? rankingsRaw.map((it: any, idx: number) => ({
        playerId: String(it?.playerId ?? it?.id ?? it?.profileId ?? ""),
        rank: readNum(it?.rank ?? it?.place ?? it?.position) || idx + 1,
        score: readNum(it?.total ?? it?.score ?? it?.strokes ?? it?.points),
      }))
    : players.map((p, idx) => ({ playerId: p.id, rank: idx + 1, score: 0 }));

  const rows = order.map((o) => {
    const pid = o.playerId;
    const p = getPlayer(players, pid) || { id: pid, name: "Joueur" };
    const per =
      findByPid(P?.state?.statsByPlayer, pid) ||
      findByPid(S?.playerStats, pid) ||
      findByPid(S?.perPlayer, pid) ||
      findByPid(P?.playerStats, pid) ||
      findByPid(P?.statsByPlayer, pid) ||
      findByPid(payloadSummary?.playerStats, pid) ||
      findByPid(S?.players, pid) ||
      findByPid(payloadSummary?.players, pid) ||
      {};

    const ranking = rankingsRaw.find((x: any) => [x?.id, x?.playerId, x?.profileId].map(normId).includes(pid)) || {};
    const src = per && Object.keys(per).length ? per : ranking;

    return {
      playerId: pid,
      name: p.name || "Joueur",
      avatar: p.avatarDataUrl || null,
      rank: o.rank,
      total: o.score || pick(src, ["total", "score", "strokes", "points"]),
      simple: pick(src, ["s", "simple", "singles", "par"]),
      double: pick(src, ["d", "double", "doubles", "bogey"]),
      triple: pick(src, ["t", "triple", "triples", "doubleBogey"]),
      miss: pick(src, ["miss", "m", "misses"]),
      bull: pick(src, ["bull", "b"]),
      dbull: pick(src, ["dbull", "dBull", "doubleBull", "db"]),
      turns: pick(src, ["turns", "tours"]),
    };
  });

  return { players, rows };
}

function buildViewModel(rec: SavedMatch) {
  const players = toArr<PlayerLite>(rec.players);
  const S = toObj<any>(rec.summary);
  const P = toObj<any>(rec.payload);
  const PS = toObj<any>(P?.summary);
  const legacy = toObj<any>(S?.legacy ?? PS?.legacy);

  const asArray = (v: any): any[] => (Array.isArray(v) ? v : []);
  const normId = (v: any) => String(v ?? "");
  const findByPid = (src: any, pid: string) => {
    if (!src) return {};
    if (Array.isArray(src)) {
      return src.find((x: any) => [x?.id, x?.playerId, x?.profileId, x?.pid].map(normId).includes(pid)) || {};
    }
    if (typeof src === "object") {
      if (src[pid] != null) return src[pid] || {};
      const k = Object.keys(src).find((key) => normId(key) === pid);
      return k ? src[k] || {} : {};
    }
    return {};
  };
  const pickNum = (obj: any, keys: string[], d = 0) => {
    for (const k of keys) {
      const v = obj?.[k];
      if (v != null && Number.isFinite(Number(v))) return Number(v);
    }
    return d;
  };

  const rankings =
    asArray(S?.result?.order).length ? asArray(S?.result?.order) :
    asArray(S?.rankings).length ? asArray(S?.rankings) :
    asArray(S?.ranking).length ? asArray(S?.ranking) :
    asArray(S?.order).length ? asArray(S?.order) :
    asArray(PS?.rankings).length ? asArray(PS?.rankings) :
    asArray(PS?.ranking).length ? asArray(PS?.ranking) :
    asArray(P?.rankings).length ? asArray(P?.rankings) :
    [];

  const order = rankings.length
    ? rankings.map((it: any, idx: number) => {
        const pid = String(it?.id ?? it?.playerId ?? it?.profileId ?? it?.pid ?? it);
        const score = N(it?.score ?? it?.points ?? it?.remaining ?? legacy?.remaining?.[pid] ?? 0);
        return { playerId: pid, score, rank: N(it?.rank ?? it?.place ?? it?.position ?? idx + 1, idx + 1) };
      })
    : players.map((p, idx) => ({ playerId: p.id, score: N(legacy?.remaining?.[p.id] ?? 0), rank: idx + 1 }));

  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = S?.[k] ?? PS?.[k] ?? S?.stats?.[k] ?? S?.meta?.[k] ?? PS?.stats?.[k] ?? PS?.meta?.[k];
      if (v != null) return v;
    }
    return undefined;
  };

  const perPlayer = (pid: string) => {
    const fromSummaryPlayers = findByPid(S?.players, pid);
    if (Object.keys(fromSummaryPlayers).length) return fromSummaryPlayers;
    const fromPayloadPlayers = findByPid(PS?.players, pid);
    if (Object.keys(fromPayloadPlayers).length) return fromPayloadPlayers;
    const fromPer = findByPid(S?.perPlayer, pid);
    if (Object.keys(fromPer).length) return fromPer;
    const fromPayloadPer = findByPid(PS?.perPlayer, pid);
    if (Object.keys(fromPayloadPer).length) return fromPayloadPer;
    const fromDetailed = findByPid(S?.detailedByPlayer ?? PS?.detailedByPlayer, pid);
    if (Object.keys(fromDetailed).length) return fromDetailed;
    return {};
  };

  const winnerId = S?.winnerId ?? PS?.winnerId ?? rec.winnerId ?? order[0]?.playerId ?? null;
  const bestFromMap = (mapName: string) => {
    const m = S?.[mapName] ?? PS?.[mapName] ?? {};
    let bestPid: string | null = null;
    let best = 0;
    if (m && typeof m === "object") {
      for (const [pid, val] of Object.entries(m)) {
        const n = N(val);
        if (n > best) { best = n; bestPid = String(pid); }
      }
    }
    return { bestPid, best };
  };
  const bestVisitMap = bestFromMap("bestVisitByPlayer");
  const bestCoMap = bestFromMap("bestCheckoutByPlayer");
  const bestAvgMap = bestFromMap("avg3ByPlayer");

  const resume = {
    winnerId,
    minDartsSide: pick("minDartsSide", "minDartsPlayer") || null,
    minDarts: pick("minDarts", "fewestDarts") || null,
    bestVisitSide: pick("bestVisitSide", "bestVisitPlayer") || bestVisitMap.bestPid,
    bestVisit: pick("bestVisit", "maxVisit", "bestScore") ?? bestVisitMap.best,
    bestAvg3Side: pick("bestAvg3Side", "bestAverage3Player") || bestAvgMap.bestPid,
    bestAvg3: pick("bestAvg3", "average3Best", "avg3Best") ?? bestAvgMap.best,
    bestDbPctSide: pick("bestDbPctSide", "bestDoublePctPlayer") ?? null,
    bestDbPct: pick("bestDbPct", "doublePctBest", "pctDoubleBest") ?? null,
    bestTpPctSide: pick("bestTpPctSide", "bestTriplePctPlayer") ?? null,
    bestTpPct: pick("bestTpPct", "triplePctBest", "pctTripleBest") ?? null,
    bestBullSide: pick("bestBullSide", "bestBullPlayer") ?? null,
    bestBull: pick("bestBull", "bullBest") ?? null,
    bestCoSide: bestCoMap.bestPid,
    bestCo: bestCoMap.best,
  };

  const rows = order.map(({ playerId, score }) => {
    const p = getPlayer(players, playerId) || { id: playerId, name: "Joueur" };
    const pp = perPlayer(playerId);
    const detail = findByPid(S?.detailedByPlayer ?? PS?.detailedByPlayer, playerId);
    const src = { ...detail, ...pp };

    const darts = pickNum(src, ["darts", "_sumDarts", "throws"], N(legacy?.darts?.[playerId]));
    const visits = pickNum(src, ["visits", "_sumVisits", "turns", "rounds"], N(legacy?.visits?.[playerId]) || (darts ? Math.ceil(darts / 3) : 0));
    const points = pickNum(src, ["points", "_sumPoints"], N(legacy?.points?.[playerId]));
    const avg3 = pickNum(src, ["avg3", "average3", "avg_3", "avg3Darts"], N(legacy?.avg3?.[playerId]) || (darts ? (points / darts) * 3 : 0));
    const bestVisit = pickNum(src, ["bestVisit", "best_visit"], N(legacy?.bestVisit?.[playerId]));
    const bestCheckout = pickNum(src, ["bestCheckout", "best_co", "bestFinish", "co", "checkout"], N(legacy?.bestCheckout?.[playerId]));

    const sHits = pickNum(src, ["hitsS", "s", "S", "singles", "single"]);
    const dHits = pickNum(src, ["hitsD", "d", "D", "doubles", "double"], N(legacy?.doubles?.[playerId]));
    const tHits = pickNum(src, ["hitsT", "t", "T", "triples", "triple"], N(legacy?.triples?.[playerId]));
    const miss = pickNum(src, ["miss", "misses", "M"], N(legacy?.misses?.[playerId]));
    const bull = pickNum(src, ["bull", "bulls"], N(legacy?.bulls?.[playerId]));
    const dbull = pickNum(src, ["dBull", "dbull", "doubleBull"], N(legacy?.dbulls?.[playerId]));
    const bust = pickNum(src, ["bust", "busts"], N(legacy?.busts?.[playerId]));

    return {
      playerId,
      name: p.name || "Joueur",
      avatar: p.avatarDataUrl || null,
      score,
      visits,
      darts,
      avg3,
      avg1: darts ? points / darts : 0,
      co: bestCheckout,
      bestVisit,
      _60: N(src?.hit60 ?? src?.["60+"] ?? 0),
      _100: N(src?.hit100 ?? src?.["100+"] ?? 0),
      _140: N(src?.hit140 ?? src?.["140+"] ?? 0),
      _180: N(src?.hit180 ?? src?.["180"] ?? 0),
      s: sHits,
      db: dHits,
      tp: tHits,
      bull,
      dbull,
      miss,
      bust,
      winRate: winnerId && String(winnerId) === String(playerId) ? 100 : 0,
      dbPct: darts ? (dHits / darts) * 100 : 0,
      tpPct: darts ? (tHits / darts) * 100 : 0,
    };
  });

  return { players, order, resume, rows };
}

// ---------- Styles ----------
const page: React.CSSProperties = {
  minHeight: "100dvh",
  paddingBottom: 96,
  color: T.text,
  background: "radial-gradient(90% 120% at 50% -10%, #141517 0%, #0b0c0e 60%, #0b0c0e 100%)",
};

const header: React.CSSProperties = {
  position: "sticky",
  top: 0,
  zIndex: 30,
  background: "rgba(10,10,12,.6)",
  backdropFilter: "blur(10px)",
  borderBottom: `1px solid ${T.edge}`,
};

const row: React.CSSProperties = {
  background: T.card,
  border: `1px solid ${T.edge}`,
  borderRadius: 16,
  padding: 12,
  boxShadow: "0 10px 26px rgba(0,0,0,.35)",
};

const sectionTitle: React.CSSProperties = {
  fontWeight: 800,
  color: T.gold,
  letterSpacing: 0.2,
  padding: "6px 10px",
  borderRadius: 10,
  border: `1px solid ${T.edge}`,
  background: "rgba(255,255,255,.04)",
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

const grid2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: 8,
};

const pill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  padding: "4px 10px",
  borderRadius: 999,
  border: `1px solid ${T.edge}`,
  background: "rgba(255,255,255,.06)",
  fontSize: 12,
};

const table: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  fontSize: 13,
};

const thtd: React.CSSProperties = {
  borderBottom: `1px solid ${T.edge}`,
  padding: "8px 10px",
  textAlign: "left",
};

// ---------- Icônes inline ----------
const IconTrophy = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={T.gold}>
    <path d="M6 2h12v2h3a1 1 0 0 1 1 1v1a5 5 0 0 1-5 5h-1.1A6 6 0 0 1 13 13.9V16h3v2H8v-2h3v-2.1A6 6 0 0 1 8.1 11H7A5 5 0 0 1 2 6V5a1 1 0 0 1 1-1h3V2Z"/>
  </svg>
);

// ---------- Page ----------
export default function StatsDetail({
  store,
  matchId,
  initialRecord,
  go,
}: {
  store: Store;
  matchId: string;
  initialRecord?: SavedMatch | null;
  go: (to: string, params?: any) => void;
}) {
  const [record, setRecord] = React.useState<SavedMatch | null>(initialRecord ?? null);

  React.useEffect(() => {
    if (initialRecord && (initialRecord as any).id === matchId) {
      setRecord(initialRecord as SavedMatch);
      return;
    }

    (async () => {
      // 1) History API si dispo
      try {
        const API = (window as any).History;
        if (API?.list) {
          const list = await API.list();
          const hit = toArr<SavedMatch>(list).find((r) => r.id === matchId);
          if (hit) return setRecord(hit);
        }
      } catch {}
      // 2) Fallback store.history
      try {
        const anyStore = store as any;
        const hit = toArr<SavedMatch>(anyStore?.history).find(
          (r) => r.id === matchId
        );
        if (hit) return setRecord(hit);
      } catch {}
      setRecord(null);
    })();
  }, [store, matchId, initialRecord]);

  if (!record) {
    return (
      <div style={page}>
        <div style={header}>
          <div style={{ padding: 12 }}>
            <button
              onClick={() => go("stats")}
              style={{ ...pill, background: T.gold, color: "#141517", fontWeight: 700 }}
            >
              ← Retour
            </button>
          </div>
        </div>
        <div style={{ padding: 16 }}>
          <div style={{ ...row, color: T.text70 }}>
            Aucune donnée trouvée pour cette partie.
          </div>
        </div>
      </div>
    );
  }

  const isGolf = String(record.kind || "").toLowerCase() === "golf";
  const isInProgress = (record.status || "").toLowerCase().includes("progress");

  if (isGolf) {
    return <StatsGolfMatch record={record as any} go={go} />;
  }

  const vm = buildViewModel(record);

  return (
    <div style={page}>
      <div style={header}>
        <div style={{ padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => go("stats")}
            style={{ ...pill, background: T.gold, color: "#141517", fontWeight: 800 }}
          >
            ← Retour
          </button>

          {isInProgress && (
            <button
              onClick={() =>
                go("x01", { resumeId: record.resumeId || record.id })
              }
              style={{
                ...pill,
                background: "rgba(255,180,0,.15)",
                border: "1px solid rgba(255,180,0,.35)",
                color: T.gold,
                fontWeight: 700,
              }}
            >
              ▶ Reprendre (en cours)
            </button>
          )}

          <div style={{ marginLeft: "auto", opacity: 0.8, fontSize: 12 }}>
            {String(record.kind || "X01").toUpperCase()} — {fmtDate(record.updatedAt ?? record.createdAt)}
          </div>
        </div>
      </div>

      <div style={{ padding: 12, display: "grid", gap: 12 }}>

        {/* ===== Classement ===== */}
        <section style={row}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <div style={sectionTitle}>Classement</div>
            <div style={{ color: T.text70, fontSize: 12 }}>
              {isInProgress ? "Manche en cours" : "Manche terminée"}
            </div>
          </div>

          <div style={{ display: "grid", gap: 8 }}>
            {vm.order.map((o, idx) => {
              const p = getPlayer(vm.players, o.playerId) || { id: o.playerId, name: "Joueur" };
              const med = idx + 1;
              return (
                <div
                  key={p.id}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 48px 1fr auto",
                    alignItems: "center",
                    gap: 10,
                    padding: "8px 10px",
                    borderRadius: 12,
                    background: "rgba(255,255,255,.03)",
                    border: `1px solid ${T.edge}`,
                  }}
                >
                  <div style={{
                    width: 36, height: 28, borderRadius: 8,
                    display: "grid", placeItems: "center",
                    background: med === 1 ? "rgba(246,194,86,.15)" : "rgba(255,255,255,.06)",
                    color: med === 1 ? T.gold : T.text70, fontWeight: 800
                  }}>
                    {med}
                  </div>

                  {/* Avatar */}
                  <div style={{ width: 48, height: 48, borderRadius: "50%", overflow: "hidden", boxShadow: "0 0 0 2px rgba(0,0,0,.35)" }}>
                    <ProfileAvatar id={p.id} size={48} />
                  </div>

                  <div style={{ fontWeight: 800 }}>{p.name || "Joueur"}</div>
                  <div style={{ fontWeight: 800, color: T.gold }}>{o.score ?? 0}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* ===== Résumé ===== */}
        <section style={row}>
          <div style={{ marginBottom: 10 }}>
            <div style={sectionTitle}>Résumé de la partie</div>
          </div>

          <div style={grid2}>
            {/* Colonne gauche */}
            <div style={{ display: "grid", gap: 8 }}>
              <KpiLine
                label="Vainqueur"
                left
                valueNode={
                  vm.resume.winnerId ? (
                    <span style={{ color: T.gold, fontWeight: 800, display: "inline-flex", alignItems: "center", gap: 6 }}>
                      <IconTrophy />
                      {getPlayer(vm.players, vm.resume.winnerId)?.name || "—"}
                    </span>
                  ) : "—"
                }
              />
              <KpiLine label="Best Moy./3D" value={vm.resume.bestAvg3} side={vm.resume.bestAvg3Side} />
              <KpiLine label="Best %DB" value={vm.resume.bestDbPct} side={vm.resume.bestDbPctSide} suffix="%" />
              <KpiLine label="Best BULL" value={vm.resume.bestBull} side={vm.resume.bestBullSide} />
            </div>

            {/* Colonne droite */}
            <div style={{ display: "grid", gap: 8 }}>
              <KpiLine label="Min Darts" value={vm.resume.minDarts} side={vm.resume.minDartsSide} />
              <KpiLine label="Best Volée" value={vm.resume.bestVisit} side={vm.resume.bestVisitSide} />
              <KpiLine label="Best %TP" value={vm.resume.bestTpPct} side={vm.resume.bestTpPctSide} suffix="%" />
              <div />
            </div>
          </div>
        </section>

        {/* ===== Stats rapides ===== */}
        <section style={row}>
          <div style={{ marginBottom: 10 }}><div style={sectionTitle}>Stats rapides</div></div>
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...thtd, width: 140 }}>Joueur</th>
                <th style={thtd}>Volées</th>
                <th style={thtd}>Darts</th>
                <th style={thtd}>Moy./3D</th>
                <th style={thtd}>CO</th>
                <th style={thtd}>60+</th>
                <th style={thtd}>100+</th>
                <th style={thtd}>140+</th>
                <th style={thtd}>180</th>
              </tr>
            </thead>
            <tbody>
              {vm.rows.map((r) => (
                <tr key={r.playerId}>
                  <td style={thtd}>
                    <span style={{ fontWeight: 700 }}>{r.name}</span>
                  </td>
                  <td style={thtd}>{r.visits}</td>
                  <td style={thtd}>{r.darts}</td>
                  <td style={thtd}>{r.avg3.toFixed ? r.avg3.toFixed(2) : r.avg3}</td>
                  <td style={thtd}>{r.co}</td>
                  <td style={thtd}>{r._60}</td>
                  <td style={thtd}>{r._100}</td>
                  <td style={thtd}>{r._140}</td>
                  <td style={thtd}>{r._180}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ===== Stats Darts ===== */}
        <section style={row}>
          <div style={{ marginBottom: 10 }}><div style={sectionTitle}>Stats Darts</div></div>
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...thtd, width: 140 }}>Joueur</th>
                <th style={thtd}>DB</th>
                <th style={thtd}>TP</th>
                <th style={thtd}>Bull</th>
                <th style={thtd}>DBull</th>
              </tr>
            </thead>
            <tbody>
              {vm.rows.map((r) => (
                <tr key={r.playerId}>
                  <td style={thtd}><b>{r.name}</b></td>
                  <td style={thtd}>{r.db}</td>
                  <td style={thtd}>{r.tp}</td>
                  <td style={thtd}>{r.bull}</td>
                  <td style={thtd}>{r.dbull}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* ===== Stats globales ===== */}
        <section style={row}>
          <div style={{ marginBottom: 10 }}><div style={sectionTitle}>Stats globales</div></div>
          <table style={table}>
            <thead>
              <tr>
                <th style={{ ...thtd, width: 140 }}>Joueur</th>
                <th style={thtd}>Moy./1D</th>
                <th style={thtd}>Moy./3D</th>
                <th style={thtd}>%DB</th>
                <th style={thtd}>%TP</th>
                <th style={thtd}>Win%</th>
              </tr>
            </thead>
            <tbody>
              {vm.rows.map((r) => (
                <tr key={r.playerId}>
                  <td style={thtd}><b>{r.name}</b></td>
                  <td style={thtd}>{(r.avg1 ?? 0).toFixed ? (r.avg1 as number).toFixed(2) : r.avg1 ?? 0}</td>
                  <td style={thtd}>{r.avg3.toFixed ? r.avg3.toFixed(2) : r.avg3}</td>
                  <td style={thtd}>{(r.dbPct ?? 0).toFixed ? (r.dbPct as number).toFixed(1) : r.dbPct ?? 0}%</td>
                  <td style={thtd}>{(r.tpPct ?? 0).toFixed ? (r.tpPct as number).toFixed(1) : r.tpPct ?? 0}%</td>
                  <td style={thtd}>{(r.winRate ?? 0).toFixed ? (r.winRate as number).toFixed(1) : r.winRate ?? 0}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

// ---------- Lignes KPI (label + valeur + “côté” joueur gagnant du KPI) ----------
function KpiLine({
  label,
  value,
  valueNode,
  side,
  suffix,
  left,
}: {
  label: string;
  value?: any;
  valueNode?: React.ReactNode;
  side?: string | null;
  suffix?: string;
  left?: boolean;
}) {
  const val =
    valueNode ??
    (value == null || value === ""
      ? "—"
      : `${value}${suffix || ""}`);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: left ? "1fr auto" : "1fr auto",
        gap: 8,
        alignItems: "center",
        border: `1px solid ${T.edge}`,
        borderRadius: 12,
        padding: "8px 10px",
        background: "rgba(255,255,255,.03)",
      }}
    >
      <div style={{ color: T.text70 }}>{label}</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <div style={{ fontWeight: 800 }}>{val}</div>
        {side ? (
          <span
            style={{
              ...pill,
              padding: "2px 8px",
              color: T.gold,
              borderColor: "rgba(255,180,0,.35)",
              background: "rgba(255,180,0,.10)",
            }}
            title="Meilleur joueur sur ce critère"
          >
            {side}
          </span>
        ) : null}
      </div>
    </div>
  );
}
