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

function safePlayers(rec: any): Array<{ id?: string; name?: string }> {
  const p1 = Array.isArray(rec?.players) ? rec.players : null;
  const p2 = Array.isArray(rec?.payload?.players) ? rec.payload.players : null;
  const list = (p1?.length ? p1 : p2) ?? [];
  return list
    .filter(Boolean)
    .map((p: any) => ({ id: p?.id ?? undefined, name: String(p?.name ?? "").trim() }))
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

export default function PetanqueStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [query, setQuery] = React.useState("");
  const [limit, setLimit] = React.useState(140);

  const list: PetRec[] = React.useMemo(() => {
    const raw = Array.isArray((store as any)?.history) ? (store as any).history : [];
    const p = raw.filter(isPetanqueRecord);

    const q = query.trim().toLowerCase();
    const filtered = q
      ? p.filter((r) => {
          const players = safePlayers(r).map((x) => String(x.name ?? "").toLowerCase()).join(" ");
          const id = String(r?.id ?? "");
          const kind = String(r?.kind ?? "");
          return players.includes(q) || id.toLowerCase().includes(q) || kind.toLowerCase().includes(q);
        })
      : p;

    const sorted = filtered.sort((a, b) => Number(b?.updatedAt ?? b?.createdAt ?? 0) - Number(a?.updatedAt ?? a?.createdAt ?? 0));
    return sorted.slice(0, limit);
  }, [store, query, limit]);

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
          <div style={{ fontSize: 11, fontWeight: 900, color: theme.textSoft, textTransform: "uppercase", letterSpacing: 0.6 }}>{list.length} / {limit}</div>
        </div>

        <div style={{ marginTop: 10 }}>
          <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: 0.9, textTransform: "uppercase", color: theme.primary, textShadow: `0 0 14px ${theme.primary}66`, lineHeight: 1.05 }}>
            {t("petanque.history.title", "HISTORIQUE")}
          </div>
          <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 13, lineHeight: 1.35 }}>
            {t("petanque.history.subtitle", "Recherche + liste complète des parties Pétanque.")}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, marginTop: 12 }}>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("common.search", "Rechercher…")}
            style={{ width: "100%", padding: "10px 12px", borderRadius: 12, border: `1px solid ${theme.borderSoft}`, background: theme.card, color: theme.text, outline: "none" }}
          />
          <button
            onClick={() => setLimit((x) => Math.min(500, x + 200))}
            style={{ borderRadius: 12, border: `1px solid ${theme.primary}66`, background: "rgba(0,0,0,.22)", color: theme.primary, fontWeight: 900, padding: "10px 10px", cursor: "pointer", boxShadow: `0 0 12px ${theme.primary}22` }}
          >
            +200
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
          {list.length === 0 ? (
            <Card theme={theme} title={t("petanque.empty.history", "Aucun historique")} subtitle={t("petanque.empty.history.sub", "Joue une partie Pétanque pour alimenter l’historique.")} />
          ) : (
            list.map((rec: any) => {
              const when = Number(rec?.updatedAt ?? rec?.createdAt ?? Date.now());
              const dateStr = new Date(when).toLocaleString();
              const players = safePlayers(rec);
              const score = extractScore(rec);

              const labelPlayers = players.map((p) => p.name || p.id).filter(Boolean).join(" · ") || "Joueurs";
              const scoreStr = score.a != null && score.b != null ? `${score.a} - ${score.b}` : "—";

              return (
                <button
                  key={String(rec?.id ?? Math.random())}
                  onClick={() => go("statsDetail", { matchId: rec?.id })}
                  style={{
                    textAlign: "left",
                    borderRadius: 16,
                    background: theme.card,
                    border: `1px solid ${theme.borderSoft}`,
                    boxShadow: `0 16px 32px rgba(0,0,0,.55), 0 0 18px ${theme.primary}22`,
                    padding: 12,
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ fontWeight: 900, color: theme.primary, textTransform: "uppercase", letterSpacing: 0.6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {labelPlayers}
                    </div>
                    <div style={{ fontWeight: 900, color: theme.primary, textShadow: `0 0 10px ${theme.primary}55` }}>{scoreStr}</div>
                  </div>
                  <div style={{ marginTop: 6, color: theme.textSoft, fontSize: 12.5, lineHeight: 1.35 }}>
                    {dateStr}
                  </div>
                </button>
              );
            })
          )}
        </div>
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
