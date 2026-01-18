// @ts-nocheck
// =============================================================
// src/pages/KillerSummaryPage.tsx
// KILLER — SUMMARY (page dédiée)
// - Affiche podium + classement + stats KILLER (kills / dmg / throws / became killer...)
// - Supporte plusieurs formats de record (endRec.summary.perPlayer, payload.summary, etc.)
// - Fonctionne avec go("killer_summary", { record })
// =============================================================

import React from "react";
import type { Store, MatchRecord } from "../lib/types";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any; // { record?: MatchRecord, recordId?: string }
};

const pageBg =
  "radial-gradient(circle at 25% 0%, rgba(255,198,58,.18) 0, rgba(0,0,0,0) 35%), radial-gradient(circle at 80% 30%, rgba(255,198,58,.10) 0, rgba(0,0,0,0) 40%), linear-gradient(180deg, #0a0a0c, #050507 60%, #020203)";

const gold = "#ffc63a";
const gold2 = "#ffaf00";

const card: React.CSSProperties = {
  background: "linear-gradient(180deg, rgba(22,22,23,.85), rgba(12,12,14,.95))",
  border: "1px solid rgba(255,255,255,.08)",
  borderRadius: 18,
  boxShadow: "0 10px 30px rgba(0,0,0,.35)",
};

function clampInt(n: any, min: number, max: number, fallback: number) {
  const x = Math.floor(Number(n));
  if (!Number.isFinite(x)) return fallback;
  return Math.max(min, Math.min(max, x));
}

function fmtDate(ts: any) {
  const t = Number(ts);
  if (!Number.isFinite(t)) return "—";
  try {
    return new Date(t).toLocaleString();
  } catch {
    return "—";
  }
}

function truthy(v: any): boolean {
  if (v === true) return true;
  if (v === false) return false;
  if (v === 1) return true;
  if (v === 0) return false;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "on" || s === "yes" || s === "oui") return true;
    if (s === "false" || s === "0" || s === "off" || s === "no" || s === "non") return false;
  }
  return !!v;
}

function AvatarMedallion({ size, src, name }: { size: number; src?: string | null; name?: string }) {
  const initials = String(name || "J").trim().slice(0, 1).toUpperCase();
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        overflow: "hidden",
        background: "transparent",
      }}
    >
      {src ? (
        <img src={src} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "grid",
            placeItems: "center",
            borderRadius: "50%",
            background: "rgba(255,255,255,.06)",
            border: "1px solid rgba(255,255,255,.10)",
            fontWeight: 1000,
            color: "#fff",
          }}
        >
          {initials}
        </div>
      )}
    </div>
  );
}

function findRecordInStore(store: any, recordId: string) {
  if (!store || !recordId) return null;

  // formats fréquents
  const candidates = [
    store?.history,
    store?.history?.records,
    store?.history?.matches,
    store?.history?.items,
    store?.matches,
    store?.records,
    store?.historyList,
  ];

  for (const c of candidates) {
    if (!c) continue;

    if (Array.isArray(c)) {
      const hit = c.find((r: any) => String(r?.id || r?.matchId || r?.createdAt) === String(recordId));
      if (hit) return hit;
    }

    if (typeof c === "object") {
      // si map par id
      if (c[recordId]) return c[recordId];
      // si { items: [] }
      if (Array.isArray(c.items)) {
        const hit = c.items.find((r: any) => String(r?.id || r?.matchId || r?.createdAt) === String(recordId));
        if (hit) return hit;
      }
    }
  }

  return null;
}

function extractPerPlayer(rec: any): any[] {
  // Supporte plusieurs structures
  const direct =
    rec?.summary?.perPlayer ||
    rec?.payload?.summary?.perPlayer ||
    rec?.payload?.payload?.summary?.perPlayer ||
    rec?.summary?.detailedByPlayer ||
    rec?.payload?.summary?.detailedByPlayer;

  if (Array.isArray(direct)) return direct;

  // detailedByPlayer -> array
  if (direct && typeof direct === "object") {
    return Object.values(direct);
  }

  // fallback: rec.players (moins riche)
  if (Array.isArray(rec?.players)) {
    return rec.players.map((p: any) => ({
      id: p.id,
      playerId: p.playerId || p.id,
      name: p.name,
      avatarDataUrl: p.avatarDataUrl,
      isBot: p.isBot,
      botLevel: p.botLevel,
      finalRank: p.finalRank || 0,
      kills: p.kills || 0,
      livesTaken: p.livesTaken || 0,
      totalThrows: p.totalThrows || 0,
      throwsToBecomeKiller: p.throwsToBecomeKiller || 0,
      killerHits: p.killerHits || 0,
      uselessHits: p.uselessHits || 0,
      number: p.number,
      eliminated: p.eliminated,
      isKiller: p.isKiller,
    }));
  }

  return [];
}

function normalizeRow(p: any) {
  const id = String(p?.id || p?.playerId || p?.profileId || "");
  const name = p?.name || "Joueur";
  const avatarDataUrl = p?.avatarDataUrl ?? null;

  const rank = clampInt(p?.finalRank, 0, 999, 0);

  const kills = clampInt(p?.kills, 0, 999, 0);
  const dmg = clampInt(p?.livesTaken, 0, 9999, 0);
  const throwsTotal = clampInt(p?.totalThrows, 0, 9999, 0);
  const becomeThrows = clampInt(p?.throwsToBecomeKiller, 0, 9999, 0);

  const killerHits = clampInt(p?.killerHits, 0, 9999, 0);
  const uselessHits = clampInt(p?.uselessHits, 0, 9999, 0);

  // ✅ variantes (si dispo)
  const autoKills = clampInt(p?.autoKills ?? p?.auto_kills, 0, 9999, 0);
  const selfPenaltyHits = clampInt(p?.selfPenaltyHits ?? p?.self_penalty_hits ?? p?.selfHits, 0, 9999, 0);
  const livesStolen = clampInt(p?.livesStolen ?? p?.lives_stolen, 0, 9999, 0);
  const livesHealed = clampInt(p?.livesHealed ?? p?.lives_healed, 0, 9999, 0);

  const number = clampInt(p?.number, 0, 25, 0);
  const eliminated = !!p?.eliminated;
  const isKiller = !!p?.isKiller;

  const isBot = !!p?.isBot;
  const botLevel = p?.botLevel || "";

  return {
    id,
    name,
    avatarDataUrl,
    rank,
    kills,
    dmg,
    throwsTotal,
    becomeThrows,
    killerHits,
    uselessHits,
    autoKills,
    selfPenaltyHits,
    livesStolen,
    livesHealed,
    number,
    eliminated,
    isKiller,
    isBot,
    botLevel,
  };
}

export default function KillerSummaryPage({ store, go, params }: Props) {
  const recFromParams = params?.record || params?.match || params?.rec || null;
  const recordId = params?.recordId ? String(params.recordId) : "";

  const rec = React.useMemo(() => {
    if (recFromParams) return recFromParams;
    if (recordId) return findRecordInStore(store as any, recordId);
    return null;
  }, [recFromParams, recordId, store]);

  const meta = React.useMemo(() => {
    const mode = rec?.summary?.mode || rec?.payload?.mode || rec?.kind || "killer";
    const createdAt = rec?.createdAt || rec?.updatedAt || rec?.ts || null;
    const winnerId = String(rec?.winnerId || "");
    const cfg = rec?.summary || rec?.payload?.config || rec?.payload?.payload?.config || rec?.payload?.config || null;

    // Variantes (robustes)
    const selfPenaltyOn = truthy(
      cfg?.selfHitWhileKiller ??
        cfg?.selfPenalty ??
        cfg?.self_penalty ??
        cfg?.variants?.selfHitWhileKiller ??
        cfg?.variants?.selfPenalty ??
        cfg?.variants?.self_penalty
    );
    const lifeStealOn = truthy(
      cfg?.lifeSteal ?? cfg?.life_steal ?? cfg?.variants?.lifeSteal ?? cfg?.variants?.life_steal
    );
    const bullHealOn = truthy(
      cfg?.bullHeal ?? cfg?.bull_heal ?? cfg?.variants?.bullHeal ?? cfg?.variants?.bull_heal
    );

    const livesStart = clampInt(rec?.summary?.livesStart ?? cfg?.lives, 1, 99, 3);
    const becomeRule = rec?.summary?.becomeRule ?? cfg?.becomeRule ?? "single";
    const damageRule = rec?.summary?.damageRule ?? cfg?.damageRule ?? "multiplier";

    return { mode, createdAt, winnerId, livesStart, becomeRule, damageRule, selfPenaltyOn, lifeStealOn, bullHealOn };
  }, [rec]);

  const rows = React.useMemo(() => {
    const per = extractPerPlayer(rec);
    let out = per.map(normalizeRow);

    // Si ranks manquants, fallback simple : gagnant d'abord, puis survivants, puis morts
    const hasRanks = out.some((r) => (r.rank || 0) > 0);
    if (!hasRanks) {
      const winnerId = meta.winnerId;
      out = out
        .slice()
        .sort((a, b) => {
          if (winnerId && a.id === winnerId) return -1;
          if (winnerId && b.id === winnerId) return 1;
          if (!a.eliminated && b.eliminated) return -1;
          if (a.eliminated && !b.eliminated) return 1;
          return (b.dmg + b.kills) - (a.dmg + a.kills);
        })
        .map((r, i) => ({ ...r, rank: i + 1 }));
    } else {
      out = out.slice().sort((a, b) => (a.rank || 999) - (b.rank || 999));
    }

    // Nettoyage id vide
    out = out.map((r, i) => ({ ...r, id: r.id || `p_${i}` }));
    return out;
  }, [rec, meta.winnerId]);

  const podium = React.useMemo(() => rows.slice(0, 3), [rows]);
  const winnerRow = podium[0] || null;

  if (!rec) {
    return (
      <div style={{ minHeight: "100vh", background: pageBg, color: "#fff", padding: 14 }}>
        <div style={{ ...card, padding: 14 }}>
          <div style={{ fontWeight: 1000, color: gold, letterSpacing: 1.2, textTransform: "uppercase" }}>
            Résumé KILLER
          </div>
          <div style={{ marginTop: 10, opacity: 0.9 }}>
            Aucun record KILLER trouvé (params manquants ou historique non chargé).
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => go("history")}
              style={{
                height: 42,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,180,0,.30)",
                background: `linear-gradient(180deg, ${gold}, ${gold2})`,
                color: "#1a1a1a",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              ← Historique
            </button>
            <button
              type="button"
              onClick={() => go("killer_config")}
              style={{
                height: 42,
                padding: "0 14px",
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.14)",
                background: "rgba(255,255,255,.06)",
                color: "#fff",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Rejouer
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: pageBg, color: "#fff", padding: "10px 12px 18px" }}>
      {/* HEADER */}
      <div
        style={{
          ...card,
          padding: 10,
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          type="button"
          onClick={() => go("history")}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,180,0,.30)",
            background: `linear-gradient(180deg, ${gold}, ${gold2})`,
            color: "#1a1a1a",
            fontWeight: 1000,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          ← Historique
        </button>

        <div style={{ textAlign: "center", lineHeight: 1 }}>
          <div style={{ fontWeight: 1000, color: gold, letterSpacing: 1.6, textTransform: "uppercase" }}>
            Résumé KILLER
          </div>
          <div style={{ marginTop: 4, fontSize: 11, opacity: 0.8 }}>
            {fmtDate(meta.createdAt)} · vies {meta.livesStart} · become {String(meta.becomeRule)} · damage{" "}
            {String(meta.damageRule)}
          </div>
        </div>

        <button
          type="button"
          onClick={() => go("killer_config")}
          style={{
            height: 34,
            padding: "0 12px",
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.14)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 1000,
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          Rejouer
        </button>
      </div>

      {/* PODIUM */}
      <div style={{ marginTop: 10, ...card, padding: 14, border: "1px solid rgba(255,198,58,.18)" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 1000, color: gold, letterSpacing: 1.2, textTransform: "uppercase" }}>Podium</div>
          <div style={{ fontSize: 12, opacity: 0.85 }}>{winnerRow ? `🏆 ${winnerRow.name}` : ""}</div>
        </div>

        <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
          {podium.map((p, idx) => (
            <div
              key={p.id}
              style={{
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.08)",
                background: idx === 0 ? "rgba(255,198,58,.10)" : "rgba(0,0,0,.20)",
                padding: 10,
                textAlign: "center",
              }}
            >
              <div style={{ fontWeight: 1000, color: idx === 0 ? gold : "#fff" }}>{idx + 1}</div>
              <div style={{ marginTop: 8, display: "grid", placeItems: "center" }}>
                <AvatarMedallion size={54} src={p.avatarDataUrl} name={p.name} />
              </div>
              <div
                style={{
                  marginTop: 8,
                  fontWeight: 1000,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                title={p.name}
              >
                {p.name}
              </div>
              <div style={{ marginTop: 6, fontSize: 11, opacity: 0.85 }}>
                kills {p.kills} · dmg {p.dmg}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* CLASSEMENT */}
      <div style={{ marginTop: 10, ...card, padding: 14 }}>
        <div style={{ fontWeight: 1000, color: "#ffe7b0", letterSpacing: 1.2, textTransform: "uppercase" }}>
          Classement complet
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {rows.map((p, i) => (
            <div
              key={p.id}
              style={{
                display: "grid",
                gridTemplateColumns: "34px 1fr auto",
                gap: 10,
                alignItems: "center",
                padding: "10px 10px",
                borderRadius: 16,
                border: "1px solid rgba(255,255,255,.08)",
                background: i === 0 ? "rgba(255,198,58,.10)" : "rgba(0,0,0,.22)",
              }}
            >
              <div style={{ fontWeight: 1000, color: i === 0 ? gold : "#fff", textAlign: "center" }}>{p.rank}</div>

              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <AvatarMedallion size={34} src={p.avatarDataUrl} name={p.name} />
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 1000,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.name}{" "}
                    <span style={{ fontSize: 12, opacity: 0.8 }}>
                      #{p.number}{p.isBot ? ` · 🤖${p.botLevel ? ` ${p.botLevel}` : ""}` : ""}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>
                    kills {p.kills} · dmg {p.dmg} · lancers {p.throwsTotal}
                    {p.autoKills ? ` · autokill ${p.autoKills}` : ""}
                    {meta.selfPenaltyOn ? ` · auto-hit ${p.selfPenaltyHits || 0}` : ""}
                    {meta.lifeStealOn ? ` · vies volées ${p.livesStolen || 0}` : ""}
                    {meta.bullHealOn ? ` · vies gagnées ${p.livesHealed || 0}` : ""}
                    {p.becomeThrows ? ` · become ${p.becomeThrows}` : ""}
                  </div>
                </div>
              </div>

              <div style={{ fontWeight: 1000, color: i === 0 ? gold : "#ffe7b0" }}>{i === 0 ? "WIN" : ""}</div>
            </div>
          ))}
        </div>
      </div>

      {/* STATS GLOBALES */}
      <div style={{ marginTop: 10, ...card, padding: 14 }}>
        <div style={{ fontWeight: 1000, color: "#ffe7b0", letterSpacing: 1.2, textTransform: "uppercase" }}>
          Stats match
        </div>

        <div style={{ marginTop: 10, display: "grid", gap: 8 }}>
          {(() => {
            const totalThrows = rows.reduce((a, b) => a + (b.throwsTotal || 0), 0);
            const totalKills = rows.reduce((a, b) => a + (b.kills || 0), 0);
            const totalDmg = rows.reduce((a, b) => a + (b.dmg || 0), 0);
            const becameAvg =
              rows.filter((p) => (p.becomeThrows || 0) > 0).reduce((a, b) => a + (b.becomeThrows || 0), 0) /
              Math.max(1, rows.filter((p) => (p.becomeThrows || 0) > 0).length);

            const line = (label: string, value: any) => (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 10px",
                  borderRadius: 16,
                  border: "1px solid rgba(255,255,255,.08)",
                  background: "rgba(0,0,0,.22)",
                }}
              >
                <div style={{ fontSize: 12, opacity: 0.9 }}>{label}</div>
                <div style={{ fontWeight: 1000 }}>{value}</div>
              </div>
            );

            return (
              <>
                {line("Total lancers", totalThrows)}
                {line("Total kills", totalKills)}
                {line("Total dégâts (vies prises)", totalDmg)}
                {meta.selfPenaltyOn && line("Total auto-hit", rows.reduce((a, b) => a + (b.selfPenaltyHits || 0), 0))}
                {line("Total autokill", rows.reduce((a, b) => a + (b.autoKills || 0), 0))}
                {meta.lifeStealOn && line("Total vies volées", rows.reduce((a, b) => a + (b.livesStolen || 0), 0))}
                {meta.bullHealOn && line("Total vies gagnées", rows.reduce((a, b) => a + (b.livesHealed || 0), 0))}
                {line("Moyenne lancers pour devenir KILLER", Number.isFinite(becameAvg) ? becameAvg.toFixed(1) : "—")}
              </>
            );
          })()}
        </div>
      </div>

      {/* ACTIONS BAS */}
      <div style={{ marginTop: 12, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => go("history")}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,180,0,.30)",
            background: `linear-gradient(180deg, ${gold}, ${gold2})`,
            color: "#1a1a1a",
            fontWeight: 1000,
            cursor: "pointer",
          }}
        >
          ← Historique
        </button>

        <button
          type="button"
          onClick={() => go("killer_config")}
          style={{
            height: 44,
            padding: "0 16px",
            borderRadius: 14,
            border: "1px solid rgba(255,255,255,.16)",
            background: "rgba(255,255,255,.06)",
            color: "#fff",
            fontWeight: 1000,
            cursor: "pointer",
          }}
        >
          Rejouer
        </button>
      </div>
    </div>
  );
}
