// =============================================================
// src/pages/petanque/PetanqueStatsMatchesPage.tsx
// Stats Pétanque — Matches (liste + résumé)
// Source : petanqueStore history (localStorage)
// =============================================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import { getPetanqueMatches, normalizePetanqueRecord } from "../../lib/petanqueStats";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function pillStyle(bg: string, fg: string): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    padding: "6px 10px",
    fontSize: 12,
    fontWeight: 900,
    border: `1px solid ${bg}`,
    color: fg,
    background: "rgba(0,0,0,.22)",
    letterSpacing: 0.4,
  };
}

export default function PetanqueStatsMatchesPage({ go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const [q, setQ] = useState("");

  const rows = useMemo(() => {
    const raw = getPetanqueMatches();
    const norm = raw.map(normalizePetanqueRecord).filter(Boolean) as any[];
    const qq = q.trim().toLowerCase();
    if (!qq) return norm;

    return norm.filter((r) => {
      const a = String(r?.teams?.A?.name ?? "").toLowerCase();
      const b = String(r?.teams?.B?.name ?? "").toLowerCase();
      const names = [...(r?.teams?.A?.players ?? []), ...(r?.teams?.B?.players ?? [])]
        .map((p: any) => String(p?.name ?? "").toLowerCase())
        .join(" ");
      return a.includes(qq) || b.includes(qq) || names.includes(qq);
    });
  }, [q]);

  return (
    <div style={{ padding: 16 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <button onClick={() => go("stats")} style={{ opacity: 0.9 }}>
          ← {t("common.back", "Retour")}
        </button>
        <div style={{ fontWeight: 1000, letterSpacing: 1.2 }}>{t("petanque.stats.matches", "MATCHES")}</div>
        <div style={{ width: 32 }} />
      </div>

      <div style={{ marginTop: 10, display: "flex", gap: 10, flexWrap: "wrap" }}>
        <div style={pillStyle(`rgba(255,255,255,.14)`, theme.text)}>
          {t("petanque.stats.total", "Total")} : {rows.length}
        </div>
      </div>

      <div style={{ marginTop: 12 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("common.search", "Rechercher")} 
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 12,
            border: "1px solid rgba(255,255,255,.12)",
            background: "rgba(20,20,20,.5)",
            color: "#fff",
          }}
        />
      </div>

      <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
        {rows.map((m) => {
          const when = new Date(m.when).toLocaleString();
          const a = m.teams.A;
          const b = m.teams.B;
          const aScore = m.scores.A;
          const bScore = m.scores.B;
          const win = m.winnerTeamId;

          const title = `${a.name} ${aScore} — ${bScore} ${b.name}`;

          return (
            <div
              key={m.id}
              style={{
                borderRadius: 16,
                padding: 12,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(0,0,0,.28)",
              }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
                <div style={{ fontWeight: 1000, letterSpacing: 0.6 }}>{title}</div>
                <div style={{ fontSize: 12, opacity: 0.75 }}>{when}</div>
              </div>

              <div style={{ marginTop: 6, display: "flex", gap: 8, flexWrap: "wrap" }}>
                <div style={pillStyle(`rgba(255,255,255,.12)`, theme.textSoft)}>
                  {t("petanque.stats.mode", "Mode")} : {String(m.mode || "").toUpperCase()}
                </div>
                <div style={pillStyle(`rgba(255,255,255,.12)`, theme.textSoft)}>
                  {t("petanque.stats.ends", "Mènes")} : {m.endsCount}
                </div>
                {win ? (
                  <div style={pillStyle(`rgba(255,198,58,.22)`, theme.text)}>
                    {t("petanque.stats.winner", "Vainqueur")} : {win === "A" ? a.name : b.name}
                  </div>
                ) : (
                  <div style={pillStyle(`rgba(255,255,255,.12)`, theme.textSoft)}>{t("petanque.stats.draw", "Nul")}</div>
                )}
              </div>

              <div style={{ marginTop: 8, fontSize: 12, opacity: 0.82, lineHeight: 1.25 }}>
                <div>
                  <span style={{ fontWeight: 900 }}>{a.name}</span> : {(a.players || []).map((p: any) => p.name).join(" · ")}
                </div>
                <div>
                  <span style={{ fontWeight: 900 }}>{b.name}</span> : {(b.players || []).map((p: any) => p.name).join(" · ")}
                </div>
              </div>
            </div>
          );
        })}

        {!rows.length ? (
          <div style={{ opacity: 0.7, padding: 16, textAlign: "center" }}>{t("petanque.stats.empty", "Aucune partie enregistrée.")}</div>
        ) : null}
      </div>
    </div>
  );
}
