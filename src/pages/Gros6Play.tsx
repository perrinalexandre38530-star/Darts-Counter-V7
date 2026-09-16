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
import { DartIconColorizable } from "../components/MaskIcon";
import { useTheme } from "../contexts/ThemeContext";
import { useLang } from "../contexts/LangContext";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import tickerGros6 from "../assets/tickers/ticker_gros_6.png";
import tickerBig6 from "../assets/tickers/ticker_gros_6_en.png";
import playersPanelTicker from "../assets/tickers/ticker_gros_6_players_panel.png";
import activePanelTicker from "../assets/tickers/ticker_gros_6_active_panel.png";
import {
  GROS6_SPECIAL_ZONES,
  applyGros6AttackHit,
  applyGros6SelectionHit,
  buildGros6InitialState,
  finalizeGros6Selection,
  gros6AliveTeams,
  gros6Clone,
  gros6IsPlayerActive,
  gros6TargetLabel,
  isGros6TargetAllowedForSelection,
  makeGros6Bull,
  makeGros6Miss,
  makeGros6Segment,
  makeGros6Special,
  simulateGros6BotAttack,
  simulateGros6BotSelection,
} from "../lib/gros6Engine";

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
  outer_numbers_ring: { fr: "Contour extérieur", en: "Outer ring", tone: "outer" },
  closed_6: { fr: "HORS CIBLE 6", en: "OFF-TARGET 6", number: 6, closed: "6" },
  closed_8_top: { fr: "HORS CIBLE 8 HAUT", en: "OFF-TARGET 8 TOP", number: 8, closed: "8-top" },
  closed_8_bottom: { fr: "HORS CIBLE 8 BAS", en: "OFF-TARGET 8 BOTTOM", number: 8, closed: "8-bottom" },
  closed_9: { fr: "HORS CIBLE 9", en: "OFF-TARGET 9", number: 9, closed: "9" },
  closed_10: { fr: "HORS CIBLE 10", en: "OFF-TARGET 10", number: 10, closed: "10" },
  closed_16: { fr: "HORS CIBLE 16", en: "OFF-TARGET 16", number: 16, closed: "16" },
  closed_18_top: { fr: "HORS CIBLE 18 HAUT", en: "OFF-TARGET 18 TOP", number: 18, closed: "18-top" },
  closed_18_bottom: { fr: "HORS CIBLE 18 BAS", en: "OFF-TARGET 18 BOTTOM", number: 18, closed: "18-bottom" },
  closed_19: { fr: "HORS CIBLE 19", en: "OFF-TARGET 19", number: 19, closed: "19" },
  closed_20: { fr: "HORS CIBLE 20", en: "OFF-TARGET 20", number: 20, closed: "20" },
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
    if (target.ring === "S") return gros6TargetLabel(target);
    return `${target.ring}${target.value}`;
  }
  return gros6TargetLabel(target);
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
  const highlight = accent || "#42d6ff";
  const num = String(meta?.number ?? "");

  if (code === "outer_numbers_ring") {
    return (
      <svg width={size} height={size} viewBox="0 0 78 78" aria-hidden="true">
        <circle cx="39" cy="39" r="29" fill="rgba(255,255,255,.05)" stroke="rgba(255,255,255,.22)" strokeWidth="1.2" />
        <circle cx="39" cy="39" r="24" fill="none" stroke="rgba(255,255,255,.16)" strokeWidth="1" />
        <circle cx="39" cy="39" r="14" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
        <circle cx="39" cy="39" r="8" fill="none" stroke="rgba(255,255,255,.14)" strokeWidth="1" />
        {Array.from({ length: 20 }, (_, i) => {
          const a = i * 18;
          const p1 = polar(39, 39, 8, a);
          const p2 = polar(39, 39, 29, a);
          return <line key={i} x1={p1.x} y1={p1.y} x2={p2.x} y2={p2.y} stroke="rgba(255,255,255,.12)" strokeWidth="1" />;
        })}
        <circle cx="39" cy="39" r="32.5" fill="none" stroke={highlight} strokeWidth="4" />
        <text x="39" y="44" textAnchor="middle" fill="#fff" fontSize="11" fontWeight="1000">ZONE</text>
      </svg>
    );
  }

  const filledZones: Record<string, any[]> = {
    closed_6: [{ cx: 43, cy: 48, r: 9 }],
    closed_8_top: [{ cx: 39, cy: 25, r: 8 }],
    closed_8_bottom: [{ cx: 39, cy: 50, r: 8 }],
    closed_9: [{ cx: 44, cy: 25, r: 8 }],
    closed_10: [{ cx: 50, cy: 39, r: 8 }],
    closed_16: [{ cx: 52, cy: 47, r: 8 }],
    closed_18_top: [{ cx: 43, cy: 25, r: 8 }],
    closed_18_bottom: [{ cx: 43, cy: 50, r: 8 }],
    closed_19: [{ cx: 50, cy: 25, r: 8 }],
    closed_20: [{ cx: 50, cy: 39, r: 8 }],
  };

  const fontSize = num.length > 1 ? 44 : 56;
  const x = num.length > 1 ? 35 : 39;
  return (
    <svg width={size} height={size} viewBox="0 0 78 78" aria-hidden="true">
      <rect x="6" y="6" width="66" height="66" rx="16" fill="rgba(255,255,255,.03)" stroke="rgba(255,255,255,.08)" />
      <text
        x={x}
        y="54"
        textAnchor="middle"
        fontSize={fontSize}
        fontWeight="1000"
        fill="rgba(0,0,0,0)"
        stroke="rgba(255,255,255,.96)"
        strokeWidth="4"
        paintOrder="stroke"
        fontFamily="inherit"
      >
        {num}
      </text>
      {(filledZones[String(code || '')] || []).map((shape, idx) => (
        <circle key={idx} cx={shape.cx} cy={shape.cy} r={shape.r} fill={highlight} opacity="0.95" />
      ))}
    </svg>
  );
}

function TargetVisual({ target, lang, accent, compact = false }: any) {
  if (target?.kind === "special") {
    return (
      <div style={{ display: "grid", justifyItems: "center", alignItems: "center", gap: 2, minWidth: 0 }}>
        <SpecialZoneIcon code={target.code} accent={accent} size={compact ? 54 : 88} />
        <div style={{ color: accent, fontSize: compact ? 8.6 : 10.5, fontWeight: 1000, lineHeight: 1.1, letterSpacing: .35, textTransform: "uppercase", textAlign: "center", maxWidth: compact ? 92 : 170, whiteSpace: "normal" }}>{specialZoneLabel(String(target.code || ""), lang)}</div>
      </div>
    );
  }
  return (
    <div style={{ color: accent, fontSize: compact ? 18 : 48, fontWeight: 1000, lineHeight: 1, textShadow: `0 4px 18px ${accent}35`, whiteSpace: compact ? "pre-line" : "nowrap", maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis" }}>
      {targetUiLabel(target, lang)}
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

function ZoneMiniIcon({ color = "currentColor" }: any) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="8.5" fill="none" stroke={color} strokeWidth="1.8" opacity="0.95" />
      <circle cx="12" cy="12" r="5.5" fill="none" stroke={color} strokeWidth="1.6" opacity="0.8" />
      <circle cx="12" cy="12" r="2.3" fill={color} opacity="0.9" />
      <path d="M12 3.5V20.5M3.5 12H20.5" fill="none" stroke={color} strokeWidth="1.5" opacity="0.75" />
    </svg>
  );
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
          const last = [...(game.history || [])].reverse().find((ev: any) => String(ev?.playerId) === String(p.id) && Array.isArray(ev?.darts));
          const lastDarts = Array.isArray(last?.darts) ? last.darts.slice(0, 3) : [];
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
                <div style={{ marginTop: 5, display: "flex", gap: 4 }}>
                  {[0, 1, 2].map((i) => <span key={i} style={{ minWidth: 36, height: 23, borderRadius: 8, display: "grid", placeItems: "center", border: "1px solid rgba(255,255,255,.08)", background: "rgba(0,0,0,.32)", color: "#fff", fontSize: 9.5, fontWeight: 1000 }}>{lastDarts[i] || "—"}</span>)}
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
        {includeOuterRing ? L("11 zones spéciales : gros/petit 6, gros/petit 8, zones 9, 10, 16, 18, 19, 20 et contour extérieur.", "11 special zones: big/small 6, big/small 8, zones 9, 10, 16, 18, 19, 20 and the outer ring.") : L("10 zones spéciales : gros/petit 6, gros/petit 8, zones 9, 10, 16, 18, 19 et 20.", "10 special zones: big/small 6, big/small 8, zones 9, 10, 16, 18, 19 and 20.")}
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
                  : L("Zone fermée hors cible jouable : si elle est touchée, le joueur suivant doit viser exactement la même zone fermée.", "Playable off-target closed zone: if hit, the next player must hit the exact same closed zone.")}
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

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const update = () => setViewport({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener("resize", update, { passive: true });
    return () => window.removeEventListener("resize", update as any);
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

  const submitUiDart = React.useCallback((d: any) => {
    submitHit(fromUiDart(d));
    setMultiplier(1);
    setSpecialMode(null);
  }, [submitHit]);

  const submitNumber = React.useCallback((n: number) => {
    if (n === 0) return submitUiDart({ v: 0, mult: 1 });
    if (specialMode && multiplier === 1) {
      submitUiDart({ v: n, mult: 1, singleArea: specialMode });
      return;
    }
    submitUiDart({ v: n, mult: multiplier });
  }, [submitUiDart, multiplier, specialMode]);

  const submitBull = React.useCallback(() => {
    submitUiDart({ v: 25, mult: multiplier === 2 ? 2 : 1 });
  }, [submitUiDart, multiplier]);

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

  const pickSpecial = React.useCallback((zone: any) => {
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

  const activeTarget = phaseSelect && game.pendingNextTarget ? game.pendingNextTarget : game.currentTarget;
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

          <div style={{ gridColumn: "1 / 2", position: "relative", zIndex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", minWidth: 0, textAlign: "center", padding: compact ? "6px 10px 4px 88px" : "6px 12px 4px 96px" }}>
            <div style={{ color: accent, fontSize: compact ? 12 : 14, fontWeight: 1000, letterSpacing: .8, lineHeight: 1.02, maxWidth: "100%", textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{activePlayer?.name || "—"}</div>
            {activeTeam ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.2, fontWeight: 900 }}>{activeTeam.name}</div> : null}
            <div style={{ marginTop: 3, color: SOFT, fontSize: 8.5, fontWeight: 1000, letterSpacing: .7 }}>{phaseText}</div>
            <div style={{ marginTop: 2, minHeight: compact ? 58 : 92, display: "grid", placeItems: "center", width: "100%" }}><TargetVisual target={activeTarget} lang={lang} accent={accent} compact={false} /></div>
            <div style={{ marginTop: "auto", width: "100%", display: "grid", placeItems: "center", gap: 5 }}>
              <CricketVisitDarts used={topDartsCount} total={phaseSelect ? Math.max(1, Number(game.selectionAllowed || 1)) : 3} accent={accent} />
            </div>
          </div>

          <div style={{ gridColumn: "2 / 3", position: "relative", zIndex: 2, minWidth: 0, overflow: "hidden", borderRadius: 18, background: "#080b12", padding: 0, color: "#fff", boxShadow: `0 0 0 1px ${accent}33 inset, 0 0 18px ${accent}18` }}>
            <img src={activePanelTicker as any} alt="Active player panel" draggable={false} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", opacity: .92 }} />
            <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(8,10,16,.16), rgba(8,10,16,.48) 60%, rgba(8,10,16,.72))" }} />
            <div style={{ position: "relative", display: "flex", height: "100%", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: "8px 6px 7px" }}>
              <div style={{ alignSelf: "stretch", display: "flex", justifyContent: "center" }}>
                <div style={{ borderRadius: 999, padding: 2, background: "rgba(0,0,0,.28)", boxShadow: `0 0 0 1px ${accent}44, 0 0 16px rgba(0,0,0,.24)` }}>
                  <ProfileAvatar profile={activePlayer} name={activePlayer?.name || "?"} avatarDataUrl={activePlayer?.avatarDataUrl} size={compact ? 46 : 52} loading="eager" />
                </div>
              </div>
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
          <div style={{ position: "absolute", left: compact ? 8 : 12, top: compact ? 8 : 10, display: "flex", alignItems: "center", gap: 6, maxWidth: "78%", overflowX: "auto", scrollbarWidth: "none" }}>
            {game.players.map((p: any, idx: number) => {
              const active = idx === game.turnIndex && !finished;
              const alive = gros6IsPlayerActive(game, p);
              return (
                <div key={p.id} style={{ flex: "0 0 auto", opacity: alive ? 1 : .4, borderRadius: 999, padding: 1, boxShadow: active ? `0 0 0 2px ${accent}, 0 0 14px ${accent}66` : "0 0 0 1px rgba(255,255,255,.16)" }}>
                  <ProfileAvatar profile={p} name={p.name} avatarDataUrl={p.avatarDataUrl} size={compact ? 28 : 32} loading="eager" />
                </div>
              );
            })}
          </div>
          <span style={{ position: "absolute", right: compact ? 10 : 12, top: compact ? 8 : 10, width: 24, height: 24, borderRadius: 999, border: `1px solid ${accent}AA`, color: accent, background: "rgba(0,0,0,.28)", display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 1000 }}>{game.players.length}</span>
          <div style={{ position: "absolute", left: compact ? 10 : 12, bottom: compact ? 6 : 8, display: "grid", gap: 1 }}>
            <span style={{ fontWeight: 1000, letterSpacing: 1, color: accent, textTransform: "uppercase", whiteSpace: "nowrap", fontSize: compact ? 8.6 : 9.4 }}>{L("Liste des joueurs", "Players list")}</span>
          </div>
        </div>
      </button>

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
            preferredMethod={(config as any)?.scoreInputDefaultMethod || (config as any)?.scoreInputMethod || "keypad"}
            keypadExtraMainButtons={[
              { label: L("GROS", "BIG"), onClick: () => setSpecialMode((v) => v === "big" ? null : "big"), active: specialMode === "big", tone: "blue", title: L("Prépare un Gros 6 ou Gros 8", "Prepare a Big 6 or Big 8") },
              { label: L("PETIT", "SMALL"), onClick: () => setSpecialMode((v) => v === "small" ? null : "small"), active: specialMode === "small", tone: "magenta", title: L("Prépare un Petit 6 ou Petit 8", "Prepare a Small 6 or Small 8") },
            ]}
            keypadAuxActionOverride={config?.allowSpecialZones && String(config?.selectionPolicy || "open") !== "pro" ? {
              label: L("ZONE", "ZONE"),
              icon: <ZoneMiniIcon color="currentColor" />,
              onClick: () => setSpecialOpen(true),
              disabled: false,
              active: false,
              title: L("Ouvrir les zones spéciales", "Open special zones"),
              ariaLabel: L("Ouvrir les zones spéciales", "Open special zones"),
            } : null}
            hidePreview
            hideTotal
            showPlaceholders={false}
            hideSwitcher
            hideTabs
            switcherMode="hidden"
            fitToParent
            validateLabel={phaseSelect ? L("VALIDER CIBLE", "CONFIRM TARGET") : L("TOUR EN COURS", "TURN ACTIVE")}
            validateDisabled={!phaseSelect}
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
          <div style={{ color: "#e2e4ef", fontSize: 12.5, lineHeight: 1.65 }}>{L("Touchez la cible courante avec vos 3 fléchettes. Un échec fait perdre une vie. Une réussite permet d'utiliser les fléchettes restantes pour imposer la prochaine cible. Les zones fermées/extérieures activées dans la configuration sont de vraies cibles distinctes. Si la cible est validée sur la 3e fléchette, le bonus configuré ouvre une nouvelle volée de sélection.", "Hit the current target within 3 darts. Missing it costs one life. If you succeed, use the remaining darts to set the next target. Enabled closed/outer zones are distinct targets. If the target is cleared with the 3rd dart, the configured bonus opens a new selection visit.")}</div>
        </ModalShell>
      ) : null}
    </div>
  );
}
