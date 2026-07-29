// @ts-nocheck
import React from "react";
import BackDot from "../components/BackDot";
import ProfileAvatar from "../components/ProfileAvatar";
import { History } from "../lib/history";
import { useTheme } from "../contexts/ThemeContext";

const SEGMENTS = [20, 19, 18, 17, 16, 15, 25];

type Props = {
  store: any;
  go: (route: any, params?: any) => void;
  params?: any;
};

function n(v: any, d = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : d;
}
function idOf(p: any) {
  return String(p?.id ?? p?.playerId ?? p?.profileId ?? "");
}
function nameOf(p: any) {
  return String(p?.name ?? p?.displayName ?? p?.username ?? "Joueur");
}
function compactOf(r: any) {
  return r?.payload?.compact ?? r?.payload?.payload?.compact ?? r?.compact ?? null;
}
function compactPlayer(r: any, pid: string) {
  const compact = compactOf(r);
  if (!compact || !Array.isArray(compact?.ps)) return null;
  const ids = Array.isArray(compact?.p) ? compact.p.map((x: any) => String(x ?? "")) : [];
  const idx = ids.findIndex((x: string) => x === pid || x.replace(/^online:/, "") === pid.replace(/^online:/, ""));
  if (idx < 0) return null;
  const row = compact.ps.find((x: any) => Number(x?.i) === idx) || compact.ps[idx] || null;
  return row ? { compact, idx, row } : null;
}
function compactGet(cp: any, ...keys: string[]) {
  if (!cp?.row) return 0;
  for (const key of keys) {
    const v = cp.row?.n?.[key] ?? cp.row?.h?.[key];
    const x = Number(v);
    if (Number.isFinite(x)) return x;
  }
  return 0;
}
function parseHit(hit: any) {
  if (!hit) return { ring: "MISS", segment: "MISS", marks: 0 };
  if (typeof hit === "object") {
    const ringRaw = String(hit.ring ?? hit.multiplier ?? hit.mult ?? "").toUpperCase();
    const segRaw = hit.segment ?? hit.target ?? hit.number ?? hit.value ?? "MISS";
    let ring = ringRaw;
    if (ring === "1") ring = "S";
    if (ring === "2") ring = Number(segRaw) === 25 ? "DB" : "D";
    if (ring === "3") ring = "T";
    if (ring === "SBULL") ring = "SB";
    if (ring === "DBULL") ring = "DB";
    if (!ring && segRaw === "MISS") ring = "MISS";
    const marks = n(hit.marks, ring === "T" ? 3 : ring === "D" || ring === "DB" ? 2 : ring === "MISS" ? 0 : 1);
    return { ...hit, ring, segment: segRaw, marks };
  }
  const s = String(hit).trim().toUpperCase();
  if (!s || s === "MISS" || s === "M" || s === "0") return { ring: "MISS", segment: "MISS", marks: 0 };
  if (s === "DBULL" || s === "D25" || s === "50") return { ring: "DB", segment: 25, marks: 2 };
  if (s === "SBULL" || s === "BULL" || s === "S25" || s === "25") return { ring: "SB", segment: 25, marks: 1 };
  const m = /^([SDT])(\d{1,2})$/.exec(s);
  if (m) return { ring: m[1], segment: Number(m[2]), marks: m[1] === "T" ? 3 : m[1] === "D" ? 2 : 1 };
  return { ring: "S", segment: Number(s) || s, marks: 1 };
}

function playerEvents(record: any, pid: string) {
  const payload = record?.payload || {};
  const raw = Array.isArray(payload?.cricketEvents)
    ? payload.cricketEvents
    : Array.isArray(payload?.cricketDartLog)
    ? payload.cricketDartLog
    : [];
  const direct = raw.filter((e: any) => String(e?.playerId ?? e?.profileId ?? e?.id ?? "") === pid);
  if (direct.length) return direct.map(parseHit);

  const cp = compactPlayer(record, pid);
  const ce = Array.isArray(cp?.compact?.d?.ce) ? cp.compact.d.ce : [];
  return ce
    .filter((e: any) => Number(e?.p) === Number(cp?.idx))
    .map((e: any) => parseHit({
      segment: e?.s,
      ring: e?.r,
      marks: e?.m,
      scoredPoints: e?.pts,
      inflictedPoints: e?.inf,
      visitIndex: e?.v,
      dartIndex: e?.d,
    }));
}

function mergePlayers(record: any) {
  const payloadPlayers = Array.isArray(record?.payload?.players) ? record.payload.players : [];
  const headerPlayers = Array.isArray(record?.players) ? record.players : [];
  const byId = new Map<string, any>();
  for (const p of headerPlayers) if (idOf(p)) byId.set(idOf(p), { ...p });
  for (const p of payloadPlayers) if (idOf(p)) byId.set(idOf(p), { ...(byId.get(idOf(p)) || {}), ...p });
  const compact = compactOf(record);
  if (compact && Array.isArray(compact.p)) {
    compact.p.forEach((pid: any, idx: number) => {
      const id = String(pid ?? "");
      if (!id) return;
      byId.set(id, { id, ...(byId.get(id) || {}), name: byId.get(id)?.name || compact?.pn?.[idx] || "Joueur" });
    });
  }
  return [...byId.values()];
}

function buildPlayerStats(record: any, p: any) {
  const pid = idOf(p);
  const cp = compactPlayer(record, pid);
  const cricket = p?.cricketStats || {};
  const leg = p?.legStats || {};
  const hitsRaw = Array.isArray(p?.hits) ? p.hits : [];
  const ev = playerEvents(record, pid);
  const parsedHits = hitsRaw.length ? hitsRaw.map(parseHit) : ev;

  const marksBySegment: Record<string, number> = {};
  for (const seg of SEGMENTS) {
    marksBySegment[String(seg)] = n(
      p?.marks?.[seg],
      n(leg?.perSegment?.[seg]?.marks, compactGet(cp, `mk_${seg}`, `legstats_persegme_${seg}_marks`, `leg_persegment_${seg}_marks`))
    );
  }
  if (!Object.values(marksBySegment).some((x) => x > 0) && parsedHits.length) {
    for (const h of parsedHits) {
      const seg = Number(h?.segment);
      if (SEGMENTS.includes(seg)) marksBySegment[String(seg)] = n(marksBySegment[String(seg)]) + n(h?.marks);
    }
  }

  const totalMarks = n(
    leg?.totalMarks,
    n(cricket?.totalMarks, n(p?.marksTotal, n(Object.values(marksBySegment).reduce((a: number, b: any) => a + n(b), 0), compactGet(cp, "legstats_totalmark", "leg_totalmarks", "markstotal"))))
  );
  const points = n(leg?.totalPoints, n(cricket?.totalPoints, n(p?.score, compactGet(cp, "legstats_totalpoin", "leg_totalpoints", "sc"))));
  const darts = n(leg?.darts, n(cricket?.darts, n(p?.darts, parsedHits.length || compactGet(cp, "legstats_darts", "leg_darts", "dt"))));
  const visits = n(leg?.visits, compactGet(cp, "legstats_visits", "leg_visits")) || (darts ? Math.ceil(darts / 3) : 0);
  const mpr = n(leg?.mpr, n(cricket?.mpr, compactGet(cp, "legstats_mpr", "leg_mpr"))) || (visits ? totalMarks / visits : 0);
  const hitRateRaw = n(leg?.hitRate, n(cricket?.hitRate, compactGet(cp, "legstats_hitrate", "leg_hitrate")));
  const hitCount = parsedHits.filter((h: any) => h.ring !== "MISS").length || n(cricket?.hitCount);
  const hitRate = hitRateRaw || (darts ? hitCount / darts : 0);
  const bestVisit = n(leg?.bestVisitMarks, n(cricket?.bestVisitMarks, compactGet(cp, "legstats_bestvisit", "leg_bestvisitmarks")));
  const closed = n(cricket?.closedSegments) || SEGMENTS.filter((seg) => n(marksBySegment[String(seg)]) >= 3).length;
  const damage = n(leg?.totalInflictedPoints, n(cricket?.cutThroatDamage, compactGet(cp, "legstats_totalinfl", "leg_totalinflicted")));

  const rings = { S: 0, D: 0, T: 0, BULL: 0, DBULL: 0, MISS: 0 };
  for (const h of parsedHits) {
    const r = String(h?.ring || "MISS").toUpperCase();
    if (r === "T") rings.T++;
    else if (r === "D") rings.D++;
    else if (r === "DB" || r === "DBULL") rings.DBULL++;
    else if (r === "SB" || r === "BULL" || r === "SBULL") rings.BULL++;
    else if (r === "MISS") rings.MISS++;
    else rings.S++;
  }

  const won = String(record?.winnerId ?? record?.payload?.winnerId ?? "") === pid || Number(cp?.compact?.w) === Number(cp?.idx);
  return { pid, p, points, darts, visits, totalMarks, mpr, hitRate, bestVisit, closed, damage, rings, marksBySegment, won, events: parsedHits };
}

function fmtPct(v: number) {
  return `${Math.round(n(v) * 1000) / 10}%`;
}

export default function CricketMatchDetail({ store, go, params }: Props) {
  const { theme } = useTheme();
  const matchId = String(params?.matchId ?? params?.id ?? params?.rec?.id ?? "");
  const [record, setRecord] = React.useState<any>(params?.rec ?? params?.matchPayload ?? null);
  const [loading, setLoading] = React.useState(!record);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!matchId) return;
      setLoading(true);
      try {
        const full = await History.get(matchId);
        if (alive && full) setRecord((prev: any) => ({ ...(prev || {}), ...full, payload: full?.payload ?? prev?.payload }));
      } catch {} finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [matchId]);

  const players = React.useMemo(() => mergePlayers(record || {}), [record]);
  const stats = React.useMemo(() => players.map((p) => buildPlayerStats(record || {}, p)), [record, players]);
  const winner = stats.find((x) => x.won)?.p ?? null;
  const payload = record?.payload || {};
  const variant = String(payload?.variantId ?? record?.variantId ?? payload?.scoringVariant ?? record?.scoringVariant ?? "classic").replace(/_/g, " ");
  const teamMode = Boolean(payload?.teamMode);
  const dateTs = n(record?.updatedAt, n(record?.createdAt, Date.now()));
  const detailedAvailable = stats.some((s) => s.darts > 0 || s.totalMarks > 0 || s.events.length > 0);
  const totalDarts = n(record?.summary?.darts) || stats.reduce((a, s) => a + s.darts, 0);

  const card: React.CSSProperties = {
    border: "1px solid rgba(62,217,95,.42)",
    borderRadius: 20,
    background: "linear-gradient(180deg, rgba(16,27,21,.96), rgba(7,12,10,.98))",
    boxShadow: "0 10px 30px rgba(0,0,0,.45), inset 0 0 28px rgba(49,220,91,.035)",
  };

  if (loading && !record) return <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: 20 }}>Chargement du match Cricket…</div>;

  return (
    <div style={{ minHeight: "100vh", background: theme.bg, color: theme.text, padding: "14px 12px 110px", boxSizing: "border-box" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", display: "grid", gap: 12 }}>
        <div style={{ ...card, padding: 14, borderColor: "rgba(255,206,56,.45)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <BackDot onClick={() => go("statsHub", { tab: "history" })} />
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: 12, fontWeight: 900, letterSpacing: 1.8, color: "#70ef89" }}>DÉTAIL DU MATCH</div>
              <div style={{ fontSize: 26, fontWeight: 1000, color: "#ffd34e", textShadow: "0 0 16px rgba(255,211,78,.35)" }}>CRICKET</div>
            </div>
            <div style={{ width: 42 }} />
          </div>
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, fontSize: 12 }}>
            <div><span style={{ opacity: .65 }}>Date</span><div style={{ fontWeight: 900 }}>{new Date(dateTs).toLocaleString("fr-FR")}</div></div>
            <div><span style={{ opacity: .65 }}>Variante</span><div style={{ fontWeight: 900, textTransform: "uppercase" }}>{variant}</div></div>
            <div><span style={{ opacity: .65 }}>Format</span><div style={{ fontWeight: 900 }}>{teamMode ? "ÉQUIPES" : "SOLO / MULTI"}</div></div>
            <div><span style={{ opacity: .65 }}>Fléchettes</span><div style={{ fontWeight: 900 }}>{totalDarts || "—"}</div></div>
          </div>
          <div style={{ marginTop: 10, padding: "10px 12px", borderRadius: 14, background: "rgba(255,211,78,.08)", border: "1px solid rgba(255,211,78,.2)", textAlign: "center" }}>
            <span style={{ opacity: .7 }}>Vainqueur : </span><strong style={{ color: "#ffd34e" }}>{winner ? nameOf(winner) : "—"}</strong>
          </div>
        </div>

        {!detailedAvailable && (
          <div style={{ ...card, padding: 12, borderColor: "rgba(255,178,56,.45)", color: "#ffd080", fontSize: 12, lineHeight: 1.45 }}>
            Cette ancienne sauvegarde ne contient plus le détail statistique du match. Le record historique est présent, mais son payload Cricket a été remplacé par un résumé léger. Le correctif empêche désormais cette perte lors des synchronisations.
          </div>
        )}

        {stats.map((s, idx) => {
          const profile = (store?.profiles || []).find((x: any) => String(x?.id) === s.pid) || s.p;
          return (
            <div key={s.pid || idx} style={{ ...card, padding: 14, borderColor: s.won ? "rgba(255,211,78,.58)" : "rgba(62,217,95,.32)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ width: 58, height: 58, flex: "0 0 auto" }}><ProfileAvatar profile={profile} size={58} /></div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 1000, color: s.won ? "#ffd34e" : "#7ff397" }}>{nameOf(s.p)}</div>
                  <div style={{ fontSize: 11, opacity: .65 }}>{s.won ? "🏆 VAINQUEUR" : `Joueur ${idx + 1}`}</div>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 8 }}>
                {[
                  ["POINTS", s.points], ["MARKS", s.totalMarks], ["MPR", s.mpr ? s.mpr.toFixed(2) : "—"],
                  ["FLÉCHETTES", s.darts || "—"], ["HIT RATE", s.darts ? fmtPct(s.hitRate) : "—"], ["BEST VISIT", s.bestVisit || "—"],
                  ["FERMÉS", s.closed], ["DAMAGE", s.damage], ["VOLÉES", s.visits || "—"],
                ].map(([label, value]) => (
                  <div key={String(label)} style={{ padding: "9px 6px", borderRadius: 13, background: "rgba(0,0,0,.28)", border: "1px solid rgba(255,255,255,.09)", textAlign: "center" }}>
                    <div style={{ fontSize: 9, opacity: .65, fontWeight: 900 }}>{label}</div>
                    <div style={{ marginTop: 2, fontSize: 17, fontWeight: 1000, color: "#68f28a" }}>{String(value)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 5 }}>
                {[["S",s.rings.S],["D",s.rings.D],["T",s.rings.T],["B",s.rings.BULL],["DB",s.rings.DBULL],["MISS",s.rings.MISS]].map(([label,value]) => (
                  <div key={String(label)} style={{ textAlign: "center", padding: "7px 2px", borderRadius: 10, background: "rgba(8,25,16,.75)", border: "1px solid rgba(62,217,95,.18)" }}>
                    <div style={{ fontSize: 9, opacity: .65 }}>{label}</div><div style={{ fontWeight: 1000 }}>{String(value)}</div>
                  </div>
                ))}
              </div>

              <div style={{ marginTop: 12, overflow: "hidden", borderRadius: 14, border: "1px solid rgba(255,255,255,.09)" }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", background: "rgba(0,0,0,.38)" }}>
                  {SEGMENTS.map((seg) => <div key={seg} style={{ padding: "7px 2px", textAlign: "center", fontSize: 10, fontWeight: 900 }}>{seg === 25 ? "BULL" : seg}</div>)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)" }}>
                  {SEGMENTS.map((seg) => <div key={seg} style={{ padding: "10px 2px", textAlign: "center", fontSize: 16, fontWeight: 1000, color: n(s.marksBySegment[String(seg)]) >= 3 ? "#ffd34e" : "#70ef89" }}>{n(s.marksBySegment[String(seg)])}</div>)}
                </div>
              </div>
            </div>
          );
        })}

        <button
          onClick={() => go("statsHub", { tab: "stats", initialStatsSubTab: "cricket", initialPlayerId: stats.find((x) => x.won)?.pid || stats[0]?.pid || null })}
          style={{ minHeight: 48, borderRadius: 16, border: "1px solid rgba(255,211,78,.55)", background: "linear-gradient(180deg,rgba(255,211,78,.18),rgba(255,211,78,.06))", color: "#ffe176", fontWeight: 1000, letterSpacing: .4 }}
        >
          OUVRIR LES STATS GLOBALES CRICKET
        </button>
      </div>
    </div>
  );
}
