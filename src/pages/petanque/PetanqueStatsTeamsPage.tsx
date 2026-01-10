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
    Number.isFinite(Number(rec?.payload?.teamA?.score)) ? Number(rec.payload.teamA.score) :
    null;

  const b =
    Number.isFinite(Number(s?.b)) ? Number(s.b) :
    Number.isFinite(Number(s?.B)) ? Number(s.B) :
    Number.isFinite(Number(rec?.payload?.scoreB)) ? Number(rec.payload.scoreB) :
    Number.isFinite(Number(rec?.payload?.teamB?.score)) ? Number(rec.payload.teamB.score) :
    null;

  return { a, b };
}

function extractSides(rec: any): { A: any[]; B: any[] } {
  const t = rec?.payload?.teams ?? rec?.payload?.team ?? rec?.teams ?? null;

  const A =
    (Array.isArray(t?.A?.players) ? t.A.players : null) ??
    (Array.isArray(t?.a?.players) ? t.a.players : null) ??
    (Array.isArray(t?.teamA?.players) ? t.teamA.players : null) ??
    (Array.isArray(rec?.payload?.teamA?.players) ? rec.payload.teamA.players : null) ??
    (Array.isArray(rec?.payload?.sideA) ? rec.payload.sideA : null) ??
    [];

  const B =
    (Array.isArray(t?.B?.players) ? t.B.players : null) ??
    (Array.isArray(t?.b?.players) ? t.b.players : null) ??
    (Array.isArray(t?.teamB?.players) ? t.teamB.players : null) ??
    (Array.isArray(rec?.payload?.teamB?.players) ? rec.payload.teamB.players : null) ??
    (Array.isArray(rec?.payload?.sideB) ? rec.payload.sideB : null) ??
    [];

  const norm = (arr: any[]) =>
    (arr || [])
      .filter(Boolean)
      .map((p: any) => ({
        id: p?.id ?? undefined,
        name: String(p?.name ?? "").trim(),
      }))
      .filter((p: any) => p.id || p.name);

  return { A: norm(A), B: norm(B) };
}

function winnerSideFromScore(score: { a: number | null; b: number | null }) {
  if (score.a == null || score.b == null) return null;
  if (score.a === score.b) return null;
  return score.a > score.b ? "A" : "B";
}

function teamKeyFromPlayers(players: Array<{ id?: string; name?: string }>) {
  const key = (players || [])
    .map((p) => String(p?.id ?? p?.name ?? "").trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b))
    .join("|");
  return key || "team-unknown";
}

function teamLabel(players: Array<{ id?: string; name?: string }>) {
  const names = (players || []).map((p) => String(p?.name ?? p?.id ?? "").trim()).filter(Boolean);
  if (!names.length) return "Équipe";
  return names.join(" · ");
}

type TeamAgg = {
  id: string;
  label: string;
  players: Array<{ id?: string; name?: string }>;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
};

export default function PetanqueStatsTeamsPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const petanqueHistory: PetRec[] = React.useMemo(() => {
    const list = Array.isArray((store as any)?.history) ? (store as any).history : [];
    return list.filter(isPetanqueRecord);
  }, [store]);

  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<"diff" | "wins" | "matches" | "winrate">("diff");

  const teams: TeamAgg[] = React.useMemo(() => {
    const map = new Map<string, TeamAgg>();

    const upsert = (key: string, label: string, players: any[], patch: Partial<TeamAgg>) => {
      const prev = map.get(key);
      const base: TeamAgg = prev ?? {
        id: key,
        label,
        players,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
      };
      const next: TeamAgg = { ...base, ...patch };
      next.diff = (next.pointsFor || 0) - (next.pointsAgainst || 0);
      map.set(key, next);
    };

    for (const rec of petanqueHistory) {
      const score = extractScore(rec);
      const sides = extractSides(rec);
      const winnerSide = winnerSideFromScore(score);

      const aKey = teamKeyFromPlayers(sides.A);
      const bKey = teamKeyFromPlayers(sides.B);
      const aLabel = teamLabel(sides.A);
      const bLabel = teamLabel(sides.B);

      const aPts = score.a ?? 0;
      const bPts = score.b ?? 0;

      // A
      upsert(aKey, aLabel, sides.A, {
        matches: (map.get(aKey)?.matches ?? 0) + 1,
        wins: (map.get(aKey)?.wins ?? 0) + (winnerSide === "A" ? 1 : 0),
        losses: (map.get(aKey)?.losses ?? 0) + (winnerSide === "B" ? 1 : 0),
        draws: (map.get(aKey)?.draws ?? 0) + (winnerSide == null && score.a != null && score.b != null ? 1 : 0),
        pointsFor: (map.get(aKey)?.pointsFor ?? 0) + (score.a == null ? 0 : aPts),
        pointsAgainst: (map.get(aKey)?.pointsAgainst ?? 0) + (score.b == null ? 0 : bPts),
      });

      // B
      upsert(bKey, bLabel, sides.B, {
        matches: (map.get(bKey)?.matches ?? 0) + 1,
        wins: (map.get(bKey)?.wins ?? 0) + (winnerSide === "B" ? 1 : 0),
        losses: (map.get(bKey)?.losses ?? 0) + (winnerSide === "A" ? 1 : 0),
        draws: (map.get(bKey)?.draws ?? 0) + (winnerSide == null && score.a != null && score.b != null ? 1 : 0),
        pointsFor: (map.get(bKey)?.pointsFor ?? 0) + (score.b == null ? 0 : bPts),
        pointsAgainst: (map.get(bKey)?.pointsAgainst ?? 0) + (score.a == null ? 0 : aPts),
      });
    }

    const list = Array.from(map.values());

    const q = query.trim().toLowerCase();
    const filtered = q ? list.filter((x) => x.label.toLowerCase().includes(q)) : list;

    const sorted = filtered.sort((a, b) => {
      const ar = a.matches > 0 ? a.wins / a.matches : 0;
      const br = b.matches > 0 ? b.wins / b.matches : 0;
      if (sortKey === "wins") return b.wins - a.wins;
      if (sortKey === "matches") return b.matches - a.matches;
      if (sortKey === "winrate") return br - ar;
      return b.diff - a.diff;
    });

    return sorted;
  }, [petanqueHistory, query, sortKey]);

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
            {t("petanque.teams.title", "STATS ÉQUIPES")}
          </div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>
            {t("petanque.teams.subtitle", "Bilan par composition (V/D, points pour/contre, diff).")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "Rechercher…")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: theme.card, color: theme.text, outline: "none" }}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            style={{ padding: "10px 10px", borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: theme.card, color: theme.text, fontWeight: 800, cursor: "pointer" }}
          >
            <option value="diff">{t("petanque.sort.diff", "Diff")}</option>
            <option value="wins">{t("petanque.sort.wins", "Victoires")}</option>
            <option value="winrate">{t("petanque.sort.winrate", "Win%")}</option>
            <option value="matches">{t("petanque.sort.matches", "Matchs")}</option>
          </select>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {teams.length === 0 ? (
            <Card theme={theme} title={t("petanque.empty.teams", "Aucune donnée")} subtitle={t("petanque.empty.teams.sub", "Joue une partie Pétanque en équipes pour alimenter les stats.")} />
          ) : (
            teams.map((tm) => <TeamRow key={tm.id} theme={theme} team={tm} />)
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
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

function TeamRow({ theme, team }: { theme: any; team: any }) {
  const winrate = team.matches > 0 ? Math.round((team.wins / team.matches) * 100) : 0;

  return (
    <div style={{ borderRadius: 16, background: theme.card, border: `1px solid ${theme.borderSoft}`, boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`, padding: 12 }}>
      <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6, lineHeight: 1.2 }}>
        {team.label}
      </div>

      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6 }}>
        <Chip theme={theme} label={`V ${team.wins}`} />
        <Chip theme={theme} label={`D ${team.losses}`} />
        <Chip theme={theme} label={`N ${team.draws}`} />
        <Chip theme={theme} label={`Win ${winrate}%`} />
        <Chip theme={theme} label={`+ ${team.pointsFor}`} />
        <Chip theme={theme} label={`- ${team.pointsAgainst}`} />
        <Chip theme={theme} label={`Diff ${team.diff >= 0 ? "+" : ""}${team.diff}`} strong />
      </div>
    </div>
  );
}
