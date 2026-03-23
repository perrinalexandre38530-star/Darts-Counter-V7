// =============================================================
// src/pages/StatsKillerMatch.tsx
// Détail d'un match KILLER (utilisé par StatsDetailRoute)
// - Lit rec.payload.stats.killer (généré dans KillerPlay V1.6)
// - Affiche winner, paramètres, tableau per-player
// =============================================================

import * as React from "react";
import type { Store } from "../lib/types";
import { useTheme } from "../contexts/ThemeContext";
import ProfileAvatar from "../components/ProfileAvatar";
import ProfileStarRing from "../components/ProfileStarRing";

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  rec: any;
};

export default function StatsKillerMatch({ store, go, rec }: Props) {
  const { theme } = useTheme();

  const primary = theme.primary;
  const stroke = theme.borderSoft || "rgba(255,255,255,.14)";
  const card = theme.card || "rgba(255,255,255,.06)";

  const when = Number(rec?.updatedAt ?? rec?.createdAt ?? Date.now());
  const dateStr = new Date(when).toLocaleString();

  const winnerId = rec?.winnerId ?? rec?.payload?.summary?.winnerProfileId ?? null;
  const winnerProfile =
    (store.profiles || []).find((p: any) => p?.id === winnerId) || null;

  const killerStats = rec?.payload?.stats?.killer || rec?.payload?.stats || null;
  const perPlayer: any[] = killerStats?.perPlayer || rec?.payload?.summary?.perPlayer || [];

  const maxLives = Number(killerStats?.meta?.livesStart ?? rec?.payload?.config?.lives ?? 3);
  const params = killerStats?.meta ?? rec?.payload?.config ?? {};

  return (
    <div style={{ padding: 16 }}>
      <button
        onClick={() => go("statsHub", { tab: "history" })}
        style={{
          borderRadius: 12,
          padding: "8px 10px",
          border: `1px solid ${stroke}`,
          background: "rgba(255,255,255,.06)",
          color: theme.text,
          cursor: "pointer",
          fontWeight: 900,
        }}
      >
        ← Retour
      </button>

      <div style={{ marginTop: 12 }}>
        <div
          style={{
            fontSize: 22,
            fontWeight: 1000,
            color: primary,
            textShadow: `0 0 12px ${primary}66`,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          KILLER — Détails
        </div>
        <div style={{ marginTop: 4, color: theme.textSoft, fontSize: 12 }}>
          {dateStr}
        </div>
      </div>

      {/* Winner */}
      <div
        style={{
          marginTop: 12,
          borderRadius: 18,
          border: `1px solid ${stroke}`,
          background: card,
          padding: 14,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ position: "relative" }}>
          <ProfileAvatar profile={winnerProfile as any} size={58} />
          <div style={{ position: "absolute", inset: -8, pointerEvents: "none" }}>
            <ProfileStarRing size={74} active />
          </div>
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: theme.textSoft, fontSize: 12, fontWeight: 800 }}>
            Winner
          </div>
          <div
            style={{
              color: theme.text,
              fontSize: 16,
              fontWeight: 1000,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {winnerProfile?.name || "—"}
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: `${primary}22`,
            border: `1px solid ${primary}55`,
            color: primary,
            fontWeight: 1000,
            fontSize: 12,
          }}
        >
          👑
        </div>
      </div>

      {/* Params */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 18,
          border: `1px solid ${stroke}`,
          background: card,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 8 }}>
          Paramètres
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: 12, color: theme.textSoft }}>
          <div>Vies départ: <b style={{ color: theme.text }}>{maxLives}</b></div>
          <div>Devenir killer: <b style={{ color: theme.text }}>{params.becomeRule || "—"}</b></div>
          <div>Règle dégâts: <b style={{ color: theme.text }}>{params.damageRule || "—"}</b></div>
          <div>DBULL bouclier: <b style={{ color: theme.text }}>{params.shieldOnDBull ? "Oui" : "Non"}</b></div>
          <div>DBULL désarmement: <b style={{ color: theme.text }}>{params.disarmOnDBull ? "Oui" : "Non"}</b></div>
          <div>Résurrection: <b style={{ color: theme.text }}>{params.resurrectionMode || "off"}</b></div>
          <div>BULL splash: <b style={{ color: theme.text }}>{params.bullSplash ? "Oui" : "Non"}</b></div>
          <div>BULL soin: <b style={{ color: theme.text }}>{params.bullHeal ? "Oui" : "Non"}</b></div>
        </div>
      </div>

      {/* Table */}
      <div
        style={{
          marginTop: 10,
          borderRadius: 18,
          border: `1px solid ${stroke}`,
          background: card,
          padding: 14,
        }}
      >
        <div style={{ fontWeight: 1000, color: theme.text, marginBottom: 10 }}>
          Joueurs
        </div>

        {perPlayer.length === 0 ? (
          <div style={{ color: theme.textSoft, fontSize: 12 }}>
            Aucune stat Killer dans ce match (payload.stats.killer manquant).
          </div>
        ) : (
          <div style={{ display: "grid", gap: 8 }}>
            {perPlayer.map((p) => {
              const prof =
                (store.profiles || []).find((x: any) => x?.id === p.profileId) || null;
              const isWinner = p.profileId && winnerId && p.profileId === winnerId;

              return (
                <div
                  key={p.matchPid}
                  style={{
                    padding: "10px 10px",
                    borderRadius: 14,
                    border: `1px solid ${isWinner ? `${primary}66` : "rgba(255,255,255,.10)"}`,
                    background: isWinner ? `radial-gradient(circle at 0% 0%, ${primary}22, transparent 55%)` : "rgba(255,255,255,.04)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <div style={{ position: "relative" }}>
                      <ProfileAvatar profile={prof as any} size={44} />
                      {isWinner ? (
                        <div style={{ position: "absolute", inset: -6, pointerEvents: "none" }}>
                          <ProfileStarRing size={56} active />
                        </div>
                      ) : null}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontWeight: 1000,
                          color: theme.text,
                          fontSize: 13,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {p.name || prof?.name || "—"}
                      </div>
                      <div style={{ color: theme.textSoft, fontSize: 12 }}>
                        🎯 {p.killerNumber ?? p.number ?? "—"} • Lives end: <b style={{ color: theme.text }}>{p.livesEnd ?? (p.eliminated ? 0 : "—")}</b> {(p.isDead || p.eliminated) ? " • ☠" : ""}
                      </div>
                    </div>

                    {isWinner ? (
                      <div style={{ color: primary, fontWeight: 1100, fontSize: 12 }}>WIN</div>
                    ) : null}
                  </div>

                  <div
                    style={{
                      marginTop: 8,
                      display: "grid",
                      gridTemplateColumns: "repeat(4, 1fr)",
                      gap: 8,
                      fontSize: 12,
                      color: theme.textSoft,
                    }}
                  >
                    <div>Kills<br /><b style={{ color: theme.text }}>{p.kills ?? 0}</b></div>
                    <div>Auto kills<br /><b style={{ color: theme.text }}>{p.autoKills ?? 0}</b></div>
                    <div>Résurrections<br /><b style={{ color: theme.text }}>{p.resurrectionsGiven ?? 0}</b></div>
                    <div>Désarmements<br /><b style={{ color: theme.text }}>{p.disarmsTriggered ?? 0}</b></div>
                  </div>

                  <div style={{ marginTop: 6, fontSize: 12, color: theme.textSoft }}>
                    Turns to killer: <b style={{ color: theme.text }}>{p.turnsToKiller ?? p.throwsToBecomeKiller ?? "—"}</b>
                  </div>
                  <div style={{ marginTop: 4, fontSize: 12, color: theme.textSoft }}>
                    Contres bouclier: <b style={{ color: theme.text }}>{p.shieldBreaks ?? 0}</b> cassés • <b style={{ color: theme.text }}>{p.shieldHalfBreaks ?? 0}</b> affaiblis • Résurrections reçues: <b style={{ color: theme.text }}>{p.resurrectionsReceived ?? 0}</b>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
