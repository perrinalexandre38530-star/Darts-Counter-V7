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

function firstFinite(...vals: any[]) {
  for (const v of vals) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function avg(nums: any[]) {
  const arr = (nums || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
  return arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 100) / 100 : null;
}

function maxv(nums: any[]) {
  const arr = (nums || []).map((x) => Number(x)).filter((x) => Number.isFinite(x));
  return arr.length ? Math.max(...arr) : null;
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

function normalizeLegStats(detail: any, aId: string, bId: string) {
  const src = detail?.summary || detail?.stats || detail || {};
  const perPlayer = src?.perPlayer || {};
  return {
    [aId]: {
      avg3: firstFinite(src?.avg3ByPlayer?.[aId], perPlayer?.[aId]?.avg3) ?? "—",
      darts: firstFinite(perPlayer?.[aId]?.darts) ?? "—",
      visits: firstFinite(perPlayer?.[aId]?.visits) ?? "—",
      bestVisit: firstFinite(src?.bestVisitByPlayer?.[aId], perPlayer?.[aId]?.bestVisit) ?? "—",
      bestCheckout: firstFinite(src?.bestCheckoutByPlayer?.[aId], perPlayer?.[aId]?.bestCheckout) ?? "—",
    },
    [bId]: {
      avg3: firstFinite(src?.avg3ByPlayer?.[bId], perPlayer?.[bId]?.avg3) ?? "—",
      darts: firstFinite(perPlayer?.[bId]?.darts) ?? "—",
      visits: firstFinite(perPlayer?.[bId]?.visits) ?? "—",
      bestVisit: firstFinite(src?.bestVisitByPlayer?.[bId], perPlayer?.[bId]?.bestVisit) ?? "—",
      bestCheckout: firstFinite(src?.bestCheckoutByPlayer?.[bId], perPlayer?.[bId]?.bestCheckout) ?? "—",
    },
  };
}

function normalizeVisit(v: any, idx: number) {
  const dartsRaw = Array.isArray(v?.darts) ? v.darts : Array.isArray(v?.throws) ? v.throws : Array.isArray(v?.hits) ? v.hits : [];
  const darts = dartsRaw.map((d: any) => {
    if (typeof d === "string") return d;
    return d?.label || d?.display || d?.text || d?.value || d?.score || "—";
  });
  return {
    id: String(v?.id || `visit_${idx + 1}`),
    total: firstFinite(v?.total, v?.score, v?.value, v?.points) ?? 0,
    darts,
    remainBefore: firstFinite(v?.remainBefore, v?.before, v?.startingScore),
    remainAfter: firstFinite(v?.remainAfter, v?.after, v?.remaining),
    bust: !!v?.bust,
    checkout: !!v?.checkout || !!v?.isCheckout,
  };
}

function extractVolleyHistory(detail: any, aId: string, bId: string) {
  const src = detail?.summary || detail?.stats || detail || {};
  const perPlayer = src?.perPlayer || {};
  const globalMap = src?.visitsHistoryByPlayer || src?.volleyHistoryByPlayer || src?.turnsByPlayer || {};
  const aRaw = globalMap?.[aId] || perPlayer?.[aId]?.visitsHistory || perPlayer?.[aId]?.volleyHistory || perPlayer?.[aId]?.turns || [];
  const bRaw = globalMap?.[bId] || perPlayer?.[bId]?.visitsHistory || perPlayer?.[bId]?.volleyHistory || perPlayer?.[bId]?.turns || [];
  return {
    [aId]: Array.isArray(aRaw) ? aRaw.map(normalizeVisit) : [],
    [bId]: Array.isArray(bRaw) ? bRaw.map(normalizeVisit) : [],
  };
}

function normalizeLegs(record: any, aId: string, bId: string) {
  const payload = record?.payload || {};
  const summary = record?.summary || {};
  const raw = payload?.legs || payload?.state?.legs || summary?.legs || payload?.summary?.legs || [];
  if (!Array.isArray(raw)) return [];
  return raw.map((leg: any, idx: number) => {
    const score = extractTournamentScore(leg, aId, bId) || extractTournamentScore(leg?.summary, aId, bId);
    return {
      id: String(leg?.id || `leg_${idx + 1}`),
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
            id: String(leg?.id || `set_${idx + 1}_leg_${lidx + 1}`),
            label: `Leg ${lidx + 1}`,
            scoreA: lscore?.a ?? null,
            scoreB: lscore?.b ?? null,
            winnerId: leg?.winnerId || leg?.summary?.winnerId || null,
            stats: leg?.summary || leg?.stats || leg || null,
          };
        })
      : [];
    return {
      id: String(set?.id || `set_${idx + 1}`),
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
  return <div style={{ borderRadius: 11, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))" }}><div style={{ fontSize: 10.5, opacity: 0.68, marginBottom: 6 }}>{label}</div><div style={{ fontWeight: 950, color: accent, fontSize: 13.5 }}>{value}</div></div>;
}

function Avatar({ name, avatarUrl, size = 56 }: any) {
  return <div style={{ width: size, height: size, borderRadius: 999, overflow: "hidden", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", display: "grid", placeItems: "center" }}>{avatarUrl ? <img src={avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <div style={{ fontWeight: 950 }}>{getInitials(name)}</div>}</div>;
}

function PlayerHeader({ player, score, winner }: any) {
  return <div style={{ flex: 1, minWidth: 0, borderRadius: 18, padding: 14, border: winner ? "1px solid rgba(127,226,169,0.45)" : "1px solid rgba(255,255,255,0.10)", background: winner ? "linear-gradient(180deg, rgba(127,226,169,0.18), rgba(255,255,255,0.04))" : "linear-gradient(180deg, rgba(255,255,255,0.07), rgba(255,255,255,0.03))" }}><div style={{ display: "grid", justifyItems: "center", gap: 6, textAlign: "center" }}><Avatar name={player?.name} avatarUrl={player?.avatarDataUrl || player?.avatar || player?.avatarUrl || null} size={68} /><div style={{ fontWeight: 950, fontSize: 12, lineHeight: 1.15 }}>{player?.name || "Joueur"}</div><div style={{ fontSize: 31, fontWeight: 1000, color: winner ? "#7fe2a9" : "#fff" }}>{score ?? "–"}</div></div></div>;
}

function StatsBlock({ title, player, stats }: any) {
  return <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}><div style={{ fontWeight: 950, marginBottom: 8 }}>{player?.name || title}</div><div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0,1fr))", gap: 8 }}><StatTile label="Moy/3D" value={String(stats?.avg3 ?? "—")} accent="#7fe2a9" /><StatTile label="Darts" value={String(stats?.darts ?? "—")} accent={THEME} /><StatTile label="Visites" value={String(stats?.visits ?? "—")} accent="#4fb4ff" /><StatTile label="Best Visit" value={String(stats?.bestVisit ?? "—")} accent="#ff8f2b" /><StatTile label="Best CO" value={String(stats?.bestCheckout ?? "—")} accent="#ff4fd8" /></div></div>;
}


function hitChipColor(label: string) {
  const txt = String(label || "").toUpperCase().trim();
  if (!txt || txt === "—") return { bg: "rgba(255,255,255,0.06)", bd: "rgba(255,255,255,0.08)", fg: "#fff" };
  if (txt === "BUST") return { bg: "rgba(255,140,43,0.20)", bd: "rgba(255,140,43,0.42)", fg: "#ff8f2b" };
  if (txt === "MISS" || txt === "M") return { bg: "rgba(255,91,91,0.16)", bd: "rgba(255,91,91,0.34)", fg: "#ff5b5b" };
  if (txt === "DBULL" || txt === "50") return { bg: "rgba(21,122,74,0.26)", bd: "rgba(21,122,74,0.48)", fg: "#157a4a" };
  if (txt === "BULL" || txt === "25") return { bg: "rgba(52,199,89,0.18)", bd: "rgba(52,199,89,0.38)", fg: "#34c759" };
  if (txt.startsWith("T")) return { bg: "rgba(155,89,255,0.18)", bd: "rgba(155,89,255,0.38)", fg: "#9b59ff" };
  if (txt.startsWith("D")) return { bg: "rgba(0,153,255,0.16)", bd: "rgba(0,153,255,0.38)", fg: "#0099ff" };
  return { bg: "rgba(255,207,87,0.16)", bd: "rgba(255,207,87,0.34)", fg: "#ffcf57" };
}

function HitChip({ label }: any) {
  const c = hitChipColor(label);
  const txt = String(label || "—");
  const len = txt.length;
  return (
    <div
      style={{
        minWidth: len >= 5 ? 46 : len >= 4 ? 40 : 36,
        width: "auto",
        height: 30,
        padding: len >= 5 ? "0 7px" : "0 6px",
        borderRadius: 12,
        display: "grid",
        placeItems: "center",
        background: c.bg,
        border: `1px solid ${c.bd}`,
        color: c.fg,
        fontWeight: 950,
        fontSize: len >= 5 ? 9.5 : len >= 4 ? 10.5 : 11,
        lineHeight: 1,
        boxShadow: "inset 0 1px 0 rgba(255,255,255,0.05)",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "clip",
        flex: "0 0 auto",
      }}
    >
      {txt}
    </div>
  );
}

function CompareStatRow({ label, left, right, leftAccent = "#7fe2a9", rightAccent = "#4fb4ff" }: any) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 120px 1fr", gap: 10, alignItems: "stretch" }}>
      <div style={{ borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))", display: "grid", alignItems: "center", justifyItems: "center" }}>
        <div style={{ fontWeight: 1000, color: leftAccent, fontSize: 20 }}>{left}</div>
      </div>
      <div style={{ borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.03)", display: "grid", alignItems: "center", justifyItems: "center", textAlign: "center" }}>
        <div style={{ fontSize: 12, opacity: 0.74 }}>{label}</div>
      </div>
      <div style={{ borderRadius: 14, padding: 12, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))", display: "grid", alignItems: "center", justifyItems: "center" }}>
        <div style={{ fontWeight: 1000, color: rightAccent, fontSize: 20 }}>{right}</div>
      </div>
    </div>
  );
}

function buildVolleyRows(aItems: any[], bItems: any[]) {
  const maxLen = Math.max(Array.isArray(aItems) ? aItems.length : 0, Array.isArray(bItems) ? bItems.length : 0);
  return Array.from({ length: maxLen }, (_, idx) => ({
    idx,
    left: Array.isArray(aItems) ? aItems[idx] || null : null,
    right: Array.isArray(bItems) ? bItems[idx] || null : null,
  }));
}

function VolleyCard({ item, idx }: any) {
  const darts = Array.isArray(item?.darts) ? item.darts.slice(0, 3) : [];
  while (darts.length < 3) darts.push("MISS");
  if (item?.bust && !darts.includes("BUST")) darts[darts.length - 1] = "BUST";

  return (
    <div
      style={{
        borderRadius: 16,
        border: "1px solid rgba(255,255,255,0.10)",
        background: "rgba(0,0,0,0.22)",
        padding: 8,
        display: "grid",
        gap: 8,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ fontWeight: 950, fontSize: 11.5, whiteSpace: "nowrap" }}>Volée {idx + 1}</div>
        <div style={{ fontWeight: 1000, fontSize: 12.5, color: THEME, whiteSpace: "nowrap" }}>{item?.total ?? 0}</div>
      </div>

      <div style={{ display: "flex", gap: 5, flexWrap: "nowrap", alignItems: "center", overflow: "hidden" }}>
        {darts.map((d: any, i: number) => (
          <HitChip key={i} label={d} />
        ))}
      </div>

      <div style={{ fontSize: 10, opacity: 0.82, display: "flex", justifyContent: "space-between", gap: 8, whiteSpace: "nowrap" }}>
        <span>Avant: <b>{item?.remainBefore ?? "—"}</b></span>
        <span>Après: <b>{item?.remainAfter ?? "—"}</b></span>
      </div>

      {item?.checkout || item?.bust ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {item?.checkout ? <span style={{ color: "#7fe2a9", fontWeight: 900, fontSize: 11.5 }}>Checkout</span> : null}
          {item?.bust ? <span style={{ color: "#ff8f2b", fontWeight: 900, fontSize: 11.5 }}>Bust</span> : null}
        </div>
      ) : null}
    </div>
  );
}

function DetailModal({ open, title, data, playersById, aId, bId, onClose }: any) {
  const [showStats, setShowStats] = React.useState(true);
  React.useEffect(() => {
    if (open) setShowStats(true);
  }, [open, title]);

  if (!open) return null;
  const score = { a: firstFinite(data?.scoreA, data?.summary?.scoreA) ?? "—", b: firstFinite(data?.scoreB, data?.summary?.scoreB) ?? "—" };
  const stats = normalizeLegStats(data, aId, bId);
  const volleys = extractVolleyHistory(data, aId, bId);
  const aPlayer = playersById?.[aId] || { name: "Joueur A" };
  const bPlayer = playersById?.[bId] || { name: "Joueur B" };
  const winnerId = String(data?.winnerId || data?.summary?.winnerId || "");

  return (
    <div onMouseDown={onClose} style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", padding: 16 }}>
      <div
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          width: "min(900px, 94vw)",
          height: "min(84vh, 860px)",
          borderRadius: 22,
          border: "1px solid rgba(255,255,255,0.12)",
          background: "linear-gradient(180deg, rgba(24,24,30,0.98), rgba(10,10,14,0.995))",
          boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
          display: "grid",
          gridTemplateRows: "auto 1fr",
        }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div style={{ fontWeight: 1000, color: THEME }}>{title}</div>
          <button onClick={onClose} style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer", fontSize: 18 }}>✕</button>
        </div>

        <div style={{ padding: 16, display: "grid", gap: 14, minHeight: 0, overflow: "hidden", gridTemplateRows: "auto auto auto 1fr" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}>
            <PlayerHeader player={aPlayer} score={score.a} winner={winnerId === aId} />
            <div style={{ width: 56, height: 56, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontWeight: 1000 }}>VS</div>
            <PlayerHeader player={bPlayer} score={score.b} winner={winnerId === bId} />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => setShowStats((v) => !v)}
              style={{
                borderRadius: 999,
                padding: "8px 12px",
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.06)",
                color: "#fff",
                cursor: "pointer",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              {showStats ? "Masquer les stats" : "Afficher les stats"}
            </button>
          </div>

          {showStats ? (
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12 }}>
              <div style={{ display: "grid", gap: 10 }}>
                <CompareStatRow label="Moy/3D" left={String(stats[aId]?.avg3 ?? "—")} right={String(stats[bId]?.avg3 ?? "—")} leftAccent="#7fe2a9" rightAccent="#7fe2a9" />
                <CompareStatRow label="Darts" left={String(stats[aId]?.darts ?? "—")} right={String(stats[bId]?.darts ?? "—")} leftAccent={THEME} rightAccent={THEME} />
                <CompareStatRow label="Visites" left={String(stats[aId]?.visits ?? "—")} right={String(stats[bId]?.visits ?? "—")} leftAccent="#4fb4ff" rightAccent="#4fb4ff" />
                <CompareStatRow label="Best Visit" left={String(stats[aId]?.bestVisit ?? "—")} right={String(stats[bId]?.bestVisit ?? "—")} leftAccent="#ff8f2b" rightAccent="#ff8f2b" />
                <CompareStatRow label="Best CO" left={String(stats[aId]?.bestCheckout ?? "—")} right={String(stats[bId]?.bestCheckout ?? "—")} leftAccent="#ff4fd8" rightAccent="#ff4fd8" />
              </div>
            </div>
          ) : null}

          {(volleys[aId]?.length || volleys[bId]?.length) ? (
            <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, minHeight: 0, overflow: "hidden", display: "grid", gridTemplateRows: "auto 1fr", gap: 8 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, alignItems: "center" }}>
                <div style={{ fontWeight: 950 }}>{aPlayer?.name || "Joueur A"}</div>
                <div style={{ fontWeight: 950, textAlign: "right" }}>{bPlayer?.name || "Joueur B"}</div>
              </div>
              <div style={{ minHeight: 0, overflowY: "auto", paddingRight: 4 }}>
                <div style={{ display: "grid", gap: 8, alignItems: "start" }}>
                  {buildVolleyRows(volleys[aId] || [], volleys[bId] || []).map((row: any) => (
                    <div key={`row_${row.idx}`} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, alignItems: "start" }}>
                      {row.left ? <VolleyCard item={row.left} idx={row.idx} /> : <div />}
                      {row.right ? <VolleyCard item={row.right} idx={row.idx} /> : <div />}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}



function buildLegTimelineItems(sets: any[], looseLegs: any[], opts?: any) {
  const out: any[] = [];
  const aId = String(opts?.aId || "");
  const bId = String(opts?.bId || "");
  const winnerId = String(opts?.winnerId || "");
  const finalScoreA = Math.max(0, Math.floor(Number(opts?.finalScoreA || 0)));
  const finalScoreB = Math.max(0, Math.floor(Number(opts?.finalScoreB || 0)));
  const bestOf = Math.max(1, Math.floor(Number(opts?.bestOf || 1)));
  const winsNeeded = Math.max(1, Math.floor(bestOf / 2) + 1);
  let accA = 0;
  let accB = 0;

  const pushLeg = (leg: any, fallbackLabel: string, id: string) => {
    const legWinnerId = String(leg?.winnerId || leg?.stats?.winnerId || leg?.detail?.winnerId || "");
    const rawA = Number.isFinite(Number(leg?.scoreA)) ? Number(leg.scoreA) : null;
    const rawB = Number.isFinite(Number(leg?.scoreB)) ? Number(leg.scoreB) : null;

    let nextA = accA;
    let nextB = accB;

    if (legWinnerId === aId) nextA += 1;
    else if (legWinnerId === bId) nextB += 1;
    else if (rawA != null && rawB != null && rawA >= accA && rawB >= accB && rawA + rawB === accA + accB + 1) {
      nextA = rawA;
      nextB = rawB;
    } else if (rawA != null && rawB != null) {
      nextA = Math.max(accA, rawA);
      nextB = Math.max(accB, rawB);
    }

    if (nextA > finalScoreA || nextB > finalScoreB) return;
    if (out.length && (accA >= winsNeeded || accB >= winsNeeded)) return;

    accA = nextA;
    accB = nextB;

    out.push({
      id,
      label: leg?.label || fallbackLabel,
      scoreA: accA,
      scoreB: accB,
      detail: leg?.stats || leg,
    });
  };

  if (Array.isArray(sets) && sets.length) {
    sets.forEach((s: any, sIdx: number) => {
      const legs = Array.isArray(s?.legs) ? s.legs : [];
      legs.forEach((leg: any, lIdx: number) => {
        pushLeg(leg, `${s?.label || `Set ${sIdx + 1}`} • ${leg?.label || `Leg ${lIdx + 1}`}`, String(leg?.id || `set_${sIdx + 1}_leg_${lIdx + 1}`));
      });
    });
  } else {
    (Array.isArray(looseLegs) ? looseLegs : []).forEach((leg: any, idx: number) => {
      pushLeg(leg, leg?.label || `Leg ${idx + 1}`, String(leg?.id || `leg_${idx + 1}`));
    });
  }

  if (!out.length && finalScoreA >= 0 && finalScoreB >= 0 && winnerId) {
    const winnerWins = winnerId === aId ? finalScoreA : finalScoreB;
    const loserWins = winnerId === aId ? finalScoreB : finalScoreA;
    const loserId = winnerId === aId ? bId : aId;
    const earlyWinnerWins = Math.max(0, winnerWins - 1);
    const sequence = [
      ...Array.from({ length: loserWins }, () => loserId),
      ...Array.from({ length: earlyWinnerWins }, () => winnerId),
      winnerId,
    ];
    accA = 0;
    accB = 0;
    sequence.forEach((pid, idx) => {
      if (pid === aId) accA += 1;
      else if (pid === bId) accB += 1;
      out.push({
        id: `fallback_leg_${idx + 1}`,
        label: `Leg ${idx + 1}`,
        scoreA: accA,
        scoreB: accB,
        detail: null,
      });
    });
  }

  if (out.length) {
    const last = out[out.length - 1];
    const looksWrong = last.scoreA !== finalScoreA || last.scoreB !== finalScoreB;
    if (looksWrong) {
      while (out.length && (out[out.length - 1].scoreA > finalScoreA || out[out.length - 1].scoreB > finalScoreB)) out.pop();
      const last2 = out[out.length - 1];
      if (last2 && (last2.scoreA !== finalScoreA || last2.scoreB !== finalScoreB)) {
        out[out.length - 1] = { ...last2, scoreA: finalScoreA, scoreB: finalScoreB };
      }
    }
  }

  return out;
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
        if (historyMatchId) { try { rec = await (History as any)?.get?.(historyMatchId); } catch {} }
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
    const list = [ ...((((tour as any)?.players || []) as any[])), ...((((tour as any)?.participants || []) as any[])), ...((((tour as any)?.bots || []) as any[])), ...(((record?.players || []) as any[])) ];
    for (const p of list) {
      const id = String(p?.id || "");
      if (!id) continue;
      const prev = out[id] || {};
      out[id] = {
        ...prev,
        ...p,
        id,
        name: p?.name || p?.label || p?.botName || prev?.name || "Joueur",
        avatarDataUrl: p?.avatarDataUrl || p?.avatar || p?.avatarUrl || p?.photo || p?.image || p?.img || p?.picture || prev?.avatarDataUrl || null,
        avatar: p?.avatar || p?.avatarDataUrl || p?.avatarUrl || p?.photo || p?.image || p?.img || p?.picture || prev?.avatar || null,
        avatarUrl: p?.avatarUrl || p?.avatarDataUrl || p?.avatar || p?.photo || p?.image || p?.img || p?.picture || prev?.avatarUrl || null,
      };
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

  const leftGlobal = globalStatsRows[0] || {};
  const rightGlobal = globalStatsRows[1] || {};
  const legTimeline = React.useMemo(() => buildLegTimelineItems(sets, looseLegs, { aId, bId, winnerId, finalScoreA: scoreInfo?.a, finalScoreB: scoreInfo?.b, bestOf }), [sets, looseLegs, aId, bId, winnerId, scoreInfo?.a, scoreInfo?.b, bestOf]);


  if (loading) return <div style={{ minHeight: "100vh", padding: 16, background: "#05070c", color: "#fff" }}>Chargement…</div>;
  if (!tm) return <div style={{ minHeight: "100vh", padding: 16, background: "#05070c", color: "#fff" }}><button onClick={() => go("tournament_view", { id: tournamentId })} style={{ borderRadius: 999, padding: "8px 12px", border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", cursor: "pointer" }}>← Retour tournoi</button><div style={{ marginTop: 16, fontWeight: 950 }}>Match introuvable</div></div>;

  return <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 96, background: "radial-gradient(circle at top, rgba(255,207,87,0.10), rgba(5,7,12,0) 42%), linear-gradient(180deg, rgba(10,10,14,0.98), rgba(5,7,12,1))", color: "#fff" }}><div style={{ display: "grid", gridTemplateColumns: "40px 1fr 40px", alignItems: "center", gap: 10 }}><button onClick={() => go("tournament_view", { id: tournamentId })} style={{ width: 40, height: 40, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", color: THEME, cursor: "pointer", fontWeight: 950 }}>←</button><div style={{ textAlign: "center" }}><div style={{ fontWeight: 1000, fontSize: 18, color: THEME }}>Détail du match</div><div style={{ fontSize: 12, opacity: 0.76 }}>{fmtDate(record?.updatedAt || tm?.updatedAt)}</div>{!record ? <div style={{ fontSize: 11, opacity: 0.62, marginTop: 4 }}>Historique détaillé indisponible pour ce match — affichage du résumé tournoi.</div> : null}</div><div /></div><div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16, boxShadow: "0 20px 46px rgba(0,0,0,0.45)" }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 12, alignItems: "center" }}><PlayerHeader player={playersById[aId]} score={scoreInfo?.a} winner={winnerId === aId} /><div style={{ width: 56, height: 56, borderRadius: 999, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.05)", display: "grid", placeItems: "center", fontWeight: 1000 }}>VS</div><PlayerHeader player={playersById[bId]} score={scoreInfo?.b} winner={winnerId === bId} /></div><div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(4, minmax(0,1fr))", gap: 10 }}><StatTile label="Format" value={`BO${bestOf}`} accent="#4fb4ff" /><StatTile label="Phase" value={phaseLabel || "—"} accent="#4fb4ff" /><StatTile label="Score final" value={scoreInfo ? `${scoreInfo.a} - ${scoreInfo.b}` : "—"} accent={THEME} /><StatTile label="Vainqueur" value={winnerId ? (playersById?.[winnerId]?.name || "—") : "—"} accent="#7fe2a9" /></div></div><div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16 }}>
        <div style={{ fontWeight: 1000, color: THEME, marginBottom: 10 }}>Stats globales du match</div>
        <div style={{ borderRadius: 16, border: "1px solid rgba(255,255,255,0.10)", background: "rgba(255,255,255,0.03)", padding: 12, display: "grid", gap: 8 }}>
          <CompareStatRow label="Moy/3D" left={leftGlobal?.avg3 ?? "—"} right={rightGlobal?.avg3 ?? "—"} leftAccent="#7fe2a9" rightAccent="#7fe2a9" />
          <CompareStatRow label="Darts" left={leftGlobal?.darts ?? "—"} right={rightGlobal?.darts ?? "—"} leftAccent={THEME} rightAccent={THEME} />
          <CompareStatRow label="Visites" left={leftGlobal?.visits ?? "—"} right={rightGlobal?.visits ?? "—"} leftAccent="#4fb4ff" rightAccent="#4fb4ff" />
          <CompareStatRow label="Best Visit" left={leftGlobal?.bestVisit ?? "—"} right={rightGlobal?.bestVisit ?? "—"} leftAccent="#ff8f2b" rightAccent="#ff8f2b" />
          <CompareStatRow label="Best CO" left={leftGlobal?.bestCheckout ?? "—"} right={rightGlobal?.bestCheckout ?? "—"} leftAccent="#ff4fd8" rightAccent="#ff4fd8" />
        </div>
      </div><div style={{ marginTop: 14, borderRadius: 22, border: "1px solid rgba(255,255,255,0.10)", background: "linear-gradient(180deg, rgba(20,20,26,0.96), rgba(10,10,14,0.98))", padding: 16 }}>
        <div style={{ fontWeight: 1000, color: THEME, marginBottom: 10 }}>Évolution du score</div>
        {legTimeline.length ? (
          <div style={{ display: "grid", gap: 8 }}>
            {legTimeline.map((leg: any) => (
              <button
                key={leg.id}
                onClick={() => setActiveDetail({ title: leg.label, data: leg.detail })}
                style={{
                  borderRadius: 12,
                  border: "1px solid rgba(255,255,255,0.10)",
                  background: "rgba(0,0,0,0.22)",
                  color: "#fff",
                  cursor: "pointer",
                  padding: "12px 14px",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                }}
              >
                <span style={{ fontWeight: 900, textAlign: "left" }}>{leg.label}</span>
                <b style={{ color: THEME, whiteSpace: "nowrap" }}>{leg.scoreA ?? "–"} - {leg.scoreB ?? "–"}</b>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: 12.5, opacity: 0.76, lineHeight: 1.5 }}>
            Aucune évolution de score détaillée n’a été trouvée dans l’historique pour ce match.
          </div>
        )}
      </div><DetailModal open={!!activeDetail} title={activeDetail?.title} data={activeDetail?.data} playersById={playersById} aId={aId} bId={bId} onClose={() => setActiveDetail(null)} /></div>;
}
