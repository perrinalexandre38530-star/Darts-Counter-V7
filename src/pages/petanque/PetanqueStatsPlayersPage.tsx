import React from "react";
import type { Store, Profile } from "../../lib/types";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import ProfileAvatar from "../../components/ProfileAvatar";
import ProfileStarRing from "../../components/ProfileStarRing";

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
  // fallback: certains stores mettent "boules" etc.
  if (sport.includes("boule")) return true;
  return false;
}

function safePlayers(rec: any): Array<{ id?: string; name?: string; avatarDataUrl?: string | null }> {
  const p1 = Array.isArray(rec?.players) ? rec.players : null;
  const p2 = Array.isArray(rec?.payload?.players) ? rec.payload.players : null;
  const list = (p1?.length ? p1 : p2) ?? [];
  return list
    .filter(Boolean)
    .map((p: any) => ({
      id: p?.id ?? undefined,
      name: String(p?.name ?? "").trim(),
      avatarDataUrl: p?.avatarDataUrl ?? null,
    }))
    .filter((p: any) => p.id || p.name);
}

function extractScore(rec: any): { a: number | null; b: number | null } {
  // On tente plusieurs schémas possibles
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

type PlayerAgg = {
  id: string;
  name: string;
  avatarDataUrl?: string | null;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
  lastAt: number;
};

function getProfileLabel(p: any) {
  return String(p?.name ?? "").trim() || "Joueur";
}

export default function PetanqueStatsPlayersPage({ store, go, params }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const profiles = store?.profiles ?? [];
  const activeProfileId = store?.activeProfileId ?? null;
  const active = profiles.find((p) => p.id === activeProfileId) ?? profiles[0] ?? null;

  const mode = String(params?.mode ?? "active"); // "active" | "locals"
  const selectedProfileId: string | null =
    mode === "locals" ? (params?.profileId ?? null) : (params?.profileId ?? active?.id ?? null);

  const [query, setQuery] = React.useState("");
  const [sortKey, setSortKey] = React.useState<"diff" | "wins" | "matches" | "winrate">("diff");

  const petanqueHistory: PetRec[] = React.useMemo(() => {
    const list = Array.isArray((store as any)?.history) ? (store as any).history : [];
    return list.filter(isPetanqueRecord);
  }, [store]);

  const byPlayer: PlayerAgg[] = React.useMemo(() => {
    const map = new Map<string, PlayerAgg>();

    const upsert = (p: any, patch: Partial<PlayerAgg>) => {
      const pid = String(p?.id ?? p?.name ?? "").trim();
      if (!pid) return;
      const name = String(p?.name ?? "").trim() || "Joueur";
      const prev = map.get(pid);
      const base: PlayerAgg = prev ?? {
        id: pid,
        name,
        avatarDataUrl: p?.avatarDataUrl ?? null,
        matches: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        pointsFor: 0,
        pointsAgainst: 0,
        diff: 0,
        lastAt: 0,
      };
      const next: PlayerAgg = {
        ...base,
        ...patch,
        name: base.name || name,
        avatarDataUrl: base.avatarDataUrl ?? (p?.avatarDataUrl ?? null),
      };
      next.diff = (next.pointsFor || 0) - (next.pointsAgainst || 0);
      map.set(pid, next);
    };

    for (const rec of petanqueHistory) {
      const when = Number(rec?.updatedAt ?? rec?.createdAt ?? Date.now());
      const score = extractScore(rec);
      const sides = extractSides(rec);
      const winnerSide = winnerSideFromScore(score);

      // Players list (fallback)
      const playersFlat = safePlayers(rec);

      // Si on a des côtés A/B, on attribue des points for/against
      if ((sides.A?.length || 0) > 0 || (sides.B?.length || 0) > 0) {
        const aPts = score.a ?? 0;
        const bPts = score.b ?? 0;

        for (const p of sides.A) {
          upsert(p, {
            matches: (map.get(String(p.id ?? p.name))?.matches ?? 0) + 1,
            wins: (map.get(String(p.id ?? p.name))?.wins ?? 0) + (winnerSide === "A" ? 1 : 0),
            losses: (map.get(String(p.id ?? p.name))?.losses ?? 0) + (winnerSide === "B" ? 1 : 0),
            draws: (map.get(String(p.id ?? p.name))?.draws ?? 0) + (winnerSide == null && score.a != null && score.b != null ? 1 : 0),
            pointsFor: (map.get(String(p.id ?? p.name))?.pointsFor ?? 0) + (score.a == null ? 0 : aPts),
            pointsAgainst: (map.get(String(p.id ?? p.name))?.pointsAgainst ?? 0) + (score.b == null ? 0 : bPts),
            lastAt: Math.max(map.get(String(p.id ?? p.name))?.lastAt ?? 0, when),
          });
        }
        for (const p of sides.B) {
          upsert(p, {
            matches: (map.get(String(p.id ?? p.name))?.matches ?? 0) + 1,
            wins: (map.get(String(p.id ?? p.name))?.wins ?? 0) + (winnerSide === "B" ? 1 : 0),
            losses: (map.get(String(p.id ?? p.name))?.losses ?? 0) + (winnerSide === "A" ? 1 : 0),
            draws: (map.get(String(p.id ?? p.name))?.draws ?? 0) + (winnerSide == null && score.a != null && score.b != null ? 1 : 0),
            pointsFor: (map.get(String(p.id ?? p.name))?.pointsFor ?? 0) + (score.b == null ? 0 : bPts),
            pointsAgainst: (map.get(String(p.id ?? p.name))?.pointsAgainst ?? 0) + (score.a == null ? 0 : aPts),
            lastAt: Math.max(map.get(String(p.id ?? p.name))?.lastAt ?? 0, when),
          });
        }
      } else {
        // Fallback: on incrémente juste matches
        for (const p of playersFlat) {
          upsert(p, {
            matches: (map.get(String(p.id ?? p.name))?.matches ?? 0) + 1,
            lastAt: Math.max(map.get(String(p.id ?? p.name))?.lastAt ?? 0, when),
          });
        }
      }
    }

    const list = Array.from(map.values());

    // Filtrage "active" : si on est en mode actif, on peut prioriser le profil actif
    if (mode !== "locals") {
      // On garde tout (c’est la page joueurs), mais on met en avant le profil actif en UI via badge,
      // sans filtrer (sinon on perd les bots / etc). Si tu veux filtrer strict, dis-le.
    }

    // Search
    const q = query.trim().toLowerCase();
    const filtered = q
      ? list.filter((p) => p.name.toLowerCase().includes(q) || String(p.id).toLowerCase().includes(q))
      : list;

    const sorted = filtered.sort((a, b) => {
      const ar = a.matches > 0 ? a.wins / a.matches : 0;
      const br = b.matches > 0 ? b.wins / b.matches : 0;
      if (sortKey === "wins") return b.wins - a.wins;
      if (sortKey === "matches") return b.matches - a.matches;
      if (sortKey === "winrate") return br - ar;
      return b.diff - a.diff;
    });

    return sorted;
  }, [petanqueHistory, query, sortKey, mode]);

  const totalMatches = petanqueHistory.length;
  const totalProfiles = profiles.length;

  const title =
    mode === "locals"
      ? t("petanque.players.locals.title", "STATS JOUEURS — PROFILS LOCAUX")
      : active
        ? t("petanque.players.active.titlePrefix", "STATS ") + getProfileLabel(active)
        : t("petanque.players.title", "STATS JOUEURS");

  return (
    <div
      className="container"
      style={{
        minHeight: "100vh",
        paddingTop: 14,
        paddingBottom: 24,
        background: theme.bg,
        color: theme.text,
      }}
    >
      <div style={{ maxWidth: 520, margin: "0 auto", paddingInline: 14 }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <button
            onClick={() => go("stats")}
            style={{
              borderRadius: 999,
              border: `1px solid ${theme.borderSoft}`,
              padding: "6px 10px",
              background: theme.card,
              color: theme.text,
              cursor: "pointer",
            }}
          >
            ← {t("common.back", "Retour")}
          </button>

          <button
            onClick={() => go("sync_center")}
            style={{
              borderRadius: 999,
              border: `1px solid ${theme.primary}`,
              padding: "6px 10px",
              background: theme.card,
              color: theme.primary,
              fontWeight: 800,
              fontSize: 11,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              boxShadow: `0 0 12px ${theme.primary}55`,
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            {t("statsShell.syncButton", "Sync & partage")}
          </button>
        </div>

        <div style={{ marginTop: 10 }}>
          <div
            style={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: 0.9,
              textTransform: "uppercase",
              color: theme.primary,
              textShadow: `0 0 14px ${theme.primary}66`,
              lineHeight: 1.05,
            }}
          >
            {title}
          </div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>
            {t("petanque.players.subtitle", "Bilan par joueur (V/D, points pour/contre, diff).")}
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 12 }}>
          <KpiCard theme={theme} title={t("petanque.kpi.matches", "Matchs Pétanque")} value={String(totalMatches)} />
          <KpiCard theme={theme} title={t("petanque.kpi.profiles", "Profils")} value={String(totalProfiles)} />
        </div>

        {/* Controls */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "Rechercher…")}
            style={{
              width: "100%",
              padding: "10px 12px",
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              color: theme.text,
              outline: "none",
            }}
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as any)}
            style={{
              padding: "10px 10px",
              borderRadius: 12,
              border: `1px solid ${theme.borderSoft}`,
              background: theme.card,
              color: theme.text,
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            <option value="diff">{t("petanque.sort.diff", "Diff")}</option>
            <option value="wins">{t("petanque.sort.wins", "Victoires")}</option>
            <option value="winrate">{t("petanque.sort.winrate", "Win%")}</option>
            <option value="matches">{t("petanque.sort.matches", "Matchs")}</option>
          </select>
        </div>

        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {byPlayer.length === 0 ? (
            <EmptyCard theme={theme} title={t("petanque.empty.players", "Aucune donnée")} subtitle={t("petanque.empty.players.sub", "Joue une partie Pétanque pour alimenter les stats.")} />
          ) : (
            byPlayer.map((p) => (
              <PlayerRow
                key={p.id}
                theme={theme}
                player={p}
                isActive={!!(active && (active.id === p.id || String(active.name).trim() === p.name))}
                onOpenMatches={() => {
                  // On réutilise la page Matches, filtrée par playerId
                  go("petanque_stats_matches", { playerId: p.id, playerName: p.name });
                }}
              />
            ))
          )}
        </div>

        <div style={{ height: 24 }} />
      </div>
    </div>
  );
}

function KpiCard({ theme, title, value }: { theme: any; title: string; value: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        padding: 12,
      }}
    >
      <div style={{ color: theme.textSoft, fontSize: 12, fontWeight: 800, letterSpacing: 0.6, textTransform: "uppercase" }}>{title}</div>
      <div style={{ marginTop: 6, fontSize: 22, fontWeight: 900, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>{value}</div>
    </div>
  );
}

function EmptyCard({ theme, title, subtitle }: { theme: any; title: string; subtitle: string }) {
  return (
    <div
      style={{
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        padding: 14,
      }}
    >
      <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6 }}>{title}</div>
      <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>{subtitle}</div>
    </div>
  );
}

function PlayerRow({
  theme,
  player,
  isActive,
  onOpenMatches,
}: {
  theme: any;
  player: {
    id: string;
    name: string;
    avatarDataUrl?: string | null;
    matches: number;
    wins: number;
    losses: number;
    draws: number;
    pointsFor: number;
    pointsAgainst: number;
    diff: number;
    lastAt: number;
  };
  isActive: boolean;
  onOpenMatches: () => void;
}) {
  const winrate = player.matches > 0 ? Math.round((player.wins / player.matches) * 100) : 0;

  return (
    <div
      style={{
        borderRadius: 16,
        background: theme.card,
        border: `1px solid ${theme.borderSoft}`,
        boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
        padding: 12,
        display: "grid",
        gridTemplateColumns: "auto 1fr auto",
        gap: 10,
        alignItems: "center",
      }}
    >
      <StatsAvatar theme={theme} name={player.name} dataUrl={player.avatarDataUrl ?? null} />
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
          <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {player.name}
          </div>
          {isActive && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                padding: "3px 8px",
                borderRadius: 999,
                border: `1px solid ${theme.primary}88`,
                color: theme.primary,
                background: "rgba(0,0,0,.2)",
                textTransform: "uppercase",
                letterSpacing: 0.6,
                flexShrink: 0,
              }}
            >
              ACTIF
            </span>
          )}
        </div>

        <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: 6 }}>
          <Chip theme={theme} label={`V ${player.wins}`} />
          <Chip theme={theme} label={`D ${player.losses}`} />
          <Chip theme={theme} label={`N ${player.draws}`} />
          <Chip theme={theme} label={`Win ${winrate}%`} />
          <Chip theme={theme} label={`+ ${player.pointsFor}`} />
          <Chip theme={theme} label={`- ${player.pointsAgainst}`} />
          <Chip theme={theme} label={`Diff ${player.diff >= 0 ? "+" : ""}${player.diff}`} strong />
        </div>
      </div>

      <button
        onClick={onOpenMatches}
        style={{
          borderRadius: 12,
          border: `1px solid ${theme.primary}88`,
          padding: "10px 10px",
          background: "rgba(0,0,0,.25)",
          color: theme.primary,
          fontWeight: 900,
          cursor: "pointer",
          boxShadow: `0 0 12px ${theme.primary}33`,
          whiteSpace: "nowrap",
        }}
        title="Voir les matchs"
      >
        Matchs
      </button>
    </div>
  );
}

function Chip({ theme, label, strong }: { theme: any; label: string; strong?: boolean }) {
  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: strong ? 900 : 800,
        padding: "4px 8px",
        borderRadius: 999,
        border: `1px solid ${theme.borderSoft}`,
        background: "rgba(0,0,0,.18)",
        color: strong ? theme.primary : theme.textSoft,
        letterSpacing: 0.3,
      }}
    >
      {label}
    </span>
  );
}

function StatsAvatar({ theme, name, dataUrl }: { theme: any; name: string; dataUrl: string | null }) {
  const AVA = 40;
  const PAD = 6;
  const STAR = 10;

  // On ne veut pas dépendre d'une stat "avg3" ici. On fixe un avg3d neutre.
  const avg3d = 0;

  return (
    <div style={{ position: "relative", width: AVA, height: AVA, flexShrink: 0 }}>
      <div
        aria-hidden
        style={{
          position: "absolute",
          left: -(PAD + STAR / 2),
          top: -(PAD + STAR / 2),
          width: AVA + (PAD + STAR / 2) * 2,
          height: AVA + (PAD + STAR / 2) * 2,
          pointerEvents: "none",
        }}
      >
        <ProfileStarRing anchorSize={AVA} gapPx={-2} starSize={STAR} stepDeg={12} rotationDeg={0} avg3d={avg3d} />
      </div>

      <div
        style={{
          position: "absolute",
          inset: 0,
          borderRadius: "50%",
          border: `2px solid ${theme.primary}88`,
          boxShadow: `0 0 14px ${theme.primary}55`,
          overflow: "hidden",
          background: "#000",
          display: "grid",
          placeItems: "center",
        }}
      >
        {dataUrl ? (
          <img src={dataUrl} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} draggable={false} />
        ) : (
          <ProfileAvatar size={AVA} dataUrl={undefined} label={name?.[0]?.toUpperCase() || "?"} showStars={false} />
        )}
      </div>
    </div>
  );
}
