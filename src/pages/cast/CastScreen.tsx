import * as React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useCastClient } from "../../cast/useCastClient";
import type { CastSnapshot } from "../../cast/castTypes";

type Props = { go: (tab: any, params?: any) => void; roomId?: string | null };

function BigCard({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        borderRadius: 22,
        padding: 16,
        border: "1px solid rgba(255,255,255,.10)",
        background:
          "radial-gradient(120% 160% at 0% 0%, rgba(79,180,255,.10), transparent 55%), linear-gradient(180deg, rgba(22,22,28,.96), rgba(10,10,14,.98))",
        boxShadow: "0 16px 34px rgba(0,0,0,.65)",
      }}
    >
      {children}
    </div>
  );
}

function PlayerRow({ p, highlight }: { p: any; highlight: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 12,
        padding: "12px 12px",
        borderRadius: 16,
        border: highlight ? "1px solid rgba(255,213,106,.55)" : "1px solid rgba(255,255,255,.10)",
        background: highlight
          ? "linear-gradient(180deg, rgba(255,213,106,.12), rgba(0,0,0,.22))"
          : "linear-gradient(180deg, rgba(255,255,255,.06), rgba(0,0,0,.22))",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        <div
          style={{
            width: 10,
            height: 10,
            borderRadius: 999,
            background: highlight ? "#ffd56a" : "rgba(255,255,255,.35)",
            boxShadow: highlight ? "0 0 12px rgba(255,213,106,.35)" : "none",
            flexShrink: 0,
          }}
        />
        <div style={{ fontSize: 18, fontWeight: 1000, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {p?.name || "—"}
        </div>
      </div>
      <div style={{ fontSize: 26, fontWeight: 1100, letterSpacing: 0.5 }}>{Number(p?.score ?? 0)}</div>
    </div>
  );
}

function EmptyState() {
  return (
    <div style={{ padding: 18, textAlign: "center", opacity: 0.9 }}>
      <div style={{ fontSize: 18, fontWeight: 1000 }}>En attente…</div>
      <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>Le host n’a pas encore envoyé de scoreboard.</div>
    </div>
  );
}

export default function CastScreen({ go, roomId }: Props) {
  const theme = useTheme() as any;
  const client = useCastClient();

  // Connect si roomId fourni (hash route)
  React.useEffect(() => {
    if (!roomId) return;
    client.connectRoom(roomId).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  const snap = (client.snapshot as CastSnapshot | null) || null;

  return (
    <div
      style={{
        minHeight: "100vh",
        padding: 18,
        color: theme.text || "#f5f5f7",
        background: "radial-gradient(1200px 600px at 20% 0%, rgba(79,180,255,.08), transparent 55%), radial-gradient(900px 520px at 80% 40%, rgba(255,213,106,.06), transparent 60%), #07070b",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <BigCard>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "grid", gap: 6, minWidth: 0 }}>
              <div style={{ fontSize: 28, fontWeight: 1100, color: theme.primary || "#4fb4ff" }}>{snap?.title || "CAST"}</div>
              <div style={{ fontSize: 13, opacity: 0.86 }}>Room: {roomId || client.roomId || "—"}</div>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <button
                type="button"
                onClick={() => go("cast_join")}
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
                Changer de room
              </button>
            </div>
          </div>

          {client.error ? <div style={{ marginTop: 10, color: "#ff8a8a", fontWeight: 950 }}>{client.error}</div> : null}

          <div style={{ marginTop: 16, display: "grid", gap: 12 }}>
            {snap?.players?.length ? (
              snap.players.map((p: any) => <PlayerRow key={p.id || p.name} p={p} highlight={!!p.active} />)
            ) : (
              <EmptyState />
            )}
          </div>

          {snap?.meta && Object.keys(snap.meta).length ? (
            <div style={{ marginTop: 14, fontSize: 12, opacity: 0.85 }}>Meta: {JSON.stringify(snap.meta)}</div>
          ) : null}
        </BigCard>
      </div>
    </div>
  );
}
