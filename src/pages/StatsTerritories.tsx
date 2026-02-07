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
  useTheme();

  const embedded = Boolean(props?.embedded);

  const [items, setItems] = React.useState<TerritoriesMatch[]>(() => loadTerritoriesHistory());

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
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("stats.matches", "Parties")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{total}</div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.maps", "Maps")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{byMap.length}</div>
            </div>

            <div
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)",
              }}
            >
              <div style={{ fontSize: 12, opacity: 0.8, fontWeight: 950 }}>{t("territories.avgDom", "Domination")}</div>
              <div style={{ marginTop: 6, fontSize: 22, fontWeight: 1000 }}>{avgDom}</div>
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
