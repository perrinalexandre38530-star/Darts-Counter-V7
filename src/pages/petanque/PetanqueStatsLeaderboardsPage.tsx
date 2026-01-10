// =============================================================
// src/pages/petanque/PetanqueStatsLeaderboardsPage.tsx
// ✅ CLASSEMENTS (Pétanque) — UI très proche StatsLeaderboardsPage (Darts)
// - Filtre uniquement les entrées Pétanque
// - Metrics simples et robustes : wins / matches / winRate
// =============================================================

// @ts-nocheck
import * as React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import { History } from "../../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "D" | "W" | "M" | "Y" | "ALL";
type MetricKey = "wins" | "winRate" | "matches";

type Row = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  wins: number;
  matches: number;
  winRate: number;
};

function v(x: any) {
  return String(x ?? "").toLowerCase();
}

function isPetanqueEntry(e: any) {
  const cand = [
    v(e?.sport),
    v(e?.game),
    v(e?.kind),
    v(e?.mode),
    v(e?.variant),
    v(e?.payload?.sport),
    v(e?.payload?.game),
    v(e?.payload?.mode),
    v(e?.cfg?.sport),
    v(e?.cfg?.game),
    v(e?.summary?.sport),
    v(e?.summary?.game),
    v(e?.summary?.mode),
  ].join("|");
  return cand.includes("petanque") || cand.includes("pétanque");
}

function tsOf(rec: any) {
  const t = Number(rec?.updatedAt ?? rec?.createdAt ?? 0);
  return Number.isFinite(t) ? t : 0;
}

function inPeriod(t: number, p: PeriodKey) {
  if (p === "ALL") return true;
  const now = Date.now();
  const day = 86400000;
  if (p === "D") return now - t <= 1 * day;
  if (p === "W") return now - t <= 7 * day;
  if (p === "M") return now - t <= 31 * day;
  if (p === "Y") return now - t <= 366 * day;
  return true;
}

function winnerIdOf(rec: any) {
  return (
    rec?.winnerId ||
    rec?.summary?.winnerId ||
    rec?.summary?.result?.winnerId ||
    rec?.payload?.winnerId ||
    null
  );
}

function playersOf(rec: any): any[] {
  const p =
    rec?.players ||
    rec?.payload?.players ||
    rec?.summary?.players ||
    rec?.summary?.result?.players ||
    [];
  return Array.isArray(p) ? p : [];
}

function nameOf(p: any) {
  return String(p?.name ?? p?.displayName ?? p?.label ?? "—");
}

function avatarOf(p: any) {
  return p?.avatarDataUrl ?? p?.avatarUrl ?? p?.avatar ?? null;
}

function metricLabel(m: MetricKey) {
  switch (m) {
    case "wins":
      return "Victoires";
    case "matches":
      return "Matchs";
    case "winRate":
      return "% Win";
    default:
      return "Stat";
  }
}

export default function PetanqueStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();

  const [period, setPeriod] = React.useState<PeriodKey>("M");
  const [metric, setMetric] = React.useState<MetricKey>("wins");
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(false);

  const profiles = store?.profiles ?? [];
  const profileById = React.useMemo(() => {
    const m = new Map<string, any>();
    for (const p of profiles) m.set(String(p.id), p);
    return m;
  }, [profiles]);

  React.useEffect(() => {
    let mounted = true;

    const load = async () => {
      setLoading(true);
      try {
        // History.list(store) (IDB / mem) via lib/history
        const all = await History.list(store);
        const arr = Array.isArray(all) ? all : [];
        const filtered = arr.filter((r) => isPetanqueEntry(r) && inPeriod(tsOf(r), period));

        // agg
        const agg: Record<string, { wins: number; matches: number; name?: string; avatar?: string | null }> = {};

        for (const rec of filtered) {
          const winnerId = String(winnerIdOf(rec) ?? "");
          const pls = playersOf(rec);

          for (const p of pls) {
            const pid = String(p?.id ?? "");
            if (!pid) continue;

            if (!agg[pid]) agg[pid] = { wins: 0, matches: 0, name: nameOf(p), avatar: avatarOf(p) };
            agg[pid].matches += 1;
            if (winnerId && pid === winnerId) agg[pid].wins += 1;

            // enrich from store profile if exists
            const sp = profileById.get(pid);
            if (sp) {
              agg[pid].name = agg[pid].name || sp?.name;
              agg[pid].avatar = agg[pid].avatar ?? sp?.avatarDataUrl ?? null;
            }
          }
        }

        const out: Row[] = Object.keys(agg).map((pid) => {
          const a = agg[pid];
          const matches = a.matches || 0;
          const wins = a.wins || 0;
          const winRate = matches > 0 ? (wins / matches) * 100 : 0;

          const sp = profileById.get(pid);

          return {
            id: pid,
            name: sp?.name || a.name || "—",
            avatarDataUrl: sp?.avatarDataUrl ?? a.avatar ?? null,
            wins,
            matches,
            winRate,
          };
        });

        // filter strict rows
        const clean = out.filter((r) => r.name && r.name !== "—" && (r.matches > 0 || r.wins > 0));

        // sort by metric
        clean.sort((a, b) => {
          const va = metric === "winRate" ? a.winRate : metric === "matches" ? a.matches : a.wins;
          const vb = metric === "winRate" ? b.winRate : metric === "matches" ? b.matches : b.wins;
          return vb - va;
        });

        if (!mounted) return;
        setRows(clean);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    load();
    return () => {
      mounted = false;
    };
  }, [store, period, metric, profileById]);

  return (
    <div style={S.page(theme)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={S.backBtn(theme)} onClick={() => go("petanque_stats", {})}>
          ← Retour
        </button>
      </div>

      <div style={S.title(theme)}>CLASSEMENTS (PÉTANQUE)</div>
      <div style={S.sub(theme)}>Leaderboards joueurs selon la période et l’indicateur.</div>

      {/* Period pills */}
      <div style={S.pillsRow}>
        {(["D", "W", "M", "Y", "ALL"] as PeriodKey[]).map((p) => (
          <div key={p} style={S.pill(period === p)} onClick={() => setPeriod(p)}>
            {p}
          </div>
        ))}
      </div>

      {/* Metric pills */}
      <div style={S.pillsRow}>
        {(["wins", "winRate", "matches"] as MetricKey[]).map((m) => (
          <div key={m} style={S.pill(metric === m)} onClick={() => setMetric(m)}>
            {metricLabel(m)}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {loading ? (
          <div style={S.empty(theme)}>Chargement...</div>
        ) : rows.length === 0 ? (
          <div style={S.empty(theme)}>Aucune donnée Pétanque pour cette période.</div>
        ) : (
          rows.slice(0, 50).map((r, idx) => (
            <div key={r.id} style={S.row(theme)}>
              <div style={S.rank(theme)}>{idx + 1}</div>

              <div style={{ width: 44, height: 44, flex: "0 0 auto" }}>
                <ProfileAvatar
                  size={44}
                  name={r.name}
                  avatarDataUrl={r.avatarDataUrl || null}
                />
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.name(theme)}>{r.name}</div>
                <div style={S.meta(theme)}>
                  {r.wins} V • {r.matches} M • {r.winRate.toFixed(0)}%
                </div>
              </div>

              <div style={S.value(theme)}>
                {metric === "winRate"
                  ? `${r.winRate.toFixed(0)}%`
                  : metric === "matches"
                  ? r.matches
                  : r.wins}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

const S: any = {
  page: (theme: any) => ({
    minHeight: "100vh",
    padding: 16,
    background: theme.bg,
    color: theme.text,
  }),
  backBtn: (theme: any) => ({
    border: "1px solid rgba(202,255,0,.25)",
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.9)",
    borderRadius: 12,
    padding: "10px 12px",
    fontWeight: 900,
    cursor: "pointer",
  }),
  title: (theme: any) => ({
    fontSize: 34,
    fontWeight: 1000,
    letterSpacing: 1.6,
    textTransform: "uppercase",
    color: theme.primary,
    textShadow: "0 0 14px rgba(205, 255, 0, 0.22)",
    marginTop: 8,
  }),
  sub: (theme: any) => ({
    marginTop: 6,
    color: theme.textSoft,
    fontSize: 13,
    lineHeight: 1.35,
    maxWidth: 680,
  }),
  pillsRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  pill: (on: boolean) => ({
    borderRadius: 999,
    padding: "8px 12px",
    border: `1px solid ${on ? "rgba(202,255,0,.55)" : "rgba(202,255,0,.22)"}`,
    background: on ? "rgba(202,255,0,.10)" : "rgba(0,0,0,.18)",
    color: on ? "rgba(210,255,40,.95)" : "rgba(255,255,255,.75)",
    fontWeight: 1000,
    letterSpacing: 0.6,
    cursor: "pointer",
    userSelect: "none",
  }),
  empty: (theme: any) => ({
    marginTop: 16,
    padding: 14,
    borderRadius: 16,
    border: "1px solid rgba(202,255,0,.18)",
    background: "rgba(0,0,0,.18)",
    color: theme.textSoft,
  }),
  row: (_theme: any) => ({
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    border: "1px solid rgba(202,255,0,.18)",
    background: "linear-gradient(180deg, rgba(30,35,55,78), rgba(10,10,18,86))",
    boxShadow: "0 10px 34px rgba(0,0,0,55), 0 0 18px rgba(202,255,0,06)",
    marginBottom: 10,
  }),
  rank: (_theme: any) => ({
    width: 28,
    textAlign: "center" as const,
    fontWeight: 1000,
    color: "rgba(210,255,40,.90)",
  }),
  name: (_theme: any) => ({
    fontWeight: 1000,
    letterSpacing: 0.6,
    textTransform: "uppercase" as const,
    color: "#fff",
    fontSize: 14,
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  meta: (_theme: any) => ({
    marginTop: 4,
    fontSize: 12,
    color: "rgba(210,255,40,.80)",
  }),
  value: (theme: any) => ({
    fontWeight: 1000,
    color: theme.primary,
    minWidth: 64,
    textAlign: "right" as const,
  }),
};
