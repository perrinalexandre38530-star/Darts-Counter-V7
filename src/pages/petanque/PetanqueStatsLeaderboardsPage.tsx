import React from "react";
import type { Store } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  params?: any;
};

type PetRec = any;

function isPetanqueRecord(r: any) {
  const kind = String(r?.kind ?? r?.payload?.kind ?? "").toLowerCase();
  const sport = String(r?.payload?.sport ?? r?.payload?.game ?? r?.payload?.mode ?? "").toLowerCase();
  if (kind.includes("petanque")) return true;
  if (sport.includes("petanque")) return true;
  if (sport.includes("boule")) return true;
  return false;
}

function safePlayers(rec: any) {
  const p1 = Array.isArray(rec?.players) ? rec.players : null;
  const p2 = Array.isArray(rec?.payload?.players) ? rec.payload.players : null;
  const list = (p1?.length ? p1 : p2) ?? [];
  return list
    .filter(Boolean)
    .map((p: any) => ({ id: String(p?.id ?? p?.name ?? "").trim(), name: String(p?.name ?? "").trim() }))
    .filter((p: any) => p.id || p.name);
}

function extractScore(rec: any): { a: number | null; b: number | null } {
  const s =
    rec?.payload?.score ??
    rec?.payload?.scores ??
    rec?.summary?.score ??
    rec?.summary?.scores ??
    rec?.payload?.summary?.score ??
    rec?.payload?.summary?.scores ??
    null;

  const a =
    Number.isFinite(Number(s?.a)) ? Number(s.a) :
    Number.isFinite(Number(s?.A)) ? Number(s.A) :
    Number.isFinite(Number(rec?.payload?.scoreA)) ? Number(rec.payload.scoreA) :
    null;

  const b =
    Number.isFinite(Number(s?.b)) ? Number(s.b) :
    Number.isFinite(Number(s?.B)) ? Number(s.B) :
    Number.isFinite(Number(rec?.payload?.scoreB)) ? Number(rec.payload.scoreB) :
    null;

  return { a, b };
}

function extractSides(rec: any): { A: any[]; B: any[] } {
  const t = rec?.payload?.teams ?? rec?.payload?.team ?? rec?.teams ?? null;

  const A =
    (Array.isArray(t?.A?.players) ? t.A.players : null) ??
    (Array.isArray(t?.a?.players) ? t.a.players : null) ??
    (Array.isArray(rec?.payload?.sideA) ? rec.payload.sideA : null) ??
    [];

  const B =
    (Array.isArray(t?.B?.players) ? t.B.players : null) ??
    (Array.isArray(t?.b?.players) ? t.b.players : null) ??
    (Array.isArray(rec?.payload?.sideB) ? rec.payload.sideB : null) ??
    [];

  const norm = (arr: any[]) =>
    (arr || [])
      .filter(Boolean)
      .map((p: any) => ({ id: String(p?.id ?? p?.name ?? "").trim(), name: String(p?.name ?? "").trim() }))
      .filter((p: any) => p.id || p.name);

  return { A: norm(A), B: norm(B) };
}

function winnerSideFromScore(score: { a: number | null; b: number | null }) {
  if (score.a == null || score.b == null) return null;
  if (score.a === score.b) return null;
  return score.a > score.b ? "A" : "B";
}

type PlayerLB = {
  id: string;
  name: string;
  matches: number;
  wins: number;
  losses: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
};

export default function PetanqueStatsLeaderboardsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const petanqueHistory: PetRec[] = React.useMemo(() => {
    const list = Array.isArray((store as any)?.history) ? (store as any).history : [];
    return list.filter(isPetanqueRecord);
  }, [store]);

  const [tab, setTab] = React.useState<"diff" | "wins" | "winrate">("diff");

  const players: PlayerLB[] = React.useMemo(() => {
    const map = new Map<string, PlayerLB>();

    const bump = (p: any, patch: Partial<PlayerLB>) => {
      const id = String(p?.id ?? p?.name ?? "").trim();
      if (!id) return;
      const name = String(p?.name ?? "").trim() || "Joueur";
      const prev = map.get(id) ?? { id, name, matches: 0, wins: 0, losses: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 };
      const next = { ...prev, ...patch, name: prev.name || name };
      next.diff = (next.pointsFor || 0) - (next.pointsAgainst || 0);
      map.set(id, next);
    };

    for (const rec of petanqueHistory) {
      const score = extractScore(rec);
      const sides = extractSides(rec);
      const winner = winnerSideFromScore(score);

      if ((sides.A?.length || 0) > 0 || (sides.B?.length || 0) > 0) {
        const aPts = score.a ?? 0;
        const bPts = score.b ?? 0;

        for (const p of sides.A) {
          const id = String(p.id ?? p.name);
          const prev = map.get(id);
          bump(p, {
            matches: (prev?.matches ?? 0) + 1,
            wins: (prev?.wins ?? 0) + (winner === "A" ? 1 : 0),
            losses: (prev?.losses ?? 0) + (winner === "B" ? 1 : 0),
            pointsFor: (prev?.pointsFor ?? 0) + (score.a == null ? 0 : aPts),
            pointsAgainst: (prev?.pointsAgainst ?? 0) + (score.b == null ? 0 : bPts),
          });
        }
        for (const p of sides.B) {
          const id = String(p.id ?? p.name);
          const prev = map.get(id);
          bump(p, {
            matches: (prev?.matches ?? 0) + 1,
            wins: (prev?.wins ?? 0) + (winner === "B" ? 1 : 0),
            losses: (prev?.losses ?? 0) + (winner === "A" ? 1 : 0),
            pointsFor: (prev?.pointsFor ?? 0) + (score.b == null ? 0 : bPts),
            pointsAgainst: (prev?.pointsAgainst ?? 0) + (score.a == null ? 0 : aPts),
          });
        }
      } else {
        // fallback
        for (const p of safePlayers(rec)) {
          const id = String(p.id ?? p.name);
          const prev = map.get(id);
          bump(p, { matches: (prev?.matches ?? 0) + 1 });
        }
      }
    }

    const list = Array.from(map.values());

    const sorted = list.sort((a, b) => {
      const ar = a.matches > 0 ? a.wins / a.matches : 0;
      const br = b.matches > 0 ? b.wins / b.matches : 0;

      if (tab === "wins") return b.wins - a.wins;
      if (tab === "winrate") return br - ar;
      return b.diff - a.diff;
    });

    return sorted.slice(0, 20);
  }, [petanqueHistory, tab]);

  return (
    <div className="container" style={{ minHeight: "100vh", paddingTop: 14, paddingBottom: 24, background: theme.bg, color: theme.text }}>
      <div style={{ maxWidth: 520, margin: "0 auto", paddingInline: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button
            onClick={() => go("stats")}
            style={{ borderRadius: 999, border: `1px solid ${theme.borderSoft}`, padding: "6px 10px", background: theme.card, color: theme.text, cursor: "pointer" }}
          >
            ← {t("common.back", "Retour")}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.9, textTransform: "uppercase", color: theme.primary, textShadow: `0 0 14px ${theme.primary}66`, lineHeight: 1.05 }}>
            {t("petanque.lb.title", "CLASSEMENTS")}
          </div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>
            {t("petanque.lb.subtitle", "Top joueurs (Diff, Victoires, Win%).")}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <Pill theme={theme} active={tab === "diff"} onClick={() => setTab("diff")} label={t("petanque.lb.diff", "Diff")} />
          <Pill theme={theme} active={tab === "wins"} onClick={() => setTab("wins")} label={t("petanque.lb.wins", "Victoires")} />
          <Pill theme={theme} active={tab === "winrate"} onClick={() => setTab("winrate")} label={t("petanque.lb.winrate", "Win%")} />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {players.length === 0 ? (
            <Card theme={theme} title={t("petanque.empty.lb", "Aucune donnée")} subtitle={t("petanque.empty.lb.sub", "Joue une partie Pétanque pour générer les classements.")} />
          ) : (
            players.map((p, idx) => <LbRow key={p.id} theme={theme} rank={idx + 1} p={p} />)
          )}
        </div>
      </div>
    </div>
  );
}

function Pill({ theme, active, label, onClick }: { theme: any; active: boolean; label: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        borderRadius: 999,
        border: `1px solid ${active ? theme.primary : theme.borderSoft}`,
        background: active ? `linear-gradient(180deg, ${theme.primary}33, rgba(0,0,0,.25))` : theme.card,
        color: active ? theme.primary : theme.textSoft,
        fontWeight: 900,
        padding: "8px 10px",
        cursor: "pointer",
        boxShadow: active ? `0 0 12px ${theme.primary}55` : "none",
        textTransform: "uppercase",
        letterSpacing: 0.6,
        fontSize: 11,
      }}
    >
      {label}
    </button>
  );
}

function Card({ theme, title, subtitle }: { theme: any; title: string; subtitle: string }) {
  return (
    <div style={{ borderRadius: 16, background: theme.card, border: `1px solid ${theme.borderSoft}`, boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`, padding: 14 }}>
      <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</div>
      <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</div>
    </div>
  );
}

function Chip({ theme, label, strong }: { theme: any; label: string; strong?: boolean }) {
  return (
    <span style={{ fontSize: 11, fontWeight: strong ? 900 : 800, padding: "4px 8px", borderRadius: 999, border: `1px solid ${theme.borderSoft}`, background: "rgba(0,0,0,.18)", color: strong ? theme.primary : theme.textSoft, letterSpacing: 0.3 }}>
      {label}
    </span>
  );
}

function LbRow({ theme, rank, p }: { theme: any; rank: number; p: any }) {
  const winrate = p.matches > 0 ? Math.round((p.wins / p.matches) * 100) : 0;

  return (
    <div style={{ borderRadius: 16, background: theme.card, border: `1px solid ${theme.borderSoft}`, boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`, padding: 12 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 12,
              border: `1px solid ${theme.primary}55`,
              display: "grid",
              placeItems: "center",
              color: theme.primary,
              fontWeight: 900,
              background: "rgba(0,0,0,.18)",
              boxShadow: `0 0 12px ${theme.primary}22`,
              flexShrink: 0,
            }}
          >
            {rank}
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {p.name}
            </div>
            <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
              <Chip theme={theme} label={`V ${p.wins}`} />
              <Chip theme={theme} label={`D ${p.losses}`} />
              <Chip theme={theme} label={`Win ${winrate}%`} />
              <Chip theme={theme} label={`Diff ${p.diff >= 0 ? "+" : ""}${p.diff}`} strong />
            </div>
          </div>
        </div>

        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 11, color: theme.textSoft, fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.6 }}>Matchs</div>
          <div style={{ fontWeight: 900, color: theme.text, marginTop: 4 }}>{p.matches}</div>
        </div>
      </div>
    </div>
  );
}
