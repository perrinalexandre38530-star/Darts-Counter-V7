import * as React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useAuthOnline } from "../../hooks/useAuthOnline";
import { useCastHost } from "../../cast/useCastHost";
import type { CastSnapshot } from "../../cast/castTypes";

type Props = { go: (tab: any, params?: any) => void };

function MiniBtn({ label, onClick, disabled }: { label: string; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{
        borderRadius: 12,
        padding: "8px 10px",
        border: "1px solid rgba(255,255,255,.14)",
        background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
        color: "#f5f5f7",
        fontWeight: 950,
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.55 : 1,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

export default function CastHostPage({ go }: Props) {
  const theme = useTheme() as any;
  const auth = useAuthOnline() as any;
  const isSignedIn = auth?.status === "signed_in" || !!auth?.user?.id;

  const host = useCastHost();

  const [title, setTitle] = React.useState("Multisports Scoring");
  const [p1, setP1] = React.useState("Joueur 1");
  const [p2, setP2] = React.useState("Joueur 2");
  const [s1, setS1] = React.useState(0);
  const [s2, setS2] = React.useState(0);
  const [active, setActive] = React.useState<1 | 2>(1);

  const joinUrl = host.room ? `${window.location.origin}${window.location.pathname}#/cast/${host.room.id}` : "";

  async function create() {
    await host.createRoom({ codeLen: 6 });
  }

  async function push() {
    if (!host.room) return;
    const snap: CastSnapshot = {
      game: "unknown",
      title: title || "Multisports Scoring",
      status: "live",
      players: [
        { id: "p1", name: p1 || "Joueur 1", score: Number(s1) || 0, active: active === 1 },
        { id: "p2", name: p2 || "Joueur 2", score: Number(s2) || 0, active: active === 2 },
      ],
      meta: {},
      updatedAt: Date.now(),
    };
    await host.pushState(host.room.id, snap);
  }

  async function close() {
    if (!host.room) return;
    await host.closeRoom(host.room.id);
  }

  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  }

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: theme.text || "#f5f5f7" }}>
      <div
        style={{
          borderRadius: 18,
          padding: 14,
          border: "1px solid rgba(255,255,255,.10)",
          background:
            "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
          boxShadow: "0 12px 26px rgba(0,0,0,.55)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 1000, color: theme.primary || "#ffd56a" }}>CAST (HOST)</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Crée une room et diffuse un scoreboard sur TV / PC / tablette.</div>
          </div>
          <button
            type="button"
            onClick={() => go("settings")}
            style={{
              borderRadius: 14,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
              color: theme.text || "#f5f5f7",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            ← Réglages
          </button>
        </div>

        {!isSignedIn ? (
          <div style={{ marginTop: 12, color: "#ff8a8a", fontWeight: 950 }}>
            Connexion requise pour créer une room (host). Va sur « Mon profil » puis reviens.
          </div>
        ) : null}

        {host.error ? <div style={{ marginTop: 10, color: "#ff8a8a", fontWeight: 950 }}>{host.error}</div> : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, flexWrap: "wrap" }}>
          <MiniBtn label={host.creating ? "Création…" : "Créer une room"} disabled={!isSignedIn || host.creating} onClick={create} />
          <MiniBtn label="Envoyer update" disabled={!host.room} onClick={push} />
          <MiniBtn label="Terminer" disabled={!host.room} onClick={close} />
          <MiniBtn label="Page TV" disabled={!host.room} onClick={() => go("cast_room", { roomId: host.room?.id })} />
        </div>

        {host.room ? (
          <div style={{ marginTop: 14, display: "grid", gap: 10 }}>
            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(0,0,0,.25)",
                padding: 12,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.9 }}>CODE ROOM</div>
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                <div style={{ fontSize: 22, fontWeight: 1100, letterSpacing: 3 }}>{host.room.code}</div>
                <MiniBtn label="Copier code" onClick={() => copy(host.room!.code)} />
              </div>
              <div style={{ fontSize: 12, opacity: 0.85 }}>Lien TV :</div>
              <div style={{ wordBreak: "break-all", fontSize: 12, opacity: 0.95 }}>{joinUrl}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MiniBtn label="Copier lien" onClick={() => copy(joinUrl)} />
              </div>
            </div>

            <div
              style={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(0,0,0,.25)",
                padding: 12,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, fontWeight: 1000, opacity: 0.9 }}>SNAPSHOT (MVP)</div>

              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.85 }}>Titre</div>
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.18)",
                    background: "rgba(5,5,8,.95)",
                    color: theme.text || "#f5f5f7",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 92px 72px", gap: 8, alignItems: "center" }}>
                <input
                  value={p1}
                  onChange={(e) => setP1(e.target.value)}
                  placeholder="Joueur 1"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.18)",
                    background: "rgba(5,5,8,.95)",
                    color: theme.text || "#f5f5f7",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <input
                  type="number"
                  value={s1}
                  onChange={(e) => setS1(Number(e.target.value))}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.18)",
                    background: "rgba(5,5,8,.95)",
                    color: theme.text || "#f5f5f7",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <MiniBtn label={active === 1 ? "Actif" : "Activer"} onClick={() => setActive(1)} />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 92px 72px", gap: 8, alignItems: "center" }}>
                <input
                  value={p2}
                  onChange={(e) => setP2(e.target.value)}
                  placeholder="Joueur 2"
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.18)",
                    background: "rgba(5,5,8,.95)",
                    color: theme.text || "#f5f5f7",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <input
                  type="number"
                  value={s2}
                  onChange={(e) => setS2(Number(e.target.value))}
                  style={{
                    width: "100%",
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,.18)",
                    background: "rgba(5,5,8,.95)",
                    color: theme.text || "#f5f5f7",
                    padding: "10px 12px",
                    fontSize: 13,
                    outline: "none",
                  }}
                />
                <MiniBtn label={active === 2 ? "Actif" : "Activer"} onClick={() => setActive(2)} />
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <MiniBtn label="+1 P1" onClick={() => setS1((v) => v + 1)} />
                <MiniBtn label="-1 P1" onClick={() => setS1((v) => v - 1)} />
                <MiniBtn label="+1 P2" onClick={() => setS2((v) => v + 1)} />
                <MiniBtn label="-1 P2" onClick={() => setS2((v) => v - 1)} />
                <MiniBtn label="Envoyer" onClick={push} />
              </div>
            </div>

            <div style={{ fontSize: 12, opacity: 0.85 }}>
              CAST-01 : ici on diffuse un snapshot MVP (manuel). Ensuite, on branchera les moteurs (Golf/X01/Cricket/etc.) pour
              publier automatiquement.
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
