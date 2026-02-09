import * as React from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { useCastClient } from "../../cast/useCastClient";

type Props = { go: (tab: any, params?: any) => void };

export default function CastJoinPage({ go }: Props) {
  const theme = useTheme() as any;
  const client = useCastClient();
  const [code, setCode] = React.useState("");
  const [localErr, setLocalErr] = React.useState<string | null>(null);

  async function join() {
    setLocalErr(null);
    try {
      const r = await client.joinByCode(code);
      go("cast_room", { roomId: r.roomId });
    } catch (e: any) {
      setLocalErr(String(e?.message || e || "Erreur"));
    }
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
            <div style={{ fontSize: 22, fontWeight: 1000, color: theme.primary || "#ffd56a" }}>CAST</div>
            <div style={{ fontSize: 13, opacity: 0.9 }}>Rejoins un écran distant via un code.</div>
          </div>
          <button
            type="button"
            onClick={() => go("home")}
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
            ← Retour
          </button>
        </div>

        {(client.error || localErr) ? (
          <div style={{ marginTop: 10, color: "#ff8a8a", fontWeight: 950 }}>{client.error || localErr}</div>
        ) : null}

        <div style={{ marginTop: 14, display: "flex", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11.5, fontWeight: 1000, opacity: 0.85, marginBottom: 6 }}>Code</div>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="EX: A7D2KQ"
              maxLength={10}
              style={{
                width: "100%",
                borderRadius: 12,
                border: "1px solid rgba(255,255,255,.18)",
                background: "rgba(5,5,8,.95)",
                color: theme.text || "#f5f5f7",
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
            disabled={client.loading}
            onClick={join}
            style={{
              borderRadius: 14,
              padding: "12px 14px",
              border: "1px solid rgba(255,255,255,.16)",
              background: `linear-gradient(180deg, ${theme.primary || "#4fb4ff"}, #1c78d5)`,
              color: "#04101f",
              fontWeight: 1000,
              cursor: client.loading ? "default" : "pointer",
              opacity: client.loading ? 0.7 : 1,
              boxShadow: "0 10px 22px rgba(0,0,0,.45)",
            }}
          >
            {client.loading ? "Connexion…" : "Rejoindre"}
          </button>
        </div>
      </div>
    </div>
  );
}