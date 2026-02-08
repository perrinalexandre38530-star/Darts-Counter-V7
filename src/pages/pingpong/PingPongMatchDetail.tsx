// =============================================================
// src/pages/pingpong/PingPongMatchDetail.tsx
// Ping-Pong — Détail match (LOCAL)
// Source: store.history (pushPingPongHistory dans App.tsx)
// =============================================================

import React, { useMemo } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useLang } from "../../contexts/LangContext";
import BackDot from "../../components/BackDot";

type Props = {
  store: any;
  go: (t: any, p?: any) => void;
  params?: any;
};

function safeStr(v: any) {
  try {
    if (v === null || v === undefined) return "";
    return String(v);
  } catch {
    return "";
  }
}

export default function PingPongMatchDetail({ store, go, params }: Props) {
  const { theme } = useTheme();
  const lang = useLang() as any;
  const t = lang?.t ?? ((_: string, fallback: string) => fallback);

  const id = params?.id ?? params?.matchId ?? null;

  const match = useMemo(() => {
    const list = (store?.history ?? []) as any[];
    if (!id) return null;
    return list.find((r) => r?.id === id) ?? null;
  }, [store?.history, id]);

  const payload = match?.payload ?? null;
  const summary = match?.summary ?? payload?.summary ?? null;
  const mode = payload?.mode ?? payload?.modeId ?? payload?.gameMode ?? payload?.variant ?? "match_1v1";

  const players = (match?.players ?? payload?.players ?? []) as any[];
  const winnerId = match?.winnerId ?? payload?.winnerId ?? null;
  const winner = players.find((p) => p?.id === winnerId) ?? null;

  function replay() {
    // On relance via la config, en gardant le mode. Les pages existantes ignorent les champs inconnus.
    go("pingpong_config", { mode, players, fromHistoryId: match?.id ?? null });
  }

  return (
    <div style={{ minHeight: "100vh", padding: 16, paddingBottom: 90, background: theme.bg, color: theme.text }}>
      <div style={{ position: "relative", marginBottom: 12 }}>
        <div style={{ position: "absolute", left: 0, top: 0 }}>
          <BackDot onClick={() => go("pingpong_stats_history")} />
        </div>
        <div style={{ paddingLeft: 54, fontWeight: 1000, fontSize: 18, letterSpacing: 0.3 }}>
          {t("pingpong.matchDetail.title", "DÉTAIL MATCH")}
        </div>
      </div>

      {!match ? (
        <div style={{ opacity: 0.8, fontWeight: 850 }}>
          {t("pingpong.matchDetail.notFound", "Match introuvable.")}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 8 }}>
              {t("pingpong.matchDetail.meta", "Infos")}
            </div>

            <div style={{ display: "grid", gap: 6, fontWeight: 850, fontSize: 13, color: theme.textSoft }}>
              <div>
                <span style={{ opacity: 0.75 }}>{t("pingpong.matchDetail.id", "ID")}:</span>{" "}
                <span style={{ color: theme.text }}>{safeStr(match.id)}</span>
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>{t("pingpong.matchDetail.mode", "Mode")}:</span>{" "}
                <span style={{ color: theme.text }}>{safeStr(mode).toUpperCase()}</span>
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>{t("pingpong.matchDetail.date", "Date")}:</span>{" "}
                <span style={{ color: theme.text }}>
                  {new Date(match.createdAt ?? match.updatedAt ?? match.date ?? Date.now()).toLocaleString()}
                </span>
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>{t("pingpong.matchDetail.players", "Joueurs")}:</span>{" "}
                <span style={{ color: theme.text }}>
                  {players.map((p) => p?.name || p?.id).filter(Boolean).join(" • ")}
                </span>
              </div>
              <div>
                <span style={{ opacity: 0.75 }}>{t("pingpong.matchDetail.winner", "Vainqueur")}:</span>{" "}
                <span style={{ color: theme.text }}>{winner?.name ?? (winnerId ? winnerId : "-")}</span>
              </div>
            </div>
          </div>

          <div
            style={{
              borderRadius: 16,
              border: `1px solid ${theme.borderSoft ?? "rgba(255,255,255,0.14)"}`,
              background: theme.card,
              boxShadow: "0 10px 24px rgba(0,0,0,0.55)",
              padding: 12,
            }}
          >
            <div style={{ fontWeight: 1000, fontSize: 16, marginBottom: 8 }}>
              {t("pingpong.matchDetail.summary", "Résumé")}
            </div>

            <pre
              style={{
                margin: 0,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                fontSize: 12,
                fontWeight: 800,
                color: theme.text,
                background: "rgba(0,0,0,0.25)",
                borderRadius: 12,
                padding: 10,
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.10)"}`,
              }}
            >
              {JSON.stringify(summary ?? payload ?? match, null, 2)}
            </pre>
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "space-between" }}>
            <button
              onClick={() => go("pingpong_stats_history")}
              style={{
                borderRadius: 14,
                padding: "12px 14px",
                border: `1px solid ${theme.cardSoft ?? "rgba(255,255,255,0.14)"}`,
                background: "rgba(255,255,255,0.06)",
                color: theme.text,
                fontWeight: 950,
                cursor: "pointer",
                flex: 1,
              }}
            >
              {t("pingpong.matchDetail.back", "RETOUR")}
            </button>

            <button
              onClick={replay}
              style={{
                borderRadius: 14,
                padding: "12px 14px",
                border: `1px solid ${theme.primary ?? "rgba(110,180,255,1)"}`,
                background: (theme.primary ?? "rgba(110,180,255,1)") + "22",
                color: theme.text,
                fontWeight: 1000,
                cursor: "pointer",
                flex: 1,
              }}
            >
              {t("pingpong.matchDetail.replay", "REJOUER")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
