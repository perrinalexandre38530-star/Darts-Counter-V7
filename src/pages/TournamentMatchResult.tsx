
// @ts-nocheck
import React from "react";
import { History } from "../lib/history";
import { getTournamentLocal, listMatchesForTournamentLocal } from "../lib/tournaments/storeLocal";
import type { Tournament, TournamentMatch } from "../lib/tournaments/types";

const THEME = "#ffcf57";

function fmtDate(ts?: number) {
  if (!ts) return "—";
  try {
    const d = new Date(ts);
    return d.toLocaleDateString() + " " + d.toLocaleTimeString().slice(0, 5);
  } catch {
    return "—";
  }
}

function getInitials(name?: string) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  const a = (parts[0]?.[0] || "").toUpperCase();
  const b = (parts[1]?.[0] || parts[0]?.[1] || "").toUpperCase();
  return (a + b) || "?";
}

function Avatar({ name, avatarUrl, size = 56 }: any) {
  return (
    <div style={{ width: size, height: size, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>
      {avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontWeight: 950 }}>{getInitials(name)}</div>}
    </div>
  );
}

function firstFinite(...vals: any[]) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function readScoreMap(obj: any, aId: string, bId: string) {
  if (!obj || typeof obj !== "object") return null;
  const a = firstFinite(obj?.[aId], obj?.a, obj?.A);
  const b = firstFinite(obj?.[bId], obj?.b, obj?.B);
  if (a == null || b == null) return null;
  return { a: Math.max(0, Math.floor(a)), b: Math.max(0, Math.floor(b)) };
}

function readPlayersScore(players: any[], aId: string, bId: string, key: string) {
  if (!Array.isArray(players) || !players.length) return null;
  const pa = players.find((p: any) => String(p?.id || "") === String(aId));
  const pb = players.find((p: any) => String(p?.id || "") === String(bId));
  const a = firstFinite(pa?.[key]);
  const b = firstFinite(pb?.[key]);
  if (a == null || b == null) return null;
  return { a: Math.max(0, Math.floor(a)), b: Math.max(0, Math.floor(b)) };
}

function extractTournamentScore(source: any, aId: string, bId: string) {
  if (!source) return null;
  const directA = firstFinite(source?.scoreA, source?.aScore, source?.result?.a, source?.score?.a, source?.summary?.scoreA, source?.summary?.aScore);
  const directB = firstFinite(source?.scoreB, source?.bScore, source?.result?.b, source?.score?.b, source?.summary?.scoreB, source?.summary?.bScore);
  if (directA != null && directB != null) return { a: Math.floor(directA), b: Math.floor(directB), kind: "score" };

  const sets =
    readScoreMap(source?.setsWon, aId, bId) ||
    readScoreMap(source?.summary?.setsWon, aId, bId) ||
    readScoreMap(source?.payload?.setsWon, aId, bId) ||
    readScoreMap(source?.payload?.summary?.setsWon, aId, bId) ||
    readScoreMap(source?.payload?.state?.setsWon, aId, bId) ||
    readPlayersScore(source?.players, aId, bId, "setsWon") ||
    readPlayersScore(source?.payload?.players, aId, bId, "setsWon");
  if (sets) return { ...sets, kind: "sets" };

  const legs =
    readScoreMap(source?.legsWon, aId, bId) ||
    readScoreMap(source?.summary?.legsWon, aId, bId) ||
    readScoreMap(source?.payload?.legsWon, aId, bId) ||
    readScoreMap(source?.payload?.summary?.legsWon, aId, bId) ||
    readScoreMap(source?.payload?.state?.legsWon, aId, bId) ||
    readPlayersScore(source?.players, aId, bId, "legsWon") ||
    readPlayersScore(source?.payload?.players, aId, bId, "legsWon");
  if (legs) return { ...legs, kind: "legs" };

  if (source?.summary) {
    const nested = extractTournamentScore(source.summary, aId, bId);
    if (nested) return nested;
  }
  if (source?.payload) {
    const nested = extractTournamentScore(source.payload, aId, bId);
    if (nested) return nested;
  }
  return null;
}

function normalizeLegs(record: any, aId: string, bId: string) {
  const payload = record?.payload || {};
  const summary = record?.summary || {};
  const raw = payload?.legs || payload?.state?.legs || summary?.legs || payload?.summary?.legs || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((leg: any, idx: number) => {
    const score = extractTournamentScore(leg, aId, bId) || extractTournamentScore(leg?.summary, aId, bId);
    return {
      id: String(leg?.id || `leg_${idx+1}`),
      label: `Leg ${idx + 1}`,
      scoreA: score?.a ?? null,
      scoreB: score?.b ?? null,
      winnerId: leg?.winnerId || leg?.summary?.winnerId || null,
      stats: leg?.summary || leg?.stats || leg || null,
    };
  });
}

function normalizeSets(record: any, aId: string, bId: string) {
  const payload = record?.payload || {};
  const summary = record?.summary || {};
  const raw = payload?.sets || payload?.state?.sets || summary?.sets || payload?.summary?.sets || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((set: any, idx: number) => {
    const score = extractTournamentScore(set, aId, bId) || extractTournamentScore(set?.summary, aId, bId);
    const legs = Array.isArray(set?.legs)
      ? set.legs.map((leg: any, lidx: number) => {
          const lscore = extractTournamentScore(leg, aId, bId) || extractTournamentScore(leg?.summary, aId, bId);
          return {
            id: String(leg?.id || `set_${idx+1}_leg_${lidx+1}`),
            label: `Leg ${lidx + 1}`,
            scoreA: lscore?.a ?? null,
            scoreB: lscore?.b ?? null,
            winnerId: leg?.winnerId || leg?.summary?.winnerId || null,
            stats: leg?.summary || leg?.stats || leg || null,
          };
        })
      : [];
    return {
      id: String(set?.id || `set_${idx+1}`),
      label: `Set ${idx + 1}`,
      scoreA: score?.a ?? null,
      scoreB: score?.b ?? null,
      winnerId: set?.winnerId || set?.summary?.winnerId || null,
      legs,
      stats: set?.summary || set?.stats || set || null,
    };
  });
}

function StatTile({ label, value, accent = THEME }: any) {
  return (
    <div style={{ borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))" }}>
      <div style={{ fontSize: 10.5, opacity: 0.68, marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 950, color: accent, fontSize: 13.5 }}>{value}</div>
    </div>
  );
}

function PlayerHeader({ player, score, winner }: any) {
  return (
    <div style={{ flex: 1, minWidth: 0, borderRadius: 18, padding: 14, border: winner ? "1px solid rgba(127,226,169,0.45)" : "1px solid rgba(255,255,255,0.10)", background: winner ? "linear-gradient(180deg, rgba(127,226,169,0.18), rgba(255,255,255,0.04))" : "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))" }}>
      <div style={{ display: "grid", justifyItems: "center", gap: 8, textAlign: "center" }}>
        <Avatar name={player?.name} avatarUrl={player?.avatarDataUrl || player?.avatar || player?.avatarUrl || null} size={68} />
        <div style={{ fontWeight: 950, fontSize: 14, lineHeight: 1.15 }}>{player?.name || "Joueur"}</div>
        <div style={{ fontSize: 31, fontWeight: 1000, color: winner ? "#7fe2a9" : "#fff" }}>{score ?? "–"}</div>
      </div>
    </div>
  );
}

function DetailModal({ open, title, data, onClose }: any) {
  if (!open) return null;
  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", padding: 16 }}>
      <div onMouseDown={(e) => e.stopPropagation()} style={{ width: "min(760px, 96vw)", maxHeight: "90vh", overflow: "auto", borderRadius: 22, border: "1px solid rgba(255,255,255,0.12)", background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))", boxShadow: "0 24px 80px rgba(0,0,0,0.7)" }}>
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 1000, color: THEME }}>{title}</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>
        <div style={{ padding: 16 }}>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: 12, lineHeight: 1.45, color: "rgba(255,255,255,0.9)" }}>{JSON.stringify(data, null, 2)}</pre>
        </div>
      </div>
    </div>
  );
}

export default function TournamentMatchResult({ go, params }: any) {
  const tournamentId = String(params?.tournamentId || params?.id || "");
  const matchId = String(params?.matchId || "");
  const historyMatchId = String(params?.historyMatchId || "");
  const [loading, setLoading] = React.useState(true);
  const [tour, setTour] = React.useState<Tournament | null>(null);
  const [tm, setTm] = React.useState<TournamentMatch | null>(null);
  const [record, setRecord] = React.useState<any>(null);
  const [activeDetail, setActiveDetail] = React.useState<any>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      try {
        const t = tournamentId ? await getTournamentLocal(tournamentId) : null;
        const ms = tournamentId ? await listMatchesForTournamentLocal(tournamentId) : [];
        const m = (ms || []).find((x: any) => String(x?.id || "") === matchId) || null;
        let rec = null;
        if (historyMatchId) {
          try { rec = await (History as any)?.get?.(historyMatchId); } catch {}
        }
        if (alive) {
          setTour((t as any) || null);
          setTm((m as any) || null);
          setRecord(rec || null);
        }
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [tournamentId, matchId, historyMatchId]);

  const aId = String(tm?.aPlayerId || "");
  const bId = String(tm?.bPlayerId || "");
  const playersById = React.useMemo(() => {
    const out: Record<string, any> = {};
    const list = [...((((tour as any)?.players || []) as any[])), ...(((record?.players || []) as any[]))];
    for (const p of list) {
      const id = String(p?.id || "");
      if (!id) continue;
      out[id] = { ...(out[id] || {}), ...p };
    }
    return out;
  }, [tour, record]);

  const scoreInfo = React.useMemo(() => extractTournamentScore(record, aId, bId) || extractTournamentScore(tm, aId, bId), [record, tm, aId, bId]);
  const winnerId = String(record?.winnerId || tm?.winnerId || record?.summary?.winnerId || "");
  const bestOf = Number((tour as any)?.game?.rules?.bestOf ?? (tour as any)?.game?.bestOf ?? (tour as any)?.rules?.bestOf ?? (tour as any)?.bestOf ?? 1) || 1;
  const phaseLabel = String(params?.phaseLabel || "");
  const sets = React.useMemo(() => normalizeSets(record, aId, bId), [record, aId, bId]);
  const looseLegs = React.useMemo(() => (sets.length ? [] : normalizeLegs(record, aId, bId)), [record, aId, bId, sets]);

  const globalStatsRows = React.useMemo(() => {
    const summary = record?.summary || {};
    const legacy = summary?.legacy || {};
    const perPlayer = summary?.perPlayer || {};
    return [aId, bId].filter(Boolean).map((pid) => {
      const name = playersById?.[pid]?.name || "Joueur";
      const pp = perPlayer?.[pid] || {};
      const avg3 = firstFinite(summary?.avg3ByPlayer?.[pid], pp?.avg3, legacy?.avg3?.[pid], summary?.detailedByPlayer?.[pid]?.avg3) ?? "—";
      const darts = firstFinite(pp?.darts, legacy?.darts?.[pid], summary?.detailedByPlayer?.[pid]?.darts) ?? "—";
      const visits = firstFinite(pp?.visits, legacy?.visits?.[pid]) ?? "—";
      const bestVisit = firstFinite(summary?.bestVisitByPlayer?.[pid], pp?.bestVisit, legacy?.bestVisit?.[pid], summary?.detailedByPlayer?.[pid]?.bestVisit) ?? "—";
      const bestCheckout = firstFinite(summary?.bestCheckoutByPlayer?.[pid], pp?.bestCheckout, legacy?.bestCheckout?.[pid], summary?.detailedByPlayer?.[pid]?.bestCheckout) ?? "—";
      return { pid, name, avg3, darts, visits, bestVisit, bestCheckout };
    });
  }, [record, playersById, aId, bId]);

  if (loading) return <div style={{ minHeight: "100vh", padding: 16, background: "#05070c", color: "#fff" }}>Chargement…</div>;

  if (!tm) {
    return (
      <div style={{ minHeight: "100vh", padding: 16, background: "#05070c", color: "#fff" }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })} style={{ borderRadius: 999, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}>← Retour tournoi</button>
        <div style={{ marginTop: 16, fontWeight: 950 }}>Match introuvable</div>
        <div style={{ marginTop: 8, opacity: 0.78 }}>matchId={matchId || "—"} • historyMatchId={historyMatchId || "—"}</div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 96, background: "radial-gradient(circle at top, rgba(255,207,87,0.10), rgba(5,7,12,0) 42%), linear-gradient(180deg, rgba(10,10,14,0.98), rgba(5,7,12,1))", color: "#fff" }}>
      <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center", gap: 10 }}>
        <button onClick={() => go("tournament_view", { id: tournamentId })} style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: THEME, cursor: "pointer", fontWeight: 950 }}>←</button>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontWeight: 1000, fontSize: 18, color: THEME }}>Détail du match</div>
          <div style={{ fontSize: 12, opacity: 0.76 }}>{fmtDate(record?.updatedAt || tm?.updatedAt)}</div>
          {!record ? <div style={{ fontSize: 11, opacity: 0.62, marginTop: 4 }}>Historique détaillé indisponible pour ce match — affichage du résumé tournoi.</div> : null}
        </div>
        <div />
      </div>

      <div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16, boxShadow: "0 20px 46px rgba(0,0,0,0.45)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
          <PlayerHeader player={playersById[aId]} score={scoreInfo?.a} winner={winnerId === aId} />
          <div style={{ width: 56, height: 56, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontWeight: 1000 }}>VS</div>
          <PlayerHeader player={playersById[bId]} score={scoreInfo?.b} winner={winnerId === bId} />
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}>
          <StatTile label="Format" value={`BO${bestOf}`} accent="#4fb4ff" />
          <StatTile label="Phase" value={phaseLabel || "—"} accent="#4fb4ff" />
          <StatTile label="Score final" value={scoreInfo ? `${scoreInfo.a} - ${scoreInfo.b}` : "—"} accent={THEME} />
          <StatTile label="Vainqueur" value={winnerId ? (playersById?.[winnerId]?.name || "—") : "—"} accent="#7fe2a9" />
        </div>
      </div>

      <div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16 }}>
        <div style={{ fontWeight: 1000, color: THEME, marginBottom: 10 }}>Stats globales du match</div>
        <div style={{ display: "grid", gap: 10 }}>
          {globalStatsRows.map((r: any) => (
            <div key={r.pid} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
              <div style={{ fontWeight: 950, marginBottom: 8 }}>{r.name}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8 }}>
                <StatTile label="Moy/3D" value={String(r.avg3)} accent="#7fe2a9" />
                <StatTile label="Darts" value={String(r.darts)} accent={THEME} />
                <StatTile label="Visites" value={String(r.visits)} accent="#4fb4ff" />
                <StatTile label="Best Visit" value={String(r.bestVisit)} accent="#ff8f2b" />
                <StatTile label="Best CO" value={String(r.bestCheckout)} accent="#ff4fd8" />
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16 }}>
        <div style={{ fontWeight: 1000, color: THEME, marginBottom: 10 }}>{sets.length ? "Sets / Legs" : "Legs"}</div>
        {sets.length ? (
          <div style={{ display: "grid", gap: 12 }}>
            {sets.map((s: any) => (
              <div key={s.id} style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
                <button onClick={() => setActiveDetail({ title: s.label, data: s.stats || s })} style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, border: "none", background: "transparent", color: "#fff", cursor: "pointer", padding: 0, textAlign: "left" }}>
                  <div style={{ fontWeight: 950 }}>{s.label}</div>
                  <div style={{ fontWeight: 1000, color: "#7fe2a9" }}>{s.scoreA ?? "–"} - {s.scoreB ?? "–"}</div>
                </button>
                {s.legs?.length ? (
                  <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
                    {s.legs.map((leg: any) => (
                      <button key={leg.id} onClick={() => setActiveDetail({ title: `${s.label} • ${leg.label}`, data: leg.stats || leg })} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.22)", color: "#fff", cursor: "pointer", padding: "10px 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                        <span>{leg.label}</span>
                        <b style={{ color: THEME }}>{leg.scoreA ?? "–"} - {leg.scoreB ?? "–"}</b>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        ) : looseLegs.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {looseLegs.map((leg: any) => (
              <button key={leg.id} onClick={() => setActiveDetail({ title: leg.label, data: leg.stats || leg })} style={{ borderRadius: 12, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(0,0,0,0.22)", color: "#fff", cursor: "pointer", padding: "12px 14px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
                <span style={{ fontWeight: 900 }}>{leg.label}</span>
                <b style={{ color: THEME }}>{leg.scoreA ?? "–"} - {leg.scoreB ?? "–"}</b>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, opacity: 0.76, lineHeight: 1.5 }}>
            Aucun découpage détaillé sets/legs n’a été trouvé dans l’historique pour ce match. Le score global et les stats finales sont bien reliés à l’historique du match.
          </div>
        )}
      </div>

      <DetailModal open={!!activeDetail} title={activeDetail?.title} data={activeDetail?.data} onClose={() => setActiveDetail(null)} />
    </div>
  );
}
