// @ts-nocheck
// ============================================
// src/pages/ShanghaiEnd.tsx — STATS SHANGHAI (PRO)
// - Classement + gagnant / égalité
// - ✅ Sparkline commune multi-joueurs (1 ligne par joueur, couleur diff)
// - ✅ Points sur la sparkline (1 point = fin de manche/cible)
// - Hits par cible (S/D/T/MISS + points) + n'affiche que les cibles avec points > 0
// - 🔥 IMPORTANT: recharge auto le record COMPLET via History.get(id) si payload absent
// - Compatible HistoryPage: go("shanghai_end", { id })  OU go("shanghai_end", { rec })
// ============================================

import React, { useEffect, useMemo, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { History } from "../lib/history";

type Props = {
  store?: any;
  go?: (to: string, params?: any) => void;
  params?: any;
};

function safeNum(n: any, def = 0) {
  const v = Number(n);
  return Number.isFinite(v) ? v : def;
}

function pickRecOrId(props: Props) {
  const p = props?.params || {};
  const rec = p.rec || p.record || p.match || null;
  const id = p.id || rec?.id || null;
  return { rec, id };
}

function getShanghaiPack(rec: any) {
  const payload = rec?.payload || {};
  const stats = payload?.statsShanghai || {};
  const summary = rec?.summary || payload?.summary || {};
  const players = rec?.players || summary?.scores || [];
  return { payload, stats, summary, players };
}

function colorForIndex(i: number) {
  const hue = (i * 72) % 360;
  return `hsl(${hue} 90% 65%)`;
}

function polylinePoints(series: number[], w: number, h: number, padX: number, padY: number, yMax: number) {
  const arr = Array.isArray(series) ? series : [];
  const n = Math.max(1, arr.length);
  const innerW = Math.max(1, w - padX * 2);
  const innerH = Math.max(1, h - padY * 2);

  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    const x = padX + innerW * (n === 1 ? 0 : i / (n - 1));
    const v = safeNum(arr[i], 0);
    const y = padY + innerH * (1 - (yMax <= 0 ? 0 : v / yMax));
    pts.push({ x, y });
  }
  return pts;
}

export default function ShanghaiEnd(props: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const { rec: recIn, id } = pickRecOrId(props);

  const [recFull, setRecFull] = useState<any>(recIn);
  const [loading, setLoading] = useState<boolean>(false);

  // 🔥 Recharge record complet si payload absent
  useEffect(() => {
    const rec = recIn;
    const missingPayload = rec && !rec.payload && !!rec.payloadCompressed; // souvent le cas quand vient de History.list()
    const shouldFetch = (!!id && (!rec || missingPayload));

    if (!shouldFetch) {
      setRecFull(rec);
      return;
    }

    let alive = true;
    setLoading(true);

    (async () => {
      try {
        const full = await History.get(id);
        if (!alive) return;
        setRecFull(full || rec);
      } catch {
        if (!alive) return;
        setRecFull(rec);
      } finally {
        if (!alive) return;
        setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [id, recIn]);

  const rec = recFull;

  if (!rec) {
    return (
      <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, padding: 16 }}>
        <div style={{ fontWeight: 1000, fontSize: 16, color: theme.primary }}>SHANGHAI — RÉSUMÉ</div>
        <div style={{ opacity: 0.75, marginTop: 10 }}>Aucune partie à afficher.</div>
        <button
          onClick={() => props?.go?.("history")}
          style={{
            marginTop: 14,
            borderRadius: 999,
            padding: "10px 14px",
            border: `1px solid ${theme.borderSoft}`,
            background: "rgba(0,0,0,0.22)",
            color: theme.text,
            fontWeight: 900,
          }}
        >
          ← Retour
        </button>
      </div>
    );
  }

  const { stats, summary } = getShanghaiPack(rec);

  const scoresArr = useMemo(() => {
    const s = summary?.scores;
    if (Array.isArray(s) && s.length) {
      return s.map((x: any) => ({ id: String(x.id), name: x.name || "Joueur", score: safeNum(x.score, 0) }));
    }

    const pl = rec?.players || [];
    return (pl || []).map((p: any) => ({
      id: String(p.id),
      name: p.name || "Joueur",
      score: safeNum(summary?.byId?.[String(p.id)]?.score, 0),
    }));
  }, [rec, summary]);

  const ranked = useMemo(() => [...scoresArr].sort((a, b) => b.score - a.score), [scoresArr]);
  const top = ranked?.[0]?.score ?? 0;
  const ties = ranked.filter((r) => r.score === top);
  const isTie = ties.length >= 2 || !!summary?.isTie;

  const hitsById = stats?.hitsById || {};
  const scoreTimelineById = stats?.scoreTimelineById || {};
  const targetOrder: number[] = Array.isArray(stats?.targetOrder)
    ? stats.targetOrder
    : Array.from({ length: safeNum(summary?.maxRounds, 10) }, (_, i) => i + 1);

  const chartW = 440;
  const chartH = 92;
  const padX = 10;
  const padY = 12;

  const yMax = useMemo(() => {
    let m = 0;
    for (const r of ranked) {
      const arr = scoreTimelineById?.[r.id];
      if (Array.isArray(arr)) for (const v of arr) m = Math.max(m, safeNum(v, 0));
      m = Math.max(m, safeNum(r.score, 0));
    }
    return m || 1;
  }, [ranked, scoreTimelineById]);

  const card: React.CSSProperties = {
    borderRadius: 18,
    border: `1px solid ${theme.borderSoft}`,
    background: theme.card,
    boxShadow: "0 12px 28px rgba(0,0,0,.45)",
    overflow: "hidden",
  };

  const sectionTitle: React.CSSProperties = {
    marginTop: 14,
    fontWeight: 950,
    fontSize: 12,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    color: theme.primary,
    textShadow: `0 0 10px ${theme.primary}33`,
  };

  const hasDetailed =
    !!stats &&
    typeof stats === "object" &&
    (Object.keys(hitsById || {}).length > 0 || Object.keys(scoreTimelineById || {}).length > 0);

  return (
    <div style={{ minHeight: "100dvh", background: theme.bg, color: theme.text, paddingBottom: 96 }}>
      <div style={{ padding: 14, maxWidth: 520, margin: "0 auto" }}>
        <div style={{ fontWeight: 1000, fontSize: 16, color: theme.primary, textTransform: "uppercase" }}>
          SHANGHAI — RÉSUMÉ
        </div>
        <div style={{ opacity: 0.75, fontSize: 12, marginTop: 2 }}>
          {new Date(rec?.updatedAt || rec?.createdAt || Date.now()).toLocaleString()}
        </div>

        {loading ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 14,
              border: `1px solid ${theme.primary}55`,
              background: `${theme.primary}10`,
              padding: 10,
              fontSize: 12,
              fontWeight: 900,
            }}
          >
            Chargement des stats détaillées…
          </div>
        ) : !hasDetailed ? (
          <div
            style={{
              marginTop: 10,
              borderRadius: 14,
              border: `1px solid rgba(255,80,80,.35)`,
              background: "rgba(255,80,80,.10)",
              padding: 10,
              fontSize: 12,
              opacity: 0.95,
            }}
          >
            ⚠️ Les stats détaillées ne sont pas présentes dans cet enregistrement (payload).
            <br />
            Le classement reste OK, mais hits/sparkline détaillés peuvent être incomplets.
          </div>
        ) : null}

        <div style={{ ...card, marginTop: 12, padding: 12, borderColor: theme.primary + "55" }}>
          {/* HEADER */}
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                background: "rgba(0,0,0,0.18)",
                fontWeight: 900,
                fontSize: 12,
              }}
            >
              Manches : {safeNum(summary?.maxRounds, targetOrder.length)}
            </div>

            <div
              style={{
                padding: "6px 10px",
                borderRadius: 999,
                border: `1px solid ${theme.primary}66`,
                background: `${theme.primary}14`,
                color: theme.primary,
                fontWeight: 950,
                fontSize: 12,
              }}
            >
              {isTie ? "🤝 Égalité" : `🏆 Gagnant : ${ranked?.[0]?.name || "—"}`}
            </div>
          </div>

          {/* CLASSEMENT */}
          <div style={{ marginTop: 10, fontSize: 12, fontWeight: 950, opacity: 0.9 }}>CLASSEMENT</div>
          <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
            {ranked.map((r, idx) => (
              <div
                key={r.id}
                style={{
                  padding: 10,
                  borderRadius: 16,
                  border: `1px solid ${idx === 0 ? theme.primary + "66" : theme.borderSoft}`,
                  background: idx === 0 ? `${theme.primary}10` : "rgba(0,0,0,0.18)",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <div style={{ width: 22, textAlign: "center", fontWeight: 1000, color: idx === 0 ? theme.primary : theme.textSoft }}>
                  {idx + 1}
                </div>
                <div style={{ flex: 1, minWidth: 0, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                  {r.name}
                </div>
                <div style={{ fontWeight: 1000, fontSize: 16 }}>{r.score}</div>
              </div>
            ))}
          </div>

          {/* SPARKLINE COMMUNE */}
          <div style={sectionTitle}>ÉVOLUTION DU SCORE</div>

          <div
            style={{
              marginTop: 8,
              borderRadius: 14,
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.18)",
              padding: 10,
            }}
          >
            <svg viewBox={`0 0 ${chartW} ${chartH}`} width="100%" height={chartH} style={{ display: "block" }}>
              {/* grille */}
              <path d={`M ${padX} ${chartH - padY} L ${chartW - padX} ${chartH - padY}`} stroke="rgba(255,255,255,0.18)" strokeWidth="1" fill="none" />
              <path d={`M ${padX} ${padY} L ${padX} ${chartH - padY}`} stroke="rgba(255,255,255,0.12)" strokeWidth="1" fill="none" />

              {ranked.map((r, i) => {
                const raw = scoreTimelineById?.[r.id];
                const series = Array.isArray(raw) && raw.length ? raw : [0, r.score];
                const col = colorForIndex(i);
                const pts = polylinePoints(series, chartW, chartH, padX, padY, yMax);

                const poly = pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

                return (
                  <g key={r.id}>
                    <polyline points={poly} fill="none" stroke={col} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
                    {/* points (1 point = fin de manche/cible) */}
                    {pts.map((p, idx) => (
                      <circle key={idx} cx={p.x} cy={p.y} r="2.6" fill={col} opacity={idx === pts.length - 1 ? 1 : 0.9} />
                    ))}
                  </g>
                );
              })}
            </svg>

            <div style={{ display: "grid", gap: 6, marginTop: 8 }}>
              {ranked.map((r, i) => (
                <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
                  <div style={{ width: 14, height: 4, borderRadius: 999, background: colorForIndex(i), boxShadow: `0 0 10px ${colorForIndex(i)}55` }} />
                  <div style={{ flex: 1, minWidth: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.name}</div>
                  <div style={{ fontWeight: 950, opacity: 0.9 }}>Final {r.score}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 8, fontSize: 11, opacity: 0.65 }}>(1 point = fin de manche/cible)</div>
          </div>

          {/* HITS */}
          <div style={sectionTitle}>HISTORIQUE DES HITS PAR CIBLE</div>

          <div style={{ display: "grid", gap: 10, marginTop: 8 }}>
            {ranked.map((r, idx) => {
              const map = hitsById?.[r.id] || {};

              // ✅ n'afficher que les cibles avec points > 0
              const rows = (targetOrder || [])
                .map((target) => ({ target, hc: map?.[target] || null }))
                .filter((x) => safeNum(x?.hc?.points, 0) > 0);

              return (
                <div
                  key={r.id}
                  style={{
                    borderRadius: 16,
                    border: `1px solid ${theme.borderSoft}`,
                    background: "rgba(0,0,0,0.18)",
                    padding: 10,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ width: 10, height: 10, borderRadius: 999, background: colorForIndex(idx) }} />
                    <div style={{ fontWeight: 950 }}>{r.name}</div>
                  </div>

                  {!rows.length ? (
                    <div style={{ marginTop: 10, fontSize: 12, opacity: 0.7 }}>Aucun hit marquant.</div>
                  ) : (
                    <div style={{ display: "grid", gap: 8, marginTop: 10 }}>
                      {rows.map(({ target, hc }) => (
                        <div
                          key={target}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            padding: "8px 10px",
                            borderRadius: 14,
                            border: `1px solid ${theme.borderSoft}`,
                            background: "rgba(0,0,0,0.14)",
                          }}
                        >
                          <div
                            style={{
                              width: 34,
                              textAlign: "center",
                              fontWeight: 1000,
                              color: theme.primary,
                              borderRadius: 10,
                              border: `1px solid ${theme.primary}55`,
                              background: `${theme.primary}12`,
                              padding: "4px 0",
                            }}
                          >
                            {target}
                          </div>

                          <div style={{ flex: 1, fontSize: 12, opacity: 0.92, display: "flex", gap: 10, flexWrap: "wrap" }}>
                            <span>S:{safeNum(hc?.S, 0)}</span>
                            <span>D:{safeNum(hc?.D, 0)}</span>
                            <span>T:{safeNum(hc?.T, 0)}</span>
                            <span style={{ opacity: 0.8 }}>MISS:{safeNum(hc?.MISS, 0)}</span>
                          </div>

                          <div style={{ fontWeight: 1000, color: theme.primary }}>{safeNum(hc?.points, 0)} pts</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ACTIONS */}
        <div style={{ display: "flex", gap: 10, justifyContent: "space-between", marginTop: 14 }}>
          <button
            onClick={() => props?.go?.("history")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 900,
              flex: 1,
            }}
          >
            ← Retour
          </button>

          <button
            onClick={() => props?.go?.("shanghai")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: `1px solid ${theme.borderSoft}`,
              background: "rgba(0,0,0,0.22)",
              color: theme.text,
              fontWeight: 900,
              flex: 1,
            }}
          >
            Rejouer
          </button>

          <button
            onClick={() => props?.go?.("games")}
            style={{
              borderRadius: 999,
              padding: "10px 14px",
              border: "none",
              background: theme.primary,
              color: "#000",
              fontWeight: 1000,
              flex: 1,
              boxShadow: `0 12px 26px ${theme.primary}22`,
            }}
          >
            Quitter
          </button>
        </div>
      </div>
    </div>
  );
}
