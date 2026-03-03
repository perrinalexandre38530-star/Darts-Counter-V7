// @ts-nocheck
// =============================================================
// src/pages/molkky/MolkkyStatsHistoryPage.tsx
// ✅ Objectif: VISUEL identique à src/pages/HistoryPage.tsx (Darts)
// ✅ Données: Mölkky (localStorage dc_molkky_history_v1 via lib/molkkyStore)
// =============================================================

import * as React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";
import ProfileAvatar from "../../components/ProfileAvatar";
import { loadMolkkyMatches, saveMolkkyMatches } from "../../lib/molkkyStore";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PeriodKey = "J" | "S" | "M" | "A" | "ARV";

function periodStart(period: PeriodKey): number {
  const now = new Date();
  const d = new Date(now);
  if (period === "ARV") return 0;
  if (period === "J") {
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "S") {
    const day = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - day);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  if (period === "M") {
    d.setDate(1);
    d.setHours(0, 0, 0, 0);
    return d.getTime();
  }
  // A
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function fmtDate(ts: number) {
  try {
    const d = new Date(ts);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(
      d.getSeconds()
    )}`;
  } catch {
    return "";
  }
}

export default function MolkkyStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const langAny: any = useLang();
  const t = React.useCallback(
    (key: string, fallback: string) => {
      const fn = langAny?.t;
      if (typeof fn === "function") {
        const v = fn(key, fallback);
        return !v || v === key ? fallback : v;
      }
      return fallback ?? key;
    },
    [langAny]
  );

  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const profileById = React.useMemo(() => {
    const m: Record<string, any> = {};
    for (const p of profiles || []) m[String(p.id)] = p;
    return m;
  }, [profiles]);

  const [query, setQuery] = React.useState<string>("");
  const [period, setPeriod] = React.useState<PeriodKey>("A");
  const [rows, setRows] = React.useState<any[]>([]);

  const reload = React.useCallback(() => {
    const list = (loadMolkkyMatches() as any[]) || [];
    setRows(list.slice().reverse());
  }, []);

  React.useEffect(() => {
    reload();
  }, [reload]);

  const filtered = React.useMemo(() => {
    const start = periodStart(period);
    const q = query.trim().toLowerCase();
    return (rows || [])
      .map((m) => {
        const ts = Number(m?.createdAt || m?.updatedAt || m?.date || Date.now()) || Date.now();

        // V2: players are in state.players (id/name/avatarDataUrl)
        const stPlayers = Array.isArray(m?.state?.players) ? m.state.players : null;
        const sumPlayers = Array.isArray(m?.summary?.players) ? m.summary.players : null;

        const players = (stPlayers || sumPlayers || []).map((ps: any) => {
          const pid = String(ps?.id || ps?.playerId || "");
          const prof = profileById[pid] || {};
          return {
            id: pid,
            name: prof?.name || ps?.name || pid,
            avatar: prof?.avatarDataUrl || prof?.avatar || ps?.avatarDataUrl || null,
            raw: ps,
          };
        });

        const winnerId = String(m?.state?.winnerPlayerId || m?.summary?.winnerPlayerId || m?.winnerId || "");
        const finished = Boolean(m?.finished || m?.state?.finishedAt || m?.summary?.winnerPlayerId);
        const inProgress = Boolean(m?.inProgress) && !finished;

        return {
          ...m,
          ts,
          players,
          winnerId,
          finished,
          inProgress,
        };
      })
      .filter((m) => (period === "ARV" ? true : m.ts >= start))
      .filter((m) => {
        if (!q) return true;
        const names = (m.players || []).map((p: any) => String(p.name || "")).join(" ").toLowerCase();
        return names.includes(q) || String(m.matchId || "").toLowerCase().includes(q);
      });
  }, [rows, query, period, profileById]);

  const allCount = rows.length;
  const inProgress = (rows || []).filter((r: any) => Boolean(r?.inProgress) && !Boolean(r?.finished)).length;
  const received = 0;

  const T = theme;
  const accent = T.accent || T.gold || "#f0c44f";

  const pageWrap: React.CSSProperties = {
    minHeight: "100vh",
    background: "radial-gradient(1200px 900px at 50% -30%, rgba(255,255,255,.06), rgba(0,0,0,0) 60%), linear-gradient(180deg, #050506, #07070a 55%, #050506)",
    color: "#fff",
    padding: 12,
    paddingBottom: 86,
  };

  const topRow: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    marginBottom: 10,
  };

  const title: React.CSSProperties = {
    flex: 1,
    textAlign: "center",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: accent,
    textShadow: `0 0 12px ${accent}, 0 0 28px ${accent}`,
  };

  const panel: React.CSSProperties = {
    borderRadius: 28,
    border: `1px solid rgba(255,255,255,.08)`,
    background: "linear-gradient(180deg, rgba(18,18,22,.98), rgba(9,9,12,.96))",
    boxShadow: `0 0 0 1px rgba(255,255,255,.06), 0 10px 26px rgba(0,0,0,.55)`,
    padding: 14,
    marginBottom: 12,
  };

  const kpi = (active: boolean): React.CSSProperties => ({
    flex: 1,
    borderRadius: 18,
    border: `1px solid ${active ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)"}`,
    background: active ? `linear-gradient(180deg, rgba(255,255,255,.10), rgba(0,0,0,.35))` : "rgba(0,0,0,.35)",
    padding: "10px 10px",
    textAlign: "center",
  });

  const btn = (primary?: boolean): React.CSSProperties => ({
    flex: 1,
    height: 44,
    borderRadius: 999,
    border: `1px solid rgba(255,255,255,.12)`,
    background: primary ? `linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.35))` : "rgba(0,0,0,.35)",
    color: "#fff",
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  });

  const chip = (active: boolean): React.CSSProperties => ({
    width: 38,
    height: 34,
    borderRadius: 999,
    border: `1px solid ${active ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.08)"}`,
    background: active ? `rgba(0,0,0,.55)` : `rgba(0,0,0,.35)`,
    color: active ? accent : "rgba(255,255,255,.75)",
    fontWeight: 900,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  });

  const matchCard: React.CSSProperties = {
    borderRadius: 26,
    border: "1px solid rgba(255,255,255,.08)",
    background: "radial-gradient(1200px 500px at 0% 0%, rgba(255,255,255,.06), rgba(0,0,0,0) 55%), rgba(0,0,0,.30)",
    padding: 14,
    boxShadow: "0 14px 30px rgba(0,0,0,.55)",
  };

  const pill: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    gap: 10,
    padding: "6px 10px",
    borderRadius: 999,
    border: "1px solid rgba(255,255,255,.12)",
    background: "rgba(0,0,0,.35)",
    fontWeight: 900,
    letterSpacing: 1.1,
    textTransform: "uppercase",
  };

  const iconBtn = (danger?: boolean): React.CSSProperties => ({
    width: 44,
    height: 44,
    borderRadius: 14,
    border: `1px solid ${danger ? "rgba(255,0,0,.35)" : "rgba(255,255,255,.10)"}`,
    background: danger ? "rgba(255,0,0,.12)" : "rgba(255,255,255,.06)",
    color: danger ? "#ff3b3b" : "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
  });

  const onDelete = React.useCallback(
    (matchId: string) => {
      const next = (rows || []).filter((m: any) => String(m?.matchId || "") !== String(matchId));
      setRows(next);
      saveMolkkyMatches(next);
    },
    [rows]
  );

  return (
    <div style={pageWrap}>
      <div style={topRow}>
        <BackDot onClick={() => go("molkky_stats")} />
        <div style={title}>HISTORIQUE</div>
        <InfoDot onClick={() => alert("Historique Mölkky (local)\n\nVisuel calqué sur Darts.")} />
      </div>

      <div style={panel}>
        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <div style={kpi(true)}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>ALL</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: accent }}>{allCount}</div>
          </div>
          <div style={kpi(false)}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>En cours</div>
            <div style={{ fontSize: 26, fontWeight: 900, color: "#ff3b3b" }}>{inProgress}</div>
          </div>
          <div style={kpi(false)}>
            <div style={{ fontSize: 12, opacity: 0.75, fontWeight: 900 }}>Reçues</div>
            <div style={{ fontSize: 26, fontWeight: 900 }}>{received}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
          <button type="button" style={btn(true)} onClick={reload}>
            Recharger
          </button>
          <button
            type="button"
            style={btn(false)}
            onClick={() => alert("Import Mölkky : bientôt (connecter à ton flow export/import).")}
          >
            Importer
          </button>
        </div>

        <div style={{ display: "flex", gap: 10, justifyContent: "center", marginBottom: 12 }}>
          {(["J", "S", "M", "A", "ARV"] as PeriodKey[]).map((p) => (
            <button key={p} type="button" onClick={() => setPeriod(p)} style={chip(period === p)}>
              {p}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher"
            style={{
              flex: 1,
              height: 40,
              borderRadius: 999,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(0,0,0,.35)",
              color: "#fff",
              padding: "0 14px",
              outline: "none",
            }}
          />
          <button type="button" onClick={() => setQuery("")} style={{ ...btn(false), flex: "none", width: 110, height: 40 }}>
            Effacer
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div style={{ ...panel, opacity: 0.8, textAlign: "center" }}>{t("history.none", "Aucune donnée.")}</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {filtered.map((m: any) => {
            const ts = m.ts || Date.now();
            const players = m.players || [];
            const winnerId = String(m.winnerId || "");
            const left = players[0] || null;
            const right = players[1] || null;

            const scoreLine =
              players.length >= 2
                ? `${left?.name || "—"} : ${winnerId === left?.id ? 1 : 0} • ${right?.name || "—"} : ${
                    winnerId === right?.id ? 1 : 0
                  }`
                : players.map((p: any) => p.name).join(" • ");

            return (
              <div key={String(m.id || m.matchId)} style={matchCard}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={pill}>
                      <span style={{ color: accent }}>MÖLKKY</span>
                      <span style={{ opacity: 0.75 }}>•</span>
                      <span style={{ opacity: 0.9 }}>{m.inProgress ? "En cours" : "Terminé"}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <div style={{ fontWeight: 900, opacity: 0.85 }}>{fmtDate(ts)}</div>
                    {m.inProgress ? (
                      <button
                        style={{
                          height: 34,
                          padding: "0 14px",
                          borderRadius: 999,
                          border: `1px solid rgba(255,255,255,.14)`,
                          background: `linear-gradient(180deg, rgba(255,255,255,.12), rgba(0,0,0,.40))`,
                          color: "#fff",
                          fontWeight: 900,
                          letterSpacing: 1,
                          textTransform: "uppercase",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          try {
                            go("molkky_play", { resumeId: m.id });
                          } catch {}
                        }}
                      >
                        Reprendre
                      </button>
                    ) : null}
                  </div>
                </div>

                <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                  <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 10, opacity: 0.95 }}>
                    {players.slice(0, 2).map((p: any) => (
                      <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 999, overflow: "hidden" }}>
                          <ProfileAvatar size={28} name={p.name} avatar={p.avatar || undefined} />
                        </div>
                        <div style={{ fontWeight: 900, color: p.id === winnerId ? accent : "#fff" }}>{p.name}</div>
                      </div>
                    ))}
                  </div>

                  <div style={{ fontWeight: 900, opacity: 0.85 }}>{scoreLine}</div>
                </div>

                <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center" }}>
                  <button
                    type="button"
                    onClick={() => alert("Voir stats (match) : prochain patch (page détail).")}
                    style={{
                      flex: 1,
                      height: 46,
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,.12)",
                      background: "rgba(0,0,0,.35)",
                      color: accent,
                      fontWeight: 900,
                      letterSpacing: 1.1,
                      textTransform: "uppercase",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                    }}
                  >
                    👁 Voir stats
                  </button>

                  <button type="button" style={iconBtn(false)} onClick={() => alert("Partager : bientôt.")}>
                    ↗
                  </button>
                  <button type="button" style={iconBtn(false)} onClick={() => alert("Reprendre/Voir : bientôt.")}>
                    ▶
                  </button>
                  <button type="button" style={iconBtn(true)} onClick={() => onDelete(String(m.matchId))}>
                    🗑
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
