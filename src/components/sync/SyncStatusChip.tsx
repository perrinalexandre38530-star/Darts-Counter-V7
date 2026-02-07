import React, { useEffect, useState } from "react";
import { EventBuffer } from "../../lib/sync/EventBuffer";

export default function SyncStatusChip() {
  const [pending, setPending] = useState(0);
  const [lastOk, setLastOk] = useState<string>("");

  async function refresh() {
    const list = await EventBuffer.listUnsynced(9999);
    setPending(list.length);
    try {
      setLastOk(localStorage.getItem("dc_last_sync_ok_iso") || "");
    } catch {
      setLastOk("");
    }
  }

  useEffect(() => {
    refresh().catch(() => {});
    const onUpdate = () => refresh().catch(() => {});
    window.addEventListener("dc-events-buffer-updated", onUpdate);
    window.addEventListener("dc-events-synced", onUpdate);
    return () => {
      window.removeEventListener("dc-events-buffer-updated", onUpdate);
      window.removeEventListener("dc-events-synced", onUpdate);
    };
  }, []);

  const label =
    pending > 0
      ? `SYNC: ${pending} en attente`
      : lastOk
        ? `SYNC OK: ${new Date(lastOk).toLocaleString()}`
        : "SYNC: OK";

  return (
    <div
      style={{
        padding: "6px 10px",
        borderRadius: 999,
        fontSize: 12,
        opacity: 0.92,
        border: "1px solid rgba(255,255,255,0.16)",
        background: "rgba(0,0,0,0.25)",
        maxWidth: "100%",
        whiteSpace: "nowrap",
        overflow: "hidden",
        textOverflow: "ellipsis",
      }}
      title={label}
    >
      {label}
    </div>
  );
}
