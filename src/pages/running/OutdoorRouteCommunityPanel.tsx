import React from "react";
import { fetchOutdoorRouteLeaderboard, syncOutdoorRouteAttempt, type OutdoorRouteLeaderboardRow } from "../../activity/outdoorRouteCommunity";
import type { ActivityRecord } from "../../activity/activityTypes";
import { formatDistance, formatDuration, formatPace } from "../../activity/activityMath";
import type { RunningRouteTemplate } from "../../activity/runningRoutes";
import { RunningSurface } from "./RunningUi";

export default function OutdoorRouteCommunityPanel({ route, localAttempts, lang, accent, textSoft }: { route: RunningRouteTemplate; localAttempts: ActivityRecord[]; lang: string; accent: string; textSoft: string }) {
  const [rows, setRows] = React.useState<OutdoorRouteLeaderboardRow[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [available, setAvailable] = React.useState(true);
  const [tab, setTab] = React.useState<"community" | "mine">("community");

  const refresh = React.useCallback(async () => {
    setLoading(true);
    if (localAttempts.length) await Promise.allSettled(localAttempts.slice(0, 20).map((activity) => syncOutdoorRouteAttempt(route, activity)));
    const result = await fetchOutdoorRouteLeaderboard(route, 25);
    setRows(result.rows); setAvailable(result.available); setLoading(false);
  }, [localAttempts, route]);
  React.useEffect(() => { void refresh(); }, [refresh]);

  const copy = lang.startsWith("fr") ? { community: "COMMUNAUTÉ", mine: "MES PERFS", title: "CLASSEMENT DU PARCOURS", empty: "Aucune performance communautaire publiée pour ce parcours.", install: "Le backend classement Running n'est pas encore installé sur Supabase.", attempts: "passages", refresh: "ACTUALISER" }
    : lang.startsWith("es") ? { community: "COMUNIDAD", mine: "MIS MARCAS", title: "CLASIFICACIÓN DE LA RUTA", empty: "Aún no hay rendimientos comunitarios publicados para esta ruta.", install: "El backend de clasificación Running aún no está instalado en Supabase.", attempts: "intentos", refresh: "ACTUALIZAR" }
    : { community: "COMMUNITY", mine: "MY EFFORTS", title: "ROUTE LEADERBOARD", empty: "No community performances published for this route yet.", install: "The Running leaderboard backend is not installed on Supabase yet.", attempts: "attempts", refresh: "REFRESH" };

  return <RunningSurface accent={accent} style={{ marginTop: 8 }}>
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "center" }}><div style={{ color: accent, fontSize: 9, fontWeight: 1000, letterSpacing: .5 }}>{copy.title}</div><button className="btn" onClick={() => void refresh()} style={{ minHeight: 29, padding: "4px 7px", fontSize: 7.2, fontWeight: 1000 }}>{copy.refresh}</button></div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginTop: 8 }}><button className="btn" onClick={() => setTab("community")} style={{ minHeight: 32, fontSize: 7.6, fontWeight: 1000, color: tab === "community" ? accent : undefined, borderColor: tab === "community" ? `${accent}66` : undefined }}>{copy.community}{rows.length ? ` · ${rows.length}` : ""}</button><button className="btn" onClick={() => setTab("mine")} style={{ minHeight: 32, fontSize: 7.6, fontWeight: 1000, color: tab === "mine" ? accent : undefined, borderColor: tab === "mine" ? `${accent}66` : undefined }}>{copy.mine} · {localAttempts.length}</button></div>

    {tab === "community" ? <div style={{ marginTop: 8 }}>{loading ? <div style={{ color: textSoft, fontSize: 8 }}>…</div> : !available ? <div style={{ color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{copy.install}</div> : rows.length ? <div style={{ display: "grid", gap: 5 }}>{rows.slice(0, 10).map((row) => <div key={`${row.userId}-${row.rank}`} style={{ display: "grid", gridTemplateColumns: "28px 32px 1fr auto", gap: 6, alignItems: "center", padding: "7px 8px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ fontWeight: 1000, color: row.rank <= 3 ? accent : textSoft }}>#{row.rank}</div><div style={{ width: 30, height: 30, borderRadius: 999, overflow: "hidden", border: `1px solid ${accent}33`, display: "grid", placeItems: "center", background: "rgba(255,255,255,.04)", fontSize: 12 }}>{row.avatarUrl ? <img src={row.avatarUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }}/> : "🏃"}</div><div style={{ minWidth: 0 }}><div style={{ fontSize: 8.5, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.displayName}{row.countryCode ? ` · ${row.countryCode}` : ""}</div><div style={{ marginTop: 2, fontSize: 7, color: textSoft }}>{formatDistance(row.distanceM)} · {row.attempts} {copy.attempts}</div></div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontWeight: 1000, fontSize: 8.7 }}>{formatDuration(row.elapsedMs)}</div><div style={{ marginTop: 2, color: textSoft, fontSize: 6.9 }}>{row.paceSecPerKm != null ? `${formatPace(row.paceSecPerKm)}/km` : "—"}</div></div></div>)}</div> : <div style={{ color: textSoft, fontSize: 8.1, lineHeight: 1.4 }}>{copy.empty}</div>}</div> : <div style={{ marginTop: 8, display: "grid", gap: 5 }}>{localAttempts.length ? localAttempts.slice(0, 10).map((activity, index) => <div key={activity.id} style={{ display: "grid", gridTemplateColumns: "28px 1fr auto", gap: 7, alignItems: "center", padding: "7px 8px", borderRadius: 11, background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.06)" }}><div style={{ color: index === 0 ? accent : textSoft, fontWeight: 1000 }}>#{index + 1}</div><div style={{ fontSize: 7.5, color: textSoft }}>{new Date(activity.startedAt).toLocaleDateString()}</div><div style={{ textAlign: "right" }}><div style={{ color: accent, fontSize: 8.5, fontWeight: 1000 }}>{formatDuration(activity.elapsedMs)}</div><div style={{ fontSize: 6.8, color: textSoft }}>{activity.avgPaceSecPerKm != null ? `${formatPace(activity.avgPaceSecPerKm)}/km` : "—"}</div></div></div>) : <div style={{ color: textSoft, fontSize: 8.1 }}>{copy.empty}</div>}</div>}
  </RunningSurface>;
}
