// =============================================================
// src/pages/petanque/PetanqueStatsMatchesPage.tsx
// ✅ Page "MATCHS (Pétanque)" — même UI que HistoryPage (Darts)
// - Filtre seulement les entrées Pétanque
// - Tab terminées / en cours + filtres période
// =============================================================

// @ts-nocheck
import React, { useEffect, useMemo, useState } from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { History as HistoryAPI } from "../../lib/history";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type RangeKey = "today" | "week" | "month" | "year" | "archives";
type TabKey = "done" | "running";

function num(v: any) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function statusOf(e: any) {
  const s = String(e?.status ?? "");
  if (s) return s;
  if (e?.summary?.status) return String(e.summary.status);
  if (e?.winnerId || e?.summary?.winnerId || e?.summary?.result?.winnerId) return "finished";
  return "finished";
}

function inRange(ts: number, key: RangeKey) {
  const d = new Date(ts);
  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;

  if (key === "today") {
    return (
      d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate()
    );
  }
  if (key === "week") return now.getTime() - d.getTime() <= 7 * msDay;
  if (key === "month") return now.getTime() - d.getTime() <= 31 * msDay;
  if (key === "year") return now.getTime() - d.getTime() <= 366 * msDay;
  return true;
}

function dedupe(items: any[]) {
  const byId = new Map<string, any>();
  for (const e of items || []) {
    const id = String(e?.id ?? "");
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) byId.set(id, e);
    else {
      const tPrev = num(prev?.updatedAt ?? prev?.createdAt);
      const tNew = num(e?.updatedAt ?? e?.createdAt);
      if (tNew >= tPrev) byId.set(id, e);
    }
  }
  return Array.from(byId.values()).sort(
    (a, b) => num(b?.updatedAt ?? b?.createdAt) - num(a?.updatedAt ?? a?.createdAt)
  );
}

function isPetanqueEntry(e: any) {
  const v = (x: any) => String(x ?? "").toLowerCase();
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

function labelOf(e: any) {
  const title =
    e?.title ||
    e?.name ||
    e?.summary?.title ||
    e?.summary?.label ||
    "Match Pétanque";
  return String(title);
}

export default function PetanqueStatsMatchesPage({ store, go }: Props) {
  const { theme } = useTheme();

  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabKey>("done");
  const [sub, setSub] = useState<RangeKey>("month");

  async function loadHistory() {
    setLoading(true);
    try {
      const rows = await HistoryAPI.list(store);
      setItems(Array.isArray(rows) ? rows : []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [store]);

  const petanqueItems = useMemo(
    () => (items || []).filter((e) => isPetanqueEntry(e)),
    [items]
  );

  const { done, running } = useMemo(() => {
    const fins = petanqueItems.filter((e) => statusOf(e) === "finished");
    const inprog = petanqueItems.filter((e) => statusOf(e) !== "finished");
    return { done: dedupe(fins), running: dedupe(inprog) };
  }, [petanqueItems]);

  const source = tab === "done" ? done : running;
  const filtered = source.filter((e) => inRange(num(e.updatedAt || e.createdAt), sub));

  return (
    <div style={S.page(theme)}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <button style={S.backBtn(theme)} onClick={() => go("petanque_stats", {})}>
          ← Retour
        </button>
      </div>

      <div style={S.title(theme)}>MATCHS (PÉTANQUE)</div>

      <div style={S.kpiRow}>
        <div style={S.kpiCard(false, theme.primary)}>
          <div style={S.kpiLabel}>Sauvegardées</div>
          <div style={S.kpiValue}>{petanqueItems.length}</div>
        </div>

        <div style={S.kpiCard(tab === "done", theme.primary)} onClick={() => setTab("done")}>
          <div style={S.kpiLabel}>Terminées</div>
          <div style={S.kpiValue}>{done.length}</div>
        </div>

        <div style={S.kpiCard(tab === "running", theme.danger)} onClick={() => setTab("running")}>
          <div style={S.kpiLabel}>En cours</div>
          <div style={{ ...S.kpiValue, color: theme.danger }}>{running.length}</div>
        </div>
      </div>

      <button style={{ ...S.reloadBtn, opacity: loading ? 0.5 : 1 }} onClick={() => loadHistory()}>
        {loading ? "Chargement..." : "Recharger"}
      </button>

      <div style={S.filtersRow}>
        {(
          [
            ["today", "J"],
            ["week", "S"],
            ["month", "M"],
            ["year", "A"],
            ["archives", "ARV"],
          ] as any
        ).map(([key, label]) => (
          <div key={key} style={S.filterBtn(sub === key)} onClick={() => setSub(key as RangeKey)}>
            {label}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 10 }}>
        {filtered.length === 0 ? (
          <div style={S.empty(theme)}>Aucun match Pétanque pour cette période.</div>
        ) : (
          filtered.map((e) => (
            <div key={String(e.id)} style={S.item(theme)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={S.itemTitle(theme)}>{labelOf(e)}</div>
                <div style={S.itemSub(theme)}>
                  {new Date(num(e.updatedAt || e.createdAt)).toLocaleString()}
                </div>
              </div>

              <button
                style={S.smallBtn(theme)}
                onClick={() => go("petanque_play", { resumeId: e.resumeId || e.id, from: "petanque_matches" })}
              >
                Ouvrir
              </button>
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
  kpiRow: { display: "flex", gap: 10, marginTop: 14, flexWrap: "wrap" },
  kpiCard: (active: boolean, glow: string) => ({
    flex: "1 1 150px",
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${active ? "rgba(202,255,0,.55)" : "rgba(202,255,0,.22)"}`,
    background: "linear-gradient(180deg, rgba(30,35,55,78), rgba(10,10,18,86))",
    boxShadow: "0 10px 34px rgba(0,0,0,55), 0 0 18px rgba(202,255,0,06)",
    cursor: active ? "default" : "pointer",
  }),
  kpiLabel: { fontSize: 12, opacity: 0.8, fontWeight: 800 },
  kpiValue: { marginTop: 6, fontSize: 20, fontWeight: 1000, color: "rgba(210,255,40,.92)" },
  reloadBtn: {
    marginTop: 10,
    width: "100%",
    borderRadius: 14,
    padding: "12px 12px",
    border: "1px solid rgba(202,255,0,.25)",
    background: "rgba(0,0,0,.18)",
    color: "rgba(255,255,255,.9)",
    fontWeight: 900,
    cursor: "pointer",
  },
  filtersRow: { display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" },
  filterBtn: (on: boolean) => ({
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
  item: (theme: any) => ({
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
  itemTitle: (_theme: any) => ({
    fontWeight: 1000,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontSize: 14,
    color: "#fff",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  }),
  itemSub: (_theme: any) => ({
    marginTop: 4,
    fontSize: 12,
    color: "rgba(210,255,40,.80)",
  }),
  smallBtn: (theme: any) => ({
    border: "1px solid rgba(202,255,0,.35)",
    background: "rgba(0,0,0,.18)",
    color: theme.primary,
    borderRadius: 999,
    padding: "10px 12px",
    fontWeight: 1000,
    cursor: "pointer",
    whiteSpace: "nowrap",
  }),
};
