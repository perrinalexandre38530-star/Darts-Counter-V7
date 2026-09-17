// @ts-nocheck
// =============================================================
// GROS 6 / BIG 6 — PLAY V6
// UI = mêmes codes visuels que LOTERIE / KILLER / X01 / TERRITORIES
// - bloc joueur actif compact type LOTERIE
// - rangée de KPI cliquables -> stats détaillées flottantes
// - bandeau JOUEURS type KILLER -> liste détaillée flottante
// - ScoreInputHub NATIF (mêmes méthodes de saisie que le reste de l'app)
// - 100dvh, aucun scroll de page
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import InfoDot from "../components/InfoDot";
import ProfileAvatar from "../components/ProfileAvatar";
import ScoreInputHub from "../components/ScoreInputHub";
import { MicroMiniIcon } from "../components/Keypad";
import { DartIconColorizable } from "../components/MaskIcon";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import tickerGros6 from "../assets/tickers/ticker_gros_6.webp";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.webp";
import playersPanelTicker from "../assets/tickers/ticker_gros_6_players_panel.webp";
import activePanelTicker from "../assets/tickers/ticker_gros_6_active_panel.webp";
import gros6ZonesKeypad from "../assets/gros6/gros6_zones_keypad.webp";
import gros6RulesBoard from "../assets/gros6/gros6_rules_board.webp";
import zoneOuterRing from "../assets/gros6-zones/zone_outer_ring.webp";
import zoneClosed4 from "../assets/gros6-zones/zone_closed_4.webp";
import zoneClosed6 from "../assets/gros6-zones/zone_closed_6.webp";
import zoneClosed8Top from "../assets/gros6-zones/zone_closed_8_top.webp";
import zoneClosed8Bottom from "../assets/gros6-zones/zone_closed_8_bottom.webp";
import zoneClosed9 from "../assets/gros6-zones/zone_closed_9.webp";
import zoneClosed10 from "../assets/gros6-zones/zone_closed_10.webp";
import zoneClosed14 from "../assets/gros6-zones/zone_closed_14.webp";
import zoneClosed16 from "../assets/gros6-zones/zone_closed_16.webp";
import zoneClosed18Top from "../assets/gros6-zones/zone_closed_18_top.webp";
import zoneClosed18Bottom from "../assets/gros6-zones/zone_closed_18_bottom.webp";
import zoneClosed19 from "../assets/gros6-zones/zone_closed_19.webp";
import zoneClosed20 from "../assets/gros6-zones/zone_closed_20.webp";
import {
  GROS6_SPECIAL_ZONES,
  applyGros6AttackHit,
  applyGros6SelectionHit,
  buildGros6InitialState,
  finalizeGros6Selection,
  gros6AliveTeams,
  gros6Clone,
  gros6IsPlayerActive,
  gros6IsProtectedTargetOwner,
  gros6TargetLabel,
  isGros6TargetAllowedForSelection,
  makeGros6Bull,
  makeGros6Miss,
  makeGros6Segment,
  makeGros6Special,
  simulateGros6BotAttack,
  simulateGros6BotSelection,
} from "../lib/gros6Engine";
import { playGros6Intro, stopGros6Intro, playImpactFromDart, playSfx, unlockAudio } from "../lib/sfx";
import { speak } from "../lib/voice";

const STROKE = "rgba(255,255,255,.105)";
const SOFT = "rgba(226,232,240,.72)";
const GOOD = "#70efbd";
const BAD = "#ff718a";
const PINK = "#ff63b8";

function panelStyle(): React.CSSProperties {
  return {
    borderRadius: 16,
    border: `1px solid ${STROKE}`,
    background: "linear-gradient(180deg, rgba(255,255,255,.07), rgba(5,8,16,.72))",
    boxShadow: "0 10px 22px rgba(0,0,0,.24)",
    minWidth: 0,
    maxWidth: "100%",
    boxSizing: "border-box",
  };
}

function MiniKpi({ label, value, color, onClick }: any) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "6px 4px",
        borderRadius: 12,
        textAlign: "center",
        background: "rgba(255,255,255,.045)",
        border: `1px solid ${STROKE}`,
        minWidth: 0,
        cursor: "pointer",
        color: "#fff",
      }}
    >
      <div style={{ color: SOFT, fontSize: 8.2, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{label}</div>
      <div style={{ color, fontSize: 14.5, fontWeight: 1000, marginTop: 2, lineHeight: 1 }}>{value}</div>
    </button>
  );
}

function ModeInlineInfo({ label, value, accent }: any) {
  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 4, minWidth: 0, whiteSpace: "nowrap" }}>
      <span style={{ color: accent, fontSize: 9.2, fontWeight: 1000 }}>{label}</span>
      <span style={{ color: "#fff", fontSize: 9.2, fontWeight: 950 }}>{value}</span>
    </div>
  );
}

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
const SPECIAL_ZONE_META: Record<string, any> = {
  outer_numbers_ring: { fr: "Contour extérieur", en: "Outer ring", asset: zoneOuterRing },
  closed_4: { fr: "HORS CIBLE 4", en: "OFF-TARGET 4", number: 4, asset: zoneClosed4 },
  closed_6: { fr: "HORS CIBLE 6", en: "OFF-TARGET 6", number: 6, asset: zoneClosed6 },
  closed_8_top: { fr: "HORS CIBLE 8 HAUT", en: "OFF-TARGET 8 TOP", number: 8, asset: zoneClosed8Top },
  closed_8_bottom: { fr: "HORS CIBLE 8 BAS", en: "OFF-TARGET 8 BOTTOM", number: 8, asset: zoneClosed8Bottom },
  closed_9: { fr: "HORS CIBLE 9", en: "OFF-TARGET 9", number: 9, asset: zoneClosed9 },
  closed_10: { fr: "HORS CIBLE 10", en: "OFF-TARGET 10", number: 10, asset: zoneClosed10 },
  closed_14: { fr: "HORS CIBLE 14", en: "OFF-TARGET 14", number: 14, asset: zoneClosed14 },
  closed_16: { fr: "HORS CIBLE 16", en: "OFF-TARGET 16", number: 16, asset: zoneClosed16 },
  closed_18_top: { fr: "HORS CIBLE 18 HAUT", en: "OFF-TARGET 18 TOP", number: 18, asset: zoneClosed18Top },
  closed_18_bottom: { fr: "HORS CIBLE 18 BAS", en: "OFF-TARGET 18 BOTTOM", number: 18, asset: zoneClosed18Bottom },
  closed_19: { fr: "HORS CIBLE 19", en: "OFF-TARGET 19", number: 19, asset: zoneClosed19 },
  closed_20: { fr: "HORS CIBLE 20", en: "OFF-TARGET 20", number: 20, asset: zoneClosed20 },
};

function specialZoneLabel(code: string, lang: string) {
  const meta = SPECIAL_ZONE_META[String(code || "")];
  if (meta) return lang === "fr" ? meta.fr : meta.en;
  return String(code || "—");
}

function targetUiLabel(target: any, lang: string) {
  if (!target) return "—";
  if (target.kind === "special") return specialZoneLabel(String(target.code || ""), lang);
  if (target.kind === "bull") return target.bull === "DB" ? "DBULL" : "BULL";
  if (target.kind === "segment") {
    if (target.ring === "S") {
      const prefix = target.singleArea === "small"
        ? (lang === "fr" ? "P" : "L")
        : (lang === "fr" ? "G" : "B");
      return `${prefix}${target.value}`;
    }
    return `${target.ring}${target.value}`;
  }
  return gros6TargetLabel(target);
}

function targetSpeechLabel(target: any, lang: string) {
  if (!target) return lang === "fr" ? "aucune cible" : "no target";
  if (target.kind === "special") {
    const label = specialZoneLabel(String(target.code || ""), lang);
    return lang === "fr" ? `zone ${label.toLowerCase().replace("hors cible ", "hors cible ")}` : `zone ${label.toLowerCase()}`;
  }
  if (target.kind === "bull") return target.bull === "DB" ? (lang === "fr" ? "double bull" : "double bull") : "bull";
  if (target.kind === "segment") {
    const n = Number(target.value || 0);
    if (target.ring === "D") return lang === "fr" ? `double ${n}` : `double ${n}`;
    if (target.ring === "T") return lang === "fr" ? `triple ${n}` : `treble ${n}`;
    if (target.singleArea === "small") return lang === "fr" ? `petit ${n}` : `little ${n}`;
    return lang === "fr" ? `gros ${n}` : `big ${n}`;
  }
  return targetUiLabel(target, lang);
}

function polar(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function annulusPath(cx: number, cy: number, rOuter: number, rInner: number, startDeg: number, endDeg: number) {
  const startOuter = polar(cx, cy, rOuter, startDeg);
  const endOuter = polar(cx, cy, rOuter, endDeg);
  const startInner = polar(cx, cy, rInner, endDeg);
  const endInner = polar(cx, cy, rInner, startDeg);
  const largeArc = Math.abs(endDeg - startDeg) > 180 ? 1 : 0;
  return `M ${startOuter.x} ${startOuter.y} A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${endOuter.x} ${endOuter.y} L ${startInner.x} ${startInner.y} A ${rInner} ${rInner} 0 ${largeArc} 0 ${endInner.x} ${endInner.y} Z`;
}

function zoneAngles(number: number) {
  const idx = BOARD_ORDER.indexOf(Number(number));
  const start = idx < 0 ? 0 : idx * 18;
  return { start, end: start + 18 };
}

function SpecialZoneIcon({ code, accent, size = 78 }: any) {
  const meta = SPECIAL_ZONE_META[String(code || "")];
  const asset = meta?.asset;
  if (!asset) return null;
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "grid",
        placeItems: "center",
        filter: `drop-shadow(0 0 8px ${accent || "#42d6ff"}22)`,
      }}
    >
      <img
        src={asset as any}
        alt=""
        draggable={false}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",
          display: "block",
        }}
      />
    </div>
  );
}

function TargetVisual({ target, lang, accent, compact = false }: any) {
  if (target?.kind === "special") {
    return (
      <div style={{ display: "grid", placeItems: "center", minWidth: 0 }}>
        <SpecialZoneIcon code={target.code} accent={accent} size={compact ? 34 : 54} />
      </div>
    );
  }
  const label = targetUiLabel(target, lang);
  const sizeMap = compact ? (label.length >= 5 ? 14 : label.length >= 4 ? 15.5 : 18) : (label.length >= 5 ? 34 : label.length >= 4 ? 40 : label.length >= 3 ? 48 : 58);
  return (
    <div style={{ color: accent, fontSize: sizeMap, fontWeight: 1000, lineHeight: 0.96, textShadow: `0 4px 18px ${accent}35`, whiteSpace: "nowrap", maxWidth: "100%", overflow: "visible", textOverflow: "clip" }}>
      {label}
    </div>
  );
}

function CricketVisitDarts({ used, total = 3, accent }: { used: number; total?: number; accent: string }) {
  const dots = Array.from({ length: Math.max(used, total, 3) }).slice(0, total);
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
      {dots.map((_, index) => {
        const active = index < used;
        return (
          <div key={index} style={{ width: 22, height: 22, display: "grid", placeItems: "center", borderRadius: 999, background: active ? "rgba(255,80,90,.14)" : "rgba(255,255,255,.04)", boxShadow: active ? "0 0 12px rgba(255,82,82,.16)" : "none" }}>
            <DartIconColorizable color={active ? "#ff6666" : accent} active={active} size={16} />
          </div>
        );
      })}
    </div>
  );
}

function ZoneMiniIcon() {
  return (
    <img
      src={gros6ZonesKeypad as any}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{ width: "100%", height: "100%", objectFit: "fill", objectPosition: "center", display: "block" }}
    />
  );
}

function normalizeHistoryText(value: any) {
  return String(value || "").trim();
}

function specialCodeFromHistoryValue(value: any) {
  if (value && typeof value === "object" && value.kind === "special") return String(value.code || "");
  const raw = normalizeHistoryText(value).toLowerCase();
  if (!raw) return "";
  if (raw.includes("contour") || raw.includes("outer ring") || raw.includes("outer_numbers_ring")) return "outer_numbers_ring";
  if (raw.includes("18") && (raw.includes("haut") || raw.includes("top"))) return "closed_18_top";
  if (raw.includes("18") && (raw.includes("bas") || raw.includes("bottom"))) return "closed_18_bottom";
  if (raw.includes("8") && (raw.includes("haut") || raw.includes("top"))) return "closed_8_top";
  if (raw.includes("8") && (raw.includes("bas") || raw.includes("bottom"))) return "closed_8_bottom";
  for (const n of [4, 6, 9, 10, 14, 16, 19, 20]) {
    if ((raw.includes("hors cible") || raw.includes("off-target") || raw.includes("off target") || raw.includes("closed_")) && new RegExp(`(^|\\D)${n}(\\D|$)`).test(raw)) return `closed_${n}`;
  }
  return "";
}

function compactHistoryLabel(value: any, lang: string) {
  if (value && typeof value === "object") return targetUiLabel(value, lang);
  const raw = normalizeHistoryText(value);
  if (!raw) return "—";
  const upper = raw.toUpperCase();
  let m = upper.match(/^GROS\s*(\d+)$/);
  if (m) return `${lang === "fr" ? "G" : "B"}${m[1]}`;
  m = upper.match(/^PETIT\s*(\d+)$/);
  if (m) return `${lang === "fr" ? "P" : "L"}${m[1]}`;
  if (/^(D|T)\d+$/.test(upper) || upper === "BULL" || upper === "DBULL" || upper === "MISS") return upper;
  return raw.length <= 6 ? raw : raw.slice(0, 6);
}

function HistoryDartChip({ value, lang, accent, size = 30 }: any) {
  const specialCode = specialCodeFromHistoryValue(value);
  const target = value && typeof value === "object" ? value : null;
  if (specialCode) {
    return (
      <span title={specialZoneLabel(specialCode, lang)} style={{ width: size, height: size, borderRadius: 8, display: "grid", placeItems: "center", border: `1px solid ${accent}44`, background: "rgba(0,0,0,.34)", overflow: "hidden", flex: "0 0 auto" }}>
        <SpecialZoneIcon code={specialCode} accent={accent} size={Math.max(22, size - 4)} />
      </span>
    );
  }
  const label = compactHistoryLabel(target || value, lang);
  const chipStyle = (() => {
    if (label === "DBULL") return { color: "#d9ffe9", border: "rgba(96,255,182,.55)", bg: "linear-gradient(180deg, rgba(34,102,68,.92), rgba(11,30,19,.96))" };
    if (label === "BULL") return { color: "#c9ffe1", border: "rgba(96,255,182,.42)", bg: "linear-gradient(180deg, rgba(26,82,56,.92), rgba(9,25,16,.96))" };
    if (label === "MISS") return { color: "#ffd2d7", border: "rgba(255,97,122,.46)", bg: "linear-gradient(180deg, rgba(101,22,34,.94), rgba(35,8,12,.97))" };
    if (String(label).startsWith("G") || String(label).startsWith("B")) return { color: "#fff2cf", border: "rgba(255,176,72,.5)", bg: "linear-gradient(180deg, rgba(180,93,19,.92), rgba(54,24,8,.97))" };
    if (String(label).startsWith("P") || String(label).startsWith("L")) return { color: "#6b3f12", border: "rgba(255,232,150,.56)", bg: "linear-gradient(180deg, rgba(255,239,156,.96), rgba(214,188,101,.96))" };
    if (String(label).startsWith("D")) return { color: "#edfaff", border: "rgba(125,224,255,.5)", bg: "linear-gradient(180deg, rgba(61,113,139,.94), rgba(15,28,35,.97))" };
    if (String(label).startsWith("T")) return { color: "#ffe8ff", border: "rgba(229,144,255,.48)", bg: "linear-gradient(180deg, rgba(111,64,126,.94), rgba(29,15,34,.97))" };
    return { color: "#fff", border: "rgba(255,255,255,.12)", bg: "rgba(0,0,0,.34)" };
  })();
  return (
    <span style={{ minWidth: size, height: size, padding: "0 4px", borderRadius: 8, display: "grid", placeItems: "center", border: `1px solid ${chipStyle.border}`, background: chipStyle.bg, color: chipStyle.color, fontSize: size <= 26 ? 8.5 : 9.5, fontWeight: 1000, lineHeight: 1, flex: "0 0 auto", boxShadow: "inset 0 1px 0 rgba(255,255,255,.08), 0 4px 12px rgba(0,0,0,.18)" }}>
      {label}
    </span>
  );
}

function eventDarts(ev: any) {
  if (Array.isArray(ev?.dartTargets) && ev.dartTargets.length) return ev.dartTargets;
  if (Array.isArray(ev?.darts)) return ev.darts;
  return [];
}

function lastCompletedTurnDarts(game: any, playerId: any) {
  const events = (Array.isArray(game?.history) ? game.history : []).filter((ev: any) => String(ev?.playerId) === String(playerId));
  if (!events.length) return [];
  const numbered = events.filter((ev: any) => Number(ev?.turnNo || 0) > 0);
  if (numbered.length) {
    const latestTurn = Math.max(...numbered.map((ev: any) => Number(ev.turnNo || 0)));
    return numbered
      .filter((ev: any) => Number(ev.turnNo || 0) === latestTurn)
      .sort((a: any, b: any) => Number(a?.at || 0) - Number(b?.at || 0))
      .flatMap((ev: any) => eventDarts(ev))
      .slice(0, 6);
  }
  return eventDarts(events[events.length - 1]).slice(0, 6);
}

function toUiDarts(items: any[]) {
  return (Array.isArray(items) ? items : []).slice(0, 3).map((hit: any) => {
    if (hit?.kind === "segment") return { v: Number(hit.value || 0), mult: hit.ring === "T" ? 3 : hit.ring === "D" ? 2 : 1 };
    if (hit?.kind === "bull") return { v: 25, mult: hit.bull === "DB" ? 2 : 1 };
    return { v: 0, mult: 1 };
  });
}

function fromUiDart(d: any) {
  const v = Number(d?.v || 0);
  const mult = Number(d?.mult || 1);
  if (v <= 0) return makeGros6Miss();
  if (v === 25) return makeGros6Bull(mult === 2);
  return makeGros6Segment(mult === 3 ? "T" : mult === 2 ? "D" : "S", v, d?.singleArea === "small" ? "small" : "big");
}

function dartLabel(hit: any, lang: string) {
  return targetUiLabel(hit, lang);
}

function ModalShell({ onClose, title, subtitle, accent, children }: any) {
  return (
    <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 10020, background: "rgba(0,0,0,.74)", backdropFilter: "blur(8px)", display: "grid", placeItems: "center", padding: 12 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: "min(560px,100%)", maxHeight: "86dvh", overflowY: "auto", borderRadius: 18, border: `1px solid ${accent}55`, background: "linear-gradient(180deg,#10141f,#090c13 48%,#07080c)", boxShadow: "0 26px 65px rgba(0,0,0,.55)", padding: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div>
            <div style={{ color: accent, fontWeight: 1000, fontSize: 15 }}>{title}</div>
            {subtitle ? <div style={{ color: SOFT, fontSize: 10, marginTop: 2 }}>{subtitle}</div> : null}
          </div>
          <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(0,0,0,.35)", color: "#fff", fontWeight: 1000, fontSize: 18, cursor: "pointer" }}>×</button>
        </div>
        <div style={{ marginTop: 12 }}>{children}</div>
      </div>
    </div>
  );
}

function PlayerStatsModal({ player, onClose, accent, lang, teamName }: any) {
  if (!player) return null;
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  const stats = [
    [L("Cibles validées", "Targets cleared"), player.stats?.targetsCleared || 0, accent],
    [L("Cibles imposées", "Targets set"), player.stats?.targetsImposed || 0, GOOD],
    [L("Vies perdues", "Lives lost"), player.stats?.livesLost || 0, BAD],
    [L("Fléchettes lancées", "Darts thrown"), player.stats?.dartsThrown || 0, SOFT],
    [L("Sauvetages 3e flèche", "3rd-dart saves"), player.stats?.lastDartSaves || 0, PINK],
    [L("Zones spéciales", "Special zones"), player.stats?.specialTargetsCleared || 0, accent],
    ["Bull / DBull", player.stats?.bullsCleared || 0, GOOD],
    [L("Doubles validés", "Doubles cleared"), player.stats?.doublesCleared || 0, GOOD],
    [L("Triples validés", "Trebles cleared"), player.stats?.triplesCleared || 0, PINK],
    [L("Vies restantes", "Lives left"), player.lives || 0, BAD],
  ];
  return (
    <ModalShell onClose={onClose} title={L("STATISTIQUES GROS 6", "BIG 6 STATISTICS")} subtitle={`${player.name}${teamName ? ` · ${teamName}` : ""}`} accent={accent}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
        {stats.map(([label, value, color]: any) => (
          <div key={label} style={{ borderRadius: 13, padding: 10, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)" }}>
            <div style={{ color: SOFT, fontSize: 8.5, fontWeight: 1000, textTransform: "uppercase" }}>{label}</div>
            <div style={{ marginTop: 4, color, fontSize: 19, fontWeight: 1000 }}>{value}</div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
}

function PlayersModal({ game, onClose, accent, lang, activeIndex }: any) {
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  return (
    <ModalShell onClose={onClose} title={L("JOUEURS", "PLAYERS")} subtitle={L("Ordre de jeu et récapitulatif", "Turn order and overview")} accent={accent}>
      <div style={{ display: "grid", gap: 8 }}>
        {game.players.map((p: any, idx: number) => {
          const active = idx === activeIndex && game.phase !== "finished";
          const alive = gros6IsPlayerActive(game, p);
          const team = game.participantMode === "teams" ? game.teams.find((t: any) => String(t.id) === String(p.teamId)) : null;
          // Toujours afficher la DERNIÈRE VOLÉE TERMINÉE.
          // La volée en cours reste exclusivement dans le bandeau VOLÉE EN COURS
          // et ne remplace l'historique qu'une fois le tour réellement passé.
          const lastDarts = lastCompletedTurnDarts(game, p.id);
          const lives = game.participantMode === "teams" && game.teamLifeMode === "shared" ? Number(team?.lives || 0) : Number(p.lives || 0);
          return (
            <div key={p.id} style={{ ...panelStyle(), padding: "8px 10px", opacity: alive ? 1 : .55, border: `1px solid ${active ? `${accent}66` : "rgba(255,255,255,.08)"}`, boxShadow: active ? `0 0 16px ${accent}22` : "none", display: "grid", gridTemplateColumns: "auto 1fr auto", alignItems: "center", gap: 10 }}>
              <ProfileAvatar profile={p} name={p.name} avatarDataUrl={p.avatarDataUrl} size={40} />
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", gap: 7, alignItems: "center", minWidth: 0 }}>
                  <span style={{ fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.name}</span>
                  {p.isBot ? <span style={{ fontSize: 10, color: SOFT }}>🤖 {p.botLevel || ""}</span> : null}
                </div>
                {team ? <div style={{ marginTop: 2, color: accent, fontSize: 9, fontWeight: 900 }}>{team.name}</div> : null}
                <div style={{ marginTop: 5, display: "flex", gap: 4, flexWrap: "wrap", alignItems: "center" }}>
                  {lastDarts.length ? lastDarts.slice(0, 6).map((dart: any, i: number) => <HistoryDartChip key={i} value={dart} lang={lang} accent={accent} size={26} />) : <span style={{ color: SOFT, fontSize: 9 }}>{L("Aucune volée", "No visit yet")}</span>}
                </div>
              </div>
              <div style={{ minWidth: 58, borderRadius: 14, padding: "8px 10px", background: alive ? "rgba(0,0,0,.42)" : "rgba(120,12,28,.22)", border: `1px solid ${alive ? "rgba(255,255,255,.08)" : "rgba(255,80,100,.35)"}`, color: alive ? "#fff" : BAD, textAlign: "center", fontWeight: 1000 }}>
                {alive ? `❤️ ${lives}` : L("OUT", "OUT")}
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
}

function SpecialZonesModal({ onClose, onPick, accent, lang, includeOuterRing = true }: any) {
  const L = (fr: string, en: string) => lang === "fr" ? fr : en;
  return (
    <ModalShell onClose={onClose} title={L("ZONES SPÉCIALES", "SPECIAL ZONES")} subtitle={L("Sélectionne exactement la zone touchée sur la cible", "Select the exact hit zone on the board")} accent={accent}>
      <div style={{ color: SOFT, fontSize: 10.5, lineHeight: 1.45, marginBottom: 10 }}>
        {includeOuterRing ? L("13 zones hors cible jouables : 4, 6, 8 haut, 8 bas, 9, 10, 14, 16, 18 haut, 18 bas, 19, 20 et contour extérieur.", "13 playable off-board zones: 4, 6, 8 top, 8 bottom, 9, 10, 14, 16, 18 top, 18 bottom, 19, 20 and the outer ring.") : L("12 zones hors cible jouables : 4, 6, 8 haut, 8 bas, 9, 10, 14, 16, 18 haut, 18 bas, 19 et 20.", "12 playable off-board zones: 4, 6, 8 top, 8 bottom, 9, 10, 14, 16, 18 top, 18 bottom, 19 and 20.")}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 9 }}>
        {GROS6_SPECIAL_ZONES.filter((zone: any) => includeOuterRing || zone.code !== "outer_numbers_ring").map((zone: any) => (
          <button
            key={zone.code}
            type="button"
            onClick={() => onPick({ code: zone.code, label: specialZoneLabel(zone.code, lang) })}
            style={{
              minHeight: 112,
              borderRadius: 16,
              border: `1px solid ${accent}33`,
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
              color: "#fff",
              display: "grid",
              gridTemplateColumns: "72px 1fr",
              alignItems: "center",
              gap: 10,
              padding: 10,
              textAlign: "left",
              cursor: "pointer",
              boxShadow: `0 0 16px ${accent}12`,
            }}
          >
            <div style={{ display: "grid", placeItems: "center" }}><SpecialZoneIcon code={zone.code} accent={accent} /></div>
            <div style={{ minWidth: 0 }}>
              <div style={{ color: accent, fontSize: 13, fontWeight: 1000, letterSpacing: .5 }}>{specialZoneLabel(zone.code, lang)}</div>
              <div style={{ marginTop: 4, color: SOFT, fontSize: 9.2, lineHeight: 1.35 }}>
                {zone.code === "outer_numbers_ring"
                  ? L("Contour extérieur de la cible, autour du cercle des chiffres.", "Outer contour of the dartboard, around the number ring.")
                  : zone.code === "closed_8_top"
                  ? L("Zone fermée hors cible : boucle haute du 8.", "Closed off-target zone: upper loop of the 8.")
                  : zone.code === "closed_8_bottom"
                  ? L("Zone fermée hors cible : boucle basse du 8.", "Closed off-target zone: lower loop of the 8.")
                  : zone.code === "closed_18_top"
                  ? L("Zone fermée hors cible : boucle haute du 18.", "Closed off-target zone: upper loop of the 18.")
                  : zone.code === "closed_18_bottom"
                  ? L("Zone fermée hors cible : boucle basse du 18.", "Closed off-target zone: lower loop of the 18.")
                  : L("Zone fermée hors cible jouable. Si elle est touchée, elle devient la cible exacte du joueur suivant.", "Playable closed zone outside the dartboard. If hit, it becomes the exact target for the next player.")}
              </div>
            </div>
          </button>
        ))}
      </div>
    </ModalShell>
  );
}

export default function Gros6Play({ store, go, config, onFinish }: any) {
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const { theme } = useTheme();
  const { lang } = useLang();
  const L = React.useCallback((fr: string, en: string) => lang === "fr" ? fr : en, [lang]);
  const accent = theme?.primary || "#42d6ff";
  const pageBg = theme?.pageBg || theme?.bg || "#05070e";

  const [game, setGame] = React.useState(() => buildGros6InitialState(config));
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [specialMode, setSpecialMode] = React.useState<null | "big" | "small">(null);
  const [playersOpen, setPlayersOpen] = React.useState(false);
  const [statsOpen, setStatsOpen] = React.useState(false);
  const [specialOpen, setSpecialOpen] = React.useState(false);
  const [rulesOpen, setRulesOpen] = React.useState(false);
  const [viewport, setViewport] = React.useState(() => ({ w: typeof window !== "undefined" ? window.innerWidth : 1200, h: typeof window !== "undefined" ? window.innerHeight : 900 }));
  const undoStackRef = React.useRef<any[]>([]);
  const reportedRef = React.useRef(false);
  const introPlayedRef = React.useRef(false);
  const announcedTurnRef = React.useRef("");
  const announcedHistoryRef = React.useRef<number>(0);
  const announcedWinnerRef = React.useRef("");
  const voiceRecognitionRef = React.useRef<any>(null);
  const [voiceListening, setVoiceListening] = React.useState(false);

  const speechLang = lang === "fr" ? "fr-FR" : "en-US";
  const preferredInputMethod = String((config as any)?.scoreInputDefaultMethod || (config as any)?.scoreInputMethod || "keypad");
  const voiceInputRequested = preferredInputMethod === "voice";

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update as any);
  }, []);

  React.useEffect(() => {
    try { unlockAudio(); } catch {}
    if (!introPlayedRef.current) {
      introPlayedRef.current = true;
      playGros6Intro(0.52);
    }
    return () => {
      stopGros6Intro();
      try { window.speechSynthesis?.cancel?.(); } catch {}
    };
  }, []);

  const compact = viewport.w < 720;
  const short = viewport.h < 760;
  const tickerHeight = compact ? (short ? 58 : 66) : 78;
  const activeHeight = compact ? (short ? 116 : 126) : 136;

  const activePlayer = game.players[game.turnIndex];
  const activeTeam = game.participantMode === "teams" ? game.teams.find((team: any) => String(team.id) === String(activePlayer?.teamId || "")) : null;
  const alivePlayers = game.players.filter((p: any) => gros6IsPlayerActive(game, p));
  const aliveTeams = gros6AliveTeams(game);
  const phaseSelect = game.phase === "select";
  const finished = game.phase === "finished";
  const activeHuman = !!activePlayer && !activePlayer.isBot && !finished;
  const currentHits = phaseSelect ? game.selectionDarts : game.attackDarts;
  const currentThrow = toUiDarts(currentHits);
  const currentVisitDarts = [...(Array.isArray(game.attackDarts) ? game.attackDarts : []), ...(phaseSelect && Array.isArray(game.selectionDarts) ? game.selectionDarts : [])].slice(0, 6);
  const currentVisitCapacity = phaseSelect
    ? Math.max(3, Math.min(6, Number(game.attackDarts?.length || 0) + Number(game.selectionAllowed || 0)))
    : 3;
  const dartsLeft = phaseSelect ? Math.max(0, Number(game.selectionAllowed || 0) - game.selectionDarts.length) : Math.max(0, 3 - game.attackDarts.length);
  const lifeValue = game.participantMode === "teams" && game.teamLifeMode === "shared" ? Number(activeTeam?.lives || 0) : Number(activePlayer?.lives || 0);
  const headerTicker = lang === "fr" ? tickerGros6 : tickerBig6;
  const statsPlayerTeam = activeTeam?.name || null;

  React.useEffect(() => { setMultiplier(1); setSpecialMode(null); }, [game.turnIndex, game.phase]);

  const commit = React.useCallback((reducer: any) => {
    setGame((prev: any) => {
      undoStackRef.current.push(gros6Clone(prev));
      if (undoStackRef.current.length > 120) undoStackRef.current.shift();
      return reducer(prev);
    });
  }, []);

  const undo = React.useCallback(() => {
    const previous = undoStackRef.current.pop();
    if (previous) {
      setGame(previous);
      setMultiplier(1);
    }
  }, []);

  const submitHit = React.useCallback((hit: any) => {
    commit((prev: any) => prev.phase === "select" ? applyGros6SelectionHit(prev, hit, config) : applyGros6AttackHit(prev, hit, config));
  }, [commit, config]);

  const playHitSfx = React.useCallback((d: any) => {
    try {
      const value = Number(d?.v || 0);
      const mult = Number(d?.mult || 1);
      if (value > 0) {
        playImpactFromDart({ value, mult });
      } else {
        playSfx("hit", { volume: 0.72 });
      }
    } catch {}
  }, []);

  const submitUiDart = React.useCallback((d: any) => {
    playHitSfx(d);
    submitHit(fromUiDart(d));
    setMultiplier(1);
    setSpecialMode(null);
  }, [playHitSfx, submitHit]);

  const segmentZoneSelected = multiplier === 2 || multiplier === 3 || specialMode === "big" || specialMode === "small";

  const submitNumber = React.useCallback((n: number) => {
    if (n === 0) return submitUiDart({ v: 0, mult: 1 });
    // GROS 6 : aucune valeur numérique ne doit partir avec une zone implicite.
    // Le joueur choisit d'abord DOUBLE, TRIPLE, GROS ou PETIT.
    if (!(multiplier === 2 || multiplier === 3 || specialMode === "big" || specialMode === "small")) return;
    if (specialMode && multiplier === 1) {
      submitUiDart({ v: n, mult: 1, singleArea: specialMode });
      return;
    }
    submitUiDart({ v: n, mult: multiplier });
  }, [submitUiDart, multiplier, specialMode]);

  const submitBull = React.useCallback(() => {
    submitUiDart({ v: 25, mult: 1 });
  }, [submitUiDart]);

  const submitDoubleBull = React.useCallback(() => {
    submitUiDart({ v: 25, mult: 2 });
  }, [submitUiDart]);

  const finishSelectionNow = React.useCallback(() => {
    if (!phaseSelect) return;
    commit((prev: any) => prev.phase === "select" ? finalizeGros6Selection(prev) : prev);
  }, [commit, phaseSelect]);

  const applyPresetDarts = React.useCallback((darts: any[]) => {
    const normalized = (Array.isArray(darts) ? darts : []).slice(0, 3);
    if (!normalized.length) return;
    commit((prev: any) => {
      const startTurn = prev.turnNo;
      let next = gros6Clone(prev);
      for (const d of normalized) {
        if (next.turnNo !== startTurn || next.phase === "finished") break;
        const hit = fromUiDart(d);
        next = next.phase === "select" ? applyGros6SelectionHit(next, hit, config) : applyGros6AttackHit(next, hit, config);
      }
      return next;
    });
    setMultiplier(1);
  }, [commit, config]);

  const stopGros6Voice = React.useCallback(() => {
    try { voiceRecognitionRef.current?.stop?.(); } catch {}
    voiceRecognitionRef.current = null;
    setVoiceListening(false);
  }, []);

  const startGros6Voice = React.useCallback(() => {
    if (typeof window === "undefined") return;
    const Ctor = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!Ctor) {
      speak(lang === "fr" ? "La reconnaissance vocale n'est pas disponible sur cet appareil." : "Voice recognition is not available on this device.", { lang: speechLang, rate: .98 });
      return;
    }
    try {
      stopGros6Voice();
      const rec = new Ctor();
      voiceRecognitionRef.current = rec;
      rec.lang = speechLang;
      rec.interimResults = false;
      rec.maxAlternatives = 4;
      rec.continuous = false;
      rec.onstart = () => setVoiceListening(true);
      rec.onend = () => { voiceRecognitionRef.current = null; setVoiceListening(false); };
      rec.onerror = () => { voiceRecognitionRef.current = null; setVoiceListening(false); };
      rec.onresult = (event: any) => {
        const heard = Array.from(event?.results?.[0] || []).map((a: any) => String(a?.transcript || "")).join(" ").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
        const numberMatch = heard.match(/\b(20|1[0-9]|[1-9])\b/);
        const n = numberMatch ? Number(numberMatch[1]) : 0;
        const specialMap: Array<[RegExp,string,string]> = [
          [/contour|outer ring|exterieur/, "outer_numbers_ring", "Contour extérieur"],
          [/18.*(haut|top)|(haut|top).*18/, "closed_18_top", "HORS CIBLE 18 HAUT"],
          [/18.*(bas|bottom)|(bas|bottom).*18/, "closed_18_bottom", "HORS CIBLE 18 BAS"],
          [/8.*(haut|top)|(haut|top).*8/, "closed_8_top", "HORS CIBLE 8 HAUT"],
          [/8.*(bas|bottom)|(bas|bottom).*8/, "closed_8_bottom", "HORS CIBLE 8 BAS"],
        ];
        const special = specialMap.find(([re]) => re.test(heard));
        if (special) { submitHit(makeGros6Special(special[1], special[2])); return; }
        if ((/hors cible|off target|zone/.test(heard)) && n && [4,6,9,10,14,16,19,20].includes(n)) { submitHit(makeGros6Special(`closed_${n}`, `HORS CIBLE ${n}`)); return; }
        if (/double bull|dbull|bullseye/.test(heard)) { submitDoubleBull(); return; }
        if (/\bbull\b/.test(heard)) { submitBull(); return; }
        if (/miss|rate|rater|dehors|zero/.test(heard)) { submitUiDart({ v: 0, mult: 1 }); return; }
        if (!n) return;
        if (/triple|treble|\bt\s*\d+/.test(heard)) { submitUiDart({ v: n, mult: 3 }); return; }
        if (/double|\bd\s*\d+/.test(heard)) { submitUiDart({ v: n, mult: 2 }); return; }
        if (/petit|little|small|\bp\s*\d+|\bl\s*\d+/.test(heard)) { submitUiDart({ v: n, mult: 1, singleArea: "small" }); return; }
        if (/gros|big|\bg\s*\d+|\bb\s*\d+/.test(heard)) { submitUiDart({ v: n, mult: 1, singleArea: "big" }); return; }
        speak(lang === "fr" ? "Précise la zone. Dis par exemple gros 6, petit 7, double 18 ou triple 20." : "Please specify the zone. Say for example big 6, little 7, double 18 or treble 20.", { lang: speechLang, rate: .98 });
      };
      rec.start();
    } catch { setVoiceListening(false); }
  }, [lang, speechLang, stopGros6Voice, submitBull, submitDoubleBull, submitHit, submitUiDart]);

  React.useEffect(() => () => stopGros6Voice(), [stopGros6Voice]);

  const pickSpecial = React.useCallback((zone: any) => {
    playSfx("hit", { volume: 0.78 });
    submitHit(makeGros6Special(zone.code, zone.label));
    setSpecialOpen(false);
  }, [submitHit]);

  React.useEffect(() => {
    if (!game.winnerId || reportedRef.current) return;
    reportedRef.current = true;
    try {
      onFinish?.({
        id: `gros6-match-${Date.now()}`,
        kind: "gros_6",
        mode: "gros_6",
        createdAt: config?.createdAt || Date.now(),
        finishedAt: Date.now(),
        winnerId: game.winnerId,
        winnerName: game.winnerName,
        winnerType: game.winnerType,
        participantMode: game.participantMode,
        teams: game.teams,
        players: game.players,
        config,
        history: game.history,
      });
    } catch {}
  }, [game.winnerId, game.winnerName, game.winnerType, game.participantMode, game.teams, game.players, game.history, config, onFinish]);

  React.useEffect(() => {
    if (game.phase !== "attack" || game.winnerId) return;
    const player = game.players[game.turnIndex];
    if (!player?.isBot) return;
    const timer = window.setTimeout(() => {
      setGame((prev: any) => {
        undoStackRef.current.push(gros6Clone(prev));
        if (undoStackRef.current.length > 120) undoStackRef.current.shift();
        const attack = simulateGros6BotAttack(prev, config);
        let next = gros6Clone(prev);
        for (const dart of attack.darts) {
          if (next.phase === "attack") next = applyGros6AttackHit(next, dart, config);
        }
        if (next.phase === "select") {
          const bot = next.players[next.turnIndex];
          const selection = simulateGros6BotSelection(next.selectionAllowed, bot, config);
          for (const dart of selection.darts) {
            if (next.phase === "select") next = applyGros6SelectionHit(next, dart, config);
          }
        }
        return next;
      });
    }, 700);
    return () => window.clearTimeout(timer);
  }, [game.phase, game.turnIndex, game.winnerId, game.players, config]);

  React.useEffect(() => {
    if (finished || !activePlayer?.name || game.phase !== "attack") return;
    const key = `${game.turnNo}-${game.turnIndex}`;
    if (announcedTurnRef.current === key) return;
    announcedTurnRef.current = key;
    const objective = targetSpeechLabel(game.currentTarget, lang);
    speak(
      lang === "fr"
        ? `${activePlayer.name}, à toi de jouer. Ta cible est ${objective}.`
        : `${activePlayer.name}, your turn. Your target is ${objective}.`,
      { lang: speechLang, rate: 0.98 }
    );
  }, [activePlayer?.name, finished, game.currentTarget, game.phase, game.turnIndex, game.turnNo, lang, speechLang]);

  React.useEffect(() => {
    const history = Array.isArray(game.history) ? game.history : [];
    if (!history.length) return;
    const last = history[history.length - 1];
    const stamp = Number(last?.at || history.length);
    if (announcedHistoryRef.current === stamp) return;
    announcedHistoryRef.current = stamp;

    let message = "";
    if (last?.selectionResolved && last?.nextTarget) {
      message = lang === "fr" ? `Nouvelle cible ${last.nextTarget}` : `New target ${last.nextTarget}`;
    } else if (last?.lifeLost) {
      message = lang === "fr" ? `${last.playerName || "Joueur"} perd une vie` : `${last.playerName || "Player"} loses a life`;
      playSfx("bust", { volume: 0.76 });
    } else if (last?.success && last?.phase === "attack") {
      message = lang === "fr" ? "Cible validée" : "Target cleared";
    }

    if (message) speak(message, { lang: speechLang, rate: 0.98 });
  }, [game.history, lang, speechLang]);

  React.useEffect(() => {
    if (!game.winnerId || !game.winnerName) return;
    const key = `${game.winnerType || "player"}:${game.winnerId}`;
    if (announcedWinnerRef.current === key) return;
    announcedWinnerRef.current = key;
    speak(lang === "fr" ? `Victoire ${game.winnerName}` : `${game.winnerName} wins`, { lang: speechLang, rate: 0.96 });
  }, [game.winnerId, game.winnerName, game.winnerType, lang, speechLang]);

  const activeTarget = phaseSelect ? (game.pendingNextTarget || null) : game.currentTarget;
  const phaseText = phaseSelect ? L("CHOISIS LA PROCHAINE CIBLE", "CHOOSE NEXT TARGET") : L("CIBLE À TOUCHER", "TARGET TO HIT");
  const topDartsCount = currentHits.length;
  const liveKpis = [
    { label: L("VALIDÉES", "CLEARED"), value: activePlayer?.stats?.targetsCleared || 0, color: accent },
    { label: L("IMPOSÉES", "SET"), value: activePlayer?.stats?.targetsImposed || 0, color: GOOD },
    { label: L("FLÈCHES", "DARTS"), value: activePlayer?.stats?.dartsThrown || 0, color: PINK },
    { label: L("VIES", "LIVES"), value: lifeValue, color: BAD },
  ];

  return (
    <div style={{ position: "fixed", inset: 0, height: "100dvh", overflow: "hidden", background: pageBg, color: "#fff", display: "flex", flexDirection: "column", padding: compact ? 6 : 10, gap: compact ? 5 : 8, overscrollBehavior: "none" }}>
      <style>{`
        .gros6-scorehub { flex: 1 1 auto; min-height: 0; overflow: hidden; }
        .gros6-scorehub > div { height: 100%; min-height: 0; display: flex; flex-direction: column; }
        .gros6-scorehub > div > div:last-child { min-height: 0; }
      `}</style>

      {/* HEADER — même logique que KillerPlay */}
      <div style={{ flex: `0 0 ${tickerHeight}px`, position: "relative", overflow: "hidden" }}>
        <img src={headerTicker as any} alt={lang === "fr" ? "Gros 6" : "Big 6"} draggable={false} style={{ width: "100%", height: tickerHeight, objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(90deg,rgba(5,5,7,.94),rgba(5,5,7,0) 15%,rgba(5,5,7,0) 85%,rgba(5,5,7,.94))" }} />
        <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 8px", pointerEvents: "none" }}>
          <div style={{ pointerEvents: "auto" }}><BackDot onClick={() => go?.("gros_6_config")} title={L("Retour", "Back")} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
          <div style={{ pointerEvents: "auto" }}><InfoDot onClick={() => setRulesOpen(true)} size={compact ? 34 : 38} color={accent} glow={`${accent}AA`} /></div>
        </div>
      </div>

      {/* BLOC JOUEUR ACTIF */}
      <section style={{ ...panelStyle(), flex: `0 0 ${activeHeight}px`, padding: 0, overflow: "hidden", borderColor: `${accent}88`, boxShadow: `0 0 24px ${accent}20` }}>
        <div style={{ position: "relative", height: "100%", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(124px,142px)", gap: 6, alignItems: "stretch", padding: compact ? "7px 8px" : "8px 10px" }}>
          <div style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg, rgba(0,0,0,.40), rgba(0,0,0,.14) 36%, rgba(0,0,0,.10) 62%, rgba(0,0,0,.26))" }} />
          <div style={{ position: "absolute", left: -12, top: -4, bottom: -4, width: "31%", minWidth: 90, overflow: "hidden", opacity: .22, pointerEvents: "none" }}>
            <div style={{ position: "absolute", left: -10, top: 10, transform: "scale(1.42)", transformOrigin: "left top", filter: "saturate(.9) blur(.15px)" }}><ProfileAvatar profile={activePlayer} name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={84} /></div>
          </div>

          <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minWidth: 0, textAlign: "center", padding: compact ? "4px 8px 4px 66px" : "5px 12px 4px 76px" }}>
            <div style={{ minHeight: compact ? 48 : 66, display: "grid", placeItems: "center", width: "100%" }}><TargetVisual target={activeTarget} lang={lang} accent={accent} compact={false} /></div>
            <div style={{ marginTop: 3, width: "100%", display: "grid", placeItems: "center" }}>
              <CricketVisitDarts used={topDartsCount} total={phaseSelect ? Math.max(1, Number(game.selectionAllowed || 1)) : 3} accent={accent} />
            </div>
          </div>

          <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, minWidth: 0, overflow: "hidden", borderRadius: 18, background: "#080b12", padding: 0, color: "#fff", boxShadow: `0 0 0 1px ${accent}33 inset, 0 0 18px ${accent}18` }}>
            <img src={activePanelTicker as any} alt="Active player panel" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .92 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,10,16,.16), rgba(8,10,16,.48) 60%, rgba(8,10,16,.72))" }} />
            <div style={{ position: "relative", display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "8px 6px 7px" }}>
              <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "center" }}>
                <div style={{ borderRadius: 999, padding: 2, background: "rgba(0,0,0,.28)", boxShadow: `0 0 0 1px ${accent}44, 0 0 16px rgba(0,0,0,.24)` }}>
                  <ProfileAvatar profile={activePlayer} name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={compact ? 42 : 48} loading="eager" />
                </div>
              </div>
              <div style={{ width: "100%", color: accent, fontSize: compact ? 9.5 : 10.5, fontWeight: 1000, textAlign: "center", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 2px" }}>{activePlayer?.name || "—"}</div>
              <div style={{ width: "100%", display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 4 }}>
                <div style={{ textAlign: "center", padding: "5px 2px", borderRadius: 11, background: "rgba(0,0,0,.34)" }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000 }}>{L("VIES", "LIVES")}</div><div style={{ color: BAD, fontSize: 14, fontWeight: 1000 }}>❤️ {lifeValue}</div></div>
                <div style={{ textAlign: "center", padding: "5px 2px", borderRadius: 11, background: "rgba(0,0,0,.34)" }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000 }}>DARTS</div><div style={{ color: accent, fontSize: 14, fontWeight: 1000 }}>{dartsLeft}</div></div>
                <div style={{ textAlign: "center", padding: "5px 2px", borderRadius: 11, background: "rgba(0,0,0,.34)" }}><div style={{ color: SOFT, fontSize: 7.2, fontWeight: 1000 }}>{L("TOUR", "TURN")}</div><div style={{ color: "#fff", fontSize: 14, fontWeight: 1000 }}>#{game.turnNo}</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPI LIVE */}
      <section style={{ ...panelStyle(), flex: "0 0 52px", padding: 7 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>
          {liveKpis.map((item) => (
            <MiniKpi key={item.label} label={item.label} value={item.value} color={item.color} onClick={() => setStatsOpen(true)} />
          ))}
        </div>
      </section>

      {/* BLOC LISTE DES JOUEURS — l'image définit seule le contour */}
      <button
        type="button"
        onClick={() => setPlayersOpen(true)}
        title={L("Liste des joueurs", "Players list")}
        style={{ flex: "0 0 auto", padding: 0, overflow: "visible", cursor: "pointer", textAlign: "left", background: "transparent", border: 0, boxShadow: "none", position: "relative" }}
      >
        <img src={playersPanelTicker as any} alt="Players panel" draggable={false} style={{ width: "100%", height: "auto", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,.16), rgba(0,0,0,.04) 40%, rgba(0,0,0,.42))" }} />
        <div style={{ position: "absolute", inset: 0, padding: compact ? "6px 10px" : "8px 12px" }}>
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", top: compact ? 6 : 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, maxWidth: "calc(100% - 56px)", overflowX: "auto", scrollbarWidth: "none", padding: compact ? "4px 0 5px" : "5px 0 6px" }}>
            {game.players.map((p: any, idx: number) => {
              const active = idx === game.turnIndex && !finished;
              const alive = gros6IsPlayerActive(game, p);
              const protectedOwner = gros6IsProtectedTargetOwner(game, p);
              return (
                <div key={p.id} style={{ flex: "0 0 auto", opacity: alive ? 1 : .4, borderRadius: 999, padding: 2, margin: "2px 0", boxShadow: active ? `0 0 0 2px ${accent}, 0 0 14px ${accent}66` : protectedOwner ? "0 0 0 2px rgba(255,190,92,.92), 0 0 14px rgba(255,190,92,.34)" : "0 0 0 1px rgba(255,255,255,.16)" }}>
                  <ProfileAvatar profile={p} name={p.name} avatarDataUrl={p.avatarDataUrl} size={compact ? 28 : 32} loading="eager" />
                </div>
              );
            })}
          </div>
          <span style={{ position: "absolute", right: compact ? 10 : 12, bottom: compact ? 8 : 10, width: 24, height: 24, borderRadius: 999, border: `1px solid ${accent}AA`, color: accent, background: "rgba(0,0,0,.28)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 1000 }}>{game.players.length}</span>
          <div style={{ position: "absolute", left: "50%", transform: "translateX(-50%)", bottom: compact ? 6 : 8, display: "grid", gap: 1, justifyItems: "center", textAlign: "center" }}>
            <span style={{ fontWeight: 1000, letterSpacing: 1, color: accent, textTransform: "uppercase", whiteSpace: "nowrap", fontSize: compact ? 8.6 : 9.4 }}>{L("Liste des joueurs", "Players list")}</span>
          </div>
        </div>
      </button>

      {/* VOLÉE EN COURS — 3 fléchettes normales, jusqu'à 6 avec bonus D3 */}
      <section style={{ ...panelStyle(), flex: "0 0 auto", minHeight: compact ? 42 : 46, padding: compact ? "5px 8px" : "6px 10px", display: "grid", gridTemplateColumns: "auto 1fr", alignItems: "center", gap: 8 }}>
        <div style={{ color: accent, fontSize: compact ? 8.2 : 9, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8, whiteSpace: "nowrap" }}>{L("Volée en cours", "Current visit")}</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${currentVisitCapacity}, minmax(0, 1fr))`, gap: 4, minWidth: 0 }}>
          {Array.from({ length: currentVisitCapacity }).map((_, i) => {
            const dart = currentVisitDarts[i];
            return dart
              ? <HistoryDartChip key={i} value={dart} lang={lang} accent={accent} size={compact ? 28 : 30} />
              : <span key={i} style={{ height: compact ? 28 : 30, minWidth: 0, borderRadius: 8, border: "1px solid rgba(255,255,255,.07)", background: "rgba(0,0,0,.22)", color: "rgba(255,255,255,.22)", display: "grid", placeItems: "center", fontSize: 10, fontWeight: 900 }}>—</span>;
          })}
        </div>
      </section>

      {/* SCORE INPUT HUB NATIF */}
      {activeHuman ? (
        <div className="gros6-scorehub" style={{ position: "relative" }}>
          <ScoreInputHub
            currentThrow={currentThrow as any}
            multiplier={multiplier}
            onSimple={() => setMultiplier(1)}
            onDouble={() => setMultiplier(2)}
            onTriple={() => setMultiplier(3)}
            onBackspace={undo}
            onCancel={undo}
            onNumber={submitNumber}
            onBull={submitBull}
            onValidate={phaseSelect ? finishSelectionNow : (() => {})}
            onDirectDart={submitUiDart}
            onSetVisitDarts={applyPresetDarts}
            preferredMethod={preferredInputMethod}
            keypadExtraMainButtons={[
              { label: L("GROS", "BIG"), onClick: () => setSpecialMode((v) => v === "big" ? null : "big"), active: specialMode === "big", tone: "teal", title: L("Prépare un Gros 6 ou Gros 8", "Prepare a Big 6 or Big 8") },
              { label: L("PETIT", "SMALL"), onClick: () => setSpecialMode((v) => v === "small" ? null : "small"), active: specialMode === "small", tone: "violet", title: L("Prépare un Petit 6 ou Petit 8", "Prepare a Small 6 or Small 8") },
            ]}
            keypadSecondaryAction={voiceInputRequested ? {
              icon: <MicroMiniIcon size={21} />,
              onClick: voiceListening ? stopGros6Voice : startGros6Voice,
              active: voiceListening,
              tone: "teal",
              title: voiceListening ? L("Arrêter l'écoute", "Stop listening") : L("Commande vocale Gros 6", "Big 6 voice input"),
              ariaLabel: voiceListening ? L("Arrêter l'écoute", "Stop listening") : L("Saisie vocale", "Voice input"),
            } : null}
            keypadFooterAction={{
              label: "DBULL",
              onClick: submitDoubleBull,
              tone: "green",
              title: L("Double Bull", "Double Bull"),
              ariaLabel: L("Double Bull", "Double Bull"),
            }}
            keypadDisableSegmentNumbers={!segmentZoneSelected}
            keypadAuxActionOverride={config?.allowSpecialZones && String(config?.selectionPolicy || "open") !== "pro" ? {
              label: L("ZONE", "ZONE"),
              icon: <ZoneMiniIcon />,
              onClick: () => setSpecialOpen(true),
              disabled: false,
              active: false,
              tone: "gold",
              title: L("Ouvrir les zones spéciales", "Open special zones"),
              ariaLabel: L("Ouvrir les zones spéciales", "Open special zones"),
              fullBleedIcon: true,
            } : null}
            hidePreview
            hideTotal
            showPlaceholders={false}
            hideSwitcher
            hideTabs
            switcherMode="hidden"
            fitToParent
            centerSlot={<span style={{ display: "inline-grid", minWidth: 58, placeItems: "center", textAlign: "center", padding: "6px 10px", borderRadius: 14, background: `${accent}12`, border: `1px solid ${accent}66`, color: accent, fontWeight: 1000, fontSize: 17, lineHeight: 1.02, boxShadow: `0 0 16px ${accent}22`, whiteSpace: "pre-line" }}><TargetVisual target={activeTarget} lang={lang} accent={accent} compact /></span>}
          />
        </div>
      ) : !finished && activePlayer?.isBot ? (
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", placeItems: "center", ...panelStyle(), color: SOFT, fontSize: 12, fontWeight: 900 }}>🤖 {activePlayer.name} {L("joue automatiquement…", "is playing automatically…")}</div>
      ) : (
        <div style={{ flex: "1 1 auto", minHeight: 0, display: "grid", placeItems: "center", ...panelStyle() }}>
          <div style={{ textAlign: "center" }}><div style={{ color: accent, fontSize: 24, fontWeight: 1000 }}>{game.winnerName}</div><div style={{ marginTop: 5, color: SOFT, fontSize: 11 }}>{game.winnerType === "team" ? L("Dernière équipe en jeu", "Last surviving team") : L("Dernier joueur en vie", "Last surviving player")}</div></div>
        </div>
      )}

      {statsOpen ? <PlayerStatsModal player={activePlayer} teamName={statsPlayerTeam} onClose={() => setStatsOpen(false)} accent={accent} lang={lang} /> : null}
      {playersOpen ? <PlayersModal game={game} activeIndex={game.turnIndex} onClose={() => setPlayersOpen(false)} accent={accent} lang={lang} /> : null}
      {specialOpen ? <SpecialZonesModal onClose={() => setSpecialOpen(false)} onPick={pickSpecial} accent={accent} lang={lang} includeOuterRing={(config as any)?.allowOuterRing !== false} /> : null}
      {rulesOpen ? (
        <ModalShell onClose={() => setRulesOpen(false)} title={L("GROS 6 — RÈGLES", "BIG 6 — RULES")} accent={accent}>
          <div style={{ display: "grid", gap: 14 }}>
            <img src={gros6RulesBoard as any} alt="Gros 6 board" style={{ width: "100%", maxWidth: 420, margin: "0 auto", display: "block", borderRadius: 18, border: `1px solid ${accent}44`, boxShadow: `0 0 24px ${accent}22` }} />

            <div style={{ color: "#e2e4ef", fontSize: 12.5, lineHeight: 1.68 }}>
              {L(
                "Touchez exactement la cible courante avec 3 fléchettes maximum. La partie commence en général sur GROS 6. Si vous ne touchez pas la cible dans la volée, vous perdez une vie. Le dernier joueur ou la dernière équipe encore en vie remporte la partie. Quand un joueur impose la nouvelle cible, il ne rejoue plus tant qu'un autre joueur n'a pas validé une nouvelle cible.",
                "Hit the exact current target within a maximum of 3 darts. The game usually starts on BIG 6. If you fail to clear the target during the visit, you lose one life. The last surviving player or team wins the game. When a player sets the new target, that player does not play again until another player clears a new target."
              )}
            </div>

            <div>
              <div style={{ color: accent, fontWeight: 900, fontSize: 13.5, marginBottom: 6 }}>{L("Comment imposer la cible suivante", "How to set the next target")}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#dfe3f8", fontSize: 12.2, lineHeight: 1.62 }}>
                <li>{L("Dès que la cible est validée, les fléchettes restantes servent à choisir la cible du joueur suivant.", "As soon as the target is cleared, the remaining darts are used to choose the next target for the following player.")}</li>
                <li>{L("Le joueur qui impose cette cible est protégé : tant que personne n'a validé une autre cible, il est sauté dans l'ordre de jeu et ne perd aucune vie.", "The player who sets that target is protected: until someone else clears another target, that player is skipped in the turn order and loses no life.")}</li>
                <li>{L("Vous pouvez imposer un GROS simple, un PETIT simple, un double, un triple, le Bull, le Double Bull ou une zone spéciale autorisée.", "You may set a BIG single, a SMALL single, a double, a triple, Bull, Double Bull or any enabled special zone.")}</li>
                <li>{L("Si la cible est validée avec la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection pour définir la prochaine cible.", "If the target is cleared with the 3rd dart, the configured bonus opens a fresh selection visit to define the next target.")}</li>
              </ul>
            </div>

            <div>
              <div style={{ color: accent, fontWeight: 900, fontSize: 13.5, marginBottom: 6 }}>{L("Zones hors cible", "Off-board zones")}</div>
              <div style={{ color: "#e2e4ef", fontSize: 12.2, lineHeight: 1.64 }}>
                {L(
                  "Quand l'option est activée, plusieurs zones hors cible deviennent jouables : le contour extérieur autour des chiffres ainsi que des zones fermées spécifiques autour des 4, 6, 8 haut, 8 bas, 9, 10, 14, 16, 18 haut, 18 bas, 19 et 20. Si une de ces zones est imposée, le joueur suivant doit toucher exactement cette zone précise.",
                  "When the option is enabled, several off-board areas become playable: the outer contour around the numbers as well as specific closed areas around 4, 6, 8 top, 8 bottom, 9, 10, 14, 16, 18 top, 18 bottom, 19 and 20. If one of these zones is set, the next player must hit that exact area."
                )}
              </div>
            </div>

            <div>
              <div style={{ color: accent, fontWeight: 900, fontSize: 13.5, marginBottom: 6 }}>{L("Variantes", "Variants")}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: "#dfe3f8", fontSize: 12.2, lineHeight: 1.62 }}>
                <li>{L("Classique : règle stricte simple gros, simple petit, double et triple distincts.", "Classic: strict big single, small single, double and treble targeting.")}</li>
                <li>{L("Facile : la valeur seule peut suffire selon la configuration.", "Easy: value-only matching may be enough depending on the configuration.")}</li>
                <li>{L("PRO : les cibles imposées sont limitées aux doubles, triples et Bulls.", "PRO: settable targets are limited to doubles, triples and Bulls.")}</li>
                <li>{L("Sudden Death / Endurance : peu ou beaucoup de vies selon l'intensité recherchée.", "Sudden Death / Endurance: fewer or more lives depending on the desired intensity.")}</li>
              </ul>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </div>
  );
}
