import React from "react";
import type { Store } from "../lib/types";
import { useAuthOnline } from "../hooks/useAuthOnline";
import { listActiveLobbies, subscribeLobbies, fetchMatchByCode, subscribeMatchState } from "../lib/spectatorApi";

type Props = {
  store: Store;
  update: (mut: (s: Store) => Store) => void;
  go: (tab: any, params?: any) => void;
};

function Pill({ label, tone }: { label: string; tone: "green" | "gold" | "red" | "gray" | "blue" }) {
  const map: any = {
    green: ["rgba(127,226,169,.14)", "#7fe2a9", "rgba(127,226,169,.35)"],
    gold: ["rgba(255,213,106,.18)", "#ffd56a", "rgba(255,213,106,.35)"],
    blue: ["rgba(79,180,255,.14)", "#4fb4ff", "rgba(79,180,255,.35)"],
    red: ["rgba(255,90,90,.14)", "#ff5a5a", "rgba(255,90,90,.35)"],
    gray: ["rgba(255,255,255,.08)", "rgba(255,255,255,.9)", "rgba(255,255,255,.12)"],
  };
  const [bg, fg, bd] = map[tone] || map.gray;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "2px 9px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 950,
        background: bg,
        color: fg,
        border: `1px solid ${bd}`,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 18,
        padding: 12,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(255,195,26,.06), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 12px 26px rgba(0,0,0,.55)",
      }}
    >
      {children}
    </div>
  );
}

function safeUpper(code: string) {
  return String(code || "").trim().toUpperCase();
}

export default function SpectatorPage({ store, update, go }: Props) {
  const auth = useAuthOnline() as any;
  const ready = !!auth.ready;
  const user = auth.user || null;
  const isSignedIn = (auth.status === "signed_in") || !!user?.id;

  const [error, setError] = React.useState<string | null>(null);
  const [lobbies, setLobbies] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(false);

  const [watchCode, setWatchCode] = React.useState("");
  const [watchMatch, setWatchMatch] = React.useState<any | null>(null);
  const [watching, setWatching] = React.useState(false);

  // Load + realtime refresh lobbies
  const load = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const rows = await listActiveLobbies(50);
      setLobbies(rows || []);
    } catch (e: any) {
      setError(String(e?.message || e || "Erreur"));
      setLobbies([]);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    if (!isSignedIn) {
      setError("Connexion requise (Supabase). Va sur Mon profil puis reviens.");
      return;
    }
    load().catch(() => {});
    const unsubP = subscribeLobbies(() => load().catch(() => {}));
    return () => {
      unsubP().catch(() => {});
    };
  }, [ready, isSignedIn, load]);

  // Watch match by code (B)
  React.useEffect(() => {
    if (!watching) return;
    const code = safeUpper(watchCode);
    if (!code) return;

    let stop = false;
    let unsub: null | (() => Promise<void>) = null;

    async function run() {
      try {
        const row = await fetchMatchByCode(code);
        if (!stop) setWatchMatch(row);

        unsub = subscribeMatchState(code, (r) => {
          if (!stop) setWatchMatch(r);
        });
      } catch (e: any) {
        if (!stop) setError(String(e?.message || e || "Erreur"));
      }
    }

    run().catch(() => {});
    return () => {
      stop = true;
      unsub?.().catch(() => {});
    };
  }, [watching, watchCode]);

  function openWatch(code: string) {
    setError(null);
    setWatchCode(safeUpper(code));
    setWatchMatch(null);
    setWatching(true);
  }

  function stopWatch() {
    setWatching(false);
    setWatchMatch(null);
  }

  const countWaiting = lobbies.filter((l) => l.status === "waiting").length;
  const countStarted = lobbies.filter((l) => l.status === "started").length;

  return (
    <div className="container" style={{ padding: 16, paddingBottom: 96, color: "#f5f5f7" }}>
      <Card>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          <div style={{ display: "grid", gap: 6 }}>
            <div style={{ fontSize: 22, fontWeight: 1000, color: "#ffd56a", textShadow: "0 0 14px rgba(255,215,80,.18)" }}>
              SPECTATEUR
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <Pill label={`Salons: ${lobbies.length}`} tone="gold" />
              <Pill label={`Waiting: ${countWaiting}`} tone="blue" />
              <Pill label={`Started: ${countStarted}`} tone="green" />
              <Pill label={isSignedIn ? "Session: connectée" : "Session: offline"} tone={isSignedIn ? "green" : "red"} />
            </div>
          </div>

          <button
            type="button"
            onClick={() => go("online" as any)}
            style={{
              borderRadius: 14,
              padding: "10px 12px",
              border: "1px solid rgba(255,255,255,.12)",
              background: "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.28))",
              color: "#f5f5f7",
              fontWeight: 950,
              cursor: "pointer",
            }}
          >
            ← Retour
          </button>
        </div>

        {error ? <div style={{ marginTop: 10, color: "#ff8a8a", fontWeight: 950 }}>{error}</div> : null}

        <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.85, marginBottom: 6 }}>Code salon</div>
            <input
              value={watchCode}
              onChange={(e) => setWatchCode(e.target.value.toUpperCase())}
              placeholder="EX: 4F9Q"
              maxLength={10}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(5,5,8,.95)",
                color: "#f5f5f7",
                padding: "10px 12px",
                fontSize: 13,
                letterSpacing: 2,
                textTransform: "uppercase",
                outline: "none",
              }}
            />
          </div>
          <button
            type="button"
            onClick={() => openWatch(watchCode)}
            style={{
              borderRadius: 14,
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,.16)",
              background: "linear-gradient(180deg, #4fb4ff, #1c78d5)",
              color: "#04101f",
              fontWeight: 1000,
              cursor: "pointer",
              boxShadow: "0 10px 22px rgba(0,0,0,.45)",
            }}
          >
            Regarder
          </button>
          {watching ? (
            <button
              type="button"
              onClick={stopWatch}
              style={{
                borderRadius: 14,
                padding: "12px 14px",
                border: "1px solid rgba(255,255,255,.12)",
                background: "rgba(255,90,90,.12)",
                color: "#ff8a8a",
                fontWeight: 1000,
                cursor: "pointer",
              }}
            >
              Stop
            </button>
          ) : null}
        </div>
      </Card>

      {/* LISTE LOBBIES (A) */}
      <div style={{ marginTop: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 1000, color: "#ffd56a", textShadow: "0 0 12px rgba(255,215,80,.18)" }}>
          Salons actifs
        </div>
        <div style={{ marginTop: 10 }}>
          {loading ? (
            <div style={{ opacity: 0.85 }}>Chargement…</div>
          ) : lobbies.length === 0 ? (
            <div style={{ opacity: 0.85 }}>Aucun salon actif pour le moment.</div>
          ) : (
            <div style={{ display: "grid", gap: 10 }}>
              {lobbies.slice(0, 30).map((l) => {
                const code = safeUpper(l.lobby_code || "");
                const tone = l.status === "started" ? "green" : l.status === "waiting" ? "blue" : "gray";
                return (
                  <Card key={l.id}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                      <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
                        <div style={{ fontWeight: 1000, fontSize: 14, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {l.title || `Salon ${code || "—"}`}
                        </div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <Pill label={`CODE ${code || "—"}`} tone="gold" />
                          <Pill label={`Status ${l.status}`} tone={tone as any} />
                          <Pill label={`Players ${(Array.isArray(l.players) ? l.players.length : 0)}`} tone="gray" />
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => openWatch(code)}
                        disabled={!code}
                        style={{
                          borderRadius: 14,
                          padding: "10px 12px",
                          border: "1px solid rgba(255,255,255,.16)",
                          background: code ? "linear-gradient(180deg, #ffd56a, #e9a93d)" : "rgba(255,255,255,.08)",
                          color: code ? "#1c1304" : "rgba(255,255,255,.55)",
                          fontWeight: 1000,
                          cursor: code ? "pointer" : "default",
                          boxShadow: "0 10px 22px rgba(0,0,0,.45)",
                        }}
                      >
                        Spectate ›
                      </button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* LIVE MATCH (B) */}
      {watching ? (
        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 15, fontWeight: 1000, color: "#ffd56a", textShadow: "0 0 12px rgba(255,215,80,.18)" }}>
            Live (state_json)
          </div>

          <Card>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                <Pill label={`CODE ${safeUpper(watchCode)}`} tone="gold" />
                <Pill label={watchMatch ? `Match: ${watchMatch.status}` : "Match: (introuvable)"} tone={watchMatch ? "green" : "red"} />
                {watchMatch?.updated_at ? <Pill label={`Maj: ${new Date(watchMatch.updated_at).toLocaleTimeString()}`} tone="gray" /> : null}
              </div>
            </div>

            <div style={{ marginTop: 10 }}>
              {!watchMatch ? (
                <div style={{ opacity: 0.85 }}>
                  Aucun match trouvé pour ce code. (Soit pas démarré, soit pas écrit côté serveur)
                </div>
              ) : (
                <pre
                  style={{
                    margin: 0,
                    borderRadius: 14,
                    padding: 12,
                    background: "#0f0f14",
                    border: "1px solid rgba(255,255,255,.12)",
                    boxShadow: "0 10px 22px rgba(0,0,0,.45)",
                    overflow: "auto",
                    maxHeight: 280,
                    fontSize: 12,
                    lineHeight: 1.25,
                  }}
                >
{JSON.stringify(watchMatch.state_json ?? {}, null, 2)}
                </pre>
              )}
            </div>
          </Card>
        </div>
      ) : null}
    </div>
  );
}