// @ts-nocheck
// =============================================================
// DARTS FIREFIGHTER — écran de fin de mission
// Résumé, contribution de la brigade, carte finale et chronologie.
// =============================================================

import React from "react";
import ProfileAvatar from "../components/ProfileAvatar";
import {
  activeIncidents,
  difficultyLabel,
  finishReasonLabel,
  fireStatus,
  fireTerritoryColor,
  type DartsFirefighterState,
  type FireTerritory,
} from "../lib/gameEngines/dartsFirefighterEngine";

const FIRE = "#ff5a25";
const WATER = "#25c9ff";
const GOLD = "#ffd76a";
const RED = "#ff4c55";
const GREEN = "#5ce6a8";
const PLAYER_COLORS = ["#25c9ff", "#ffbf45", "#ff6aa9", "#8d7dff", "#62e9aa", "#ff8a5b", "#d4d8e5", "#66a7ff"];

function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Pompier";
}
function pct(part: number, total: number) {
  return total > 0 ? Math.round((part / total) * 1000) / 10 : 0;
}
function fmtDuration(ms: number) {
  const seconds = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}
function statusLabel(territory: FireTerritory) {
  if (territory.destroyed) return "DÉTRUIT";
  if (territory.fireLevel > 0) return `FEU N${territory.fireLevel}`;
  if (territory.smoke) return "FUMÉE";
  if (territory.protection > 0) return `PROTÉGÉ ${territory.protection}`;
  return "SAIN";
}
function statusIcon(territory: FireTerritory) {
  if (territory.destroyed) return "⬛";
  if (territory.fireLevel === 3) return "🔥🔥🔥";
  if (territory.fireLevel === 2) return "🔥🔥";
  if (territory.fireLevel === 1) return "🔥";
  if (territory.smoke) return "💨";
  if (territory.protection > 0) return "💧";
  return "✓";
}
function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 10,
    background: "linear-gradient(180deg,rgba(255,255,255,.06),rgba(0,0,0,.27))",
    border: "1px solid rgba(255,255,255,.10)",
    boxShadow: "0 14px 34px rgba(0,0,0,.30)",
    boxSizing: "border-box",
  };
}
function actionButton(color: string): React.CSSProperties {
  return {
    minHeight: 44,
    borderRadius: 13,
    border: `1px solid ${color}88`,
    background: `${color}16`,
    color,
    fontWeight: 1050,
    cursor: "pointer",
  };
}

export type DartsFirefighterEndProps = {
  state: DartsFirefighterState;
  profilesById: Map<string, any>;
  onClose: () => void;
  onReplay: () => void;
  onStats: () => void;
  onHistory: () => void;
};

export default function DartsFirefighterEnd({ state, profilesById, onClose, onReplay, onStats, onHistory }: DartsFirefighterEndProps) {
  const [tab, setTab] = React.useState<"summary" | "brigade" | "map" | "timeline">("summary");
  const duration = Math.max(0, (state.finishedAt || Date.now()) - state.startedAt);
  const playerRows = state.players
    .map((player: any, index: number) => ({
      player,
      profile: profilesById.get(String(player.id)) || player,
      stats: state.playerStats[player.id] || {},
      color: PLAYER_COLORS[index % PLAYER_COLORS.length],
    }))
    .sort((a: any, b: any) => Number(b.stats.score || 0) - Number(a.stats.score || 0));
  const totals = playerRows.reduce((acc: any, row: any) => {
    const stats = row.stats;
    acc.darts += Number(stats.darts || 0);
    acc.hits += Number(stats.hits || 0);
    acc.fire += Number(stats.fireReduced || 0);
    acc.water += Number(stats.waterApplied || 0);
    acc.protected += Number(stats.protectionsPlaced || 0);
    acc.extinguished += Number(stats.firesExtinguished || 0);
    acc.score += Number(stats.score || 0);
    return acc;
  }, { darts: 0, hits: 0, fire: 0, water: 0, protected: 0, extinguished: 0, score: 0 });
  const finalZones = state.territories.filter((territory: FireTerritory) => territory.playable);
  const tabs = [
    ["summary", "RÉSUMÉ", "🚒"],
    ["brigade", "BRIGADE", "👨‍🚒"],
    ["map", "CARTE", "🗺"],
    ["timeline", "VOLÉES", "📈"],
  ] as const;

  return <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.87)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 8 }}>
    <div style={{ ...panelStyle(), width: "min(920px,100%)", maxHeight: "95dvh", overflow: "auto", padding: 12, borderColor: `${state.won ? GREEN : RED}77`, background: "linear-gradient(180deg,rgba(17,15,13,.99),rgba(4,7,10,.99))" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ color: state.won ? GREEN : RED, fontSize: 11, fontWeight: 1100, letterSpacing: 1.2 }}>{state.won ? "✅ MISSION RÉUSSIE" : "🚨 MISSION ÉCHOUÉE"}</div>
        <div style={{ marginTop: 3, color: "#fff", fontSize: 24, fontWeight: 1100 }}>{finishReasonLabel(state.finishReason)}</div>
        <div style={{ color: WATER, fontSize: 10, fontWeight: 950 }}>{difficultyLabel(state.config.difficulty)} · {state.config.mapId} · {state.score} POINTS</div>
      </div>

      <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}>
        {tabs.map(([id, label, icon]) => <button key={id} onClick={() => setTab(id)} style={{ minHeight: 43, borderRadius: 12, border: `1px solid ${tab === id ? WATER : "rgba(255,255,255,.09)"}`, background: tab === id ? `${WATER}17` : "rgba(255,255,255,.035)", color: tab === id ? WATER : "#aab1c0", fontWeight: 1000, fontSize: 8.5 }}><div style={{ fontSize: 15 }}>{icon}</div>{label}</button>)}
      </div>

      {tab === "summary" ? <>
        <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
          <EndKpi label="Score" value={state.score} color={GOLD} />
          <EndKpi label="Feux éteints" value={state.totalExtinguished} color={GREEN} />
          <EndKpi label="Zones perdues" value={state.totalDestroyed} color={RED} />
          <EndKpi label="Propagations" value={state.totalSpread} color={FIRE} />
          <EndKpi label="Bloquées" value={state.propagationBlocked} color={WATER} />
          <EndKpi label="Rounds" value={Math.max(1, state.roundIndex)} color={WATER} />
          <EndKpi label="Précision" value={`${pct(totals.hits, totals.darts)}%`} color={GREEN} />
          <EndKpi label="Durée" value={fmtDuration(duration)} color="#d5d9e2" />
        </div>
        <div style={{ marginTop: 10, padding: 10, borderRadius: 14, background: state.won ? `${GREEN}0c` : `${RED}0c`, border: `1px solid ${state.won ? GREEN : RED}35`, color: "#d9dde5", fontSize: 10.5, lineHeight: 1.45 }}>
          {state.won
            ? `La brigade a maîtrisé l’incendie avec ${state.totalDestroyed} territoire${state.totalDestroyed > 1 ? "s" : ""} perdu${state.totalDestroyed > 1 ? "s" : ""}.`
            : `Il reste ${activeIncidents(state)} incident${activeIncidents(state) > 1 ? "s" : ""}. ${finishReasonLabel(state.finishReason)}.`}
        </div>
      </> : null}

      {tab === "brigade" ? <div style={{ marginTop: 10, display: "grid", gap: 7 }}>
        {playerRows.map((row: any, index: number) => <div key={row.player.id} style={{ padding: 9, borderRadius: 14, border: `1px solid ${row.color}44`, background: `${row.color}0b`, display: "grid", gridTemplateColumns: "42px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}>
          <ProfileAvatar profile={row.profile} size={40} showStars={false} />
          <div style={{ minWidth: 0 }}>
            <div style={{ color: row.color, fontWeight: 1050 }}>{index + 1}. {playerName(row.profile)}</div>
            <div style={{ color: "#9299aa", fontSize: 8.5 }}>{row.stats.fireReduced || 0} niveaux · {row.stats.firesExtinguished || 0} extinctions · {row.stats.propagationBlocked || 0} blocages</div>
            <div style={{ color: "#cfd5df", fontSize: 8.3 }}>S {row.stats.singles || 0} · D {row.stats.doubles || 0} · T {row.stats.triples || 0} · B {row.stats.bulls || 0} · DB {row.stats.dbulls || 0} · MISS {row.stats.misses || 0}</div>
          </div>
          <div style={{ color: GOLD, fontSize: 17, fontWeight: 1100 }}>{row.stats.score || 0}</div>
        </div>)}
      </div> : null}

      {tab === "map" ? <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(145px,1fr))", gap: 6 }}>
        {[...finalZones].sort((a: FireTerritory, b: FireTerritory) => a.target - b.target).map((territory: FireTerritory) => {
          const color = fireTerritoryColor(fireStatus(territory));
          return <div key={territory.id} style={{ padding: 8, borderRadius: 12, background: `${color}0d`, border: `1px solid ${color}44` }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 7 }}><strong style={{ color: GOLD }}>{territory.target}</strong><span>{statusIcon(territory)}</span></div>
            <div style={{ marginTop: 3, fontSize: 9, fontWeight: 1000, color: territory.critical ? GOLD : "#fff", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{territory.name}</div>
            <div style={{ marginTop: 2, color, fontSize: 8.2, fontWeight: 950 }}>{statusLabel(territory)}</div>
          </div>;
        })}
      </div> : null}

      {tab === "timeline" ? <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
        {[...state.history].reverse().slice(0, 30).map((visit: any) => <div key={visit.id} style={{ padding: 8, borderRadius: 12, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.07)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
            <strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · R{visit.round} · {visit.labels.join(" / ")}</strong>
            <strong style={{ color: visit.score >= 0 ? GREEN : RED }}>{visit.score >= 0 ? "+" : ""}{visit.score}</strong>
          </div>
          <div style={{ color: "#8e95a7", fontSize: 8.2 }}>{visit.events.slice(-3).map((event: any) => event.label).join(" · ") || "Aucun effet"}</div>
        </div>)}
      </div> : null}

      <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 6 }}>
        <button onClick={onReplay} style={actionButton(FIRE)}>REJOUER</button>
        <button onClick={onStats} style={actionButton(WATER)}>STATS</button>
        <button onClick={onHistory} style={actionButton(GOLD)}>HISTORIQUE</button>
        <button onClick={onClose} style={actionButton("#d1d5df")}>FERMER</button>
      </div>
    </div>
  </div>;
}

function EndKpi({ label, value, color }: any) {
  return <div style={{ padding: 8, borderRadius: 12, textAlign: "center", background: `${color}0d`, border: `1px solid ${color}38` }}>
    <div style={{ color: "#8e95a7", fontSize: 7.5, fontWeight: 950 }}>{String(label).toUpperCase()}</div>
    <div style={{ color, fontSize: 17, fontWeight: 1100 }}>{value}</div>
  </div>;
}
