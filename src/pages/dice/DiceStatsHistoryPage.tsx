// @ts-nocheck
// ============================================
// src/pages/dice/DiceStatsHistoryPage.tsx
// ✅ UI calquée sur les pages Historique (style Darts)
// ✅ Historique Dice (local)
// ============================================

import React, { useMemo, useState } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";
import InfoDot from "../../components/InfoDot";

import type { Store } from "../../lib/types";
import { getDiceMatches, formatDuration, formatDateShort } from "../../lib/diceStats";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
};

export default function DiceStatsHistoryPage({ store, go }: Props) {
  const { theme } = useTheme();
  const { t } = useLang();

  const allHistory = (store as any)?.history || [];
  const matches = useMemo(() => getDiceMatches(allHistory), [allHistory]);

  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const rows = useMemo(() => {
    const arr = [...matches];
    arr.sort((a, b) => (String(b.createdAt || "").localeCompare(String(a.createdAt || ""))));
    if (!query) return arr;
    return arr.filter((m) => {
      const a = (m?.players || []).join(" ").toLowerCase();
      return a.includes(query);
    });
  }, [matches, query]);

  return (
    <div className="page" style={{ minHeight: "100vh", background: theme.bg, color: theme.text }}>
      <div style={{ padding: 12, maxWidth: 560, margin: "0 auto", paddingBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <BackDot onClick={() => go("dice_stats_shell")} />
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 900,
                letterSpacing: 0.8,
                textTransform: "uppercase",
                color: theme.primary,
                textShadow: `0 0 14px ${theme.primary}66`,
                fontSize: 16,
              }}
            >
              {t("dice.history.title", "DICE — HISTORIQUE")}
            </div>
            <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 2 }}>
              {t("dice.history.subtitle", "Toutes les parties Dice enregistrées.")}
            </div>
          </div>
          <InfoDot
            title={t("dice.history.infoTitle", "Historique")}
            lines={[t("dice.history.info", "Recherche par joueur, même style que les pages Darts.")]}
          />
        </div>

        {/* Search */}
        <div
          style={{
            marginTop: 12,
            padding: 10,
            borderRadius: 14,
            border: `1px solid ${theme.borderSoft}`,
            background: theme.card,
            boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}22`,
          }}
        >
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("common.search", "Rechercher")}
              style={{
                flex: 1,
                height: 36,
                borderRadius: 999,
                border: `1px solid ${theme.borderSoft}`,
                padding: "0 12px",
                background: theme.bg,
                color: theme.text,
                outline: "none",
              }}
            />
            <button
              onClick={() => setQ("")}
              style={{
                height: 34,
                borderRadius: 999,
                border: `1px solid ${theme.primary}55`,
                padding: "0 12px",
                background: "transparent",
                color: theme.primary,
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: `0 0 12px ${theme.primary}22`,
              }}
            >
              {t("common.clear", "Effacer")}
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
          {rows.length === 0 ? (
            <div
              style={{
                padding: 12,
                borderRadius: 14,
                background: theme.card,
                border: `1px solid ${theme.borderSoft}`,
                color: theme.textSoft,
              }}
            >
              {t("common.noData", "Aucune donnée.")}
            </div>
          ) : (
            rows.map((m) => (
              <div
                key={m.id}
                style={{
                  border: `1px solid ${theme.borderSoft}`,
                  background: theme.card,
                  borderRadius: 14,
                  padding: 12,
                  boxShadow: `0 14px 28px rgba(0,0,0,.55), 0 0 14px ${theme.primary}12`,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontWeight: 900, color: theme.text }}>
                      {m.players?.join("  vs  ") || "—"}
                    </div>
                    <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 2 }}>
                      {formatDateShort(m.createdAt)} • {t("dice.history.turns", "Tours")}: {m.turns} • {t(
                        "dice.history.dur",
                        "Durée"
                      )}: {formatDuration(m.durationMs)}
                    </div>
                  </div>

                  <div style={{ textAlign: "right" }}>
                    <div
                      style={{
                        fontWeight: 950,
                        color: theme.primary,
                        textShadow: `0 0 14px ${theme.primary}55`,
                        fontSize: 16,
                        lineHeight: 1,
                      }}
                    >
                      {m.winner || "—"}
                    </div>
                    <div style={{ fontSize: 11.5, color: theme.textSoft, marginTop: 4 }}>
                      {t("dice.history.winner", "Vainqueur")}
                    </div>
                  </div>
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: 8,
                  }}
                >
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: `1px solid ${theme.borderSoft}`,
                      background: theme.bg,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: theme.textSoft }}>{t("dice.history.avg", "Moy.")}</div>
                    <div style={{ fontWeight: 900, color: theme.text, marginTop: 2 }}>
                      {Number(m.avgPtsPerThrow || 0).toFixed(1)} {t("dice.history.pts", "pts/lancer")}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: `1px solid ${theme.borderSoft}`,
                      background: theme.bg,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: theme.textSoft }}>{t("dice.history.exact", "Exact 50")}</div>
                    <div style={{ fontWeight: 900, color: theme.text, marginTop: 2 }}>{m.exact50 || 0}</div>
                  </div>
                  <div
                    style={{
                      padding: 10,
                      borderRadius: 12,
                      border: `1px solid ${theme.borderSoft}`,
                      background: theme.bg,
                    }}
                  >
                    <div style={{ fontSize: 11.5, color: theme.textSoft }}>{t("dice.history.over", "Over 50")}</div>
                    <div style={{ fontWeight: 900, color: theme.text, marginTop: 2 }}>{m.over50 || 0}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
