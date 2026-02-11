// =============================================================
// src/components/sync/SyncPanel.tsx
// Honest synchronization UI
// =============================================================
import React, { useState } from "react";
import { syncEvents } from "../../lib/sync/SyncService";

export default function SyncPanel() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function runSync() {
    setLoading(true);
    const res = await syncEvents();
    setResult(res);
    setLoading(false);
  }

  return (
    <div style={{ padding: 16 }}>
      <button onClick={runSync} disabled={loading}>
        {loading ? "Synchronisation..." : "Synchroniser"}
      </button>

      {result && (
        <pre style={{ marginTop: 12 }}>
✔ {result.sent} événements envoyés
✔ {result.received} événements reçus
⚠ {result.ignored} ignorés
⛔ {result.errors} erreurs
        </pre>
      )}
    </div>
  );
}