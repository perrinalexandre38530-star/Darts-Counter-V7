// =============================================================
// src/components/sync/SyncJournal.tsx
// UI — Journal de synchronisation + actions manuelles
// =============================================================
import React, { useState } from "react";
import { EventBuffer } from "../../lib/sync/EventBuffer";
import { rebuildStatsFromEvents } from "../../lib/sync/StatsRebuilder";

export default function SyncJournal() {
  const [running, setRunning] = useState(false);
  const [msg, setMsg] = useState<string>("");

  async function doSync() {
    setRunning(true);
    setMsg("Synchronisation en cours...");
    try {
      await EventBuffer.syncNow({ limit: 500 });
      setMsg("✔ Synchronisation terminée");
    } catch {
      setMsg("⛔ Erreur pendant la synchronisation");
    } finally {
      setRunning(false);
    }
  }

  async function doRebuild() {
    setRunning(true);
    setMsg("Reconstruction des stats...");
    try {
      await rebuildStatsFromEvents();
      setMsg("✔ Stats reconstruites depuis les events");
    } catch {
      setMsg("⛔ Erreur reconstruction stats");
    } finally {
      setRunning(false);
    }
  }

  return (
    <div style={{ padding: 16 }}>
      <h3>Synchronisation multi‑appareils</h3>

      <div style={{ display: "flex", gap: 12, marginTop: 12 }}>
        <button onClick={doSync} disabled={running}>
          Synchroniser maintenant
        </button>

        <button onClick={doRebuild} disabled={running}>
          Recalculer les stats
        </button>
      </div>

      {msg && (
        <div style={{ marginTop: 12, fontSize: 14 }}>
          {msg}
        </div>
      )}
    </div>
  );
}