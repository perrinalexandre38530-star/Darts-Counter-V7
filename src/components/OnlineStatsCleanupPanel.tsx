// @ts-nocheck
// =============================================================
// src/components/OnlineStatsCleanupPanel.tsx
// UI développeur : exclusion/restauration des sessions Online
// =============================================================

import React from "react";
import { useTheme } from "../contexts/ThemeContext";
import {
  hardDeleteOnlineStatsSessions,
  listOnlineStatsCleanupSessions,
  setOnlineStatsSessionsExcluded,
  type OnlineStatsCleanupSession,
} from "../lib/onlineStatsExclusions";

function formatDate(ts: number) {
  try {
    return new Date(Number(ts || Date.now())).toLocaleString();
  } catch {
    return "Date inconnue";
  }
}

function uniqKeysForSessions(sessions: OnlineStatsCleanupSession[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const session of sessions || []) {
    for (const key of session.keys || [session.id]) {
      const s = String(key || "").trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(s);
    }
  }
  return out;
}

function isMissingScore(label: any) {
  const s = String(label || "").trim().toLowerCase();
  return !s || s.includes("score non disponible") || s.includes("non disponible");
}

function compactTopScore(session: OnlineStatsCleanupSession) {
  const raw = String(session.scoreLabel || "").trim();
  if (isMissingScore(raw)) return "";

  const chunks = raw.split(/\s+·\s+/).map((x) => x.trim()).filter(Boolean);
  const playerScoreParts: string[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    const c = chunks[i];
    if (!/:/.test(c)) continue;
    if (/\b(reste|score|set|sets|leg|legs|manche|pts|points)\b/i.test(c)) {
      playerScoreParts.push(c.replace(/:\s*/g, " "));
    }
  }
  if (playerScoreParts.length) return playerScoreParts.slice(0, 4).join(" / ");

  return raw.length > 96 ? `${raw.slice(0, 93)}…` : raw;
}

export default function OnlineStatsCleanupPanel() {
  const { theme } = useTheme();
  const [sessions, setSessions] = React.useState<OnlineStatsCleanupSession[]>([]);
  const [selected, setSelected] = React.useState<Record<string, boolean>>({});
  const [showExcluded, setShowExcluded] = React.useState(true);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setBusy(true);
    try {
      const rows = await listOnlineStatsCleanupSessions();
      setSessions(rows);
    } catch (e: any) {
      setMessage(e?.message ? String(e.message) : "Erreur lecture sessions Online.");
    } finally {
      setBusy(false);
    }
  }, []);

  React.useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener("dc-history-updated", refresh);
    window.addEventListener("dc-online-stats-exclusions-changed", refresh);
    return () => {
      window.removeEventListener("dc-history-updated", refresh);
      window.removeEventListener("dc-online-stats-exclusions-changed", refresh);
    };
  }, [load]);

  const visibleSessions = React.useMemo(
    () => sessions.filter((s) => showExcluded || !s.excludedFromStats),
    [sessions, showExcluded],
  );

  const selectedSessions = React.useMemo(
    () => sessions.filter((s) => selected[s.id] || selected[s.matchId] || (s.keys || []).some((k) => selected[k])),
    [sessions, selected],
  );

  const summary = React.useMemo(() => {
    const total = sessions.length;
    const excluded = sessions.filter((s) => s.excludedFromStats).length;
    return { total, excluded, counted: total - excluded };
  }, [sessions]);

  const selectedKeys = React.useMemo(() => uniqKeysForSessions(selectedSessions), [selectedSessions]);

  const toggle = (session: OnlineStatsCleanupSession) => {
    setSelected((prev) => {
      const next = { ...prev };
      const key = session.id;
      if (next[key]) delete next[key];
      else next[key] = true;
      return next;
    });
  };

  const selectAllVisible = () => {
    const next: Record<string, boolean> = {};
    for (const s of visibleSessions) next[s.id] = true;
    setSelected(next);
  };

  const clearSelection = () => setSelected({});

  async function runAction(label: string, fn: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      clearSelection();
      await load();
      setMessage(label);
    } catch (e: any) {
      setMessage(e?.message ? String(e.message) : "Erreur opération nettoyage Online.");
    } finally {
      setBusy(false);
    }
  }

  const excludeSelected = () => {
    if (!selectedKeys.length) {
      setMessage("Sélectionne au moins une session à exclure des stats.");
      return;
    }
    runAction("Session(s) masquée(s) des stats Online. Rien n’a été supprimé.", () => setOnlineStatsSessionsExcluded(selectedKeys, true, "manual-online-cleanup"));
  };

  const restoreSelected = () => {
    if (!selectedKeys.length) {
      setMessage("Sélectionne au moins une session à restaurer.");
      return;
    }
    runAction("Session(s) remise(s) dans les stats Online.", () => setOnlineStatsSessionsExcluded(selectedKeys, false, "manual-online-restore"));
  };

  const hardDeleteSelected = () => {
    if (!selectedKeys.length) {
      setMessage("Sélectionne au moins une session à supprimer.");
      return;
    }
    const ok = window.confirm(
      "Suppression définitive des sessions sélectionnées ?\n\n" +
        "Cette action retire les matchs sources de l'historique local/Online. Préfère Exclure des stats si tu n'es pas sûr."
    );
    if (!ok) return;
    runAction("Session(s) supprimée(s) définitivement.", () => hardDeleteOnlineStatsSessions(selectedKeys));
  };

  const btn = (tone: "primary" | "soft" | "danger" = "soft"): React.CSSProperties => {
    const isPrimary = tone === "primary";
    const isDanger = tone === "danger";
    const color = isDanger ? "#ff9d9d" : isPrimary ? theme.primary : theme.text;
    const border = isDanger ? "rgba(255,120,120,0.55)" : isPrimary ? theme.primary : theme.borderSoft;
    return {
      borderRadius: 12,
      border: `1px solid ${border}`,
      padding: "9px 10px",
      background: isPrimary ? "rgba(0,0,0,0.45)" : isDanger ? "rgba(120,0,0,0.18)" : "rgba(255,255,255,0.04)",
      color,
      fontWeight: 900,
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      cursor: busy ? "wait" : "pointer",
      boxShadow: isPrimary ? `0 0 14px ${theme.primary}33` : "none",
      opacity: busy ? 0.7 : 1,
    };
  };

  const chip = (active: boolean): React.CSSProperties => ({
    borderRadius: 999,
    padding: "4px 8px",
    border: `1px solid ${active ? "rgba(255,120,120,0.5)" : theme.primary}`,
    background: active ? "rgba(255,80,80,0.12)" : `${theme.primary}18`,
    color: active ? "#ffb4b4" : theme.primary,
    fontSize: 10,
    fontWeight: 950,
    letterSpacing: 0.6,
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  });

  return (
    <section
      style={{
        borderRadius: 18,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(10,10,16,0.88)",
        padding: 14,
        boxShadow: `0 18px 34px rgba(0,0,0,0.65), 0 0 18px ${theme.primary}22`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
        <div>
          <div style={{ color: theme.primary, fontWeight: 950, letterSpacing: 0.8, textTransform: "uppercase", fontSize: 16 }}>
            Nettoyage Online
          </div>
          <div style={{ color: theme.textSoft, fontSize: 12, lineHeight: 1.35, marginTop: 5 }}>
            Exclut les sessions de test des stats sans casser l’historique. Le compteur ci-dessous liste les sessions détectées comme nettoyables ; l’onglet Online peut aussi compter des miroirs/tests incomplets sans statistiques.
          </div>
        </div>
        <button type="button" onClick={load} style={btn("soft")} disabled={busy}>
          Rafraîchir
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
          gap: 8,
          marginTop: 12,
        }}
      >
        <MiniStat label="Listées" value={summary.total} color={theme.text} />
        <MiniStat label="Comptées" value={summary.counted} color={theme.primary} />
        <MiniStat label="Masquées" value={summary.excluded} color="#ff9d9d" />
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button type="button" onClick={excludeSelected} style={btn("primary")} disabled={busy}>Exclure des stats</button>
        <button type="button" onClick={restoreSelected} style={btn("soft")} disabled={busy}>Restaurer dans les stats</button>
        <button type="button" onClick={hardDeleteSelected} style={btn("danger")} disabled={busy}>Supprimer définitivement</button>
      </div>

      <div style={{ color: theme.textSoft, fontSize: 11, lineHeight: 1.35, marginTop: 7 }}>
        <strong style={{ color: theme.primary }}>Exclure des stats</strong> ne supprime rien : la partie est seulement masquée des stats/classements et reste restaurable. <strong style={{ color: "#ffb4b4" }}>Supprimer définitivement</strong> retire la session source.
      </div>

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={selectAllVisible} style={btn("soft")} disabled={busy}>Tout sélectionner</button>
          <button type="button" onClick={clearSelection} style={btn("soft")} disabled={busy}>Désélectionner</button>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 7, color: theme.textSoft, fontSize: 12, fontWeight: 800 }}>
          <input type="checkbox" checked={showExcluded} onChange={(e) => setShowExcluded(e.target.checked)} />
          Voir exclues
        </label>
      </div>

      {message && (
        <div style={{ marginTop: 10, color: theme.primary, fontSize: 12, fontWeight: 900 }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {busy && sessions.length === 0 ? (
          <div style={{ color: theme.textSoft, fontSize: 12 }}>Lecture des sessions Online…</div>
        ) : visibleSessions.length === 0 ? (
          <div style={{ color: theme.textSoft, fontSize: 12 }}>Aucune session Online trouvée.</div>
        ) : (
          visibleSessions.map((session) => {
            const checked = !!selected[session.id];
            const topScore = compactTopScore(session);
            return (
              <button
                key={`${session.source}-${session.id}`}
                type="button"
                onClick={() => toggle(session)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  borderRadius: 16,
                  border: `1px solid ${checked ? theme.primary : theme.borderSoft}`,
                  background: checked ? `${theme.primary}16` : "rgba(255,255,255,0.035)",
                  color: theme.text,
                  padding: 10,
                  cursor: "pointer",
                  boxShadow: checked ? `0 0 14px ${theme.primary}22` : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                    <input type="checkbox" checked={checked} readOnly />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ color: theme.primary, fontWeight: 950, fontSize: 12, textTransform: "uppercase", letterSpacing: 0.7 }}>
                        {session.mode || "Online"} · {formatDate(session.createdAt)}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap", marginTop: 3 }}>
                        <span style={{ color: theme.textSoft, fontSize: 11, overflow: "hidden", textOverflow: "ellipsis" }}>
                          {session.playersLabel}
                        </span>
                        {topScore ? (
                          <span
                            style={{
                              borderRadius: 999,
                              border: `1px solid ${theme.primary}66`,
                              background: `${theme.primary}14`,
                              color: theme.primary,
                              fontSize: 10,
                              fontWeight: 950,
                              lineHeight: 1.2,
                              padding: "3px 7px",
                              maxWidth: "100%",
                            }}
                          >
                            {topScore}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span style={chip(session.excludedFromStats)}>{session.excludedFromStats ? "Exclue" : "Comptée"}</span>
                </div>

                <div
                  style={{
                    marginTop: 9,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.08)",
                    background: "rgba(0,0,0,0.24)",
                    padding: "7px 8px",
                  }}
                >
                  <div style={{ color: "rgba(255,255,255,0.52)", fontSize: 9, fontWeight: 950, textTransform: "uppercase", letterSpacing: 0.6 }}>
                    Score / repère
                  </div>
                  <div style={{ color: theme.text, fontSize: 11, fontWeight: 850, marginTop: 2, lineHeight: 1.25 }}>
                    {session.scoreLabel || "Score non disponible"}
                  </div>
                  {session.detailLabel ? (
                    <div style={{ color: theme.textSoft, fontSize: 10, fontWeight: 750, marginTop: 2, lineHeight: 1.25 }}>
                      {session.detailLabel}
                    </div>
                  ) : null}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 6, marginTop: 9 }}>
                  <SmallMetric label="Darts" value={session.darts || "—"} />
                  <SmallMetric label="Moy.3D" value={session.avg3 ? session.avg3.toFixed(1) : "—"} />
                  <SmallMetric label="Hits %" value={session.hitPct ? `${session.hitPct.toFixed(1)}%` : "—"} />
                  <SmallMetric label="BV" value={session.bestVisit || "—"} />
                  <SmallMetric label="CO" value={session.bestCheckout || "—"} />
                  <SmallMetric label="Source" value={session.source === "history" ? "Hist." : session.source === "store" ? "Store" : "Local"} />
                </div>

                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, marginTop: 8, wordBreak: "break-all" }}>
                  ID : {session.matchId || session.id}
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}

function MiniStat({ label, value, color }: { label: string; value: any; color: string }) {
  return (
    <div style={{ borderRadius: 14, border: "1px solid rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.035)", padding: 10 }}>
      <div style={{ color: "rgba(255,255,255,0.58)", fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 0.6 }}>{label}</div>
      <div style={{ color, fontSize: 18, fontWeight: 950, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function SmallMetric({ label, value }: { label: string; value: any }) {
  return (
    <div style={{ borderRadius: 12, background: "rgba(0,0,0,0.28)", padding: "6px 7px" }}>
      <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 9, fontWeight: 900, textTransform: "uppercase" }}>{label}</div>
      <div style={{ color: "#fff", fontSize: 12, fontWeight: 900, marginTop: 1 }}>{value}</div>
    </div>
  );
}
