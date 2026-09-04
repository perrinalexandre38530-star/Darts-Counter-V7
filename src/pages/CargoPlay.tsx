// @ts-nocheck
// =============================================================
// CARGO — PLAY V2 épuré
// Écran principal compact + panneaux flottants détaillés.
// =============================================================

import React from "react";
import BackDot from "../components/BackDot";
import DartboardClickable from "../components/DartboardClickable";
import InfoDot from "../components/InfoDot";
import PageHeader from "../components/PageHeader";
import ProfileAvatar from "../components/ProfileAvatar";
import { useTheme } from "../contexts/ThemeContext";
import { useFullscreenPlay } from "../hooks/useFullscreenPlay";
import type { GameDart } from "../lib/types-game";
import {
  buildCargoMatchStats,
  buildCargoPlayerAdvancedStats,
  buildCargoTeamStats,
  cargoContractTargetLabel,
  cargoCurrentObjective,
  cargoEventPresentation,
  cargoVariantLabel,
  cloneCargoState,
  createCargoState,
  getCargoActivePlayer,
  getCargoActiveStats,
  normalizeCargoConfig,
  pickCargoBotDarts,
  playCargoVisit,
  type CargoConfigPayload,
  type CargoState,
} from "../lib/gameEngines/cargoEngine";
import { History } from "../lib/history";
import tickerCargo from "../assets/tickers/ticker_cargo.png";
import CargoEnd from "./CargoEnd";

type UiDart = { v: number; mult: 1 | 2 | 3 };
type CargoOverlay = null | "truck" | "manifest" | "standings" | "stats" | "timeline";
type CargoToast = { id: string; icon: string; title: string; label: string; color: string; priority: number } | null;

const ORANGE = "#ff9b42";
const GOLD = "#f6c256";
const GREEN = "#62e6a7";
const BLUE = "#56c9ff";
const RED = "#ef5261";
const SOFT = "#aab1bf";
const PLAYER_COLORS = [ORANGE, BLUE, GREEN, GOLD, RED, "#a78bfa", "#ff63b8", "#d4d8e5"];

function panel(accent = "rgba(255,255,255,.10)"): React.CSSProperties {
  return {
    borderRadius: 18,
    padding: 9,
    background: "linear-gradient(180deg,rgba(255,255,255,.055),rgba(0,0,0,.30))",
    border: `1px solid ${accent}`,
    boxShadow: "0 14px 34px rgba(0,0,0,.28)",
    boxSizing: "border-box",
  };
}
function action(color: string): React.CSSProperties {
  return {
    minHeight: 38,
    borderRadius: 12,
    border: `1px solid ${color}88`,
    background: `${color}17`,
    color,
    fontWeight: 1050,
    cursor: "pointer",
  };
}
function playerName(profile: any) {
  return profile?.name || profile?.displayName || profile?.display_name || profile?.pseudo || "Joueur";
}
function isBot(profile: any, botIds: Set<string>) {
  return botIds.has(String(profile?.id || "")) || Boolean(profile?.isBot || profile?.bot || profile?.botLevel || profile?.kind === "bot");
}
function pct(a: number, b: number) {
  return b > 0 ? Math.round((a / b) * 1000) / 10 : 0;
}
function uiToGameDart(dart: UiDart): GameDart {
  if (!dart || dart.v === 0) return { bed: "MISS" };
  if (dart.v === 25) return { bed: dart.mult === 2 ? "IB" : "OB" };
  return { bed: dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S", number: dart.v } as GameDart;
}
function normalizeConfig(props: any): CargoConfigPayload {
  const record = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const raw = props?.params?.config || record?.payload?.config || record?.resume?.config || record?.summary?.config || props?.config || props?.params || {};
  return normalizeCargoConfig(raw);
}

function Rules({ config }: { config: CargoConfigPayload }) {
  return <div style={{ display: "grid", gap: 10, fontSize: 13, lineHeight: 1.46 }}>
    <div><strong style={{ color: ORANGE }}>{cargoVariantLabel(config.variant).toUpperCase()}</strong><br />{config.variant === "parcel_delivery" ? "Enchaîne une adresse jusqu’à 5 touches et gagne des colis bonus." : "Complète les contrats ou construis librement des séries pour charger le camion."}</div>
    <div><strong style={{ color: GOLD }}>SÉRIE</strong><br />{config.seriesRule === "exact_segment" ? "Le segment S/D/T doit être identique." : "Le numéro suffit, même si le multiplicateur change."}</div>
    <div><strong style={{ color: GREEN }}>TOURS</strong><br />{config.rounds} tours, 3 fléchettes par volée. {config.carrySeriesBetweenTurns ? "La série continue entre les tours." : "La série est clôturée à chaque volée."}</div>
    <div><strong style={{ color: BLUE }}>BULLS</strong><br />Bull : {config.bullRule}. Double Bull : {config.dbullRule}.</div>
  </div>;
}

function CargoTruckSvg({ parcel, pallets, fill }: { parcel: boolean; pallets: number; fill: number }) {
  const crateCount = Math.min(12, Math.max(0, Number(pallets || 0)));
  return <svg viewBox="0 0 760 170" width="100%" height="100%" aria-hidden="true" style={{ display: "block" }}>
    <defs>
      <linearGradient id="cargoTrailer" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#eef2f5"/><stop offset="1" stopColor="#8d99a5"/></linearGradient>
      <linearGradient id="cargoCab" x1="0" x2="1"><stop offset="0" stopColor="#ffbe4c"/><stop offset="1" stopColor="#e57b22"/></linearGradient>
      <linearGradient id="cargoFill" x1="0" x2="1"><stop offset="0" stopColor={GREEN}/><stop offset=".75" stopColor={ORANGE}/><stop offset="1" stopColor={fill > 90 ? RED : GOLD}/></linearGradient>
      <filter id="cargoShadow"><feDropShadow dx="0" dy="8" stdDeviation="8" floodColor="#000" floodOpacity=".55"/></filter>
    </defs>
    <rect x="0" y="136" width="760" height="34" fill="#11151a"/>
    <path d="M0 147H760" stroke="#2d3238" strokeWidth="3" strokeDasharray="26 12"/>
    {parcel ? <>
      <g opacity=".38" fill="#718096">
        <rect x="26" y="60" width="55" height="76" rx="5"/><rect x="86" y="38" width="72" height="98" rx="5"/><rect x="164" y="74" width="45" height="62" rx="5"/><rect x="216" y="52" width="62" height="84" rx="5"/>
        <rect x="42" y="78" width="12" height="12" fill="#9fb0bf"/><rect x="104" y="56" width="14" height="14" fill="#9fb0bf"/><rect x="129" y="56" width="14" height="14" fill="#9fb0bf"/>
      </g>
    </> : null}
    <g filter="url(#cargoShadow)">
      <rect x="102" y="42" width="430" height="92" rx="11" fill="url(#cargoTrailer)" stroke="#596672" strokeWidth="5"/>
      <rect x="111" y="51" width="412" height="72" rx="7" fill="#cdd5dc" opacity=".28"/>
      <rect x="112" y="120" width="410" height="7" rx="4" fill="#5e6871" opacity=".7"/>
      <g transform="translate(531 62)">
        <path d="M0 70V23c0-8 6-14 14-14h69c15 0 28 8 37 20l25 34v30H0Z" fill="url(#cargoCab)" stroke="#8c4d18" strokeWidth="4"/>
        <path d="M82 15h17c8 0 15 4 20 11l17 23H82Z" fill="#243440" stroke="#8bb7cf" strokeWidth="3"/>
        <rect x="18" y="25" width="50" height="29" rx="5" fill="#263947" stroke="#8bb7cf" strokeWidth="3"/>
        <rect x="8" y="61" width="123" height="18" rx="5" fill="#bd5918" opacity=".72"/>
        <rect x="122" y="65" width="21" height="11" rx="4" fill="#fff5b8"/>
      </g>
      <g fill="#171a20" stroke="#626a72" strokeWidth="4"><circle cx="172" cy="137" r="20"/><circle cx="488" cy="137" r="20"/><circle cx="570" cy="137" r="20"/><circle cx="650" cy="137" r="20"/></g>
      <g fill="#9ea7b0"><circle cx="172" cy="137" r="8"/><circle cx="488" cy="137" r="8"/><circle cx="570" cy="137" r="8"/><circle cx="650" cy="137" r="8"/></g>
      <g>
        {Array.from({ length: crateCount }).map((_, index) => {
          const col = index % 6;
          const row = Math.floor(index / 6);
          const x = 126 + col * 58;
          const y = 92 - row * 34;
          return <g key={index} transform={`translate(${x} ${y})`}>
            <rect width="49" height="29" rx="3" fill={parcel ? "#d8a04e" : index % 2 ? "#b97135" : "#d69548"} stroke="#6b4020" strokeWidth="2"/>
            <path d="M5 5 44 24M44 5 5 24" stroke="#73471f" strokeWidth="2" opacity=".75"/>
          </g>;
        })}
      </g>
    </g>
    <rect x="102" y="22" width="555" height="8" rx="5" fill="#0a0d10" stroke="rgba(255,255,255,.14)"/>
    <rect x="102" y="22" width={`${Math.max(0, Math.min(100, fill)) * 5.55}`} height="8" rx="5" fill="url(#cargoFill)"/>
  </svg>;
}

function TruckVisual({ state, stats }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const capacity = Math.max(1, Number(state.config.truckCapacity || state.config.targetWeight || 1000));
  const value = parcel ? Number(stats?.parcelsDelivered || 0) : Number(stats?.totalWeight || 0);
  const target = parcel ? Math.max(30, state.config.rounds * 5) : state.config.variant === "exact_load" ? Number(state.config.targetWeight || capacity) : capacity;
  const fill = Math.min(100, value / Math.max(1, target) * 100);
  return <div style={{ position: "relative", height: 102, overflow: "hidden", borderRadius: 17, background: "radial-gradient(circle at 74% 15%,rgba(255,155,66,.15),transparent 33%),linear-gradient(180deg,#1b2026,#090c10)", border: "1px solid rgba(255,255,255,.09)" }}>
    <div style={{ position: "absolute", left: 11, top: 9, zIndex: 2 }}>
      <div style={{ color: parcel ? BLUE : ORANGE, fontSize: 8.5, fontWeight: 1100, letterSpacing: .75 }}>{parcel ? "TOURNÉE DE LIVRAISON" : "QUAI DE CHARGEMENT"}</div>
      <div style={{ marginTop: 2, color: "rgba(255,255,255,.52)", fontSize: 7.5 }}>{parcel ? "Colis sécurisés et bonus de série" : "Palettes chargées dans la remorque"}</div>
    </div>
    <div style={{ position: "absolute", right: 12, top: 9, zIndex: 2, textAlign: "right" }}>
      <div style={{ color: fill > 90 ? RED : GREEN, fontSize: 13, fontWeight: 1100 }}>{value} <span style={{ fontSize: 8 }}>{parcel ? "COLIS" : "KG"}</span></div>
      <div style={{ color: SOFT, fontSize: 7.5 }}>{Math.round(fill)}% de l’objectif visuel</div>
    </div>
    <div style={{ position: "absolute", inset: "20px 4px -7px" }}><CargoTruckSvg parcel={parcel} pallets={parcel ? stats?.parcelDeliveries : stats?.pallets} fill={fill} /></div>
  </div>;
}

function ContractCard({ contract, active, progress = 0, detailed = false }: any) {
  const pctProgress = Math.min(100, progress / Math.max(1, Number(contract.targetCount || 1)) * 100);
  return <div style={{ minWidth: 0, borderRadius: detailed ? 16 : 13, padding: detailed ? 11 : 8, background: active ? "linear-gradient(135deg,rgba(255,155,66,.16),rgba(255,255,255,.025))" : "rgba(255,255,255,.025)", border: `1px solid ${active ? ORANGE : contract.fragile ? RED : contract.urgent ? GOLD : "rgba(255,255,255,.08)"}`, boxShadow: active ? `0 0 18px ${ORANGE}22` : "none" }}>
    <div style={{ display: "flex", justifyContent: "space-between", gap: 7, alignItems: "flex-start" }}>
      <div style={{ minWidth: 0 }}><strong style={{ color: active ? ORANGE : "#fff", fontSize: detailed ? 11 : 9, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", display: "block" }}>{contract.icon} {contract.label}</strong><div style={{ color: SOFT, fontSize: detailed ? 8.5 : 7, marginTop: 2 }}>{contract.cargoType}</div></div>
      <div style={{ textAlign: "right", flex: "0 0 auto" }}><div style={{ color: GOLD, fontSize: detailed ? 16 : 10, fontWeight: 1100 }}>{contract.finalWeight}</div><div style={{ color: SOFT, fontSize: 7 }}>KG</div></div>
    </div>
    <div style={{ marginTop: detailed ? 9 : 5, display: "flex", justifyContent: "space-between", gap: 7, alignItems: "center" }}><span style={{ color: GREEN, fontWeight: 1100, fontSize: detailed ? 17 : 13 }}>{cargoContractTargetLabel(contract)}</span><span style={{ color: SOFT, fontSize: detailed ? 8 : 7 }}>{active ? `${progress}/${contract.targetCount}` : contract.bonusPercent ? `BONUS +${contract.bonusPercent}%` : "STANDARD"}</span></div>
    {detailed ? <div style={{ marginTop: 8, height: 7, borderRadius: 999, background: "rgba(255,255,255,.07)", overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ height: "100%", width: `${active ? pctProgress : 0}%`, background: `linear-gradient(90deg,${GREEN},${ORANGE})`, transition: "width .2s ease" }} /></div> : null}
    <div style={{ marginTop: detailed ? 8 : 3, display: "flex", gap: 5, flexWrap: "wrap" }}>{contract.fragile ? <span style={{ color: RED, fontSize: 7, fontWeight: 1000 }}>FRAGILE</span> : null}{contract.urgent ? <span style={{ color: GOLD, fontSize: 7, fontWeight: 1000 }}>URGENT</span> : null}{contract.expiresAtRound ? <span style={{ color: BLUE, fontSize: 7, fontWeight: 1000 }}>EXPIRE T{contract.expiresAtRound}</span> : null}</div>
  </div>;
}

function QuickButton({ icon, label, value, color, onClick, disabled = false }: any) {
  return <button type="button" onClick={onClick} disabled={disabled} style={{ minWidth: 0, height: "100%", minHeight: 0, borderRadius: 15, border: `1px solid ${disabled ? "rgba(255,255,255,.055)" : `${color}42`}`, background: disabled ? "rgba(255,255,255,.012)" : `linear-gradient(180deg,${color}10,rgba(255,255,255,.018))`, color: disabled ? "rgba(255,255,255,.24)" : "#fff", padding: "6px 3px 5px", cursor: disabled ? "default" : "pointer", boxShadow: disabled ? "none" : `inset 0 1px rgba(255,255,255,.03),0 0 15px ${color}0d`, display: "grid", placeItems: "center", alignContent: "center" }}>
    <div style={{ color: disabled ? "rgba(255,255,255,.20)" : color, fontSize: 16, lineHeight: 1, fontWeight: 950, textShadow: disabled ? "none" : `0 0 10px ${color}55` }}>{icon}</div>
    <div style={{ marginTop: 4, fontSize: 8.1, fontWeight: 1050, letterSpacing: .52, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{label}</div>
    {value ? <div style={{ marginTop: 2, color: disabled ? "rgba(255,255,255,.18)" : "rgba(255,255,255,.48)", fontSize: 7.1, fontWeight: 850, lineHeight: 1, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{value}</div> : null}
  </button>;
}

function cargoDartLabel(dart?: UiDart) {
  if (!dart) return "—";
  if (dart.v === 0) return "MISS";
  if (dart.v === 25) return dart.mult === 2 ? "DBULL" : "BULL";
  return `${dart.mult === 3 ? "T" : dart.mult === 2 ? "D" : "S"}${dart.v}`;
}

function CargoAiryKeypad({
  currentThrow, multiplier, onSimple, onDouble, onTriple, onBackspace, onCancel, onNumber, onBull, onValidate, centerSlot, noticeSlot, validateAttention = false, disabled = false,
}: any) {
  const rows = [[0,1,2,3,4,5,6],[7,8,9,10,11,12,13],[14,15,16,17,18,19,20]];
  return <div className="cargo-airy-keypad" style={{ width: "100%", height: "100%", minHeight: 0, display: "grid", gridTemplateRows: "42px 52px minmax(16px,auto) minmax(205px,1fr) 58px", gap: 11, padding: "12px", boxSizing: "border-box", borderRadius: 20, background: "linear-gradient(180deg,rgba(22,22,23,.85),rgba(12,12,14,.95))", border: "1px solid rgba(255,255,255,.08)", boxShadow: "0 10px 30px rgba(0,0,0,.35)", opacity: disabled ? .50 : 1, pointerEvents: disabled ? "none" : "auto", overflow: "hidden", userSelect: "none" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, alignItems: "stretch" }}>
      {[0,1,2].map((index) => <div key={index} style={{ minWidth: 0, display: "grid", placeItems: "center", borderRadius: 14, background: "rgba(0,0,0,.48)", border: "1px solid rgba(255,255,255,.08)", color: index === 0 ? "#eec7ff" : index === 1 ? "#cfe6ff" : "#ffe7c0", fontSize: 10.8, fontWeight: 950, letterSpacing: .5, boxShadow: "0 0 18px rgba(250,213,75,.08)" }}>{cargoDartLabel(currentThrow[index])}</div>)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
      <button type="button" aria-pressed={multiplier === 2} onClick={onDouble} style={{ minWidth: 0, borderRadius: 16, border: `1px solid ${multiplier === 2 ? "#9bd7ff" : "rgba(255,255,255,.08)"}`, background: "rgba(46,150,193,.20)", color: "#bfeaff", fontSize: 10.5, fontWeight: 1000, cursor: "pointer", boxShadow: multiplier === 2 ? "0 0 18px rgba(86,201,255,.18)" : "none" }}>DOUBLE</button>
      <button type="button" aria-pressed={multiplier === 3} onClick={onTriple} style={{ minWidth: 0, borderRadius: 16, border: `1px solid ${multiplier === 3 ? "#ffd0ff" : "rgba(255,255,255,.08)"}`, background: "rgba(179,68,151,.20)", color: "#ffccff", fontSize: 10.5, fontWeight: 1000, cursor: "pointer", boxShadow: multiplier === 3 ? "0 0 18px rgba(217,140,255,.18)" : "none" }}>TRIPLE</button>
      <button type="button" onClick={onCancel} onContextMenu={(event) => { event.preventDefault(); onBackspace?.(); }} aria-label="Annuler" title="Annuler" style={{ minWidth: 0, borderRadius: 16, border: "1px solid rgba(255,180,0,.30)", background: "linear-gradient(180deg,#ffc63a,#ffaf00)", color: "#1a1a1a", fontSize: 10.5, fontWeight: 1050, cursor: "pointer", boxShadow: "0 9px 20px rgba(255,170,0,.20)" }}>ANNULER</button>
    </div>

    <div style={{ minWidth: 0, display: "grid", placeItems: "center", overflow: "hidden" }}>{noticeSlot || <span style={{ color: "rgba(255,255,255,.28)", fontSize: 7.8, fontWeight: 850 }}>SIMPLE PAR DÉFAUT · D/T POUR LA PROCHAINE FLÉCHETTE</span>}</div>

    <div style={{ minHeight: 0, display: "grid", gridTemplateRows: "repeat(3,minmax(0,1fr))", gap: 9 }}>
      {rows.map((row, rowIndex) => <div key={rowIndex} style={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 8 }}>
        {row.map((number) => <button key={number} type="button" onClick={() => onNumber(number)} title={number === 0 ? "MISS" : String(number)} style={{ minWidth: 0, minHeight: 0, borderRadius: 16, border: "1px solid rgba(255,255,255,.08)", background: "rgba(255,255,255,.04)", color: "#fff", fontSize: "clamp(15px,4.2vw,20px)", fontWeight: 900, cursor: "pointer", boxShadow: "inset 0 1px rgba(255,255,255,.025)", touchAction: "manipulation" }}>{number}</button>)}
      </div>)}
    </div>

    <div style={{ display: "grid", gridTemplateColumns: "minmax(88px,.8fr) minmax(64px,.44fr) minmax(120px,1fr)", gap: 10, alignItems: "stretch" }}>
      <button type="button" onClick={onBull} style={{ minWidth: 0, borderRadius: 16, border: "1px solid rgba(139,224,184,.18)", background: "rgba(22,92,66,.35)", color: "#8be0b8", fontSize: 12.5, fontWeight: 1050, cursor: "pointer" }}>BULL</button>
      <div style={{ display: "grid", placeItems: "center", minWidth: 0 }}>{centerSlot}</div>
      <button type="button" onClick={onValidate} disabled={!currentThrow.length} style={{ minWidth: 0, borderRadius: 16, border: currentThrow.length ? "1px solid rgba(255,180,0,.30)" : "1px solid rgba(255,255,255,.06)", background: currentThrow.length ? (validateAttention ? "linear-gradient(180deg,#ffffff,#ffd666)" : "linear-gradient(180deg,#ffc63a,#ffaf00)") : "rgba(255,255,255,.035)", color: currentThrow.length ? "#1a1a1a" : "rgba(255,255,255,.24)", fontSize: 11.5, fontWeight: 1100, letterSpacing: .55, cursor: currentThrow.length ? "pointer" : "default", boxShadow: currentThrow.length ? (validateAttention ? "0 0 24px rgba(255,255,255,.46),0 10px 22px rgba(255,170,0,.24)" : "0 10px 22px rgba(255,170,0,.24)") : "none" }}>VALIDER</button>
    </div>
  </div>;
}


function TruckMiniIcon({ size = 23 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 6h11v10H3V6Zm11 4h3.6l3.4 3.6V16h-7v-6Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
    <circle cx="7" cy="17.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
    <circle cx="18" cy="17.5" r="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
  </svg>;
}

function Kpi({ label, value, detail, color = ORANGE }: any) {
  return <div style={{ minWidth: 0, borderRadius: 14, padding: 10, background: "rgba(255,255,255,.035)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ color: SOFT, fontSize: 7.5, fontWeight: 1000, letterSpacing: .55 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 20, fontWeight: 1100, lineHeight: 1 }}>{value}</div>{detail ? <div style={{ marginTop: 4, color: "rgba(255,255,255,.42)", fontSize: 7.5 }}>{detail}</div> : null}</div>;
}


function EventToast({ toast, onClose }: { toast: Exclude<CargoToast, null>; onClose: () => void }) {
  return <button type="button" onClick={onClose} aria-label="Fermer la notification CARGO" style={{ position: "fixed", zIndex: 9997, top: "calc(env(safe-area-inset-top) + 84px)", left: "50%", transform: "translateX(-50%)", width: "min(420px,calc(100% - 22px))", minHeight: 58, padding: "8px 10px", borderRadius: 16, border: `1px solid ${toast.color}77`, background: "linear-gradient(180deg,rgba(20,23,28,.98),rgba(7,9,12,.98))", boxShadow: `0 16px 42px rgba(0,0,0,.58),0 0 22px ${toast.color}22`, display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center", color: "#fff", textAlign: "left", cursor: "pointer", animation: "cargo-toast-in .24s ease-out" }}>
    <span style={{ width: 36, height: 36, borderRadius: 12, display: "grid", placeItems: "center", color: toast.color, background: `${toast.color}14`, border: `1px solid ${toast.color}44`, fontSize: 18, fontWeight: 1100 }}>{toast.icon}</span>
    <span style={{ minWidth: 0 }}><span style={{ display: "block", color: toast.color, fontSize: 8.5, fontWeight: 1100, letterSpacing: .7 }}>{toast.title}</span><span style={{ display: "block", marginTop: 3, color: "#e5e8ee", fontSize: 9.5, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{toast.label}</span></span>
    <span style={{ color: "rgba(255,255,255,.40)", fontSize: 16 }}>×</span>
  </button>;
}

function notableToast(events: any[]): CargoToast {
  const ranked = (events || []).map((event: any, index: number) => ({ event, index, presentation: cargoEventPresentation(event) })).filter((item: any) => item.presentation.priority >= 2).sort((a: any, b: any) => b.presentation.priority - a.presentation.priority || b.index - a.index);
  const hit = ranked[0];
  if (!hit) return null;
  return { id: `${Date.now()}-${hit.index}`, icon: hit.presentation.icon, title: hit.presentation.title, label: hit.event.label, color: hit.presentation.color, priority: hit.presentation.priority };
}

function OverlayShell({ title, subtitle, color, onClose, children }: any) {
  return <div role="dialog" aria-modal="true" style={{ position: "fixed", inset: 0, zIndex: 9998, background: "rgba(0,0,0,.84)", backdropFilter: "blur(9px)", display: "flex", alignItems: "flex-end", justifyContent: "center", padding: "8px 8px max(8px,env(safe-area-inset-bottom))" }} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <div style={{ width: "min(820px,100%)", maxHeight: "88dvh", overflow: "hidden", borderRadius: "23px 23px 15px 15px", background: "linear-gradient(180deg,#171a20,#080a0e)", border: `1px solid ${color}55`, boxShadow: "0 28px 90px rgba(0,0,0,.72)" }}>
      <div style={{ position: "sticky", top: 0, zIndex: 2, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "12px 13px", background: "linear-gradient(180deg,rgba(20,23,29,.99),rgba(14,16,20,.96))", borderBottom: "1px solid rgba(255,255,255,.08)" }}>
        <div style={{ minWidth: 0 }}><div style={{ color, fontSize: 11.5, fontWeight: 1100, letterSpacing: .75 }}>{title}</div>{subtitle ? <div style={{ marginTop: 2, color: SOFT, fontSize: 8.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{subtitle}</div> : null}</div>
        <button type="button" onClick={onClose} style={{ width: 38, height: 38, borderRadius: 12, border: "1px solid rgba(255,255,255,.12)", background: "rgba(255,255,255,.045)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button>
      </div>
      <div className="dc-scroll-thin" style={{ maxHeight: "calc(88dvh - 65px)", overflowY: "auto", padding: 12 }}>{children}</div>
    </div>
  </div>;
}

export default function CargoPlay(props: any) {
  const { theme } = useTheme();
  useFullscreenPlay({ enabled: true, lockBodyScroll: true });
  const config = React.useMemo(() => normalizeConfig(props), []);
  const store = props?.store;
  const go = props?.go ?? props?.setTab;
  const onFinish = props?.onFinish as ((record: any, options?: { navigate?: boolean }) => void) | undefined;
  const resumeRecord = props?.params?.rec || props?.params?.record || props?.params?.match || null;
  const botIds = React.useMemo(() => new Set((config.botIds || []).map(String)), [config.botIds]);

  const profiles = React.useMemo(() => {
    const fromPayload = Array.isArray(config.playersList) ? config.playersList : [];
    const resolved = typeof store?.resolveSelectedProfiles === "function" ? store.resolveSelectedProfiles(config.selectedIds || []) : [];
    const pool = [...fromPayload, ...(Array.isArray(resolved) ? resolved : []), ...(Array.isArray(store?.profiles) ? store.profiles : [])];
    const byId = new Map<string, any>();
    pool.forEach((profile: any) => { const id = String(profile?.id || profile?.profileId || ""); if (id) byId.set(id, { ...(byId.get(id) || {}), ...profile, id, name: playerName(profile) }); });
    const ordered = config.selectedIds.map((id) => byId.get(String(id))).filter(Boolean);
    return ordered.length ? ordered : Array.from({ length: config.players }, (_, i) => ({ id: `p${i + 1}`, name: `Joueur ${i + 1}` }));
  }, [store, config]);
  const players = React.useMemo(() => profiles.map((profile: any) => ({ id: String(profile.id), name: playerName(profile) })), [profiles]);
  const profilesById = React.useMemo(() => new Map(profiles.map((profile: any) => [String(profile.id), profile])), [profiles]);
  const initialState = React.useMemo(() => { const snapshot = resumeRecord?.resume?.state || resumeRecord?.payload?.stateSnapshot || null; return snapshot?.mode === "cargo" ? cloneCargoState(snapshot) : createCargoState(players, config); }, []);

  const [state, setState] = React.useState<CargoState>(initialState);
  const [throwDarts, setThrowDarts] = React.useState<UiDart[]>([]);
  const [multiplier, setMultiplier] = React.useState<1 | 2 | 3>(1);
  const [undoStack, setUndoStack] = React.useState<CargoState[]>([]);
  const [notice, setNotice] = React.useState(cargoCurrentObjective(initialState));
  const [overlay, setOverlay] = React.useState<CargoOverlay>(null);
  const [showEnd, setShowEnd] = React.useState(initialState.phase === "finished");
  const [botThinking, setBotThinking] = React.useState(false);
  const [eventToast, setEventToast] = React.useState<CargoToast>(null);
  const matchIdRef = React.useRef(String(resumeRecord?.id || resumeRecord?.matchId || `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`));
  const autoSavedRef = React.useRef("");

  const activePlayer = getCargoActivePlayer(state);
  const activeStats = getCargoActiveStats(state) || {};
  const activeProfile = profilesById.get(String(activePlayer?.id)) || activePlayer;
  const activeColor = PLAYER_COLORS[state.activePlayerIndex % PLAYER_COLORS.length];
  const activeSeries = activeStats?.currentSeries;
  const activeContract = activeSeries?.contractId ? state.contracts.find((contract) => contract.id === activeSeries.contractId) : null;
  const activeStanding = state.standings.find((standing) => String(standing.id) === String(activePlayer?.id));
  const activeTeamId = config.participantMode === "teams" ? config.teamByPlayer?.[String(activePlayer?.id || "")] || null : null;
  const activeTeam = activeTeamId ? (state.teamStandings || []).find((team: any) => String(team.id) === String(activeTeamId)) : null;
  const activeTeamName = activeTeam?.name || (activeTeamId ? config.teamNames?.[String(activeTeamId)] || activeTeamId : null);
  const isParcel = config.variant === "parcel_delivery";
  const activeScore = isParcel ? Number(activeStats.parcelsDelivered || 0) : Number(activeStats.totalWeight || 0);
  const scoreUnit = isParcel ? "COLIS" : "KG";

  function backToConfig() { if (typeof go === "function") go("cargo_config", config); }
  function addDart(v: number, mult?: 1 | 2 | 3) { if (botThinking || state.phase !== "playing" || throwDarts.length >= 3) return; const selected = (mult || multiplier) as 1 | 2 | 3; setThrowDarts((prev) => [...prev, { v: Number(v) || 0, mult: selected }].slice(0, 3)); setMultiplier(1); }
  function commitVisit(source?: UiDart[]) {
    const darts = (source || throwDarts).slice(0, 3); if (!darts.length || state.phase !== "playing") return;
    setUndoStack((prev) => [...prev.slice(-29), cloneCargoState(state)]);
    const next = playCargoVisit(state, darts.map(uiToGameDart));
    setState(next); setThrowDarts([]); setMultiplier(1);
    const visit = next.visits[next.visits.length - 1];
    setNotice(visit?.events?.map((event) => event.label).join(" · ") || cargoCurrentObjective(next));
    const toast = notableToast(visit?.events || []);
    if (toast) setEventToast(toast);
    if (next.phase === "finished") setShowEnd(true);
  }
  function cancelOrUndo() {
    if (throwDarts.length) { setThrowDarts([]); setMultiplier(1); setNotice("Volée effacée."); return; }
    const previous = undoStack[undoStack.length - 1]; if (!previous) { setNotice("Aucune action à annuler."); return; }
    setState(previous); setUndoStack((prev) => prev.slice(0, -1)); setShowEnd(false); autoSavedRef.current = ""; setNotice("Dernière volée annulée.");
  }
  function resetMatch() { matchIdRef.current = `cargo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; const next = createCargoState(players, config); setState(next); setThrowDarts([]); setUndoStack([]); setShowEnd(false); setOverlay(null); setEventToast(null); setNotice(cargoCurrentObjective(next)); autoSavedRef.current = ""; }

  React.useEffect(() => {
    if (state.phase !== "playing" || !activePlayer || !isBot(activeProfile, botIds) || botThinking) return;
    setBotThinking(true);
    const timer = window.setTimeout(() => {
      const darts = pickCargoBotDarts(state).map((dart: any) => dart?.bed === "MISS" ? ({ v: 0, mult: 1 }) : dart?.bed === "OB" || dart?.bed === "BULL" ? ({ v: 25, mult: 1 }) : dart?.bed === "IB" || dart?.bed === "DBULL" ? ({ v: 25, mult: 2 }) : ({ v: Number(dart?.number || 0), mult: dart?.bed === "T" ? 3 : dart?.bed === "D" ? 2 : 1 }));
      const next = playCargoVisit(state, darts.map(uiToGameDart));
      setUndoStack((prev) => [...prev.slice(-29), cloneCargoState(state)]); setState(next); setThrowDarts([]); setBotThinking(false);
      const visit = next.visits[next.visits.length - 1]; setNotice(visit?.events?.map((event) => event.label).join(" · ") || "Volée BOT validée."); const toast = notableToast(visit?.events || []); if (toast) setEventToast(toast); if (next.phase === "finished") setShowEnd(true);
    }, 620);
    return () => { window.clearTimeout(timer); setBotThinking(false); };
  }, [state.activePlayerIndex, state.roundIndex, state.phase]);

  React.useEffect(() => {
    if (!eventToast) return;
    const timer = window.setTimeout(() => setEventToast(null), eventToast.priority >= 4 ? 2600 : 1900);
    return () => window.clearTimeout(timer);
  }, [eventToast?.id]);

  React.useEffect(() => {
    if (!overlay) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOverlay(null); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = previous; window.removeEventListener("keydown", onKey); };
  }, [overlay]);

  function buildHistoryRecord(statusOverride?: "in_progress" | "finished") {
    const status = statusOverride || (state.phase === "finished" ? "finished" : "in_progress");
    const finished = status === "finished";
    const now = finished ? (state.finishedAt || Date.now()) : Date.now();
    const playerRows = state.players.map((player, index) => {
      const profile = profilesById.get(String(player.id)) || player;
      const stats = state.statsByPlayer[player.id] || {};
      const standing = state.standings.find((row) => row.id === player.id);
      const advanced = buildCargoPlayerAdvancedStats(state, String(player.id));
      const teamId = config.teamByPlayer?.[String(player.id)] || null;
      const teamName = teamId ? (config.teamNames?.[String(teamId)] || teamId) : null;
      const teamStanding = teamId ? (state.teamStandings || []).find((row: any) => String(row.id) === String(teamId)) : null;
      const visits = state.visits.filter((visit) => String(visit.playerId) === String(player.id));
      const dartsDetail = visits.flatMap((visit) => visit.darts.map((dart, dartIndex) => ({ ...dart, label: visit.labels[dartIndex], round: visit.round, visit: visit.visit, dartIndex: dartIndex + 1, events: visit.events })));
      return {
        id: player.id,
        playerId: player.id,
        profileId: player.id,
        name: playerName(profile),
        avatarDataUrl: profile?.avatarDataUrl ?? profile?.avatarUrl ?? profile?.avatar ?? null,
        dartSetId: config.playerDartSets?.[player.id] ?? profile?.dartSetId ?? null,
        color: PLAYER_COLORS[index % PLAYER_COLORS.length],
        teamId,
        teamName,
        teamRank: teamStanding?.rank || null,
        teamScore: teamStanding?.score || 0,
        personalScore: standing?.personalScore ?? advanced.score,
        rank: standing?.rank || null,
        win: finished && state.winnerIds.includes(player.id),
        winner: finished && state.winnerIds.includes(player.id),
        ...stats,
        ...advanced,
        advanced,
        visitsHistory: visits,
        visitHistory: visits,
        dartsDetail,
        hitsBySegment: { ...(stats.hitsBySegment || {}) },
      };
    });
    const matchStats = buildCargoMatchStats(state);
    const teamRows = buildCargoTeamStats(state);
    const scoreWord = config.variant === "parcel_delivery" ? "colis" : "kg";
    const winnerName = finished
      ? config.participantMode === "teams"
        ? teamRows.filter((row: any) => row.rank === 1).map((row: any) => row.name).join(" / ")
        : state.standings.filter((row) => row.rank === 1).map((row) => row.name).join(" / ")
      : null;
    const summary = {
      kind: "cargo",
      mode: "cargo",
      sport: "darts",
      variant: config.variant,
      variantLabel: cargoVariantLabel(config.variant),
      participantMode: config.participantMode,
      teamCount: config.participantMode === "teams" ? config.teamCount : undefined,
      teamNames: config.participantMode === "teams" ? config.teamNames : undefined,
      finished,
      statisticsVersion: 2,
      telemetryVersion: 3,
      analyticsVersion: 4,
      winnerId: finished ? state.winnerIds[0] || null : null,
      winnerIds: finished ? state.winnerIds : [],
      winnerTeamIds: finished ? state.winnerTeamIds || [] : [],
      winnerName,
      roundsPlayed: Math.min(config.rounds, state.roundIndex),
      configuredRounds: config.rounds,
      players: playerRows,
      perPlayer: playerRows,
      teams: teamRows,
      teamStandings: teamRows,
      rankings: finished ? playerRows.slice().sort((a, b) => Number(a.rank || 999) - Number(b.rank || 999)) : [],
      visits: state.visits,
      matchStats,
      config,
      scoreLine: `${cargoVariantLabel(config.variant)} · ${config.variant === "parcel_delivery" ? matchStats.totalParcels : matchStats.totalWeight} ${scoreWord} · ${matchStats.totalDarts} fléchettes`,
      game: { mode: "cargo", variant: config.variant, rounds: config.rounds, participantMode: config.participantMode, teamCount: config.teamCount },
    };
    return {
      id: matchIdRef.current,
      matchId: matchIdRef.current,
      kind: "cargo",
      mode: "cargo",
      sport: "darts",
      status,
      statisticsVersion: 2,
      telemetryVersion: 3,
      analyticsVersion: 4,
      createdAt: state.startedAt,
      startedAt: state.startedAt,
      updatedAt: now,
      ...(finished ? { finishedAt: now, endedAt: now } : {}),
      winnerId: summary.winnerId,
      winnerIds: summary.winnerIds,
      winnerTeamIds: summary.winnerTeamIds,
      winnerName: summary.winnerName,
      players: playerRows,
      teams: teamRows,
      resumeId: matchIdRef.current,
      resume: { config, state: cloneCargoState(state), updatedAt: now },
      game: summary.game,
      summary,
      payload: {
        kind: "cargo",
        mode: "cargo",
        sport: "darts",
        variant: config.variant,
        statisticsVersion: 2,
        telemetryVersion: 3,
        analyticsVersion: 4,
        config,
        players: playerRows,
        teams: teamRows,
        summary,
        visits: state.visits,
        visitHistory: state.visits,
        stateSnapshot: cloneCargoState(state),
        stats: { sport: "darts", mode: "cargo", variant: config.variant, players: playerRows, teams: teamRows, match: matchStats, global: matchStats },
      },
    };
  }

  React.useEffect(() => { if (state.phase === "finished" || state.visits.length === 0) return; const timer = window.setTimeout(() => { void (History as any).upsert(buildHistoryRecord("in_progress")); }, 280); return () => window.clearTimeout(timer); }, [state]);
  React.useEffect(() => {
    if (state.phase !== "finished") return;
    setShowEnd(true);
    if (autoSavedRef.current === matchIdRef.current) return;
    autoSavedRef.current = matchIdRef.current;
    const record = buildHistoryRecord("finished");
    try { void (History as any).upsert(record); } catch {}
    try { onFinish?.(record, { navigate: false }); } catch {}
  }, [state.phase]);

  const centerScore = <div style={{ textAlign: "center" }}><div style={{ color: isParcel ? BLUE : ORANGE, fontSize: 21, lineHeight: 1, fontWeight: 1200 }}>{activeScore} <span style={{ fontSize: 11, opacity: .82 }}>{scoreUnit}</span></div><div style={{ marginTop: 4, color: activeSeries ? GREEN : SOFT, fontSize: 8.3, fontWeight: 1000 }}>{activeSeries ? `SÉRIE ${activeSeries.count}${isParcel ? "/5" : ""}` : `TOUR ${state.roundIndex}/${config.rounds}`}</div></div>;
  const objectiveNow = cargoCurrentObjective(state);
  const visibleNotice = botThinking ? "BOT EN CHARGEMENT…" : (notice && notice !== objectiveNow ? notice : "");
  const keypadNotice = visibleNotice ? <div style={{ width: "100%", color: botThinking ? GOLD : "rgba(255,255,255,.60)", fontSize: 8.1, fontWeight: 900, textAlign: "center", lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{visibleNotice}</div> : null;

  const cargoTarget = isParcel
    ? Math.max(30, config.rounds * 5)
    : config.variant === "exact_load"
      ? Math.max(1, Number(config.targetWeight || config.truckCapacity || 1000))
      : Math.max(1, Number(config.truckCapacity || config.targetWeight || 1000));
  const cargoFill = Math.max(0, Math.min(100, activeScore / Math.max(1, cargoTarget) * 100));
  const activeAccuracy = pct(Number(activeStats?.hits || 0), Number(activeStats?.darts || 0));

  return <div style={{ position: "fixed", inset: 0, zIndex: 40, minHeight: 0, color: theme?.text || "#fff", background: `radial-gradient(circle at 50% -6%,${ORANGE}20 0,${theme?.bg || "#080a11"} 44%,#020305 100%)`, padding: "0 0 max(6px,env(safe-area-inset-bottom))", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <PageHeader tickerSrc={tickerCargo} tickerAlt="CARGO" tickerHeight={92} tickerFit="cover" tickerBottomGap={8} left={<div style={{ marginLeft: 6 }}><BackDot onClick={backToConfig} color={ORANGE} glow={`${ORANGE}88`} /></div>} right={<div style={{ marginRight: 6 }}><InfoDot title="Règles CARGO" color={GOLD} glow={`${GOLD}88`} content={<Rules config={config} />} /></div>} />

    <main className="cargo-play-main" style={{ flex: 1, minHeight: 0, width: "100%", maxWidth: 980, margin: "0 auto", padding: "7px 8px 0", boxSizing: "border-box", display: "grid", gridTemplateRows: "132px 58px minmax(0,1fr)", gap: 9, overflow: "hidden" }}>
      <section style={{ minHeight: 0, borderRadius: 20, overflow: "hidden", border: `1px solid ${activeColor}78`, background: "linear-gradient(180deg,rgba(18,20,27,.93),rgba(6,8,12,.96))", boxShadow: `0 0 24px ${activeColor}1c,0 12px 30px rgba(0,0,0,.26)`, display: "grid", gridTemplateRows: "minmax(0,1fr) 34px" }}>
        <div style={{ minHeight: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) 126px", alignItems: "stretch", position: "relative" }}>
          <div style={{ minWidth: 0, position: "relative", overflow: "hidden", padding: "9px 9px 7px 10px", display: "grid", gridTemplateColumns: "58px minmax(0,1fr) auto", gap: 9, alignItems: "center" }}>
            <div aria-hidden style={{ position: "absolute", right: -26, top: -32, width: 150, height: 150, opacity: .13, transform: "scale(1.45)", pointerEvents: "none", filter: "saturate(.9)" }}><ProfileAvatar profile={activeProfile} size={104} /></div>
            <div aria-hidden style={{ position: "absolute", inset: 0, background: "linear-gradient(90deg,rgba(9,11,16,.98) 0%,rgba(9,11,16,.92) 48%,rgba(9,11,16,.54) 78%,rgba(9,11,16,.18) 100%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1, width: 56, height: 56, borderRadius: 999, display: "grid", placeItems: "center", boxShadow: `0 0 0 1px ${activeColor}66,0 0 15px ${activeColor}66` }}><ProfileAvatar profile={activeProfile} size={54} /></div>
            <div style={{ minWidth: 0, position: "relative", zIndex: 1 }}>
              <div style={{ color: activeColor, fontSize: 16, lineHeight: 1, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", textShadow: `0 0 10px ${activeColor}44` }}>{playerName(activeProfile)}</div>
              <div style={{ marginTop: 6, color: "rgba(255,255,255,.58)", fontSize: 8.4, fontWeight: 850, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{cargoVariantLabel(config.variant)} · Tour {Math.min(state.roundIndex, config.rounds)}/{config.rounds}{activeTeamName ? ` · ${activeTeamName}` : ""}</div>
              <div style={{ marginTop: 7, display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}><span style={{ flex: "0 0 auto", width: 6, height: 6, borderRadius: 999, background: activeSeries ? GREEN : ORANGE, boxShadow: `0 0 9px ${activeSeries ? GREEN : ORANGE}` }} /><span style={{ color: activeSeries ? GREEN : GOLD, fontSize: 8.4, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeSeries ? `Série ${activeSeries.count}${isParcel ? "/5" : `/${activeContract?.targetCount || config.maxSeries}`}` : "Nouvelle série disponible"}</span></div>
            </div>
            <div style={{ minWidth: 58, textAlign: "center", position: "relative", zIndex: 1 }}>
              <div style={{ color: isParcel ? BLUE : ORANGE, fontSize: 33, lineHeight: .9, fontWeight: 1200, textShadow: `0 0 14px ${(isParcel ? BLUE : ORANGE)}42` }}>{activeScore}</div>
              <div style={{ marginTop: 6, color: SOFT, fontSize: 7.4, fontWeight: 1000, letterSpacing: .5 }}>{scoreUnit}</div>
              {activeTeam ? <div style={{ marginTop: 4, color: GOLD, fontSize: 6.8, fontWeight: 1000 }}>TEAM {activeTeam.score} {scoreUnit}</div> : null}
            </div>
          </div>

          <button type="button" onClick={() => setOverlay("truck")} aria-label="Ouvrir le camion" title="Camion et chargement" style={{ position: "relative", minWidth: 0, border: "none", borderLeft: `1px solid ${ORANGE}42`, background: "radial-gradient(circle at 50% 105%,rgba(255,155,66,.20),rgba(3,5,9,.98) 64%)", color: "#fff", padding: 8, cursor: "pointer", overflow: "hidden" }}>
            <div style={{ position: "absolute", inset: 0, opacity: .08, transform: "scale(1.7) translate(9px,8px)", display: "grid", placeItems: "center", color: ORANGE }}><TruckMiniIcon size={54} /></div>
            <div style={{ position: "relative", height: "100%", display: "grid", alignContent: "center", justifyItems: "center", gap: 4 }}>
              <span style={{ width: 39, height: 39, display: "grid", placeItems: "center", borderRadius: 13, color: ORANGE, border: `1px solid ${ORANGE}55`, background: `${ORANGE}12`, boxShadow: `0 0 15px ${ORANGE}18` }}><TruckMiniIcon size={24} /></span>
              <strong style={{ color: ORANGE, fontSize: 8.1, letterSpacing: .6 }}>{isParcel ? "LIVRAISON" : "CHARGEMENT"}</strong>
              <span style={{ color: "#fff", fontSize: 17, lineHeight: 1, fontWeight: 1100 }}>{Math.round(cargoFill)}%</span>
              <span style={{ color: "rgba(255,255,255,.42)", fontSize: 7 }}>{isParcel ? `${activeScore}/${cargoTarget} colis` : `${activeScore}/${cargoTarget} kg`}</span>
            </div>
          </button>
        </div>

        <div style={{ minWidth: 0, display: "grid", gridTemplateColumns: "minmax(0,1fr) auto", gap: 10, alignItems: "center", padding: "5px 10px", background: "rgba(0,0,0,.28)", borderTop: "1px solid rgba(255,255,255,.05)" }}>
          <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 7 }}><span style={{ flex: "0 0 auto", width: 6, height: 6, borderRadius: 999, background: GOLD, boxShadow: `0 0 8px ${GOLD}88` }} /><span style={{ color: "rgba(255,255,255,.82)", fontSize: 8.5, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{objectiveNow}</span></div>
          <span style={{ color: throwDarts.length === 3 ? GOLD : SOFT, fontSize: 7.7, fontWeight: 950 }}>{throwDarts.length}/3</span>
        </div>
      </section>

      <section style={{ minHeight: 0, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 7 }}>
        <QuickButton icon="▦" label={isParcel ? "TOURNÉE" : "MANIFESTE"} value={`${state.contracts.length} contrat${state.contracts.length > 1 ? "s" : ""}`} color={GOLD} onClick={() => setOverlay("manifest")} />
        <QuickButton icon="≡" label="CLASSEMENT" value={`#${activeStanding?.rank || 1}/${state.standings.length}`} color={ORANGE} onClick={() => setOverlay("standings")} />
        <QuickButton icon="⌁" label="STATS" value={`${activeAccuracy}% précision`} color={GREEN} onClick={() => setOverlay("stats")} />
        <QuickButton icon="↺" label="JOURNAL" value={`${state.visits.length} volée${state.visits.length > 1 ? "s" : ""}`} color={BLUE} onClick={() => setOverlay("timeline")} disabled={!state.visits.length} />
      </section>

      {state.phase === "playing" ? <section style={{ minHeight: 0, overflow: "hidden", display: "flex", justifyContent: "center", alignItems: "stretch", borderRadius: 20, border: "1px solid rgba(255,255,255,.07)", background: "rgba(255,255,255,.018)", padding: 7, boxShadow: "0 12px 32px rgba(0,0,0,.24)" }}>
        {config.scoreInputMethod === "dartboard" ? <div style={{ width: "100%", height: "100%", minHeight: 0, borderRadius: 18, background: "linear-gradient(180deg,rgba(20,20,23,.82),rgba(8,8,11,.93))", padding: 10, display: "grid", gridTemplateRows: "minmax(0,1fr) 56px", gap: 12 }}><div style={{ minHeight: 0, display: "grid", placeItems: "center", overflow: "hidden" }}><DartboardClickable size={Math.min(330, Math.max(220, Math.floor((typeof window !== "undefined" ? window.innerHeight : 803) * .39)))} multiplier={multiplier} disabled={botThinking || throwDarts.length >= 3} onHit={(segment, mult) => addDart(segment, mult)} /></div><div style={{ display: "grid", gridTemplateColumns: "minmax(88px,.8fr) minmax(64px,.44fr) minmax(120px,1fr)", gap: 10 }}><button type="button" onClick={cancelOrUndo} style={{ borderRadius: 16, border: "1px solid rgba(255,180,0,.3)", background: "linear-gradient(180deg,#ffc63a,#ffaf00)", color: "#1a1a1a", fontWeight: 1050, cursor: "pointer", boxShadow: "0 9px 20px rgba(255,170,0,.20)" }}>ANNULER</button><div style={{ display: "grid", placeItems: "center" }}>{centerScore}</div><button type="button" onClick={() => commitVisit()} disabled={!throwDarts.length} style={{ borderRadius: 16, border: throwDarts.length ? "1px solid rgba(255,180,0,.3)" : "1px solid rgba(255,255,255,.06)", color: throwDarts.length ? "#171008" : "rgba(255,255,255,.24)", background: throwDarts.length ? "linear-gradient(180deg,#ffc63a,#ffad00)" : "rgba(255,255,255,.035)", fontWeight: 1100, cursor: throwDarts.length ? "pointer" : "default" }}>VALIDER</button></div></div> : <div style={{ width: "100%", height: "100%", minHeight: 0 }}>
          <CargoAiryKeypad currentThrow={throwDarts as any} multiplier={multiplier} onSimple={() => setMultiplier(1)} onDouble={() => setMultiplier(2)} onTriple={() => setMultiplier(3)} onBackspace={() => { setThrowDarts((prev) => prev.slice(0,-1)); setMultiplier(1); }} onCancel={cancelOrUndo} onNumber={(number: number) => addDart(number)} onBull={() => addDart(25, multiplier === 2 ? 2 : 1)} onValidate={() => commitVisit()} centerSlot={centerScore} noticeSlot={keypadNotice} validateAttention={throwDarts.length === 3} disabled={botThinking} />
        </div>}
      </section> : null}
    </main>

    <style>{`
      @keyframes cargo-toast-in{from{opacity:0;transform:translate(-50%,-12px) scale(.97)}to{opacity:1;transform:translate(-50%,0) scale(1)}}
      @media (max-height:720px){
        .cargo-play-main{grid-template-rows:112px 48px minmax(0,1fr)!important;gap:7px!important}
        .cargo-airy-keypad{grid-template-rows:32px 44px minmax(12px,auto) minmax(132px,1fr) 48px!important;gap:7px!important;padding:9px!important}
      }
      @media (min-height:930px){
        .cargo-play-main{grid-template-rows:140px 62px minmax(0,1fr)!important;gap:11px!important}
        .cargo-airy-keypad{grid-template-rows:46px 56px minmax(18px,auto) minmax(250px,1fr) 62px!important;gap:13px!important;padding:14px!important}
      }
    `}</style>
    {eventToast ? <EventToast toast={eventToast} onClose={() => setEventToast(null)} /> : null}
    {overlay === "truck" ? <TruckModal state={state} stats={activeStats} activeContract={activeContract} onClose={() => setOverlay(null)} /> : null}
    {overlay === "manifest" ? <ManifestModal state={state} activeStats={activeStats} activeContract={activeContract} onClose={() => setOverlay(null)} /> : null}
    {overlay === "standings" ? <StandingsModal state={state} profilesById={profilesById} onClose={() => setOverlay(null)} /> : null}
    {overlay === "stats" ? <StatsModal state={state} stats={activeStats} profile={activeProfile} onClose={() => setOverlay(null)} /> : null}
    {overlay === "timeline" ? <TimelineModal state={state} profilesById={profilesById} onClose={() => setOverlay(null)} /> : null}
    {showEnd && state.phase === "finished" ? <CargoEnd state={state} profilesById={profilesById} onClose={() => setShowEnd(false)} onReplay={resetMatch} onStats={() => { const focusId = state.players[0]?.id; if (typeof go === "function") go("statsHub", { tab: "stats", mode: "active", initialPlayerId: focusId, playerId: focusId, initialStatsSubTab: "cargo" }); }} onHistory={() => { const record = buildHistoryRecord("finished"); try { void (History as any).upsert(record); } catch {} if (typeof go === "function") go("statsHub", { tab: "history", mode: "cargo", focusMatchId: matchIdRef.current }); }} /> : null}
  </div>;
}

function TruckModal({ state, stats, activeContract, onClose }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const capacity = Math.max(1, Number(state.config.truckCapacity || state.config.targetWeight || 1000));
  const value = parcel ? Number(stats?.parcelsDelivered || 0) : Number(stats?.totalWeight || 0);
  const target = parcel ? Math.max(30, state.config.rounds * 5) : state.config.variant === "exact_load" ? Number(state.config.targetWeight || capacity) : capacity;
  const fill = Math.min(100, value / Math.max(1, target) * 100);
  const activeSeries = stats?.currentSeries;
  return <OverlayShell title={parcel ? "VÉHICULE DE LIVRAISON" : "CAMION & CHARGEMENT"} subtitle={`${Math.round(fill)}% de l’objectif · ${value} ${parcel ? "colis" : "kg"}`} color={ORANGE} onClose={onClose}>
    <div style={{ height: 190, overflow: "hidden", borderRadius: 18, background: "radial-gradient(circle at 76% 12%,rgba(255,155,66,.18),transparent 34%),linear-gradient(180deg,#1b2026,#090c10)", border: "1px solid rgba(255,255,255,.09)", position: "relative" }}>
      <div style={{ position: "absolute", inset: "22px 4px -4px" }}><CargoTruckSvg parcel={parcel} pallets={parcel ? stats?.parcelDeliveries : stats?.pallets} fill={fill} /></div>
      <div style={{ position: "absolute", left: 12, top: 10, color: parcel ? BLUE : ORANGE, fontSize: 9, fontWeight: 1100, letterSpacing: .7 }}>{parcel ? "TOURNÉE EN COURS" : "QUAI DE CHARGEMENT"}</div>
      <div style={{ position: "absolute", right: 12, top: 8, textAlign: "right" }}><div style={{ color: fill > 90 ? RED : GREEN, fontSize: 22, fontWeight: 1200 }}>{value}</div><div style={{ color: SOFT, fontSize: 8 }}>{parcel ? "COLIS" : `KG / ${target}`}</div></div>
    </div>
    <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      <Kpi label={parcel ? "LIVRAISONS" : "PALETTES"} value={parcel ? Number(stats?.parcelDeliveries || 0) : Number(stats?.pallets || 0)} detail={parcel ? `${Number(stats?.parcelBonuses || 0)} colis bonus` : `${Number(stats?.completedContracts || 0)} contrats terminés`} color={GOLD} />
      <Kpi label="REMPLISSAGE" value={`${Math.round(fill)}%`} detail={parcel ? `${target} colis de référence` : `Capacité ${target} kg`} color={fill > 90 ? RED : GREEN} />
      <Kpi label="MEILLEURE CHARGE" value={parcel ? Number(stats?.longestSeries || 0) : `${Number(stats?.bestPalletWeight || 0)} kg`} detail={parcel ? "plus longue série" : "palette record"} color={BLUE} />
      <Kpi label={state.config.variant === "exact_load" ? "CHARGE RESTANTE" : "PERTES / SURCHARGES"} value={state.config.variant === "exact_load" ? `${Math.max(0, target - value)} kg` : parcel ? Number(stats?.failedContracts || 0) : `${Number(stats?.lostWeight || 0)} kg`} detail={state.config.variant === "exact_load" ? `${Number(stats?.perfectLoads || 0)} chargement(s) parfait(s)` : parcel ? "livraisons interrompues" : `${Number(stats?.overloads || 0)} surcharge(s)`} color={state.config.variant === "exact_load" && target - value === 0 ? GOLD : RED} />
    </div>
    {state.config.variant === "long_haul" ? <div style={{ ...panel(`${BLUE}44`), marginTop: 10, padding: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, marginBottom: 8 }}><strong style={{ color: BLUE, fontSize: 9 }}>ITINÉRAIRE LONG HAUL</strong><span style={{ color: SOFT, fontSize: 8 }}>Étape {state.routeStage + 1}/{state.routeStages.length}</span></div><div style={{ display: "grid", gridTemplateColumns: `repeat(${state.routeStages.length},minmax(0,1fr))`, gap: 4 }}>{state.routeStages.map((stage: string, index: number) => <div key={stage} style={{ minWidth: 0, padding: "7px 3px", borderRadius: 10, textAlign: "center", background: index <= state.routeStage ? `${BLUE}14` : "rgba(255,255,255,.025)", border: `1px solid ${index === state.routeStage ? BLUE : index < state.routeStage ? GREEN + "55" : "rgba(255,255,255,.07)"}` }}><div style={{ color: index < state.routeStage ? GREEN : index === state.routeStage ? BLUE : SOFT, fontSize: 12 }}>{index < state.routeStage ? "✓" : index === state.routeStage ? "●" : "○"}</div><div style={{ marginTop: 3, color: index <= state.routeStage ? "#dfe5ed" : SOFT, fontSize: 6.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{stage}</div></div>)}</div></div> : null}
    <div style={{ ...panel(`${ORANGE}44`), marginTop: 10, padding: 11 }}>
      <div style={{ color: ORANGE, fontSize: 9, fontWeight: 1100 }}>CHARGEMENT ACTIF</div>
      <div style={{ marginTop: 5, color: "#fff", fontSize: 15, fontWeight: 1100 }}>{activeContract?.label || (activeSeries ? activeSeries.labels?.[0] : null) || "Aucun chargement en cours"}</div>
      <div style={{ marginTop: 4, color: SOFT, fontSize: 9 }}>{activeSeries ? `Progression ${activeSeries.count}/${activeContract?.targetCount || (parcel ? 5 : state.config.maxSeries)} · ${activeSeries.rawWeight || 0}${parcel ? " colis en série" : " kg provisoires"}` : "Sélectionne un contrat dans le manifeste puis commence la série correspondante."}</div>
    </div>
  </OverlayShell>;
}

function ManifestModal({ state, activeStats, activeContract, onClose }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const activeSeries = activeStats?.currentSeries;
  if (parcel) {
    const bonuses = state.config.parcelBonuses || { 1: 0, 2: 1, 3: 2, 4: 4, 5: 7 };
    return <OverlayShell title="TOURNÉE DE LIVRAISON" subtitle={activeSeries ? `Adresse ${activeSeries.number} · série ${activeSeries.count}/5` : "Aucune adresse en cours"} color={BLUE} onClose={onClose}>
      <div style={{ ...panel(`${BLUE}44`), padding: 12, marginBottom: 10 }}><div style={{ color: BLUE, fontSize: 10, fontWeight: 1100 }}>LIVRAISON ACTIVE</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}><div><div style={{ color: "#fff", fontSize: 18, fontWeight: 1100 }}>{activeSeries ? `Adresse ${activeSeries.number}` : "Choisis une adresse"}</div><div style={{ color: SOFT, fontSize: 9, marginTop: 3 }}>{activeSeries ? `${activeSeries.count} colis dans la série` : "Le premier numéro touché ouvre une livraison."}</div></div><div style={{ color: GREEN, fontSize: 28, fontWeight: 1200 }}>{activeSeries?.count || 0}<span style={{ fontSize: 11, opacity: .6 }}>/5</span></div></div></div>
      <div style={{ color: GOLD, fontSize: 9.5, fontWeight: 1100, letterSpacing: .7, marginBottom: 7 }}>PALIERS DE BONUS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5,minmax(0,1fr))", gap: 6 }}>{[1,2,3,4,5].map((count) => { const total = count + Number(bonuses[count] || 0); const reached = Number(activeSeries?.count || 0) >= count; return <div key={count} style={{ padding: "9px 3px", borderRadius: 13, textAlign: "center", background: reached ? `${GREEN}16` : "rgba(255,255,255,.025)", border: `1px solid ${reached ? GREEN : "rgba(255,255,255,.08)"}` }}><div style={{ color: SOFT, fontSize: 7 }}>{count} TOUCHE{count > 1 ? "S" : ""}</div><div style={{ marginTop: 4, color: reached ? GREEN : "#fff", fontSize: 18, fontWeight: 1100 }}>{total}</div><div style={{ color: GOLD, fontSize: 7 }}>+{Number(bonuses[count] || 0)} bonus</div></div>; })}</div>
      <div style={{ ...panel(), marginTop: 10, padding: 11, color: SOFT, fontSize: 9, lineHeight: 1.5 }}>Une série est limitée à cinq touches. À cinq, la livraison est automatiquement validée. Une sixième touche sur le même numéro commence une nouvelle livraison.</div>
    </OverlayShell>;
  }
  return <OverlayShell title="MANIFESTE DE CHARGEMENT" subtitle={`${state.contracts.length} contrat${state.contracts.length > 1 ? "s" : ""} disponible${state.contracts.length > 1 ? "s" : ""}`} color={GOLD} onClose={onClose}>
    {activeSeries ? <div style={{ ...panel(`${ORANGE}55`), padding: 11, marginBottom: 10 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}><div><div style={{ color: ORANGE, fontSize: 9, fontWeight: 1100 }}>CHARGEMENT EN COURS</div><div style={{ marginTop: 4, color: "#fff", fontSize: 16, fontWeight: 1100 }}>{activeContract?.label || activeSeries.labels?.[0] || "Série libre"}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8.5 }}>{activeContract ? cargoContractTargetLabel(activeContract) : `${activeSeries.labels?.[0] || "Segment"} · objectif ${state.config.maxSeries}`}</div></div><div style={{ textAlign: "right" }}><div style={{ color: GREEN, fontSize: 25, fontWeight: 1200 }}>{activeSeries.count}<span style={{ fontSize: 11, opacity: .6 }}>/{activeContract?.targetCount || state.config.maxSeries}</span></div><div style={{ color: GOLD, fontSize: 8 }}>{activeSeries.rawWeight || 0} kg provisoires</div></div></div></div> : <div style={{ ...panel(), padding: 11, marginBottom: 10, textAlign: "center", color: SOFT, fontSize: 9 }}>Aucun chargement en cours. Touche l’objectif d’un contrat pour démarrer sa série.</div>}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 8 }}>{state.contracts.map((contract) => <ContractCard key={contract.id} contract={contract} active={activeContract?.id === contract.id} progress={activeContract?.id === contract.id ? activeSeries?.count || 0 : 0} detailed />)}</div>
  </OverlayShell>;
}

function StandingsModal({ state, profilesById, onClose }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const teamMode = state.config.participantMode === "teams";
  if (teamMode) {
    return <OverlayShell title="CLASSEMENT DES ÉQUIPES" subtitle={`${cargoVariantLabel(state.config.variant)} · Tour ${Math.min(state.roundIndex, state.config.rounds)}/${state.config.rounds}`} color={ORANGE} onClose={onClose}>
      <div style={{ display: "grid", gap: 8 }}>{(state.teamStandings || []).map((team: any, index: number) => {
        const color = PLAYER_COLORS[index % PLAYER_COLORS.length] || ORANGE;
        const activeId = String(state.players[state.activePlayerIndex]?.id || "");
        const active = team.playerIds?.includes(activeId);
        const names = (team.playerIds || []).map((id: string) => playerName(profilesById.get(String(id)) || state.players.find((player: any) => String(player.id) === String(id)))).join(" · ");
        return <div key={team.id} style={{ display: "grid", gridTemplateColumns: "38px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 10, borderRadius: 16, background: active ? `${color}10` : "rgba(255,255,255,.025)", border: `1px solid ${team.rank === 1 ? GOLD : active ? color : "rgba(255,255,255,.08)"}66` }}>
          <div style={{ width: 34, height: 34, borderRadius: 11, display: "grid", placeItems: "center", background: `${color}11`, border: `1px solid ${color}44`, color: team.rank === 1 ? GOLD : color, fontSize: 15, fontWeight: 1100 }}>#{team.rank}</div>
          <div style={{ minWidth: 0 }}><div style={{ color: team.rank === 1 ? GOLD : color, fontSize: 11, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{team.name}{active ? " · EN JEU" : ""}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{names}</div><div style={{ marginTop: 3, color: "#8c94a4", fontSize: 7.5 }}>{team.completedContracts || 0} contrats · {team.pallets || 0} palettes · {team.accuracy || 0}% précision</div></div>
          <div style={{ textAlign: "right" }}><div style={{ color: parcel ? BLUE : ORANGE, fontSize: 22, fontWeight: 1150 }}>{team.score || 0}</div><div style={{ color: SOFT, fontSize: 7 }}>{parcel ? "COLIS" : "KG"}</div></div>
        </div>;
      })}</div>
    </OverlayShell>;
  }
  return <OverlayShell title="CLASSEMENT CARGO" subtitle={`${cargoVariantLabel(state.config.variant)} · Tour ${Math.min(state.roundIndex, state.config.rounds)}/${state.config.rounds}`} color={ORANGE} onClose={onClose}>
    <div style={{ display: "grid", gap: 8 }}>{state.standings.map((standing: any) => { const profile = profilesById.get(String(standing.id)) || standing; const color = PLAYER_COLORS[state.players.findIndex((player) => player.id === standing.id) % PLAYER_COLORS.length] || ORANGE; const active = state.players[state.activePlayerIndex]?.id === standing.id; return <div key={standing.id} style={{ display: "grid", gridTemplateColumns: "38px 44px minmax(0,1fr) auto", gap: 8, alignItems: "center", padding: 9, borderRadius: 15, background: active ? `${color}10` : "rgba(255,255,255,.025)", border: `1px solid ${standing.rank === 1 ? GOLD : active ? color : "rgba(255,255,255,.08)"}66` }}><div style={{ color: standing.rank === 1 ? GOLD : "#fff", fontSize: 18, fontWeight: 1100, textAlign: "center" }}>#{standing.rank}</div><ProfileAvatar profile={profile} size={40} /><div style={{ minWidth: 0 }}><div style={{ color: active ? color : "#fff", fontSize: 10.5, fontWeight: 1100, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{playerName(profile)}{standing.rank === 1 ? " · LEADER" : ""}</div><div style={{ marginTop: 3, color: SOFT, fontSize: 8 }}>{standing.pallets || 0} palettes · {standing.completedContracts || 0} contrats · série {standing.longestSeries || 0}</div></div><div style={{ textAlign: "right" }}><div style={{ color: parcel ? BLUE : ORANGE, fontSize: 20, fontWeight: 1100 }}>{standing.score || 0}</div><div style={{ color: SOFT, fontSize: 7 }}>{parcel ? "COLIS" : "KG"}</div></div></div>; })}</div>
  </OverlayShell>;
}

function StatsModal({ state, stats, profile, onClose }: any) {
  const parcel = state.config.variant === "parcel_delivery";
  const attempts = Number(stats?.completedContracts || 0) + Number(stats?.failedContracts || 0);
  const adv = buildCargoPlayerAdvancedStats(state, String(profile?.id || ""));
  return <OverlayShell title={`STATS · ${playerName(profile).toUpperCase()}`} subtitle={`${cargoVariantLabel(state.config.variant)} · télémétrie live`} color={GREEN} onClose={onClose}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>
      <Kpi label={parcel ? "COLIS LIVRÉS" : "POIDS TRANSPORTÉ"} value={parcel ? stats?.parcelsDelivered || 0 : `${stats?.totalWeight || 0} kg`} color={parcel ? BLUE : ORANGE} />
      <Kpi label={parcel ? "LIVRAISONS" : "PALETTES"} value={parcel ? stats?.parcelDeliveries || 0 : stats?.pallets || 0} color={GOLD} />
      <Kpi label="PRÉCISION" value={`${adv.accuracy}%`} detail={`${stats?.hits || 0}/${stats?.darts || 0} touches`} color={GREEN} />
      <Kpi label="RENDEMENT / DART" value={`${adv.scorePerDart} ${parcel ? "colis" : "kg"}`} detail={`${adv.scorePerVisit} / volée`} color={ORANGE} />
      <Kpi label="MEILLEURE VOLÉE" value={`${adv.bestVisitScore} ${parcel ? "colis" : "kg"}`} detail={`top 3 : ${adv.top3VisitAverage}`} color={GOLD} />
      <Kpi label="MEILLEUR TOUR" value={`${adv.bestRoundScore} ${parcel ? "colis" : "kg"}`} detail={`${adv.consistency}% régularité`} color={BLUE} />
      <Kpi label="SÉRIE DE TOUCHES" value={adv.longestHitStreak} detail={`${adv.longestMissStreak} miss consécutifs max`} color="#d98cff" />
      <Kpi label="VOLÉES PRODUCTIVES" value={`${adv.productiveVisitRate}%`} detail={`${adv.productiveVisits}/${stats?.visits || 0}`} color={GREEN} />
      {!parcel ? <><Kpi label="CONTRATS RÉUSSIS" value={stats?.completedContracts || 0} detail={attempts ? `${adv.contractCompletionRate}% de réussite` : "Aucun contrat clos"} color={GREEN} /><Kpi label="MEILLEURE PALETTE" value={`${stats?.bestPalletWeight || 0} kg`} color={GOLD} /><Kpi label="CHARGE CONSERVÉE" value={`${adv.retentionRate}%`} detail={`${stats?.lostWeight || 0} kg perdus · ${stats?.rejectedWeight || 0} rejetés`} color={BLUE} /><Kpi label="CHARGEMENTS PARFAITS" value={stats?.perfectLoads || 0} detail={`${stats?.overloads || 0} surcharges`} color={ORANGE} /></> : <><Kpi label="BONUS COLIS" value={stats?.parcelBonuses || 0} color={GOLD} /><Kpi label="SÉRIES DE 5" value={Number(stats?.parcelSeries?.[5] || 0)} color={GREEN} /><Kpi label="VOLÉES SANS MISS" value={`${adv.noMissVisitRate}%`} detail={`${adv.noMissVisits} volées`} color={GREEN} /><Kpi label="COUVERTURE NUMÉROS" value={`${adv.uniqueNumbersHit}/20`} color={BLUE} /></>}
    </div>
    <div style={{ ...panel(), marginTop: 10, padding: 11 }}>
      <div style={{ color: GOLD, fontSize: 9.5, fontWeight: 1100, marginBottom: 9 }}>RÉPARTITION DES IMPACTS</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 7 }}>{[["SIMPLE", stats?.singles || 0, ORANGE],["DOUBLE", stats?.doubles || 0, BLUE],["TRIPLE", stats?.triples || 0, "#d98cff"],["BULL", stats?.bulls || 0, GREEN],["DBULL", stats?.dbulls || 0, GOLD],["MISS", stats?.misses || 0, RED]].map(([label,value,color]: any) => <div key={label} style={{ padding: 9, borderRadius: 12, textAlign: "center", background: "rgba(255,255,255,.025)", border: "1px solid rgba(255,255,255,.07)" }}><div style={{ color: SOFT, fontSize: 7 }}>{label}</div><div style={{ marginTop: 3, color, fontSize: 18, fontWeight: 1100 }}>{value}</div></div>)}</div>
    </div>
    <div style={{ ...panel(), marginTop: 10, padding: 11 }}>
      <div style={{ color: BLUE, fontSize: 9.5, fontWeight: 1100, marginBottom: 9 }}>TÉLÉMÉTRIE AVANCÉE</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 6 }}>
        {[["1re flèche", `${adv.firstDartAccuracy}%`],["Dernière flèche", `${adv.lastDartAccuracy}%`],["Power darts", `${adv.powerDartRate}%`],["Bull rate", `${adv.bullRate}%`],["Volées parfaites", adv.perfectAccuracyVisits],["Segments uniques", adv.uniqueSegmentsHit],["Séries démarrées", adv.seriesStarts],["Séries perdues", adv.seriesLostEvents]].map(([label,value]: any) => <div key={label} style={{ padding: "7px 8px", borderRadius: 11, background: "rgba(0,0,0,.24)", border: "1px solid rgba(255,255,255,.06)", display: "flex", justifyContent: "space-between", gap: 8 }}><span style={{ color: SOFT, fontSize: 7.5 }}>{label}</span><strong style={{ color: "#fff", fontSize: 8.5 }}>{value}</strong></div>)}
      </div>
    </div>
  </OverlayShell>;
}

function TimelineModal({ state, profilesById, onClose }: any) {
  return <OverlayShell title="JOURNAL DES CHARGEMENTS" subtitle={`${state.visits.length} volée${state.visits.length > 1 ? "s" : ""}`} color={BLUE} onClose={onClose}>
    <div style={{ display: "grid", gap: 7 }}>{[...state.visits].reverse().map((visit) => <div key={visit.id} style={{ padding: 10, borderRadius: 14, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.08)" }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><strong style={{ fontSize: 9.5 }}>{playerName(profilesById.get(String(visit.playerId)))} · T{visit.round} · V{visit.visit}</strong><strong style={{ color: ORANGE }}>{visit.labels.join(" / ")}</strong></div><div style={{ marginTop: 5, color: "#cfd5df", fontSize: 8.3, lineHeight: 1.4 }}>{visit.events.map((event) => event.label).join(" · ") || "Aucun chargement"}</div></div>)}</div>
  </OverlayShell>;
}
