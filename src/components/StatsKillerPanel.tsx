// @ts-nocheck
import * as React from "react";
import type { Store, Profile } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import ProfileAvatar from "./ProfileAvatar";
import { History } from "../lib/history";
import { computeKillerRows, type PeriodKey } from "../lib/killerStats";
import { GoldPill } from "./StatsPlayerDashboard";

function pickActiveProfileId(store: any): string | null {
  return store?.activeProfileId || store?.active?.id || store?.activeProfile?.id || store?.profiles?.find?.((p: any) => p?.isActive)?.id || null;
}
function fmtDate(ts: any) {
  const n = Number(ts);
  if (!Number.isFinite(n) || n <= 0) return "—";
  try { return new Date(n).toLocaleString(); } catch { return "—"; }
}
function fmtFavNumber(v: any) {
  const s = String(v ?? "").toUpperCase().trim();
  if (!s) return "—";
  if (s === "25") return "BULL";
  return /^\d+$/.test(s) ? `#${s}` : s;
}

export default function StatsKillerPanel({ store, profileId }: { store: Store; profileId?: string }) {
  const { theme } = useTheme();
  const profiles: Profile[] = (store as any)?.profiles ?? [];
  const activeId = profileId || pickActiveProfileId(store) || (profiles?.[0]?.id ?? null);
  const [period, setPeriod] = React.useState<PeriodKey>("ALL");
  const [historySource, setHistorySource] = React.useState<any[]>((((store as any)?.history) as any[]) || []);

  React.useEffect(() => { setHistorySource(((((store as any)?.history) as any[]) || []) as any[]); }, [store]);
  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const api: any = History as any;
        const list = typeof api.getAll === "function" ? await api.getAll() : typeof api.list === "function" ? await api.list() : [];
        if (alive && Array.isArray(list) && list.length) setHistorySource(list);
      } catch {}
    })();
    return () => { alive = false; };
  }, []);

  const rows = React.useMemo(() => computeKillerRows(historySource, profiles, period), [historySource, profiles, period]);
  const me = rows.find((r) => r.id === activeId) || null;
  const activeProfile = profiles.find((p) => p.id === activeId) || null;

  const chip = (p: PeriodKey) => {
    const active = p === period;
    return <GoldPill key={p} active={active} onClick={() => setPeriod(p)} style={{ minHeight: 34, padding: "8px 10px", fontSize: 10 }}>{p}</GoldPill>;
  };

  const kpi = (label: string, value: any, sub?: any, color = theme.primary) => (
    <div style={{ borderRadius: 20, border: `1px solid ${theme.borderSoft}`, padding: 14, background: "linear-gradient(180deg, rgba(10,12,24,.96), rgba(7,9,18,.98))", boxShadow: `0 10px 24px rgba(0,0,0,.42), inset 0 0 16px ${color}12` }}>
      <div style={{ fontSize: 10.5, color: theme.textSoft, fontWeight: 1000, textTransform: "uppercase", letterSpacing: .8 }}>{label}</div>
      <div style={{ marginTop: 8, fontSize: 28, lineHeight: 1, fontWeight: 1000, color, textShadow: `0 0 12px ${color}55` }}>{value}</div>
      {sub ? <div style={{ marginTop: 8, fontSize: 11.5, color: theme.textSoft }}>{sub}</div> : null}
    </div>
  );

  return (
    <div style={{ width: "100%", maxWidth: 620, margin: "0 auto", padding: 14, borderRadius: 26, background: "linear-gradient(180deg, rgba(10,12,24,.98), rgba(7,9,18,.98))", border: `1px solid ${theme.borderSoft}`, boxShadow: `0 18px 36px rgba(0,0,0,.7), 0 0 24px ${theme.primary}18` }}>
      <div style={{ textAlign: "center", color: theme.primary, fontSize: 28, fontWeight: 1000, textShadow: `0 0 16px ${theme.primary}66`, marginBottom: 12 }}>KILLER</div>
      <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: 14, marginBottom: 16, alignItems: "center" }}>
        <div style={{ width: 72, height: 72, borderRadius: 24, overflow: "hidden", border: `1px solid ${theme.borderSoft}`, background: "#000", boxShadow: `0 0 18px ${theme.primary}22` }}>
          {activeProfile?.avatarDataUrl || (activeProfile as any)?.avatar ? <img src={(activeProfile as any)?.avatarDataUrl ?? (activeProfile as any)?.avatar} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <ProfileAvatar size={72} dataUrl={null} label={(activeProfile?.name || "—")[0]?.toUpperCase?.() || "?"} showStars={false} />}
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 20, color: theme.text, fontWeight: 1000, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{activeProfile?.name || me?.name || "—"}</div>
          <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>{(["D","W","M","Y","ALL"] as PeriodKey[]).map(chip)}</div>
        </div>
      </div>

      {!me ? <div style={{ padding: 12, textAlign: "center", color: theme.textSoft, fontSize: 12 }}>Aucune partie KILLER trouvée pour ce profil.</div> : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr .9fr", gap: 12, marginBottom: 12 }}>
            <div style={{ borderRadius: 24, padding: 16, border: `1px solid #47B5FF`, background: "linear-gradient(180deg, rgba(15,23,52,.98), rgba(8,10,18,.98))", boxShadow: "0 0 22px rgba(71,181,255,.18)" }}>
              <div style={{ color: "#47B5FF", fontSize: 12, textTransform: "uppercase", letterSpacing: .8, fontWeight: 1000 }}>Win %</div>
              <div style={{ marginTop: 10, fontSize: 38, lineHeight: 1, fontWeight: 1000, color: theme.primary }}>{Number(me.winRate || 0).toFixed(1)}%</div>
              <div style={{ marginTop: 8, color: theme.textSoft, fontSize: 12 }}>{me.wins}/{me.matches} matchs</div>
            </div>
            <div style={{ borderRadius: 24, padding: 16, border: `1px solid #FF6FB5`, background: "linear-gradient(180deg, rgba(41,16,33,.98), rgba(8,10,18,.98))", boxShadow: "0 0 22px rgba(255,111,181,.16)" }}>
              <div style={{ color: "#FF6FB5", fontSize: 12, textTransform: "uppercase", letterSpacing: .8, fontWeight: 1000 }}>Dernier match</div>
              <div style={{ marginTop: 10, fontSize: 22, lineHeight: 1.15, fontWeight: 1000, color: theme.primary }}>{fmtDate(me.lastPlayedAt)}</div>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 12 }}>
            {kpi("Matchs", me.matches, undefined, "#47B5FF")}
            {kpi("Victoires", me.wins, undefined, "#F6C256")}
            {kpi("Kills", me.kills, `moy: ${Number(me.killsAvg || 0).toFixed(2)}`, "#77FF9B")}
            {kpi("Deaths", me.deaths, `moy: ${Number(me.deathsAvg || 0).toFixed(2)}`, "#FF8F8F")}
            {kpi("Darts", me.darts, `moy: ${Number(me.dartsAvg || 0).toFixed(1)}`, "#FF6FB5")}
            {kpi("Résurrections", me.resurrectionsGiven ?? 0, `reçues: ${me.resurrectionsReceived ?? 0}`, theme.primary)}
            {kpi("Désarmements", me.disarmsTriggered ?? 0, `subis: ${me.disarmsReceived ?? 0}`, "#F6C256")}
            {kpi("Contres bouclier", Number(me.shieldBreaks || 0) + Number(me.shieldHalfBreaks || 0), `cassés:${me.shieldBreaks ?? 0} • affaiblis:${me.shieldHalfBreaks ?? 0}`, "#47B5FF")}
          </div>

          <div style={{ marginTop: 14, borderRadius: 22, padding: 14, border: `1px solid ${theme.borderSoft}`, background: "linear-gradient(180deg, rgba(8,12,30,.86), rgba(8,10,18,.96))" }}>
            <div style={{ textAlign: "center", color: theme.primary, fontWeight: 1000, marginBottom: 12 }}>Favoris</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {kpi("Segment favori", me.favSegment || "—", undefined, "#47B5FF")}
              {kpi("Numéro favori", fmtFavNumber(me.favNumber), undefined, "#F6C256")}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
