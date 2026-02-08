import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import Section from "../components/Section";
import { useLang } from "../contexts/LangContext";
import { useTheme } from "../contexts/ThemeContext";
import { TERRITORY_MAPS } from "../lib/territories/maps";
import {
  clearTerritoriesHistory,
  loadTerritoriesHistory,
  type TerritoriesMatch,
} from "../lib/territories/territoriesStats";

const INFO_TEXT = `STATS TERRITORIES

- Parties enregistrées localement (sur l'appareil)
- KPIs : maps jouées, winrate, domination
- Reset possible via le bouton "effacer"`;

function fmtDate(ts: number) {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export default function StatsTerritories(props: any) {
  const { t } = useLang();
  const { theme } = useTheme();

  const embedded = Boolean(props?.embedded);

  const [items, setItems] = React.useState<TerritoriesMatch[]>(() => loadTerritoriesHistory());

  // Auto-refresh when Territories history updates (same event used by History)
  React.useEffect(() => {
    const onUpd = () => setItems(loadTerritoriesHistory());
    const onStorage = (e: StorageEvent) => {
      if (e.key === "dc_territories_history_v1") onUpd();
    };
    window.addEventListener("dc-territories-updated", onUpd);
    window.addEventListener("dc-history-updated", onUpd);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("dc-territories-updated", onUpd);
      window.removeEventListener("dc-history-updated", onUpd);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  function goBack() {
    if (props?.setTab) return props.setTab("stats");
    window.history.back();
  }

  function refresh() {
    setItems(loadTerritoriesHistory());
  }

  function clearAll() {
    clearTerritoriesHistory();
    refresh();
  }

  const total = items.length;
  const byMap = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) m[it.mapId] = (m[it.mapId] || 0) + 1;
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const avgDom = React.useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + Math.max(...(it.domination || [0])), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const avgRounds = React.useMemo(() => {
    if (!items.length) return 0;
    const sum = items.reduce((acc, it) => acc + (Number(it.rounds) || 0), 0);
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const bestWinDom = React.useMemo(() => {
    let best = 0;
    let bestId: string | null = null;
    for (const it of items) {
      const v = Math.max(...(it.domination || [0]));
      if (v > best) {
        best = v;
        bestId = it.id;
      }
    }
    return { best, bestId };
  }, [items]);

  const avgMargin = React.useMemo(() => {
    if (!items.length) return 0;
    let sum = 0;
    for (const it of items) {
      const dom = (it.domination || []).map((x) => Number(x) || 0);
      const sorted = [...dom].sort((a, b) => b - a);
      const margin = (sorted[0] || 0) - (sorted[1] || 0);
      sum += margin;
    }
    return Math.round((sum / items.length) * 10) / 10;
  }, [items]);

  const bestMargin = React.useMemo(() => {
    let best = 0;
    let bestId: string | null = null;
    for (const it of items) {
      const dom = (it.domination || []).map((x) => Number(x) || 0);
      const sorted = [...dom].sort((a, b) => b - a);
      const margin = (sorted[0] || 0) - (sorted[1] || 0);
      if (margin > best) {
        best = margin;
        bestId = it.id;
      }
    }
    return { best, bestId };
  }, [items]);

  const byFormat = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const label = it.teamSize === 1 ? "Solo" : `${it.teamSize}v${it.teamSize}`;
      m[label] = (m[label] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const byObjective = React.useMemo(() => {
    const m: Record<string, number> = {};
    for (const it of items) {
      const k = String(it.objective ?? "?");
      m[k] = (m[k] || 0) + 1;
    }
    return Object.entries(m).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const recent7 = React.useMemo(() => {
    const now = Date.now();
    const seven = 7 * 24 * 3600 * 1000;
    return items.filter((it) => now - (it.when || 0) <= seven);
  }, [items]);

  const accent = theme?.accent ?? "#FFD700";
  const kpiCardStyle: React.CSSProperties = {
    borderRadius: 16,
    padding: 12,
    border: `1px solid ${accent}2A`,
    background: "rgba(255,255,255,0.05)",
  };

  return (
    <div className={embedded ? undefined : "page"}>
      {!embedded && (
        <PageHeader
          title="STATS — TERRITORIES"
          left={<BackDot onClick={goBack} />}
          right={<InfoDot title="Stats TERRITORIES" content={INFO_TEXT} />}
        />
      )}

      {embedded && (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontWeight: 1000, letterSpacing: 0.4 }}>TERRITORIES</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <button
              onClick={refresh}
              style={{
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                padding: "6px 10px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
                fontSize: 11,
              }}
            >
              {t("generic.refresh", "Rafraîchir")}
            </button>

            <InfoDot title="Stats TERRITORIES" content={INFO_TEXT} />
          </div>
        </div>
      )}

      <div style={{ padding: embedded ? 0 : 12, display: "flex", flexDirection: "column", gap: 12, marginTop: embedded ? 10 : 0 }}>
        <Section title={t("stats.overview", "Vue d'ensemble")}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div
              style={kpiCardStyle}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("stats.matches", "Parties")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{total}</div>
            </div>

            <div
              style={kpiCardStyle}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.maps", "Maps")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{byMap.length}</div>
            </div>

            <div
              style={kpiCardStyle}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.avgDom", "Domination")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{avgDom}</div>
            </div>
          </div>

          {/* ======== KPIs avancés ======== */}
          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10 }}>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.avgRounds", "Tours (moy.)")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{avgRounds}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.avgMargin", "Écart (moy.)")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{avgMargin}</div>
            </div>
            <div style={kpiCardStyle}>
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.last7", "7 derniers jours")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{recent7.length}</div>
            </div>
          </div>

          <div style={{ marginTop: 10, display: "flex", gap: 10 }}>
            <button
              onClick={refresh}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.14)",
                background: "rgba(255,255,255,0.06)",
                padding: "10px 12px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
              }}
            >
              {t("generic.refresh", "Rafraîchir")}
            </button>

            <button
              onClick={clearAll}
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,120,120,0.25)",
                background: "rgba(255,120,120,0.12)",
                padding: "10px 12px",
                color: "#fff",
                fontWeight: 950,
                cursor: "pointer",
              }}
              title="Supprime l'historique TERRITORIES local"
            >
              {t("generic.clear", "Effacer")}
            </button>
          </div>
        </Section>

        <Section title={t("territories.insights", "Aperçus")}> 
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8, color: accent }}>
                {t("territories.formats", "Formats")}
              </div>
              {byFormat.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byFormat.slice(0, 6).map(([k, n]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 950, opacity: 0.9 }}>{k}</div>
                      <div style={{ fontWeight: 1000 }}>{n}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
              )}
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8, color: accent }}>
                {t("territories.objectives", "Objectifs")}
              </div>
              {byObjective.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byObjective.slice(0, 6).map(([k, n]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 950, opacity: 0.9 }}>
                        {t("territories.objective", "Objective")}: {k}
                      </div>
                      <div style={{ fontWeight: 1000 }}>{n}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8, color: accent }}>
                {t("territories.records", "Records")}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, opacity: 0.9 }}>{t("territories.bestWinDom", "Meilleure domination")}</div>
                  <div style={{ fontWeight: 1000 }}>{bestWinDom.best}</div>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ fontWeight: 950, opacity: 0.9 }}>{t("territories.bestMargin", "Plus gros écart")}</div>
                  <div style={{ fontWeight: 1000 }}>{bestMargin.best}</div>
                </div>
              </div>
              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                {t("territories.recordsHint", "Les records sont calculés sur les parties enregistrées localement.")}
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.16)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8, color: accent }}>
                {t("territories.recent", "Récents")}
              </div>
              {recent7.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {recent7.slice(0, 5).map((it) => {
                    const mapName = TERRITORY_MAPS[it.mapId]?.name || it.mapId;
                    const win = Math.max(...(it.domination || [0]));
                    return (
                      <div key={it.id} style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ fontWeight: 950, opacity: 0.9, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {mapName}
                        </div>
                        <div style={{ fontWeight: 1000 }}>{win}</div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("territories.noRecent", "Aucune partie sur les 7 derniers jours.")}</div>
              )}
            </div>
          </div>
        </Section>

        <Section title={t("territories.analysis", "Analyse")}> 
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>{t("territories.formats", "Formats")}</div>
              {byFormat.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byFormat.slice(0, 6).map(([k, n]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                        fontWeight: 900,
                      }}
                    >
                      <span>{k}</span>
                      <span style={{ opacity: 0.85 }}>{n}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
              )}
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 8 }}>{t("territories.objectives", "Objectifs")}</div>
              {byObjective.length ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {byObjective.slice(0, 6).map(([k, n]) => (
                    <div
                      key={k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: 10,
                        padding: "8px 10px",
                        borderRadius: 12,
                        border: "1px solid rgba(255,255,255,0.10)",
                        background: "rgba(255,255,255,0.04)",
                        fontWeight: 900,
                      }}
                    >
                      <span>{t("territories.objective", "Objective")}: {k}</span>
                      <span style={{ opacity: 0.85 }}>{n}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
              )}
            </div>
          </div>

          <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 6 }}>{t("territories.bestDom", "Meilleure domination")}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                {t("territories.bestDomValue", "Score max (team gagnante)")}: <strong>{bestWinDom.best}</strong>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                {bestWinDom.bestId ? `#${bestWinDom.bestId}` : "—"}
              </div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.10)",
                background: "rgba(0,0,0,0.14)",
              }}
            >
              <div style={{ fontWeight: 1000, marginBottom: 6 }}>{t("territories.bestMargin", "Plus gros écart")}</div>
              <div style={{ fontSize: 13, opacity: 0.9 }}>
                {t("territories.bestMarginValue", "Écart max")}: <strong>{bestMargin.best}</strong>
              </div>
              <div style={{ marginTop: 6, fontSize: 12, opacity: 0.7 }}>
                {bestMargin.bestId ? `#${bestMargin.bestId}` : "—"}
              </div>
            </div>
          </div>
        </Section>

        <Section title={t("territories.topMaps", "Maps les plus jouées")}>
          {byMap.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {byMap.slice(0, 8).map(([mapId, n]) => {
                const name = TERRITORY_MAPS[mapId]?.name || mapId;
                return (
                  <div
                    key={mapId}
                    style={{
                      borderRadius: 14,
                      padding: 10,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(0,0,0,0.16)",
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 12,
                    }}
                  >
                    <div style={{ fontWeight: 1000 }}>{name}</div>
                    <div style={{ fontWeight: 1000, opacity: 0.85 }}>{n}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
          )}
        </Section>

        <Section title={t("stats.history", "Historique")}> 
          {items.length ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {items.slice(0, 30).map((it) => {
                const mapName = TERRITORY_MAPS[it.mapId]?.name || it.mapId;
                return (
                  <div
                    key={it.id}
                    style={{
                      borderRadius: 16,
                      padding: 12,
                      border: "1px solid rgba(255,255,255,0.10)",
                      background: "rgba(255,255,255,0.04)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ fontWeight: 1000 }}>{mapName}</div>
                      <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 900 }}>{fmtDate(it.when)}</div>
                    </div>
                    <div style={{ marginTop: 6, fontSize: 12, opacity: 0.85, fontWeight: 900 }}>
                      Teams: {it.teams} — {it.teamSize === 1 ? "Solo" : `${it.teamSize}v${it.teamSize}`} — Objective: {it.objective}
                    </div>
                    <div style={{ marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {(it.domination || []).map((d, i) => (
                        <div
                          key={i}
                          style={{
                            padding: "6px 10px",
                            borderRadius: 999,
                            border: "1px solid rgba(255,255,255,0.10)",
                            background: i === it.winnerTeam ? "rgba(255,215,100,0.14)" : "rgba(0,0,0,0.14)",
                            fontSize: 12,
                            fontWeight: 950,
                          }}
                        >
                          T{i + 1}: {d}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div style={{ fontSize: 13, opacity: 0.8 }}>{t("stats.empty", "Aucune partie enregistrée.")}</div>
          )}
        </Section>
      </div>
    </div>
  );
}
