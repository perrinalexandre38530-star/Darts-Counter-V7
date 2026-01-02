// =============================================================
// src/components/StatsShanghaiDashboard.tsx
// Dashboard Shanghai (StatsHub)
// ✅ Affiche les stats d'UN profil (playerId) — conforme "profil actif / profils locaux"
// ✅ Ne montre plus un tableau multi-profils dans une page Shanghai
// - lit history[].summary.statsShanghai (priorité)
// - fallback: history[].payload.statsShanghai
// ✅ inclut uniquement les matchs Shanghai FINIS
// ✅ winnerId / tie robust
// ✅ scores robust
// ✅ hitsById robust même si statsShanghai absent
// ✅ NEW: KPI + accuracy + top targets + derniers matchs
// =============================================================
import React from "react";
import { useTheme } from "../contexts/ThemeContext";

type AnyMatch = any;

const toId = (v: any) => {
  const s = String(v ?? "").trim();
  return s ? s : "";
};

const N = (v: any, d = 0) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

function isFinishedShanghai(m: AnyMatch) {
  const status = String(m?.status ?? m?.summary?.status ?? m?.payload?.status ?? "").toLowerCase();
  const forcedFinished = !!(m as any)?.forcedFinished || !!m?.summary?.forcedFinished;
  const winnerId = m?.winnerId ?? m?.summary?.winnerId ?? m?.payload?.winnerId ?? null;

  if (forcedFinished) return true;
  if (status === "finished" || status === "done" || status === "completed") return true;
  if (winnerId) return true;
  if (m?.summary?.endedAt || m?.endedAt) return true;

  return false;
}

function getShanghaiStatsFromMatch(m: AnyMatch) {
  return (
    m?.summary?.statsShanghai ||
    m?.payload?.statsShanghai ||
    m?.payload?.summary?.statsShanghai ||
    null
  );
}

function getShanghaiScoresFromMatch(m: AnyMatch) {
  const s = m?.summary?.scores;
  if (Array.isArray(s) && s.length) return s;

  const r = m?.payload?.summary?.scores;
  if (Array.isArray(r) && r.length) return r;

  const rk = m?.payload?.ranked;
  if (Array.isArray(rk) && rk.length) return rk;

  const pl = m?.players || m?.summary?.players || m?.payload?.players;
  if (Array.isArray(pl) && pl.length) {
    return pl.map((p: any) => ({
      id: p?.id,
      name: p?.name,
      score: p?.score ?? p?.finalScore ?? p?.points ?? 0,
    }));
  }

  return [];
}

function getShanghaiKind(m: AnyMatch) {
  return String(m?.kind || m?.summary?.kind || m?.payload?.kind || m?.mode || m?.summary?.mode || m?.payload?.mode || "");
}

function getMatchTs(m: AnyMatch) {
  return N(m?.updatedAt ?? m?.createdAt ?? m?.summary?.endedAt ?? m?.endedAt ?? 0, 0);
}

function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return "";
  }
}

type Props = {
  matches: AnyMatch[];
  playerId: string | null;
  playerName?: string | null;
};

export default function StatsShanghaiDashboard({ matches: raw, playerId, playerName }: Props) {
  const { theme } = useTheme();
  const matches = Array.isArray(raw) ? raw : [];
  const pid = toId(playerId);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: `0 10px 24px rgba(0,0,0,0.55)`,
    overflow: "hidden",
  };

  if (!pid) {
    return (
      <div style={{ ...card, padding: 14 }}>
        <div style={{ color: theme.textSoft, fontSize: 13 }}>
          Sélectionne un joueur pour afficher les stats Shanghai.
        </div>
      </div>
    );
  }

  // 1) Filtrer Shanghai fini
  const sh = matches
    .filter((m) => getShanghaiKind(m).toLowerCase().includes("shanghai"))
    .filter(isFinishedShanghai);

  // 2) Garder uniquement les matchs où le joueur participe
  const shForPlayer = sh.filter((m) => {
    const scores = getShanghaiScoresFromMatch(m);
    return scores.some((p: any) => toId(p?.id) === pid);
  });

  // Agrégats profil
  const agg = {
    matches: 0,
    wins: 0,
    ties: 0,
    losses: 0,

    totalFinal: 0,
    bestFinal: 0,
    worstFinal: Number.POSITIVE_INFINITY,
    avgFinal: 0,

    hitsS: 0,
    hitsD: 0,
    hitsT: 0,
    miss: 0,
    pointsOnTargets: 0,

    // par cible (ex: "20", "19", "BULL", etc. selon ton moteur)
    targets: {} as Record<
      string,
      { S: number; D: number; T: number; MISS: number; points: number; totalHits: number }
    >,

    recent: [] as Array<{
      id: string;
      ts: number;
      finalScore: number;
      result: "W" | "L" | "T";
      winnerName: string | null;
    }>,
  };

  for (const m of shForPlayer) {
    agg.matches++;

    const scores = getShanghaiScoresFromMatch(m);
    const me = scores.find((p: any) => toId(p?.id) === pid) || null;
    const myFinal = N(me?.score ?? 0, 0);

    agg.totalFinal += myFinal;
    agg.bestFinal = Math.max(agg.bestFinal, myFinal);
    agg.worstFinal = Math.min(agg.worstFinal, myFinal);

    const winnerIdRaw = m?.winnerId ?? m?.summary?.winnerId ?? m?.payload?.winnerId ?? null;
    const winnerId = toId(winnerIdRaw);

    const tieIds =
      (Array.isArray(m?.summary?.tieIds) && m.summary.tieIds.map(toId).filter(Boolean)) ||
      (Array.isArray(m?.payload?.summary?.tieIds) && m.payload.summary.tieIds.map(toId).filter(Boolean)) ||
      [];

    const isTie = !!(
      m?.summary?.isTie ||
      m?.summary?.statsShanghai?.isTie ||
      m?.payload?.summary?.isTie ||
      (tieIds && tieIds.length)
    );

    let result: "W" | "L" | "T" = "L";
    if (isTie) {
      agg.ties++;
      result = "T";
    } else if (winnerId && winnerId === pid) {
      agg.wins++;
      result = "W";
    } else {
      agg.losses++;
      result = "L";
    }

    const winnerName =
      scores.find((x: any) => toId(x?.id) === winnerId)?.name ??
      (winnerId ? "Gagnant" : null);

    agg.recent.push({
      id: String(m?.id ?? ""),
      ts: getMatchTs(m),
      finalScore: myFinal,
      result,
      winnerName,
    });

    // Hits / Miss / points (depuis statsShanghai si possible)
    const stats = getShanghaiStatsFromMatch(m);

    // hitsById peut être stocké sous stats.hitsById[pid][target] => {S,D,T,MISS,points}
    const hitsById = (stats && (stats.hitsById || stats.hitsByPlayer)) || {};
    const mine = hitsById?.[pid] ?? hitsById?.[String(pid)] ?? null;

    if (mine && typeof mine === "object") {
      for (const tk of Object.keys(mine)) {
        const hc = mine[tk] || {};
        const S = N(hc.S || 0, 0);
        const D = N(hc.D || 0, 0);
        const T = N(hc.T || 0, 0);
        const MISS = N(hc.MISS || 0, 0);
        const points = N(hc.points || 0, 0);

        agg.hitsS += S;
        agg.hitsD += D;
        agg.hitsT += T;
        agg.miss += MISS;
        agg.pointsOnTargets += points;

        if (!agg.targets[tk]) {
          agg.targets[tk] = { S: 0, D: 0, T: 0, MISS: 0, points: 0, totalHits: 0 };
        }
        agg.targets[tk].S += S;
        agg.targets[tk].D += D;
        agg.targets[tk].T += T;
        agg.targets[tk].MISS += MISS;
        agg.targets[tk].points += points;
        agg.targets[tk].totalHits += S + D + T;
      }
    }
  }

  agg.avgFinal = agg.matches > 0 ? agg.totalFinal / agg.matches : 0;
  if (!Number.isFinite(agg.worstFinal)) agg.worstFinal = 0;

  const totalHits = agg.hitsS + agg.hitsD + agg.hitsT;
  const totalThrows = totalHits + agg.miss;
  const accuracy = totalThrows > 0 ? (totalHits / totalThrows) * 100 : 0;
  const winRate = agg.matches > 0 ? (agg.wins / agg.matches) * 100 : 0;

  const topTargets = Object.entries(agg.targets)
    .map(([k, v]) => ({ key: k, ...v }))
    .sort((a, b) => b.points - a.points || b.totalHits - a.totalHits)
    .slice(0, 8);

  const recent = agg.recent
    .slice()
    .sort((a, b) => (b.ts || 0) - (a.ts || 0))
    .slice(0, 8);

  const pill: React.CSSProperties = {
    borderRadius: 999,
    padding: "6px 10px",
    border: `1px solid ${theme.borderSoft}`,
    background: "rgba(0,0,0,0.18)",
    fontSize: 12,
    color: theme.text,
    fontWeight: 900,
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ width: "100%", maxWidth: 820, margin: "0 auto" }}>
      <div style={{ ...card, padding: 14 }}>
        <div
          style={{
            fontWeight: 1000,
            fontSize: 14,
            color: theme.primary,
            textTransform: "uppercase",
            textShadow: `0 0 10px ${theme.primary}33`,
          }}
        >
          Shanghai — Stats
        </div>

        <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 12 }}>
          Profil : <b style={{ color: theme.text }}>{playerName || "Joueur"}</b>
        </div>

        <div style={{ marginTop: 10, display: "flex", flexWrap: "wrap", gap: 8 }}>
          <span style={pill}>🎯 Matchs : {agg.matches}</span>
          <span style={pill}>🏆 Wins : {agg.wins}</span>
          <span style={pill}>🤝 Ties : {agg.ties}</span>
          <span style={pill}>📈 WinRate : {winRate.toFixed(1)}%</span>
          <span style={pill}>🎯 Accuracy : {accuracy.toFixed(1)}%</span>
        </div>

        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.16)",
              padding: 10,
            }}
          >
            <div style={{ color: theme.textSoft, fontSize: 11, textTransform: "uppercase" }}>
              Score final
            </div>
            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Avg</div>
              <div style={{ fontWeight: 1000 }}>{agg.avgFinal.toFixed(1)}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Best</div>
              <div style={{ fontWeight: 1000 }}>{agg.bestFinal}</div>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Worst</div>
              <div style={{ fontWeight: 1000 }}>{agg.worstFinal}</div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.16)",
              padding: 10,
            }}
          >
            <div style={{ color: theme.textSoft, fontSize: 11, textTransform: "uppercase" }}>
              Hits & Points
            </div>

            <div style={{ marginTop: 6, display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Hits</div>
              <div style={{ fontWeight: 1000 }}>
                S{agg.hitsS} D{agg.hitsD} T{agg.hitsT}
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Miss</div>
              <div style={{ fontWeight: 1000 }}>{agg.miss}</div>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12 }}>
              <div style={{ color: theme.textSoft }}>Points cibles</div>
              <div style={{ fontWeight: 1000 }}>{agg.pointsOnTargets}</div>
            </div>
          </div>
        </div>

        {/* Top targets */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontWeight: 1000,
              fontSize: 12,
              color: theme.text,
              textTransform: "uppercase",
              opacity: 0.92,
              marginBottom: 8,
            }}
          >
            Top cibles (par points)
          </div>

          {topTargets.length === 0 ? (
            <div style={{ color: theme.textSoft, fontSize: 13 }}>
              Aucune stat “hitsById” trouvée dans les matchs Shanghai (il faut que le résumé de fin de partie les enregistre).
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {topTargets.map((t) => (
                <div
                  key={t.key}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.14)",
                    padding: "10px 12px",
                    display: "grid",
                    gap: 6,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 1000, fontSize: 13 }}>
                      🎯 {t.key}
                    </div>
                    <div style={{ fontWeight: 1000, fontSize: 13 }}>
                      ⭐ {t.points} pts
                    </div>
                  </div>

                  <div style={{ display: "flex", flexWrap: "wrap", gap: 10, fontSize: 12, color: theme.textSoft }}>
                    <span>
                      Hits :{" "}
                      <b style={{ color: theme.text }}>
                        S{t.S} D{t.D} T{t.T}
                      </b>
                    </span>
                    <span>
                      Miss : <b style={{ color: theme.text }}>{t.MISS}</b>
                    </span>
                    <span>
                      Total hits : <b style={{ color: theme.text }}>{t.totalHits}</b>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Derniers matchs */}
        <div style={{ marginTop: 12 }}>
          <div
            style={{
              fontWeight: 1000,
              fontSize: 12,
              color: theme.text,
              textTransform: "uppercase",
              opacity: 0.92,
              marginBottom: 8,
            }}
          >
            Derniers matchs
          </div>

          {recent.length === 0 ? (
            <div style={{ color: theme.textSoft, fontSize: 13 }}>
              Aucun match Shanghai terminé enregistré pour ce profil.
            </div>
          ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {recent.map((r) => (
                <div
                  key={`${r.id}_${r.ts}`}
                  style={{
                    borderRadius: 14,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.14)",
                    padding: "10px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 10,
                    alignItems: "center",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 900, fontSize: 12, color: theme.text }}>
                      {fmtDate(r.ts || 0)}
                    </div>
                    <div style={{ fontSize: 12, color: theme.textSoft }}>
                      Score final : <b style={{ color: theme.text }}>{r.finalScore}</b>
                      {r.winnerName ? (
                        <>
                          {" "}
                          · Winner : <b style={{ color: theme.text }}>{r.winnerName}</b>
                        </>
                      ) : null}
                    </div>
                  </div>

                  <div
                    style={{
                      fontWeight: 1000,
                      fontSize: 12,
                      padding: "6px 10px",
                      borderRadius: 999,
                      border: `1px solid ${theme.borderSoft}`,
                      background:
                        r.result === "W"
                          ? `${theme.primary}22`
                          : r.result === "T"
                          ? "rgba(255,255,255,0.10)"
                          : "rgba(255,0,0,0.10)",
                      color:
                        r.result === "W"
                          ? theme.primary
                          : r.result === "T"
                          ? theme.text
                          : "#ff6b6b",
                    }}
                  >
                    {r.result === "W" ? "WIN" : r.result === "T" ? "TIE" : "LOSS"}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer: debug friendly */}
        <div style={{ marginTop: 12, color: theme.textSoft, fontSize: 11, opacity: 0.85 }}>
          Matchs Shanghai analysés (profil) : <b style={{ color: theme.text }}>{shForPlayer.length}</b> / total Shanghai finis :{" "}
          <b style={{ color: theme.text }}>{sh.length}</b>
        </div>
      </div>
    </div>
  );
}
