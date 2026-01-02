// ============================================
// src/pages/HistoryInProgress.tsx — onglet "En cours"
// ============================================
import React from "react";
import { getPartiesEnCours, supprimerPartieEnCours } from "../lib/resume";
import { History, type SavedMatch } from "../lib/history";

export default function HistoryInProgress({
  onResume,
}: {
  /** Appelé avec l'id à reprendre */
  onResume: (id: string) => void;
}) {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<SavedMatch[]>([]);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const list = await getPartiesEnCours();
      setItems(list);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    refresh();
  }, [refresh]);

  async function handleDelete(id: string) {
    try {
      await History.remove?.(id);
    } catch {}
    try {
      supprimerPartieEnCours(id);
    } catch {}
    refresh();
  }

  if (loading) return <div style={{ padding: 12 }}>Chargement…</div>;

  if (!items.length) {
    return <div style={{ opacity: .7, padding: 12 }}>Aucune partie en cours.</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, padding: 8 }}>
      {items.map((rec) => {
        const start = (rec as any)?.payload?.state?.rules?.start ?? (rec as any)?.rules?.start ?? "X01";
        const created = rec.createdAt ? new Date(rec.createdAt) : null;
        const dateTxt = created
          ? created.toLocaleDateString() + " " + created.toLocaleTimeString()
          : "—";

        const players = (rec.players || []).map((p) => p.name || "—").join(" · ");

        return (
          <div
            key={rec.id}
            style={{
              borderRadius: 12,
              border: "1px solid rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.03)",
              padding: 10,
              display: "grid",
              gridTemplateColumns: "1fr auto",
              alignItems: "center",
              gap: 8,
            }}
          >
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, marginBottom: 4 }}>
                X01 · {start} — <span style={{ opacity: .8 }}>{dateTxt}</span>
              </div>
              <div style={{ fontSize: 12, opacity: .8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 260 }}>
                {players || "Joueurs inconnus"}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => onResume(rec.id)}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,180,0,.3)",
                  background: "linear-gradient(180deg, #ffc63a, #ffaf00)",
                  color: "#1a1a1a",
                  fontWeight: 900,
                  padding: "6px 10px",
                }}
                title="Reprendre cette partie"
              >
                Reprendre
              </button>

              <button
                onClick={() => handleDelete(rec.id)}
                style={{
                  borderRadius: 10,
                  border: "1px solid rgba(255,80,80,.35)",
                  background: "linear-gradient(180deg, #ff6666, #e04444)",
                  color: "white",
                  fontWeight: 800,
                  padding: "6px 10px",
                }}
                title="Supprimer"
              >
                Supprimer
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
