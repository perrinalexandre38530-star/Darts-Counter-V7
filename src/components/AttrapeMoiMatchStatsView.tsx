// @ts-nocheck
import React from "react";
import ProfileAvatar from "./ProfileAvatar";
import tickerAttrapeMoi from "../assets/tickers/ticker_attrape_moi.png";
import victoryImg from "../assets/victory.webp";
import { saveConfiguredBackupNow } from "../lib/configuredBackupNow";

const C = {
  runner: "#ff5d9e",
  chaser: "#42d6ff",
  gold: "#ffd76a",
  red: "#ff667e",
  green: "#65efb4",
  violet: "#c967ff",
  text: "#f8fafc",
  soft: "rgba(226,232,240,.68)",
};

type TabId = "resume" | "camps" | "players" | "roles" | "legs" | "impacts";
type RoleId = "runner" | "chaser";

type Props = {
  record: any;
  primary?: string;
  modal?: boolean;
  historyMode?: boolean;
  onClose?: () => void;
  onReplay?: () => void;
  onHistory?: () => void;
};

const panel: React.CSSProperties = {
  borderRadius: 18,
  border: "1px solid rgba(255,255,255,.09)",
  background: "linear-gradient(180deg,rgba(255,255,255,.045),rgba(0,0,0,.18))",
  boxShadow: "0 12px 28px rgba(0,0,0,.28)",
};

function n(v: any, f = 0) { const x = Number(v); return Number.isFinite(x) ? x : f; }
function r1(v: any) { return Math.round(n(v) * 10) / 10; }
function same(a: any, b: any) { return String(a ?? "") === String(b ?? ""); }
function arr(...xs: any[]) { for (const x of xs) if (Array.isArray(x)) return x; return []; }
function playerId(p: any) { return String(p?.id ?? p?.playerId ?? p?.profileId ?? ""); }
function fmtDuration(ms: any) { const s = Math.max(0, Math.round(n(ms) / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`; }
function formatLabel(mode: any, target: any, fallback: any) { return mode === "first_to" ? `FT${n(target, 1)}` : `BO${n(target, fallback || 1)}`; }
function finiteMin(values: any[]) { const xs = (values || []).map(n).filter((x: number) => Number.isFinite(x) && x > 0); return xs.length ? Math.min(...xs) : null; }
function pct(part: any, total: any) { return n(total) > 0 ? r1(n(part) / n(total) * 100) : 0; }

function Icon({ kind, size = 20 }: { kind: TabId | string; size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (kind === "resume") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M4 19V11M10 19V5M16 19v-9M22 19V8" /></svg>;
  if (kind === "camps") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="8" cy="8" r="3" /><circle {...p} cx="17" cy="9" r="2.5" /><path {...p} d="M2.8 20a5.5 5.5 0 0 1 10.4 0M13 20a4.5 4.5 0 0 1 8 0" /></svg>;
  if (kind === "players") return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="8" r="3.5" /><path {...p} d="M4.5 21a7.5 7.5 0 0 1 15 0" /></svg>;
  if (kind === "roles") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M7 7h11l-3-3M17 17H6l3 3" /><circle {...p} cx="6" cy="7" r="2" /><circle {...p} cx="18" cy="17" r="2" /></svg>;
  if (kind === "legs") return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 6h14M5 12h14M5 18h14" /><circle cx="5" cy="6" r="1" fill="currentColor" /><circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="5" cy="18" r="1" fill="currentColor" /></svg>;
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="7" /><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M12 2v3M22 12h-3M12 22v-3M2 12h3" /></svg>;
}

function SaveIcon({ size = 19 }: { size?: number }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  return <svg width={size} height={size} viewBox="0 0 24 24"><path {...p} d="M5 3h12l2 2v16H5z" /><path {...p} d="M8 3v6h8V3M8 21v-7h8v7" /></svg>;
}

function RoleIcon({ role, size = 21, color }: { role: RoleId; size?: number; color?: string }) {
  const p = { fill: "none", stroke: color || "currentColor", strokeWidth: 1.9, strokeLinecap: "round", strokeLinejoin: "round" } as const;
  if (role === "runner") {
    return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="15.5" cy="4.7" r="1.7" /><path {...p} d="m10 10 3-2 3 1.2M12.8 8.5 11 13l-3.5 2.6M11.2 12.6l4 3.1 1.6 3.6M13.6 11.2l3.8 2M8.6 19l3.6-3.4" /></svg>;
  }
  return <svg width={size} height={size} viewBox="0 0 24 24"><circle {...p} cx="12" cy="12" r="7" /><circle {...p} cx="12" cy="12" r="3" /><path {...p} d="M12 2v3M22 12h-3M12 22v-3M2 12h3M15 9l5-5M20 4h-4v4" /></svg>;
}

function TabButton({ id, active, label, onClick, color }: { id: TabId; active: boolean; label: string; onClick: () => void; color: string }) {
  return <button type="button" title={label} aria-label={label} onClick={onClick} style={{ height: 38, minWidth: 38, padding: active ? "0 12px 0 9px" : "0 9px", borderRadius: 999, border: `1px solid ${active ? color : "rgba(255,255,255,.12)"}`, background: active ? `${color}16` : "rgba(255,255,255,.035)", color: active ? color : "rgba(255,255,255,.62)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, flex: "0 0 auto", cursor: "pointer" }}><Icon kind={id} size={18} />{active ? <span style={{ fontSize: 9, fontWeight: 1000, letterSpacing: .45 }}>{label}</span> : null}</button>;
}

function Kpi({ label, value, sub, color = C.gold, compact = false }: any) {
  return <div style={{ minWidth: 0, padding: compact ? "7px 6px" : "9px 7px", borderRadius: 13, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.055)", textAlign: "center" }}><div style={{ fontSize: compact ? 7.3 : 8, color: "rgba(255,255,255,.48)", fontWeight: 1000, letterSpacing: .25 }}>{label}</div><div style={{ marginTop: 2, color, fontSize: compact ? 16 : 20, lineHeight: 1, fontWeight: 1100 }}>{value}</div>{sub ? <div style={{ marginTop: 3, fontSize: compact ? 7.4 : 8.2, color: "rgba(255,255,255,.48)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{sub}</div> : null}</div>;
}

function MetricBar({ label, left, right, leftColor = C.runner, rightColor = C.chaser, leftLabel = "FUYARD", rightLabel = "CHASSEUR" }: any) {
  const l = Math.max(0, n(left)), rr = Math.max(0, n(right)), mx = Math.max(l, rr, 1);
  return <div style={{ padding: "7px 8px", borderRadius: 12, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.065)" }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 6, alignItems: "center", fontSize: 8, color: C.soft, fontWeight: 950 }}><span>{leftLabel} {r1(l)}</span><b style={{ color: "rgba(255,255,255,.78)" }}>{label}</b><span style={{ textAlign: "right" }}>{rightLabel} {r1(rr)}</span></div><div style={{ marginTop: 5, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 3, height: 8 }}><div style={{ display: "flex", justifyContent: "flex-end", background: "rgba(255,255,255,.035)", borderRadius: "999px 0 0 999px", overflow: "hidden" }}><div style={{ width: `${l / mx * 100}%`, background: leftColor }} /></div><div style={{ background: "rgba(255,255,255,.035)", borderRadius: "0 999px 999px 0", overflow: "hidden" }}><div style={{ width: `${rr / mx * 100}%`, height: "100%", background: rightColor }} /></div></div></div>;
}

function WinnerAvatar({ profile, winner, side = "right", size = 40 }: any) {
  return <div style={{ position: "relative", width: size, height: size, flex: "0 0 auto" }}><ProfileAvatar profile={profile} size={size} />{winner ? <img src={victoryImg} alt="Victoire" style={{ position: "absolute", width: Math.round(size * .56), height: Math.round(size * .56), objectFit: "contain", bottom: -4, [side === "left" ? "left" : "right"]: -5, filter: "drop-shadow(0 0 8px rgba(255,207,87,.75))", zIndex: 3 }} /> : null}</div>;
}

function CompareMetric({ label, left, right, fmt = (v: any) => String(v), high = true }: any) {
  const lv = n(left), rv = n(right);
  const best = lv === rv ? "tie" : high ? (lv > rv ? "left" : "right") : (lv < rv ? "left" : "right");
  const cell = (side: "left" | "right", v: any) => {
    const isBest = best === side;
    const color = isBest ? C.gold : "#f6f7fb";
    const neon = side === "left" ? C.runner : C.chaser;
    const gradient = side === "left"
      ? `linear-gradient(90deg,${isBest ? C.gold : neon} 0%,${neon} 54%,transparent 100%)`
      : `linear-gradient(90deg,transparent 0%,${neon} 46%,${isBest ? C.gold : neon} 100%)`;
    return <div style={{ position: "relative", minWidth: 0, padding: side === "left" ? "7px 12px 8px 2px" : "7px 2px 8px 12px", textAlign: side === "left" ? "left" : "right", fontWeight: 1100, fontSize: 14, color, textShadow: isBest ? "0 0 12px rgba(255,215,106,.38)" : "none" }}>{fmt(v)}<span style={{ position: "absolute", left: 0, right: 0, bottom: 1, height: 2, borderRadius: 999, background: gradient, opacity: isBest ? 1 : .56, boxShadow: `0 0 ${isBest ? 12 : 8}px ${neon}` }} /></div>;
  };
  return <div style={{ display: "grid", gridTemplateColumns: "1fr minmax(82px,110px) 1fr", alignItems: "center", gap: 3, borderTop: "1px solid rgba(255,255,255,.055)" }}>{cell("left", left)}<div style={{ textAlign: "center", color: C.soft, fontSize: 8.1, fontWeight: 1000, letterSpacing: .3 }}>{label}</div>{cell("right", right)}</div>;
}

function ParticipantHeader({ left, right, winnerId }: any) {
  return <div style={{ display: "grid", gridTemplateColumns: "1fr 80px 1fr", gap: 7, alignItems: "center", padding: 9, background: "rgba(255,255,255,.025)" }}><div style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}><WinnerAvatar profile={left} winner={left?.winner || same(left?.entityId, winnerId)} side="left" size={39} /><b style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{left?.name || "Joueur 1"}</b></div><div style={{ textAlign: "center", color: C.soft, fontSize: 7.8, fontWeight: 1000 }}>COMPARATIF</div><div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 7, minWidth: 0 }}><b style={{ fontSize: 11.5, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>{right?.name || "Joueur 2"}</b><WinnerAvatar profile={right} winner={right?.winner || same(right?.entityId, winnerId)} side="right" size={39} /></div></div>;
}

function CampNav({ entities, players, active, onChange, winnerId }: any) {
  const profileFor = (e: any) => players.find((p: any) => same(p?.entityId, e?.id) || arr(e?.playerIds).some((id: any) => same(id, playerId(p)))) || e;
  const items = [{ id: "duel", label: "DUEL", duel: true }, ...entities.map((e: any) => ({ id: String(e?.id), label: e?.name || "Camp", entity: e }))];
  return <div className="dc-scroll-thin" style={{ display: "flex", alignItems: "stretch", overflowX: "auto", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.025),transparent)", marginBottom: 8 }}>{items.map((it: any, idx: number) => {
    const selected = same(active, it.id);
    const color = it.duel ? C.gold : same(it.id, winnerId) ? C.gold : idx % 2 ? C.runner : C.chaser;
    const p = it.entity ? profileFor(it.entity) : null;
    return <button key={it.id} type="button" onClick={() => onChange(it.id)} title={it.label} style={{ position: "relative", minHeight: 44, minWidth: selected ? 108 : 54, padding: "5px 12px", border: "none", borderRight: idx < items.length - 1 ? "1px solid rgba(255,255,255,.09)" : "none", background: "transparent", color: selected ? color : "rgba(255,255,255,.58)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 7, cursor: "pointer", flex: "0 0 auto" }}>{it.duel ? <Icon kind="camps" size={19} /> : <WinnerAvatar profile={p} winner={same(it.id, winnerId)} size={30} side={idx === 1 ? "left" : "right"} />}{selected ? <span style={{ fontSize: 9, fontWeight: 1100, whiteSpace: "nowrap" }}>{it.label}</span> : null}<span style={{ position: "absolute", left: "18%", right: "18%", bottom: 0, height: 2, borderRadius: 999, background: selected ? `linear-gradient(90deg,transparent,${color},transparent)` : "transparent", boxShadow: selected ? `0 0 10px ${color}` : "none" }} /></button>;
  })}</div>;
}

function RoleTabs({ active, onChange }: { active: RoleId; onChange: (r: RoleId) => void }) {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 0, borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)", marginBottom: 8 }}>{(["runner", "chaser"] as RoleId[]).map((role, idx) => {
    const selected = active === role;
    const color = role === "runner" ? C.runner : C.chaser;
    const label = role === "runner" ? "FUYARD" : "CHASSEUR";
    return <button key={role} type="button" onClick={() => onChange(role)} style={{ position: "relative", minHeight: 44, border: "none", borderRight: idx === 0 ? "1px solid rgba(255,255,255,.09)" : "none", background: "transparent", color: selected ? color : "rgba(255,255,255,.58)", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}><RoleIcon role={role} size={21} color={color} />{selected ? <span style={{ fontSize: 9, fontWeight: 1100 }}>{label}</span> : null}<span style={{ position: "absolute", left: "24%", right: "24%", bottom: 0, height: 2, borderRadius: 999, background: selected ? `linear-gradient(90deg,transparent,${color},transparent)` : "transparent", boxShadow: selected ? `0 0 11px ${color}` : "none" }} /></button>;
  })}</div>;
}

function RoleBestStrip({ role, players }: { role: RoleId; players: any[] }) {
  const color = role === "runner" ? C.runner : C.chaser;
  const label = role === "runner" ? "FUYARD" : "CHASSEUR";
  const avgKey = role === "runner" ? "runnerAvg3" : "chaserAvg3";
  const dartsKey = role === "runner" ? "runnerDarts" : "chaserDarts";
  const pointsKey = role === "runner" ? "runnerPoints" : "chaserPoints";
  const bestKey = role === "runner" ? "runnerBestVisit" : "chaserBestVisit";
  const winKey = role === "runner" ? "escapeCredits" : "captureCredits";
  const avg = (p: any) => n(p?.[avgKey], n(p?.[dartsKey]) ? n(p?.[pointsKey]) / n(p?.[dartsKey]) * 3 : 0);
  const bestPlayer = (getter: (p: any) => number) => players.reduce((best: any, p: any) => !best || getter(p) > getter(best) ? p : best, null);
  const pAvg = bestPlayer(avg), pBest = bestPlayer((p) => n(p?.[bestKey])), pPts = bestPlayer((p) => n(p?.[pointsKey])), pWins = bestPlayer((p) => n(p?.[winKey]));
  const items = [
    ["AVG/3", pAvg ? r1(avg(pAvg)) : "—", pAvg?.name],
    ["BEST", pBest ? n(pBest?.[bestKey]) : "—", pBest?.name],
    ["POINTS", pPts ? n(pPts?.[pointsKey]) : "—", pPts?.name],
    [role === "runner" ? "ÉVASIONS" : "CAPTURES", pWins ? n(pWins?.[winKey]) : "—", pWins?.name],
  ];
  return <div style={{ ...panel, padding: 9, borderColor: `${color}42`, background: `linear-gradient(180deg,${color}0b,rgba(255,255,255,.025))` }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 7, color, fontSize: 9, fontWeight: 1100, letterSpacing: .65 }}><RoleIcon role={role} color={color} size={20} />MEILLEURS {label}</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}>{items.map(([l, v, sub]: any) => <Kpi key={l} compact label={l} value={v} sub={sub || "—"} color={l === "BEST" ? C.gold : color} />)}</div></div>;
}

function EntityProfile({ entity, players }: any) {
  const p = players.find((x: any) => same(x?.entityId, entity?.id) || arr(entity?.playerIds).some((id: any) => same(id, playerId(x))));
  return p || entity || {};
}


function SimpleLineChart({ values, color = C.gold, label }: { values: number[]; color?: string; label: string }) {
  const clean = (values || []).map(n);
  if (!clean.length) return null;
  const w = 520, h = 112, pad = 12, min = Math.min(...clean, 0), max = Math.max(...clean, 1), span = max - min || 1;
  const pts = clean.map((v, i) => ({ x: pad + (clean.length === 1 ? 0 : i / (clean.length - 1) * (w - pad * 2)), y: h - pad - (v - min) / span * (h - pad * 2) }));
  const d = pts.map((q, i) => `${i ? "L" : "M"}${q.x},${q.y}`).join(" ");
  return <div style={{ ...panel, padding: 8 }}><div style={{ fontSize: 8, color: C.soft, fontWeight: 1000, letterSpacing: .5 }}>{label}</div><svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 92, display: "block" }}><line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(255,255,255,.12)" /><path d={d} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{pts.map((q, i) => <circle key={i} cx={q.x} cy={q.y} r="3" fill={color} stroke="#05070c" />)}</svg></div>;
}

function EntityAvatar({ entity, players, size = 38 }: any) {
  const src = entity?.logoDataUrl || entity?.logoUrl || entity?.logo || null;
  if (src) return <img src={src} alt="" style={{ width: size, height: size, borderRadius: "50%", objectFit: "cover", display: "block", border: "1px solid rgba(255,255,255,.18)" }} />;
  const profile = EntityProfile({ entity, players });
  return <ProfileAvatar profile={profile} size={size} />;
}

function DuelChart({ legs, entities, players, primary }: any) {
  if (!legs.length || entities.length < 2) return null;
  const e0 = entities[0], e1 = entities[1];
  const series0 = legs.map((x: any) => same(x?.runnerEntityId, e0?.id) ? n(x?.runnerScore) : same(x?.chaserEntityId, e0?.id) ? n(x?.chaserScore) : 0);
  const series1 = legs.map((x: any) => same(x?.runnerEntityId, e1?.id) ? n(x?.runnerScore) : same(x?.chaserEntityId, e1?.id) ? n(x?.chaserScore) : 0);
  const w = 480, h = 126, pad = 14, max = Math.max(...series0, ...series1, 1);
  const points = (values: number[]) => values.map((v, i) => ({ x: pad + (values.length === 1 ? 0 : i / (values.length - 1) * (w - pad * 2)), y: h - pad - v / max * (h - pad * 2) }));
  const p0 = points(series0), p1 = points(series1);
  const path = (pts: any[]) => pts.map((q, i) => `${i ? "L" : "M"}${q.x},${q.y}`).join(" ");
  const prof0 = EntityProfile({ entity: e0, players }), prof1 = EntityProfile({ entity: e1, players });
  return <div style={{ ...panel, padding: 9 }}><div style={{ fontSize: 8, color: C.soft, fontWeight: 1000, letterSpacing: .5, textAlign: "center" }}>CONFRONTATION — SCORE FINAL PAR MANCHE</div><div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "52px minmax(0,1fr) 52px", gap: 5, alignItems: "center" }}><div style={{ textAlign: "center" }}><EntityAvatar entity={e0} players={players} size={38} /><div style={{ marginTop: 3, color: C.runner, fontSize: 7, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis" }}>{e0?.name}</div></div><svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: 110, display: "block" }}><line x1={pad} y1={h - pad} x2={w - pad} y2={h - pad} stroke="rgba(255,255,255,.12)" /><path d={path(p0)} fill="none" stroke={C.runner} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><path d={path(p1)} fill="none" stroke={C.chaser} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />{p0.map((q, i) => <circle key={`a${i}`} cx={q.x} cy={q.y} r="3" fill={C.runner} stroke="#05070c" />)}{p1.map((q, i) => <circle key={`b${i}`} cx={q.x} cy={q.y} r="3" fill={C.chaser} stroke="#05070c" />)}</svg><div style={{ textAlign: "center" }}><EntityAvatar entity={e1} players={players} size={38} /><div style={{ marginTop: 3, color: C.chaser, fontSize: 7, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis" }}>{e1?.name}</div></div></div></div>;
}

function ImpactComparisonChart({ players }: { players: any[] }) {
  if (players.length < 2) return null;
  const a = players[0], b = players[1];
  const cats = [
    ["S", "singles"], ["D", "doubles"], ["T", "triples"], ["B", "bulls"], ["DB", "dbulls"], ["M", "misses"],
  ];
  const max = Math.max(...cats.flatMap(([, k]) => [n(a?.[k]), n(b?.[k])]), 1);
  return <div style={{ ...panel, padding: 9 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 8, fontWeight: 1000 }}><span style={{ color: C.runner }}>{a?.name || "Joueur 1"}</span><span style={{ color: C.soft }}>IMPACTS PAR JOUEUR</span><span style={{ color: C.chaser }}>{b?.name || "Joueur 2"}</span></div><div style={{ marginTop: 8, display: "grid", gridTemplateColumns: "repeat(6,minmax(0,1fr))", gap: 5 }}>{cats.map(([label, key]) => <div key={key} style={{ minWidth: 0, textAlign: "center" }}><div style={{ height: 88, display: "flex", alignItems: "flex-end", justifyContent: "center", gap: 3 }}><div style={{ width: "38%", height: `${Math.max(3, n(a?.[key]) / max * 100)}%`, borderRadius: "5px 5px 2px 2px", background: `linear-gradient(180deg,${C.gold},${C.runner})`, boxShadow: `0 0 8px ${C.runner}66` }} /><div style={{ width: "38%", height: `${Math.max(3, n(b?.[key]) / max * 100)}%`, borderRadius: "5px 5px 2px 2px", background: `linear-gradient(180deg,${C.gold},${C.chaser})`, boxShadow: `0 0 8px ${C.chaser}66` }} /></div><div style={{ marginTop: 3, color: "#fff", fontSize: 8.5, fontWeight: 1100 }}>{label}</div><div style={{ fontSize: 7, color: C.soft }}>{n(a?.[key])}/{n(b?.[key])}</div></div>)}</div></div>;
}

const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];
function polarPoint(cx: number, cy: number, r: number, deg: number) { const a = (deg - 90) * Math.PI / 180; return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }
function wedgePath(cx: number, cy: number, r1: number, r2: number, a0: number, a1: number) {
  const [x1, y1] = polarPoint(cx, cy, r2, a0), [x2, y2] = polarPoint(cx, cy, r2, a1), [x3, y3] = polarPoint(cx, cy, r1, a1), [x4, y4] = polarPoint(cx, cy, r1, a0);
  return `M${x1},${y1} A${r2},${r2} 0 0 1 ${x2},${y2} L${x3},${y3} A${r1},${r1} 0 0 0 ${x4},${y4} Z`;
}
function TargetHeatmap({ visits, selectedId, selectedMode = "player", color = C.chaser }: any) {
  const counts: Record<number, number> = {}; let bull = 0, dbull = 0, miss = 0;
  for (const v of visits) {
    if (selectedId && !(selectedMode === "entity" ? same(v?.entityId, selectedId) : same(v?.playerId, selectedId))) continue;
    for (const d of arr(v?.darts)) {
      const bed = String(d?.bed || "").toUpperCase();
      if (bed === "MISS") { miss++; continue; }
      if (bed === "OB") { bull++; continue; }
      if (bed === "IB") { dbull++; continue; }
      const num = n(d?.number ?? d?.v ?? d?.segment);
      if (num >= 1 && num <= 20) counts[num] = n(counts[num]) + 1;
    }
  }
  const mx = Math.max(...Object.values(counts).map(n), 1);
  const cx = 110, cy = 110;
  return <div style={{ ...panel, padding: 9 }}><div style={{ fontSize: 9, fontWeight: 1100, color }}>CARTE DES IMPACTS</div><div style={{ display: "grid", gridTemplateColumns: "210px minmax(0,1fr)", gap: 10, alignItems: "center", marginTop: 6 }}><svg viewBox="0 0 220 220" style={{ width: "100%", maxWidth: 220, display: "block" }}><circle cx={cx} cy={cy} r="98" fill="#080b10" stroke="rgba(255,255,255,.14)" />{BOARD_ORDER.map((num, i) => { const a0 = i * 18 - 9, a1 = i * 18 + 9; const hit = n(counts[num]); const op = .08 + hit / mx * .82; const [tx, ty] = polarPoint(cx, cy, 83, i * 18); return <g key={num}><path d={wedgePath(cx, cy, 28, 96, a0, a1)} fill={color} fillOpacity={op} stroke="rgba(255,255,255,.055)" /><text x={tx} y={ty} fill="rgba(255,255,255,.78)" fontSize="7" textAnchor="middle" dominantBaseline="central">{num}</text></g>; })}<circle cx={cx} cy={cy} r="22" fill={C.green} fillOpacity={.18 + Math.min(1, bull / 8) * .55} stroke={C.green} strokeOpacity=".5" /><circle cx={cx} cy={cy} r="10" fill={C.red} fillOpacity={.18 + Math.min(1, dbull / 5) * .75} stroke={C.red} strokeOpacity=".7" /></svg><div style={{ display: "grid", gap: 5 }}><Kpi compact label="BULL" value={bull} color={C.green} /><Kpi compact label="DBULL" value={dbull} color={C.gold} /><Kpi compact label="MISS" value={miss} color={C.red} /><Kpi compact label="SECTEUR +" value={Object.entries(counts).sort((a, b) => n(b[1]) - n(a[1]))[0]?.[0] || "—"} color={color} /></div></div></div>;
}

function PlayerImpactTable({ players }: { players: any[] }) {
  return <div style={{ ...panel, overflowX: "auto" }}><table style={{ width: "100%", minWidth: 650, borderCollapse: "collapse", fontSize: 8.6 }}><thead><tr style={{ background: "rgba(255,255,255,.04)", color: C.soft }}>{["JOUEUR", "DARTS", "VOLÉES", "S", "D", "T", "BULL", "DB", "MISS", "PRÉC.", "AVG/3", "BEST"].map((h) => <th key={h} style={{ padding: "7px 6px", textAlign: h === "JOUEUR" ? "left" : "center" }}>{h}</th>)}</tr></thead><tbody>{players.map((p: any, i: number) => { const darts = n(p?.darts), accuracy = darts ? r1((darts - n(p?.misses)) / darts * 100) : 0; return <tr key={playerId(p) || i} style={{ borderTop: "1px solid rgba(255,255,255,.06)" }}><td style={{ padding: 7, fontWeight: 1000 }}>{p?.name || `Joueur ${i + 1}`}</td>{[darts, n(p?.visits), n(p?.singles), n(p?.doubles), n(p?.triples), n(p?.bulls), n(p?.dbulls), n(p?.misses), `${accuracy}%`, r1(n(p?.avg3, darts ? n(p?.points) / darts * 3 : 0)), n(p?.bestVisit)].map((v, j) => <td key={j} style={{ padding: 7, textAlign: "center", color: j === 8 ? C.green : j === 9 ? C.chaser : j === 10 ? C.gold : "#fff", fontWeight: 950 }}>{v}</td>)}</tr>; })}</tbody></table></div>;
}

export default function AttrapeMoiMatchStatsView({ record, primary = C.chaser, modal = false, historyMode = false, onClose, onReplay, onHistory }: Props) {
  const [tab, setTab] = React.useState<TabId>("resume");
  const [roleTab, setRoleTab] = React.useState<RoleId>("runner");
  const [saveState, setSaveState] = React.useState<"idle" | "saving" | "ok" | "error">("idle");
  const [saveMessage, setSaveMessage] = React.useState("");

  const summary = record?.summary || record?.payload?.summary || {};
  const matchStats = summary?.matchStats || record?.payload?.stats?.match || record?.payload?.stats?.global || {};
  const players = arr(record?.payload?.stats?.players, record?.payload?.players, summary?.players, summary?.perPlayer, record?.players);
  const entities = arr(summary?.entities, summary?.standings, record?.payload?.stats?.entities, record?.payload?.teams, record?.teams);
  const legs = arr(summary?.legResults, record?.payload?.legResults);
  const visits = arr(record?.payload?.visits, record?.payload?.visitHistory);
  const winnerId = String(record?.winnerId || summary?.winnerId || record?.payload?.winnerId || "");
  const winnerEntity = entities.find((e: any) => same(e?.id, winnerId)) || null;
  const winnerPlayer = players.find((p: any) => p?.winner || p?.win || same(p?.entityId, winnerId)) || EntityProfile({ entity: winnerEntity, players });
  const winnerName = winnerEntity?.name || winnerPlayer?.name || summary?.winnerName || "—";
  const participantMode = summary?.participantMode || record?.payload?.config?.participantMode || "players";

  const legMode = summary?.legVictoryMode || record?.payload?.config?.legVictoryMode || record?.payload?.rules?.legVictoryMode || "best_of";
  const setMode = summary?.setVictoryMode || record?.payload?.config?.setVictoryMode || record?.payload?.rules?.setVictoryMode || "best_of";
  const legTarget = n(summary?.legVictoryTarget ?? record?.payload?.config?.legVictoryTarget ?? record?.payload?.rules?.legVictoryTarget, summary?.legsBestOf || 3);
  const setTarget = n(summary?.setVictoryTarget ?? record?.payload?.config?.setVictoryTarget ?? record?.payload?.rules?.setVictoryTarget, summary?.setsBestOf || 1);
  const totalDarts = n(matchStats?.totalDarts, players.reduce((a: number, p: any) => a + n(p?.darts ?? p?.dartsThrown), 0));
  const totalPoints = n(matchStats?.totalPoints, players.reduce((a: number, p: any) => a + n(p?.points ?? p?.score), 0));
  const totalVisits = n(matchStats?.totalVisits, players.reduce((a: number, p: any) => a + n(p?.visits), 0));
  const captures = n(matchStats?.totalCaptures, legs.filter((x: any) => x?.reason === "capture").length);
  const escapes = n(matchStats?.totalEscapes, legs.filter((x: any) => x?.reason === "escape").length);
  const duration = n(matchStats?.durationMs, summary?.durationMs || summary?.duration || 0);
  const bestVisit = players.reduce((m: number, p: any) => Math.max(m, n(p?.bestVisit)), 0);
  const impacts = players.reduce((a: any, p: any) => { a.singles += n(p?.singles); a.doubles += n(p?.doubles); a.triples += n(p?.triples); a.bulls += n(p?.bulls); a.dbulls += n(p?.dbulls); a.misses += n(p?.misses); return a; }, { singles: 0, doubles: 0, triples: 0, bulls: 0, dbulls: 0, misses: 0 });
  const visitScores = visits.map((v: any) => n(v?.score));
  const buckets = visitScores.reduce((b: number[], v: number) => { if (v <= 0) b[0]++; else if (v < 40) b[1]++; else if (v < 60) b[2]++; else if (v < 100) b[3]++; else if (v < 140) b[4]++; else if (v < 180) b[5]++; else b[6]++; return b; }, [0, 0, 0, 0, 0, 0, 0]);
  const tabs: Array<[TabId, string, string]> = [["resume", "RÉSUMÉ", primary], ["camps", "CAMPS", C.chaser], ["players", "JOUEURS", C.gold], ["roles", "RÔLES", C.runner], ["legs", "MANCHES", C.chaser], ["impacts", "IMPACTS", C.gold]];
  const entityScore = (e: any) => n(e?.totalPoints ?? e?.points ?? e?.score, n(e?.runnerPoints) + n(e?.chaserPoints));
  const entityPlayers = (e: any) => players.filter((p: any) => same(p?.entityId, e?.id) || arr(e?.playerIds).some((id: any) => same(id, playerId(p))));
  const impactSubjects = participantMode === "teams" ? entities.map((e: any) => {
    const ps = entityPlayers(e);
    const sum = (key: string) => ps.reduce((a: number, p: any) => a + n(p?.[key]), 0);
    const darts = sum("darts"), points = sum("points");
    return {
      id: String(e?.id), entityId: String(e?.id), name: e?.name || "Équipe", logoDataUrl: e?.logoDataUrl || e?.logoUrl || e?.logo || null,
      darts, visits: sum("visits"), singles: sum("singles"), doubles: sum("doubles"), triples: sum("triples"), bulls: sum("bulls"), dbulls: sum("dbulls"), misses: sum("misses"),
      points, avg3: darts ? points / darts * 3 : 0, bestVisit: ps.reduce((m: number, p: any) => Math.max(m, n(p?.bestVisit)), 0),
    };
  }) : players;
  const [campTab, setCampTab] = React.useState<string>("duel");
  const [impactPlayerId, setImpactPlayerId] = React.useState<string>(() => participantMode === "teams" ? String(entities?.[0]?.id || "") : playerId(players[0]));
  React.useEffect(() => { if (campTab !== "duel" && !entities.some((e: any) => same(e?.id, campTab))) setCampTab("duel"); }, [entities.length]);
  React.useEffect(() => { if (!impactSubjects.some((p: any) => same(String(p?.id || playerId(p)), impactPlayerId))) setImpactPlayerId(String(impactSubjects?.[0]?.id || playerId(impactSubjects?.[0]))); }, [impactSubjects.length, participantMode]);

  const orderedEntities = [...entities].sort((a: any, b: any) => same(a?.id, winnerId) ? -1 : same(b?.id, winnerId) ? 1 : 0);
  const scoreLeft = orderedEntities[0] || entities[0] || {};
  const scoreRight = orderedEntities[1] || entities[1] || {};
  const setNos = Array.from(new Set(legs.map((x: any) => n(x?.setNo, 1)))).sort((a, b) => a - b);
  const setScoreRows = setNos.map((setNo) => {
    const rows = legs.filter((x: any) => n(x?.setNo, 1) === setNo);
    const l = rows.filter((x: any) => same(x?.winnerEntityId, scoreLeft?.id)).length;
    const r = rows.filter((x: any) => same(x?.winnerEntityId, scoreRight?.id)).length;
    return { setNo, l, r };
  });
  const totalLegLeft = legs.filter((x: any) => same(x?.winnerEntityId, scoreLeft?.id)).length;
  const totalLegRight = legs.filter((x: any) => same(x?.winnerEntityId, scoreRight?.id)).length;

  async function doConfiguredSave() {
    if (saveState === "saving") return;
    setSaveState("saving"); setSaveMessage("Sauvegarde…");
    try { const mod = await import("../lib/history"); await mod.History.upsert(record); } catch {}
    const result = await saveConfiguredBackupNow(`attrape-moi-end:${record?.id || record?.matchId || "match"}`);
    setSaveState(result.ok ? "ok" : "error");
    setSaveMessage(result.ok ? `${result.destinationLabel} · OK` : result.message);
    window.setTimeout(() => { setSaveState("idle"); setSaveMessage(""); }, result.ok ? 2600 : 5200);
  }

  const shell = <div style={{ ...panel, width: "100%", padding: 10, borderColor: `${primary}66`, background: "linear-gradient(180deg,rgba(10,14,20,.98),rgba(3,6,12,.99))" }}>
    <div style={{ display: "grid", gridTemplateColumns: "36px minmax(0,1fr) auto", gap: 8, alignItems: "center" }}><div /><div style={{ minWidth: 0 }}><img src={tickerAttrapeMoi} alt="ATTRAPE-MOI SI TU PEUX !" style={{ display: "block", width: "100%", maxHeight: 82, objectFit: "cover", borderRadius: 12 }} /><div style={{ marginTop: 5, textAlign: "center", color: primary, fontSize: 9.5, fontWeight: 1100, letterSpacing: 1.2 }}>FIN DE POURSUITE</div></div><div style={{ display: "flex", alignItems: "center", gap: 5 }}>{modal && !historyMode ? <button type="button" onClick={() => void doConfiguredSave()} title="Sauvegarder vers la destination configurée" aria-label="Sauvegarder" disabled={saveState === "saving"} style={{ width: 34, height: 34, borderRadius: 999, border: `1px solid ${saveState === "ok" ? C.green : saveState === "error" ? C.red : primary}77`, background: `${saveState === "ok" ? C.green : saveState === "error" ? C.red : primary}12`, color: saveState === "ok" ? C.green : saveState === "error" ? C.red : primary, display: "grid", placeItems: "center", cursor: saveState === "saving" ? "wait" : "pointer", boxShadow: saveState === "ok" ? `0 0 14px ${C.green}55` : "none" }}>{saveState === "saving" ? <span style={{ fontSize: 14 }}>…</span> : saveState === "ok" ? <span style={{ fontSize: 16 }}>✓</span> : <SaveIcon />}</button> : null}{onClose ? <button type="button" onClick={onClose} style={{ width: 34, height: 34, borderRadius: 999, border: "1px solid rgba(255,255,255,.14)", background: "rgba(255,255,255,.06)", color: "#fff", fontSize: 18, cursor: "pointer" }}>×</button> : null}</div></div>
    {saveMessage ? <div style={{ marginTop: 4, textAlign: "right", color: saveState === "error" ? C.red : saveState === "ok" ? C.green : C.soft, fontSize: 7.6, fontWeight: 900 }}>{saveMessage}</div> : null}
    <div className="dc-scroll-thin" style={{ marginTop: 8, display: "flex", gap: 5, overflowX: "auto", paddingBottom: 4, borderBottom: `3px solid ${primary}` }}>{tabs.map(([id, label, color]) => <TabButton key={id} id={id} label={label} color={color} active={tab === id} onClick={() => setTab(id)} />)}</div>

    {tab === "resume" ? <div style={{ marginTop: 9, display: "grid", gap: 8 }}>
      <div style={{ padding: 11, borderRadius: 16, background: `linear-gradient(180deg,${C.gold}0d,rgba(255,255,255,.025))`, border: `1px solid ${C.gold}55`, textAlign: "center" }}><div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}><WinnerAvatar profile={winnerPlayer} winner size={52} side="right" /><div><div style={{ color: C.gold, fontSize: 8.8, fontWeight: 1100 }}>VAINQUEUR</div><div style={{ marginTop: 1, fontSize: 23, fontWeight: 1100 }}>{winnerName}</div><div style={{ color: primary, fontSize: 10.5, fontWeight: 1000 }}>{formatLabel(legMode, legTarget, summary?.legsBestOf)} · {formatLabel(setMode, setTarget, summary?.setsBestOf)}</div></div></div></div>

      {entities.length >= 2 ? <div style={{ ...panel, padding: 9, textAlign: "center", background: "linear-gradient(90deg,rgba(255,93,158,.035),rgba(255,215,106,.05),rgba(66,214,255,.035))" }}><div style={{ display: "grid", gridTemplateColumns: "1fr auto 1fr", gap: 8, alignItems: "center" }}><div style={{ textAlign: "right", fontSize: 12, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scoreLeft?.name}</div><div style={{ color: C.gold, fontSize: 23, fontWeight: 1100 }}>{n(scoreLeft?.setWins ?? scoreLeft?.setsWon)} <span style={{ opacity: .45 }}>–</span> {n(scoreRight?.setWins ?? scoreRight?.setsWon)}</div><div style={{ textAlign: "left", fontSize: 12, fontWeight: 1100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{scoreRight?.name}</div></div><div style={{ marginTop: 4, display: "grid", justifyContent: "center", gap: 1, color: C.soft, fontSize: 7.4, fontWeight: 900 }}>{setScoreRows.map((s) => <div key={s.setNo}>{s.l} M{s.setNo} {s.r}</div>)}<div style={{ color: "rgba(255,255,255,.72)" }}>{totalLegLeft} TM {totalLegRight}</div></div></div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}><Kpi compact label="ÉVASIONS" value={escapes} color={C.runner} /><Kpi compact label="CAPTURES" value={captures} color={C.chaser} /><Kpi compact label="BEST VISIT" value={bestVisit || "—"} sub={`${totalVisits} volées`} color={C.gold} /><Kpi compact label="DURÉE" value={duration ? fmtDuration(duration) : "—"} sub={`${totalDarts} darts`} color={C.runner} /></div>

      <RoleBestStrip role="runner" players={players} />
      <RoleBestStrip role="chaser" players={players} />

      {historyMode ? <div style={{ ...panel, padding: 10 }}><div style={{ color: primary, fontWeight: 1100, fontSize: 10 }}>HISTORIQUE DE LA PARTIE</div><div style={{ marginTop: 6, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 5 }}><Kpi compact label="DATE" value={new Date(n(record?.createdAt ?? record?.updatedAt, Date.now())).toLocaleDateString("fr-FR")} sub={new Date(n(record?.createdAt ?? record?.updatedAt, Date.now())).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })} color="#fff" /><Kpi compact label="POURSUITE" value={`${n(summary?.headStart ?? record?.payload?.config?.headStart, 100)} pts`} sub={`${n(summary?.pursuitRounds ?? record?.payload?.config?.pursuitRounds, 10)} rounds max`} color={C.runner} /><Kpi compact label="MANCHES" value={formatLabel(legMode, legTarget, summary?.legsBestOf)} sub={`${legs.length} jouées`} color={C.chaser} /><Kpi compact label="SETS" value={formatLabel(setMode, setTarget, summary?.setsBestOf)} sub={`${Math.max(1, ...legs.map((x: any) => n(x?.setNo, 1)))} joué(s)`} color={C.gold} /></div></div> : null}
    </div> : null}

    {tab === "camps" ? <div style={{ marginTop: 9 }}><CampNav entities={entities} players={players} active={campTab} onChange={setCampTab} winnerId={winnerId} />{campTab === "duel" ? <div style={{ display: "grid", gap: 7 }}>{entities.length >= 2 ? <><MetricBar label="SCORE" left={entityScore(entities[0])} right={entityScore(entities[1])} leftLabel={entities[0]?.name} rightLabel={entities[1]?.name} /><MetricBar label="SETS" left={n(entities[0]?.setWins ?? entities[0]?.setsWon)} right={n(entities[1]?.setWins ?? entities[1]?.setsWon)} leftLabel={entities[0]?.name} rightLabel={entities[1]?.name} /><MetricBar label="MANCHES" left={n(entities[0]?.legsWon)} right={n(entities[1]?.legsWon)} leftLabel={entities[0]?.name} rightLabel={entities[1]?.name} /><MetricBar label="CAPTURES" left={n(entities[0]?.captures)} right={n(entities[1]?.captures)} leftLabel={entities[0]?.name} rightLabel={entities[1]?.name} /><MetricBar label="ÉVASIONS" left={n(entities[0]?.escapes)} right={n(entities[1]?.escapes)} leftLabel={entities[0]?.name} rightLabel={entities[1]?.name} /><div style={{ display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 5 }}><Kpi compact label="CAPTURE + RAPIDE" value={finiteMin(entities.map((e: any) => e?.fastestCaptureRound)) ? `R${finiteMin(entities.map((e: any) => e?.fastestCaptureRound))}` : "—"} color={C.chaser} /><Kpi compact label="DISTANCE MAX" value={Math.max(...entities.map((e: any) => n(e?.maxRunnerLead)), 0)} color={C.runner} /><Kpi compact label="ÉVASION MAX" value={Math.max(...entities.map((e: any) => n(e?.bestEscapeLead)), 0)} color={C.runner} /><Kpi compact label="PLUS PROCHE" value={finiteMin(entities.map((e: any) => e?.closestChaseGap)) ?? "—"} color={C.chaser} /></div></> : null}</div> : (() => { const e = entities.find((x: any) => same(x?.id, campTab)) || entities[0] || {}; const ps = entityPlayers(e); const darts = ps.reduce((a: number, p: any) => a + n(p?.darts), 0), pts = ps.reduce((a: number, p: any) => a + n(p?.points), 0), avg = darts ? r1(pts / darts * 3) : 0, best = ps.reduce((m: number, p: any) => Math.max(m, n(p?.bestVisit)), 0); return <div style={{ ...panel, padding: 10, borderColor: same(e?.id, winnerId) ? `${C.gold}66` : `${primary}33` }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}><div><b style={{ fontSize: 16 }}>{e?.name || "Camp"}</b><div style={{ fontSize: 8, color: C.soft }}>PERFORMANCE & RECORDS</div></div><b style={{ color: C.gold, fontSize: 24 }}>{entityScore(e)} pts</b></div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}><Kpi compact label="SETS" value={n(e?.setWins ?? e?.setsWon)} color={C.gold} /><Kpi compact label="MANCHES" value={n(e?.legsWon)} color={primary} /><Kpi compact label="AVG/3" value={avg} color="#fff" /><Kpi compact label="BEST" value={best} color={C.gold} /></div><div style={{ marginTop: 7, display: "grid", gap: 5 }}><MetricBar label="POINTS PAR RÔLE" left={n(e?.runnerPoints)} right={n(e?.chaserPoints)} /><MetricBar label="VICTOIRES PAR RÔLE" left={n(e?.runnerLegWins)} right={n(e?.chaserLegWins)} /></div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(4,minmax(0,1fr))", gap: 4 }}><Kpi compact label="CAPTURE + RAPIDE" value={e?.fastestCaptureRound ? `R${n(e.fastestCaptureRound)}` : "—"} color={C.chaser} /><Kpi compact label="DISTANCE MAX" value={n(e?.maxRunnerLead)} color={C.runner} /><Kpi compact label="ÉVASION MAX" value={n(e?.bestEscapeLead)} color={C.runner} /><Kpi compact label="PLUS PROCHE" value={e?.closestChaseGap ?? "—"} color={C.chaser} /></div></div>; })()}</div> : null}

    {tab === "players" ? <div style={{ marginTop: 9 }}>{players.length >= 2 ? (() => { const a = players[0], b = players[1]; const av = (p: any) => n(p?.avg3, p?.darts ? n(p?.points) / n(p?.darts) * 3 : 0); const rav = (p: any) => n(p?.runnerAvg3, p?.runnerDarts ? n(p?.runnerPoints) / n(p?.runnerDarts) * 3 : 0); const cav = (p: any) => n(p?.chaserAvg3, p?.chaserDarts ? n(p?.chaserPoints) / n(p?.chaserDarts) * 3 : 0); const hit = (p: any) => n(p?.darts) ? r1((n(p?.darts) - n(p?.misses)) / n(p?.darts) * 100) : 0; return <div style={{ ...panel, overflow: "hidden" }}><ParticipantHeader left={a} right={b} winnerId={winnerId} /><CompareMetric label="SCORE" left={n(a?.points)} right={n(b?.points)} /><CompareMetric label="SETS" left={n(a?.setsWon)} right={n(b?.setsWon)} /><CompareMetric label="MANCHES" left={n(a?.legsWon)} right={n(b?.legsWon)} /><CompareMetric label="AVG/3" left={av(a)} right={av(b)} fmt={(v: any) => r1(v)} /><CompareMetric label="BEST VOLÉE" left={n(a?.bestVisit)} right={n(b?.bestVisit)} /><CompareMetric label="AVG FUYARD" left={rav(a)} right={rav(b)} fmt={(v: any) => r1(v)} /><CompareMetric label="AVG CHASSEUR" left={cav(a)} right={cav(b)} fmt={(v: any) => r1(v)} /><CompareMetric label="CAPTURES" left={n(a?.captureCredits)} right={n(b?.captureCredits)} /><CompareMetric label="ÉVASIONS" left={n(a?.escapeCredits)} right={n(b?.escapeCredits)} /><CompareMetric label="PRÉCISION" left={hit(a)} right={hit(b)} fmt={(v: any) => `${r1(v)}%`} /><CompareMetric label="DARTS" left={n(a?.darts)} right={n(b?.darts)} high={false} /></div>; })() : <div style={{ color: C.soft }}>Données joueurs insuffisantes.</div>}</div> : null}

    {tab === "roles" ? <div style={{ marginTop: 9 }}><RoleTabs active={roleTab} onChange={setRoleTab} />{players.length >= 2 ? (() => { const a = players[0], b = players[1]; const role = roleTab; const avg = (p: any) => role === "runner" ? n(p?.runnerAvg3, p?.runnerDarts ? n(p?.runnerPoints) / n(p?.runnerDarts) * 3 : 0) : n(p?.chaserAvg3, p?.chaserDarts ? n(p?.chaserPoints) / n(p?.chaserDarts) * 3 : 0); const best = (p: any) => n(role === "runner" ? p?.runnerBestVisit : p?.chaserBestVisit); const points = (p: any) => n(role === "runner" ? p?.runnerPoints : p?.chaserPoints); const darts = (p: any) => n(role === "runner" ? p?.runnerDarts : p?.chaserDarts); const visitsN = (p: any) => n(role === "runner" ? p?.runnerVisits : p?.chaserVisits); const wins = (p: any) => n(role === "runner" ? p?.escapeCredits : p?.captureCredits); const color = role === "runner" ? C.runner : C.chaser; return <div style={{ ...panel, overflow: "hidden", borderColor: `${color}45` }}><ParticipantHeader left={a} right={b} winnerId={winnerId} /><CompareMetric label="AVG/3" left={avg(a)} right={avg(b)} fmt={(v: any) => r1(v)} /><CompareMetric label="BEST VOLÉE" left={best(a)} right={best(b)} /><CompareMetric label="POINTS" left={points(a)} right={points(b)} /><CompareMetric label="VOLÉES" left={visitsN(a)} right={visitsN(b)} /><CompareMetric label="DARTS" left={darts(a)} right={darts(b)} high={false} /><CompareMetric label={role === "runner" ? "ÉVASIONS" : "CAPTURES"} left={wins(a)} right={wins(b)} /><CompareMetric label="PTS / VOLÉE" left={visitsN(a) ? points(a) / visitsN(a) : 0} right={visitsN(b) ? points(b) / visitsN(b) : 0} fmt={(v: any) => r1(v)} /></div>; })() : null}</div> : null}

    {tab === "legs" ? <div style={{ marginTop: 9, display: "grid", gap: 8 }}><DuelChart legs={legs} entities={entities} players={players} primary={primary} /><div style={{ ...panel, overflowX: "auto" }}><table style={{ width: "100%", minWidth: 600, borderCollapse: "collapse", fontSize: 8.7 }}><thead><tr style={{ background: "rgba(255,255,255,.04)", color: C.soft }}>{["SET", "LEG", "VAINQUEUR", "ISSUE", "ROUND", "SCORE", "ÉCART"].map((h) => <th key={h} style={{ padding: "7px 6px", textAlign: h === "VAINQUEUR" ? "left" : "center" }}>{h}</th>)}</tr></thead><tbody>{legs.map((x: any, i: number) => <tr key={x?.globalLegNo || i} style={{ borderTop: "1px solid rgba(255,255,255,.06)", background: x?.setWonBy ? `${C.gold}08` : "transparent" }}><td style={{ padding: 7, textAlign: "center", color: C.gold, fontWeight: 1100 }}>{n(x?.setNo, 1)}</td><td style={{ padding: 7, textAlign: "center", color: primary, fontWeight: 1100 }}>{n(x?.legNo, i + 1)}</td><td style={{ padding: 7, fontWeight: 1000 }}>{x?.winnerName || entities.find((e: any) => same(e?.id, x?.winnerEntityId))?.name || "—"}{x?.setWonBy ? " · SET" : ""}</td><td style={{ padding: 7, textAlign: "center", color: x?.reason === "capture" ? C.chaser : C.runner, fontWeight: 1000 }}>{x?.reason === "capture" ? "CAPTURE" : "ÉVASION"}</td><td style={{ padding: 7, textAlign: "center" }}>R{n(x?.pursuitRound)}</td><td style={{ padding: 7, textAlign: "center", fontWeight: 1000 }}>{n(x?.runnerScore)}–{n(x?.chaserScore)}</td><td style={{ padding: 7, textAlign: "center", color: C.gold, fontWeight: 1000 }}>{n(x?.finalDistance) > 0 ? `+${n(x?.finalDistance)}` : n(x?.finalDistance)}</td></tr>)}</tbody></table></div></div> : null}

    {tab === "impacts" ? <div style={{ marginTop: 9, display: "grid", gap: 8 }}><div style={{ display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 5 }}>{[["SIMPLES", impacts.singles, "#fff"], ["DOUBLES", impacts.doubles, C.chaser], ["TRIPLES", impacts.triples, C.violet], ["BULL", impacts.bulls, C.green], ["DBULL", impacts.dbulls, C.gold], ["MISS", impacts.misses, C.red]].map(([l, v, c]: any) => <Kpi key={l} compact label={l} value={v} sub={`${totalDarts ? r1(n(v) / totalDarts * 100) : 0}%`} color={c} />)}</div><ImpactComparisonChart players={impactSubjects} /><div style={{ ...panel, padding: 9 }}><div style={{ fontSize: 9, fontWeight: 1100, color: primary }}>DISTRIBUTION DES VOLÉES</div><div style={{ marginTop: 7, display: "grid", gridTemplateColumns: "repeat(7,minmax(0,1fr))", gap: 4 }}>{[["0", buckets[0]], ["1-39", buckets[1]], ["40-59", buckets[2]], ["60-99", buckets[3]], ["100+", buckets[4]], ["140+", buckets[5]], ["180", buckets[6]]].map(([l, v]: any) => { const mx = Math.max(...buckets, 1); return <div key={l} style={{ textAlign: "center", minWidth: 0 }}><div style={{ height: 70, display: "flex", alignItems: "flex-end", padding: "0 2px" }}><div style={{ width: "100%", height: `${Math.max(4, n(v) / mx * 100)}%`, borderRadius: "7px 7px 2px 2px", background: `linear-gradient(180deg,${C.gold},${primary})` }} /></div><b style={{ fontSize: 9 }}>{v}</b><div style={{ fontSize: 7, color: C.soft }}>{l}</div></div>; })}</div></div><PlayerImpactTable players={impactSubjects} /><div style={{ display: "flex", alignItems: "center", overflowX: "auto", borderTop: "1px solid rgba(255,255,255,.08)", borderBottom: "1px solid rgba(255,255,255,.08)" }}>{impactSubjects.map((p: any, i: number) => { const sid = String(p?.id || playerId(p)); const selected = same(sid, impactPlayerId); const color = i % 2 ? C.chaser : C.runner; return <button key={sid || i} onClick={() => setImpactPlayerId(sid)} style={{ minHeight: 42, minWidth: selected ? 110 : 52, border: "none", borderRight: i < impactSubjects.length - 1 ? "1px solid rgba(255,255,255,.08)" : "none", background: "transparent", color: selected ? color : C.soft, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6 }}>{participantMode === "teams" && p?.logoDataUrl ? <img src={p.logoDataUrl} alt="" style={{ width: 28, height: 28, borderRadius: "50%", objectFit: "cover" }} /> : <ProfileAvatar profile={p} size={28} />}{selected ? <b style={{ fontSize: 8.5 }}>{p?.name}</b> : null}</button>; })}</div><TargetHeatmap visits={visits} selectedId={impactPlayerId} selectedMode={participantMode === "teams" ? "entity" : "player"} color={same(impactPlayerId, String(impactSubjects?.[0]?.id || playerId(impactSubjects?.[0]))) ? C.runner : C.chaser} /><SimpleLineChart values={visitScores.slice(-30)} color={C.gold} label="30 DERNIÈRES VOLÉES" /></div> : null}

    {(onReplay || onHistory) ? <div style={{ marginTop: 10, display: "grid", gridTemplateColumns: "repeat(2,minmax(0,1fr))", gap: 8 }}>{onReplay ? <button onClick={onReplay} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${primary}`, background: `${primary}12`, color: primary, fontWeight: 1100, cursor: "pointer" }}>REJOUER</button> : <div />}{onHistory ? <button onClick={onHistory} style={{ minHeight: 46, borderRadius: 999, border: `1px solid ${C.gold}`, background: `linear-gradient(90deg,${C.runner},${C.chaser})`, color: "#071018", fontWeight: 1100, cursor: "pointer" }}>HISTORIQUE & STATS</button> : null}</div> : null}
  </div>;

  if (!modal) return shell;
  return <div style={{ position: "fixed", inset: 0, zIndex: 10000, background: "rgba(0,0,0,.82)", backdropFilter: "blur(9px)", display: "grid", placeItems: "center", padding: 9 }}><div className="dc-scroll-thin" style={{ width: "min(980px,100%)", maxHeight: "95dvh", overflow: "auto" }}>{shell}</div></div>;
}
