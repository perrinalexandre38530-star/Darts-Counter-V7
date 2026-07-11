import React from "react";

type ClockMode = "classic" | "doubles" | "triples" | "sdt";

type ClockRow = {
  id: string;
  date: string;
  mode: ClockMode;
  darts: number;
  hits: number;
  targets: number;
  completed: boolean;
  elapsedMs: number;
  bestStreak: number;
  accuracy: number;
  dartSetId?: string | null;
  dartSetName?: string | null;
};

type Props = {
  records?: any[];
  playerId?: string | null;
  playerName?: string | null;
};

const CANONICAL_KEY = "dc_training_clock_stats_v1";
const LEGACY_KEY = "dc-training-clock-v1";
const TARGET_COUNT = 21;
const PINK = "#ff40b4";
const GOLD = "#f6c256";
const GREEN = "#63ed9c";
const BLUE = "#70d8ff";

function num(value: any, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function norm(value: any) {
  return String(value ?? "").trim().toLowerCase();
}

function normId(value: any) {
  return String(value ?? "").replace(/^online:/, "").trim();
}

function isClockRecord(record: any) {
  const tag = [
    record?.kind,
    record?.mode,
    record?.payload?.kind,
    record?.payload?.mode,
    record?.payload?.gameMode,
    record?.summary?.kind,
    record?.summary?.mode,
  ]
    .map(norm)
    .join("|");
  return tag.includes("clock") || tag.includes("horloge") || tag.includes("tour_de_l_horloge") || tag.includes("tour de l");
}

function arrayFrom(value: any): any[] {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.entries(value).map(([id, row]: any) => ({ id, ...(row || {}) }));
  return [];
}

function playerMatches(row: any, playerId: string, playerName: string) {
  const ids = [row?.id, row?.profileId, row?.playerId, row?.userId].map(normId).filter(Boolean);
  const names = [row?.name, row?.profileName, row?.playerName, row?.displayName, row?.nickname].map(norm).filter(Boolean);
  return (!!playerId && ids.includes(playerId)) || (!!playerName && names.includes(playerName));
}

function extractPlayer(record: any, playerId: string, playerName: string) {
  const pools = [
    record?.payload?.stats?.players,
    record?.payload?.players,
    record?.summary?.players,
    record?.summary?.perPlayer,
    record?.payload?.summary?.players,
    record?.payload?.summary?.perPlayer,
    record?.players,
  ];
  for (const pool of pools) {
    const hit = arrayFrom(pool).find((row) => playerMatches(row, playerId, playerName));
    if (hit) return hit;
  }
  return null;
}

function normalizeMode(value: any): ClockMode {
  const mode = norm(value);
  if (mode.includes("double")) return "doubles";
  if (mode.includes("triple")) return "triples";
  if (mode.includes("sdt") || mode.includes("s-d-t") || mode.includes("s · d · t")) return "sdt";
  return "classic";
}

function normalizeClockRow(source: any, fallbackId: string, fallbackDate: any): ClockRow {
  const special = source?.special || source?.stats || {};
  const session = source?.session || source?.payload?.session || {};
  const darts = num(source?.dartsThrown ?? source?.attempts ?? source?.throws ?? source?.darts?.thrown ?? session?.dartsThrown);
  const hits = num(source?.validHits ?? source?.hits ?? source?.darts?.hits ?? session?.validHits ?? session?.hits);
  const targets = Math.max(0, Math.min(TARGET_COUNT, num(source?.targetsCompleted ?? source?.targetsHit ?? special?.targetsCompleted ?? session?.targetsCompleted ?? session?.targetsHit, Math.min(TARGET_COUNT, hits))));
  const elapsedMs = num(source?.elapsedMs ?? special?.elapsedMs ?? session?.elapsedMs ?? (num(source?.totalTimeSec ?? session?.totalTimeSec) * 1000));
  const completed = Boolean(source?.completed ?? source?.win ?? session?.completed ?? targets >= TARGET_COUNT);
  const accuracy = darts > 0 ? Math.round((hits / darts) * 1000) / 10 : num(source?.accuracyPct ?? special?.accuracyPct ?? session?.accuracyPct);
  return {
    id: String(source?.id || session?.id || fallbackId),
    date: String(source?.endedAt || source?.updatedAt || source?.startedAt || source?.createdAt || fallbackDate || new Date().toISOString()),
    mode: normalizeMode(source?.config?.mode ?? special?.mode ?? session?.config?.mode),
    darts,
    hits,
    targets,
    completed,
    elapsedMs,
    bestStreak: num(source?.bestStreak ?? special?.bestStreak ?? session?.bestStreak),
    accuracy,
    dartSetId: source?.dartSetId != null ? String(source.dartSetId) : (special?.dartSetId != null ? String(special.dartSetId) : (session?.dartSetId != null ? String(session.dartSetId) : null)),
    dartSetName: source?.dartSetName != null ? String(source.dartSetName) : (special?.dartSetName != null ? String(special.dartSetName) : (session?.dartSetName != null ? String(session.dartSetName) : null)),
  };
}

function readLocalRows(playerId: string, playerName: string): ClockRow[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CANONICAL_KEY) || window.localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((row: any) => playerMatches(row, playerId, playerName))
      .map((row: any, index: number) => normalizeClockRow(row, `local-${index}`, row?.endedAt || row?.startedAt));
  } catch {
    return [];
  }
}

function readHistoryRows(records: any[], playerId: string, playerName: string): ClockRow[] {
  return (records || [])
    .filter(isClockRecord)
    .map((record, index) => {
      const player = extractPlayer(record, playerId, playerName);
      if (!player) return null;
      const session = record?.payload?.session || record?.summary?.session || record?.payload?.summary?.session || {};
      return normalizeClockRow(
        { ...session, ...player, id: session?.id || record?.id, session, config: session?.config || record?.payload?.config },
        String(record?.id || `history-${index}`),
        record?.updatedAt || record?.createdAt
      );
    })
    .filter(Boolean) as ClockRow[];
}

function formatDuration(ms: number) {
  if (!ms) return "—";
  const total = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function modeLabel(mode: ClockMode) {
  if (mode === "doubles") return "Doubles";
  if (mode === "triples") return "Triples";
  if (mode === "sdt") return "S · D · T";
  return "Classique";
}

function StatCard({ label, value, accent = GOLD, hint }: { label: string; value: React.ReactNode; accent?: string; hint?: string }) {
  return (
    <div style={{ borderRadius: 16, padding: 11, minHeight: 74, background: `radial-gradient(circle at 0% 0%, ${accent}22, transparent 58%), linear-gradient(180deg,#191a20,#0c0d11)`, border: `1px solid ${accent}55`, boxShadow: `0 0 16px ${accent}18`, minWidth: 0 }}>
      <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: .75, color: "rgba(255,255,255,.55)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{label}</div>
      <div style={{ marginTop: 5, fontSize: 21, lineHeight: 1, fontWeight: 1000, color: accent, textShadow: `0 0 12px ${accent}66`, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{value}</div>
      {hint ? <div style={{ marginTop: 5, fontSize: 9, color: "rgba(255,255,255,.42)" }}>{hint}</div> : null}
    </div>
  );
}

export default function StatsClockDashboard({ records = [], playerId, playerName }: Props) {
  const pid = normId(playerId);
  const pname = norm(playerName);
  const [storageVersion, setStorageVersion] = React.useState(0);

  React.useEffect(() => {
    const refresh = () => setStorageVersion((v) => v + 1);
    window.addEventListener("storage", refresh);
    window.addEventListener("dc-history-updated", refresh as EventListener);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("dc-history-updated", refresh as EventListener);
    };
  }, []);

  const rows = React.useMemo(() => {
    const historyRows = readHistoryRows(records, pid, pname);
    const localRows = readLocalRows(pid, pname);
    const all = [...historyRows, ...localRows];
    const dedup = new Map<string, ClockRow>();
    for (const row of all) {
      const key = String(row.id || `${row.date}-${row.mode}-${row.darts}-${row.targets}`);
      const existing = dedup.get(key);
      if (!existing || (row.hits + row.targets + row.darts) > (existing.hits + existing.targets + existing.darts)) dedup.set(key, row);
    }
    return [...dedup.values()].sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
  }, [records, pid, pname, storageVersion]);

  const agg = React.useMemo(() => {
    const sessions = rows.length;
    const completed = rows.filter((row) => row.completed).length;
    const darts = rows.reduce((sum, row) => sum + row.darts, 0);
    const hits = rows.reduce((sum, row) => sum + row.hits, 0);
    const targets = rows.reduce((sum, row) => sum + row.targets, 0);
    const totalTime = rows.reduce((sum, row) => sum + row.elapsedMs, 0);
    const finished = rows.filter((row) => row.completed);
    const timedFinished = finished.filter((row) => row.elapsedMs > 0);
    const bestTime = timedFinished.length ? Math.min(...timedFinished.map((row) => row.elapsedMs)) : 0;
    const bestDarts = finished.filter((row) => row.darts > 0).length ? Math.min(...finished.filter((row) => row.darts > 0).map((row) => row.darts)) : 0;
    const bestStreak = rows.length ? Math.max(...rows.map((row) => row.bestStreak)) : 0;
    const bestTargets = rows.length ? Math.max(...rows.map((row) => row.targets)) : 0;
    return {
      sessions,
      completed,
      completionRate: sessions ? Math.round((completed / sessions) * 1000) / 10 : 0,
      darts,
      hits,
      targets,
      accuracy: darts ? Math.round((hits / darts) * 1000) / 10 : 0,
      avgTargets: sessions ? Math.round((targets / sessions) * 10) / 10 : 0,
      avgDarts: sessions ? Math.round((darts / sessions) * 10) / 10 : 0,
      avgTime: sessions ? totalTime / sessions : 0,
      bestTime,
      bestDarts,
      bestStreak,
      bestTargets,
    };
  }, [rows]);

  const dartSets = React.useMemo(() => {
    const map = new Map<string, { id: string; name: string; sessions: number; completed: number; darts: number; hits: number; bestTargets: number; bestTime: number; }>();
    for (const row of rows) {
      const rawId = row.dartSetId ? String(row.dartSetId) : "__none__";
      const name = row.dartSetName || (rawId === "__none__" ? "Sans set" : "Set inconnu");
      const key = `${rawId}::${name}`;
      const prev = map.get(key) || { id: rawId, name, sessions: 0, completed: 0, darts: 0, hits: 0, bestTargets: 0, bestTime: 0 };
      prev.sessions += 1;
      prev.completed += row.completed ? 1 : 0;
      prev.darts += row.darts;
      prev.hits += row.hits;
      prev.bestTargets = Math.max(prev.bestTargets, row.targets);
      if (row.completed && row.elapsedMs > 0) {
        prev.bestTime = prev.bestTime > 0 ? Math.min(prev.bestTime, row.elapsedMs) : row.elapsedMs;
      }
      map.set(key, prev);
    }
    return [...map.values()].map((row) => ({
      ...row,
      accuracy: row.darts > 0 ? Math.round((row.hits / row.darts) * 1000) / 10 : 0,
    })).sort((a, b) => {
      if (a.id === "__none__" && b.id !== "__none__") return 1;
      if (b.id === "__none__" && a.id !== "__none__") return -1;
      if (a.sessions !== b.sessions) return b.sessions - a.sessions;
      if (a.completed !== b.completed) return b.completed - a.completed;
      return String(a.name).localeCompare(String(b.name), undefined, { sensitivity: "base", numeric: true });
    });
  }, [rows]);

  const modes = React.useMemo(() => {
    return (["classic", "doubles", "triples", "sdt"] as ClockMode[]).map((mode) => {
      const subset = rows.filter((row) => row.mode === mode);
      const completed = subset.filter((row) => row.completed).length;
      const darts = subset.reduce((sum, row) => sum + row.darts, 0);
      const hits = subset.reduce((sum, row) => sum + row.hits, 0);
      return {
        mode,
        sessions: subset.length,
        completed,
        accuracy: darts ? Math.round((hits / darts) * 1000) / 10 : 0,
        bestTargets: subset.length ? Math.max(...subset.map((row) => row.targets)) : 0,
      };
    }).filter((row) => row.sessions > 0);
  }, [rows]);

  if (!pid && !pname) {
    return <div style={{ padding: 16, color: "rgba(255,255,255,.65)" }}>Sélectionne un joueur pour afficher ses statistiques Tour de l’Horloge.</div>;
  }

  if (!rows.length) {
    return (
      <div style={{ borderRadius: 20, padding: 18, textAlign: "center", background: "linear-gradient(180deg,#17181d,#0b0c10)", border: "1px solid rgba(255,64,180,.28)" }}>
        <div style={{ fontSize: 34 }}>🕒</div>
        <div style={{ marginTop: 8, fontSize: 15, fontWeight: 1000, color: PINK }}>AUCUNE SESSION ENREGISTRÉE</div>
        <div style={{ marginTop: 6, fontSize: 11, lineHeight: 1.45, color: "rgba(255,255,255,.58)" }}>Les prochaines parties seront ajoutées ici avec les cibles validées, la précision, le temps, les fléchettes et les records.</div>
      </div>
    );
  }

  const trend = rows.slice(0, 10).reverse();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ borderRadius: 22, padding: 14, background: "radial-gradient(circle at 10% 0%,rgba(255,64,180,.22),transparent 55%),linear-gradient(180deg,#1b1c22,#090a0e)", border: "1px solid rgba(255,64,180,.42)", boxShadow: "0 0 24px rgba(255,64,180,.12)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
          <div>
            <div style={{ fontSize: 10, letterSpacing: 1.2, color: PINK, fontWeight: 1000 }}>TOUR DE L’HORLOGE</div>
            <div style={{ marginTop: 2, fontSize: 17, fontWeight: 1000 }}>Performance globale</div>
          </div>
          <div style={{ borderRadius: 999, padding: "5px 9px", color: PINK, border: "1px solid rgba(255,64,180,.46)", background: "rgba(255,64,180,.08)", fontSize: 10, fontWeight: 1000 }}>{agg.sessions} session{agg.sessions > 1 ? "s" : ""}</div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8, marginTop: 12 }}>
          <StatCard label="Sessions terminées" value={`${agg.completed}/${agg.sessions}`} accent={GREEN} hint={`${agg.completionRate}% de réussite`} />
          <StatCard label="Précision valide" value={`${agg.accuracy}%`} accent={PINK} hint={`${agg.hits} hits / ${agg.darts} darts`} />
          <StatCard label="Cibles / session" value={agg.avgTargets} accent={GOLD} hint={`Record ${agg.bestTargets}/${TARGET_COUNT}`} />
          <StatCard label="Meilleure série" value={agg.bestStreak} accent={BLUE} hint="Hits valides consécutifs" />
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        <StatCard label="Meilleur temps" value={formatDuration(agg.bestTime)} accent={GREEN} hint="Session terminée" />
        <StatCard label="Temps moyen" value={formatDuration(agg.avgTime)} accent={BLUE} />
        <StatCard label="Minimum de darts" value={agg.bestDarts || "—"} accent={GOLD} hint="Session terminée" />
        <StatCard label="Darts / session" value={agg.avgDarts} accent={PINK} />
      </div>

      <div style={{ borderRadius: 20, padding: 13, background: "linear-gradient(180deg,#17181d,#0b0c10)", border: "1px solid rgba(255,255,255,.10)" }}>
        <div style={{ fontSize: 11, fontWeight: 1000, color: GOLD, letterSpacing: .8 }}>ÉVOLUTION · 10 DERNIÈRES SESSIONS</div>
        <div style={{ height: 116, display: "flex", alignItems: "flex-end", gap: 5, marginTop: 12 }}>
          {trend.map((row) => {
            const height = Math.max(6, (row.targets / TARGET_COUNT) * 100);
            return (
              <div key={row.id} title={`${new Date(row.date).toLocaleDateString()} · ${row.targets}/${TARGET_COUNT} cibles`} style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "flex-end", alignItems: "center", gap: 4 }}>
                <div style={{ fontSize: 8, color: row.completed ? GREEN : "rgba(255,255,255,.50)", fontWeight: 900 }}>{row.targets}</div>
                <div style={{ width: "100%", maxWidth: 22, height: `${height}%`, minHeight: 6, borderRadius: "7px 7px 3px 3px", background: row.completed ? `linear-gradient(180deg,${GREEN},#1e7847)` : `linear-gradient(180deg,${PINK},#70204f)`, boxShadow: row.completed ? `0 0 10px ${GREEN}44` : `0 0 10px ${PINK}33` }} />
                <div style={{ fontSize: 7, color: "rgba(255,255,255,.36)" }}>{new Date(row.date).toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" })}</div>
              </div>
            );
          })}
        </div>
      </div>

      {modes.length > 0 ? (
        <div style={{ borderRadius: 20, padding: 13, background: "linear-gradient(180deg,#17181d,#0b0c10)", border: "1px solid rgba(255,255,255,.10)" }}>
          <div style={{ fontSize: 11, fontWeight: 1000, color: GOLD, letterSpacing: .8, marginBottom: 9 }}>DÉTAIL PAR VARIANTE</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {modes.map((row) => (
              <div key={row.mode} style={{ display: "grid", gridTemplateColumns: "1.25fr .65fr .75fr .75fr", gap: 6, alignItems: "center", borderRadius: 13, padding: "8px 9px", background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)", fontSize: 10 }}>
                <div style={{ fontWeight: 1000, color: row.mode === "doubles" ? GREEN : row.mode === "triples" ? "#d49cff" : row.mode === "sdt" ? PINK : GOLD }}>{modeLabel(row.mode)}</div>
                <div style={{ textAlign: "center" }}><strong>{row.sessions}</strong><div style={{ fontSize: 7.5, opacity: .45 }}>SESS.</div></div>
                <div style={{ textAlign: "center" }}><strong>{row.completed}</strong><div style={{ fontSize: 7.5, opacity: .45 }}>FINIES</div></div>
                <div style={{ textAlign: "right" }}><strong>{row.accuracy}%</strong><div style={{ fontSize: 7.5, opacity: .45 }}>PRÉC.</div></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {dartSets.length > 0 ? (
        <div style={{ borderRadius: 20, padding: 13, background: "linear-gradient(180deg,#17181d,#0b0c10)", border: "1px solid rgba(255,255,255,.10)" }}>
          <div style={{ fontSize: 11, fontWeight: 1000, color: GOLD, letterSpacing: .8, marginBottom: 9 }}>DÉTAIL PAR SET DE FLÉCHETTES</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
            {dartSets.slice(0, 8).map((row) => (
              <div key={`${row.id}-${row.name}`} style={{ display: "grid", gridTemplateColumns: "1.3fr .65fr .65fr .65fr .75fr", gap: 6, alignItems: "center", borderRadius: 13, padding: "8px 9px", background: "rgba(255,255,255,.035)", border: `1px solid ${row.id === "__none__" ? "rgba(255,255,255,.07)" : "rgba(112,216,255,.20)"}`, fontSize: 9.5 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontWeight: 1000, color: row.id === "__none__" ? "#d8d8de" : BLUE, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{row.name}</div>
                  <div style={{ marginTop: 2, opacity: .45 }}>{row.completed} finie(s){row.bestTime ? ` · best ${formatDuration(row.bestTime)}` : ""}</div>
                </div>
                <div style={{ textAlign: "center" }}><strong>{row.sessions}</strong><div style={{ fontSize: 7.5, opacity: .45 }}>SESS.</div></div>
                <div style={{ textAlign: "center" }}><strong>{row.accuracy}%</strong><div style={{ fontSize: 7.5, opacity: .45 }}>PRÉC.</div></div>
                <div style={{ textAlign: "center" }}><strong>{row.bestTargets}</strong><div style={{ fontSize: 7.5, opacity: .45 }}>BEST</div></div>
                <div style={{ textAlign: "right" }}><strong>{row.id === "__none__" ? "—" : row.completed ? `${Math.round((row.completed / row.sessions) * 100)}%` : "0%"}</strong><div style={{ fontSize: 7.5, opacity: .45 }}>RÉUSS.</div></div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div style={{ borderRadius: 20, padding: 13, background: "linear-gradient(180deg,#17181d,#0b0c10)", border: "1px solid rgba(255,255,255,.10)" }}>
        <div style={{ fontSize: 11, fontWeight: 1000, color: GOLD, letterSpacing: .8, marginBottom: 9 }}>DERNIÈRES SESSIONS</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
          {rows.slice(0, 8).map((row) => (
            <div key={row.id} style={{ display: "grid", gridTemplateColumns: "1.1fr .85fr .75fr .7fr", gap: 6, alignItems: "center", borderRadius: 13, padding: "8px 9px", background: "rgba(255,255,255,.035)", border: `1px solid ${row.completed ? "rgba(99,237,156,.20)" : "rgba(255,255,255,.07)"}`, fontSize: 9.5 }}>
              <div><div style={{ fontWeight: 900 }}>{new Date(row.date).toLocaleDateString()}</div><div style={{ marginTop: 2, opacity: .45 }}>{modeLabel(row.mode)}</div></div>
              <div style={{ textAlign: "center", color: row.completed ? GREEN : GOLD, fontWeight: 1000 }}>{row.targets}/{TARGET_COUNT}</div>
              <div style={{ textAlign: "center" }}>{row.accuracy}%</div>
              <div style={{ textAlign: "right" }}>{formatDuration(row.elapsedMs)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
