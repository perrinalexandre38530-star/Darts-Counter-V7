// ============================================
// src/pages/FriendsWaitingRoom.tsx
// Salle d'attente Online (mock) + cartes joueurs premium
// - Affiche le code de salon (mock)
// - Résumé de la partie X01 (start + règle de sortie)
// - Liste des joueurs du lobby (pour l'instant : TOI + placeholders)
// - Toggle "Prêt / Pas prêt" pour toi
// - Bouton "Démarrer la partie" (mock) qui lance X01 Online
// ============================================

import React from "react";
import type { Store, Profile } from "../lib/types";

type StartValue = 301 | 501 | 701 | 1001;

type Props = {
  store: Store;
  go: (tab: any, params?: any) => void;
  lobbyCode?: string | null;
  start: StartValue;
  doubleOut: boolean;
};

type LobbyPlayer = {
  id: string;
  name: string;
  isHost: boolean;
  isSelf: boolean;
  status: "ready" | "not_ready" | "offline";
  country?: string | null;
  flag?: string;
  lastSeenLabel?: string | null;
};

export default function FriendsWaitingRoom({
  store,
  go,
  lobbyCode,
  start,
  doubleOut,
}: Props) {
  const activeProfile: Profile | null =
    (store.profiles || []).find((p) => p.id === store.activeProfileId) ||
    (store.profiles || [])[0] ||
    null;

  const privateInfo = ((activeProfile as any)?.privateInfo || {}) as any;
  const countryRaw: string | null = privateInfo.country || null;
  const countryFlag = getCountryFlag(countryRaw || "");

  // Statut global de l’app (online / away / offline)
  const selfStatus =
    (store.selfStatus as "online" | "away" | "offline") || "offline";

  // État "prêt" côté client (mock)
  const [selfReady, setSelfReady] = React.useState<boolean>(false);

  // Pour l’instant, on génère une liste de joueurs mock :
  const players: LobbyPlayer[] = React.useMemo(() => {
    const self: LobbyPlayer = {
      id: activeProfile?.id || "local-self",
      name: activeProfile?.name || "Moi",
      isHost: true,
      isSelf: true,
      status: selfReady ? "ready" : selfStatus === "offline" ? "offline" : "not_ready",
      country: countryRaw,
      flag: countryFlag || undefined,
      lastSeenLabel:
        selfStatus === "online"
          ? "En ligne"
          : selfStatus === "away"
          ? "Absent"
          : "Hors ligne",
    };

    // 👉 Tu pourras plus tard remplacer les "fake" par de vrais joueurs Online
    const fakeFriend1: LobbyPlayer = {
      id: "fake_1",
      name: "Invité #1",
      isHost: false,
      isSelf: false,
      status: "not_ready",
      country: null,
      flag: "",
      lastSeenLabel: "En attente d’invitation",
    };

    const fakeFriend2: LobbyPlayer = {
      id: "fake_2",
      name: "Invité #2",
      isHost: false,
      isSelf: false,
      status: "offline",
      country: null,
      flag: "",
      lastSeenLabel: "Hors ligne",
    };

    return [self, fakeFriend1, fakeFriend2];
  }, [activeProfile, selfReady, selfStatus, countryRaw, countryFlag]);

  const host = players.find((p) => p.isHost) || players[0];
  const selfPlayer = players.find((p) => p.isSelf) || players[0];

  const everyoneReady =
    players.length > 0 &&
    players.every((p) => p.status === "ready" || p.isSelf); // On ne bloque pas sur les fake

  function handleStartMatch() {
    if (!activeProfile) {
      alert("Aucun profil actif sélectionné.");
      return;
    }

    // 👉 On réutilise le moteur X01 classique (X01Play) en mode ONLINE mock
    go("x01", {
      online: true,
      lobbyCode: lobbyCode || null,
      fresh: Date.now(),
      from: "online_waiting_room",
    });
  }

  function handleBack() {
    // Retour à la page Online & Amis
    go("friends");
  }

  return (
    <div
      className="container"
      style={{
        padding: 16,
        paddingBottom: 96,
        color: "#f5f5f7",
      }}
    >
      {/* Header simple */}
      <button
        type="button"
        onClick={handleBack}
        style={{
          marginBottom: 12,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(255,255,255,.25)",
          background: "rgba(0,0,0,.65)",
          color: "#f5f5f7",
          fontSize: 12,
        }}
      >
        ← Retour
      </button>

      <h2
        style={{
          fontSize: 20,
          fontWeight: 800,
          marginBottom: 4,
        }}
      >
        Salle d’attente Online (mock)
      </h2>

      <p
        style={{
          fontSize: 13,
          opacity: 0.8,
          marginBottom: 12,
        }}
      >
        Invite tes amis dans ce salon X01 Online local. Quand tout le monde est
        prêt, démarre la partie.
      </p>

      {/* Bloc salon + config X01 */}
      <div
        style={{
          marginBottom: 14,
          padding: 10,
          borderRadius: 14,
          border: "1px solid rgba(255,255,255,.16)",
          background:
            "radial-gradient(140% 180% at 0% 0%, rgba(255,213,106,.12), transparent 55%), linear-gradient(180deg, rgba(24,24,32,.96), rgba(8,8,12,.98))",
          fontSize: 12,
          boxShadow: "0 12px 28px rgba(0,0,0,.6)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 8,
            marginBottom: 8,
          }}
        >
          <div>
            <div
              style={{
                fontWeight: 700,
                marginBottom: 2,
                color: "#ffd56a",
              }}
            >
              Salon X01 Online
            </div>
            <div style={{ opacity: 0.85 }}>
              Hôte : <b>{host?.name || "—"}</b>
            </div>
          </div>

          {lobbyCode && (
            <div
              style={{
                minWidth: 90,
                textAlign: "right",
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  opacity: 0.75,
                  marginBottom: 2,
                }}
              >
                Code
              </div>
              <div
                style={{
                  padding: "4px 8px",
                  borderRadius: 999,
                  border: "1px solid rgba(255,255,255,.25)",
                  background: "#111",
                  fontFamily: "monospace",
                  letterSpacing: 2,
                  fontSize: 12,
                  fontWeight: 800,
                  color: "#ffd56a",
                }}
              >
                {lobbyCode}
              </div>
            </div>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 4,
          }}
        >
          <Chip label={`X01 · ${start}`} />
          <Chip label={doubleOut ? "Double-Out" : "Sortie simple"} />
          <Chip label="Mock local" tone="soft" />
        </div>
      </div>

      {/* Liste des joueurs */}
      <div
        style={{
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontWeight: 700,
            fontSize: 13,
            marginBottom: 6,
          }}
        >
          Joueurs dans le salon
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {players.map((p) => (
            <PlayerCard
              key={p.id}
              player={p}
              canToggleReady={p.isSelf}
              selfReady={selfReady}
              onToggleReady={() => setSelfReady((v) => !v)}
            />
          ))}
        </div>
      </div>

      {/* Résumé état global */}
      <div
        style={{
          fontSize: 11.5,
          marginBottom: 14,
          padding: 10,
          borderRadius: 12,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "linear-gradient(180deg, rgba(24,24,30,.96), rgba(8,8,12,.98))",
        }}
      >
        {everyoneReady ? (
          <span style={{ color: "#8fe6aa" }}>
            ✅ Tous les joueurs sont prêts (mock). Tu peux démarrer la partie.
          </span>
        ) : (
          <span style={{ opacity: 0.85 }}>
            ⏳ En attente que tous les joueurs soient prêts (mock). Pour
            l’instant, seul ton état est géré localement.
          </span>
        )}
      </div>

      {/* Bouton démarrer */}
      <button
        type="button"
        onClick={handleStartMatch}
        disabled={!selfReady}
        style={{
          width: "100%",
          borderRadius: 999,
          padding: "11px 16px",
          border: "none",
          fontWeight: 800,
          fontSize: 14,
          background: selfReady
            ? "linear-gradient(180deg,#7fe2a9,#35c86d)"
            : "linear-gradient(180deg,#555,#333)",
          color: selfReady ? "#04120a" : "#cccccc",
          boxShadow: selfReady ? "0 10px 22px rgba(0,0,0,.65)" : "none",
          cursor: selfReady ? "pointer" : "default",
          marginBottom: 4,
        }}
      >
        🚀 Démarrer la partie X01 Online (mock)
      </button>

      <div
        style={{
          fontSize: 11,
          opacity: 0.75,
          textAlign: "center",
        }}
      >
        (Dans la vraie version Online, ce bouton ne sera actif que quand tous
        les joueurs auront cliqué “Prêt”.)
      </div>
    </div>
  );
}

/* ---------- Sous-composants ---------- */

function PlayerCard({
  player,
  canToggleReady,
  selfReady,
  onToggleReady,
}: {
  player: LobbyPlayer;
  canToggleReady: boolean;
  selfReady: boolean;
  onToggleReady: () => void;
}) {
  const statusLabel =
    player.status === "ready"
      ? "Prêt"
      : player.status === "offline"
      ? "Hors ligne"
      : "En attente";

  const statusColor =
    player.status === "ready"
      ? "#7fe2a9"
      : player.status === "offline"
      ? "#ff8a8a"
      : "#ffd56a";

  const isSelf = player.isSelf;
  const isHost = player.isHost;

  return (
    <div
      style={{
        display: "flex",
        gap: 10,
        alignItems: "center",
        padding: 10,
        borderRadius: 14,
        border: "1px solid rgba(255,255,255,.16)",
        background:
          "radial-gradient(160% 190% at 0% 0%, rgba(79,180,255,.10), transparent 55%), linear-gradient(180deg, rgba(20,20,28,.98), rgba(6,6,10,.98))",
        boxShadow: "0 10px 24px rgba(0,0,0,.65)",
      }}
    >
      {/* Avatar + halo + drapeau */}
      <div
        style={{
          position: "relative",
          width: 52,
          height: 52,
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: "100%",
            height: "100%",
            borderRadius: "50%",
            background:
              "radial-gradient(circle at 30% 0%, #4fb4ff, #1c78d5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: 900,
            fontSize: 20,
            color: "#021427",
            boxShadow: `0 0 16px ${statusColor}`,
          }}
        >
          {player.name.slice(0, 2).toUpperCase()}
        </div>

        {/* Drapeau si dispo */}
        {player.flag && (
          <div
            style={{
              position: "absolute",
              bottom: -6,
              left: "50%",
              transform: "translateX(-50%)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: "2px solid #000",
              overflow: "hidden",
              boxShadow: "0 0 8px rgba(0,0,0,.8)",
              background: "#111",
              display: "grid",
              placeItems: "center",
              zIndex: 2,
            }}
          >
            <span
              style={{
                fontSize: 14,
                lineHeight: 1,
              }}
            >
              {player.flag}
            </span>
          </div>
        )}
      </div>

      {/* Infos joueur */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            marginBottom: 2,
          }}
        >
          {player.name}{" "}
          {isSelf && (
            <span style={{ fontSize: 11, opacity: 0.7 }}>· (Toi)</span>
          )}
        </div>

        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 4,
            marginBottom: 4,
          }}
        >
          {isHost && <Chip label="Hôte" tone="gold" />}
          {isSelf && <Chip label="Ce joueur" tone="soft" />}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            fontSize: 12,
          }}
        >
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              padding: "2px 8px",
              borderRadius: 999,
              background: "rgba(0,0,0,.70)",
              border: "1px solid rgba(255,255,255,.14)",
            }}
          >
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: statusColor,
                boxShadow: `0 0 8px ${statusColor}`,
              }}
            />
            <span>{statusLabel}</span>
          </span>

          {player.lastSeenLabel && (
            <span
              style={{
                fontSize: 11,
                opacity: 0.8,
              }}
            >
              · {player.lastSeenLabel}
            </span>
          )}
        </div>
      </div>

      {/* Bouton "Prêt / Pas prêt" pour toi uniquement */}
      {isSelf && (
        <button
          type="button"
          onClick={onToggleReady}
          style={{
            borderRadius: 999,
            padding: "7px 10px",
            border: "none",
            fontWeight: 800,
            fontSize: 12,
            background: selfReady
              ? "linear-gradient(180deg,#7fe2a9,#35c86d)"
              : "linear-gradient(180deg,#555,#333)",
            color: selfReady ? "#04120a" : "#f5f5f7",
            boxShadow: selfReady ? "0 6px 14px rgba(0,0,0,.6)" : "none",
            cursor: "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {selfReady ? "Je ne suis plus prêt" : "Je suis prêt"}
        </button>
      )}
    </div>
  );
}

function Chip({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "gold" | "soft";
}) {
  let bg = "rgba(0,0,0,.7)";
  let border = "rgba(255,255,255,.18)";
  let color = "#f5f5f7";

  if (tone === "gold") {
    bg = "linear-gradient(180deg,#ffd56a,#e9a93d)";
    border = "rgba(255,213,106,.9)";
    color = "#1b1404";
  } else if (tone === "soft") {
    bg = "rgba(255,255,255,.08)";
    border = "rgba(255,255,255,.20)";
    color = "#f5f5f7";
  }

  return (
    <span
      style={{
        padding: "2px 8px",
        borderRadius: 999,
        border: `1px solid ${border}`,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 600,
      }}
    >
      {label}
    </span>
  );
}

/* ---------- Utils : drapeau pays (copié de FriendsPage) ---------- */

function getCountryFlag(country: string): string {
  if (!country) return "";
  const trimmed = country.trim();

  const cps = Array.from(trimmed);
  if (cps.length === 2) {
    const cp0 = cps[0].codePointAt(0) ?? 0;
    const cp1 = cps[1].codePointAt(0) ?? 0;
    if (
      cp0 >= 0x1f1e6 &&
      cp0 <= 0x1f1ff &&
      cp1 >= 0x1f1e6 &&
      cp1 <= 0x1f1ff
    ) {
      return trimmed;
    }
  }

  const names: Record<string, string> = {
    france: "FR",
    belgique: "BE",
    belgium: "BE",
    suisse: "CH",
    switzerland: "CH",
    espagne: "ES",
    spain: "ES",
    italie: "IT",
    italy: "IT",
    allemagne: "DE",
    germany: "DE",
    royaumeuni: "GB",
    "royaume-uni": "GB",
    uk: "GB",
    angleterre: "GB",
    paysbas: "NL",
    "pays-bas": "NL",
    netherlands: "NL",
    usa: "US",
    étatsunis: "US",
    "états-unis": "US",
    unitedstates: "US",
    portugal: "PT",
  };

  let code: string | undefined;

  if (trimmed.length === 2) {
    code = trimmed.toUpperCase();
  } else {
    const key = trimmed
      .toLowerCase()
      .replace(/\s+/g, "")
      .replace(/[-']/g, "");
    code = names[key];
  }

  if (!code || code.length !== 2) return "";

  const A = 0x1f1e6;
  const chars = Array.from(code.toUpperCase()).map((c) =>
    String.fromCodePoint(A + (c.charCodeAt(0) - 65))
  );
  return chars.join("");
}
